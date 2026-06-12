'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { RecordTrustSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

export async function getTrustRecordsList() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('trust_account_records')
    .select(`
      id,
      reference_number,
      trust_ledger_balance,
      section_86_type,
      description,
      created_at,
      clients (
        id,
        first_name,
        last_name,
        company_name
      ),
      matters (
        id,
        title,
        case_number
      ),
      firm_members (
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((rec: any) => ({
    id: rec.id,
    reference_number: rec.reference_number,
    balance: rec.trust_ledger_balance,
    section_86_type: rec.section_86_type,
    description: rec.description,
    created_at: rec.created_at,
    client_name: rec.clients?.company_name || `${rec.clients?.first_name} ${rec.clients?.last_name}`,
    matter_title: rec.matters?.title,
    case_number: rec.matters?.case_number,
    recorded_by: rec.firm_members?.[0]?.user_profiles?.[0]
      ? `${rec.firm_members[0].user_profiles[0].first_name} ${rec.firm_members[0].user_profiles[0].last_name}`
      : 'System',
  }));
}

export async function getMattersWithClients() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('matters')
    .select(`
      id,
      title,
      case_number,
      client_id,
      clients (
        id,
        first_name,
        last_name,
        company_name
      )
    `)
    .eq('firm_id', auth.firmId);

  if (error) throw new Error(error.message);

  return data.map((m: any) => ({
    id: m.id,
    title: m.title,
    case_number: m.case_number,
    client_id: m.client_id,
    client_name: m.clients?.company_name || `${m.clients?.first_name} ${m.clients?.last_name}`,
  }));
}

export async function recordTrustTransaction(formData: {
  client_id: string;
  matter_id: string;
  amount: number;
  section_86_type: '86(2)' | '86(3)' | '86(4)';
  description: string;
}) {
  const parsed = RecordTrustSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Validate that the matter and client belong to the authenticated user's firm
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id, firm_id, client_id')
    .eq('id', parsed.data.matter_id)
    .eq('firm_id', auth.firmId)
    .single();

  if (matterError || !matter || matter.client_id !== parsed.data.client_id) {
    return { success: false, error: 'Access denied: Matter/Client not found or firm mismatch.' };
  }

  // Generate unique Section 86 trust reference number
  const refNumber = `TR-${parsed.data.section_86_type.replace('(', '').replace(')', '')}-${Date.now().toString().slice(-6)}`;

  const { data: record, error } = await adminDb
    .from('trust_account_records')
    .insert({
      firm_id: auth.firmId,
      client_id: parsed.data.client_id,
      matter_id: parsed.data.matter_id,
      reference_number: refNumber,
      trust_ledger_balance: parsed.data.amount,
      section_86_type: parsed.data.section_86_type,
      description: parsed.data.description,
      recorded_by: auth.userId,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit this critical financial metadata action (LPC regulatory requirement)
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'RECORD_TRUST_METADATA',
    resource_type: 'trust_account_records',
    resource_id: record.id,
    changes: {
      reference_number: refNumber,
      amount: parsed.data.amount,
      section_86_type: parsed.data.section_86_type
    },
  });

  revalidatePath('/dashboard/trust');
  return { success: true };
}
