'use server';

import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';

export interface AuthUser {
  userId: string;
  firmId: string;
  role: string;
}

/**
 * Gets the currently authenticated user's firm context.
 * Returns null if not authenticated or no firm membership found.
 * Must be called from Server Actions or Server Components.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const isMockAuth = cookieStore.get('mock-authenticated')?.value === 'true';
    if (!isMockAuth) return null;

    const mockUserId = cookieStore.get('mock-user-id')?.value || 'mock-user-uuid';
    const adminDb = createAdminClient();
    const { data: member } = await adminDb
      .from('firm_members')
      .select('id, firm_id, role')
      .eq('id', mockUserId)
      .single();

    if (!member) return null;

    return {
      userId: member.id,
      firmId: member.firm_id,
      role: member.role,
    };
  }

  const { userId } = await auth();
  if (!userId) return null;

  const adminDb = createAdminClient();
  const { data: member } = await adminDb
    .from('firm_members')
    .select('id, firm_id, role')
    .eq('id', userId)
    .single();

  if (!member) return null;

  return {
    userId: member.id,
    firmId: member.firm_id,
    role: member.role,
  };
}

/**
 * Requires an authenticated user. Throws if not authenticated or no firm membership.
 */
export async function requireAuthUser(): Promise<AuthUser> {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const isMockAuth = cookieStore.get('mock-authenticated')?.value === 'true';
    if (!isMockAuth) {
      throw new Error('Authentication required. Please sign in.');
    }

    const mockUserId = cookieStore.get('mock-user-id')?.value || 'mock-user-uuid';
    const adminDb = createAdminClient();
    const { data: member } = await adminDb
      .from('firm_members')
      .select('id, firm_id, role')
      .eq('id', mockUserId)
      .single();

    if (!member) {
      throw new Error('Your account is active, but no firm workspace has been linked yet (Account not linked to a firm workspace. Please contact your firm administrator).');
    }

    return {
      userId: member.id,
      firmId: member.firm_id,
      role: member.role,
    };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required. Please sign in.');
  }

  const adminDb = createAdminClient();
  const { data: member } = await adminDb
    .from('firm_members')
    .select('id, firm_id, role')
    .eq('id', userId)
    .single();

  if (!member) {
    throw new Error('Your account is active, but no firm workspace has been linked yet (Account not linked to a firm workspace. Please contact your firm administrator).');
  }

  return {
    userId: member.id,
    firmId: member.firm_id,
    role: member.role,
  };
}
