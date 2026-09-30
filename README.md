# 🤖 SEO BuzzBoss — Architecture & Guide

**Objectif :** un site web africain francophone (**BuzzAfrique**) qui attire **1 000 à 5 000 visiteurs/jour** via le SEO, avec un **agent IA open-source qui tourne 24h/24** pour produire et optimiser le contenu en permanence, plus un **tableau de bord de contrôle** du site.

> **Zéro service externe de base de données** : la base (SQLite) est **intégrée au backend de l'agent**. Seuls 2 déploiements : Vercel (site) + Render (agent).

---

## 🧱 Architecture

```
seo-boss/
├── web/                  → Frontend Next.js 14 (App Router) ………… déployé sur VERCEL
│   ├── app/              → pages SEO (accueil, blog, catégories, sitemap, RSS, 404)
│   │   └── admin/        → 🎛️ tableau de bord de contrôle du site + de l'agent
│   │   └── api/          → proxy agent, tracking vues, articles
│   ├── components/       → UI (header, cartes, JSON-LD, Google Analytics 4)
│   └── lib/              → accès agent → seed embarqué (repli hors-ligne)
│
└── agent/                → Agent IA open-source 24h/24 …………… déployé sur RENDER
    ├── src/store.js      → 💾 BASE DE DONNÉES SQLite intégrée (better-sqlite3)
    ├── src/index.js      → API Express + scheduler (cycle toutes les N minutes)
    ├── src/agent.js      → pipeline : mining → rédaction → SEO → publication
    ├── src/providers.js  → LLM gratuits (Ollama, Groq, OpenRouter, HF) + moteur local
    └── src/tools/        → keywords.js (SEO), writer.js (rédaction), seo.js (audit)
```

### Base de données du backend (SQLite intégré)

| Table | Rôle |
|---|---|
| `articles` | contenus publiés (markdown, meta, FAQ, score SEO) |
| `agent_tasks` | file de tâches de l'agent (mining, rédaction, refresh) |
| `agent_runs` | historique des cycles (dashboard) |
| `page_views` | compteur de fréquentation (complément de GA4) |
| `settings` | réglages (auto-publication, langue, cible quotidienne) |

- Fichier : `agent/data/seo-boss.db` (variable `DB_PATH` pour le déplacer)
- Mode **WAL**, écritures atomiques, requêtes préparées — dans le même processus que l'agent
- Sauvegarde : copier le fichier ; sur Render, attacher un **Disk** (plan payant) + `DB_PATH=/var/data/seo-boss.db`

### Flux de données

```
Agent IA (Render, boucle 24/7)  ←→  💾 SQLite intégré au backend
   │  1. mine les mots-clés longue traîne Afrique
   │  2. rédige l'article (LLM open-source ou moteur template intégré)
   │  3. score SEO, meta, FAQ, liens internes
   │  4. publie en base
   ▼
Frontend Vercel (SSR)  ──GET /articles──►  agent (/articles)  ──►  SQLite
   ▲                                          ▲
   └── /admin (dashboard) ── /status, /run ───┘
   └── beacon /api/track ──► /views ─────────►  SQLite (page_views)
```

Le frontend a un repli : si l'agent est en veille → **seed embarqué** (le site reste en ligne).

---

## 🚀 Déploiement (10 minutes)

### 1. Render (agent IA + base de données, 24h/24)
1. Render → **New → Blueprint** → sélectionner ce dépôt (le `render.yaml` est prêt)
2. Variables à remplir :
   - `SITE_URL` = `https://buzzafrique.vercel.app` (déjà dans le render.yaml)
   - `GROQ_API_KEY` → **clé à coller** dans Render → Environment (gratuite sur
     [console.groq.com](https://console.groq.com), modèle Llama 3.3 70B open-source).
     Sans clé, l'agent bascule automatiquement sur son moteur de rédaction local.
   - `AGENT_TOKEN` → généré automatiquement
3. L'agent démarre, **crée sa base SQLite**, mine les mots-clés et publie son premier article en < 1 min.

> **Zéro clé API ?** Aucun problème : l'agent embarque un moteur de rédaction local qui
> produit des articles complets. Branchez Ollama/Groq plus tard pour la qualité maximale.

### 2. Vercel (frontend)
1. [vercel.com](https://vercel.com) → **Import Project** → ce dépôt
2. **Root Directory = `web`** (Settings → General)
3. Variables d'environnement (voir `web/.env.example`) :
   - `NEXT_PUBLIC_SITE_URL=https://buzzafrique.vercel.app`, `NEXT_PUBLIC_GA_ID=G-R8TB7NDEYQ`, `GOOGLE_SITE_VERIFICATION`
   - `AGENT_BASE_URL` (URL Render), `AGENT_TOKEN`, `ADMIN_TOKEN`
4. Deploy. Le site est en ligne 🎉

---

## 📊 Mesure d'audience (domaine : https://buzzafrique.vercel.app)

**3 sources complémentaires, zéro configuration :**

1. **Vercel Analytics** (`@vercel/analytics`) — natif sur Vercel, cookieless/RGPD,
   activé dès le déploiement (Dashboard Vercel → Insights)
2. **Vercel Speed Insights** (`@vercel/speed-insights`) — Core Web Vitals en production
3. **Google Analytics 4 — `G-R8TB7NDEYQ`** (flux 15880562583) — pour suivre l'objectif
   1 000–5 000 visiteurs/jour en détail (pays, sources, pages) + compatibilité
   Search Console ; balise rendue côté serveur dans chaque page

Bonus : beacon interne `/api/track` → table `page_views` du backend → compteur dans `/admin`
(source de vérité indépendante des deux outils ci-dessus)

---

## 🔄 Boucle autonome 24h/24 (mode sans intervention)

Chaque cycle (`RUN_INTERVAL_MINUTES=30` par défaut), l'agent exécute **tout seul** :

1. **Rotation des contenus** — les anciens contenus sont **supprimés**, les nouveaux
   prennent leur place :
   - `CONTENT_MAX=40` (défaut) : inventaire de 40 contenus les plus récents,
     les plus vieux sont supprimés au-delà de `RETENTION_HOURS=6` h de rétention
   - `CONTENT_MAX=0` : **purge complète à chaque cycle** — tous les contenus sont
     supprimés puis recréés sur les recherches du moment
   - les slugs supprimés sont mémorisés : jamais recréés → le catalogue tourne
     en permanence vers de **nouvelles questions**
2. **Mining des recherches fréquentes** — mots-clés en forme de *question*
   (« comment ça marche », « est-ce que c'est sûr », « quel est le meilleur »…)
   croisés avec les pays/villes africaines → réponses aux questions People-Also-Ask
3. **Rédaction** — `MAX_ARTICLES_PER_CYCLE=1` article complet (titre SEO, meta,
   FAQ 5 Q/R, liens internes, score)
4. **Rafraîchissement SEO** d'un ancien contenu + re-score de tout le catalogue
5. **Publication automatique** en base + **IndexNow** → Google/Bing indexent les
   nouvelles URLs en quelques minutes

Variable d'indexation rapide : `INDEXNOW_KEY` (clé hébergée dans
`web/public/indexnow.key.txt`, identique dans l'agent).

> **Pourquoi pas une purge totale par défaut ?** Google ré-indexe et ré-évalue
> chaque URL supprimée : un catalogue à 1-2 articles limite la profondeur du
> sitemap. Le mode inventaire (40) fait tourner 100 % du contenu en ~20 h tout
> en gardant un site dense. `CONTENT_MAX=0` reste disponible pour du 100 % purge.

---

## 🎛️ Contrôle du site — `/admin`

Dashboard protégé par `ADMIN_TOKEN` :
- **Statut agent** : uptime, moteur IA, dernier cycle, taille de la base SQLite
- **Fréquentation** : vues du jour (base interne) + GA4
- **Bouton « Générer / optimiser maintenant »** → force un cycle immédiat
- **Publication** : publier / dépublier chaque article en 1 clic
- **Checklist SEO** : GA4, base, agent, scores, sitemap, données structurées
- **Aperçu du mining** : les prochains mots-clés que l'agent va rédiger

---

## 🌍 Stratégie SEO pour 1 000–5 000 visiteurs africains/jour

| Levier | Mise en œuvre |
|---|---|
| **Longue traîne locale** | L'agent mine `mot-clé + pays` (`comment Orange Money au Sénégal`, `freelance au Kenya`…) — volume faible × concurrence faible × milliers de combinaisons |
| **5 piliers éditoriaux** | Mobile Money, IA gratuite, Emploi/Freelance, Business, Réseaux sociaux |
| **SEO technique** | Sitemap XML, robots.txt, RSS, canonical, OG/Twitter cards, breadcrumbs, URL propres |
| **Données structurées** | `Article` + `FAQPage` + `BreadcrumbList` + `WebSite` → éligibilité aux rich results |
| **Fraîcheur** | L'agent rafraîchit les anciens articles (date, meta, liens) → bonus Google |
| **Maillage interne** | Section « Articles liés » ajoutée automatiquement dans chaque article |
| **Performance** | Next.js SSR, ~90 kB JS, Lighthouse élevé |
| **Partage social** | Boutons WhatsApp/Facebook/X (WhatsApp = canal n°1 en Afrique) |

### Rythme de production
`RUN_INTERVAL_MINUTES=30` → ~48 articles/jour max, réglable.
Recommandé après lancement : **3–5 articles/jour** de qualité + 1 rafraîchissement SEO/cycle.

---

## 🧪 Développement local

```bash
# 1. agent (port 4100) — base SQLite créée automatiquement dans agent/data/
cd agent && npm install && npm start

# 2. frontend (port 3000)
cd web && npm install && npm run dev
# → http://localhost:3000  — dashboard : http://localhost:3000/admin
#   jeton admin local : dev-admin-token

# contenu de démonstration sans serveur :
cd agent && npm run demo

# sauvegarde de la base :
cp agent/data/seo-boss.db backup-$(date +%F).db
```

## 🔐 Jetons

| Variable | Rôle |
|---|---|
| `AGENT_TOKEN` | authentifie les appels dashboard → agent (Render) |
| `ADMIN_TOKEN` | protège `/admin` et les routes `/api/agent/*` (Vercel) |
| `DB_PATH` | emplacement de la base SQLite (défaut : `agent/data/seo-boss.db`) |
