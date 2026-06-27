'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (signIn && signIn.status === 'complete') {
      console.log('Detected complete sign-in status. Finalizing...');
      signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl('/dashboard');
          if (url.startsWith('http')) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  }, [signIn?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setIsPending(true);

    try {
      const { tryTestLogin } = await import('@/server/actions/auth.actions');
      const testRes = await tryTestLogin({ email, password });
      
      if (testRes.isTestMode) {
        if (testRes.success) {
          setIsPending(false);
          router.refresh();
          router.replace('/dashboard');
        } else {
          setError(testRes.error || 'Mock authentication failed.');
          setIsPending(false);
        }
        return;
      }
    } catch (err) {
      console.warn('Test mode check failed:', err);
    }

    if (!signIn) {
      setError('Authentication helper is not loaded yet. Please try again.');
      setIsPending(false);
      return;
    }

    try {
      console.log('SIGNIN_STATUS_BEFORE:', signIn.status);

      const res = await signIn.create({
        identifier: email,
        password,
      });

      console.log('CREATE_RESULT_ERROR:', res?.error);

      if (res?.error) {
        console.error('SIGNIN_ERROR:', res.error);
        setError(res.error.longMessage || res.error.message || 'Authentication failed.');
        setIsPending(false);
        return;
      }

      // Check the global clerk instance if proxy is not updated synchronously yet
      const clerkGlobal = (window as any).Clerk;
      const currentStatus = clerkGlobal?.client?.signIn?.status || signIn.status;
      console.log('SIGNIN_STATUS_CHECK:', currentStatus);

      if (currentStatus === 'complete') {
        // If it's complete, the useEffect hook will handle finalization and redirection
        console.log('Sign-in status complete. Redirection pending.');
      } else {
        setError(`Additional authentication steps are required. Status: ${currentStatus}`);
        setIsPending(false);
      }
    } catch (err: any) {
      console.error('LOGIN_ERROR:', err);
      const message = err.errors?.[0]?.longMessage
        || err.errors?.[0]?.message
        || 'Authentication failed. Please check your credentials and try again.';
      setError(message);
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
