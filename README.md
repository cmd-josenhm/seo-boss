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
   - `SITE_URL` → l'URL Vercel du site (ex. `https://buzzafrique.vercel.app`)
   - `GROQ_API_KEY` → gratuite sur [console.groq.com](https://console.groq.com) (Llama 3.3 70B open-source) — *optionnel mais recommandé*
   - `AGENT_TOKEN` → généré automatiquement
3. L'agent démarre, **crée sa base SQLite**, mine les mots-clés et publie son premier article en < 1 min.

> **Zéro clé API ?** Aucun problème : l'agent embarque un moteur de rédaction local qui
> produit des articles complets. Branchez Ollama/Groq plus tard pour la qualité maximale.

### 2. Vercel (frontend)
1. [vercel.com](https://vercel.com) → **Import Project** → ce dépôt
2. **Root Directory = `web`** (Settings → General)
3. Variables d'environnement (voir `web/.env.example`) :
   - `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID=G-R8TB7NDEYQ`, `GOOGLE_SITE_VERIFICATION`
   - `AGENT_BASE_URL` (URL Render), `AGENT_TOKEN`, `ADMIN_TOKEN`
4. Deploy. Le site est en ligne 🎉

---

## 📊 Google Analytics 4 (mesure des 1 000–5 000 visiteurs/jour)

- **ID configuré : `G-R8TB7NDEYQ`** (flux 15880562583) — dans `NEXT_PUBLIC_GA_ID`
- Balise rendue côté serveur dans chaque page (gtag.js + config), vues SPA trackées
- Bonus : beacon interne `/api/track` → table `page_views` du backend → compteur dans `/admin`
  (source de vérité indépendante de GA)

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
