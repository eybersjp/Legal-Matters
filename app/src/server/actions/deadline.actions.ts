'use server';

import { createClient } from '@/lib/supabase/server';
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
  const supabase = createClient();
  const { data, error } = await supabase
    .from('matters')
    .select('id, title, case_number');

  if (error) throw new Error(error.message);
  return data;
}

export async function getDeadlinesList() {
  const supabase = createClient();
  const { data, error } = await supabase
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthenticated.' };

  const firmId = user.user_metadata?.firm_id;

  // 1. Calculate deadline using the court days utility skipping weekends & 2026 holidays
  const trigger = new Date(formData.triggerDate);
  const { calculatedDeadline, daysSkipped } = calculateCourtDeadline(
    trigger,
    formData.courtDaysCount,
    saPublicHolidays2026
  );

  // 2. Insert into matter_deadlines
  const { error } = await supabase
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
  await supabase.from('matter_events').insert({
    firm_id: firmId,
    matter_id: formData.matterId,
    title: `Deadline Scheduled: ${formData.title}`,
    description: `Filing due by ${calculatedDeadline.toLocaleDateString('en-ZA')} at 17:00 SAST.`,
    event_date: calculatedDeadline.toISOString(),
  });

  revalidatePath('/dashboard/deadlines');
  return { success: true };
}
