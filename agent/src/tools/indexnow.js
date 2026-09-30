/**
 * IndexNow — notification instantanée à Google, Bing, Yandex, Seznam...
 * Permet d'indexer les nouveaux contenus en quelques minutes au lieu de jours.
 * Clé hébergée publiquement par le frontend : web/public/indexnow.key.txt
 */
import { config } from '../config.js';

export function keyLocation() {
  return `${config.siteUrl.replace(/\/$/, '')}/indexnow.key.txt`;
}

/** Soumet une liste d'URLs à IndexNow (best-effort, ne bloque jamais le cycle). */
export async function submitUrls(urls) {
  if (!config.indexnow.enabled || !urls.length) return { submitted: 0, skipped: true };
  let host;
  try {
    host = new URL(config.siteUrl).host;
  } catch {
    return { submitted: 0, error: 'SITE_URL invalide' };
  }
  const payload = {
    host,
    key: config.indexnow.key,
    keyLocation: keyLocation(),
    urlList: urls,
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return { submitted: urls.length, status: res.status };
  } catch (e) {
    return { submitted: 0, error: e.message };
  }
}
