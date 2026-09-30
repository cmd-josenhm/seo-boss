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
