import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function run() {
  console.log('Starting database RLS verification...');

  // 1. Read .env.local manually to get Supabase secrets
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env.local not found at ${envPath}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[match[1]] = val.trim();
    }
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
    process.exit(1);
  }

  // Use service role client to call the test RPC function
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  console.log(`Connecting to Supabase project at ${supabaseUrl}...`);
  
  const { data, error } = await supabase.rpc('verify_rls_helpers');

  if (error) {
    console.error('Error executing verify_rls_helpers RPC with service role:', error);
    process.exit(1);
  }

  console.log('\n--- RLS Verification Test Results ---');
  let allPassed = true;
  data.forEach((row, index) => {
    const statusStr = row.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`[${index + 1}] ${row.test_name}: ${statusStr} (Result: "${row.result_val}")`);
    if (!row.passed) {
      allPassed = false;
    }
  });
  console.log('-------------------------------------\n');

  // Security Verification: verify_rls_helpers MUST NOT be callable by anon/public keys
  console.log('Verifying verify_rls_helpers execute restriction for public role...');
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local');
    process.exit(1);
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });

  const { error: anonError } = await anonClient.rpc('verify_rls_helpers');
  
  if (!anonError) {
    console.error('❌ Security Failure: verify_rls_helpers() was executed successfully by public/anon role!');
    allPassed = false;
  } else {
    // PostgREST code '42501' represents permission denied
    if (anonError.code === '42501' || anonError.message.toLowerCase().includes('permission denied')) {
      console.log('✅ Security Pass: verify_rls_helpers() execute permission successfully denied for public/anon role (Error: ' + anonError.message + ')');
    } else {
      console.warn('⚠️ Received unexpected error code/message for anon access block: ', anonError);
      allPassed = false;
    }
  }
  console.log('');

  if (allPassed) {
    console.log('✅ All RLS helper and security permission tests passed successfully!');
    setTimeout(() => process.exit(0), 100);
  } else {
    console.error('❌ Some RLS helper or security permission tests failed. Please review the results.');
    setTimeout(() => process.exit(1), 100);
  }
}

run().catch(err => {
  console.error('Unexpected error running tests:', err);
  process.exit(1);
});

