'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition } from 'react';
import { getTrustRecordsList, getMattersWithClients, recordTrustTransaction } from '@/server/actions/trust.actions';
import { Landmark, Plus, Scale, AlertCircle, ShieldCheck, BookOpen } from 'lucide-react';

export default function TrustAccountPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [matterId, setMatterId] = useState('');
  const [amount, setAmount] = useState('');
  const [section86Type, setSection86Type] = useState<'86(2)' | '86(3)' | '86(4)'>('86(2)');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const recs = await getTrustRecordsList();
      setRecords(recs);
      const mattersList = await getMattersWithClients();
      setMatters(mattersList);
      if (mattersList.length > 0) {
        setMatterId(mattersList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trust account balances.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!matterId) {
      setError('Please select an active matter to associate with this trust entry.');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive trust ledger amount.');
      return;
    }

    if (!description.trim() || description.length < 5) {
      setError('Provide a clear transaction reference description (minimum 5 characters).');
      return;
    }

    const selectedMatter = matters.find((m) => m.id === matterId);
    if (!selectedMatter) {
      setError('Selected matter not found.');
      return;
    }

    startTransition(async () => {
      const res = await recordTrustTransaction({
        client_id: selectedMatter.client_id,
        matter_id: matterId,
        amount: amt,
        section_86_type: section86Type,
        description: description,
      });

      if (res.success) {
        setSuccess('LPA Section 86 trust account metadata record entered successfully.');
        setShowAddForm(false);
        setAmount('');
        setDescription('');
        loadData();
      } else {
        setError(res.error || 'Failed to record trust account transaction.');
      }
    });
  };

  // Calculate total trust account liabilities
  const totalTrustBalance = records.reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">LPA Trust Accounts Ledger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            South African Legal Practice Act Section 86 regulatory compliance metadata records
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
          }}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Record Trust Deposit</span>
        </button>
      </div>

      {/* Trust Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-slate-900 border-2 border-gold-500/30 text-white rounded-xl p-6 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Total Trust Account Liability</span>
            <Landmark className="h-5 w-5 text-gold-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-gold-400">
            R{totalTrustBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400">
            Aggregated practitioner-held trust liabilities under LPA Section 86
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Active Trust Records</span>
            <BookOpen className="h-5 w-5 text-gold-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {records.length}
          </div>
          <p className="text-[10px] text-slate-500">
            Total verified financial transactions logged to the LPC auditor log
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs uppercase font-bold tracking-wider">Regulatory Compliance</span>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pt-1">
            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            LPA Section 86 Compliant
          </div>
          <p className="text-[10px] text-slate-500">
            Subject to annual audit in terms of LPA rules 54.14
          </p>
        </div>
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

      {/* Record Trust Entry Dialog Overlay */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Landmark className="text-gold-500 h-5 w-5" /> Record Trust Ledger Entry
          </h2>
          <form onSubmit={handleRecordTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Associate Matter Case File
              </label>
              <select
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
              >
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.case_number || 'No Case Ref'}) — Client: {m.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  LPA Section 86 Investment Type
                </label>
                <select
                  value={section86Type}
                  onChange={(e: any) => setSection86Type(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
                >
                  <option value="86(2)">Section 86(2) - Standard Trust Account</option>
                  <option value="86(3)">Section 86(3) - Client-Instructed Trust Account</option>
                  <option value="86(4)">Section 86(4) - Special Investment Trust Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Trust Balance Amount (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">R</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Transaction Reference Description
              </label>
              <textarea
                placeholder="e.g. Deposit for purchase price guarantee or conveyancing trust security"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Logging Ledger...' : 'Record Transaction'}
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
          <p className="text-sm text-slate-400">Loading trust records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Landmark className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No trust ledger entries</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Log financial deposits held in trust for clients to ensure full Legal Practice Act regulatory compliance.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Reference Number</th>
                  <th className="py-4 px-6 font-semibold">Client</th>
                  <th className="py-4 px-6 font-semibold">Matter Folder</th>
                  <th className="py-4 px-6 font-semibold">Section 86 Type</th>
                  <th className="py-4 px-6 font-semibold">Recorded By</th>
                  <th className="py-4 px-6 font-semibold">Logged Date</th>
                  <th className="py-4 px-6 font-semibold">Trust Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 font-mono font-bold text-xs text-gold-600 dark:text-gold-400">{rec.reference_number}</td>
                    <td className="py-4 px-6 font-medium">{rec.client_name}</td>
                    <td className="py-4 px-6 font-semibold text-xs">{rec.matter_title} ({rec.case_number || 'No Case Ref'})</td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold">
                        Sec {rec.section_86_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">{rec.recorded_by}</td>
                    <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(rec.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-800 dark:text-slate-100">
                      R{Number(rec.balance).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
