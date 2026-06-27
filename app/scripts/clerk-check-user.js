import fs from 'fs';
import path from 'path';

async function run() {
  const envPath = path.resolve(process.cwd(), '.env.local');
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

  const clerkSecretKey = env.CLERK_SECRET_KEY;
  const testEmail = env.E2E_CLERK_EMAIL;

  if (!clerkSecretKey || !testEmail) {
    console.error('CLERK_SECRET_KEY or E2E_CLERK_EMAIL missing');
    process.exit(1);
  }

  console.log(`Checking Clerk for user: ${testEmail}...`);

  // Fetch users
  const listRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(testEmail)}`, {
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error('Clerk fetch error:', err);
    process.exit(1);
  }

  const users = await listRes.json();
  console.log(`Found ${users.length} users in Clerk.`);
  if (users.length > 0) {
    const user = users[0];
    console.log(`User ID: ${user.id}`);
    console.log(`Primary email verified: ${user.email_addresses[0].verification.status}`);
  }
}

run().catch(console.error);
