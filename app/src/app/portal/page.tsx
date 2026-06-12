'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { 
  getPortalMatters, 
  getPortalInvoices, 
  getPortalDocuments, 
  getPortalPOPIAConsent, 
  togglePortalPOPIAConsent,
  getPortalDocumentDownloadUrl 
} from '@/server/actions/portal.actions';
import { useClerk } from '@clerk/nextjs';
import { Scale, FileText, Receipt, ShieldCheck, LogOut, Download, AlertCircle, FileCheck, Lock } from 'lucide-react';

export default function ClientPortalDashboard() {
  const { signOut } = useClerk();
  const [matters, setMatters] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [popiaConsent, setPopiaConsent] = useState<any>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchDocuments = useCallback(async (matterId: string) => {
    setIsDocsLoading(true);
    try {
      const docs = await getPortalDocuments(matterId);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load case documents.');
    } finally {
      setIsDocsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const ms = await getPortalMatters();
      setMatters(ms);
      
      const invs = await getPortalInvoices();
      setInvoices(invs);

      const consent = await getPortalPOPIAConsent();
      setPopiaConsent(consent);

      if (ms.length > 0) {
        setSelectedMatterId(ms[0].id);
        fetchDocuments(ms[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client portal dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const handleSelectMatter = (matterId: string) => {
    setSelectedMatterId(matterId);
    fetchDocuments(matterId);
  };

  const handleToggleConsent = () => {
    setError(null);
    setSuccess(null);
    const newConsent = !popiaConsent?.consented_to_processing;

    startTransition(async () => {
      const res = await togglePortalPOPIAConsent(newConsent);
      if (res.success) {
        setSuccess(`POPIA personal data processing consent updated to: ${newConsent ? 'GRANTED' : 'REVOKED'}`);
        // Reload consent status
        const updatedConsent = await getPortalPOPIAConsent();
        setPopiaConsent(updatedConsent);
      } else {
        setError(res.error || 'Failed to update POPIA consent.');
      }
    });
  };

  const handleDownload = async (docId: string, title: string) => {
    try {
      const url = await getPortalDocumentDownloadUrl(docId);
      // Trigger browser download by opening signed url in a new tab
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || `Failed to retrieve download link for: ${title}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400 tracking-wider">Establishing secure portal session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Client Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="text-gold-500 h-6 w-6" />
          <span className="text-lg font-bold tracking-wider">
            LEGAL MATTERS <span className="text-gold-500">PORTAL</span>
          </span>
        </div>

        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 px-3.5 py-2 rounded-lg border border-red-500/20 transition"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Exit Portal</span>
        </button>
      </header>

      {/* Main Grid Portal */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Welcome to Your Secure Client Portal</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Access your active cases, download non-privileged correspondence and court pleadings, review tax invoices, and manage your POPIA data privacy choices.
          </p>
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

        {/* POPIA Privacy Regulation Box */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-base font-bold flex items-center gap-2 text-gold-400">
              <ShieldCheck className="h-5 w-5" /> POPIA Data Processing Consent Dashboard
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              In terms of the South African Protection of Personal Information Act (Act 4 of 2013), we require your explicit consent to process your personal identifiers (ID numbers, addresses, contact detail records) to conduct legal services on your behalf.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-400">Your Current Status:</div>
              <div className={`text-xs font-extrabold ${popiaConsent?.consented_to_processing ? 'text-emerald-400' : 'text-amber-500'}`}>
                {popiaConsent?.consented_to_processing ? 'CONSENT GRANTED' : 'CONSENT REVOKED'}
              </div>
            </div>

            <button
              onClick={handleToggleConsent}
              disabled={isPending}
              className={`font-bold text-xs px-4 py-2.5 rounded-lg border transition ${
                popiaConsent?.consented_to_processing
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-500'
              }`}
            >
              {isPending ? 'Updating...' : popiaConsent?.consented_to_processing ? 'Revoke Consent' : 'Grant Processing Consent'}
            </button>
          </div>
        </section>

        {/* Core Cases and Invoices Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Cases & Secure File Vault */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="text-gold-500 h-5 w-5" /> Active Legal Folders
              </h2>

              {matters.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No active case matters registered to your portal profile.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {matters.map((m) => {
                    const isSelected = selectedMatterId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMatter(m.id)}
                        className={`cursor-pointer border rounded-xl p-4 transition-all duration-200 ${
                          isSelected
                            ? 'bg-gold-500/10 border-gold-500 shadow-md'
                            : 'bg-slate-950 hover:bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gold-400 font-mono font-bold">
                            {m.case_number || 'No Case Ref'}
                          </span>
                          <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {m.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-1">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-450 line-clamp-2">
                          {m.description || 'No description provided.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Document Vault for Selected Case */}
            {selectedMatterId && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileCheck className="text-gold-500 h-5 w-5" /> Secure Document Vault
                  </h2>
                  <span className="text-slate-400 text-xs flex items-center gap-1 font-semibold">
                    <Lock className="h-3 w-3 text-gold-400" /> Privileged Files Redacted
                  </span>
                </div>

                {isDocsLoading ? (
                  <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                    <Scale className="animate-spin text-gold-500 h-6 w-6" />
                    <span className="text-xs">Fetching shared files...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No open-access documents shared on this matter folder yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {documents.map((doc) => (
                      <div key={doc.id} className="py-4 flex justify-between items-center hover:bg-slate-900/30 px-2 rounded-lg transition">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-100">{doc.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                              {doc.classification}
                            </span>
                            <span>
                              {doc.fileName} ({(doc.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(doc.id, doc.title)}
                          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold p-2 rounded-lg transition"
                          title="Download Secure PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Column 3: Outstanding Statements & Invoices */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Receipt className="text-gold-500 h-5 w-5" /> Account Statement & Invoices
              </h2>

              {invoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No invoices issued to your account.
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-xs text-gold-400">
                          {inv.invoice_number}
                        </span>
                        <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold">Due Date</div>
                          <div className="text-xs font-semibold text-slate-300">
                            {new Date(inv.due_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-bold">Total Due</div>
                          <div className="text-base font-bold font-mono text-white">
                            R{Number(inv.total_including_vat).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
