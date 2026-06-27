'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Creates firm, firm_members, and user_profiles records after Clerk sign-up.
 * Called from the registration page after Clerk user creation succeeds.
 */
export async function registerFirm(formData: {
  clerkUserId: string;
  email: string;
  firmName: string;
  lpcNumber: string;
  firstName: string;
  lastName: string;
  role?: string;
}) {
  const { clerkUserId, email, firmName, lpcNumber, firstName, lastName, role } = formData;
  const adminDb = createAdminClient();

  try {
    // 1. Create Firm Record
    const { data: firm, error: firmErr } = await adminDb
      .from('firms')
      .insert({
        name: firmName,
        lpc_registration_number: lpcNumber,
      })
      .select('id')
      .single();

    if (firmErr) {
      console.error('Failed to create firm:', firmErr);
      return { success: false, error: 'Failed to create firm account. LPC number may already be registered.' };
    }

    // 2. Create firm_members record
    const { error: memberErr } = await adminDb.from('firm_members').insert({
      id: clerkUserId,
      firm_id: firm.id,
      role: role || 'Partner',
      is_active: true,
    });

    if (memberErr) {
      console.error('Failed to create firm member:', memberErr);
      // Teardown firm record
      await adminDb.from('firms').delete().eq('id', firm.id);
      return { success: false, error: 'Failed to link user to firm workspace.' };
    }

    // 3. Create user_profiles record
    const { error: profileErr } = await adminDb.from('user_profiles').insert({
      member_id: clerkUserId,
      first_name: firstName,
      last_name: lastName,
      phone_number: '+27830000000', // default E.164
    });

    if (profileErr) {
      console.error('Failed to create user profile:', profileErr);
      // Teardown
      await adminDb.from('firm_members').delete().eq('id', clerkUserId);
      await adminDb.from('firms').delete().eq('id', firm.id);
      return { success: false, error: 'Failed to create user profile.' };
    }

    // 4. Log audit
    await adminDb.from('audit_logs').insert({
      firm_id: firm.id,
      user_id: clerkUserId,
      action: 'FIRM_ONBOARD',
      resource_type: 'firm',
      resource_id: firm.id,
      changes: { firm_name: firmName, admin_email: email },
    });

    return { success: true };
  } catch (err) {
    console.error('Firm registration error:', err);
    return { success: false, error: 'An unexpected error occurred during registration.' };
  }
}

/**
 * Logs out the current user by redirecting to sign-out.
 * Clerk handles the session destruction client-side via useClerk().signOut().
 */
export async function logoutUser() {
  redirect('/');
}

import { cookies } from 'next/headers';

/**
 * Safe server-only action to handle mock/test authentication.
 * Active only when E2E_TEST_MODE is true and NODE_ENV is not production.
 */
export async function tryTestLogin(formData: { email: string; password?: string }) {
  const isTestMode = process.env.E2E_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
  if (!isTestMode) {
    return { success: false, isTestMode: false };
  }

  const { email, password } = formData;
  if (email === 'fail@example.com' || password === 'wrong') {
    return { success: false, isTestMode: true, error: 'Invalid credentials' };
  }

  const cookieStore = await cookies();
  cookieStore.set('mock-authenticated', 'true', { path: '/' });
  if (email === 'nofirm@example.com') {
    cookieStore.set('mock-user-id', 'mock-user-no-firm-uuid', { path: '/' });
  } else {
    cookieStore.set('mock-user-id', 'mock-user-uuid', { path: '/' });
  }
  return { success: true, isTestMode: true };
}

