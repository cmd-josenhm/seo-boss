# 🤖 SEO BuzzBoss — Architecture & Guide

**Objectif :** un site web africain francophone (**BuzzAfrique**) qui attire **1 000 à 5 000 visiteurs/jour** via le SEO, avec un **agent IA open-source qui tourne 24h/24** pour produire et optimiser le contenu en permanence, plus un **tableau de bord de contrôle** du site.

---

## 🧱 Architecture

```
seo-boss/
├── web/                  → Frontend Next.js 14 (App Router) ………… déployé sur VERCEL
│   ├── app/              → pages SEO (accueil, blog, catégories, sitemap, RSS, 404)
│   │   └── admin/        → 🎛️ tableau de bord de contrôle du site + de l'agent
│   │   └── api/          → proxy agent, tracking vues, articles
│   ├── components/       → UI (header, cartes, JSON-LD, Google Analytics 4)
│   └── lib/              → accès Supabase → agent → seed (3 niveaux de repli)
│
├── agent/                → Agent IA open-source 24h/24 …………… déployé sur RENDER
│   ├── src/index.js      → API Express + scheduler (cycle toutes les N minutes)
│   ├── src/agent.js      → pipeline : mining → rédaction → SEO → publication
│   ├── src/providers.js  → LLM gratuits (Ollama, Groq, OpenRouter, HF) + template local
│   └── src/tools/        → keywords.js (SEO), writer.js (rédaction), seo.js (audit)
│
├── supabase/schema.sql   → base de données …………………………………………… déployé sur SUPABASE
│                           (articles, file de tâches, runs, stats de pages)
└── render.yaml           → déploiement en 1 clic de l'agent sur Render
```

### Flux de données

```
Agent IA (Render, boucle 24/7)
   │  1. mine les mots-clés longue traîne Afrique
   │  2. rédige l'article (LLM open-source ou moteur template intégré)
   │  3. score SEO, meta, FAQ, liens internes
   │  4. publie ──────────────┐
   ▼                          ▼
Supabase (Postgres) ◄── lecture ── Next.js/Vercel (SSR) ──► Visiteurs Google
   ▲                          ▲
   └── /admin (dashboard) ────┘  contrôle humain : publier, dépublier, forcer un cycle
```

Le frontend a **3 niveaux de repli** : Supabase → API de l'agent → seed embarqué.
Le site est **toujours en ligne**, même sans base ni agent (mode démo).

---

## 🚀 Déploiement (15 minutes)

### 1. Supabase (base de données)
1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit)
2. SQL Editor → coller le contenu de **`supabase/schema.sql`** → Run
3. Copier l'**URL du projet** et la **anon key** (Settings → API)

### 2. Render (agent IA 24h/24)
1. Render → **New → Blueprint** → sélectionner ce dépôt (le `render.yaml` est prêt)
2. Variables à remplir :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (clé **service_role**)
   - `GROQ_API_KEY` → gratuite sur [console.groq.com](https://console.groq.com) (LLama 3.3 70B open-source) — *optionnel mais recommandé*
   - `SITE_URL` → l'URL Vercel du site (ex. `https://buzzafrique.vercel.app`)
   - `AGENT_TOKEN` → généré automatiquement
3. L'agent démarre, mine les mots-clés et publie son premier article en < 1 min.

> **Zéro clé API ?** Aucun problème : l'agent embarque un moteur de rédaction local qui
> produit des articles complets. Branchez Ollama/Groq plus tard pour la qualité maximale.

### 3. Vercel (frontend)
1. [vercel.com](https://vercel.com) → **Import Project** → ce dépôt
2. **Root Directory = `web`** (Settings → General)
3. Variables d'environnement (voir `web/.env.example`) :
   - `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `AGENT_BASE_URL` (URL Render de l'agent), `AGENT_TOKEN`, `ADMIN_TOKEN`
4. Deploy. Le site est en ligne 🎉

---

## 📊 Google Analytics (mesure des 1 000–5 000 visiteurs/jour)

1. Créer une propriété **GA4** sur [analytics.google.com](https://analytics.google.com) (gratuit)
2. Copier l'ID de mesure `G-XXXXXXX` → variable `NEXT_PUBLIC_GA_ID` sur Vercel → redéployer
   - **ID déjà configuré pour ce projet : `G-R8TB7NDEYQ`** (flux ID 15880562583)
3. La balise est injectée automatiquement (gtag.js + suivi SPA par page)
4. Bonus : le site envoie aussi un beacon interne `/api/track` → compteur visible dans `/admin`
   (source de vérité indépendante de GA).

---

## 🎛️ Contrôle du site — `/admin`

Dashboard protégé par `ADMIN_TOKEN` :
- **Statut agent** : uptime, moteur utilisé, dernier cycle, file de tâches
- **Bouton « Générer / optimiser maintenant »** → force un cycle immédiat
- **Publication** : publier / dépublier chaque article en 1 clic
- **Checklist SEO** : GA4, Supabase, agent, scores, sitemap, données structurées
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
| **Performance** | Next.js SSR/SSR, 0 dépendance UI lourde, ~90 kB JS, Lighthouse élevé |
| **Partage social** | Boutons WhatsApp/Facebook/X (WhatsApp = canal n°1 en Afrique) |
| **Multi-sorties** | RSS + sitemap + IndexNow possible → indexation rapide |

### Rythme de production
`RUN_INTERVAL_MINUTES=30` → ~48 articles/jour max, réglable (`daily_article_target`).
Recommandé après lancement : **3–5 articles/jour** de qualité + 1 rafraîchissement SEO/cycle.

---

## 🧪 Développement local

```bash
# 1. agent (port 4100)
cd agent && npm install && npm start

# 2. frontend (port 3000)
cd web && npm install && npm run dev
# → http://localhost:3000  — dashboard : http://localhost:3000/admin
#   jeton admin par défaut en local : dev-admin-token

# contenu de démonstration sans serveur :
cd agent && npm run demo
```

## 🔐 Jetons

| Variable | Rôle |
|---|---|
| `AGENT_TOKEN` | authentifie les appels dashboard → agent (Render) |
| `ADMIN_TOKEN` | protège `/admin` et les routes `/api/agent/*` (Vercel) |
| `SUPABASE_SERVICE_KEY` | écritures agent (jamais côté navigateur) |
