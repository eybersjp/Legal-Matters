import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function run() {
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

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
    process.exit(1);
  }

  console.log(`Connecting to Supabase at ${url}...`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const testFirmId = 'daaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  console.log(`Cleaning up references to firm ID: ${testFirmId}...`);

  // Delete from firm_members first
  const { data: membersDeleted, error: membersError } = await supabase
    .from('firm_members')
    .delete()
    .eq('firm_id', testFirmId);

  if (membersError) {
    console.error('Error deleting from firm_members:', membersError.message);
  } else {
    console.log('Successfully deleted referencing firm members.');
  }

  // Delete from firms
  const { data: firmsDeleted, error: firmsError } = await supabase
    .from('firms')
    .delete()
    .eq('id', testFirmId);

  if (firmsError) {
    console.error('Error deleting from firms:', firmsError.message);
  } else {
    console.log('Successfully deleted test firm.');
  }

  console.log('Cleanup completed.');
}

run().catch(console.error);
