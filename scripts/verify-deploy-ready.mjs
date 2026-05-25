#!/usr/bin/env node
/**
 * Pre-deploy security + readiness checks.
 * Run: node scripts/verify-deploy-ready.mjs
 * With API: API_URL=https://your-api.onrender.com node scripts/verify-deploy-ready.mjs
 */

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const WEAK = [
  'change-me',
  'CHANGE_THIS',
  'REPLACE_WITH',
  'your-secret',
  'your@gmail.com',
  'your_gmail@gmail.com',
  'your_gmail_app_password',
  'your_email@gmail.com',
  'your_api_key',
  'your_groq_key',
  'generate_random_string',
  'dev-secret-key',
  'Pranay123',
  'sk_test_...',
  'USER:PASSWORD',
  'YOUR_USER:YOUR_PASSWORD',
];

function isWeak(val) {
  if (!val) return true;
  const s = String(val);
  return WEAK.some((w) => s.includes(w));
}

async function main() {
  console.log('\nMake Big — deploy readiness & security\n');

  let ok = true;

  const required = [
    ['MONGODB_URI', process.env.MONGODB_URI],
    ['JWT_SECRET', process.env.JWT_SECRET],
    ['FRONTEND_URL', process.env.FRONTEND_URL],
  ];

  const envFiles = ['.env', 'backend/.env'];
  for (const file of envFiles) {
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');
      const p = join(process.cwd(), file);
      if (existsSync(p) && readFileSync(p, 'utf8').includes('Pranay123')) {
        console.log(`  ✗ ${file} — still contains default password "Pranay123"; rotate in Atlas`);
        ok = false;
      }
    } catch {
      /* ignore */
    }
  }

  for (const [name, val] of required) {
    if (isWeak(val)) {
      console.log(`  ✗ ${name} — set a strong value on Render (not a placeholder)`);
      ok = false;
    } else {
      console.log(`  ✓ ${name}`);
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_OTP === 'true') {
    console.log('  ⚠ ALLOW_DEV_OTP=true in production — OTP codes may appear in API responses');
  }

  const hasOtp =
    (process.env.EMAIL_FROM && process.env.EMAIL_PASS && !isWeak(process.env.EMAIL_FROM)) ||
    (process.env.FAST2SMS_API_KEY && !isWeak(process.env.FAST2SMS_API_KEY));

  if (process.env.NODE_ENV === 'production' && !hasOtp && process.env.ALLOW_DEV_OTP !== 'true') {
    console.log('  ⚠ OTP delivery not configured — set EMAIL_FROM/EMAIL_PASS or FAST2SMS_API_KEY');
  } else if (hasOtp) {
    console.log('  ✓ OTP delivery configured');
  }

  if (process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
    console.log('  ✗ NEXT_PUBLIC_API_URL still points to localhost (fix on Vercel)');
    ok = false;
  } else if (process.env.NEXT_PUBLIC_API_URL) {
    console.log(`  ✓ NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL}`);
  }

  const publicSecrets = ['STRIPE_SECRET_KEY', 'GROQ_API_KEY', 'JWT_SECRET', 'EMAIL_PASS', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const key of publicSecrets) {
    const pubKey = `NEXT_PUBLIC_${key}`;
    if (process.env[pubKey]) {
      console.log(`  ✗ ${pubKey} must not exist — server secrets belong in server env only`);
      ok = false;
    }
  }

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/health`, {
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    if (data?.success && data?.data?.status === 'ok') {
      console.log(`  ✓ API health @ ${apiUrl} (db: ${data.data.database})`);
    } else {
      console.log(`  ✗ API health unexpected response @ ${apiUrl}`);
      ok = false;
    }
  } catch (e) {
    console.log(`  ✗ API health failed @ ${apiUrl} — ${e.message}`);
    ok = false;
  }

  console.log(
    ok
      ? '\nReady for deploy. Run smoke tests (sign up → create project → add task).\n'
      : '\nFix items above before going live.\n'
  );
  process.exit(ok ? 0 : 1);
}

main();
