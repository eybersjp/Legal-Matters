'use client';

import { useEffect, useState, useTransition } from 'react';
import { getMatterDetails } from '@/server/actions/matter.actions';
import { getMatterTimeline, addTimelineEvent } from '@/server/actions/timeline.actions';
import { Scale, Clock, Plus, ArrowLeft, Users, History, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function MatterDetailsPage({ params }: { params: { id: string } }) {
  const [details, setDetails] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');

  const loadData = async () => {
    try {
      const matDetails = await getMatterDetails(params.id);
      setDetails(matDetails);
      const matTimeline = await getMatterTimeline(params.id);
      setTimeline(matTimeline);
    } catch (err: any) {
      setError(err.message || 'Failed to load case folder.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await addTimelineEvent({
        matterId: params.id,
        title,
        description,
        eventDate: new Date(eventDate).toISOString(),
      });

      if (res.success) {
        setShowAddEvent(false);
        setTitle('');
        setDescription('');
        setEventDate('');
        loadData();
      } else {
        setError(res.error || 'Failed to append event.');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Scale className="animate-spin text-gold-500 h-10 w-10" />
        <p className="text-sm text-slate-400">Opening secure case folder...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md mx-auto mt-12">
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

  return (
    <div className="space-y-8">
      {/* Header and navigation back */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/matters" className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Case Folder & Timeline
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{matter.title}</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Timeline Events Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="text-gold-500 h-5 w-5" /> Activity Timeline
            </h2>
            <button
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Event</span>
            </button>
          </div>

          {/* Add Event Panel */}
          {showAddEvent && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3">Record Pleading or Filing Action</h3>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Event Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Filed Notice of Motion"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Additional Details</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                    disabled={isPending}
                  >
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Timeline Feed Render */}
          {timeline.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Clock className="mx-auto h-10 w-10 text-slate-350 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">Timeline is currently clean. Start recording pleadings or filing details.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6">
              {timeline.map((event) => (
                <div key={event.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute top-1 left-[-5px] h-2.5 w-2.5 rounded-full bg-gold-500 border-2 border-white dark:border-slate-950" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gold-400">
                        {new Date(event.event_date).toLocaleDateString('en-ZA')}
                      </span>
                      <span className="text-slate-400">By: {event.creator_name}</span>
                    </div>
                    <h4 className="font-bold text-base">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Matter Details Card & Assigned Team */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Case Summary</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Client Link</span>
                <p className="font-semibold">
                  {matter.clients?.company_name || `${matter.clients?.first_name} ${matter.clients?.last_name}`}
                </p>
                <p className="text-xs text-slate-400">{matter.clients?.email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Jurisdiction / Court</span>
                <p className="font-semibold">{matter.court_jurisdiction}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Case Reference</span>
                <p className="font-mono">{matter.case_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Status</span>
                <p className="font-semibold text-gold-400">{matter.status}</p>
              </div>
            </div>
          </div>

          {/* Assigned Matter Team */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Users className="text-gold-500 h-5 w-5" /> Matter Pleading Team
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {team.map((t: any) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {t.firm_members?.user_profiles?.[0]?.first_name} {t.firm_members?.user_profiles?.[0]?.last_name}
                    </p>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {t.firm_members?.role}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 flex items-center gap-0.5 font-semibold">
                    <Scale className="h-3 w-3" /> Privileged
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
