'use client';

import { useState, useTransition } from 'react';
import { registerFirm } from '@/server/actions/auth.actions';
import Link from 'next/link';

export default function RegisterPage() {
  const [firmName, setFirmName] = useState('');
  const [lpcNumber, setLpcNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await registerFirm({
        email,
        password,
        firstName,
        lastName,
        firmName,
        lpcNumber,
        role: 'Partner',
      });
      if (res && !res.success) {
        setError(res.error || 'Registration failed. LPC Practising Number might already be linked.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-900/10 blur-[120px]" />

      <div className="w-full max-w-xl bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-8 rounded-xl shadow-2xl z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            FIRM <span className="text-gold-400">ONBOARDING</span>
          </h1>
          <p className="text-sm text-slate-400">
            Register your South African Legal Practice & Admin Profile
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Firm Registered Name
              </label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="e.g. Mabuza Attorneys Inc."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                LPC Practice Number
              </label>
              <input
                type="text"
                value={lpcNumber}
                onChange={(e) => setLpcNumber(e.target.value)}
                placeholder="e.g. L-12345/26"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Partner First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Partner Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Administrative Email (Login ID)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Master Password (min 12 chars)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-3 px-4 rounded-lg tracking-wide transition flex items-center justify-center disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? 'Registering Legal Practice...' : 'Finalize Practice Registration'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-700/50 pt-6">
          Already registered?{' '}
          <Link href="/login" className="text-gold-400 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
