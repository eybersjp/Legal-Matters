'use client';

import { useEffect, useState, useTransition } from 'react';
import { getFirmProfile, updateFirmDetails } from '@/server/actions/firm.actions';
import { Scale, Users, Award } from 'lucide-react';

export default function FirmManagementPage() {
  const [profile, setProfile] = useState<any>(null);
  const [firmName, setFirmName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFirmProfile();
        setProfile(data);
        setFirmName(data.firm.name);
        setVatNumber(data.firm.vat_number || '');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch firm profile.');
      }
    }
    loadData();
  }, []);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateFirmDetails({ name: firmName, vatNumber: vatNumber || null });
      if (res.success) {
        setSuccess('Firm details successfully updated.');
      } else {
        setError(res.error || 'Failed to update details.');
      }
    });
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Loading firm profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Practice Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your registered legal practice details and team members
        </p>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Edit Details Card */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Award className="text-gold-500 h-6 w-6" />
            <h2 className="text-lg font-bold">Registration Data</h2>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Practice Registered Name
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                LPC Practice Number
              </label>
              <input
                type="text"
                value={profile.firm.lpc_registration_number}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition"
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-2.5 px-4 rounded-lg text-sm transition disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Update Details'}
            </button>
          </form>
        </div>

        {/* Right Side: Members Directory Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Users className="text-gold-500 h-6 w-6" />
            <h2 className="text-lg font-bold">Staff Registry</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">LPC Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profile.members.map((member: any) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-medium">
                      {member.user_profiles?.[0]?.first_name} {member.user_profiles?.[0]?.last_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 dark:bg-slate-800 text-xs font-bold px-2.5 py-1 rounded">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`h-2.5 w-2.5 rounded-full inline-block mr-2 ${member.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-xs">{member.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <Scale className="h-3 w-3" /> Certified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
