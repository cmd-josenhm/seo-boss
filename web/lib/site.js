/** Configuration éditoriale & SEO du site. */
export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'BuzzAfrique',
  tagline: 'Tech, foi et opportunités numériques en Afrique',
  description:
    "BuzzAfrique : guides pratiques sur la foi au quotidien, l'IA gratuite, le freelance, le business et les réseaux sociaux pour réussir en Afrique. Contenus mis à jour automatiquement par notre agent IA.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  lang: 'fr',
  locale: 'fr_FR',
  author: 'BuzzAfrique',
  twitter: '@buzzafrique',
  email: 'contact@buzzafrique.com',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
  verification: process.env.GOOGLE_SITE_VERIFICATION || '',
  keywords: [
    'Afrique', 'prière', 'religion', 'spiritualité', 'intelligence artificielle',
    'IA gratuite', 'freelance Afrique', 'gagner de l\'argent en ligne', 'business Afrique',
    'TikTok Afrique', 'WhatsApp Business', 'technologie Afrique', 'guides pratiques',
    'Cameroun', 'Sénégal', 'Côte d\'Ivoire', 'Bénin', 'Togo',
  ],
};

/** Contact commercial : création de sites web (lien externe du menu « Devis »). */
export const DEVIS_URL = 'https://josenahounme.vercel.app/';
export const DEVIS_LABEL = 'Devis';

/**
 * Catégories actives (navbar, sitemap, filtres).
 * `accent` alimente la couleur de la pastille et des cartes.
 */
export const CATEGORIES = [
  {
    id: 'religion',
    label: 'Religion',
    desc: 'Prière, lecture, jeûne, communauté : vivre sa foi au quotidien',
    accent: '#7c5cff',
  },
  {
    id: 'ia',
    label: 'Intelligence Artificielle',
    desc: 'Outils IA gratuits et astuces pour les utilisateurs africains',
    accent: '#00b894',
  },
  {
    id: 'emploi',
    label: 'Emploi & Freelance',
    desc: 'Travailler en ligne, vendre ses compétences, être payé facilement',
    accent: '#0984e3',
  },
  {
    id: 'business',
    label: 'Business',
    desc: 'Lancer et développer un petit business, vendre sur WhatsApp',
    accent: '#e17055',
  },
  {
    id: 'reseaux',
    label: 'Réseaux sociaux',
    desc: 'TikTok, WhatsApp, Instagram : croître et monétiser',
    accent: '#d63074',
  },
];

/**
 * Catégories historiques conservées pour les anciens articles (jamais supprimés) :
 * elles restent accessibles et lisibles, mais ne sont plus mises en avant.
 */
export const LEGACY_CATEGORIES = [
  {
    id: 'fintech',
    label: 'Mobile Money',
    desc: 'Orange Money, MTN MoMo, Wave, M-Pesa : guides et comparatifs',
    accent: '#f5a623',
    legacy: true,
  },
];

export const ALL_CATEGORIES = [...CATEGORIES, ...LEGACY_CATEGORIES];

export const catLabel = (id) => ALL_CATEGORIES.find((c) => c.id === id)?.label || 'Général';
export const catDesc = (id) => ALL_CATEGORIES.find((c) => c.id === id)?.desc || '';
export const catAccent = (id) => ALL_CATEGORIES.find((c) => c.id === id)?.accent || '#00b894';
export const catSlugs = () => ALL_CATEGORIES.map((c) => c.id);
