#!/usr/bin/env node
/** Start Express API + Next.js dev server together */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`[${label}] exited with ${code}`);
  });
  return child;
}

console.log('\nStarting Make Big API (5001) + Next.js (3000)…\n');
console.log('Press Ctrl+C to stop both.\n');

const api = run('node', ['server-new.js'], 'api');
const next = run('npx', ['next', 'dev', '-p', '3000'], 'next');

function shutdown() {
  api.kill('SIGTERM');
  next.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
