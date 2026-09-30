# 🤖 BuzzBoss — BuzzAfrique : site + agent IA de contenu

**Objectif :** un média africain francophone (**BuzzAfrique**) qui attire **1 000 à 5 000 visiteurs/jour** via le SEO, avec un **agent IA open-source** qui produit et optimise le contenu en continu, plus un **tableau de bord de contrôle**.

> **2 déploiements seulement** : Vercel (site Next.js) + Render (agent IA + base SQLite intégrée).

---

## 📚 Modèle de catalogue : « bibliothèque » (croissance uniquement)

**Un article publié n'est jamais supprimé.** Chaque cycle de l'agent **ajoute** de nouveaux
guides ou **met à jour** les anciens. Aucun slug indexé ne disparaît, aucune URL ne passe
en 404 : c'est la condition pour construire une autorité SEO durable.

```
Cycle (toutes les 30 min) :
  1. mining de nouveaux mots-clés     → file de tâches
  2. rédaction de N nouveaux articles → s'AJOUTENT au catalogue
  3. rafraîchissement d'un ancien article (fraîcheur)
  4. re-score SEO de tout le catalogue
  5. IndexNow (Bing / Yandex / Naver / Seznam)
```

**Filet de sécurité :** le site fusionne en permanence deux sources — la base de l'agent
**et** le catalogue versionné dans le dépôt (`web/lib/seed.js`). Si l'hébergeur réinitialise
la base, le site reste complet et les articles connus restent accessibles.

```bash
cd agent && npm run export-seed   # sauvegarde la base vers web/lib/seed.js (cumulatif)
```

> Le bouton **« 💾 Sauvegarder le catalogue »** du dashboard `/admin` télécharge ce même fichier.

---

## 🧱 Architecture

```
seo-boss/
├── web/                  → Frontend Next.js 14 (App Router) ………… déployé sur VERCEL
│   ├── app/              → pages SEO (accueil, blog, catégories, sitemap, RSS, 404)
│   │   ├── admin/        → 🎛️ tableau de bord de contrôle (agent + catalogue + SEO)
│   │   ├── opengraph-image.js / blog/[slug]/opengraph-image.js → images de partage social
│   │   └── api/          → proxy agent, tracking vues, articles, déclencheur cron
│   ├── components/       → Header (navbar responsive), Footer, cartes, JSON-LD, GA4
│   └── lib/              → accès agent → seed embarqué (repli hors-ligne)
│
└── agent/                → Agent IA open-source ………………………………… déployé sur RENDER
    ├── src/store.js      → 💾 BASE SQLite intégrée (better-sqlite3)
    ├── src/index.js      → API Express + scheduler
    ├── src/agent.js      → pipeline : mining → rédaction → SEO → publication
    ├── src/tick.js       → déclencheur externe (cron) : garantit la cadence 24h/24
    ├── src/export-seed.js→ sauvegarde du catalogue vers web/lib/seed.js
    └── src/tools/        → keywords.js (SEO) · writer.js (rédaction) · seo.js (audit)
```

### Base de données (SQLite intégré)

| Table | Rôle |
|---|---|
| `articles` | contenus publiés (markdown, meta, FAQ, score SEO) — **conservés indéfiniment** |
| `agent_tasks` | file de tâches (mining, rédaction, refresh) |
| `agent_runs` | historique des cycles (dashboard) |
| `page_views` | compteur de fréquentation (complément de GA4) |
| `settings` | réglages |

- Fichier : `agent/data/seo-boss.db` — variable `DB_PATH` pour le déplacer
- **Persistance** : sur Render, attacher un **Disk** (`mountPath: /var/data`) et définir
  `DB_PATH=/var/data/seo-boss.db` (voir les blocs commentés dans `render.yaml`, plan payant).

### Flux de données

```
Agent IA (Render)                    💾 SQLite (persistant si Disk)
   │  1. mine les mots-clés longue traîne Afrique
   │  2. rédige (LLM open-source ou moteur template par catégorie)
   │  3. score SEO, meta, FAQ, liens internes
   │  4. publie en base (jamais de suppression)
   ▼
Frontend Vercel (ISR 5 min)  ──GET /articles──►  agent  ──►  SQLite
   ▲                                                ▲
   └── /admin ── /status, /run ──────────────────────┘
   └── beacon /api/track ──► /views ────────────────►  SQLite (page_views)
   └── /api/cron/run ──► POST /run (déclencheur externe)
```

Le front fusionne **base + `web/lib/seed.js`** : si l'agent est en veille, le site reste complet.

---

## 🚀 Déploiement

### 1. Render (agent IA)

1. Render → **New → Blueprint** → sélectionner ce dépôt (`render.yaml` prêt).
2. Variables à remplir (Dashboard → Environment) :
   - `SITE_URL` = `https://buzzafrique.vercel.app` (déjà dans le blueprint)
   - `GROQ_API_KEY` → **clé gratuite** ([console.groq.com](https://console.groq.com)) pour des
     articles rédigés par un LLM. Sans clé, l'agent utilise son moteur template (contenu correct
     mais répétitif).
   - `AGENT_TOKEN` est généré automatiquement.
3. **Persistance (recommandé)** : décommenter `plan: starter` + `disk:` dans `render.yaml`
   et passer `DB_PATH=/var/data/seo-boss.db`.
4. **Cadence 24h/24** : les services gratuits s'endorment après 15 min d'inactivité.
   Trois options :
   - cron Render (bloc commenté dans `render.yaml`, facturation possible) ;
   - **Vercel Cron** : `/api/cron/run` (déjà en place, quotidien sur l'offre Hobby) ;
   - **ordonnanceur externe gratuit** (cron-job.org, UptimeRobot) qui appelle
     `POST https://seo-boss-agent.onrender.com/run` avec l'en-tête `x-agent-token`.

### 2. Vercel (frontend)

1. [vercel.com](https://vercel.com) → **Import Project** → ce dépôt
2. **Root Directory = `web`**
3. Variables d'environnement (`web/.env.example`) :
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION`,
   `AGENT_BASE_URL`, `AGENT_TOKEN`, `ADMIN_TOKEN`, `CRON_SECRET`.
4. Deploy 🎉

### 3. Après déploiement (SEO)

- Vérifier le domaine dans **Google Search Console** et soumettre `sitemap.xml`.
- IndexNow couvre **Bing, Yandex, Naver, Seznam** — **pas Google** (qui utilise le sitemap
  et Search Console). Ne pas attendre d'indexation Google par IndexNow.

---

## 🎛️ Contrôle du site — `/admin`

- **Statut agent** : état, moteur IA, dernier cycle, uptime, taille de la base
- **Catalogue** : nombre d'articles conservés, publiés, score SEO moyen, mots publiés
- **Bouton « Générer / optimiser maintenant »**
- **Sauvegarde du catalogue** (téléchargement du seed à committer)
- **Publication** : publier / dépublier chaque article
- **Checklist SEO** : GA4, Search Console, base, agent, sitemap, données structurées
- **Aperçu du mining** : les prochains mots-clés

Jeton local par défaut : `dev-admin-token`.

---

## 🧩 Catégories éditoriales

| Id | Catégorie |
|---|---|
| `religion` | Religion & Spiritualité |
| `ia` | Intelligence Artificielle |
| `emploi` | Emploi & Freelance |
| `business` | Business & E-commerce |
| `reseaux` | Réseaux sociaux & Astuces |
| `fintech` | *Mobile Money — catégorie historique, conservée pour les anciens articles* |

Chaque catégorie possède son propre gabarit de contenu (sections, FAQ, points clés) afin
d'éviter le contenu dupliqué entre thématiques.

---

## 🧪 Développement local

```bash
# 1. agent (port 4000) — base SQLite créée automatiquement dans agent/data/
cd agent && npm install && npm start
#    déclencher un cycle à la demande :
AGENT_URL=http://localhost:4000 npm run tick

# 2. frontend (port 3000)
cd web && npm install && npm run dev
# → http://localhost:3000 — dashboard : http://localhost:3000/admin

# contenu de démonstration sans serveur :
cd agent && npm run demo

# sauvegarde du catalogue (base → web/lib/seed.js) :
cd agent && npm run export-seed
```

## 🔐 Jetons & sécurité

| Variable | Rôle |
|---|---|
| `AGENT_TOKEN` | authentifie les appels de contrôle vers l'agent (Render) |
| `ADMIN_TOKEN` | protège `/admin` et les routes `/api/agent/*` (Vercel) |
| `CRON_SECRET` | protège `/api/cron/run` (déclencheur de cycle) |
| `DB_PATH` | emplacement de la base SQLite |

Les routes de contrôle de l'agent (`/run`, `/internal/*`, `/tasks`, `PATCH /articles/:slug`)
exigent le jeton ; le CORS est restreint au domaine du site et les routes publiques
d'écriture (`/views`) sont limitées en débit.
