'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { CreateTaskSchema } from '@/schemas';
import { revalidatePath } from 'next/cache';

const VALID_STATUSES = ['Pending', 'InProgress', 'Completed', 'Overdue'];

export async function getMatterTasks(matterId: string) {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify matter ownership
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', matterId)
    .eq('firm_id', firmId)
    .single();

  if (matterError || !matter) {
    throw new Error('Access denied: Matter not found.');
  }

  const { data: tasks, error: tasksError } = await adminDb
    .from('matter_tasks')
    .select(`
      id,
      matter_id,
      title,
      description,
      status,
      assigned_to,
      due_date,
      created_at,
      firm_members (
        id,
        user_profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('matter_id', matterId)
    .eq('firm_id', firmId)
    .order('due_date', { ascending: true });

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  return tasks.map((t: any) => ({
    id: t.id,
    matterId: t.matter_id,
    title: t.title,
    description: t.description,
    status: t.status,
    assignedTo: t.assigned_to,
    dueDate: t.due_date,
    createdAt: t.created_at,
    assigneeName: t.firm_members?.[0]?.user_profiles?.[0]
      ? `${t.firm_members[0].user_profiles[0].first_name} ${t.firm_members[0].user_profiles[0].last_name}`
      : 'Unassigned',
  }));
}

export async function createMatterTask(formData: unknown) {
  const parsed = CreateTaskSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify matter ownership
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', parsed.data.matter_id)
    .eq('firm_id', firmId)
    .single();

  if (matterError || !matter) {
    return { success: false, error: 'Access denied: Matter not found.' };
  }

  // Verify assignee ownership (if assigned)
  if (parsed.data.assigned_to) {
    const { data: member, error: memberError } = await adminDb
      .from('firm_members')
      .select('id')
      .eq('id', parsed.data.assigned_to)
      .eq('firm_id', firmId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Access denied: Assigned member not found in your firm.' };
    }
  }

  const { data: task, error: insertError } = await adminDb
    .from('matter_tasks')
    .insert({
      firm_id: firmId,
      matter_id: parsed.data.matter_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: 'Pending',
      assigned_to: parsed.data.assigned_to || null,
      due_date: new Date(parsed.data.due_date).toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !task) {
    return { success: false, error: insertError?.message || 'Failed to create task.' };
  }

  // Timeline Event
  await adminDb.from('matter_events').insert({
    firm_id: firmId,
    matter_id: parsed.data.matter_id,
    title: `Task Scheduled: ${parsed.data.title}`,
    description: `Task created and status initialized as Pending.`,
    event_date: new Date().toISOString(),
    created_by: userId,
  });

  // Audit Log
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'CREATE_TASK',
    resource_type: 'task',
    resource_id: task.id,
    changes: parsed.data,
  });

  revalidatePath(`/dashboard/matters/${parsed.data.matter_id}`);
  return { success: true, id: task.id };
}

export async function updateTaskStatus(taskId: string, status: string) {
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: 'Invalid task status value.' };
  }

  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify task ownership
  const { data: task, error: taskError } = await adminDb
    .from('matter_tasks')
    .select('id, title, matter_id, status')
    .eq('id', taskId)
    .eq('firm_id', firmId)
    .single();

  if (taskError || !task) {
    return { success: false, error: 'Access denied: Task not found.' };
  }

  const { error: updateError } = await adminDb
    .from('matter_tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('firm_id', firmId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Timeline Event
  await adminDb.from('matter_events').insert({
    firm_id: firmId,
    matter_id: task.matter_id,
    title: `Task Updated: ${task.title}`,
    description: `Status changed from ${task.status} to ${status}.`,
    event_date: new Date().toISOString(),
    created_by: userId,
  });

  // Audit Log
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'UPDATE_TASK_STATUS',
    resource_type: 'task',
    resource_id: taskId,
    changes: { from: task.status, to: status },
  });

  revalidatePath(`/dashboard/matters/${task.matter_id}`);
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify task ownership
  const { data: task, error: taskError } = await adminDb
    .from('matter_tasks')
    .select('id, title, matter_id')
    .eq('id', taskId)
    .eq('firm_id', firmId)
    .single();

  if (taskError || !task) {
    return { success: false, error: 'Access denied: Task not found.' };
  }

  const { error: deleteError } = await adminDb
    .from('matter_tasks')
    .delete()
    .eq('id', taskId)
    .eq('firm_id', firmId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Timeline Event
  await adminDb.from('matter_events').insert({
    firm_id: firmId,
    matter_id: task.matter_id,
    title: `Task Deleted: ${task.title}`,
    description: `Task was deleted from the case folder.`,
    event_date: new Date().toISOString(),
    created_by: userId,
  });

  // Audit Log
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'DELETE_TASK',
    resource_type: 'task',
    resource_id: taskId,
    changes: { title: task.title },
  });

  revalidatePath(`/dashboard/matters/${task.matter_id}`);
  return { success: true };
}
