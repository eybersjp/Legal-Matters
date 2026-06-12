'use client';

import { useState } from 'react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setIsPending(true);

    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      if (email === 'fail@example.com' || password === 'wrong') {
        setError('Invalid credentials');
        setIsPending(false);
        return;
      }

      const { loginUser } = await import('@/server/actions/auth.actions');
      const res = await loginUser({ email });
      if (res.success) {
        setIsPending(false);
        router.refresh();
        router.replace('/dashboard');
      } else {
        setError(res.error || 'Mock authentication failed.');
        setIsPending(false);
      }
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.error) {
        const message = result.error.longMessage || result.error.message || 'Authentication failed.';
        setError(message);
        return;
      }

      if (signIn.status === 'complete') {
        await setActive({ session: signIn.createdSessionId });
        router.refresh();
        router.replace('/dashboard');
      } else {
        // Handle multi-step sign-in flows (e.g., MFA)
        setError('Additional authentication steps are required.');
      }
    } catch (err: any) {
      const message = err.errors?.[0]?.longMessage
        || err.errors?.[0]?.message
        || 'Authentication failed. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-900/10 blur-[120px]" />

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-8 rounded-xl shadow-2xl z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            LEGAL <span className="text-gold-400">MATTERS</span>
          </h1>
          <p className="text-sm text-slate-400">
            South African Legal Practice Management Portal
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition"
              required
              disabled={isPending}
              placeholder="partner@lawfirm.co.za"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
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

          <button
            type="submit"
            className="w-full bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-3 px-4 rounded-lg tracking-wide transition flex items-center justify-center disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-700/50 pt-6">
          Need a firm account?{' '}
          <Link href="/register" className="text-gold-400 hover:underline">
            Register Firm Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
