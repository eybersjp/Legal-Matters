'use client';

import React from 'react';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Scale,
  Calendar,
  Layers,
  FileText,
  Clock,
  DollarSign,
  Sparkles
} from 'lucide-react';

interface ReadinessItem {
  id?: string;
  category: string;
  label: string;
  status: 'passed' | 'missing' | 'warning' | 'blocked';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string | null;
}

interface MatterReadinessScoreboardProps {
  score: number;
  status: 'ready' | 'needs_review' | 'not_ready';
  lastCheckedAt?: string;
  items: ReadinessItem[];
  onRerunCheck: () => Promise<void>;
  isRerunning?: boolean;
}

export default function MatterReadinessScoreboard({
  score,
  status,
  lastCheckedAt,
  items = [],
  onRerunCheck,
  isRerunning = false
}: MatterReadinessScoreboardProps) {
  
  // Group items
  const blockedItems = items.filter((item) => item.status === 'blocked' || item.severity === 'critical');
  const warningItems = items.filter((item) => (item.status === 'warning' || item.status === 'missing') && item.severity !== 'critical');
  const passedItems = items.filter((item) => item.status === 'passed');

  // Status visual attributes
  let statusBg = 'bg-rose-500/10 border-rose-500/20 text-rose-500';
  let statusLabel = 'Blocked / Not Ready';
  let statusRing = 'border-rose-500';
  let statusText = 'text-rose-500';

  if (status === 'ready') {
    statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    statusLabel = 'Ready for Operations / Closure';
    statusRing = 'border-emerald-500';
    statusText = 'text-emerald-400';
  } else if (status === 'needs_review') {
    statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
    statusLabel = 'Attention Required';
    statusRing = 'border-amber-500';
    statusText = 'text-amber-500';
  }

  // Visual Category mapping helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'matter_metadata':
        return <Layers className="h-4 w-4 text-blue-400" />;
      case 'documents':
        return <FileText className="h-4 w-4 text-indigo-400" />;
      case 'extractions':
      case 'ai_outputs':
        return <Sparkles className="h-4 w-4 text-gold-400" />;
      case 'tasks':
        return <Clock className="h-4 w-4 text-purple-400" />;
      case 'deadlines':
        return <Calendar className="h-4 w-4 text-rose-400" />;
      case 'billing':
        return <DollarSign className="h-4 w-4 text-emerald-400" />;
      default:
        return <Scale className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatCategoryName = (category: string) => {
    switch (category) {
      case 'matter_metadata': return 'Matter Details';
      case 'documents': return 'Pleadings & Mandate';
      case 'extractions': return 'Text Extraction';
      case 'ai_outputs': return 'AI Summaries';
      case 'tasks': return 'Tasks Progress';
      case 'deadlines': return 'Court Deadlines';
      case 'billing': return 'Billing & Accounting';
      case 'closure': return 'Case Closure Status';
      default: return category.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Score ring */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center text-center p-4 border-r border-slate-800/60 md:col-span-1">
          <div className={`w-32 h-32 rounded-full border-8 ${statusRing} flex flex-col items-center justify-center shadow-lg relative`}>
            <span className="text-3xl font-extrabold text-white">{Math.round(score)}%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Readiness</span>
          </div>
        </div>

        {/* Info panel */}
        <div className="md:col-span-2 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Matter Compliance Audit</h3>
              <button
                type="button"
                onClick={onRerunCheck}
                disabled={isRerunning}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-1.5 px-3 rounded-lg text-xs disabled:opacity-50 transition flex items-center gap-1.5 shadow-md shadow-gold-500/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
                {isRerunning ? 'Scanning...' : 'Rerun Compliance Scan'}
              </button>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBg}`}>
              <Scale className="h-3.5 w-3.5" />
              {statusLabel}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This checker evaluates compliance against South African Legal Practice Council (LPC) guidelines and POPIA requirements. All items must be green to enable matter closure.
            </p>
          </div>

          <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-slate-800/60">
            <span>Last Scan: {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString() : 'Never'}</span>
            <span>Items Evaluated: {items.length}</span>
            <span>Blocks: {blockedItems.length}</span>
            <span>Warnings: {warningItems.length}</span>
          </div>
        </div>
      </div>

      {/* Grouped Compliance checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Blocks & Warnings */}
        <div className="space-y-5">
          {/* Blocks Section */}
          <div className="bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h4 className="font-bold text-sm text-slate-200 mb-3.5 flex items-center gap-1.5">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
              Critical Blocking Issues ({blockedItems.length})
            </h4>
            {blockedItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No critical compliance blocks found on this matter.</p>
            ) : (
              <div className="space-y-3">
                {blockedItems.map((item, idx) => (
                  <div key={idx} className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {formatCategoryName(item.category)}
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-rose-400">{item.label}</p>
                    {item.recommendation && (
                      <p className="text-[11px] text-slate-300 leading-relaxed pl-1 border-l-2 border-slate-700">
                        💡 {item.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings Section */}
          <div className="bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h4 className="font-bold text-sm text-slate-200 mb-3.5 flex items-center gap-1.5">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
              Warnings & Action Required ({warningItems.length})
            </h4>
            {warningItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No compliance warnings found on this matter.</p>
            ) : (
              <div className="space-y-3">
                {warningItems.map((item, idx) => (
                  <div key={idx} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {formatCategoryName(item.category)}
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-amber-500">{item.label}</p>
                    {item.recommendation && (
                      <p className="text-[11px] text-slate-300 leading-relaxed pl-1 border-l-2 border-slate-700">
                        💡 {item.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Passed Checks */}
        <div className="bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit">
          <h4 className="font-bold text-sm text-slate-200 mb-3.5 flex items-center gap-1.5">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
            Passed Compliance Audits ({passedItems.length})
          </h4>
          {passedItems.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No passed audits logged. Rerun scanner to evaluate.</p>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto pr-1">
              {passedItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5">{getCategoryIcon(item.category)}</div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        {formatCategoryName(item.category)}
                      </span>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Advisory Legal Disclaimer Box */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed italic">
          <strong>Advisory Disclaimer:</strong> This readiness report is an advisory compliance tool only and does not constitute formal legal advice. All findings require active attorney verification before any closing action is finalised. The platform does not make legally binding determinations.
        </p>
      </div>
    </div>
  );
}
