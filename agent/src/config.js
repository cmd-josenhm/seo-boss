import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const env = (k, d = '') => (process.env[k] ?? d).toString().trim();

export const config = {
  port: parseInt(env('PORT', '4000'), 10),
  agentToken: env('AGENT_TOKEN', 'dev-agent-token'),
  siteUrl: env('SITE_URL', 'https://buzzafrique.vercel.app'),
  runIntervalMinutes: Math.max(1, parseInt(env('RUN_INTERVAL_MINUTES', '30'), 10)),
  autoPublish: env('AUTO_PUBLISH', 'true').toLowerCase() !== 'false',
  lang: env('AGENT_LANG', 'fr'),
  maxRunsKeep: 50,

  // --- Catalogue : CROISSANCE UNIQUEMENT -------------------------------------
  // Les anciens articles ne sont JAMAIS supprimés (modèle « bibliothèque »).
  //   max = 0  -> aucun plafond : l'agent enrichit le catalogue en continu
  //   max > 0  -> au-delà de N articles publiés, l'agent arrête de créer de
  //               NOUVEAUX sujets mais continue de mettre à jour les anciens
  catalog: {
    max: Math.max(0, parseInt(env('CATALOG_MAX', '0'), 10)),
  },

  // --- IndexNow : indexation automatique par Bing/Yandex/Naver/Seznam ---
  // (Google ne participe pas à IndexNow : il passe par le sitemap + Search Console)
  indexnow: {
    enabled: env('INDEXNOW_ENABLED', 'true') !== 'false',
    key: env('INDEXNOW_KEY', '0f8c1a2e4b6d4f0aa1b2c3d4e5f60718'),
  },

  maxArticlesPerCycle: Math.max(1, parseInt(env('MAX_ARTICLES_PER_CYCLE', '2'), 10)),

  // Limitation de débit simple (par IP) sur les routes publiques d'écriture
  rateLimit: {
    windowMs: 60_000,
    maxViews: Math.max(1, parseInt(env('RATE_LIMIT_VIEWS_PER_MIN', '40'), 10)),
  },

  // Chaîne de modèles LLM open-source (gratuits) — ordre de priorité
  providers: {
    ollama: { url: env('OLLAMA_URL'), model: env('OLLAMA_MODEL', 'llama3.1:8b') },
    groq: { apiKey: env('GROQ_API_KEY'), model: env('GROQ_MODEL', 'llama-3.3-70b-versatile') },
    openrouter: {
      apiKey: env('OPENROUTER_API_KEY'),
      model: env('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free'),
    },
    huggingface: {
      apiKey: env('HF_API_KEY') || env('HUGGINGFACE_API_KEY'),
      model: env('HF_MODEL', 'meta-llama/Llama-3.3-70B-Instruct'),
    },
  },
};
