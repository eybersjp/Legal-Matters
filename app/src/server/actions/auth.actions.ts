'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { LoginValidationSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function loginUser(formData: any) {
  console.log('Login attempt started');
  const parsed = LoginValidationSchema.safeParse(formData);
  if (!parsed.success) {
    console.log('Login failed: invalid form inputs');
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.log('Login failed:', error.message);
    return { success: false, error: error.message };
  }

  console.log('Login succeeded');

  // Verify Firm Workspace Membership to prevent silent post-auth redirect failures
  let hasFirmMembership = true;
  try {
    const adminDb = createAdminClient();
    if (adminDb && data.user) {
      const { data: member } = await adminDb
        .from('firm_members')
        .select('id, firm_id')
        .eq('id', data.user.id)
        .single();

      if (!member) {
        console.log('No firm membership found');
        hasFirmMembership = false;
      }
    }
  } catch (err) {
    console.error('Failed to verify firm membership registry:', err);
  }

  if (!hasFirmMembership) {
    return { success: false, error: 'Your account is active, but no firm workspace has been linked yet.' };
  }

  // Record Auth Audit Log - wrapped in try-catch so logging failures don't block critical login path
  try {
    const adminDb = createAdminClient();
    if (adminDb) {
      await adminDb.from('audit_logs').insert({
        firm_id: data.user?.user_metadata?.firm_id,
        user_id: data.user?.id,
        action: 'USER_LOGIN',
        resource_type: 'user',
        resource_id: data.user?.id,
        changes: { email: parsed.data.email },
      });
    }
  } catch (auditError) {
    console.error('Failed to record login audit log:', auditError);
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/portal', 'layout');
  
  const role = data.user?.user_metadata?.role;
  const redirectTo = role === 'Client' ? '/portal' : '/dashboard';

  console.log(role === 'Client' ? 'Redirecting to client portal' : 'Redirecting to dashboard');
  return { success: true, redirectTo };


}

export async function registerFirm(formData: any) {
  const supabase = createClient();
  const adminDb = createAdminClient();

  const { email, password, firstName, lastName, firmName, lpcNumber, role } = formData;

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
    return { success: false, error: 'Failed to create Firm account. LPC number may already be registered.' };
  }

  // 2. Sign Up User via Supabase Auth
  const { data: authUser, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firm_id: firm.id,
        role: role || 'Partner',
      },
    },
  });

  if (signUpErr) {
    // Teardown firm record if auth fails
    await adminDb.from('firms').delete().eq('id', firm.id);
    return { success: false, error: signUpErr.message };
  }

  const userId = authUser.user?.id;
  if (!userId) {
    return { success: false, error: 'Sign up failed to return user reference.' };
  }

  // 3. Create firm_members & user_profiles row
  await adminDb.from('firm_members').insert({
    id: userId,
    firm_id: firm.id,
    role: role || 'Partner',
    is_active: true,
  });

  await adminDb.from('user_profiles').insert({
    member_id: userId,
    first_name: firstName,
    last_name: lastName,
    phone_number: '+27830000000', // default E.164
  });

  // Log audit
  await adminDb.from('audit_logs').insert({
    firm_id: firm.id,
    user_id: userId,
    action: 'FIRM_ONBOARD',
    resource_type: 'firm',
    resource_id: firm.id,
    changes: { firm_name: firmName, admin_email: email },
  });

  return { success: true, redirectTo: '/login?registered=true' };
}

export async function logoutUser() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
