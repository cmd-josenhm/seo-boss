# ✅ Corrections appliquées — suite à `AUDIT-PROD.md`

Tout ce qui pouvait être corrigé dans le code l'a été. Les points restants dépendent
d'actions dans vos dashboards (Render / Vercel / Search Console) : ils sont listés en bas
avec la marche à suivre exacte.

---

## 1. Catalogue : « bibliothèque » (croissance uniquement)

| Avant | Après |
|---|---|
| `rotate()` **supprimait** les anciens articles (`DELETE`) et interdisait de recréer leurs slugs | Suppression **retirée du code** : plus aucun `DELETE d'article`, les anciens contenus sont conservés et mis à jour |
| `CONTENT_MAX=0` vidait tout le catalogue à chaque cycle | `CATALOG_MAX=0` par défaut = **aucun plafond** ; si > 0, l'agent arrête simplement de créer de nouveaux sujets (sans jamais supprimer) |
| Le site affichait **1 article ou 12** selon l'état de Render | Le front **fusionne** la base de l'agent **et** `web/lib/seed.js` : rien ne disparaît jamais |
| — | Nouvelle sauvegarde cumulative : `cd agent && npm run export-seed` (+ bouton « 💾 Sauvegarder le catalogue » dans `/admin`) |

Fichiers : `agent/src/agent.js`, `agent/src/store.js`, `agent/src/config.js`,
`web/lib/articles.js`, `agent/src/export-seed.js` (nouveau), `render.yaml`.

## 2. Cadence 24h/24

- Nouveau déclencheur externe : `agent/src/tick.js` (`npm run tick`) — réveille l'agent endormi
  **et** lance un cycle.
- Nouvelle route Vercel `web/app/api/cron/run/route.js` (protégée par `CRON_SECRET`) +
  `web/vercel.json` avec un cron quotidien.
- Bloc **cron Render** prêt à décommenter dans `render.yaml`.

## 3. Sécurité de l'agent

| Faille | Correctif |
|---|---|
| `POST /internal/run` et `/internal/reset-tasks` **sans authentification** | middleware `auth` ajouté (les deux routes exigent `AGENT_TOKEN`) |
| `cors()` ouvert à toutes les origines | CORS restreint au domaine du site + localhost |
| `POST /views` spam-able (KPI de fréquentation falsifiable) | limite de débit par IP (40 req/min, configurable) |
| Comparaison de jeton `===` | comparaison **en temps constant** (`crypto.timingSafeEqual`) |
| `/status` exposait le chemin de la base | conservé (utile au dashboard), mais les routes d'écriture sont protégées |

## 4. SEO & rendu

| Problème | Correctif |
|---|---|
| Sommaire « Dans ce guide » = **liens morts** | `lib/md.js` génère désormais des `<h2 id="…">` : les ancres fonctionnent (vérifié en build) |
| **Aucune image de partage** (`og:image` absent) | images Open Graph générées par Next.js : `app/opengraph-image.js` (site) et `app/blog/[slug]/opengraph-image.js` (par article) + `apple-icon` PNG |
| `Organization.logo` pointait vers `/icon.png` → **404** | pointe vers `/icon.svg` (fichier réel), avec dimensions |
| `Article` sans image | `Article.image` = image OG générée par article |
| `robots.txt` bloquait **GPTBot** | bloc supprimé ; directive obsolète `Host:` retirée |
| Sitemap : `lastmod = maintenant` à chaque requête | `lastmod` **réels** (date de dernière modification), catégories vides exclues |
| Toutes les pages en `force-dynamic` (TTFB dépendant d'un backend qui dort) | **ISR** `revalidate = 300` sur l'accueil, le blog, les catégories et les articles |
| Titres tronqués en plein milieu (`… : avantages, tarifs et`) | génération de titres robuste : variantes, coupe propre au mot, forme nominale si le mot-clé est trop long |
| FAQ **hors sujet** (questions sur le code PIN dans un guide YouTube) | FAQ, sections, points clés et conclusion désormais **propres à chaque catégorie** |
| Blocs identiques dans tous les articles | contenu variabilisé par catégorie + variantes de titres |
| `Vercel Analytics` et `Speed Insights` importés mais **jamais rendus** | les deux composants sont maintenant montés dans le layout |
| Aucun `Content-Security-Policy` / `Permissions-Policy` | en-têtes ajoutés dans `next.config.mjs` |
| Catégorie « Mobile Money » | remplacée par **Religion** (navbar, sitemap, gabarits de contenu) ; l'ancienne catégorie reste accessible pour les articles historiques (aucune URL cassée) |

## 5. Interface (refonte complète)

- **Nouveau design system** (`web/app/globals.css`) : thème clair **et** sombre automatique,
  typographie fluide, cartes, dégradés, focus visibles, `prefers-reduced-motion`.
- **Navbar responsive** : categorie Religion, lien **Devis** → `https://josenahounme.vercel.app/`,
  menu hamburger sur mobile, lien d'évitement « Aller au contenu ».
- **Footer** : Espace admin, Flux RSS et Plan du site **supprimés** ; la mention
  « Contenus produits & optimisés… » est remplacée par
  **« Contactez-nous si vous avez besoin d'un site web »** (lien vers le site de devis).
- **Accueil** : la section « Un site qui s'améliore 24h/24 » (et son bouton « Ouvrir le tableau
  de bord ») est **supprimée** ; nouvelle page d'accueil (héro, à la une, derniers guides,
  thématiques, bandeau devis).
- Blog, catégories, article, 404, à-propos, contact et `/admin` entièrement re-stylés.

## 6. Dashboard `/admin`

- Les indicateurs viennent désormais de **`/status` de l'agent** (`catalog.total`, `published`)
  au lieu d'une liste d'articles chargée avec un timeout de 6 s et un `catch` muet — c'est ce qui
  affichait « 0 article / score 0 » alors que le catalogue était plein.
- Les erreurs sont **visibles** (encart rouge) au lieu d'être avalées.
- Nouveau : taille du catalogue, bouton de sauvegarde, checklist mise à jour
  (IndexNow = Bing/Yandex/Naver/Seznam, Search Console, catalogue conservé).

---

## 🔧 À faire de votre côté (dashboards)

1. **Render → Environment** : ajouter `GROQ_API_KEY` (gratuit) → les articles passeront du
   moteur template à un vrai LLM (`provider` changera dans `/admin`).
2. **Render → plan payant + Disk** (pour une base réellement persistante) : décommenter les blocs
   `plan:` / `disk:` de `render.yaml` et mettre `DB_PATH=/var/data/seo-boss.db`.
   Sans cela, le site reste complet grâce au seed, mais l'agent repart d'une base vide.
3. **Cadence 24h/24** : décommenter le cron Render **ou** créer un ordonnanceur externe gratuit
   (cron-job.org / UptimeRobot) sur
   `POST https://seo-boss-agent.onrender.com/run` avec l'en-tête `x-agent-token: <AGENT_TOKEN>`.
4. **Vercel → Environment** : ajouter `CRON_SECRET` (protège `/api/cron/run`) et
   `GOOGLE_SITE_VERIFICATION` (code fourni par Search Console).
5. **Search Console** : valider le domaine et soumettre `sitemap.xml`.
6. **Domaine** : brancher `buzzafrique.com` sur Vercel (301 depuis `buzzafrique.vercel.app`)
   pour accumuler de l'autorité sur un vrai domaine.
