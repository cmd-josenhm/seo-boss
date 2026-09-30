# 🔎 Audit BuzzAfrique — du dépôt GitHub à la prod en ligne

**Cible auditée :** `cmd-josenhm/seo-boss` @ `d3f591c` → front https://buzzafrique.vercel.app + agent https://seo-boss-agent.onrender.com
**Date :** 30 septembre 2026 · **Méthode :** lecture intégrale du code, build local reproductible, sondage de la prod (HTML, API, sitemap, robots, JSON-LD, en-têtes HTTP, logs de l'agent).

---

## 1. Verdict express

| Question | Réponse |
|---|---|
| L'infrastructure tient debout ? | ✅ Oui. Le site répond, HTTPS/HSTS, SEO technique de base très correct, build reproductible à l'identique. |
| Le produit (un média qui attire 1 000–5 000 visiteurs/j) tient debout ? | ❌ Non. **1 seul article en ligne**, 4 catégories sur 5 vides. |
| L'agent IA tourne 24h/24 comme annoncé ? | ❌ Non. Il redémarre en boucle et **perd sa base à chaque redémarrage** : ~1 article par réveil. |
| La stratégie SEO peut-elle produire du trafic ? | ❌ Pas en l'état : la « rotation » **supprime les URLs indexées**, et le contenu est un template dupliqué (photos, FAQ hors sujet, blocs identiques). |
| Risque immédiat | Contenu qui apparaît/disparaît toutes les 15–30 min, pages seed indexables en 200 orphelines, endpoints d'administration **sans authentification**. |

**Note globale : 3,5/10 en production.** Le code est propre et lisible (bon point), mais l'exploitation (persistance, exécution 24/7) et la stratégie de contenu/SEO ne sont pas au niveau de l'objectif affiché.

---

## 2. Chaîne réelle « dépôt → prod » (vérifiée, pas déduite)

| Maillon | Source | Hébergeur | Configuration constatée en prod | Preuve |
|---|---|---|---|---|
| Front Next.js 14.2.35 | `web/` | **Vercel** | Root Directory = `web` (réglage dashboard, absent du dépôt), toutes les pages en `force-dynamic` | `x-vercel-cache: MISS` sur toutes les pages, chunk `fd9d1056-…js` **identique à mon build local du commit `d3f591c`** → la prod correspond bien à `main` |
| Agent Node/Express | `agent/` | **Render** (blueprint `render.yaml`, branche `main`, autoDeploy) | `provider: template`, cycle 30 min, DB `/opt/render/project/src/agent/data/seo-boss.db` | `GET /status` en direct |
| Base de données | `agent/src/store.js` (better-sqlite3, WAL) | Dans le conteneur Render | 277–281 KB | `counts.db_size_kb` |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights`, GA4 | Vercel | GA4 `G-R8TB7NDEYQ` **actif** en prod | `<script src="https://www.googletagmanager.com/gtag/js?id=G-R8TB7NDEYQ">` |
| IndexNow | `agent/src/tools/indexnow.js` | api.indexnow.org | Clé `0f8c…0718` servie sur `/indexnow.key.txt`, soumission **HTTP 200** | log du dernier run |
| Search Console | — | — | ❌ **Aucune balise `google-site-verification` en prod** | sélecteur `meta[name=google-site-verification]` → `null` |
| CI / tests | — | — | ❌ Aucun workflow GitHub Actions, aucun test, historique git = **1 seul commit** | `gh run list` vide, `git rev-list --count HEAD` = 1 |

### État mesuré le 30/09 à ~10:12 UTC

```
Agent   : uptime 24 min · 1 article · 1 run · 14 tâches en file · 0 contenu tourné
Front   : /blog = 1 article · /category/fintech = vide · sitemap = 10 URLs (dont 4 catégories vides)
Trafic  : 9 vues agrégées par le beacon interne (dont mes requêtes d'audit)
```

---

## 3. Ce qui est bien fait (à conserver)

- **Architecture simple et lisible** : 2 déploiements, zéro service externe facturé, code court (~1 450 lignes côté agent) et commenté en français.
- **SEO technique de base solide** : `sitemap.xml`, `robots.txt`, RSS `feed.xml`, canonicals corrects par page (vérifié en ligne), balises OG/Twitter, `lang="fr"`, titres/descriptions uniques, 404 propre.
- **Données structurées** : `WebSite`, `Organization`, `Article`, `FAQPage`, `BreadcrumbList` — bien formés et échappés (`replace(/</g,'\\u003c')`).
- **Analytics à 3 étages** : GA4 + Vercel Analytics + Speed Insights + beacon interne (`/api/track` → table `page_views`). C'est rare et pertinent.
- **Défense en profondeur côté rendu** : fallback seed embarqué (le site ne tombe jamais), timeouts explicites sur tous les `fetch`, `AbortController` partout.
- **IndexNow réellement câblé** (fait rare) : clé hébergée, soumission faite après chaque cycle.
- **Build reproductible** : `npm run build` passe sur ce commit, 96,2 kB de First Load JS, 12 pages générées — j'ai reproduit la prod à l'identique en local.
- **En-têtes de sécurité** : HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `poweredByHeader: false`.

---

## 4. 🔴 P0 — Bloquants (à corriger avant toute action SEO)

### P0-1 · La base SQLite est éphémère : le site change de contenu à chaque réveil

**Constat.** `DB_PATH` n'est pas défini → la base vit dans `/opt/render/project/src/agent/data/seo-boss.db`, **dans le conteneur Render**. Or (doc Render confirmée) :
- les web services gratuits **s'endorment après 15 min d'inactivité** et redémarrent en 30–60 s ;
- « *local filesystem changes are lost with each deploy* » et **le disque persistant est un add-on payant, indisponible en free/starter**.

**Preuves en ligne.**
- `uptime_s = 1443` → l'agent venait de redémarrer, et `counts.articles = 1`, `retired_total = 0`, **un seul run dans `last_runs`** : le catalogue repart de zéro à chaque démarrage. Depuis l'ouverture du service (plusieurs heures), il n'y a donc jamais eu plus d'**1 article en base**.
- Le `seed` embarqué contient **12 articles** ; la prod en affiche **1**. Selon que Render est réveillé ou endormi, `https://buzzafrique.vercel.app/blog` renvoie **1 article ou 12 articles**, et `sitemap.xml` **10 ou 21 URLs**. J'ai reproduit les deux états : prod = 1 article / 10 URLs, mon serveur local (sans agent) = 12 articles / 21 URLs.

**Impact.** C'est le pire signal possible pour un moteur : le même site sert un catalogue différent à chaque crawl, et des URLs indexées **passent en 404** quand la base est vidée.

**Correctif.**
```yaml
# render.yaml
    plan: starter                      # un disque persistant n'existe qu'en plan payant
    disk:
      name: seo-boss-data
      mountPath: /var/data
      sizeGB: 1
    envVars:
      - key: DB_PATH
        value: /var/data/seo-boss.db   # <-- actuellement absent ⇒ DB jetable
```
*Alternative 100 % gratuite :* base Postgres Render free (1 Go), ou snapshot de la base committé dans le dépôt au build et copié au démarrage.

---

### P0-2 · L'agent ne tourne pas 24h/24 : « 24/7 » est un `setInterval` dans un conteneur qui s'endort

**Constat.** La boucle est un `setInterval(tick, RUN_INTERVAL_MINUTES * 60 * 1000)` (`agent/src/index.js`) avec `RUN_INTERVAL_MINUTES=30`. Sur le plan gratuit, le conteneur est **coupé après 15 min sans requête HTTP** : le timer de 30 min n'a donc, en pratique, presque jamais l'occasion de se déclencher une deuxième fois. Chaque réveil = nouveau conteneur + nouveau timer + base vide → **~1 article par réveil**, très loin des « 48 articles/jour » annoncés dans le README.

**Preuve.** Le run enregistré couvre 09:47:44 → 09:47:45 (1 s), `articles_created: 1`, et l'uptime au moment de mon appel était de 24 min : une seule exécution depuis le démarrage.

**Correctif (au choix).**
1. **Render Cron Job** (type de service dédié) qui appelle `POST https://seo-boss-agent.onrender.com/run` toutes les 30 min avec `x-agent-token` — le ping réveille aussi le service.
2. **Vercel Cron** → `/api/agent/run` (la route existe déjà et est protégée par `ADMIN_TOKEN`).
3. Keep-alive externe (UptimeRobot toutes les 10 min) — rustine, mais suffisante pour un plan gratuit.

---

### P0-3 · La « rotation » détruit le SEO par conception (suppression d'URLs indexées)

**Constat.** `agent/src/agent.js → rotate()` **supprime** (`store.retireArticle` = `DELETE FROM articles`) les contenus anciens et mémorise leurs slugs dans `retired_slugs` **pour ne jamais les recréer**. `CONTENT_MAX=0` vide même tout le catalogue à chaque cycle.

**Pourquoi c'est un problème structurel.** Un article supprimé → l'URL passe en 404/410 → Google la retire de l'index, et la « prime de fraîcheur » ne compense jamais la perte d'un contenu déjà indexé et lié. En supprimant 40 contenus toutes les ~6 h puis en recréant ailleurs, le site ne peut **jamais accumuler ni autorité, ni maillage interne, ni historique d'indexation**. Ajoutez que chaque nouvelle URL diffère de quelques mots (même template) : pour un moteur, c'est du *content churn* + du contenu quasi dupliqué, deux catégories explicitement visées par les politiques anti-spam de Google (« scaled content abuse », 2024).

**Correctif.** Remplacer *supprimer puis recréer* par **mettre à jour la même URL** :
- garder le slug, réécrire le contenu (`upsertArticle` avec `created_at` conservé, `updated_at` neuf) ;
- réserver la création de nouveaux slugs au **net growth** (ex. +2/jour), pas à la rotation ;
- si un contenu doit vraiment disparaître, faire une **redirection 301** vers sa catégorie (jamais un 404 sec).

---

### P0-4 · Contenu 100 % « template » : FAQ hors sujet et blocs identiques d'un article à l'autre

**Constat.** `provider: "template"` en prod = **aucun LLM branché** (`GROQ_API_KEY` n'a jamais été collée dans Render, alors que la clé gratuite est prévue au README). Le générateur local (`agent/src/tools/writer.js`) réutilise le **même tableau de FAQ pour toutes les catégories**.

**Preuve, sur l'article réellement publié** (`/blog/comment-youtube-en-cote-d-ivoire`, catégorie Réseaux sociaux) :
> Q. « Quels sont les principaux risques ? » → *« Les risques courants : **partage du code PIN**, arnaques « gains faciles » et applications non officielles… »*
> Q. « Est-ce vraiment gratuit ? » → *« Des frais peuvent s'appliquer selon le **montant, l'opérateur** ou l'option choisie. »*

Ces réponses parlent de mobile money dans un guide YouTube. La section **« Points clés à retenir »** est, elle, **strictement identique** dans tous les articles (`- Vérifiez votre éligibilité avant de vous inscrire…`), tout comme le paragraphe « Alternatives et comparatif » (gabarit par catégorie). Les titres sont tronqués en plein milieu (`Comment petit business en Afrique : méthode pas à pas (testé en`) et les mots-clés sont mécaniques (`Meilleures chatGPT au Mali`, `Meilleures orange Money en RDC`).

**Risque.** C'est exactement le profil que Google classe en *contenu à grande échelle de faible valeur* : indexation refusée, voire action manuelle. Un site entier de ce type ne se classe pas, quelle que soit la qualité technique.

**Correctif.**
1. **Brancher Groq** (gratuit) via Render → Environment : `GROQ_API_KEY=gsk_…` puis redéployer — le pipeline basculera seul sur `llama-3.3-70b-versatile`.
2. Rendre la FAQ **dépendante de la catégorie** (et non du même tableau), et supprimer les blocs « Points clés » / « Conclusion » génériques.
3. Passer en **publication contrôlée** : `AUTO_PUBLISH=false` (statut `draft`) + validation humaine dans `/admin` (le bouton publier/dépublier existe déjà).
4. Baisser le volume (l'objectif « 48 articles/jour » doit devenir « 3–5 articles/jour réellement utiles »), ajouter des **preuves** : captures, tarifs datés, sources officielles, auteur identifié.

---

### P0-5 · Deux sources de vérité concurrentes (SQLite + seed) → pages fantômes et 200 trompeurs

**Constat.** `web/lib/articles.js` bascule sur `web/lib/seed.js` (12 articles) dès que l'agent dépasse 6 s, renvoie une erreur, ou n'est pas configuré ; et `getArticle(slug)` retombe sur le seed **unité par unité**.

**Preuves.**
- `https://buzzafrique.vercel.app/blog/chatgpt-guide-complet-au-rwanda` répond **200** avec un contenu complet… alors que cet article **n'existe pas** dans la base de l'agent, n'est **lié nulle part** et n'est **pas dans le sitemap** : une page orpheline indexable (soft-duplicate).
- `https://buzzafrique.vercel.app/blog/comment-youtube-en-cote-d-ivoire` (le seul article réel) répond **404** quand Render dort (le seed ne le connaît pas) et **200** quand Render est réveillé. Une URL indexée qui alterne 200/404 est désindexée.

**Correctif.** Une seule source de vérité en production : soit seed généré **au build** (et alors servi comme source unique), soit base distante, mais pas les deux. Les articles du seed absents de la base doivent être **301 vers /blog** ou en `noindex` tant que la base n'est pas persistante (P0-1).

---

### P0-6 · Endpoints d'administration **sans authentification** sur une URL publique

`agent/src/index.js` :

```js
app.post('/run', auth, …)                    // ✅ protégé
app.post('/internal/run', async (req,res) => { … })          // ❌ AUCUN middleware auth
app.post('/internal/reset-tasks', async (_req,res) => { … }) // ❌ AUCUN middleware auth
```

`https://seo-boss-agent.onrender.com/internal/run` est donc appelable par n'importe qui : n'importe qui peut déclencher des cycles (CPU, appels LLM, écritures en base) et **vider la file de tâches** (`/internal/reset-tasks` marque tout en `done` — *je n'ai volontairement pas exécuté ces appels*). S'ajoutent :
- `app.use(cors())` → **toutes origines** autorisées ;
- `POST /views` public → les « vues » affichées dans `/admin` sont librement falsifiables (le KPI de fréquentation n'est pas fiable) ;
- `GET /status` public expose le chemin de la base et le trafic ;
- `/api/agent/status` expose la même chose depuis Vercel.

**Correctif.**
```js
const auth = (req, res, next) => {
  const t = req.headers.authorization?.replace(/^Bearer\s+/i,'') || req.headers['x-agent-token'];
  if (t && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(config.agentToken))) return next();
  res.status(401).json({ error: 'token requis' });
};
app.post('/internal/run', auth, …);
app.post('/internal/reset-tasks', auth, …);
app.use(cors({ origin: [config.siteUrl, /^http:\/\/localhost:\d+$/] }));
```
\+ `express-rate-limit` sur `/views` et `/internal/*`. Envisager de **supprimer** les routes `/internal/*` (elles ne servent qu'à la maintenance).

---

## 5. 🟠 P1 — Importants

### P1-1 · Le dashboard `/admin` affiche des KPI faux (et jamais d'erreur)
**Observé en prod :** `Articles = 0`, `Score SEO moyen = —`, `Mots publiés = 0k`, tableau « Contenus (0) » **vide**, alors que l'agent renvoyait `counts.articles = 1` et que `/api/articles?limit=100` renvoyait bien l'article. Cause : `web/app/admin/page.js` calcule ces KPI depuis `fetch('/api/articles?limit=100')` (timeout **6 s**, `.catch(() => {})` silencieux) alors que `/api/agent/status` (timeout 8 s) répondait. Le dashboard conclut « ⚠️ Score SEO moyen ≥ 70 — actuel : 0 » sur une page parfaitement saine (score réel : 95).
**Correctif :** alimenter les KPI avec `status.agent.counts` / `status.agent.traffic`, afficher l'erreur au lieu de l'avaler, et recharger la liste d'articles avec le même `AbortSignal`.

### P1-2 · Tout est en `force-dynamic` : chaque visite = un appel au backend (et jusqu'à 6 s d'attente)
`/`, `/blog`, `/blog/[slug]`, `/category/*`, `/sitemap.xml`, `/feed.xml` sont rendus à la demande, sans cache (`x-vercel-cache: MISS`). Une visite = 1 invocation de fonction Vercel + 1 appel HTTP à Render. Quand Render est froid (30–60 s), le front attend son timeout (6 s) puis sert le seed : **TTFB dégradé** et expérience utilisateur cassée pour le premier visiteur après chaque période creuse — alors que l'objectif est justement d'attirer 1 000–5 000 visiteurs/jour.
**Correctif :** ISR (`export const revalidate = 300`) + cache tagué, ou couche de cache (Vercel KV/Redis) alimentée par l'agent ; garder `force-dynamic` uniquement sur `/api/*` et `/admin`.

### P1-3 · Aucune image, donc aucun partage social — le levier n°1 en Afrique
`og:image` = **null** en prod (page d'accueil **et** articles), aucun `twitter:image`, aucun `favicon.ico`, aucun `apple-touch-icon`, aucun visuel d'article. Or les boutons de partage sont **WhatsApp / Facebook / X** : sans image, le partage ressemble à un lien mort — sur le canal d'acquisition principal du projet.
**Correctif :** `web/app/opengraph-image.js` (génération dynamique via `ImageResponse`) ou une image OG par article, plus un `favicon.ico` et un PNG 512×512.

### P1-4 · Le sommaire « Dans ce guide » est fait de liens morts
**Vérifié sur le HTML rendu :** la page génère `<a href="#points-cles-a-retenir">` mais `mdToHtml()` n'écrit **aucun `id`** sur les `<h2>` (`<h2>` sans attribut). Cliquer une entrée du sommaire ne fait rien.
**Correctif (extrait de `web/lib/md.js`) :**
```js
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// …
out.push(`<h${lvl} id="${slug(h[2])}">${inline(h[2])}</h${lvl}>`);
```

### P1-5 · Données structurées : logo 404
`components/JsonLd.js` déclare `logo: ${url}/icon.png` → **`https://buzzafrique.vercel.app/icon.png` renvoie 404** (vérifié). Google attend un logo carré ≥ 112 px pour `Organization`.
**Correctif :** ajouter `web/public/icon.png` (512×512) ou pointer sur `/icon.svg`.

### P1-6 · Sitemap : `lastModified = now` à chaque requête
`sitemap.js` pose la date du jour sur l'accueil, `/blog`, les catégories et l'a-propos à **chaque appel** (vu en prod : tous les `lastmod` identiques à 10:11:19). Un `lastmod` toujours « maintenant » est ignoré (au mieux) ou considéré comme non fiable (au pire).
**Correctif :** vraie date de modification, ou pas de `lastmod` pour les pages statiques ; `changeFrequency`/`priority` sont ignorés par Google (à garder par souci de propreté, sans en attendre d'effet).

### P1-7 · Rien ne prouve que Google indexe, et le README se trompe sur IndexNow
- **Aucune balise `google-site-verification`** en prod → pas de preuve de propriété Search Console, donc pas de suivi d'indexation ni de soumission de sitemap.
- Le README et la checklist `/admin` annoncent « **IndexNow → Google/Bing indexent les nouvelles URLs en quelques minutes** » : c'est faux pour Google, qui **ne participe pas** au protocole (il couvre Bing, Yandex, Naver, Seznam). Le HTTP 200 renvoyé est celui de l'API IndexNow, pas une confirmation d'indexation.
**Correctif :** vérifier le domaine dans GSC (`GOOGLE_SITE_VERIFICATION=…`), soumettre `sitemap.xml`, corriger le discours interne, et suivre l'indexation (rapport « Pages ») comme KPI.

### P1-8 · `robots.txt` bloque GPTBot — en contradiction avec la stratégie
```
User-Agent: GPTBot
Disallow: /
```
Alors que le projet mise sur Bing (+ IndexNow) et l'IA générative comme canal de découverte, bloquer GPTBot empêche ChatGPT Search / Copilot de citer le site. La directive `Host:` est par ailleurs obsolète (ignorée).
**Correctif :** retirer le bloc GPTBot (ou l'assouplir), supprimer `Host:`.

### P1-9 · Le domaine : `*.vercel.app` n'est pas un actif
Le site vit sur un sous-domaine partagé, alors que la page contact affiche déjà `contact@buzzafrique.com`. Pour un média qui veut accumuler de l'autorité, il faut **un domaine propre** (`buzzafrique.com` → 301 vers lui, canonicals mis à jour, Search Console + GA4 reconfigurés).

### P1-10 · Aucun garde-fou d'exploitation
Pas de CI, pas de tests, pas de `vercel.json` versionné (le « Root Directory = web » vit dans le dashboard : un import dans un autre projet casserait le déploiement), pas d'alerte si l'agent tombe, pas de suivi de coût, pas de séparation dev/preprod (le même blueprint `main` + autoDeploy publie directement en prod).

---

## 6. 🟡 P2 — Détails à traiter à l'occasion

| # | Constat | Correctif |
|---|---|---|
| 1 | 4 catégories sur 5 renvoient une page quasi vide (« L'agent IA rédige les premiers articles… ») et sont dans le sitemap | `noindex` tant que < 3 articles, ou ne pas les exposer |
| 2 | Titres tronqués/dupliqués par le template (`… : avantages, tarifs et`) | générer le titre après rédaction, viser 50–60 car., sans répétition du mot-clé |
| 3 | `ADMIN_TOKEN` stocké en `localStorage`, comparaison `!==` (non constant-time), pas de 2FA ni de rate-limit sur `/api/agent/*` | cookie `httpOnly` + `SameSite=Strict`, comparaison en temps constant, limitation de débit |
| 4 | Pas de `Content-Security-Policy`, ni `Permissions-Policy` | ajouter aux `headers()` de `next.config.mjs` |
| 5 | Aucune page auteur, aucune page « sources », pas de `dateModified` affichée | signaux E-E-A-T minimaux |
| 6 | `demo.js`/seed à régénérer à la main (`npm run demo`), désynchronisé de la base | automatiser (script de snapshot au build) |
| 7 | Logs agent uniquement en console (`last_runs.log`, 30 lignes) | export vers un fichier/log drain, alerte si 0 article créé en 24 h |
| 8 | Aucune mesure de performance réelle (Speed Insights activé mais aucune donnée exploitée) | suivre LCP/TTFB par page, alerter sur le TTFB backend |

---

## 7. 🎯 Objectif « 1 000–5 000 visiteurs/jour » : écart réaliste

| Levier (README) | État réel constaté | Écart |
|---|---|---|
| Volume : 48 articles/jour | **1 article en ligne**, ~1 par redémarrage | 🔴 bloqué par P0-1/P0-2 |
| Longue traîne locale | 14 mots-clés en file, 0 publié au-delà d'un | 🔴 bloqué en amont |
| Qualité / E-E-A-T | Template identique, FAQ hors sujet, 0 image, 0 source, 0 auteur | 🔴 bloqué par P0-4 |
| SEO technique | Sitemap/robots/RSS/canonicals/JSON-LD : **corrects** | 🟢 conforme |
| Indexation rapide | IndexNow OK (Bing/Yandex/Naver/Seznam) mais **Google non couvert**, GSC non vérifiée | 🟠 incomplet |
| Maillage interne | Section « Articles liés » ajoutée automatiquement | 🟠 sans catalogue, sans effet |
| Fraîcheur | 1 rafraîchissement/cycle… mais le reste est **supprimé** | 🔴 contre-productif |
| Autorité / notoriété | Aucun backlink, aucun réseau social, aucun domaine propre | 🔴 absent du plan |
| Performance | SSR sans cache vers un backend qui dort | 🟠 dégradé par P1-2 |

**Trajectoire réaliste :** 1 000–5 000 visiteurs/jour sur un marché africain francophone se gagne avec **200–500 pages réellement utiles + 30–100 backlinks + Search Console suivie**, sur 6 à 12 mois. Aucune configuration d'agent ne remplace ces deux ingrédients ; le rôle légitime de l'agent est d'**accélérer la production et la maintenance**, pas de remplacer la stratégie.

---

## 8. Plan d'action priorisé

### 48 h — remettre la prod d'aplomb (P0)
1. `plan: starter` + **disque Render** (`/var/data`) et `DB_PATH=/var/data/seo-boss.db` → la base survit. *(P0-1)*
2. **Render Cron Job** (30 min) → `POST /run` avec `x-agent-token` : l'agent tourne vraiment en continu. *(P0-2)*
3. **Authentifier** `/internal/run` et `/internal/reset-tasks`, restreindre le CORS au domaine du site, limiter `/views`. *(P0-6)*
4. **Arrêter la rotation destructive** : `ROTATION_ENABLED=false` + `CONTENT_MAX=200`, et réécrire `rotate()` en « mise à jour sur place » plutôt que `DELETE`. *(P0-3)*
5. **Désactiver les pages seed en production** (`noindex` ou 301) et journaliser explicitement les bascules sur le seed. *(P0-5)*
6. Coller `GROQ_API_KEY` dans Render et passer `AUTO_PUBLISH=false` le temps de contrôler la qualité. *(P0-4)*

### Semaine 1 — qualité, indexation, performance (P1)
7. Corriger les KPI de `/admin` (source = `/status`). *(P1-1)*
8. ISR `revalidate = 300` sur les pages publiques + `generateStaticParams` pour les articles. *(P1-2)*
9. `opengraph-image` dynamique + favicon/PNG. *(P1-3)*
10. Ids sur les `<h2>` (sommaire réparé). *(P1-4)* / logo JSON-LD valide. *(P1-5)* / `lastmod` réels. *(P1-6)*
11. Vérifier le domaine dans **Search Console**, soumettre le sitemap, suivre « Pages ». *(P1-7)*
12. Débloquer GPTBot, nettoyer `robots.txt`. *(P1-8)*

### Semaine 2–4 — stratégie
13. Acheter/pointer un **domaine propre** et rediriger en 301. *(P1-9)*
14. Réécrire le gabarit éditorial : FAQ par catégorie, données vérifiables (tarifs, opérateurs, dates), auteur, 1 image par article, 800–1 200 mots utiles.
15. Objectif **3–5 publications/jour** + 5 mises à jour/jour (pas de suppression), pilotées par une vraie recherche de mots-clés (Search Console + outils de volume réels, pas seulement des combinaisons `intention × pays`).
16. Plan de netlinking : annuaires locaux, médias africains, réponses utiles sur les forums/WhatsApp, comptes sociaux officiels.
17. CI minimale : lint + `next build` + test du pipeline agent sur PR, et une préprod Render (branche ≠ `main`) avant l'autoDeploy.

---

## 9. Annexe — commandes de vérification

```bash
# État de l'agent (public)
curl -s https://seo-boss-agent.onrender.com/status | jq '{provider, uptime_s, counts, rotation, last_runs: (.last_runs|length)}'

# Ce que voit Google
curl -s https://buzzafrique.vercel.app/robots.txt
curl -s https://buzzafrique.vercel.app/sitemap.xml | grep -c '<loc>'
curl -s https://buzzafrique.vercel.app/blog | grep -c '<article'      # nb d'articles réellement servis

# Pages fantômes du seed (200 sans être listées) vs 404 quand l'agent dort
curl -o /dev/null -s -w '%{http_code}\n' https://buzzafrique.vercel.app/blog/chatgpt-guide-complet-au-rwanda

# Métadonnées sociales (og:image attendu : non nul)
curl -s https://buzzafrique.vercel.app/blog/comment-youtube-en-cote-d-ivoire | grep -o 'og:image[^>]*'

# En local (reproduction de la prod)
cd web && npm install && npm run build && npm start   # sans AGENT_BASE_URL → 12 articles (seed)
```

**Variables à vérifier dans Vercel / Render :** `AGENT_BASE_URL`, `AGENT_TOKEN`, `ADMIN_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION` (⚠️ vide en prod), `DB_PATH` (⚠️ absent), `GROQ_API_KEY` (⚠️ absente → contenu template), `RUN_INTERVAL_MINUTES`, `AUTO_PUBLISH`, `CONTENT_MAX`, `INDEXNOW_KEY`.

---

### En une phrase
BuzzAfrique est un **beau squelette technique** (Next.js propre, SEO on-page correct, agent lisible) posé sur une **fondation qui ne conserve rien** : la base meurt à chaque redémarrage, l'agent ne tourne que quelques minutes par heure, la rotation détruit les URLs indexées et le contenu est du template dupliqué. Corriger les 6 points P0 ci-dessus transforme le projet en base saine ; sans eux, aucune optimisation SEO ne produira de trafic.
