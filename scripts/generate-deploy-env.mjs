#!/usr/bin/env node
/**
 * Print copy-paste env blocks for Render + Vercel from local .env files.
 * Run locally only — output contains secrets. Never commit printed output.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnvFile(join(root, '.env')), ...loadEnvFile(join(root, 'backend/.env')) };

const jwt = env.JWT_SECRET && !env.JWT_SECRET.includes('change-me')
  ? env.JWT_SECRET
  : randomBytes(32).toString('base64');

const render = {
  NODE_ENV: 'production',
  PORT: '10000',
  MONGODB_URI: env.MONGODB_URI || '(copy from Atlas — same as local .env)',
  JWT_SECRET: jwt,
  FRONTEND_URL: env.FRONTEND_URL?.includes('onrender') || env.FRONTEND_URL?.includes('vercel')
    ? env.FRONTEND_URL
    : 'https://makebig.onrender.com',
  EMAIL_FROM: env.EMAIL_FROM || '',
  EMAIL_PASS: env.EMAIL_PASS || '',
  GROQ_API_KEY: env.GROQ_API_KEY || '',
};

const vercel = {
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL?.includes('onrender')
    ? env.NEXT_PUBLIC_API_URL
    : 'https://makebig.onrender.com',
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL?.includes('onrender') || env.NEXT_PUBLIC_APP_URL?.includes('vercel')
    ? env.NEXT_PUBLIC_APP_URL
    : 'https://makebig.onrender.com',
  NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL || 'https://makebig.onrender.com',
  JWT_SECRET: jwt,
  EMAIL_FROM: env.EMAIL_FROM || '',
  EMAIL_PASS: env.EMAIL_PASS || '',
};

function block(title, vars) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n`);
  for (const [k, v] of Object.entries(vars)) {
    if (v) console.log(`${k}=${v}`);
  }
}

console.log('\nMake Big — deploy environment (keep private, do not commit)\n');
block('RENDER (make-big-api)', render);
block('VERCEL (Production env)', vercel);
console.log('\nAfter Vercel deploy, update FRONTEND_URL on Render and redeploy API.\n');
