'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const VAT_RATE = 0.15; // South African Standard VAT rate (15%)

export async function getInvoicesList() {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_excluding_vat,
      vat_amount,
      total_including_vat,
      status,
      due_date,
      created_at,
      clients (
        first_name,
        last_name,
        company_name
      ),
      matters (
        title
      )
    `)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((inv: any) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    exVat: inv.total_excluding_vat,
    vat: inv.vat_amount,
    incVat: inv.total_including_vat,
    status: inv.status,
    due_date: inv.due_date,
    created_at: inv.created_at,
    clientName: inv.clients?.company_name || `${inv.clients?.first_name} ${inv.clients?.last_name}`,
    matterTitle: inv.matters?.title,
  }));
}

export async function getUnbilledEntriesForMatter(matterId: string) {
  const { firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  const { data, error } = await adminDb
    .from('time_entries')
    .select('*')
    .eq('matter_id', matterId)
    .eq('firm_id', firmId)
    .eq('is_billed', false);

  if (error) throw new Error(error.message);
  return data;
}

export async function generateTaxInvoice(matterId: string) {
  const { userId, firmId } = await requireAuthUser();
  const adminDb = createAdminClient();

  // 1. Fetch matter & client context
  const { data: matter } = await adminDb
    .from('matters')
    .select('client_id, title')
    .eq('id', matterId)
    .eq('firm_id', firmId)
    .single();

  if (!matter) return { success: false, error: 'Matter case folder not found.' };

  // 2. Fetch unbilled time entries
  const { data: entries } = await adminDb
    .from('time_entries')
    .select('*')
    .eq('matter_id', matterId)
    .eq('firm_id', firmId)
    .eq('is_billed', false);

  if (!entries || entries.length === 0) {
    return { success: false, error: 'No unbilled time entries found on this case folder.' };
  }

  // 3. Perform VAT math and totals
  let totalExVat = 0;
  entries.forEach((e: any) => {
    const fee = (e.duration_minutes / 60) * e.hourly_rate_zar;
    totalExVat += fee;
  });

  const vatAmt = totalExVat * VAT_RATE;
  const totalIncVat = totalExVat + vatAmt;

  const invNumber = `INV-${Date.now().toString().slice(-8)}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days due standard

  // 4. Create Invoice Header
  const { data: invoice, error: invErr } = await adminDb
    .from('invoices')
    .insert({
      firm_id: firmId,
      client_id: matter.client_id,
      matter_id: matterId,
      invoice_number: invNumber,
      total_excluding_vat: totalExVat,
      vat_amount: vatAmt,
      total_including_vat: totalIncVat,
      status: 'Issued',
      due_date: dueDate.toISOString().split('T')[0],
    })
    .select('id')
    .single();

  if (invErr) return { success: false, error: invErr.message };

  // 5. Create Line Items and flag time entries as billed
  for (const e of entries) {
    const fee = (e.duration_minutes / 60) * e.hourly_rate_zar;
    const lVat = fee * VAT_RATE;
    const lTotal = fee + lVat;

    await adminDb.from('invoice_line_items').insert({
      firm_id: firmId,
      invoice_id: invoice.id,
      time_entry_id: e.id,
      description: e.description,
      amount_excluding_vat: fee,
      vat_amount: lVat,
      amount_including_vat: lTotal,
    });

    await adminDb
      .from('time_entries')
      .update({ is_billed: true })
      .eq('id', e.id);
  }

  // 6. Record audit log
  await adminDb.from('audit_logs').insert({
    firm_id: firmId,
    user_id: userId,
    action: 'GENERATE_TAX_INVOICE',
    resource_type: 'invoice',
    resource_id: invoice.id,
    changes: { invoice_number: invNumber, total: totalIncVat },
  });

  revalidatePath('/dashboard/billing');
  return { success: true };
}
