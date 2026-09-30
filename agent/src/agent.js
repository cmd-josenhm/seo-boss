/**
 * Pipeline de l'agent : mine les mots-clés -> rédige -> optimise -> publie -> liens internes.
 * Un cycle = une exécution complète, déclenchée par le scheduler, l'API /run ou un cron externe.
 *
 * MODÈLE DE CATALOGUE (important) : « bibliothèque ».
 *   - les articles publiés sont CONSERVÉS indéfiniment : aucune suppression,
 *     aucune purge, aucun slug retiré de l'index ;
 *   - chaque cycle AJOUTE de nouveaux articles (ou met à jour les anciens) ;
 *   - le catalogue ne fait donc que croître — c'est ce qui construit un actif SEO.
 */
import { store } from './store.js';
import { config } from './config.js';
import { mineKeywords, slugify } from './tools/keywords.js';
import { writeArticle } from './tools/writer.js';
import { seoScore, addInternalLinks, refreshWithLLM } from './tools/seo.js';
import { activeProviderName } from './providers.js';
import { submitUrls } from './tools/indexnow.js';

let running = false;
export const isRunning = () => running;

/** Nombre d'articles publiés actuellement (catalogue). */
export async function catalogSize() {
  const all = await store.listArticles({ limit: 5000 });
  return { total: all.length, published: all.filter((a) => a.status === 'published').length };
}

export async function runCycle({ mode = 'full' } = {}) {
  if (running) return { skipped: true, reason: 'un_cycle_est_déjà_en_cours' };
  running = true;
  const startedAt = new Date().toISOString();
  const log = [];
  let created = 0;
  let updated = 0;
  let tasksDone = 0;
  let provider = 'template';
  const createdSlugs = [];

  const say = (m) => {
    const line = `[${new Date().toISOString()}] ${m}`;
    log.push(line);
    console.log('[agent]', line);
  };

  try {
    // 0) État du catalogue (jamais de suppression, on mesure seulement la croissance)
    const before = await catalogSize();
    say(`catalogue: ${before.total} article(s) au total (${before.published} publié(s)) — croissance uniquement`);

    const capped = config.catalog.max > 0 && before.total >= config.catalog.max;

    // 1) File de tâches vide ? -> on mine de nouveaux mots-clés longue traîne
    let pending = await store.listTasks({ status: 'pending', limit: 50 });
    if (!capped && pending.length < 5) {
      const existing = await store.listArticles({ limit: 5000 });
      const retired = await store.listRetiredSlugs(); // historique (modèle précédent)
      const excludeSlugs = [...existing.map((a) => a.slug), ...retired];
      const ideas = mineKeywords({ excludeSlugs, limit: 25 });
      const fresh = await store.addTasks(
        ideas.map((i) => ({
          type: 'write',
          keyword: i.keyword,
          slug: i.slug,
          category: i.category,
          priority: i.priority,
          payload: { slug: i.slug },
        }))
      );
      say(`mining: ${fresh.length} nouveaux mots-clés en file`);
      pending = await store.listTasks({ status: 'pending', limit: 50 });
    } else if (capped) {
      say(`catalogue: plafond ${config.catalog.max} atteint — création suspendue, mises à jour continues`);
    }

    // 2) Rédaction : jusqu'à MAX_ARTICLES_PER_CYCLE nouveaux articles par cycle
    const maxPerCycle = config.maxArticlesPerCycle;
    let processed = 0;
    for (const task of pending) {
      if (processed >= maxPerCycle) break;
      if (task.type !== 'write') continue;
      processed++;
      await store.updateTask(task.id, { status: 'running', attempts: (task.attempts || 0) + 1 });
      try {
        const taskSlug = task.payload?.slug || slugify(task.keyword);
        const exists = await store.getArticle(taskSlug);
        if (exists) {
          // le sujet existe déjà : on ne le réécrit pas, on libère la tâche
          await store.updateTask(task.id, { status: 'done', error: '' });
          tasksDone++;
          continue;
        }
        const draft = await writeArticle({
          keyword: task.keyword,
          category: task.category,
          slug: task.payload?.slug,
        });
        provider = draft._provider || provider;
        const links = addInternalLinks(
          { ...draft, status: 'published' },
          await store.listArticles({ status: 'published', limit: 40 })
        );
        const final = { ...draft, ...links.article };
        final.seo_score = seoScore(final);
        await store.upsertArticle(final);
        created++;
        createdSlugs.push(final.slug);
        tasksDone++;
        say(`article créé: /blog/${final.slug} (${final.word_count} mots, score ${final.seo_score}, provider ${provider})`);
        await store.updateTask(task.id, { status: 'done', error: '' });
      } catch (e) {
        say(`tâche échouée (${task.keyword}): ${e.message}`);
        await store.updateTask(task.id, {
          status: (task.attempts || 0) >= 2 ? 'failed' : 'pending',
          error: e.message,
        });
      }
    }

    // 3) Rafraîchissement SEO d'un ancien article (fraîcheur : mise à jour, pas suppression)
    if (mode === 'full') {
      const published = await store.listArticles({ status: 'published', limit: 200 });
      if (published.length) {
        const target = published
          .slice()
          .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at))[0];
        const relatedTitles = published.filter((p) => p.slug !== target.slug).map((p) => p.title);
        const improved = await refreshWithLLM(target, relatedTitles);
        if (improved) {
          provider = improved._provider || provider;
          const merged = {
            ...target,
            title: improved.seo_title || target.title,
            meta_description: improved.meta_description || target.meta_description,
            content_md: improved.content_md,
          };
          merged.seo_score = seoScore(merged);
          await store.upsertArticle(merged);
          updated++;
          say(`article rafraîchi: /blog/${merged.slug} (score ${merged.seo_score})`);
        } else {
          const links = addInternalLinks(target, published);
          if (links.changed) {
            const merged = { ...target, ...links.article };
            merged.seo_score = seoScore(merged);
            await store.upsertArticle(merged);
            updated++;
            say(`liens internes ajoutés: /blog/${merged.slug}`);
          }
        }
      }

      // 4) Re-score global (contrôle qualité permanent)
      const all = await store.listArticles({ limit: 5000 });
      for (const a of all) {
        const s = seoScore(a);
        if (s !== a.seo_score) {
          await store.upsertArticle({ ...a, seo_score: s });
          updated++;
        }
      }
    }

    // 5) IndexNow : notification d'indexation des nouvelles URLs (Bing/Yandex/Naver/Seznam)
    if (createdSlugs.length) {
      const urls = createdSlugs.map((sl) => `${config.siteUrl.replace(/\/$/, '')}/blog/${sl}`);
      const inow = await submitUrls(urls);
      say(`indexnow: ${inow.submitted}/${urls.length} URL soumise(s)${inow.status ? ` (HTTP ${inow.status})` : ''}${inow.error ? ` — ${inow.error}` : ''}`);
    }

    const after = await catalogSize();
    say(`catalogue après cycle: ${after.total} article(s) — aucune suppression`);

    await store.recordRun({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'success',
      provider,
      articles_created: created,
      articles_updated: updated,
      tasks_done: tasksDone,
      log: log.slice(-30),
    });

    return { ok: true, created, updated, tasksDone, provider, catalog: after, slugs: createdSlugs, log };
  } catch (e) {
    say(`cycle en erreur: ${e.message}`);
    await store.recordRun({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'error',
      provider,
      articles_created: created,
      articles_updated: updated,
      tasks_done: tasksDone,
      log: log.slice(-30),
      error: e.message,
    });
    return { ok: false, error: e.message, log };
  } finally {
    running = false;
    void activeProviderName;
    void config;
  }
}

/** Réinitialise la file (utile en démo / maintenance). */
export async function resetTasks() {
  const tasks = await store.listTasks({ limit: 500 });
  for (const t of tasks) await store.updateTask(t.id, { status: 'done' });
  return tasks.length;
}
