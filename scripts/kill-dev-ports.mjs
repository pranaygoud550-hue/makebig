#!/usr/bin/env node
/** Free ports 3000–3005 used by stuck Next.js dev servers */
import { execSync } from 'child_process';

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 5001];

for (const port of PORTS) {
  try {
    const out = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (!out) continue;
    for (const pid of out.split('\n').filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`Stopped process ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port free */
  }
}
