#!/usr/bin/env node
/**
 * Push main branch to GitHub using GITHUB_TOKEN (never commit the token).
 * Usage: export GITHUB_TOKEN=ghp_... && node scripts/push-github.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const token = process.env.GITHUB_TOKEN?.trim();
if (!token) {
  console.error('\nMissing GITHUB_TOKEN.\n');
  console.error('  export GITHUB_TOKEN=ghp_your_token');
  console.error('  node scripts/push-github.mjs\n');
  console.error('Token needs repo → Contents: Read and write (classic: check "repo").\n');
  process.exit(1);
}

const owner = 'pranaygoud550-hue';
const repo = 'makebig';
const pushUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

try {
  execSync('git remote get-url origin', { cwd: root, stdio: 'pipe' });
} catch {
  execSync(`git remote add origin https://github.com/${owner}/${repo}.git`, { cwd: root });
}

console.log(`\nPushing to https://github.com/${owner}/${repo} …\n`);
try {
  execSync(`git push ${pushUrl} main`, { cwd: root, stdio: 'pipe' });
} catch (err) {
  const msg = err.stderr?.toString() || err.message || '';
  console.error(msg);
  if (msg.includes('403') || msg.includes('denied')) {
    console.error(`
Push blocked — your token cannot write to the repo.

Fix (pick one):
  A) Classic token: github.com/settings/tokens/new → check "repo" → Generate
  B) Fine-grained token: edit token → Repository access: makebig
     → Permissions → Contents → "Read and write" → Save

Then run (paste token ONLY after export=, in Terminal):
  export GITHUB_TOKEN=your_token_here
  npm run push:github
`);
  }
  process.exit(1);
}

try {
  execSync('git branch --set-upstream-to=origin/main main', { cwd: root, stdio: 'pipe' });
} catch {
  /* upstream may already exist */
}

console.log('\n✓ Code is on GitHub: https://github.com/pranaygoud550-hue/makebig\n');
