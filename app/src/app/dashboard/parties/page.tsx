'use client';

import { useEffect, useState, useTransition } from 'react';
import { getPartiesList, addParty } from '@/server/actions/party.actions';
import { ShieldCheck, Plus, AlertTriangle, ShieldAlert, Scale } from 'lucide-react';

export default function PartiesPage() {
  const [parties, setParties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [type, setType] = useState<'Individual' | 'Corporate'>('Individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saIdNumber, setSaIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const loadData = async () => {
    try {
      const list = await getPartiesList();
      setParties(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load third parties.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setConflictDetected(false);

    startTransition(async () => {
      const res = await addParty({
        type,
        first_name: type === 'Individual' ? firstName : undefined,
        last_name: type === 'Individual' ? lastName : undefined,
        company_name: type === 'Corporate' ? companyName : undefined,
        sa_id_number: saIdNumber || undefined,
        email: email || undefined,
        phone_number: phoneNumber || undefined,
      });

      if (res.success) {
        setSuccess('Third party successfully added to LPC compliance registry.');
        setShowAddForm(false);
        setFirstName('');
        setLastName('');
        setCompanyName('');
        setSaIdNumber('');
        setEmail('');
        setPhoneNumber('');
        loadData();
      } else {
        setError(res.error || 'Failed to register third party.');
        if (res.conflictDetected) {
          setConflictDetected(true);
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Third Parties Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registry of Defendants, Opposing Counsel, Advocates, and Witnesses
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setConflictDetected(false);
            setError(null);
          }}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Party</span>
        </button>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-lg text-sm flex items-start gap-3 border ${
          conflictDetected 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {conflictDetected ? <ShieldAlert className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <div>
            <h4 className="font-bold mb-1">{conflictDetected ? 'LPC Legal Conflict Block' : 'Error'}</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Add Party Form Overlay */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Scale className="text-gold-500 h-5 w-5" /> Onboard Third Party
          </h2>
          <form onSubmit={handleAddParty} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Entity Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500 transition"
              >
                <option value="Individual">Individual (Natural Person)</option>
                <option value="Corporate">Corporate / Organisation</option>
              </select>
            </div>

            {type === 'Individual' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">South African ID Number</label>
                <input
                  type="text"
                  value={saIdNumber}
                  onChange={(e) => setSaIdNumber(e.target.value)}
                  placeholder="Automated conflict check target"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +27821234567"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Verifying Conflict Moat...' : 'Register Party'}
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
          <p className="text-sm text-slate-400">Loading third-party registers...</p>
        </div>
      ) : parties.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Scale className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No third parties registered</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Register opposing parties, witnesses, or advocates to run automated conflict audits.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Party Name</th>
                  <th className="py-4 px-6 font-semibold">Entity Type</th>
                  <th className="py-4 px-6 font-semibold">SA ID Number</th>
                  <th className="py-4 px-6 font-semibold">Contact Email</th>
                  <th className="py-4 px-6 font-semibold">Conflict Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parties.map((party) => (
                  <tr key={party.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 font-medium">
                      {party.type === 'Corporate' 
                        ? party.company_name 
                        : `${party.first_name} ${party.last_name}`}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded">
                        {party.type}
                      </span>
                    </td>
                    <td className="py-4 px-6">{party.sa_id_number || 'N/A'}</td>
                    <td className="py-4 px-6">{party.email || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-semibold flex items-center gap-1 w-fit">
                        <ShieldCheck className="h-3 w-3" /> Clear
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
