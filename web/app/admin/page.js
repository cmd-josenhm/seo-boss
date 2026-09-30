'use client';
/**
 * Tableau de bord de contrôle : état de l'agent, du catalogue et du SEO.
 * Les indicateurs proviennent de /api/agent/status (source de vérité côté agent)
 * et la liste des articles du catalogue fusionné (/api/articles).
 */
import { useCallback, useEffect, useState } from 'react';

const fmtUptime = (s) => {
  if (s == null) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}j ${h}h` : h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState([]);
  const [articlesError, setArticlesError] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const [kwPreview, setKwPreview] = useState([]);

  const loadArticles = useCallback(async () => {
    setArticlesError('');
    try {
      const res = await fetch('/api/articles?limit=200', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('réponse inattendue');
      setArticles(data);
    } catch (e) {
      setArticlesError(`Catalogue indisponible : ${e.message}`);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/agent/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      if (data?.error) setError(data.error);
    } catch (e) {
      setStatus(null);
      setError(`Statut agent indisponible : ${e.message}`);
    }
  }, []);

  useEffect(() => {
    const t = window.localStorage.getItem('admin_token') || '';
    setToken(t);
    refresh();
    loadArticles();
  }, [refresh, loadArticles]);

  async function saveToken(e) {
    e.preventDefault();
    window.localStorage.setItem('admin_token', tokenInput);
    setToken(tokenInput);
  }

  async function triggerRun() {
    setRunning(true);
    setLog('⏳ Cycle en cours : mining des mots-clés, rédaction, optimisation SEO…');
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ mode: 'full' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'erreur');
      setLog(
        `✅ Cycle terminé — ${data.created ?? 0} article(s) créé(s), ${data.updated ?? 0} mis à jour, ` +
          `provider : ${data.provider} · catalogue : ${data.catalog?.total ?? '—'} articles`
      );
      const lines = data.log || [];
      setLog((l) => `${l}\n\n${lines.join('\n')}`);
      await refresh();
      await loadArticles();
    } catch (e) {
      setLog(`❌ ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function toggleStatus(a) {
    const next = a.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/agent/articles/${encodeURIComponent(a.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ status: next }),
      });
      if (res.status === 404) {
        throw new Error(
          'article archivé dans le catalogue de secours (web/lib/seed.js) — modifiable uniquement dans la base de l’agent'
        );
      }
      if (!res.ok) throw new Error('refusé : jeton admin requis');
      setArticles((list) => list.map((x) => (x.slug === a.slug ? { ...x, status: next } : x)));
    } catch (e) {
      alert(`Action impossible : ${e.message}`);
    }
  }

  const agent = status?.agent;
  const site = status?.site || {};
  // Indicateurs issus de l'agent (source de vérité), avec repli sur le catalogue affiché
  const total = agent?.catalog?.total ?? agent?.counts?.articles ?? articles.length;
  const published = agent?.counts?.published ?? articles.filter((a) => a.status !== 'draft').length;
  const avgSeo = articles.length
    ? Math.round(articles.reduce((s, a) => s + (a.seo_score || 0), 0) / articles.length)
    : 0;
  const words = articles.reduce((s, a) => s + (a.word_count || 0), 0);

  return (
    <div className="container admin">
      <h1>🎛️ Contrôle du site</h1>
      <p className="hint">
        Agent IA, catalogue et SEO — BuzzAfrique. Le catalogue fonctionne en mode{' '}
        <b>bibliothèque</b> : les anciens articles sont conservés et les nouveaux s&apos;ajoutent.
      </p>

      {!token && (
        <div className="notice">
          Entrez le jeton admin (<code>ADMIN_TOKEN</code>) pour activer les actions de contrôle.
        </div>
      )}
      <form onSubmit={saveToken} className="row" style={{ margin: '14px 0', maxWidth: 520 }}>
        <input
          className="input"
          type="password"
          placeholder="Jeton admin…"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn ghost" type="submit">
          Enregistrer
        </button>
      </form>

      <div className="stats">
        <div className="stat">
          <div className="v">{site.ga_connected ? '✅' : '⚠️'}</div>
          <div className="k">Google Analytics</div>
        </div>
        <div className="stat">
          <div className="v">{agent ? (agent.running ? '🔄' : '🟢') : '💤'}</div>
          <div className="k">Agent IA</div>
        </div>
        <div className="stat">
          <div className="v">{total}</div>
          <div className="k">Articles au catalogue</div>
        </div>
        <div className="stat">
          <div className="v">{published}</div>
          <div className="k">Publiés</div>
        </div>
        <div className="stat">
          <div className="v">{avgSeo || '—'}</div>
          <div className="k">Score SEO moyen</div>
        </div>
        <div className="stat">
          <div className="v">{Math.round(words / 1000)}k</div>
          <div className="k">Mots publiés</div>
        </div>
        <div className="stat">
          <div className="v">{agent?.traffic?.today ?? '—'}</div>
          <div className="k">Vues aujourd&apos;hui</div>
        </div>
        <div className="stat">
          <div className="v">{agent?.counts?.db_size_kb != null ? `${agent.counts.db_size_kb} KB` : '—'}</div>
          <div className="k">Base SQLite</div>
        </div>
        <div className="stat">
          <div className="v">{fmtUptime(agent?.uptime_s)}</div>
          <div className="k">Uptime agent</div>
        </div>
      </div>

      {error && <div className="notice error">⚠️ {error}</div>}
      {articlesError && <div className="notice error">⚠️ {articlesError}</div>}

      <div className="panel">
        <h2>Agent IA — cycle immédiat</h2>
        <p className="hint">
          Mode : <b>{agent?.mode || '—'}</b> · Moteur : <b>{agent?.provider || '—'}</b> · Cycle toutes
          les <b>{agent?.interval_minutes ?? '—'} min</b> · Auto-publication :{' '}
          <b>{agent?.auto_publish ? 'oui' : 'non'}</b>
        </p>
        <p className="hint">
          📚 <b>Catalogue :</b> {agent?.catalog?.model === 'growth-only' ? 'croissance uniquement' : '—'} ·{' '}
          {agent?.catalog?.max ? `plafond ${agent.catalog.max}` : 'sans plafond'} ·{' '}
          {agent?.catalog?.deleted_total ?? 0} contenu(s) supprimé(s) depuis l&apos;origine · 🚀{' '}
          <b>IndexNow :</b> {agent?.indexnow?.enabled ? 'Bing / Yandex / Naver' : 'off'}
        </p>
        <div className="row">
          <button className="btn" onClick={triggerRun} disabled={running || !token}>
            {running ? '⏳ Génération en cours…' : '⚡ Générer / optimiser maintenant'}
          </button>
          <button className="btn ghost" onClick={refresh} disabled={running}>
            🔄 Actualiser le statut
          </button>
          <a
            className="btn ghost"
            href={`/api/agent/export?token=${encodeURIComponent(token)}`}
            title="Télécharger la sauvegarde du catalogue (fichier seed à committer dans web/lib/seed.js)"
          >
            💾 Sauvegarder le catalogue
          </a>
        </div>
        {log && (
          <div className="log" style={{ marginTop: 14 }}>
            {log}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Checklist SEO &amp; acquisition</h2>
        <table className="list">
          <tbody>
            <Row ok={site.ga_connected} label="Google Analytics 4 connecté" hint="NEXT_PUBLIC_GA_ID (G-…)" />
            <Row ok label="Vercel Analytics + Speed Insights" hint="rendus dans le layout de l’application" />
            <Row
              ok={Boolean(agent)}
              label="Base de données du backend"
              hint={
                agent?.database
                  ? `${agent.database.engine} (${agent.database.path}) — ${agent?.counts?.db_size_kb ?? '—'} KB`
                  : 'SQLite intégré à l’agent (Render)'
              }
            />
            <Row ok={site.agent_configured} label="Agent IA connecté" hint="AGENT_BASE_URL (Render)" />
            <Row ok={(agent?.counts?.published || 0) > 0} label="Contenu publié" hint="au moins 1 article en ligne" />
            <Row
              ok
              label="Catalogue conservé (aucune suppression)"
              hint={`${agent?.catalog?.total ?? total} articles conservés · sauvegarde : web/lib/seed.js`}
            />
            <Row
              ok={agent?.indexnow?.enabled !== false}
              label="IndexNow (Bing, Yandex, Naver, Seznam)"
              hint="Google passe par le sitemap + Search Console"
            />
            <Row ok={avgSeo >= 70} label="Score SEO moyen ≥ 70" hint={`actuel : ${avgSeo || 0}`} />
            <Row ok label="Sitemap XML + robots.txt + RSS" hint="générés automatiquement par Next.js" />
            <Row ok label="Données structurées (Article, FAQ, Breadcrumb)" hint="rich results Google" />
            <Row ok label="Images Open Graph" hint="générées par Next.js (partages WhatsApp / Facebook)" />
            <Row
              ok={site.gsc_verified}
              label="Search Console vérifiée"
              hint={site.gsc_verified ? 'balise google-site-verification présente' : 'ajouter GOOGLE_SITE_VERIFICATION dans Vercel'}
            />
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Contenus ({articles.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="list">
            <thead>
              <tr>
                <th>Article</th>
                <th>Catégorie</th>
                <th>Mots</th>
                <th>SEO</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {articles.slice(0, 200).map((a) => (
                <tr key={a.slug}>
                  <td style={{ maxWidth: 380 }}>
                    <a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                  </td>
                  <td>{a.category}</td>
                  <td>{a.word_count}</td>
                  <td>
                    <b style={{ color: (a.seo_score || 0) >= 70 ? 'var(--brand)' : 'var(--danger)' }}>
                      {a.seo_score}
                    </b>
                  </td>
                  <td>
                    <span className={`tag ${a.status === 'published' ? 'ok' : 'warn'}`}>
                      {a.status || 'published'}
                    </span>
                  </td>
                  <td>
                    <button className="btn ghost sm" onClick={() => toggleStatus(a)}>
                      {a.status === 'published' ? 'Dépublier' : 'Publier'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Mots-clés à venir (stratégie longue traîne Afrique)</h2>
        <p className="hint">
          Aperçu de ce que l&apos;agent va rédiger ensuite : recherches locales à faible concurrence
          (« comment… », « meilleures… », villes et pays africains).
        </p>
        <div style={{ marginBottom: 14 }}>
          <button
            className="btn secondary"
            onClick={async () => {
              setKwPreview(['⏳ chargement…']);
              try {
                const res = await fetch('/api/agent/keywords', { headers: { 'x-admin-token': token } });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'erreur');
                setKwPreview(
                  Array.isArray(data) && data.length
                    ? data.map((k) => k.keyword)
                    : ['(aucune idée neuve — tout est déjà rédigé 🎉)']
                );
              } catch (e) {
                setKwPreview([`❌ ${e.message}`]);
              }
            }}
          >
            🧠 Voir les prochains mots-clés
          </button>
        </div>
        <div className="pills">
          {kwPreview.map((k) => (
            <span key={k} className="pill">
              {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ ok, label, hint }) {
  return (
    <tr>
      <td style={{ width: 34 }}>{ok ? '✅' : '⚠️'}</td>
      <td>
        <b>{label}</b>
      </td>
      <td style={{ color: 'var(--muted)' }}>{hint}</td>
    </tr>
  );
}
