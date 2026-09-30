-- ============================================================
-- SEO BOSS / BuzzAfrique — Schéma Supabase (Postgres)
-- Exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Articles générés/maintenus par l'agent IA
create table if not exists articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  excerpt         text default '',
  content_md      text default '',
  category        text default 'general',
  tags            text[] default '{}',
  keywords        text[] default '{}',
  meta_description text default '',
  faq             jsonb default '[]',
  status          text default 'draft',   -- draft | published
  author          text default 'BuzzAfrique',
  lang            text default 'fr',
  word_count      int default 0,
  seo_score       int default 0,
  source          text default 'agent',   -- agent | manual
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  published_at    timestamptz
);
create index if not exists articles_status_idx on articles (status);
create index if not exists articles_category_idx on articles (category);
create index if not exists articles_published_at_idx on articles (published_at desc);

-- File de tâches de l'agent (mining de mots-clés, rédaction, rafraîchissement SEO)
create table if not exists agent_tasks (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,          -- write | refresh | links | mine
  keyword     text default '',
  category    text default 'general',
  priority    int default 5,
  status      text default 'pending', -- pending | running | done | failed
  attempts    int default 0,
  payload     jsonb default '{}',
  error       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists agent_tasks_status_idx on agent_tasks (status, priority desc, created_at asc);

-- Historique d'exécution de l'agent (visible dans le dashboard /admin)
create table if not exists agent_runs (
  id               uuid primary key default gen_random_uuid(),
  started_at       timestamptz default now(),
  finished_at      timestamptz,
  status           text default 'running', -- running | success | error
  provider         text default '',        -- groq | openrouter | ollama | template
  articles_created int default 0,
  articles_updated int default 0,
  tasks_done       int default 0,
  log              jsonb default '[]'
);
create index if not exists agent_runs_started_idx on agent_runs (started_at desc);

-- Compteur interne de pages vues (complément à Google Analytics)
create table if not exists page_views (
  path  text not null,
  day   date not null default current_date,
  views int default 1,
  primary key (path, day)
);

-- Réglages de l'agent (auto_publish, langue, rythme, ...)
create table if not exists settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- RLS : lecture publique des articles publiés uniquement.
-- Les écritures passent par le backend agent (service key, bypass RLS)
-- ou le dashboard admin via le proxy /api/agent/*.
-- ============================================================
alter table articles enable row level security;
alter table agent_tasks enable row level security;
alter table agent_runs enable row level security;
alter table page_views enable row level security;
alter table settings enable row level security;

drop policy if exists "public read published articles" on articles;
create policy "public read published articles"
  on articles for select
  using (status = 'published');

drop policy if exists "public read runs" on agent_runs;
create policy "public read runs" on agent_runs for select using (true);

drop policy if exists "public read page_views" on page_views;
create policy "public read page_views" on page_views for select using (true);

drop policy if exists "public insert page_views" on page_views;
create policy "public insert page_views"
  on page_views for insert with check (true);

drop policy if exists "public update page_views" on page_views;
create policy "public update page_views"
  on page_views for update using (true);

-- ============================================================
-- Jetons Google Search Console / GA4 : à renseigner ensuite
-- ============================================================
insert into settings (key, value) values
  ('site_url', '"https://buzzafrique.example"'),
  ('auto_publish', 'true'),
  ('agent_lang', '"fr"'),
  ('daily_article_target', '3')
on conflict (key) do nothing;
