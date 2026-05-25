'use client';

import { useEffect, useState, useTransition } from 'react';
import { getMatterDocuments, registerDocumentUpload, getDocumentDownloadUrl } from '@/server/actions/document.actions';
import { getMatterDetails } from '@/server/actions/matter.actions';
import { FileText, Plus, ShieldCheck, Download, Scale, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MatterDocumentsPage({ params }: { params: { id: string } }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [matter, setMatter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent'>('Pleading');
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileSize = 1048576; // mock 1MB

  const loadData = async () => {
    try {
      const mat = await getMatterDetails(params.id);
      setMatter(mat.matter);
      const list = await getMatterDocuments(params.id);
      setDocuments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load case documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      // Simulate file upload mapping path: [firm_id]/[matter_id]/[uuid].pdf
      const mockStoragePath = `${matter.firm_id}/${matter.id}/${crypto.randomUUID()}.pdf`;

      const res = await registerDocumentUpload({
        matterId: params.id,
        title,
        isPrivileged,
        fileName: fileName || 'pleading_filing.pdf',
        fileSize,
        mimeType: 'application/pdf',
        storagePath: mockStoragePath,
        classification,
      });

      if (res.success) {
        setSuccess('Document successfully uploaded & registered in secure cloud vault.');
        setShowAddForm(false);
        setTitle('');
        setFileName('');
        setIsPrivileged(false);
        loadData();
      } else {
        setError(res.error || 'Upload failed.');
      }
    });
  };

  const handleDownload = async (docId: string) => {
    try {
      const url = await getDocumentDownloadUrl(docId);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Privilege quarantine restriction: Access denied.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Loading document registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation and title */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/matters/${params.id}`} className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {matter.title}
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Quarantined Case Files</h1>
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

      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-gold-500 h-5 w-5" /> Case Document Index
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Upload Document Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-2xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            Upload Document & Set Classifications
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Display Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Defendant's Replying Affidavit"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. replying_affidavit.pdf"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Classification</label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                >
                  <option value="Pleading">Pleading (Rules of Court)</option>
                  <option value="Evidence">Evidence / Exhibits</option>
                  <option value="Correspondence">Correspondence</option>
                  <option value="Internal Memo">Internal Memo</option>
                  <option value="Precedent">Precedent</option>
                </select>
              </div>

              {/* Privilege Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2">
                <input
                  type="checkbox"
                  id="privileged"
                  checked={isPrivileged}
                  onChange={(e) => setIsPrivileged(e.target.checked)}
                  className="h-4 w-4 text-gold-500 accent-gold-500 focus:ring-gold-500 rounded"
                />
                <label htmlFor="privileged" className="text-xs font-bold uppercase tracking-wider cursor-pointer">
                  Flag as Privileged (Quarantine File)
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Uploading to Supabase Vault...' : 'Commit Upload'}
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

      {documents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold mb-1">No case documents uploaded</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Begin uploading pleadings, correspondence, or evidence files.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Document Title</th>
                  <th className="py-4 px-6 font-semibold">File Type / Size</th>
                  <th className="py-4 px-6 font-semibold">Classification</th>
                  <th className="py-4 px-6 font-semibold">LPC Privilege Quarantine</th>
                  <th className="py-4 px-6 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => {
                  const latestVer = doc.latest;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{latestVer?.file_name}</div>
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-400">
                        PDF ({Math.round(latestVer?.file_size / 1024)} KB)
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-slate-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded">
                          {latestVer?.classification}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {doc.is_privileged ? (
                          <span className="text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 font-bold flex items-center gap-1 w-fit">
                            <ShieldAlert className="h-3 w-3" /> Privileged
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-semibold flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-3 w-3" /> Discoverable
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleDownload(doc.id)}
                          className="text-gold-500 hover:text-gold-600 transition flex items-center gap-1 font-bold text-xs"
                        >
                          <Download className="h-4 w-4" /> Download
                        </button>
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
