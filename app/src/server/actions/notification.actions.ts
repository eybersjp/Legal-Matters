'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getNotificationsList() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('notifications')
    .select('*')
    .eq('recipient_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error.message);
    return [];
  }

  return data || [];
}

export async function markNotificationAsRead(id: string) {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { error } = await adminDb
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('recipient_id', auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  const { error } = await adminDb
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
