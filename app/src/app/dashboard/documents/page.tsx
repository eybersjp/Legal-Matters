'use client';

import { useState, useEffect } from 'react';
import { getAllDocuments, getDocumentDownloadUrl } from '@/server/actions/document.actions';
import { 
  FileText, 
  Search, 
  Lock, 
  Unlock, 
  Download, 
  Filter, 
  AlertCircle,
  Loader2,
  FolderOpen
} from 'lucide-react';

interface DocumentRecord {
  id: string;
  title: string;
  is_privileged: boolean;
  created_at: string;
  matter: {
    id: string;
    title: string;
    case_number: string;
  } | null;
  latest: {
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    classification: string;
    created_at: string;
  } | null;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocs() {
      try {
        setLoading(true);
        const data = await getAllDocuments();
        setDocuments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch global documents.');
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  const handleDownload = async (docId: string) => {
    try {
      setDownloadingId(docId);
      const url = await getDocumentDownloadUrl(docId);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.matter?.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.latest?.file_name.toLowerCase().includes(search.toLowerCase());

    const matchesClass = selectedClass === 'All' || 
      doc.latest?.classification === selectedClass ||
      (selectedClass === 'Privileged' && doc.is_privileged);

    return matchesSearch && matchesClass;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const classifications = ['All', 'Pleading', 'Evidence', 'Correspondence', 'Internal Memo', 'Precedent', 'Privileged'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Documents Vault</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Global firm registry of all litigation pleadings, evidence, and briefs.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title, file name, or matter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 dark:focus:border-gold-500"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden md:block" />
          {classifications.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedClass === cls
                  ? 'bg-gold-500 text-slate-900 shadow-sm shadow-gold-500/10'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-gold-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Retrieving litigation documents vault...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <FolderOpen className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No documents found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-sm">
            Try adjusting your search criteria or class filters to look for files.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Title / File</th>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4">Matter Reference</th>
                  <th className="px-6 py-4">Security Level</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          <FileText className="h-5 w-5 text-gold-500" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block max-w-xs truncate">
                            {doc.title}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5 max-w-xs truncate">
                            {doc.latest?.file_name || 'No versions uploaded'}
                            {doc.latest?.file_size ? ` (${formatBytes(doc.latest.file_size)})` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {doc.latest?.classification || 'Unclassified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.matter ? (
                        <div>
                          <span className="font-semibold block text-slate-700 dark:text-slate-300">
                            {doc.matter.title}
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Case: {doc.matter.case_number || 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Unlinked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {doc.is_privileged ? (
                        <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Privileged</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Standard</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(doc.created_at).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloadingId === doc.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition disabled:opacity-50"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-500" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span>Get</span>
                      </button>
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
