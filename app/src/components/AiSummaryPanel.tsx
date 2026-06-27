'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  BadgeCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Quote
} from 'lucide-react';

export interface Citation {
  id?: string;
  source_type: string;
  source_label?: string | null;
  page_number?: number | null;
  quote?: string | null;
}

export interface AiOutput {
  id: string;
  title: string;
  output_type: string;
  content: {
    document_type?: string;
    key_facts?: string[];
    legal_obligations?: string[];
    [key: string]: any;
  };
  confidence: 'high' | 'medium' | 'low';
  missing_information?: string[];
  suggested_next_actions?: string[];
  status: 'draft' | 'reviewed' | 'approved' | 'rejected' | 'superseded';
  sources?: Citation[];
  approved_by?: string | null;
  approved_at?: string | null;
}

interface AiSummaryPanelProps {
  output: AiOutput;
  onApprove?: (id: string, reason?: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  isActionPending?: boolean;
}

export default function AiSummaryPanel({
  output,
  onApprove,
  onReject,
  isActionPending = false
}: AiSummaryPanelProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isCitationsExpanded, setIsCitationsExpanded] = useState(false);

  const statusColor =
    output.status === 'approved'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : output.status === 'rejected'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      : output.status === 'superseded'
      ? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
      : output.status === 'reviewed'
      ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  const confidenceColor =
    output.confidence === 'high'
      ? 'text-emerald-400'
      : output.confidence === 'medium'
      ? 'text-amber-400'
      : 'text-rose-400';

  const isDraftOrReviewed = output.status === 'draft' || output.status === 'reviewed';

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectReason.trim().length < 5) return;
    if (onReject) {
      await onReject(output.id, rejectReason);
      setShowRejectForm(false);
      setRejectReason('');
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg bg-slate-900/50 backdrop-blur-md">
      {/* Warning Banner for Draft/Reviewing state */}
      {isDraftOrReviewed && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Draft AI Output</h5>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              This is a draft AI analysis. Before relying on this summary for filings, court proceedings, or client advisories, a practitioner must review and approve it.
            </p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-500 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
            {output.output_type.replace('_', ' ')}
          </span>
          <h3 className="font-bold text-slate-900 dark:text-white mt-1.5 text-sm">{output.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
              {output.status}
            </span>
            <span className={`text-[10px] font-semibold flex items-center gap-1 ${confidenceColor}`}>
              <Sparkles className="h-3 w-3" /> {output.confidence} confidence
            </span>
          </div>
        </div>
      </div>

      {/* Content Render */}
      <div className="p-4 space-y-4 text-xs">
        {/* Key Facts */}
        {output.content?.key_facts && output.content.key_facts.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              Key Facts Extracted
            </h4>
            <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
              {output.content.key_facts.map((fact, idx) => (
                <li key={idx} className="leading-relaxed">{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Legal Obligations / Summary text */}
        {output.content?.legal_obligations && output.content.legal_obligations.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Identified Obligations / Analysis
            </h4>
            <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
              {output.content.legal_obligations.map((obligation, idx) => (
                <li key={idx} className="leading-relaxed">{obligation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Information warning */}
        {output.missing_information && output.missing_information.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3">
            <h5 className="font-bold text-rose-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Missing Information Alert
            </h5>
            <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
              {output.missing_information.map((info, idx) => (
                <li key={idx} className="text-[11px] leading-relaxed">{info}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Next Actions */}
        {output.suggested_next_actions && output.suggested_next_actions.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
              Suggested Practitioner Actions
            </h4>
            <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
              {output.suggested_next_actions.map((act, idx) => (
                <li key={idx} className="text-[11px] leading-relaxed">{act}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Citations Panel */}
        {output.sources && output.sources.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setIsCitationsExpanded(!isCitationsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 transition text-left font-bold text-[11px] text-slate-400 uppercase tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-gold-500" /> Source Citations ({output.sources.length})
              </span>
              {isCitationsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isCitationsExpanded && (
              <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-800">
                {output.sources.map((src, idx) => (
                  <div key={idx} className={`${idx > 0 ? 'pt-2' : ''} text-[11px]`}>
                    <div className="flex items-center justify-between font-bold text-gold-500">
                      <span>{src.source_type.toUpperCase()}</span>
                      {src.page_number && (
                        <span className="text-slate-400 font-semibold">Page {src.page_number}</span>
                      )}
                    </div>
                    {src.source_label && (
                      <p className="text-slate-400 font-medium mt-0.5">{src.source_label}</p>
                    )}
                    {src.quote && (
                      <div className="mt-1 flex items-start gap-1 bg-slate-950 p-2 rounded border border-slate-800/40">
                        <Quote className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
                        <p className="text-slate-300 italic leading-relaxed">{src.quote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lock / Approved Status message */}
        {output.status === 'approved' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-bold text-[11px]">Approved & Locked</span>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Approved by {output.approved_by || 'Practitioner'} on {output.approved_at ? new Date(output.approved_at).toLocaleDateString() : 'N/A'}. This summary is locked.
              </p>
            </div>
          </div>
        )}

        {output.status === 'superseded' && (
          <div className="bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-lg p-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-bold text-[11px]">Superseded</span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                This summary has been superseded by a newer version.
              </p>
            </div>
          </div>
        )}

        {/* Form controls for approval / rejection */}
        {isDraftOrReviewed && (onApprove || onReject) && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {showRejectForm ? (
              <form onSubmit={handleConfirmReject} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter reason for rejecting this AI draft (minimum 5 characters)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-rose-500 transition text-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isActionPending || rejectReason.trim().length < 5}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded text-[11px] flex-1 transition disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                    }}
                    className="border border-slate-800 px-3 py-1.5 rounded text-[11px] text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex gap-3">
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(output.id)}
                    disabled={isActionPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex-1 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/20"
                  >
                    <BadgeCheck className="h-4 w-4" /> Approve Summary
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isActionPending}
                    className="border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 font-bold py-2 px-3 rounded-lg text-xs flex-1 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" /> Reject Draft
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
