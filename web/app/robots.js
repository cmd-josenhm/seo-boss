import { SITE } from '@/lib/site';

/**
 * robots.txt — ouverture maximale aux robots d'indexation.
 *
 * - Les robots Google (recherche, images, actualités, vidéo, inspection, IA)
 *   sont explicitement autorisés sur tout le site.
 * - `/api/` reste exclu (points d'API JSON, aucune valeur d'indexation).
 * - `/admin` n'est PLUS exclu ici : une page interdite dans robots.txt ne peut pas
 *   être lue et peut malgré tout être indexée (« indexée malgré le blocage »).
 *   Elle porte donc un vrai `noindex` (meta robots + en-tête X-Robots-Tag).
 */
const GOOGLE_BOTS = [
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Googlebot-Video',
  'Storebot-Google',
  'Google-InspectionTool',
  'GoogleOther',
  'Google-Extended', // autorise l'usage des contenus par les produits IA de Google (Gemini) — retirer cette ligne pour le refuser
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: GOOGLE_BOTS,
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
