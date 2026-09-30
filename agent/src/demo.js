/**
 * Génère N articles de démonstration dans le store local (sans serveur).
 * Usage : npm run demo  (ou node src/demo.js 8)
 */
import { store } from './store.js';
import { runCycle } from './agent.js';

const n = parseInt(process.argv[2] || '6', 10);

await store.init();
// force auto-publish pour la démo
process.env.AUTO_PUBLISH = 'true';

for (let i = 0; i < n; i++) {
  const r = await runCycle({ mode: i === n - 1 ? 'full' : 'write' });
  console.log(`cycle ${i + 1}/${n}:`, JSON.stringify({ created: r.created, provider: r.provider }));
}

const articles = await store.listArticles({ limit: 100 });
console.log(`\n✅ ${articles.length} articles dans le store (${store.mode()})`);
process.exit(0);
