import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

  // Generate a fresh secure password containing uppercase, lowercase, numbers, and symbols
  const basePassword = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const newPassword = `P@ss_${basePassword}_!9`;

  console.log(`Checking Clerk for user: ${testEmail}...`);

  // 1. Fetch user ID if exists
  const listRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(testEmail)}`, {
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error('Clerk list error:', err);
    process.exit(1);
  }

  const users = await listRes.json();
  if (users.length > 0) {
    const userId = users[0].id;
    console.log(`Deleting existing user: ${userId}...`);
    const delRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!delRes.ok) {
      const err = await delRes.text();
      console.error('Clerk delete error:', err);
      process.exit(1);
    }
    console.log('User deleted successfully.');
  }

  // 2. Create new user
  console.log(`Creating new user: ${testEmail} with a fresh password...`);
  const createRes = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_address: [testEmail],
      password: newPassword,
      skip_verification: true,
      first_name: 'Staging',
      last_name: 'Practitioner'
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Clerk create error:', err);
    process.exit(1);
  }

  const newUser = await createRes.json();
  console.log(`Successfully created user: ${newUser.id}`);

  // 3. Update local env file with the new password
  console.log('Updating .env.local with the new password...');
  let lines = envContent.split(/\r?\n/);
  lines = lines.map(line => {
    if (line.trim().startsWith('E2E_CLERK_PASSWORD=')) {
      return `E2E_CLERK_PASSWORD="${newPassword}"`;
    }
    return line;
  });
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log('Successfully updated .env.local.');
}

run().catch(console.error);
