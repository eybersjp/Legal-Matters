'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { CreateMatterSchema, CloseMatterValidationSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

export async function getMattersList() {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('matters')
    .select(`
      id,
      title,
      case_number,
      court_jurisdiction,
      status,
      created_at,
      clients (
        first_name,
        last_name,
        company_name
      )
    `)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((item: any) => ({
    id: item.id,
    title: item.title,
    case_number: item.case_number,
    court_jurisdiction: item.court_jurisdiction,
    status: item.status,
    created_at: item.created_at,
    client_name: item.clients?.company_name || `${item.clients?.first_name} ${item.clients?.last_name}`,
  }));
}

export async function createMatter(formData: any) {
  const parsed = CreateMatterSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify client ownership
  const { data: client, error: clientError } = await adminDb
    .from('clients')
    .select('id')
    .eq('id', parsed.data.client_id)
    .eq('firm_id', firmId)
    .single();

  if (clientError || !client) {
    return { success: false, error: 'Access denied: Client does not belong to your practice.' };
  }

  const { data, error } = await adminDb
    .from('matters')
    .insert({
      firm_id: firmId,
      client_id: parsed.data.client_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      case_number: parsed.data.case_number || null,
      court_jurisdiction: parsed.data.court_jurisdiction,
      status: 'Intake',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create audit log for case intake
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'CREATE_MATTER',
    resource_type: 'matter',
    resource_id: data.id,
    changes: parsed.data,
  });

  // Assign Creator to Matter Team implicitly
  await adminDb.from('matter_team_members').insert({
    firm_id: firmId,
    matter_id: data.id,
    member_id: userId,
  });

  revalidatePath('/dashboard/matters');
  return { success: true, id: data.id };
}

export async function getMatterDetails(matterId: string) {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data: matter, error: matErr } = await adminDb
    .from('matters')
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        company_name,
        email,
        phone_number
      )
    `)
    .eq('id', matterId)
    .eq('firm_id', firmId)
    .single();

  if (matErr) throw new Error(matErr.message);

  const { data: team, error: teamErr } = await adminDb
    .from('matter_team_members')
    .select(`
      id,
      firm_members (
        id,
        role,
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('matter_id', matterId);

  if (teamErr) throw new Error(teamErr.message);

  return { matter, team };
}

export async function closeMatter(matterId: string, closureData: unknown) {
  const parsed = CloseMatterValidationSchema.safeParse(closureData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // 1. Verify matter ownership and current status
  const { data: matter, error: matError } = await adminDb
    .from('matters')
    .select('id, title, status')
    .eq('id', matterId)
    .eq('firm_id', firmId)
    .single();

  if (matError || !matter) {
    return { success: false, error: 'Access denied: Matter not found.' };
  }

  if (matter.status === 'Closed' || matter.status === 'Archived') {
    return { success: false, error: 'Cannot close matter: Matter is already closed or archived.' };
  }

  // 2. Check for unbilled time entries
  const { data: unbilledTime, error: timeError } = await adminDb
    .from('time_entries')
    .select('id')
    .eq('matter_id', matterId)
    .eq('is_billed', false);

  if (timeError) return { success: false, error: timeError.message };
  if (unbilledTime && unbilledTime.length > 0) {
    return { success: false, error: 'Cannot close matter: Unbilled time entries exist.' };
  }

  // 3. Check for unbilled expenses
  const { data: unbilledExpenses, error: expError } = await adminDb
    .from('expenses')
    .select('id')
    .eq('matter_id', matterId)
    .eq('is_billed', false);

  if (expError) return { success: false, error: expError.message };
  if (unbilledExpenses && unbilledExpenses.length > 0) {
    return { success: false, error: 'Cannot close matter: Unbilled expenses exist.' };
  }

  // 4. Check for incomplete tasks
  const { data: openTasks, error: taskError } = await adminDb
    .from('matter_tasks')
    .select('id')
    .eq('matter_id', matterId)
    .neq('status', 'Completed');

  if (taskError) return { success: false, error: taskError.message };
  if (openTasks && openTasks.length > 0) {
    return { success: false, error: 'Cannot close matter: Open tasks remain unresolved.' };
  }

  // 5. Check for incomplete deadlines
  const { data: openDeadlines, error: dlError } = await adminDb
    .from('matter_deadlines')
    .select('id')
    .eq('matter_id', matterId)
    .eq('is_completed', false);

  if (dlError) return { success: false, error: dlError.message };
  if (openDeadlines && openDeadlines.length > 0) {
    return { success: false, error: 'Cannot close matter: Open deadlines remain unresolved.' };
  }

  // 6. Check for unpaid/unsettled invoices (status not in ('Paid', 'WrittenOff'))
  const { data: unpaidInvoices, error: invError } = await adminDb
    .from('invoices')
    .select('id, invoice_number, status')
    .eq('matter_id', matterId)
    .neq('status', 'Paid')
    .neq('status', 'WrittenOff');

  if (invError) return { success: false, error: invError.message };
  if (unpaidInvoices && unpaidInvoices.length > 0) {
    return { success: false, error: 'Cannot close matter: Unpaid or outstanding invoices exist.' };
  }

  // 7. Perform matter closure update
  const combinedReason = parsed.data.closure_notes
    ? `${parsed.data.closure_reason}\nNotes: ${parsed.data.closure_notes}`
    : parsed.data.closure_reason;

  const { error: updateError } = await adminDb
    .from('matters')
    .update({
      status: 'Closed',
      closed_at: new Date().toISOString(),
      closure_reason: combinedReason,
      client_communication_status: parsed.data.client_communication_status,
      document_archive_status: parsed.data.document_archive_status,
      data_retention_confirmed: parsed.data.data_retention_confirmed,
    })
    .eq('id', matterId)
    .eq('firm_id', firmId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 8. Create timeline event for matter closure
  await adminDb.from('matter_events').insert({
    firm_id: firmId,
    matter_id: matterId,
    title: 'Matter Closed',
    description: `Case folder officially closed. Reason: ${parsed.data.closure_reason}.`,
    event_date: new Date().toISOString(),
    created_by: userId,
  });

  // 9. Create audit log entry
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'CLOSE_MATTER',
    resource_type: 'matter',
    resource_id: matterId,
    changes: {
      status: 'Closed',
      closure_reason: combinedReason,
      client_communication_status: parsed.data.client_communication_status,
      document_archive_status: parsed.data.document_archive_status,
    },
  });

  revalidatePath('/dashboard/matters');
  revalidatePath(`/dashboard/matters/${matterId}`);

  return { success: true };
}
