/**
 * Déclencheur externe de cycle — pour Render Cron Job, cron-job.org, GitHub Actions…
 *
 * Pourquoi ce script ? Sur les hébergeurs qui endorment les services gratuits
 * (Render : 15 min d'inactivité), un `setInterval` interne ne suffit pas à tenir
 * une cadence 24h/24. Un ordonnanceur externe appelle `/run` : cela réveille le
 * service ET lance un cycle.
 *
 * Usage :
 *   AGENT_URL=https://seo-boss-agent.onrender.com AGENT_TOKEN=xxx node src/tick.js
 */
const base = (process.env.AGENT_URL || process.env.SITE_AGENT_URL || `http://127.0.0.1:${process.env.PORT || 4000}`).replace(/\/$/, '');
const token = process.env.AGENT_TOKEN || 'dev-agent-token';
const mode = process.env.TICK_MODE || 'full';

async function main() {
  const started = Date.now();
  console.log(`[tick] ${new Date().toISOString()} -> POST ${base}/run (${mode})`);
  try {
    const res = await fetch(`${base}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-token': token },
      body: JSON.stringify({ mode }),
      // le service peut être endormi : on laisse le temps au réveil à froid
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(data)}`);
    console.log(
      `[tick] ok en ${Math.round((Date.now() - started) / 1000)}s — créés: ${data.created ?? 0}, ` +
        `mis à jour: ${data.updated ?? 0}, provider: ${data.provider ?? '—'}, catalogue: ${data.catalog?.total ?? '—'}`
    );
    process.exit(0);
  } catch (e) {
    console.error(`[tick] échec: ${e.message}`);
    process.exit(1);
  }
}

main();
