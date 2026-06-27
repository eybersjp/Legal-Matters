'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition, useCallback, use } from 'react';
import {
  listMatterDocuments,
  uploadDocument,
  archiveDocument,
  generatePlaceholderAISummary,
  approveRejectAISummary,
  createDocumentVersion,
  getDocumentDownloadUrl,
  getDocumentDetail
} from '@/server/actions/document.actions';
import { getMatterDetails } from '@/server/actions/matter.actions';
import {
  getDocumentAiOutputs,
  getAiOutputWithSources,
  approveAiOutput,
  rejectAiOutput
} from '@/server/actions/ai-output.actions';
import AiSummaryPanel from '@/components/AiSummaryPanel';
import {
  FileText,
  Plus,
  Download,
  Scale,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Unlock,
  Sparkles,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Quote,
  BookOpen,
  BadgeCheck,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';

export default function MatterDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [documents, setDocuments] = useState<any[]>([]);
  const [matter, setMatter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Selected document for detailed side panel/drawer
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Phase 3 AI Outputs
  const [aiOutputs, setAiOutputs] = useState<any[]>([]);
  const [selectedAiOutput, setSelectedAiOutput] = useState<any>(null);
  const [isLoadingAiOutputs, setIsLoadingAiOutputs] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [isAiActionPending, setIsAiActionPending] = useState(false);

  // Form Fields for Upload
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent'>('Pleading');
  const [confidentiality, setConfidentiality] = useState<'standard' | 'confidential' | 'restricted'>('standard');
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Form Fields for New Version
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionClassification, setNewVersionClassification] = useState<'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent'>('Correspondence');
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const mat = await getMatterDetails(id);
      setMatter(mat.matter);
      const list = await listMatterDocuments(id);
      setDocuments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load case documents.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load document detail + Phase 3 AI outputs when selectedDocId changes
  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setAiOutputs([]);
      setSelectedAiOutput(null);
      setExpandedCitations(null);
      return;
    }

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      setIsLoadingAiOutputs(true);
      try {
        const [detail, outputs] = await Promise.all([
          getDocumentDetail(selectedDocId),
          getDocumentAiOutputs(selectedDocId)
        ]);
        setSelectedDoc(detail);
        setAiOutputs(outputs || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load document details.');
      } finally {
        setIsLoadingDetail(false);
        setIsLoadingAiOutputs(false);
      }
    };

    loadDetail();
  }, [selectedDocId]);

  const loadAiOutputSources = async (outputId: string) => {
    if (expandedCitations === outputId) {
      setExpandedCitations(null);
      setSelectedAiOutput(null);
      return;
    }
    try {
      const detail = await getAiOutputWithSources(outputId);
      setSelectedAiOutput(detail);
      setExpandedCitations(outputId);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI output citations.');
    }
  };

  const handleApproveAiOutput = async (outputId: string) => {
    setIsAiActionPending(true);
    setError(null);
    try {
      await approveAiOutput(outputId, { reason: 'Approved by practitioner' });
      setSuccess('AI output approved successfully.');
      if (selectedDocId) {
        const outputs = await getDocumentAiOutputs(selectedDocId);
        setAiOutputs(outputs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve AI output.');
    } finally {
      setIsAiActionPending(false);
    }
  };

  const handleRejectAiOutput = async (outputId: string, reason?: string) => {
    const finalReason = reason || rejectReason;
    if (!finalReason || finalReason.trim().length < 5) {
      setError('Rejection reason must be at least 5 characters.');
      return;
    }
    setIsAiActionPending(true);
    setError(null);
    try {
      await rejectAiOutput(outputId, { reason: finalReason });
      setSuccess('AI output rejected.');
      setShowRejectForm(null);
      setRejectReason('');
      if (selectedDocId) {
        const outputs = await getDocumentAiOutputs(selectedDocId);
        setAiOutputs(outputs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject AI output.');
    } finally {
      setIsAiActionPending(false);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('matterId', id);
      formData.append('title', title);
      formData.append('classification', classification);
      formData.append('confidentiality', confidentiality);
      formData.append('isPrivileged', String(isPrivileged));

      const res = await uploadDocument(formData);

      if (res.success) {
        setSuccess('Document successfully uploaded & registered in secure cloud vault.');
        setShowUploadForm(false);
        setTitle('');
        setFile(null);
        setIsPrivileged(false);
        setClassification('Pleading');
        setConfidentiality('standard');
        await loadData();
      } else {
        setError(res.error || 'Upload failed.');
      }
    });
  };

  const handleNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionFile || !selectedDocId) return;

    setError(null);
    setSuccess(null);
    setIsUploadingVersion(true);

    try {
      const formData = new FormData();
      formData.append('file', newVersionFile);
      formData.append('documentId', selectedDocId);
      formData.append('classification', newVersionClassification);

      const res = await createDocumentVersion(formData);
      if (res.success) {
        setSuccess('New version successfully uploaded.');
        setNewVersionFile(null);
        // Refresh details and document list
        const updatedDetail = await getDocumentDetail(selectedDocId);
        setSelectedDoc(updatedDetail);
        await loadData();
      } else {
        setError(res.error || 'New version upload failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading new version.');
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const url = await getDocumentDownloadUrl(docId);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Privilege quarantine restriction: Access denied.');
    }
  };

  const handleArchive = async (docId: string) => {
    if (!confirm('Are you sure you want to archive this document? It will no longer be visible in the main case index.')) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await archiveDocument(docId);
      if (res.success) {
        setSuccess('Document archived successfully.');
        setSelectedDocId(null);
        await loadData();
      } else {
        setError(res.error || 'Failed to archive document.');
      }
    } catch (err: any) {
      setError(err.message || 'Error archiving document.');
    }
  };

  const handleGenerateAISummary = async (docId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await generatePlaceholderAISummary(docId);
      if (res.success) {
        setSuccess('AI summary placeholder generated successfully.');
        if (selectedDocId === docId) {
          const updatedDetail = await getDocumentDetail(docId);
          setSelectedDoc(updatedDetail);
        }
        await loadData();
      } else {
        setError(res.error || 'AI summary generation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating AI summary.');
    }
  };

  const handleApproveRejectSummary = async (summaryId: string, decision: 'approved' | 'rejected') => {
    setError(null);
    setSuccess(null);
    try {
      const res = await approveRejectAISummary(summaryId, decision);
      if (res.success) {
        setSuccess(`AI summary was successfully ${decision}.`);
        if (selectedDocId) {
          const updatedDetail = await getDocumentDetail(selectedDocId);
          setSelectedDoc(updatedDetail);
        }
        await loadData();
      } else {
        setError(res.error || `Failed to ${decision} AI summary.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error responding to AI summary.');
    }
  };

  // Stats calculation
  const totalDocs = documents.length;
  const pendingReview = documents.filter(d => d.status === 'review_pending').length;
  const confidentialCount = documents.filter(d => d.confidentiality_level === 'confidential' || d.confidentiality_level === 'restricted').length;
  const pendingAISummary = documents.filter(d => d.ai_processed && d.approval_status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Loading secure document vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Navigation and title */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/matters/${id}`}
          className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {matter?.title} ({matter?.case_number})
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Document Hub</h1>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registry</div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{totalDocs} Documents</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Pending Review</div>
          <div className="text-2xl font-black mt-2 text-amber-500">{pendingReview} Files</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-500 font-semibold">Restricted / Confidential</div>
          <div className="text-2xl font-black mt-2 text-rose-500">{confidentialCount} Vaulted</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gold-500">AI Summary Approvals</div>
          <div className="text-2xl font-black mt-2 text-gold-500">{pendingAISummary} Action Required</div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <FileText className="text-gold-500 h-5 w-5" /> Case File Registry
        </h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Secure Upload</span>
        </button>
      </div>

      {/* Upload Document Form Panel */}
      {showUploadForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md max-w-3xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-850 dark:text-slate-100">
            Upload Document to Secure Vault
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Display Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Plaintiff's Particulars of Claim"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Source File</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Classification</label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="Pleading">Pleading (Rules of Court)</option>
                  <option value="Evidence">Evidence / Exhibits</option>
                  <option value="Correspondence">Correspondence</option>
                  <option value="Internal Memo">Internal Memo</option>
                  <option value="Precedent">Precedent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Confidentiality Level</label>
                <select
                  value={confidentiality}
                  onChange={(e) => setConfidentiality(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="standard">Standard (Discovered)</option>
                  <option value="confidential">Confidential (Internal/Client)</option>
                  <option value="restricted">Restricted (Counsel Eyes Only)</option>
                </select>
              </div>

              {/* Privilege Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 mt-6">
                <input
                  type="checkbox"
                  id="privileged"
                  checked={isPrivileged}
                  onChange={(e) => setIsPrivileged(e.target.checked)}
                  className="h-4 w-4 text-gold-500 accent-gold-500 focus:ring-gold-500 rounded"
                />
                <label htmlFor="privileged" className="text-xs font-bold uppercase tracking-wider cursor-pointer text-slate-600 dark:text-slate-300">
                  Flag as Privileged
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Uploading to Supabase Vault...' : 'Commit Upload'}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document layout: index table on left, detail panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table list */}
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm ${selectedDocId ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold mb-1 text-slate-800 dark:text-white">No documents uploaded</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                Begin uploading pleadings, correspondence, or evidence files.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Title</th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Classification</th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">Confidentiality</th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs">AI Status</th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => {
                    const latestVer = doc.latest;
                    const isCurrentSelected = selectedDocId === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${isCurrentSelected ? 'bg-slate-50/80 dark:bg-slate-800/50 border-l-2 border-l-gold-500' : ''}`}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.title}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{latestVer?.file_name} (v{latestVer?.version_number})</div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                            {latestVer?.classification || doc.category}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          {doc.confidentiality_level === 'restricted' ? (
                            <span className="text-xs text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 font-bold flex items-center gap-1 w-fit">
                              <Lock className="h-3 w-3" /> Restricted
                            </span>
                          ) : doc.confidentiality_level === 'confidential' ? (
                            <span className="text-xs text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 font-bold flex items-center gap-1 w-fit">
                              <ShieldAlert className="h-3 w-3" /> Confidential
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-semibold flex items-center gap-1 w-fit">
                              <Unlock className="h-3 w-3" /> Standard
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {doc.ai_processed ? (
                            doc.approval_status === 'approved' ? (
                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> AI Summary Approved
                              </span>
                            ) : doc.approval_status === 'rejected' ? (
                              <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                                <XCircle className="h-4 w-4" /> AI Summary Rejected
                              </span>
                            ) : (
                              <span className="text-xs text-amber-500 font-semibold flex items-center gap-1">
                                <Sparkles className="h-4 w-4 animate-pulse" /> Pending Approval
                              </span>
                            )
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateAISummary(doc.id);
                              }}
                              className="bg-gold-500/10 hover:bg-gold-500/25 text-gold-500 border border-gold-500/30 text-xs px-2.5 py-1 rounded transition flex items-center gap-1 font-bold"
                            >
                              <Sparkles className="h-3 w-3" /> AI Summary
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleDownload(doc.id)}
                              className="text-slate-400 hover:text-gold-500 transition p-1.5"
                              title="Download File"
                            >
                              <Download className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => setSelectedDocId(doc.id)}
                              className="text-slate-400 hover:text-blue-500 transition p-1.5"
                              title="Inspect Details"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed drawer / panel */}
        {selectedDocId && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 lg:col-span-1 min-h-[50vh]">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <Scale className="animate-spin text-gold-500 h-8 w-8" />
                <p className="text-xs text-slate-400">Loading document vault details...</p>
              </div>
            ) : selectedDoc ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedDoc.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Status: <span className="capitalize font-bold text-slate-300">{selectedDoc.status}</span></p>
                  </div>
                  <button
                    onClick={() => setSelectedDocId(null)}
                    className="text-slate-400 hover:text-slate-500 font-bold text-sm"
                  >
                    Close
                  </button>
                </div>

                {/* Metadata details */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">Vault Metadata</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-slate-400">Privilege Vault:</span>
                    <span className={`font-bold ${selectedDoc.is_privileged ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedDoc.is_privileged ? 'Privileged' : 'Discoverable'}
                    </span>

                    <span className="text-slate-400">Confidentiality:</span>
                    <span className="capitalize font-semibold text-slate-200">{selectedDoc.confidentiality_level}</span>

                    <span className="text-slate-400">Classification:</span>
                    <span className="text-slate-200">{selectedDoc.category}</span>

                    <span className="text-slate-400">Registered At:</span>
                    <span className="text-slate-200">{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleDownload(selectedDoc.id)}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-2 rounded text-xs flex items-center gap-1 transition w-full justify-center"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Latest
                    </button>
                    <button
                      onClick={() => handleArchive(selectedDoc.id)}
                      className="border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded text-xs transition w-full justify-center"
                    >
                      Archive File
                    </button>
                  </div>
                </div>

                {/* AI Summary Section */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gold-500 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI Summary Hub
                    </h4>
                    {selectedDoc.ai_processed && (
                      <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${selectedDoc.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : selectedDoc.approval_status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                        {selectedDoc.approval_status}
                      </span>
                    )}
                  </div>

                  {selectedDoc.ai_processed && selectedDoc.ai_summary ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-semibold block text-slate-300">{selectedDoc.ai_summary.output_title}</span>
                        <p className="text-slate-400 mt-1 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">{selectedDoc.ai_summary.summary_text}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1.5">
                        <span className="text-slate-400">Confidence Level:</span>
                        <span className="capitalize font-bold text-amber-400">{selectedDoc.ai_summary.confidence_level}</span>

                        <span className="text-slate-400">Missing Information:</span>
                        <span className="text-slate-200">{selectedDoc.ai_summary.missing_information || 'None detected'}</span>

                        <span className="text-slate-400">Suggested Action:</span>
                        <span className="text-slate-200">{selectedDoc.ai_summary.suggested_next_action || 'None'}</span>
                      </div>

                      {/* Approval flow controls */}
                      {selectedDoc.approval_status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleApproveRejectSummary(selectedDoc.ai_summary.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-xs w-full transition"
                          >
                            Approve Summary
                          </button>
                          <button
                            onClick={() => handleApproveRejectSummary(selectedDoc.ai_summary.id, 'rejected')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded text-xs w-full transition"
                          >
                            Reject Summary
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-400 mb-3">AI summaries are not yet extracted for this file.</p>
                      <button
                        onClick={() => handleGenerateAISummary(selectedDoc.id)}
                        className="bg-gold-500/10 hover:bg-gold-500/25 text-gold-500 border border-gold-500/30 text-xs py-1.5 px-4 rounded transition inline-flex items-center gap-1 font-bold"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Generate Placeholder Summary
                      </button>
                    </div>
                  )}
                </div>

                {/* Phase 3: AI Outputs Panel */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gold-500 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> AI Outputs
                    </h4>
                    <span className="text-[10px] text-slate-400">{aiOutputs.length} record{aiOutputs.length !== 1 ? 's' : ''}</span>
                  </div>

                  {isLoadingAiOutputs ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Scale className="animate-spin h-3.5 w-3.5 text-gold-500" />
                      Loading AI outputs...
                    </div>
                  ) : aiOutputs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      No Phase 3 AI outputs generated for this document yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {aiOutputs.map((output: any) => (
                        <AiSummaryPanel
                          key={output.id}
                          output={output}
                          onApprove={handleApproveAiOutput}
                          onReject={handleRejectAiOutput}
                          isActionPending={isAiActionPending}
                        />
                      ))}
                    </div>
                  )}
                </div>


                <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1">
                    <History className="h-4 w-4" /> Upload New Version
                  </h4>
                  <form onSubmit={handleNewVersion} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">New File</label>
                      <input
                        type="file"
                        onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Classification</label>
                      <select
                        value={newVersionClassification}
                        onChange={(e) => setNewVersionClassification(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="Pleading">Pleading (Rules of Court)</option>
                        <option value="Evidence">Evidence / Exhibits</option>
                        <option value="Correspondence">Correspondence</option>
                        <option value="Internal Memo">Internal Memo</option>
                        <option value="Precedent">Precedent</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isUploadingVersion}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-1.5 px-3 rounded text-xs w-full transition disabled:opacity-50"
                    >
                      {isUploadingVersion ? 'Uploading New Version...' : 'Submit New Version'}
                    </button>
                  </form>
                </div>

                {/* History version list */}
                {selectedDoc.versions.length > 1 && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">Version History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedDoc.versions
                        .sort((a: any, b: any) => b.version_number - a.version_number)
                        .map((ver: any) => (
                          <div key={ver.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-900 pb-2 last:border-b-0 last:pb-0">
                            <div>
                              <span className="font-bold text-slate-300">Version {ver.version_number}</span>
                              <span className="text-[10px] text-slate-450 block font-mono">{ver.file_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px]">{new Date(ver.created_at).toLocaleDateString()}</span>
                              <span className="text-slate-400 block text-[10px] font-mono">{Math.round(ver.file_size / 1024)} KB</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
