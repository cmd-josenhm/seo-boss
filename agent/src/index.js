/**
 * SEO BOSS — Agent IA de contenu & SEO (24h/24)
 * Déployé sur Render. API de contrôle + scheduler autonome.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { store } from './store.js';
import { runCycle, isRunning, resetTasks } from './agent.js';
import { activeProviderName } from './providers.js';
import { mineKeywords, CATEGORIES } from './tools/keywords.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const startedAt = Date.now();

// --- auth du tableau de bord ---
function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-agent-token'];
  if (token && token === config.agentToken) return next();
  res.status(401).json({ error: 'token invalide (x-agent-token)' });
}

app.get('/health', (_req, res) => res.json({ ok: true, uptime: Date.now() - startedAt }));

// Statut global pour /admin
app.get('/status', async (_req, res) => {
  try {
    const [runs, stats, views] = await Promise.all([
      store.listRuns(15),
      store.stats(),
      store.getViews({ days: 7 }),
    ]);
    res.json({
      ok: true,
      mode: store.mode(),
      database: store.info(),
      provider: activeProviderName(),
      running: isRunning(),
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      interval_minutes: config.runIntervalMinutes,
      auto_publish: config.autoPublish,
      site_url: config.siteUrl,
      counts: {
        articles: stats.articles,
        published: stats.published,
        pending_tasks: stats.tasks_pending,
        failed_tasks: stats.tasks_failed,
        db_size_kb: stats.db_size_kb,
      },
      traffic: views,
      last_runs: runs,
      categories: Object.entries(CATEGORIES).map(([k, v]) => ({ id: k, label: v.label })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Déclencher un cycle immédiatement (bouton "Générer" du dashboard)
app.post('/run', auth, async (req, res) => {
  const result = await runCycle({ mode: req.body?.mode || 'full' });
  res.json(result);
});

// Déclencher un cycle maintenant (interne)
app.post('/internal/run', async (req, res) => {
  const result = await runCycle({ mode: req.body?.mode || 'full' });
  res.json(result);
});

// Articles (servis au frontend depuis la base SQLite du backend)
app.get('/articles', async (req, res) => {
  const rows = await store.listArticles({
    status: req.query.status === 'all' ? undefined : req.query.status || 'published',
    limit: parseInt(req.query.limit || '50', 10),
  });
  res.json(rows);
});

app.get('/articles/:slug', async (req, res) => {
  const a = await store.getArticle(req.params.slug);
  if (!a) return res.status(404).json({ error: 'introuvable' });
  res.json(a);
});

// Modifier le statut d'un article (publier / dépublier)
app.patch('/articles/:slug', auth, async (req, res) => {
  const a = await store.getArticle(req.params.slug);
  if (!a) return res.status(404).json({ error: 'introuvable' });
  const patch = {};
  if (req.body.status) patch.status = req.body.status;
  if (req.body.status === 'published' && !a.published_at) patch.published_at = new Date().toISOString();
  const updated = await store.upsertArticle({ ...a, ...patch });
  res.json(updated);
});

// File de tâches
app.get('/tasks', auth, async (_req, res) => {
  res.json(await store.listTasks({ limit: 200 }));
});

// Enqueue manuel d'un mot-clé
app.post('/tasks', auth, async (req, res) => {
  const { keyword, category = 'business' } = req.body || {};
  if (!keyword) return res.status(400).json({ error: 'keyword requis' });
  const [task] = await store.addTasks([{ type: 'write', keyword, category, priority: 10 }]);
  res.json(task);
});

// Aperçu du mining de mots-clés (stratégie SEO visible dans /admin)
app.get('/keywords/preview', auth, async (_req, res) => {
  const existing = await store.listArticles({ limit: 500 });
  res.json(mineKeywords({ excludeSlugs: existing.map((a) => a.slug), limit: 25 }));
});

// Maintenance
app.post('/internal/reset-tasks', async (_req, res) => {
  res.json({ cleared: await resetTasks() });
});

// ---------------- Vues (compteur interne de fréquentation) ----------------
// Beacon public envoyé par le frontend (best-effort)
app.post('/views', async (req, res) => {
  try {
    await store.addView(req.body?.path || '/');
  } catch (e) {
    console.warn('[views]', e.message);
  }
  res.status(204).end();
});

// Statistiques de fréquentation (dashboard /admin)
app.get('/views', auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90);
    res.json(await store.getViews({ days }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Scheduler 24h/24 ----------------
async function tick() {
  if (isRunning()) return;
  try {
    await runCycle({ mode: 'full' });
  } catch (e) {
    console.error('[scheduler]', e.message);
  }
}

async function main() {
  await store.init();
  // sécurité : une erreur de requête ne doit jamais tuer le service 24/24
  process.on('uncaughtException', (e) => console.error('[uncaught]', e));
  process.on('unhandledRejection', (e) => console.error('[unhandled]', e));
  app.use((err, _req, res, _next) => {
    console.error('[express]', err);
    res.status(500).json({ error: err.message });
  });
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🤖 SEO BOSS agent — port ${config.port}`);
    console.log(`   stockage : ${store.mode()}`);
    console.log(`   cycle    : toutes les ${config.runIntervalMinutes} min`);
    console.log(`   auto-pub : ${config.autoPublish}`);
    console.log(`   site     : ${config.siteUrl}\n`);
  });
  // premier cycle après 20 s (laisse le serveur démarrer), puis boucle
  setTimeout(tick, 20000);
  setInterval(tick, config.runIntervalMinutes * 60 * 1000);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
