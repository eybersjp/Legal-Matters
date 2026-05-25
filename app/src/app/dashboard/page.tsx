'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getDashboardStats, getUpcomingDeadlines, getRecentAuditLogs } from '@/server/actions/dashboard.actions';
import { Scale, Users, FileText, Landmark, Clock, AlertTriangle, ArrowRight, ShieldCheck, Cpu, Terminal, Key } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const s = await getDashboardStats();
      setStats(s);

      const d = await getUpcomingDeadlines();
      setDeadlines(d);

      const l = await getRecentAuditLogs();
      setLogs(l);
    } catch (err: any) {
      setError(err.message || 'Failed to load practitioner dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-450 tracking-wider font-mono">Deciphering practice database telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-gold-400 bg-clip-text text-transparent">
            Practice Control Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
            LPA SECTION 86 & POPIA 2013 CO-PILOT ACTIVE
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-slate-900 border border-slate-800 text-xs px-3.5 py-2 rounded-lg font-mono text-slate-400 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gold-500" />
            <span>FICA Engine: v1.0.4</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Premium Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Item 1: Firm Welcome & Certificate Status (Colspan 2) */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl group-hover:bg-gold-500/10 transition duration-500" />
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-500 flex items-center gap-1.5">
              <Key className="h-3 w-3" /> System Security Key Established
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Sovereign Practice Vault
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Your firm database is successfully locked with strict Supabase Row Level Security (RLS). Personal data accesses are logged to compliant ledger indexes automatically.
            </p>
          </div>

          <div className="flex gap-3 mt-4 border-t border-slate-900 pt-4">
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> FICA Verified
            </span>
            <span className="text-[10px] text-gold-400 bg-gold-500/10 px-2.5 py-1 rounded border border-gold-500/20 font-bold flex items-center gap-1">
              <Scale className="h-3 w-3" /> LPC Certified
            </span>
          </div>
        </div>

        {/* Item 2: Trust Ledger investment (Colspan 2) */}
        <Link href="/dashboard/trust" className="md:col-span-2 bg-slate-900 border-2 border-gold-500/30 hover:border-gold-500 rounded-2xl p-6 flex flex-col justify-between min-h-[200px] transition group relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-gold-500/10 rounded-full blur-2xl group-hover:bg-gold-500/20 transition duration-300" />
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 justify-between">
              <span>Section 86 Trust Ledger</span>
              <Landmark className="h-4 w-4 text-gold-500" />
            </span>
            <div className="text-3xl font-extrabold font-mono text-gold-400 group-hover:text-gold-300 transition mt-2">
              R{(stats?.totalTrustZar || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5">
              Practice-held trust account liability aggregated across compliant investments.
            </p>
          </div>

          <span className="text-xs text-gold-500 group-hover:text-gold-400 font-bold flex items-center gap-1 mt-4 transition">
            Access Trust Accounts <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition duration-300" />
          </span>
        </Link>

        {/* Item 3: Active Folders Stats (Colspan 1) */}
        <Link href="/dashboard/matters" className="bg-slate-900/60 border border-slate-800 hover:border-gold-500/20 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] transition group">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Matters</span>
            <FileText className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <div className="text-3xl font-bold font-mono text-white mt-2">
              {stats?.totalMatters || 0}
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Open case folders in litigation</p>
          </div>
        </Link>

        {/* Item 4: FICA Clients Stats (Colspan 1) */}
        <Link href="/dashboard/clients" className="bg-slate-900/60 border border-slate-800 hover:border-gold-500/20 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] transition group">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">FICA Clients</span>
            <Users className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <div className="text-3xl font-bold font-mono text-white mt-2">
              {stats?.totalClients || 0}
            </div>
            <p className="text-[9px] text-slate-500 mt-1">POPIA consent-tracked profiles</p>
          </div>
        </Link>

        {/* Item 5: Billable Fees Stats (Colspan 1) */}
        <Link href="/dashboard/time" className="bg-slate-900/60 border border-slate-800 hover:border-gold-500/20 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] transition group">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Unbilled Fees</span>
            <Clock className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white mt-2">
              R{(stats?.totalBillableZar || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Captured billable consult hours</p>
          </div>
        </Link>

        {/* Item 6: POPIA Data Security Badge (Colspan 1) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Privacy Moat</span>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              POPIA Secured
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Client read-access logs enforced</p>
          </div>
        </div>

        {/* Item 7: Impending Court Litigation Calendar (Colspan 2, Rowspan 2) */}
        <div className="md:col-span-2 md:row-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
          <div className="space-y-4 w-full">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <AlertTriangle className="text-gold-500 h-4 w-4" /> Impending Court Days
              </h3>
              <Link href="/dashboard/deadlines" className="text-[10px] font-bold text-gold-500 hover:text-gold-400 flex items-center gap-1 transition">
                Court Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {deadlines.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No active litigation deadlines calculated.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {deadlines.map((d) => (
                  <div key={d.id} className="flex justify-between items-center bg-slate-950/80 p-3 border border-slate-850 rounded-xl hover:border-gold-500/10 transition">
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{d.title}</h4>
                      <p className="text-[9px] text-slate-450 font-medium">
                        {d.matterTitle}
                      </p>
                    </div>
                    <span className="text-[10px] text-gold-400 font-mono font-bold bg-gold-500/5 px-2.5 py-1 rounded border border-gold-500/10 shrink-0">
                      {new Date(d.deadline).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Item 8: Compliance Telemetry Terminal / Audit Trail (Colspan 2, Rowspan 2) */}
        <div className="md:col-span-2 md:row-span-2 bg-black border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[300px] font-mono">
          <div className="space-y-4 w-full">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal className="text-gold-500 h-4.5 w-4.5" /> Security Telemetry Logs
              </h3>
              <Link href="/dashboard/audit" className="text-[9px] font-bold text-slate-500 hover:text-gold-500 flex items-center gap-0.5 transition">
                Audit Trail <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-650 text-xs">
                System idle. No security logs buffered.
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto text-[10px] text-slate-300">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start gap-4 border-b border-slate-900 pb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold shrink-0">▶</span>
                        <span className="text-gold-400 font-bold uppercase text-[9px] tracking-wide">{log.action}</span>
                      </div>
                      <p className="text-slate-500 text-[9px] pl-3">
                        Target: {log.resource.toUpperCase()} • Actor: {log.actor}
                      </p>
                    </div>

                    <span className="text-slate-600 text-[8px] tracking-wider text-right font-medium shrink-0 pt-0.5">
                      {new Date(log.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
