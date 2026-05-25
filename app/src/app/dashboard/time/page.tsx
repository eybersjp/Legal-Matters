'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition } from 'react';
import { getTimeEntriesList, recordTimeEntry } from '@/server/actions/time.actions';
import { getMattersForDropdown } from '@/server/actions/deadline.actions';
import { Clock, Plus, Scale, AlertCircle, ShieldCheck } from 'lucide-react';

export default function TimeEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [matterId, setMatterId] = useState('');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [rate, setRate] = useState(1500); // R1500 per hour default
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const list = await getTimeEntriesList();
      setEntries(list);
      const mattersList = await getMattersForDropdown();
      setMatters(mattersList);
      if (mattersList.length > 0) setMatterId(mattersList[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load time entries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordTime = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const totalMinutes = (hours * 60) + minutes;
    if (totalMinutes <= 0) {
      setError('Billable duration must be greater than zero minutes.');
      return;
    }

    startTransition(async () => {
      const res = await recordTimeEntry({
        matter_id: matterId,
        duration_minutes: totalMinutes,
        hourly_rate_zar: Number(rate),
        description,
      });

      if (res.success) {
        setSuccess('Time entry successfully logged to case file.');
        setShowAddForm(false);
        setHours(1);
        setMinutes(0);
        setDescription('');
        loadData();
      } else {
        setError(res.error || 'Failed to record entry.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Time Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log billable hours and legal consultations linked directly to active case folders
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
          <span>Record Time</span>
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

      {/* Record Time Dialog overlay */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Clock className="text-gold-500 h-5 w-5" /> Record Billable Consultation
          </h2>
          <form onSubmit={handleRecordTime} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Linked Case File (Matter)
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hours</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Minutes</label>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  min={0}
                  max={59}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hourly Rate (ZAR)</label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  min={0}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Task Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Drafting client repling affidavit, consultations with external counsel..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Saving Entry...' : 'Save Time Entry'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-slate-350 dark:border-slate-800 px-4 py-2 rounded-lg text-sm"
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
          <p className="text-sm text-slate-400">Loading billable logs...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No time entries recorded</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Log your legal consultations, pleadings drafting, or court appearances to generate tax invoices.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Date</th>
                  <th className="py-4 px-6 font-semibold">Case / Matter</th>
                  <th className="py-4 px-6 font-semibold">Fee Earner</th>
                  <th className="py-4 px-6 font-semibold">Filing / Work Details</th>
                  <th className="py-4 px-6 font-semibold">Billable (ZAR)</th>
                  <th className="py-4 px-6 font-semibold">Billing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((entry) => {
                  const hoursNum = Math.floor(entry.duration / 60);
                  const minsNum = entry.duration % 60;
                  const calculatedFee = (entry.duration / 60) * entry.rate;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6 text-xs font-mono text-slate-400">
                        {new Date(entry.created_at).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="py-4 px-6 font-semibold text-xs">
                        {entry.matter_title} <span className="block text-[10px] text-slate-400 font-mono">{entry.case_number || 'No Case Ref'}</span>
                      </td>
                      <td className="py-4 px-6 font-medium">{entry.fee_earner}</td>
                      <td className="py-4 px-6">
                        <p className="line-clamp-2 max-w-sm text-xs">{entry.description}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{hoursNum}h {minsNum}m @ R{entry.rate}/hr</span>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-600 dark:text-gold-400">
                        R{calculatedFee.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        {entry.isBilled ? (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-bold flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-3 w-3" /> Invoiced
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-semibold flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" /> Unbilled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
