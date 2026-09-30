/** Configuration éditoriale & SEO du site. */
export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'BuzzAfrique',
  tagline: "Tech, argent et opportunités numériques en Afrique",
  description:
    "BuzzAfrique : guides pratiques mobile money, IA gratuite, freelance, business et réseaux sociaux pour réussir en Afrique. Contenus mis à jour automatiquement par notre agent IA.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  lang: 'fr',
  locale: 'fr_FR',
  author: 'BuzzAfrique',
  twitter: '@buzzafrique',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
  verification: process.env.GOOGLE_SITE_VERIFICATION || '',
  keywords: [
    'Afrique', 'mobile money', 'Orange Money', 'MTN MoMo', 'intelligence artificielle',
    'freelance Afrique', 'gagner de l\'argent en ligne', 'business Afrique', 'TikTok Afrique',
    'technologie Afrique', 'guides pratiques', 'Cameroon', 'Sénégal', 'Côte d\'Ivoire', 'Nigeria',
  ],
};

export const CATEGORIES = [
  { id: 'fintech', label: 'Mobile Money', desc: 'Orange Money, MTN MoMo, Wave, M-Pesa : guides et comparatifs' },
  { id: 'ia', label: 'Intelligence Artificielle', desc: 'Outils IA gratuits et astuces pour les utilisateurs africains' },
  { id: 'emploi', label: 'Emploi & Freelance', desc: 'Travailler en ligne, vendre ses compétences, être payé facilement' },
  { id: 'business', label: 'Business', desc: 'Lancer et développer un petit business, vendre sur WhatsApp' },
  { id: 'reseaux', label: 'Réseaux sociaux', desc: 'TikTok, WhatsApp, Instagram : croître et monétiser' },
];

export const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'General';
export const catDesc = (id) => CATEGORIES.find((c) => c.id === id)?.desc || '';
