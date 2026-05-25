'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition } from 'react';
import { getDeadlinesList, getMattersForDropdown, createCourtDeadline } from '@/server/actions/deadline.actions';
import { Calendar, Plus, Scale, AlertCircle } from 'lucide-react';

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [matterId, setMatterId] = useState('');
  const [title, setTitle] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('Service of Notice');
  const [triggerDate, setTriggerDate] = useState('');
  const [daysCount, setDaysCount] = useState(10);

  const loadData = async () => {
    try {
      const list = await getDeadlinesList();
      setDeadlines(list);
      const mattersList = await getMattersForDropdown();
      setMatters(mattersList);
      if (mattersList.length > 0) setMatterId(mattersList[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load court deadlines.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!matterId) {
      setError('Please select an active matter to link this deadline.');
      return;
    }

    startTransition(async () => {
      const res = await createCourtDeadline({
        matterId,
        title,
        triggerEvent,
        triggerDate,
        courtDaysCount: Number(daysCount),
      });

      if (res.success) {
        setSuccess('LPC Compliant Court Deadline calculated and recorded.');
        setShowAddForm(false);
        setTitle('');
        setTriggerDate('');
        loadData();
      } else {
        setError(res.error || 'Calculation failed.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Court Deadline Tracker</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automated Rules of Court day calculators (excluding weekends and South African Public Holidays)
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
          <span>Calculate Deadline</span>
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

      {/* Add / Calculate Pleading Deadline Dialog */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Scale className="text-gold-500 h-5 w-5" /> Calculate Court Day filing Limit
          </h2>
          <form onSubmit={handleCreateDeadline} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Active Legal Matter
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Filing Action Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. File Notice of Intent to Defend"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Trigger Event</label>
                <input
                  type="text"
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Trigger Action Date</label>
                <input
                  type="date"
                  value={triggerDate}
                  onChange={(e) => setTriggerDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Court Days Limit (Rules)</label>
                <input
                  type="number"
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Verifying Calendar Holidays...' : 'Calculate and Schedule'}
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
          <p className="text-sm text-slate-400">Syncing rules calendars...</p>
        </div>
      ) : deadlines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No deadlines tracked</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Enter litigation events to automatically calculate High Court and Magistrates Court dates.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Action Due</th>
                  <th className="py-4 px-6 font-semibold">Linked Matter</th>
                  <th className="py-4 px-6 font-semibold">Trigger Event</th>
                  <th className="py-4 px-6 font-semibold">Filing Due Date</th>
                  <th className="py-4 px-6 font-semibold">Holidays Skipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deadlines.map((dl) => {
                  const deadlineDate = new Date(dl.calculated_deadline);
                  const isUrgent = (deadlineDate.getTime() - Date.now()) < 5 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={dl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6 font-semibold">{dl.title}</td>
                      <td className="py-4 px-6 font-medium text-xs">
                        {dl.matters?.title} ({dl.matters?.case_number || 'No Case Ref'})
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">{dl.trigger_event}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                          isUrgent ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                        }`}>
                          {deadlineDate.toLocaleDateString('en-ZA')} at 17:00
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">{dl.days_skipped} court days</td>
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
