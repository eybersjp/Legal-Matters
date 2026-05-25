'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { getSystemAuditLogs } from '@/server/actions/audit.actions';
import { History, ShieldAlert, Scale, Search, Eye } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const auditList = await getSystemAuditLogs();
        setLogs(auditList);
      } catch (err: any) {
        setError(err.message || 'Unauthorized Access.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Syncing secure compliance ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md mx-auto mt-12 shadow-sm">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold mb-1">Access Restrained</h3>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <Link href="/dashboard" className="text-gold-500 font-bold hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">POPIA Compliance Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Unalterable chronological ledger recording PII accesses, auth logins, and data modifications
        </p>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 max-w-md">
        <Search className="text-slate-400 h-5 w-5 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Actor, Action, or Resource..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Side: Audit Logs Table */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 font-semibold">Timestamp</th>
                  <th className="py-4 px-6 font-semibold">User (Actor)</th>
                  <th className="py-4 px-6 font-semibold">Action Type</th>
                  <th className="py-4 px-6 font-semibold">Resource</th>
                  <th className="py-4 px-6 font-semibold">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 text-xs font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-ZA')}
                    </td>
                    <td className="py-4 px-6 font-medium">{log.userName}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        log.action === 'READ_PII' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs uppercase font-mono text-slate-400">{log.resource}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-gold-500 hover:text-gold-600 transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Log Metadata Details Inspector */}
        <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 h-fit">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <History className="text-gold-500 h-6 w-6" />
            <h2 className="text-lg font-bold">Metadata Inspector</h2>
          </div>

          {selectedLog ? (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Event ID</span>
                <p className="font-mono text-xs mt-0.5">{selectedLog.id}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Resource Reference UUID</span>
                <p className="font-mono text-xs mt-0.5">{selectedLog.resourceId}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Client IP & Agent</span>
                <p className="text-xs mt-0.5 font-mono">{selectedLog.ipAddress || 'System Internal'}</p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{selectedLog.userAgent || 'None'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Captured Data Changes</span>
                <pre className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-xs font-mono mt-1 overflow-x-auto text-gold-400 max-h-60">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Select an audit event from the ledger to inspect parameters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
