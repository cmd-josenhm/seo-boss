/**
 * Chaîne de fournisseurs LLM — tous open-source et gratuits :
 *   1. Ollama  (auto-hébergé, 100% gratuit)
 *   2. Groq    (API gratuite — Llama 3.3 70B)
 *   3. OpenRouter (modèles *:free)
 *   4. Hugging Face (inference gratuite)
 *   5. Générateur local "template" (aucune clé requise — le site produit
 *      du contenu même sans réseau / sans clé API)
 */
import { config } from './config.js';

async function postJSON(url, body, headers = {}, timeout = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const providers = [
  {
    name: 'ollama',
    enabled: () => Boolean(config.providers.ollama.url),
    async call(system, user) {
      const { url, model } = config.providers.ollama;
      const data = await postJSON(`${url.replace(/\/$/, '')}/api/chat`, {
        model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return data?.message?.content || '';
    },
  },
  {
    name: 'groq',
    enabled: () => Boolean(config.providers.groq.apiKey),
    async call(system, user) {
      const { apiKey, model } = config.providers.groq;
      const data = await postJSON(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        { Authorization: `Bearer ${apiKey}` }
      );
      return data?.choices?.[0]?.message?.content || '';
    },
  },
  {
    name: 'openrouter',
    enabled: () => Boolean(config.providers.openrouter.apiKey),
    async call(system, user) {
      const { apiKey, model } = config.providers.openrouter;
      const data = await postJSON(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        { Authorization: `Bearer ${apiKey}`, 'X-Title': 'SEO Boss Agent' }
      );
      return data?.choices?.[0]?.message?.content || '';
    },
  },
  {
    name: 'huggingface',
    enabled: () => Boolean(config.providers.huggingface.apiKey),
    async call(system, user) {
      const { apiKey, model } = config.providers.huggingface;
      const data = await postJSON(
        'https://api-inference.huggingface.co/models/' + model,
        {
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
        { Authorization: `Bearer ${apiKey}` }
      );
      return data?.choices?.[0]?.message?.content || '';
    },
  },
];

let preferred = null;

export function activeProviderName() {
  return preferred || 'template';
}

/** Extrait le premier objet JSON valide d'une réponse LLM (tolérant aux ```json). */
export function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text, text.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* essaye le suivant */
    }
  }
  return null;
}

/**
 * Demande du JSON structuré au meilleur LLM disponible.
 * Retourne null si aucun fournisseur n'est disponible -> le caller
 * bascule sur le générateur template local.
 */
export async function completeJSON(system, user) {
  for (const p of providers) {
    if (!p.enabled()) continue;
    try {
      const raw = await p.call(system, user);
      const json = extractJSON(raw);
      if (json) {
        preferred = p.name;
        return { json, provider: p.name };
      }
      throw new Error('réponse non-JSON');
    } catch (e) {
      console.warn(`[provider:${p.name}] échec -> ${e.message}`);
    }
  }
  preferred = 'template';
  return { json: null, provider: 'template' };
}
