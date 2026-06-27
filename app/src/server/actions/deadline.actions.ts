'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { calculateCourtDeadline } from '@/lib/court-days/calculator';
import { revalidatePath } from 'next/cache';

// Seeded South African Public Holidays for 2026
const saPublicHolidays2026 = [
  '2026-01-01', // New Year's Day
  '2026-03-21', // Human Rights Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Family Day
  '2026-04-27', // Freedom Day
  '2026-05-01', // Workers' Day
  '2026-06-16', // Youth Day
  '2026-08-09', // National Women's Day
  '2026-08-10', // Women's Day holiday
  '2026-09-24', // Heritage Day
  '2026-12-16', // Day of Reconciliation
  '2026-12-25', // Christmas Day
  '2026-12-26', // Day of Goodwill
];

export async function getMattersForDropdown() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('matters')
    .select('id, title, case_number')
    .eq('firm_id', auth.firmId);

  if (error) throw new Error(error.message);
  return data;
}

export async function getDeadlinesList() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('matter_deadlines')
    .select(`
      id,
      title,
      description,
      trigger_event,
      calculated_deadline,
      days_skipped,
      matters (
        id,
        title,
        case_number
      )
    `)
    .eq('firm_id', auth.firmId)
    .order('calculated_deadline', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCourtDeadline(formData: {
  matterId: string;
  title: string;
  triggerEvent: string;
  triggerDate: string;
  courtDaysCount: number;
}) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const firmId = auth.firmId;

  // Verify matter ownership
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', formData.matterId)
    .eq('firm_id', firmId)
    .single();

  if (matterError || !matter) {
    return { success: false, error: 'Access denied: Matter not found.' };
  }

  // 1. Calculate deadline using the court days utility skipping weekends & 2026 holidays
  const trigger = new Date(formData.triggerDate);
  const { calculatedDeadline, daysSkipped } = calculateCourtDeadline(
    trigger,
    formData.courtDaysCount,
    saPublicHolidays2026
  );

  // 2. Insert into matter_deadlines
  const { error } = await adminDb
    .from('matter_deadlines')
    .insert({
      firm_id: firmId,
      matter_id: formData.matterId,
      title: formData.title,
      trigger_event: `${formData.triggerEvent} on ${formData.triggerDate}`,
      calculated_deadline: calculatedDeadline.toISOString(),
      days_skipped: daysSkipped,
      description: `Calculated from ${formData.courtDaysCount} court days rules. Skipped ${daysSkipped} weekend/public holidays.`,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // 3. Create implicit matter timeline event
  await adminDb.from('matter_events').insert({
    firm_id: firmId,
    matter_id: formData.matterId,
    title: `Deadline Scheduled: ${formData.title}`,
    description: `Filing due by ${calculatedDeadline.toLocaleDateString('en-ZA')} at 17:00 SAST.`,
    event_date: calculatedDeadline.toISOString(),
  });

  revalidatePath('/dashboard/deadlines');
  return { success: true };
}

export async function getMatterDeadlines(matterId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify matter ownership
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', matterId)
    .eq('firm_id', auth.firmId)
    .single();

  if (matterError || !matter) {
    throw new Error('Access denied: Matter not found.');
  }

  const { data, error } = await adminDb
    .from('matter_deadlines')
    .select('*')
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('calculated_deadline', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function markDeadlineComplete(deadlineId: string, isCompleted: boolean) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify deadline ownership
  const { data: deadline, error: deadlineError } = await adminDb
    .from('matter_deadlines')
    .select('id, matter_id, title')
    .eq('id', deadlineId)
    .eq('firm_id', auth.firmId)
    .single();

  if (deadlineError || !deadline) {
    return { success: false, error: 'Access denied: Deadline not found.' };
  }

  const { error } = await adminDb
    .from('matter_deadlines')
    .update({ is_completed: isCompleted })
    .eq('id', deadlineId)
    .eq('firm_id', auth.firmId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: deadline.matter_id,
    title: isCompleted ? `Deadline Completed: ${deadline.title}` : `Deadline Reopened: ${deadline.title}`,
    description: isCompleted ? `The court deadline was marked completed.` : `The court deadline was reopened.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId,
  });

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: isCompleted ? 'COMPLETE_DEADLINE' : 'REOPEN_DEADLINE',
    resource_type: 'deadline',
    resource_id: deadlineId,
    changes: { is_completed: isCompleted },
  });

  revalidatePath(`/dashboard/matters/${deadline.matter_id}`);
  revalidatePath('/dashboard/deadlines');
  return { success: true };
}

export async function escalateOverdueDeadline(deadlineId: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // 1. Verify deadline ownership
  const { data: deadline, error: deadlineError } = await adminDb
    .from('matter_deadlines')
    .select('id, title, matter_id, calculated_deadline, is_completed')
    .eq('id', deadlineId)
    .eq('firm_id', auth.firmId)
    .single();

  if (deadlineError || !deadline) {
    return { success: false, error: 'Access denied: Deadline not found.' };
  }

  if (deadline.is_completed) {
    return { success: false, error: 'Deadline is already completed.' };
  }

  // 2. Fetch all Partners in the firm
  const { data: partners, error: partnersError } = await adminDb
    .from('firm_members')
    .select('id')
    .eq('firm_id', auth.firmId)
    .eq('role', 'Partner');

  if (partnersError) {
    return { success: false, error: partnersError.message };
  }

  // 3. Create a notification for each Partner
  if (partners && partners.length > 0) {
    const notificationsToInsert = partners.map((p: any) => ({
      firm_id: auth.firmId,
      recipient_id: p.id,
      title: `URGENT Escalation: Overdue Deadline`,
      message: `The deadline "${deadline.title}" is overdue. Calculated deadline was ${new Date(deadline.calculated_deadline).toLocaleDateString('en-ZA')}.`,
      is_read: false,
      link_url: `/dashboard/matters/${deadline.matter_id}`,
    }));

    const { error: notifError } = await adminDb
      .from('notifications')
      .insert(notificationsToInsert);

    if (notifError) {
      return { success: false, error: notifError.message };
    }
  }

  // 4. Create timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: deadline.matter_id,
    title: `URGENT ESCALATION: Overdue Deadline`,
    description: `Deadline "${deadline.title}" has been escalated to Partner level.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId,
  });

  // 5. Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'ESCALATE_DEADLINE',
    resource_type: 'deadline',
    resource_id: deadlineId,
    changes: { title: deadline.title },
  });

  revalidatePath(`/dashboard/matters/${deadline.matter_id}`);
  return { success: true };
}

