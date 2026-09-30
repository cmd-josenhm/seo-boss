/**
 * Sauvegarde durable du catalogue.
 *
 * Le modèle éditorial est « bibliothèque » : les articles ne sont jamais supprimés.
 * Comme la base SQLite d'un hébergeur gratuit peut être réinitialisée, ce module
 * permet d'exporter le catalogue vers `web/lib/seed.js` (fichier versionné dans Git,
 * servi automatiquement par le front en complément de la base).
 *
 *   cd agent && npm run export-seed
 *
 * La fusion est cumulative : on n'écrase jamais un article existant par un contenu
 * plus pauvre, et on ne retire jamais rien.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEED_PATH = path.resolve(__dirname, '../../web/lib/seed.js');

const HEADER = `// Généré automatiquement par agent/src/export-seed.js — catalogue de secours du site.
// ⚠️ Ne jamais retirer d'article de ce fichier : c'est la sauvegarde durable du catalogue.
// Régénération : cd agent && npm run export-seed
export const SEED_ARTICLES = `;

/** Nettoie les champs internes inutiles côté site. */
function clean(a) {
  const { payload, log, ...rest } = a || {};
  void payload;
  void log;
  return rest;
}

const time = (a) => Date.parse(a?.updated_at || a?.published_at || a?.created_at || 0) || 0;

/**
 * Construit le contenu du fichier seed à partir des articles fournis,
 * en fusionnant avec les articles déjà présents dans le fichier (jamais perdus).
 */
export function buildSeedFile(articles = [], { extra = [] } = {}) {
  const bySlug = new Map();
  for (const a of [...extra, ...articles]) {
    if (!a?.slug) continue;
    const prev = bySlug.get(a.slug);
    if (!prev || time(a) >= time(prev)) bySlug.set(a.slug, a);
  }
  const list = [...bySlug.values()]
    .map(clean)
    .sort((a, b) => time(b) - time(a));
  return `${HEADER}${JSON.stringify(list, null, 2)};\n`;
}

/** Charge le seed existant (s'il est présent) sans casser si le fichier a changé. */
async function loadExistingSeed() {
  try {
    const mod = await import(`${pathToFileURL(SEED_PATH).href}?t=${Date.now()}`);
    return Array.isArray(mod.SEED_ARTICLES) ? mod.SEED_ARTICLES : [];
  } catch (e) {
    console.warn(`[export-seed] seed existant illisible (${e.message}) — on repart de la base`);
    return [];
  }
}

async function main() {
  const { store } = await import('./store.js');
  await store.init();

  const live = await store.listArticles({ status: 'published', limit: 5000 });
  const existing = await loadExistingSeed();
  const out = buildSeedFile(live, { extra: existing });
  fs.writeFileSync(SEED_PATH, out, 'utf8');

  const total = (out.match(/"slug":/g) || []).length;
  console.log(`✅ ${total} articles écrits dans ${SEED_PATH}`);
  console.log(`   (base : ${live.length} · seed existant : ${existing.length} — aucune suppression)`);
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('[export-seed] échec', e);
    process.exit(1);
  });
}
