'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition } from 'react';
import { getMattersList, createMatter } from '@/server/actions/matter.actions';
import { getClientsList } from '@/server/actions/client.actions';
import { FileText, Plus, AlertCircle, Scale, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export default function MattersPage() {
  const [matters, setMatters] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const mattersList = await getMattersList();
      setMatters(mattersList);
      const clientsList = await getClientsList();
      setClients(clientsList);
      if (clientsList.length > 0) setClientId(clientsList[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load case files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMatter = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!clientId) {
      setError('Please select a client before generating a case file.');
      return;
    }

    startTransition(async () => {
      const res = await createMatter({
        client_id: clientId,
        title,
        description,
        case_number: caseNumber || undefined,
        court_jurisdiction: jurisdiction,
      });

      if (res.success) {
        setSuccess('Legal Matter case file successfully created.');
        setShowAddForm(false);
        setTitle('');
        setCaseNumber('');
        setJurisdiction('');
        setDescription('');
        loadData();
      } else {
        setError(res.error || 'Failed to initialize case file.');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Matters Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Case files registry with automated RLS boundaries and LPC privilege quarantines
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
          <span>New Case File</span>
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

      {/* Add Matter Modal Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Scale className="text-gold-500 h-5 w-5" /> Initialize New Matter File
          </h2>
          <form onSubmit={handleCreateMatter} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Link Client Record
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'Corporate' ? c.company_name : `${c.first_name} ${c.last_name}`} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Case Title / Naming</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mabuza v Minister of Safety"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Court Reference Case Number</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. 2026/10293 (Optional)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Court / Jurisdiction</label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. High Court, Gauteng Local Division"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Brief Matter Summary</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Creating Case File...' : 'Create Case File'}
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
          <p className="text-sm text-slate-400">Loading case files...</p>
        </div>
      ) : matters.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No case files active</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Begin by onboarding your first litigation or consultation matter case file.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matters.map((matter) => (
            <div key={matter.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-gold-500/40 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded">
                    {matter.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {matter.case_number || 'No Case Ref'}
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight line-clamp-1">{matter.title}</h3>
                <div className="text-sm space-y-1">
                  <p className="text-slate-400">Client: <span className="text-slate-600 dark:text-slate-200 font-medium">{matter.client_name}</span></p>
                  <p className="text-slate-400 text-xs">Court: {matter.court_jurisdiction}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
                <Link
                  href={`/dashboard/matters/${matter.id}`}
                  className="text-xs font-bold text-gold-500 hover:text-gold-600 flex items-center gap-1"
                >
                  <FolderOpen className="h-4 w-4" /> Open File
                </Link>
                <span className="text-[10px] text-slate-400">Created: {new Date(matter.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
