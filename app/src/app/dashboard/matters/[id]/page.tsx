'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition, useCallback, use } from 'react';
import { getMatterDetails, closeMatter } from '@/server/actions/matter.actions';
import { getMatterTimeline, addTimelineEvent } from '@/server/actions/timeline.actions';
import { getMatterTasks, createMatterTask, updateTaskStatus, deleteTask } from '@/server/actions/task.actions';
import { getMatterDeadlines, markDeadlineComplete, escalateOverdueDeadline, createCourtDeadline } from '@/server/actions/deadline.actions';
import { getMatterTimeEntries, recordTimeEntry } from '@/server/actions/time.actions';
import { getMatterExpenses, recordExpense, recordPayment, getMatterInvoices, getMatterPayments, generateTaxInvoice } from '@/server/actions/billing.actions';
import { getMatterDocuments } from '@/server/actions/document.actions';
import { getMatterAiOutputs, approveAiOutput, rejectAiOutput } from '@/server/actions/ai-output.actions';
import { getLatestMatterReadinessCheck, getMatterReadinessItems, runMatterReadinessCheck } from '@/server/actions/matter-readiness.actions';
import AiSummaryPanel from '@/components/AiSummaryPanel';
import MatterReadinessScoreboard from '@/components/MatterReadinessScoreboard';
import { 
  Scale, Clock, Plus, ArrowLeft, Users, History, ShieldAlert, CheckSquare, 
  Square, Calendar, AlertTriangle, DollarSign, FolderClosed, Trash2, 
  CheckCircle, FileText, AlertCircle, X, Receipt, PlusCircle, Check, Sparkles, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function MatterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks' | 'deadlines' | 'documents' | 'ai_summary' | 'readiness' | 'billing' | 'closure'>('overview');
  
  // Data States
  const [details, setDetails] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Phase 3 States
  const [documents, setDocuments] = useState<any[]>([]);
  const [aiOutputs, setAiOutputs] = useState<any[]>([]);
  const [readinessCheck, setReadinessCheck] = useState<any>(null);
  const [readinessItems, setReadinessItems] = useState<any[]>([]);
  const [isAiActionPending, setIsAiActionPending] = useState(false);
  const [isRerunningReadiness, setIsRerunningReadiness] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal Control States
  const [activeModal, setActiveModal] = useState<'task' | 'deadline' | 'time' | 'expense' | 'payment' | 'timeline_event' | null>(null);

  // Form Fields
  // 1. Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  // 2. Deadline form
  const [dlTitle, setDlTitle] = useState('');
  const [dlTriggerEvent, setDlTriggerEvent] = useState('');
  const [dlTriggerDate, setDlTriggerDate] = useState('');
  const [dlCourtDays, setDlCourtDays] = useState(5);

  // 3. Time Entry form
  const [timeDuration, setTimeDuration] = useState('');
  const [timeRate, setTimeRate] = useState('1500');
  const [timeDesc, setTimeDesc] = useState('');

  // 4. Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // 5. Payment form
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFT');
  const [payRef, setPayRef] = useState('');

  // 6. Timeline event form
  const [tleTitle, setTleTitle] = useState('');
  const [tleDesc, setTleDesc] = useState('');
  const [tleDate, setTleDate] = useState(new Date().toISOString().split('T')[0]);

  // 7. Case Closure form
  const [closeReason, setCloseReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeClientComm, setCloseClientComm] = useState<'Notified' | 'Acknowledged' | 'Waived'>('Notified');
  const [closeDocArchive, setCloseDocArchive] = useState<'Archived' | 'Quarantined'>('Archived');
  const [closeRetentionConfirm, setCloseRetentionConfirm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const matDetails = await getMatterDetails(matterId);
      setDetails(matDetails);

      const [matTimeline, matTasks, matDeadlines, matTime, matExp, matInv, matPay, matDocs, matAi, latestCheck] = await Promise.all([
        getMatterTimeline(matterId),
        getMatterTasks(matterId),
        getMatterDeadlines(matterId),
        getMatterTimeEntries(matterId),
        getMatterExpenses(matterId),
        getMatterInvoices(matterId),
        getMatterPayments(matterId),
        getMatterDocuments(matterId),
        getMatterAiOutputs(matterId),
        getLatestMatterReadinessCheck(matterId)
      ]);

      setTimeline(matTimeline);
      setTasks(matTasks);
      setDeadlines(matDeadlines);
      setTimeEntries(matTime);
      setExpenses(matExp);
      setInvoices(matInv);
      setPayments(matPay);
      setDocuments(matDocs || []);
      setAiOutputs(matAi || []);
      setReadinessCheck(latestCheck || null);

      if (latestCheck) {
        const items = await getMatterReadinessItems(latestCheck.id);
        setReadinessItems(items || []);
      } else {
        setReadinessItems([]);
      }

      // Pre-select first invoice in payment form if any exist
      const outstandingInvoices = matInv.filter((i: any) => i.status !== 'Paid' && i.status !== 'WrittenOff');
      if (outstandingInvoices.length > 0) {
        setPayInvoiceId(outstandingInvoices[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case folder.');
    } finally {
      setIsLoading(false);
    }
  }, [matterId]);

  const handleApproveAiSummary = async (aiOutputId: string) => {
    setError(null);
    setSuccess(null);
    setIsAiActionPending(true);
    try {
      const res = await approveAiOutput(aiOutputId, { reason: 'Reviewed and approved by practitioner.' });
      if (res.success) {
        setSuccess('AI Summary approved and locked successfully.');
        await loadData();
      } else {
        setError('Failed to approve AI summary.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during approval.');
    } finally {
      setIsAiActionPending(false);
    }
  };

  const handleRejectAiSummary = async (aiOutputId: string, reason: string) => {
    setError(null);
    setSuccess(null);
    setIsAiActionPending(true);
    try {
      const res = await rejectAiOutput(aiOutputId, { reason });
      if (res.success) {
        setSuccess('AI Summary rejected successfully.');
        await loadData();
      } else {
        setError('Failed to reject AI summary.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during rejection.');
    } finally {
      setIsAiActionPending(false);
    }
  };

  const handleRerunReadiness = async () => {
    setError(null);
    setSuccess(null);
    setIsRerunningReadiness(true);
    try {
      const res = await runMatterReadinessCheck(matterId, 'full');
      if (res.check_id) {
        setSuccess('Matter compliance check completed successfully.');
        await loadData();
      } else {
        setError('Failed to complete compliance check.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred running the compliance scan.');
    } finally {
      setIsRerunningReadiness(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Form Submissions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await createMatterTask({
        matter_id: matterId,
        title: taskTitle,
        description: taskDesc || null,
        assigned_to: taskAssignee || null,
        due_date: new Date(taskDueDate).toISOString(),
      });

      if (res.success) {
        setSuccess('Task assigned successfully.');
        setActiveModal(null);
        setTaskTitle('');
        setTaskDesc('');
        setTaskDueDate('');
        setTaskAssignee('');
        loadData();
      } else {
        setError(res.error || 'Failed to create task.');
      }
    });
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await createCourtDeadline({
        matterId,
        title: dlTitle,
        triggerEvent: dlTriggerEvent,
        triggerDate: new Date(dlTriggerDate).toISOString(),
        courtDaysCount: Number(dlCourtDays),
      });

      if (res.success) {
        setSuccess('Court deadline calculated and recorded.');
        setActiveModal(null);
        setDlTitle('');
        setDlTriggerEvent('');
        setDlTriggerDate('');
        setDlCourtDays(5);
        loadData();
      } else {
        setError(res.error || 'Failed to calculate deadline.');
      }
    });
  };

  const handleRecordTime = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await recordTimeEntry({
        matter_id: matterId,
        duration_minutes: Number(timeDuration),
        hourly_rate_zar: Number(timeRate),
        description: timeDesc,
      });

      if (res.success) {
        setSuccess('Billable hours recorded.');
        setActiveModal(null);
        setTimeDuration('');
        setTimeDesc('');
        loadData();
      } else {
        setError(res.error || 'Failed to record billable entry.');
      }
    });
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await recordExpense({
        matter_id: matterId,
        amount_zar: Number(expAmount),
        description: expDesc,
      });

      if (res.success) {
        setSuccess('Disbursement recorded.');
        setActiveModal(null);
        setExpAmount('');
        setExpDesc('');
        loadData();
      } else {
        setError(res.error || 'Failed to record expense.');
      }
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!payInvoiceId) {
      setError('Select a valid invoice reference.');
      return;
    }

    startTransition(async () => {
      const res = await recordPayment({
        invoice_id: payInvoiceId,
        amount_paid: Number(payAmount),
        payment_method: payMethod,
        transaction_reference: payRef,
      });

      if (res.success) {
        setSuccess('Payment registered and reconciled.');
        setActiveModal(null);
        setPayAmount('');
        setPayRef('');
        loadData();
      } else {
        setError(res.error || 'Failed to reconcile payment.');
      }
    });
  };

  const handleAddTimelineEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await addTimelineEvent({
        matterId,
        title: tleTitle,
        description: tleDesc || undefined,
        eventDate: new Date(tleDate).toISOString(),
      });

      if (res.success) {
        setSuccess('Case event filed.');
        setActiveModal(null);
        setTleTitle('');
        setTleDesc('');
        loadData();
      } else {
        setError(res.error || 'Failed to register timeline event.');
      }
    });
  };

  const handleCloseMatter = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await closeMatter(matterId, {
        closure_reason: closeReason,
        closure_notes: closeNotes || null,
        client_communication_status: closeClientComm,
        document_archive_status: closeDocArchive,
        data_retention_confirmed: closeRetentionConfirm,
      });

      if (res.success) {
        setSuccess('Matter closed successfully.');
        setCloseReason('');
        setCloseNotes('');
        setCloseRetentionConfirm(false);
        loadData();
      } else {
        setError(res.error || 'Case closure criteria check failed.');
      }
    });
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    setError(null);
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await updateTaskStatus(taskId, newStatus);
      if (res.success) {
        loadData();
      } else {
        setError(res.error || 'Failed to update task.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setError(null);
    try {
      const res = await deleteTask(taskId);
      if (res.success) {
        loadData();
      } else {
        setError(res.error || 'Failed to delete task.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleDeadline = async (deadlineId: string, currentVal: boolean) => {
    setError(null);
    try {
      const res = await markDeadlineComplete(deadlineId, !currentVal);
      if (res.success) {
        loadData();
      } else {
        setError(res.error || 'Failed to update deadline status.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEscalateDeadline = async (deadlineId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await escalateOverdueDeadline(deadlineId);
      if (res.success) {
        setSuccess('URGENT escalation notifications sent to firm partners.');
        loadData();
      } else {
        setError(res.error || 'Failed to escalate.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateInvoice = async () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await generateTaxInvoice(matterId);
      if (res.success) {
        setSuccess('LPC Tax Invoice created successfully.');
        loadData();
      } else {
        setError(res.error || 'Failed to generate invoice.');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-12 w-12" />
        <p className="text-sm text-slate-400 font-semibold tracking-wider">Loading Practice Control Panel...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md mx-auto mt-12 shadow-md">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold mb-1">Access Restrained</h3>
        <p className="text-sm text-slate-400 mb-6">
          LPC Privilege quarantine active, or matter ID reference is invalid.
        </p>
        <Link href="/dashboard/matters" className="text-gold-500 font-bold hover:underline">
          Return to Registry
        </Link>
      </div>
    );
  }

  const { matter, team } = details;

  // Calculate Health Metrics dynamically
  const openTasksCount = tasks.filter(t => t.status !== 'Completed').length;
  const overdueTasksCount = tasks.filter(t => t.status === 'Overdue').length;
  
  const upcomingDeadlinesCount = deadlines.filter(d => !d.is_completed && new Date(d.calculated_deadline) >= new Date()).length;
  const overdueDeadlinesCount = deadlines.filter(d => !d.is_completed && new Date(d.calculated_deadline) < new Date()).length;
  
  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'WrittenOff');
  const unpaidInvoicesTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.incVat), 0);
  
  const unbilledTimeTotal = timeEntries.filter(t => !t.isBilled).reduce((sum, entry) => sum + (entry.duration / 60) * entry.rate, 0);
  const unbilledExpensesTotal = expenses.filter(e => !e.is_billed).reduce((sum, exp) => sum + Number(exp.amount_zar), 0);

  // Closure Readiness checklist Boolean evaluations
  const checkMatterStatus = matter.status !== 'Closed';
  const checkIncompleteTasks = openTasksCount === 0;
  const checkOpenDeadlines = (upcomingDeadlinesCount + overdueDeadlinesCount) === 0;
  const checkUnpaidInvoices = unpaidInvoices.length === 0;
  const checkUnbilledTime = timeEntries.filter(t => !t.isBilled).length === 0;
  const checkUnbilledExpenses = expenses.filter(e => !e.is_billed).length === 0;
  
  const isClosureReady = checkMatterStatus && checkIncompleteTasks && checkOpenDeadlines && checkUnpaidInvoices && checkUnbilledTime && checkUnbilledExpenses;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/matters" className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-gold-500/10 text-gold-500 px-2.5 py-0.5 rounded border border-gold-500/20">
                Case Pleading Panel
              </span>
              {matter.status === 'Closed' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 px-2.5 py-0.5 rounded border border-rose-500/20">
                  Closed
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  {matter.status}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{matter.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              Ref: {matter.case_number || 'No Case Reference'} | Court: {matter.court_jurisdiction}
            </p>
          </div>
        </div>

        {/* Global Notifications and Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2 max-w-sm shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2 max-w-sm shrink-0">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 scrollbar-none">
        {(
          [
            { id: 'overview', label: 'Overview', icon: Scale },
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'deadlines', label: 'Deadlines', icon: Calendar },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'ai_summary', label: 'AI Summary', icon: Sparkles },
            { id: 'readiness', label: 'Readiness', icon: Scale },
            { id: 'billing', label: 'Billing & Ledgers', icon: DollarSign },
            { id: 'closure', label: 'Close Matter', icon: FolderClosed }
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setError(null);
                setSuccess(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-gold-500 text-gold-500 bg-gold-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tabs Content */}
      <div className="space-y-6">

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Health Indicators Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Unresolved Tasks</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{openTasksCount}</span>
                  {overdueTasksCount > 0 && (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/20">
                      {overdueTasksCount} Overdue
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Open Deadlines</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{upcomingDeadlinesCount + overdueDeadlinesCount}</span>
                  {overdueDeadlinesCount > 0 && (
                    <span className="text-[10px] text-rose-450 font-bold bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/20">
                      {overdueDeadlinesCount} Overdue
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Unpaid Invoices</span>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-rose-400">
                    R{unpaidInvoicesTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500">{unpaidInvoices.length} invoices outstanding</p>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Unbilled WIP</span>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gold-400">
                    R{(unbilledTimeTotal + unbilledExpensesTotal).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Time: R{unbilledTimeTotal.toFixed(0)} | Exp: R{unbilledExpensesTotal.toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Closure Readiness</span>
                <div>
                  {isClosureReady ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded border border-emerald-500/25 flex items-center gap-1 w-fit">
                      <Check className="h-3.5 w-3.5" /> Ready to Close
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded border border-amber-500/25 flex items-center gap-1 w-fit">
                      <AlertTriangle className="h-3.5 w-3.5" /> Restrained
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Overview Details and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/25 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold border-b border-slate-800 pb-2">Case Registry Context</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Client Context</span>
                    <p className="font-bold text-base mt-1">
                      {matter.clients?.company_name || `${matter.clients?.first_name} ${matter.clients?.last_name}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{matter.clients?.email}</p>
                    <p className="text-xs text-slate-400">{matter.clients?.phone_number}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Responsible Practitioner</span>
                    <p className="font-bold text-base mt-1">
                      {team[0]?.firm_members?.user_profiles?.[0]
                        ? `${team[0].firm_members.user_profiles[0].first_name} ${team[0].firm_members.user_profiles[0].last_name}`
                        : 'Practice Administrator'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Role: {team[0]?.firm_members?.role || 'Lead Attorney'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Court Jurisdiction</span>
                    <p className="font-semibold text-slate-200 mt-1">{matter.court_jurisdiction}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Compliance Dates</span>
                    <p className="text-slate-200 mt-1">Opened: {new Date(matter.created_at).toLocaleDateString('en-ZA')}</p>
                    {matter.closed_at && (
                      <p className="text-rose-400 font-semibold mt-1">Closed: {new Date(matter.closed_at).toLocaleDateString('en-ZA')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-slate-900/25 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold border-b border-slate-800 pb-2">Quick Commands</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => { setActiveModal('task'); setError(null); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <PlusCircle className="h-4 w-4 text-gold-500" />
                    <span>Assign Matter Task</span>
                  </button>
                  <button
                    onClick={() => { setActiveModal('deadline'); setError(null); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <Calendar className="h-4 w-4 text-gold-500" />
                    <span>Calculate Pleading Deadline</span>
                  </button>
                  <button
                    onClick={() => { setActiveModal('time'); setError(null); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <Clock className="h-4 w-4 text-gold-500" />
                    <span>Record Billable Hours</span>
                  </button>
                  <button
                    onClick={() => { setActiveModal('expense'); setError(null); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <Receipt className="h-4 w-4 text-gold-500" />
                    <span>Record Disbursement (Expense)</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('billing'); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <FileText className="h-4 w-4 text-gold-500" />
                    <span>Compile Tax Invoices</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('closure'); }}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-4 py-2.5 rounded-lg text-xs font-semibold transition text-left"
                  >
                    <FolderClosed className="h-4 w-4 text-gold-500" />
                    <span>Guided Compliance Closure</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Matter Team Roster */}
            <div className="bg-slate-900/25 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold border-b border-slate-800 pb-2 flex items-center gap-2">
                <Users className="text-gold-500 h-5 w-5" /> Matter Pleading Team
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.map((t: any) => (
                  <div key={t.id} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {t.firm_members?.user_profiles?.[0]?.first_name} {t.firm_members?.user_profiles?.[0]?.last_name}
                      </p>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                        {t.firm_members?.role}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 flex items-center gap-0.5 font-bold">
                      <Scale className="h-3 w-3" /> Privileged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-gold-500 h-5 w-5" /> Chronological Activity log
              </h2>
              <button
                onClick={() => { setActiveModal('timeline_event'); setError(null); }}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record Event</span>
              </button>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-xl">
                <Clock className="mx-auto h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 font-semibold">No timeline activity yet.</p>
                <p className="text-xs text-slate-500 mt-1">Use the Record Event button to document filings or consultations.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-800 ml-4 space-y-6 py-2">
                {timeline.map((event) => (
                  <div key={event.id} className="relative pl-6">
                    <div className="absolute top-1.5 left-[-5px] h-2.5 w-2.5 rounded-full bg-gold-500 border border-slate-950 shadow-md shadow-gold-500/25" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-gold-400/90">
                          {new Date(event.event_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span>Filer: {event.creator_name}</span>
                      </div>
                      <h4 className="font-bold text-slate-200">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckSquare className="text-gold-500 h-5 w-5" /> Matter Action Items
              </h2>
              <button
                onClick={() => { setActiveModal('task'); setError(null); }}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Task</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-xl">
                <CheckSquare className="mx-auto h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 font-semibold">All clean! No tasks mapped to this case file.</p>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-450 bg-slate-900/50">
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Complete</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Title / Details</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Assignee</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Due Date</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Status</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {tasks.map((t) => {
                        const isDone = t.status === 'Completed';
                        return (
                          <tr key={t.id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-5">
                              <button
                                onClick={() => handleToggleTask(t.id, t.status)}
                                className="text-gold-500 hover:text-gold-400 transition"
                              >
                                {isDone ? (
                                  <CheckSquare className="h-5 w-5" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-5">
                              <p className={`font-semibold text-slate-200 ${isDone ? 'line-through text-slate-550' : ''}`}>
                                {t.title}
                              </p>
                              {t.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                              )}
                            </td>
                            <td className="py-3 px-5 text-slate-350 text-xs">{t.assigneeName}</td>
                            <td className="py-3 px-5 font-mono text-xs text-slate-300">
                              {new Date(t.dueDate).toLocaleDateString('en-ZA')}
                            </td>
                            <td className="py-3 px-5">
                              {isDone ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25 font-bold">
                                  Completed
                                </span>
                              ) : t.status === 'Overdue' || new Date(t.dueDate) < new Date() ? (
                                <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/25 font-bold">
                                  Overdue
                                </span>
                              ) : (
                                <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/25 font-bold">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-slate-500 hover:text-rose-450 p-1.5 rounded transition"
                              >
                                <Trash2 className="h-4 w-4" />
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
        )}

        {/* 4. DEADLINES TAB */}
        {activeTab === 'deadlines' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="text-gold-500 h-5 w-5" /> Calculated Court Deadlines
              </h2>
              <button
                onClick={() => { setActiveModal('deadline'); setError(null); }}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Calculate Deadline</span>
              </button>
            </div>

            {deadlines.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-xl">
                <Calendar className="mx-auto h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 font-semibold">No court pleading deadlines recorded.</p>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-455 bg-slate-900/50">
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Complete</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Deadline Title</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Calculated Due Date</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Source Event / Skip</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase">Urgency</th>
                        <th className="py-3 px-5 font-semibold text-xs uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {deadlines.map((d) => {
                        const isOverdue = !d.is_completed && new Date(d.calculated_deadline) < new Date();
                        return (
                          <tr key={d.id} className={`hover:bg-slate-900/40 transition ${isOverdue ? 'bg-rose-500/[0.02]' : ''}`}>
                            <td className="py-3 px-5">
                              <button
                                onClick={() => handleToggleDeadline(d.id, d.is_completed)}
                                className="text-gold-500 hover:text-gold-400 transition"
                              >
                                {d.is_completed ? (
                                  <CheckSquare className="h-5 w-5" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-5">
                              <p className={`font-semibold text-slate-200 ${d.is_completed ? 'line-through text-slate-550' : ''}`}>
                                {d.title}
                              </p>
                              {d.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{d.description}</p>
                              )}
                            </td>
                            <td className={`py-3 px-5 font-mono text-xs font-bold ${isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                              {new Date(d.calculated_deadline).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 px-5 text-xs text-slate-400">
                              {d.trigger_event} <span className="text-[10px] text-slate-500">(Skipped {d.days_skipped} non-court days)</span>
                            </td>
                            <td className="py-3 px-5">
                              {d.is_completed ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25 font-bold">
                                  Resolved
                                </span>
                              ) : isOverdue ? (
                                <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded border border-rose-500/25 font-bold animate-pulse">
                                  URGENT OVERDUE
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 font-bold">
                                  Upcoming
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-right">
                              {isOverdue && (
                                <button
                                  onClick={() => handleEscalateDeadline(d.id)}
                                  className="bg-rose-500 hover:bg-rose-600 text-slate-100 font-bold px-2 py-1 rounded text-[10px] uppercase transition shadow-sm"
                                >
                                  Escalate
                                </button>
                              )}
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
        )}

        {/* 5. BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <DollarSign className="text-gold-500 h-5 w-5" /> Case Financial Ledger
                </h2>
                <p className="text-xs text-slate-500 mt-1">LPC compliance matching billable hours, disbursements, and EFT payments.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setActiveModal('time'); setError(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Clock className="h-3.5 w-3.5 text-gold-500" />
                  <span>Log Time</span>
                </button>
                <button
                  onClick={() => { setActiveModal('expense'); setError(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Receipt className="h-3.5 w-3.5 text-gold-500" />
                  <span>Record Expense</span>
                </button>
                <button
                  onClick={() => { setActiveModal('payment'); setError(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <DollarSign className="h-3.5 w-3.5 text-gold-500" />
                  <span>Log Payment</span>
                </button>
              </div>
            </div>

            {/* Unbilled ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unbilled Time Entries */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-slate-300">Unbilled Time Records</h3>
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={isPending || timeEntries.filter(t => !t.isBilled).length === 0}
                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-slate-900 font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition"
                  >
                    Compile Tax Invoice
                  </button>
                </div>

                {timeEntries.filter(t => !t.isBilled).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No unbilled time entries.</p>
                ) : (
                  <div className="divide-y divide-slate-850 max-h-[200px] overflow-y-auto">
                    {timeEntries.filter(t => !t.isBilled).map((entry) => (
                      <div key={entry.id} className="py-2 flex justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{entry.description}</p>
                          <span className="text-[10px] text-slate-500">
                            {entry.duration} mins @ R{entry.rate}/hr | Fee Earner: {entry.fee_earner}
                          </span>
                        </div>
                        <span className="font-mono text-gold-400 font-semibold">
                          R{((entry.duration / 60) * entry.rate).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unbilled Expenses */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-slate-300">Unbilled Disbursements (Expenses)</h3>
                </div>

                {expenses.filter(e => !e.is_billed).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No unbilled disbursements.</p>
                ) : (
                  <div className="divide-y divide-slate-850 max-h-[200px] overflow-y-auto">
                    {expenses.filter(e => !e.is_billed).map((exp) => (
                      <div key={exp.id} className="py-2.5 flex justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{exp.description}</p>
                          <span className="text-[10px] text-slate-500">
                            Logged: {new Date(exp.created_at).toLocaleDateString('en-ZA')}
                          </span>
                        </div>
                        <span className="font-mono text-gold-400 font-semibold">
                          R{Number(exp.amount_zar).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Issued Tax Invoices and Payments ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Issued Invoices */}
              <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-350 border-b border-slate-800 pb-2">Issued Tax Invoices</h3>
                {invoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No invoices issued for this matter.</p>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500">
                          <th className="py-2 px-3">Inv Number</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Excl VAT</th>
                          <th className="py-2 px-3">Incl VAT</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-900/30">
                            <td className="py-2 px-3 font-mono font-bold text-slate-300">{inv.invoice_number}</td>
                            <td className="py-2 px-3 text-slate-450">{new Date(inv.created_at).toLocaleDateString('en-ZA')}</td>
                            <td className="py-2 px-3 font-mono">R{Number(inv.exVat).toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-200">R{Number(inv.incVat).toFixed(2)}</td>
                            <td className="py-2 px-3">
                              {inv.status === 'Paid' ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25 font-bold">
                                  Paid
                                </span>
                              ) : inv.status === 'WrittenOff' ? (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-bold">
                                  Written Off
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 font-bold">
                                  {inv.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments ledger */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-350 border-b border-slate-800 pb-2">Recent Payments Reconciled</h3>
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No payment entries registered.</p>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {payments.map((p) => (
                      <div key={p.id} className="bg-slate-900/40 border border-slate-850 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300">R{Number(p.amount_paid).toFixed(2)}</span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                            {p.payment_method}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Reconciled to: <span className="font-mono text-slate-300">{p.invoice_number}</span></p>
                        <p className="text-[10px] text-slate-500 font-mono">Ref: {p.transaction_reference}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="text-gold-500 h-5 w-5" /> Case Documents
                </h2>
                <p className="text-xs text-slate-550 mt-1">Upload and manage client pleadings, counsel briefs, and mandates.</p>
              </div>
              <Link
                href={`/dashboard/matters/${matterId}/documents`}
                className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-1.5 px-4 rounded-lg text-xs transition"
              >
                Go to Document Version Hub →
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                <FileText className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-sm font-bold text-slate-200">No Documents Uploaded</h3>
                <p className="mt-1 text-xs text-slate-500">Upload pleadings or agreements inside the Document Version Hub.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="bg-slate-900/20 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-200 truncate">{doc.title}</h4>
                        <span className="text-[9px] font-bold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60">
                          {doc.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Status: <span className="capitalize font-semibold text-slate-300">{doc.status}</span>
                      </p>
                      <p className="text-[10px] text-slate-550 mt-0.5">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase ${doc.is_privileged ? 'text-rose-450' : 'text-emerald-450'}`}>
                        {doc.is_privileged ? 'Privileged' : 'Discoverable'}
                      </span>
                      <Link
                        href={`/dashboard/matters/${matterId}/documents`}
                        className="text-[11px] font-bold text-gold-500 hover:text-gold-400 transition"
                      >
                        Manage File →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI SUMMARY TAB */}
        {activeTab === 'ai_summary' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-gold-500 h-5 w-5 animate-pulse" /> AI Summary & Document Intelligence
              </h2>
              <p className="text-xs text-slate-550 mt-1">Review, approve, or reject draft AI-generated summaries and source-cited analysis.</p>
            </div>

            {aiOutputs.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                <Sparkles className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-sm font-bold text-slate-200">No AI Summaries Generated</h3>
                <p className="mt-1 text-xs text-slate-500">Extract text from documents in the Document Hub to trigger AI summarization.</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                {aiOutputs.map((output: any) => (
                  <AiSummaryPanel
                    key={output.id}
                    output={output}
                    onApprove={handleApproveAiSummary}
                    onReject={handleRejectAiSummary}
                    isActionPending={isAiActionPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* READINESS TAB */}
        {activeTab === 'readiness' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Scale className="text-gold-500 h-5 w-5" /> LPC Compliance & Case Readiness
              </h2>
              <p className="text-xs text-slate-550 mt-1">Scan case folders to evaluate FICA/POPIA mandates, open actions, and trust ledgers.</p>
            </div>

            {readinessCheck ? (
              <MatterReadinessScoreboard
                score={Number(readinessCheck.score)}
                status={readinessCheck.status}
                lastCheckedAt={readinessCheck.checked_at}
                items={readinessItems}
                onRerunCheck={handleRerunReadiness}
                isRerunning={isRerunningReadiness}
              />
            ) : (
              <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                <Scale className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-sm font-bold text-slate-200">No Compliance Scan Found</h3>
                <p className="mt-1 text-xs text-slate-500 mb-4">Run a compliance audit to calculate case health scores and identify blockers.</p>
                <button
                  type="button"
                  onClick={handleRerunReadiness}
                  disabled={isRerunningReadiness}
                  className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-2 px-6 rounded-lg text-xs disabled:opacity-50 transition inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${isRerunningReadiness ? 'animate-spin' : ''}`} />
                  {isRerunningReadiness ? 'Scanning Case Folder...' : 'Run Compliance Scan'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. CLOSE MATTER TAB */}
        {activeTab === 'closure' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FolderClosed className="text-gold-500 h-5 w-5" /> LPC Guided Case Closure Checklist
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review validation gates and POPIA guidelines prior to locking the case file.</p>
            </div>

            {matter.status === 'Closed' ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-6 rounded-xl flex items-start gap-4">
                <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-base">This Case File is Officially Closed</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Closed At: {new Date(matter.closed_at).toLocaleString('en-ZA')}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5 font-semibold">
                    Reason: {matter.closure_reason}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs text-slate-500">
                    <p>Client Communication: <span className="text-slate-300 font-semibold">{matter.client_communication_status}</span></p>
                    <p>Document Archive: <span className="text-slate-300 font-semibold">{matter.document_archive_status}</span></p>
                    <p>Retention Acknowledged: <span className="text-slate-300 font-semibold">Yes</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column: Visual Checklist */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">LPC Validation Gates</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Secure Tenant Scoping', check: checkMatterStatus },
                      { label: 'Matter is Active', check: checkMatterStatus },
                      { label: 'All Tasks Completed', check: checkIncompleteTasks },
                      { label: 'All Deadlines Completed', check: checkOpenDeadlines },
                      { label: 'All Invoices Settled', check: checkUnpaidInvoices },
                      { label: 'No Unbilled Time', check: checkUnbilledTime },
                      { label: 'No Unbilled Expenses', check: checkUnbilledExpenses }
                    ].map((gate, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 p-3 rounded-lg text-xs">
                        <span className="text-slate-300 font-medium">{gate.label}</span>
                        {gate.check ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold text-[10px] uppercase">
                            <Check className="h-3.5 w-3.5" /> Satisfied
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-0.5 font-bold text-[10px] uppercase">
                            <AlertCircle className="h-3.5 w-3.5" /> Blocked
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column: Guided Closure Form */}
                <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800 rounded-xl p-6 space-y-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Compliance Closure Form</h3>
                  
                  {!isClosureReady && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg text-xs flex gap-2">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-bold">Case Closure Restrained</p>
                        <p className="mt-0.5 text-slate-400">You must resolve all outstanding tasks, deadlines, and billing balances before closure is allowed by the platform registry.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCloseMatter} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
                        Closure Reason (Minimum 10 characters) *
                      </label>
                      <textarea
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        placeholder="Provide detailed LPC closure justification..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                        disabled={!isClosureReady || isPending}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
                        Internal Closure Notes
                      </label>
                      <textarea
                        value={closeNotes}
                        onChange={(e) => setCloseNotes(e.target.value)}
                        placeholder="Optional details, archives location reference..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        disabled={!isClosureReady || isPending}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
                          Client Communication Confirmation *
                        </label>
                        <select
                          value={closeClientComm}
                          onChange={(e: any) => setCloseClientComm(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                          disabled={!isClosureReady || isPending}
                        >
                          <option value="Notified">Notified (Written Notice sent)</option>
                          <option value="Acknowledged">Acknowledged (Client confirmed receipt)</option>
                          <option value="Waived">Waived (No communication required)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-450 mb-2">
                          Document Archive Status *
                        </label>
                        <select
                          value={closeDocArchive}
                          onChange={(e: any) => setCloseDocArchive(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                          disabled={!isClosureReady || isPending}
                        >
                          <option value="Archived">Archived (Offsite storage / secure cloud)</option>
                          <option value="Quarantined">Quarantined (Retention schedule active)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="retentionConfirm"
                        checked={closeRetentionConfirm}
                        onChange={(e) => setCloseRetentionConfirm(e.target.checked)}
                        className="mt-0.5 accent-gold-500"
                        required
                        disabled={!isClosureReady || isPending}
                      />
                      <label htmlFor="retentionConfirm" className="text-xs text-slate-400 select-none">
                        I confirm that the POPIA data-retention policy is acknowledged, and client records will be securely preserved according to legal timelines. *
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!isClosureReady || isPending}
                      className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-slate-900 font-bold px-4 py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2"
                    >
                      <FolderClosed className="h-4 w-4" />
                      <span>{isPending ? 'Verifying Compliance...' : 'Officially Close Case Folder'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Modal Dialog Overlays */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/60">
              <h3 className="font-bold text-base text-slate-200">
                {activeModal === 'task' && 'Assign Matter Task'}
                {activeModal === 'deadline' && 'Calculate Court Pleading Deadline'}
                {activeModal === 'time' && 'Record Billable hours'}
                {activeModal === 'expense' && 'Record Disbursement (Expense)'}
                {activeModal === 'payment' && 'Register EFT Payment Log'}
                {activeModal === 'timeline_event' && 'Record timeline Event'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5">
              {/* 1. Add Task Form */}
              {activeModal === 'task' && (
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Task Title *</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Draft answering affidavit"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Specify pleadings details or exhibits..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Due Date *</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Assign To Team Member</label>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      >
                        <option value="">Unassigned</option>
                        {team.map((t: any) => (
                          <option key={t.firm_members?.id} value={t.firm_members?.id}>
                            {t.firm_members?.user_profiles?.[0]?.first_name} {t.firm_members?.user_profiles?.[0]?.last_name} ({t.firm_members?.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Create Task
                    </button>
                  </div>
                </form>
              )}

              {/* 2. Add Deadline Form */}
              {activeModal === 'deadline' && (
                <form onSubmit={handleAddDeadline} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Deadline Title *</label>
                    <input
                      type="text"
                      value={dlTitle}
                      onChange={(e) => setDlTitle(e.target.value)}
                      placeholder="e.g. Notice to Plead Deadline"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Triggering Court Event *</label>
                    <input
                      type="text"
                      value={dlTriggerEvent}
                      onChange={(e) => setDlTriggerEvent(e.target.value)}
                      placeholder="e.g. Service of Summons"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Trigger Date *</label>
                      <input
                        type="date"
                        value={dlTriggerDate}
                        onChange={(e) => setDlTriggerDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Court Days Count *</label>
                      <input
                        type="number"
                        value={dlCourtDays}
                        onChange={(e) => setDlCourtDays(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    The platform automatically calculates the court days deadline skipping SA weekends, public holidays, and the December recess period in accordance with the High Court Rules.
                  </p>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Calculate
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Record Time Entry Form */}
              {activeModal === 'time' && (
                <form onSubmit={handleRecordTime} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Duration (Minutes) *</label>
                      <input
                        type="number"
                        value={timeDuration}
                        onChange={(e) => setTimeDuration(e.target.value)}
                        placeholder="60"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Hourly Rate (ZAR) *</label>
                      <input
                        type="number"
                        value={timeRate}
                        onChange={(e) => setTimeRate(e.target.value)}
                        placeholder="1500"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Work Description *</label>
                    <textarea
                      value={timeDesc}
                      onChange={(e) => setTimeDesc(e.target.value)}
                      placeholder="e.g. Consulted client regarding plea, drafting response..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Log Time
                    </button>
                  </div>
                </form>
              )}

              {/* 4. Record Expense Form */}
              {activeModal === 'expense' && (
                <form onSubmit={handleRecordExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Disbursement Amount (ZAR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="450.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Disbursement Description *</label>
                    <textarea
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      placeholder="e.g. Sheriff service fee for subpoena..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Record Expense
                    </button>
                  </div>
                </form>
              )}

              {/* 5. Record Payment Form */}
              {activeModal === 'payment' && (
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Target Invoice Reference *</label>
                    <select
                      value={payInvoiceId}
                      onChange={(e) => setPayInvoiceId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    >
                      {invoices.filter((i: any) => i.status !== 'Paid' && i.status !== 'WrittenOff').map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} (Outstanding: R{Number(inv.incVat).toFixed(2)})
                        </option>
                      ))}
                      {invoices.filter((i: any) => i.status !== 'Paid' && i.status !== 'WrittenOff').length === 0 && (
                        <option value="">No outstanding invoices issued.</option>
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Amount Paid (ZAR) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="2500.00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                        min={0.01}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Payment Method *</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                      >
                        <option value="EFT">EFT (Electronic Funds Transfer)</option>
                        <option value="CreditCard">Credit Card</option>
                        <option value="Cash">Cash Deposit</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Transaction reference / EFT confirmation ref *</label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g. ABSA-CONF-88998"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !payInvoiceId}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Log Payment
                    </button>
                  </div>
                </form>
              )}

              {/* 6. Add Timeline Event Form */}
              {activeModal === 'timeline_event' && (
                <form onSubmit={handleAddTimelineEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Title *</label>
                      <input
                        type="text"
                        value={tleTitle}
                        onChange={(e) => setTaskTitle(e.target.value)} // Wait, use tleTitle instead!
                        className="hidden"
                      />
                      <input
                        type="text"
                        value={tleTitle}
                        onChange={(e) => setTleTitle(e.target.value)}
                        placeholder="e.g. Consulted with Senior Counsel"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Date *</label>
                      <input
                        type="date"
                        value={tleDate}
                        onChange={(e) => setTleDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Event Details</label>
                    <textarea
                      value={tleDesc}
                      onChange={(e) => setTleDesc(e.target.value)}
                      placeholder="Optional notes, filings references..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="border border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 transition"
                    >
                      Record Event
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
