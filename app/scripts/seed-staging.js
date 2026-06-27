import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function run() {
  console.log('Starting staging database seeding...');

  // 1. Read .env.local manually to get Supabase and Clerk secrets
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

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clerkSecretKey = env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;
  const testEmail = process.env.E2E_CLERK_EMAIL || env.E2E_CLERK_EMAIL;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
    process.exit(1);
  }

  if (!testEmail) {
    console.error('Error: E2E_CLERK_EMAIL environment variable is not defined.');
    process.exit(1);
  }

  if (!clerkSecretKey) {
    console.error('Error: CLERK_SECRET_KEY is missing.');
    process.exit(1);
  }

  console.log(`Connecting to Supabase project at ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // 2. Fetch user details from Clerk Backend API
  console.log(`Fetching Clerk user matching email: ${testEmail}...`);
  let clerkUserId = '';
  try {
    const { execSync } = await import('child_process');
    const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(testEmail)}`;
    const curlCommand = `curl.exe -s -H "Authorization: Bearer ${clerkSecretKey}" -H "Content-Type: application/json" "${url}"`;
    const output = execSync(curlCommand, { encoding: 'utf8' });
    const users = JSON.parse(output);
    
    if (users.errors) {
      throw new Error(`Clerk BAPI error: ${JSON.stringify(users.errors)}`);
    }

    if (!users || users.length === 0) {
      throw new Error(`No user found in Clerk for email: ${testEmail}`);
    }

    clerkUserId = users[0].id;
    console.log(`Resolved Clerk User ID: ${clerkUserId}`);
  } catch (error) {
    console.error('Failed to retrieve Clerk user:', error.message);
    process.exit(1);
  }

  // 3. Resolve or create isolated staging firm context
  const firmId = 'daaaaaaa-bbbb-cccc-dddd-f99999999999';
  console.log(`Ensuring staging firm exists: ${firmId}...`);
  
  const { error: firmInsertErr } = await supabase
    .from('firms')
    .upsert({
      id: firmId,
      name: 'Staging E2E Test Law Firm',
      lpc_registration_number: 'LPC-STAGING-99999',
      vat_number: 'VAT-9999999999'
    });

  if (firmInsertErr) {
    console.error('Failed to upsert firm:', firmInsertErr.message);
    process.exit(1);
  }

  console.log(`Ensuring firm membership for user: ${clerkUserId} is linked to staging firm...`);
  const { error: memberInsertErr } = await supabase
    .from('firm_members')
    .upsert({
      id: clerkUserId,
      firm_id: firmId,
      role: 'Partner',
      is_active: true
    });

  if (memberInsertErr) {
    console.error('Failed to link firm member:', memberInsertErr.message);
    process.exit(1);
  }

  // Ensure user profile exists
  console.log(`Ensuring user profile for member: ${clerkUserId}...`);
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('member_id', clerkUserId)
    .maybeSingle();

  if (profile) {
    const { error: profileUpdateErr } = await supabase
      .from('user_profiles')
      .update({
        first_name: 'Staging',
        last_name: 'Practitioner',
        phone_number: '+27831234567'
      })
      .eq('member_id', clerkUserId);
    if (profileUpdateErr) {
      console.log('Profile update warning:', profileUpdateErr.message);
    }
  } else {
    const { error: profileInsertErr } = await supabase
      .from('user_profiles')
      .insert({
        member_id: clerkUserId,
        first_name: 'Staging',
        last_name: 'Practitioner',
        phone_number: '+27831234567'
      });
    if (profileInsertErr) {
      console.log('Profile insert warning:', profileInsertErr.message);
    }
  }

  // 4. Perform global cleanup of specific staging E2E IDs (across all firms)
  console.log('Performing global cleanup of staging E2E IDs...');
  const matterIds = [
    'd5555555-5555-5555-5555-555555555555',
    'd6666666-6666-6666-6666-666666666666',
    'd7777777-7777-7777-7777-777777777777',
    'd8888888-8888-8888-8888-888888888888',
    'd9999999-9999-9999-9999-999999999999',
    'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ];
  const clientIds = [
    'c1c1c1c1-1111-2222-3333-444444444444',
    'c2c2c2c2-2222-3333-4444-555555555555',
    'c3c3c3c3-3333-3333-4444-555555555555',
    'c4c4c4c4-4444-3333-4444-555555555555',
    'c5c5c5c5-5555-3333-4444-555555555555'
  ];
  const invoiceIds = ['f1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222'];
  const paymentIds = ['a1111111-2222-3333-4444-555555555555'];
  const docIds = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
  const verIds = ['00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022'];
  const summaryIds = ['00000000-0000-0000-0000-000000000222'];
  const taskIds = ['b1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'];
  const deadlineIds = ['e1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222'];

  await supabase.from('payments').delete().in('id', paymentIds);
  await supabase.from('invoices').delete().in('id', invoiceIds);
  await supabase.from('expenses').delete().in('matter_id', matterIds);
  await supabase.from('time_entries').delete().in('matter_id', matterIds);
  await supabase.from('matter_deadlines').delete().in('id', deadlineIds);
  await supabase.from('matter_tasks').delete().in('id', taskIds);
  await supabase.from('document_ai_summaries').delete().in('id', summaryIds);
  await supabase.from('document_versions').delete().in('id', verIds);
  await supabase.from('documents').delete().in('id', docIds);
  await supabase.from('matters').delete().in('id', matterIds);
  await supabase.from('clients').delete().in('id', clientIds);

  // 5. Seed 5 Clients
  console.log('Seeding 5 Clients...');
  const clients = [
    { id: 'c1c1c1c1-1111-2222-3333-444444444444', firm_id: firmId, type: 'Individual', first_name: 'Sipho', last_name: 'Nkosi', sa_id_number: '9201015678087', email: 'sipho@staging.co.za', phone_number: '+27831234567' },
    { id: 'c2c2c2c2-2222-3333-4444-555555555555', firm_id: firmId, type: 'Corporate', company_name: 'Incorporate SA Ltd', registration_number: '2020/123456/07', email: 'legal@incorporate.co.za', phone_number: '+27115550199' },
    { id: 'c3c3c3c3-3333-3333-4444-555555555555', firm_id: firmId, type: 'Individual', first_name: 'Lerato', last_name: 'Mokoena', sa_id_number: '8811125008080', email: 'lerato@staging.co.za', phone_number: '+27829876543' },
    { id: 'c4c4c4c4-4444-3333-4444-555555555555', firm_id: firmId, type: 'Corporate', company_name: 'Zulu Logistics Pty Ltd', registration_number: '2018/654321/07', email: 'info@zululogistics.co.za', phone_number: '+27113334444' },
    { id: 'c5c5c5c5-5555-3333-4444-555555555555', firm_id: firmId, type: 'Individual', first_name: 'Thabo', last_name: 'Zulu', sa_id_number: '8506015678087', email: 'thabo@zulu.co.za', phone_number: '+27721112222' }
  ];

  const { error: clientsErr } = await supabase.from('clients').insert(clients);
  if (clientsErr) {
    console.error('Failed to seed clients:', clientsErr.message);
    process.exit(1);
  }

  // 6. Seed 6 Matters (using valid UUIDs)
  console.log('Seeding 6 Matters...');
  const matters = [
    { id: 'd5555555-5555-5555-5555-555555555555', firm_id: firmId, client_id: 'c5c5c5c5-5555-3333-4444-555555555555', title: 'Zulu v MEC for Health (Gauteng)', case_number: '2026/45678', court_jurisdiction: 'Gauteng High Court', status: 'Pleadings', description: 'Medical negligence claim.' },
    { id: 'd6666666-6666-6666-6666-666666666666', firm_id: firmId, client_id: 'c2c2c2c2-2222-3333-4444-555555555555', title: 'Incorporate SA v Zondi Logistics', case_number: '2026/89012', court_jurisdiction: 'Randburg Magistrates Court', status: 'Intake', description: 'Debt recovery of fees.' },
    { id: 'd7777777-7777-7777-7777-777777777777', firm_id: firmId, client_id: 'c5c5c5c5-5555-3333-4444-555555555555', title: 'Zulu v Metro Rail Corp', case_number: 'JHB-L-2345/26', court_jurisdiction: 'CCMA Johannesburg', status: 'Discovery', description: 'CCMA unfair dismissal.' },
    { id: 'd8888888-8888-8888-8888-888888888888', firm_id: firmId, client_id: 'c1c1c1c1-1111-2222-3333-444444444444', title: 'Nkosi Contract Dispute', case_number: '2026/11111', court_jurisdiction: 'Pretoria High Court', status: 'Intake', description: 'Contractual dispute.' },
    { id: 'd9999999-9999-9999-9999-999999999999', firm_id: firmId, client_id: 'c3c3c3c3-3333-3333-4444-555555555555', title: 'Mokoena Property Eviction', case_number: '2026/22222', court_jurisdiction: 'JHB Magistrates Court', status: 'Intake', description: 'Residential eviction.' },
    { id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', firm_id: firmId, client_id: 'c4c4c4c4-4444-3333-4444-555555555555', title: 'Zulu Logistics Patent', case_number: '2026/33333', court_jurisdiction: 'CIPC Commissioner', status: 'Intake', description: 'Patent filing.' }
  ];

  const { error: mattersErr } = await supabase.from('matters').insert(matters);
  if (mattersErr) {
    console.error('Failed to seed matters:', mattersErr.message);
    process.exit(1);
  }

  // 7. Seed Tasks under Zulu v MEC for Health
  console.log('Seeding Tasks...');
  const tasks = [
    { id: 'b1111111-1111-1111-1111-111111111111', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', title: 'Draft Plea and Counterclaim', description: 'Draft plea responding to particulars.', status: 'Pending', assigned_to: clerkUserId, due_date: new Date(Date.now() + 86400000 * 5).toISOString() },
    { id: 'b2222222-2222-2222-2222-222222222222', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', title: 'Consult client Zulu', description: 'Consult client on merits.', status: 'Completed', assigned_to: clerkUserId, due_date: new Date(Date.now() - 86400000 * 2).toISOString() }
  ];
  const { error: tasksErr } = await supabase.from('matter_tasks').insert(tasks);
  if (tasksErr) {
    console.error('Failed to seed tasks:', tasksErr.message);
    process.exit(1);
  }

  // 8. Seed Deadlines (with trigger_event set)
  console.log('Seeding Deadlines...');
  const deadlines = [
    { id: 'e1111111-1111-1111-1111-111111111111', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', title: 'Plea Due Date', trigger_event: 'Summons Served', calculated_deadline: new Date(Date.now() + 86400000 * 2).toISOString(), is_completed: false },
    { id: 'e2222222-2222-2222-2222-222222222222', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', title: 'Notice of Intention to Defend', trigger_event: 'Notice Served', calculated_deadline: new Date(Date.now() - 86400000 * 5).toISOString(), is_completed: true }
  ];
  const { error: dlErr } = await supabase.from('matter_deadlines').insert(deadlines);
  if (dlErr) {
    console.error('Failed to seed deadlines:', dlErr.message);
    process.exit(1);
  }

  // 9. Seed Time Entries
  console.log('Seeding Time Entries...');
  const timeEntries = [
    { firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', member_id: clerkUserId, duration_minutes: 60, hourly_rate_zar: 1500, description: 'Client consultation on negligence merits', is_billed: true },
    { firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', member_id: clerkUserId, duration_minutes: 120, hourly_rate_zar: 1800, description: 'Drafting plea and counter-claim documents', is_billed: false },
    { firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', member_id: clerkUserId, duration_minutes: 30, hourly_rate_zar: 1500, description: 'Filing pleadings in Johannesburg High Court', is_billed: false }
  ];
  const { error: timeErr } = await supabase.from('time_entries').insert(timeEntries);
  if (timeErr) {
    console.error('Failed to seed time entries:', timeErr.message);
    process.exit(1);
  }

  // 10. Seed Expenses
  console.log('Seeding Expenses...');
  const expenses = [
    { firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', amount_zar: 250, description: 'Sheriff service fees (summons)', is_billed: true },
    { firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', amount_zar: 500, description: 'Court stamp and filing fees', is_billed: false }
  ];
  const { error: expErr } = await supabase.from('expenses').insert(expenses);
  if (expErr) {
    console.error('Failed to seed expenses:', expErr.message);
    process.exit(1);
  }

  // 11. Seed Invoices & Payments
  console.log('Seeding Invoices & Payments...');
  const invoices = [
    { id: 'f1111111-1111-1111-1111-111111111111', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', client_id: 'c5c5c5c5-5555-3333-4444-555555555555', invoice_number: 'INV-00000001', total_excluding_vat: 1500, vat_amount: 225, total_including_vat: 1725, status: 'Paid', due_date: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'f2222222-2222-2222-2222-222222222222', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', client_id: 'c5c5c5c5-5555-3333-4444-555555555555', invoice_number: 'INV-00000002', total_excluding_vat: 2000, vat_amount: 300, total_including_vat: 2300, status: 'Issued', due_date: new Date(Date.now() + 86400000 * 15).toISOString() }
  ];
  const { error: invErr } = await supabase.from('invoices').insert(invoices);
  if (invErr) {
    console.error('Failed to seed invoices:', invErr.message);
    process.exit(1);
  }

  const payments = [
    { id: 'a1111111-2222-3333-4444-555555555555', firm_id: firmId, invoice_id: 'f1111111-1111-1111-1111-111111111111', amount_paid: 1725, payment_method: 'EFT', transaction_reference: 'EFT-ZULU-001' }
  ];
  const { error: payErr } = await supabase.from('payments').insert(payments);
  if (payErr) {
    console.error('Failed to seed payments:', payErr.message);
    process.exit(1);
  }

  // 12. Seed Documents, Versions, and AI summaries
  console.log('Seeding Documents...');
  const docs = [
    { id: '00000000-0000-0000-0000-000000000001', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', client_id: 'c5c5c5c5-5555-3333-4444-555555555555', title: 'Summons and Particulars of Claim', is_privileged: false, status: 'approved', confidentiality_level: 'standard', category: 'Pleading', document_type: 'application/pdf', ai_processed: false, approval_status: 'approved' },
    { id: '00000000-0000-0000-0000-000000000002', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', client_id: 'c5c5c5c5-5555-3333-4444-555555555555', title: 'Client Interview Notes', is_privileged: true, status: 'review_pending', confidentiality_level: 'confidential', category: 'Internal Memo', document_type: 'application/pdf', ai_processed: true, approval_status: 'pending' }
  ];
  const { error: docErr } = await supabase.from('documents').insert(docs);
  if (docErr) {
    console.error('Failed to seed documents:', docErr.message);
    process.exit(1);
  }

  const docVersions = [
    { id: '00000000-0000-0000-0000-000000000011', firm_id: firmId, document_id: '00000000-0000-0000-0000-000000000001', version_number: 1, storage_path: `${firmId}/d5555555-5555-5555-5555-555555555555/00000000-0000-0000-0000-000000000011.pdf`, file_name: 'summons.pdf', file_size: 102400, mime_type: 'application/pdf', classification: 'Pleading', uploaded_by: clerkUserId },
    { id: '00000000-0000-0000-0000-000000000022', firm_id: firmId, document_id: '00000000-0000-0000-0000-000000000002', version_number: 1, storage_path: `${firmId}/d5555555-5555-5555-5555-555555555555/00000000-0000-0000-0000-000000000022.pdf`, file_name: 'interview_notes.pdf', file_size: 204800, mime_type: 'application/pdf', classification: 'Internal Memo', uploaded_by: clerkUserId }
  ];
  const { error: verErr } = await supabase.from('document_versions').insert(docVersions);
  if (verErr) {
    console.error('Failed to seed document versions:', verErr.message);
    process.exit(1);
  }

  const summaries = [
    { id: '00000000-0000-0000-0000-000000000222', firm_id: firmId, matter_id: 'd5555555-5555-5555-5555-555555555555', document_id: '00000000-0000-0000-0000-000000000002', output_title: 'Placeholder Document Summary', summary_text: 'This is a placeholder document summary generated for workflow validation. Live AI extraction is not enabled yet.', sources_used: [], confidence_level: 'low', missing_information: 'None', suggested_next_action: 'Review document manually', approval_status: 'pending', generated_by: clerkUserId }
  ];
  const { error: sumErr } = await supabase.from('document_ai_summaries').insert(summaries);
  if (sumErr) {
    console.error('Failed to seed summaries:', sumErr.message);
    process.exit(1);
  }

  console.log('✅ Staging database seeded successfully with all required test entities!');
  process.exit(0);
}

run().catch(err => {
  console.error('Seeding process encountered an error:', err);
  process.exit(1);
});
