'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition } from 'react';
import { getInvoicesList, generateTaxInvoice } from '@/server/actions/billing.actions';
import { getMattersForDropdown } from '@/server/actions/deadline.actions';
import { FileText, Plus, Scale, AlertCircle, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [matterId, setMatterId] = useState('');

  const loadData = async () => {
    try {
      const list = await getInvoicesList();
      setInvoices(list);
      const mattersList = await getMattersForDropdown();
      setMatters(mattersList);
      if (mattersList.length > 0) setMatterId(mattersList[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing ledgers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!matterId) {
      setError('Please select an active matter to compile billing.');
      return;
    }

    startTransition(async () => {
      const res = await generateTaxInvoice(matterId);
      if (res.success) {
        setSuccess('LPC & VAT Act Compliant Tax Invoice generated.');
        setShowAddForm(false);
        loadData();
      } else {
        setError(res.error || 'Failed to generate tax invoice.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Tax Invoices</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            South African VAT Act compliant invoice generators linking billable times to case folders
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
          }}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Compile Invoice</span>
        </button>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compile Invoice Dialog Overlay */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <FileSpreadsheet className="text-gold-500 h-5 w-5" /> Compile Matter Timesheets
          </h2>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Active Case Matter File
              </label>
              <select
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
              >
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.case_number || 'No Case Ref'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-450 mt-1">
                The platform will automatically gather all unbilled time entries logged to this case, calculate 15% VAT, and generate a secure sequential PDF invoice.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Calculating VAT...' : 'Generate Invoice'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-4">
          <Scale className="animate-spin text-gold-500 h-8 w-8" />
          <p className="text-sm text-slate-400">Loading tax invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No invoices generated</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Log time entries against cases first, then click Compile Invoice to generate billing records.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Invoice Number</th>
                  <th className="py-4 px-6 font-semibold">Client Name</th>
                  <th className="py-4 px-6 font-semibold">Matter Folder</th>
                  <th className="py-4 px-6 font-semibold">VAT Amount (15%)</th>
                  <th className="py-4 px-6 font-semibold">Total Inc. VAT</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 font-mono font-bold text-xs">{inv.invoice_number}</td>
                    <td className="py-4 px-6 font-medium">{inv.clientName}</td>
                    <td className="py-4 px-6 font-semibold text-xs">{inv.matterTitle}</td>
                    <td className="py-4 px-6 font-mono text-xs">
                      R{Number(inv.vat).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-600 dark:text-gold-400">
                      R{Number(inv.incVat).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-bold flex items-center gap-1 w-fit">
                        <ShieldCheck className="h-3 w-3" /> {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
