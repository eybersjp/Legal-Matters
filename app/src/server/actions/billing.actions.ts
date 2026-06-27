'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireAuthUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { CreateExpenseSchema, RecordPaymentSchema } from '@/schemas';

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

export async function getMatterExpenses(matterId: string) {
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
    .from('expenses')
    .select('*')
    .eq('matter_id', matterId)
    .eq('firm_id', auth.firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function recordExpense(formData: any) {
  const parsed = CreateExpenseSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify matter ownership
  const { data: matter, error: matterError } = await adminDb
    .from('matters')
    .select('id')
    .eq('id', parsed.data.matter_id)
    .eq('firm_id', auth.firmId)
    .single();

  if (matterError || !matter) {
    return { success: false, error: 'Access denied: Matter not found.' };
  }

  const { data: expense, error } = await adminDb
    .from('expenses')
    .insert({
      firm_id: auth.firmId,
      matter_id: parsed.data.matter_id,
      amount_zar: parsed.data.amount_zar,
      description: parsed.data.description,
      is_billed: false,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: parsed.data.matter_id,
    title: `Disbursement Recorded: ${parsed.data.description}`,
    description: `Expense of R${parsed.data.amount_zar.toFixed(2)} recorded.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId,
  });

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'RECORD_EXPENSE',
    resource_type: 'expense',
    resource_id: expense.id,
    changes: parsed.data,
  });

  revalidatePath(`/dashboard/matters/${parsed.data.matter_id}`);
  revalidatePath('/dashboard/billing');
  return { success: true };
}

export async function recordPayment(formData: any) {
  const parsed = RecordPaymentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const auth = await requireAuthUser();
  const adminDb = createAdminClient();

  // Verify invoice ownership
  const { data: invoice, error: invoiceError } = await adminDb
    .from('invoices')
    .select('id, total_including_vat, invoice_number, status, matter_id')
    .eq('id', parsed.data.invoice_id)
    .eq('firm_id', auth.firmId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Access denied: Invoice not found.' };
  }

  // Insert payment record
  const { data: payment, error: paymentError } = await adminDb
    .from('payments')
    .insert({
      firm_id: auth.firmId,
      invoice_id: parsed.data.invoice_id,
      amount_paid: parsed.data.amount_paid,
      payment_method: parsed.data.payment_method,
      transaction_reference: parsed.data.transaction_reference,
    })
    .select('id')
    .single();

  if (paymentError) {
    return { success: false, error: paymentError.message };
  }

  // Fetch sum of all payments for this invoice
  const { data: payments, error: paymentsError } = await adminDb
    .from('payments')
    .select('amount_paid')
    .eq('invoice_id', parsed.data.invoice_id);

  if (paymentsError) {
    return { success: false, error: paymentsError.message };
  }

  const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);

  // If total payments meet or exceed the invoice total, mark as Paid
  if (totalPaid >= Number(invoice.total_including_vat)) {
    const { error: updateError } = await adminDb
      .from('invoices')
      .update({ status: 'Paid' })
      .eq('id', parsed.data.invoice_id)
      .eq('firm_id', auth.firmId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  // Create timeline event
  await adminDb.from('matter_events').insert({
    firm_id: auth.firmId,
    matter_id: invoice.matter_id,
    title: `Payment Received: ${invoice.invoice_number}`,
    description: `Payment of R${parsed.data.amount_paid.toFixed(2)} received via ${parsed.data.payment_method}. Total paid: R${totalPaid.toFixed(2)} / R${Number(invoice.total_including_vat).toFixed(2)}.`,
    event_date: new Date().toISOString(),
    created_by: auth.userId,
  });

  // Create audit log
  await adminDb.from('audit_logs').insert({
    firm_id: auth.firmId,
    user_id: auth.userId,
    action: 'RECORD_PAYMENT',
    resource_type: 'payment',
    resource_id: payment.id,
    changes: {
      ...parsed.data,
      invoice_number: invoice.invoice_number,
      total_paid: totalPaid,
      invoice_total: invoice.total_including_vat,
    },
  });

  revalidatePath(`/dashboard/matters/${invoice.matter_id}`);
  revalidatePath('/dashboard/billing');
  return { success: true };
}

export async function getMatterInvoices(matterId: string) {
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
      created_at
    `)
    .eq('matter_id', matterId)
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
  }));
}

export async function getMatterPayments(matterId: string) {
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

  const { data, error } = await adminDb
    .from('payments')
    .select(`
      id,
      invoice_id,
      amount_paid,
      payment_method,
      transaction_reference,
      created_at,
      invoices!inner (
        id,
        invoice_number,
        matter_id
      )
    `)
    .eq('invoices.matter_id', matterId)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((pay: any) => ({
    id: pay.id,
    invoice_id: pay.invoice_id,
    invoice_number: pay.invoices?.invoice_number,
    amount_paid: pay.amount_paid,
    payment_method: pay.payment_method,
    transaction_reference: pay.transaction_reference,
    created_at: pay.created_at,
  }));
}
