'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CreateMatterSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

export async function getMattersList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  // Retrieves list utilizing RLS (Partners/Associates view all; Ext Counsel views assigned)
  const { data, error } = await supabase
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

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthenticated.' };

  const firmId = user.user_metadata?.firm_id;

  const { data, error } = await supabase
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
  const adminDb = createAdminClient();
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: user.id,
    action: 'CREATE_MATTER',
    resource_type: 'matter',
    resource_id: data.id,
    changes: parsed.data,
  });

  // Assign Creator to Matter Team implicitly
  await adminDb.from('matter_team_members').insert({
    firm_id: firmId,
    matter_id: data.id,
    member_id: user.id,
  });

  revalidatePath('/dashboard/matters');
  return { success: true, id: data.id };
}

export async function getMatterDetails(matterId: string) {
  const supabase = createClient();
  
  const { data: matter, error: matErr } = await supabase
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
    .single();

  if (matErr) throw new Error(matErr.message);

  const { data: team, error: teamErr } = await supabase
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
