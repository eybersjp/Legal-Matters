'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { getClientPopiaConsent, updateClientPopiaConsent } from '@/server/actions/popia.actions';
import { getClientDetails } from '@/server/actions/client.actions';
import { ShieldCheck, Mail, Phone, Scale, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Consent Fields
  const [consented, setConsented] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const c = await getClientDetails(params.id);
      setClient(c);

      const popia = await getClientPopiaConsent(params.id);
      if (popia) {
        setConsent(popia);
        setConsented(popia.consented_to_processing);
        setChannels(popia.consented_channels || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open client profile.');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const handleConsentUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateClientPopiaConsent(params.id, {
        consentedToProcessing: consented,
        consentedChannels: channels,
      });

      if (res.success) {
        setSuccess('POPIA processing consent state successfully locked.');
        loadData();
      } else {
        setError(res.error || 'Failed to update consent.');
      }
    });
  };

  const handleChannelToggle = (channel: string) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter((c) => c !== channel));
    } else {
      setChannels([...channels, channel]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Decrypting secure PII profile...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md mx-auto mt-12">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold mb-1">Access Blocked</h3>
        <p className="text-sm text-slate-400 mb-6">
          POPIA data privacy isolation active, or client ID is invalid.
        </p>
        <Link href="/dashboard/clients" className="text-gold-500 font-bold hover:underline">
          Return to Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients" className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Client Registry File
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            {client.type === 'Corporate' ? client.company_name : `${client.first_name} ${client.last_name}`}
          </h1>
        </div>
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
        
        {/* Left Card: Client Profile PII details */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Mail className="text-gold-500 h-5 w-5" /> Decrypted Personal Data (PII)
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Entity Type</span>
              <p className="font-semibold">{client.type}</p>
            </div>
            {client.type === 'Corporate' ? (
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Registration Number</span>
                <p className="font-mono font-semibold">{client.registration_number}</p>
              </div>
            ) : (
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">SA ID Number</span>
                <p className="font-mono font-semibold">{client.sa_id_number || 'Passport Used'}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Contact Email</span>
              <p className="font-semibold flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {client.email}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Phone Contact</span>
              <p className="font-semibold flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {client.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Right Card: POPIA Consent Manager */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Scale className="text-gold-500 h-5 w-5" /> POPIA Processing Consent
          </h3>

          <form onSubmit={handleConsentUpdate} className="space-y-6">
            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
              <input
                type="checkbox"
                id="consentProcessing"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="h-5 w-5 text-gold-500 accent-gold-500 rounded focus:ring-gold-500 mt-0.5"
                disabled={isPending}
              />
              <div className="space-y-1">
                <label htmlFor="consentProcessing" className="text-sm font-bold uppercase tracking-wider cursor-pointer">
                  Authorise PII Processing Consent
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Client grants Shoeman & Partners explicit right to process sensitive identification, financials, and contact parameters for matter filing scope.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Authorised Contact Channels
              </span>
              <div className="grid grid-cols-2 gap-4">
                {['Email', 'SMS', 'Phone'].map((channel) => {
                  const isChecked = channels.includes(channel);
                  return (
                    <button
                      type="button"
                      key={channel}
                      onClick={() => handleChannelToggle(channel)}
                      disabled={isPending}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                        isChecked 
                          ? 'border-gold-500/50 bg-gold-500/10 text-gold-400' 
                          : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <span>{channel} Channel</span>
                      {isChecked && <ShieldCheck className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {consent && (
              <div className="text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between">
                <span>Consent expires: {new Date(consent.expires_at).toLocaleDateString('en-ZA')}</span>
                <span>Last updated: {new Date(consent.updated_at).toLocaleDateString('en-ZA')}</span>
              </div>
            )}

            <button
              type="submit"
              className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-sm transition disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? 'Signing POPI record...' : 'Update Consent parameters'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
