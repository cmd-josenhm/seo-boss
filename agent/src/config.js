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
  siteUrl: env('SITE_URL', 'http://localhost:3000'),
  runIntervalMinutes: Math.max(1, parseInt(env('RUN_INTERVAL_MINUTES', '30'), 10)),
  autoPublish: env('AUTO_PUBLISH', 'true').toLowerCase() !== 'false',
  lang: env('AGENT_LANG', 'fr'),
  maxRunsKeep: 50,

  // --- Rotation autonome des contenus (chaque cycle) ---
  // enabled  : active la rotation (true)
  // contentMax : nombre max de contenus en ligne (0 = PURGE COMPLÈTE à chaque cycle,
  //              tous les contenus sont supprimés puis recréés)
  // retentionHours : âge minimum (heures) avant suppression en mode inventaire
  rotation: {
    enabled: env('ROTATION_ENABLED', 'true') !== 'false',
    contentMax: Math.max(0, parseInt(env('CONTENT_MAX', '40'), 10)),
    retentionHours: Math.max(0, parseInt(env('RETENTION_HOURS', '6'), 10)),
  },

  // --- IndexNow : indexation automatique des nouveaux contenus par Google/Bing/Yandex ---
  indexnow: {
    enabled: env('INDEXNOW_ENABLED', 'true') !== 'false',
    key: env('INDEXNOW_KEY', '0f8c1a2e4b6d4f0aa1b2c3d4e5f60718'),
  },

  maxArticlesPerCycle: Math.max(1, parseInt(env('MAX_ARTICLES_PER_CYCLE', '1'), 10)),

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
