#!/usr/bin/env node
/**
 * Print copy-paste env blocks for Render (API) + Vercel (frontend) from local .env.
 * Run locally only — output contains secrets. Never commit printed output.
 *
 * Usage: npm run deploy:env
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

const jwt =
  env.JWT_SECRET && !env.JWT_SECRET.includes('change-me') && !env.JWT_SECRET.includes('generate_random')
    ? env.JWT_SECRET
    : randomBytes(32).toString('base64');

const renderApiUrl =
  env.NEXT_PUBLIC_API_URL?.includes('onrender.com')
    ? env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : 'https://make-big-api.onrender.com';

const vercelAppUrl =
  env.NEXT_PUBLIC_APP_URL?.includes('vercel.app')
    ? env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : env.FRONTEND_URL?.includes('vercel.app')
      ? env.FRONTEND_URL.replace(/\/$/, '')
      : 'https://makebig.vercel.app';

const render = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_DATA_BACKEND: 'mongo',
  MONGODB_URI: env.MONGODB_URI || env.MONGO_URI || '(paste Atlas connection string)',
  JWT_SECRET: jwt,
  FRONTEND_URL: vercelAppUrl,
  CORS_EXTRA_ORIGINS: vercelAppUrl,
  CORS_ALLOW_VERCEL_PREVIEWS: 'true',
  ALLOW_DEV_OTP: 'false',
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || '',
  GROQ_API_KEY: env.GROQ_API_KEY || '',
  EMAIL_FROM: env.EMAIL_FROM || '',
  EMAIL_PASS: env.EMAIL_PASS || '',
  FAST2SMS_API_KEY: env.FAST2SMS_API_KEY || '',
};

const vercel = {
  NEXT_PUBLIC_DATA_BACKEND: 'mongo',
  NEXT_PUBLIC_API_URL: renderApiUrl,
  NEXT_PUBLIC_APP_URL: vercelAppUrl,
  NEXT_PUBLIC_SITE_URL: vercelAppUrl,
  JWT_SECRET: jwt,
  EMAIL_FROM: env.EMAIL_FROM || '',
  EMAIL_PASS: env.EMAIL_PASS || '',
  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRO_PRICE_ID: env.STRIPE_PRO_PRICE_ID || '',
};

function block(title, vars, notes = '') {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n`);
  if (notes) console.log(`${notes}\n`);
  for (const [k, v] of Object.entries(vars)) {
    if (v) console.log(`${k}=${v}`);
  }
}

console.log('\nMake Big — Vercel (frontend) + Render (API) environment blocks');
console.log('Keep private. Do not commit. Paste into each platform dashboard.\n');

block(
  'RENDER — Web Service (make-big-api)',
  render,
  'Build: npm install | Start: npm run api:prod | Health: /api/health'
);

block(
  'VERCEL — Production environment',
  vercel,
  'After Vercel deploy, set FRONTEND_URL on Render to your exact Vercel URL and redeploy API.'
);

console.log('\nDeploy order:');
console.log('  1. Push code to GitHub');
console.log('  2. Render — create Web Service, paste RENDER block, deploy');
console.log('  3. Vercel — import repo, paste VERCEL block (set NEXT_PUBLIC_API_URL to live Render URL), deploy');
console.log('  4. Render — update FRONTEND_URL to final Vercel URL, redeploy');
console.log('  5. Verify: API_URL=https://your-api.onrender.com npm run verify:deploy\n');
