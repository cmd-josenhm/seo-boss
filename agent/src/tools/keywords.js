/**
 * Moteur de mots-clés ciblant l'Afrique francophone (+ Afrique anglophone).
 * Objectif : long-traîne locale, intentions fortes (comment faire, meilleurs,
 * prix, télécharger, gratuit...) sur les 5 piliers éditoriaux du site.
 */

export const CATEGORIES = {
  religion: {
    label: 'Religion & Spiritualité',
    seeds: [
      'prière',
      'lecture de la Bible',
      'Coran',
      'jeûne',
      'louange',
      'étude biblique',
      'groupe de prière',
      'méditation',
      'application de lecture spirituelle',
      'dons et offrandes en ligne',
    ],
    // Intentions adaptées : on reste sur des recherches informationnelles/pratiques.
    intents: [
      { f: (k, m) => `comment prier ${m} : guide pratique`, p: 9 },
      { f: (k, m) => `meilleures applications gratuites pour ${lower(k)} ${m}`, p: 9 },
      { f: (k, m) => `${lower(k)} : guide complet pour débutants ${m}`, p: 8 },
      { f: (k, m) => `comment organiser ${lower(k)} ${m}`, p: 8 },
      { f: (k, m) => `${lower(k)} en ligne : comment faire ${m}`, p: 7 },
      { f: (k, m) => `pourquoi ${lower(k)} est important ${m}`, p: 6 },
      { f: (k, m) => `${lower(k)} : erreurs à éviter ${m}`, p: 6 },
      { f: (k, m) => `où trouver une communauté pour ${lower(k)} ${m}`, p: 6 },
    ],
  },
  ia: {
    label: 'Intelligence Artificielle',
    seeds: [
      'ChatGPT',
      'Gemini',
      'IA gratuite',
      'écriture avec l\'IA',
      'traducteur IA',
      'créer des images avec l\'IA',
      'faire un CV avec l\'IA',
      'apprendre avec l\'IA',
    ],
  },
  emploi: {
    label: 'Emploi & Freelance',
    seeds: [
      'freelance',
      'travailler en ligne',
      'Fiverr',
      'Upwork',
      'CV en ligne',
      'emploi à distance Afrique',
      'micro-tâches rémunérées',
      'formation gratuite en ligne',
    ],
  },
  business: {
    label: 'Business & E-commerce',
    seeds: [
      'petit business',
      'vendre sur WhatsApp',
      'dropshipping Afrique',
      'monter une boutique en ligne',
      'business plan simple',
      'gagner de l\'argent',
      'side hustle étudiant',
      'Jumia vendeur',
    ],
  },
  reseaux: {
    label: 'Réseaux sociaux & Astuces',
    seeds: [
      'TikTok',
      'WhatsApp',
      'Instagram',
      'YouTube',
      'Facebook',
      'cross-posting',
      'gagner des abonnés',
      'viraliser une vidéo',
    ],
  },
};

const MARKETS = [
  'au Cameroun', 'au Sénégal', "en Côte d'Ivoire", 'au Nigeria', 'au Ghana',
  'au Kenya', 'au Maroc', "en RDC", 'au Bénin', 'au Togo', 'au Gabon',
  'en Afrique', "d'Afrique", 'au Burkina Faso', 'au Mali', 'au Rwanda',
];

const INTENTS = [
  { f: (k, m) => `comment ${lower(k)} ${m}`, p: 9 },
  { f: (k, m) => `meilleures ${lower(k)} ${m}`, p: 8 },
  { f: (k, m) => `${lower(k)} : guide complet ${m}`, p: 7 },
  { f: (k, m) => `${lower(k)} gratuit ${m} en 2026`, p: 7 },
  { f: (k, m) => `${lower(k)} avantages et inconvénients ${m}`, p: 6 },
  { f: (k, m) => `${lower(k)} pas à pas ${m}`, p: 8 },
  { f: (k, m) => `combien coûte ${lower(k)} ${m}`, p: 6 },
  { f: (k, m) => `${lower(k)} pour débutants ${m}`, p: 7 },
  { f: (k, m) => `${lower(k)} alternative gratuite ${m}`, p: 7 },
  { f: (k, m) => `${lower(k)} astuces ${m}`, p: 6 },
  // --- intentions "question" (recherches fréquentes / People Also Ask) ---
  { f: (k, m) => `pourquoi ${lower(k)} ${m}`, p: 7 },
  { f: (k, m) => `comment ça marche ${lower(k)} ${m}`, p: 8 },
  { f: (k, m) => `est-ce que ${lower(k)} est sûr ${m}`, p: 7 },
  { f: (k, m) => `quel est le meilleur ${lower(k)} ${m}`, p: 8 },
  { f: (k, m) => `où trouver ${lower(k)} ${m}`, p: 6 },
  { f: (k, m) => `${lower(k)} avis et témoignages ${m}`, p: 6 },
  { f: (k, m) => `quand utiliser ${lower(k)} ${m}`, p: 5 },
  { f: (k, m) => `${lower(k)} free ou payant ${m}`, p: 6 },
];

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** mélange déterministe (seed = heure) pour varier les sujets à chaque cycle */
function seededShuffle(arr, seed) {
  const out = arr.slice();
  let a = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    a = (a + 0x6d2b79f5) >>> 0;
    const j = a % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Génère un pool de mots-clés longue traîne (round-robin sur les catégories). */
export function mineKeywords({ excludeSlugs = [], limit = 40 } = {}) {
  const base = Date.now() % 97;
  const perCat = [];
  let gi = 0;

  for (const [cat, def] of Object.entries(CATEGORIES)) {
    const intents = def.intents || INTENTS;
    const list = [];
    let i = 0;
    for (const seed of def.seeds) {
      for (const intent of intents) {
        const market = MARKETS[(gi + i + base) % MARKETS.length];
        const keyword = intent.f(seed, market);
        const slug = slugify(keyword);
        if (!excludeSlugs.includes(slug)) {
          list.push({ keyword, slug, category: cat, priority: intent.p });
        }
        i++;
      }
    }
    // mélange : les intentions "question" sont échantillonnées dès le début
    perCat.push(seededShuffle(list, (base + gi * 131) >>> 0));
    gi += 7;
  }

  // round-robin : 1 religion, 1 ia, 1 emploi, 1 business, 1 reseaux, ...
  const out = [];
  let col = 0;
  while (out.length < limit) {
    let added = false;
    for (const list of perCat) {
      const item = list[col];
      if (item) {
        out.push(item);
        added = true;
        if (out.length >= limit) break;
      }
    }
    if (!added) break;
    col++;
  }
  return out.sort((a, b) => b.priority - a.priority);
}

export { slugify };
