'use client';
/**
 * Tableau de bord de contrôle : statut de l'agent IA, publication,
 * score SEO, clic "Générer un article maintenant", configuration.
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
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const [kwPreview, setKwPreview] = useState([]);

  useEffect(() => {
    const t = window.localStorage.getItem('admin_token') || '';
    setToken(t);
    if (t) refresh(t);
    else refresh('');
    fetch('/api/articles?limit=100').then((r) => r.json()).then(setArticles).catch(() => {});
  }, []);

  const refresh = useCallback(async (tk) => {
    setError('');
    try {
      const res = await fetch('/api/agent/status', { cache: 'no-store' });
      setStatus(await res.json());
    } catch (e) {
      setError(String(e.message || e));
    }
  }, []);

  async function saveToken(e) {
    e.preventDefault();
    window.localStorage.setItem('admin_token', tokenInput);
    setToken(tokenInput);
    await refresh(tokenInput);
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
        `✅ Cycle terminé — ${data.created ?? 0} article(s) créé(s), ${data.updated ?? 0} mis à jour, provider: ${data.provider}`
      );
      const lines = data.log || [];
      setLog((l) => l + '\n\n' + lines.join('\n'));
      await refresh(token);
      const arts = await fetch('/api/articles?limit=100').then((r) => r.json());
      setArticles(arts);
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
      if (!res.ok) throw new Error('refusé');
      setArticles((list) => list.map((x) => (x.slug === a.slug ? { ...x, status: next } : x)));
    } catch (e) {
      alert('Action impossible : ' + e.message);
    }
  }

  const agent = status?.agent;
  const site = status?.site || {};
  const avgSeo =
    articles.length > 0
      ? Math.round(articles.reduce((s, a) => s + (a.seo_score || 0), 0) / articles.length)
      : 0;
  const words = articles.reduce((s, a) => s + (a.word_count || 0), 0);

  return (
    <div className="container admin">
      <h1>🎛️ Contrôle du site</h1>
      <p style={{ color: 'var(--muted)' }}>
        Supervision de l’agent IA, du SEO et du contenu — BuzzAfrique.
      </p>

      {!token && (
        <div className="notice">
          Entrez le jeton admin (<code>ADMIN_TOKEN</code>) pour afficher les actions de contrôle.
        </div>
      )}
      <form onSubmit={saveToken} style={{ display: 'flex', gap: 10, margin: '14px 0', maxWidth: 480 }}>
        <input
          className="input"
          type="password"
          placeholder="Jeton admin…"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
        />
        <button className="btn ghost" type="submit">Connexion</button>
      </form>

      {/* ---- indicateurs ---- */}
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
          <div className="v">{articles.length}</div>
          <div className="k">Articles</div>
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
          <div className="k">Vues aujourd’hui</div>
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

      {status?.error && <div className="notice">ℹ️ {status.error}</div>}
      {error && <div className="notice">❌ {error}</div>}

      {/* ---- actions ---- */}
      <div className="panel">
        <h2>Agent IA — cycle immédiat</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
          Mode : <b>{agent?.mode || '—'}</b> · Moteur : <b>{agent?.provider || '—'}</b> · Cycle
          automatique toutes les <b>{agent?.interval_minutes ?? '—'} min</b> · Auto-publication :{' '}
          <b>{agent?.auto_publish ? 'oui' : 'non'}</b>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginTop: -6 }}>
          🔄 <b>Rotation autonome :</b>{' '}
          {agent?.rotation?.enabled
            ? agent.rotation.content_max === 0
              ? 'purge complète à chaque cycle (tous les contenus supprimés puis recréés)'
              : `inventaire max ${agent.rotation.content_max} contenus · rétention ${agent.rotation.retention_hours} h · ${agent.rotation.retired_total} contenus tournés`
            : 'désactivée'}{' '}
          · 🚀 <b>IndexNow :</b> {agent?.indexnow?.enabled ? 'indexation auto Google/Bing' : 'off'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={triggerRun} disabled={running || !token}>
            {running ? '⏳ Génération en cours…' : '⚡ Générer / optimiser maintenant'}
          </button>
          <button className="btn ghost" onClick={() => refresh(token)} disabled={running}>
            🔄 Actualiser le statut
          </button>
        </div>
        {log && <div className="log" style={{ marginTop: 14 }}>{log}</div>}
      </div>

      {/* ---- checklist SEO ---- */}
      <div className="panel">
        <h2>Checklist SEO &amp; acquisition (objectif 1 000–5 000 visiteurs/jour)</h2>
        <table className="list">
          <tbody>
            <Row ok={site.ga_connected} label="Google Analytics 4 connecté" hint="NEXT_PUBLIC_GA_ID (G-…)" />
            <Row ok={site.vercel_analytics !== false} label="Vercel Analytics + Speed Insights" hint="natif, cookieless — dashboard Vercel → Insights" />
            <Row
              ok={Boolean(agent)}
              label="Base de données du backend"
              hint={agent?.database ? `${agent.database.engine} (${agent.database.path}) — ${agent?.counts?.db_size_kb ?? '—'} KB` : 'SQLite intégré à l’agent (Render)'}
            />
            <Row ok={site.agent_configured} label="Agent IA connecté" hint="AGENT_BASE_URL (Render)" />
            <Row ok={(agent?.counts?.published || 0) > 0} label="Contenu publié" hint="au moins 1 article en ligne" />
            <Row
              ok={agent?.rotation?.enabled !== false}
              label="Rotation autonome des contenus"
              hint={
                agent?.rotation
                  ? `cycle ${agent.rotation.cycle_minutes} min · max ${agent.rotation.content_max || 'PURGE'} · ${agent.rotation.retired_total} tournés`
                  : 'suppression des anciens + nouveaux contenus à chaque cycle'
              }
            />
            <Row
              ok={agent?.indexnow?.enabled !== false}
              label="IndexNow (indexation auto Google/Bing)"
              hint={agent?.indexnow?.key_location || 'soumission des nouvelles URLs après chaque cycle'}
            />
            <Row ok={avgSeo >= 70} label="Score SEO moyen ≥ 70" hint={`actuel : ${avgSeo || 0}`} />
            <Row ok label="Sitemap XML + robots.txt + RSS" hint="générés automatiquement par Next.js" />
            <Row ok label="Données structurées (Article, FAQ, Breadcrumb)" hint="rich results Google" />
            <Row ok label="Meta title/description uniques par page" hint="automatique" />
          </tbody>
        </table>
      </div>

      {/* ---- articles ---- */}
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.slug}>
                  <td style={{ maxWidth: 380 }}>
                    <a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                  </td>
                  <td>{a.category}</td>
                  <td>{a.word_count}</td>
                  <td>
                    <b style={{ color: (a.seo_score || 0) >= 70 ? 'var(--accent)' : 'var(--brand)' }}>
                      {a.seo_score}
                    </b>
                  </td>
                  <td>
                    <span className={`tag ${a.status === 'published' ? 'ok' : 'warn'}`}>{a.status}</span>
                  </td>
                  <td>
                    <button className="btn ghost" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => toggleStatus(a)}>
                      {a.status === 'published' ? 'Dépublier' : 'Publier'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- mining ---- */}
      <div className="panel">
        <h2>Mots-clés à venir (stratégie longue traîne Afrique)</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Aperçu de ce que l’agent va rédiger ensuite : recherches locales à faible concurrence
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
                setKwPreview(Array.isArray(data) && data.length ? data.map((k) => k.keyword) : ['(aucune idée neuve — tout est déjà rédigé 🎉)']);
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
            <span key={k} className="pill">{k}</span>
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
      <td><b>{label}</b></td>
      <td style={{ color: 'var(--muted)' }}>{hint}</td>
    </tr>
  );
}
