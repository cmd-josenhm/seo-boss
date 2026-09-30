/**
 * SEO BOSS — Agent IA de contenu & SEO (24h/24)
 * Déployé sur Render. API de contrôle + scheduler autonome.
 *
 * Sécurité : toute route de contrôle exige le jeton `AGENT_TOKEN`
 * (en-tête `Authorization: Bearer …` ou `x-agent-token`).
 */
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { config } from './config.js';
import { store } from './store.js';
import { runCycle, isRunning, resetTasks, catalogSize } from './agent.js';
import { activeProviderName } from './providers.js';
import { mineKeywords, CATEGORIES } from './tools/keywords.js';
import { buildSeedFile } from './export-seed.js';

const app = express();
app.disable('x-powered-by');

// CORS : uniquement le site officiel (+ localhost en développement).
const allowedOrigins = [config.siteUrl.replace(/\/$/, '')];
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // appels serveur à serveur
      if (allowedOrigins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error('origine non autorisée'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

const startedAt = Date.now();

/** Comparaison de jetons en temps constant (évite les attaques temporelles). */
function tokenOk(provided) {
  if (!provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(config.agentToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readToken(req) {
  return (
    req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    req.headers['x-agent-token'] ||
    req.query.token
  );
}

/** Auth du tableau de bord / des robots de maintenance. */
function auth(req, res, next) {
  if (tokenOk(readToken(req))) return next();
  res.status(401).json({ error: 'jeton invalide (x-agent-token)' });
}

/** Limitation de débit en mémoire (par IP) — protège les routes publiques d'écriture. */
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count++;
    hits.set(ip, entry);
    if (hits.size > 5000) hits.clear();
    if (entry.count > max) return res.status(429).json({ error: 'trop de requêtes' });
    next();
  };
}

app.get('/health', (_req, res) => res.json({ ok: true, uptime: Date.now() - startedAt }));

// Statut global pour /admin
app.get('/status', async (_req, res) => {
  try {
    const [runs, stats, views, catalog] = await Promise.all([
      store.listRuns(15),
      store.stats(),
      store.getViews({ days: 7 }),
      catalogSize(),
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
      // Modèle « bibliothèque » : le catalogue ne fait que croître.
      catalog: {
        model: 'growth-only',
        total: catalog.total,
        published: catalog.published,
        max: config.catalog.max, // 0 = illimité
        deleted_total: stats.retired,
      },
      traffic: views,
      indexnow: {
        enabled: config.indexnow.enabled,
        key_location: `${config.siteUrl.replace(/\/$/, '')}/indexnow.key.txt`,
      },
      last_runs: runs,
      categories: Object.entries(CATEGORIES).map(([k, v]) => ({ id: k, label: v.label })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Déclencher un cycle immédiatement (bouton "Générer" du dashboard, cron externe)
app.post('/run', auth, async (req, res) => {
  const result = await runCycle({ mode: req.body?.mode || 'full' });
  res.json(result);
});

// Déclencher un cycle maintenant (interne, protégé par le même jeton)
app.post('/internal/run', auth, async (req, res) => {
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
  const existing = await store.listArticles({ limit: 5000 });
  res.json(mineKeywords({ excludeSlugs: existing.map((a) => a.slug), limit: 25 }));
});

// Sauvegarde du catalogue : renvoie un fichier seed prêt à committer
// (filet de sécurité gratuit si la base du conteneur est réinitialisée)
app.get('/export/seed.js', async (_req, res) => {
  const articles = await store.listArticles({ status: 'published', limit: 5000 });
  res.type('text/javascript').send(buildSeedFile(articles));
});

// Maintenance
app.post('/internal/reset-tasks', auth, async (_req, res) => {
  res.json({ cleared: await resetTasks() });
});

// ---------------- Vues (compteur interne de fréquentation) ----------------
// Beacon public envoyé par le frontend (best-effort, protégé par limite de débit)
app.post('/views', rateLimit(config.rateLimit.maxViews, config.rateLimit.windowMs), async (req, res) => {
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

// ---------------- Scheduler ----------------
// NB : sur un hébergeur qui endort le service (Render free), ce timer ne suffit pas.
// Un déclencheur externe (cron Render, cron-job.org, Vercel Cron -> /api/cron/run)
// appelle POST /run : c'est lui qui garantit la cadence 24h/24.
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
    console.log(`   stockage : ${store.mode()} (${store.info().path})`);
    console.log(`   cycle    : toutes les ${config.runIntervalMinutes} min`);
    console.log(`   catalogue: croissance uniquement (max ${config.catalog.max || 'illimité'})`);
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
