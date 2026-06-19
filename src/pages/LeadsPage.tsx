import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Star, MapPin, Search, Phone,
  CheckCircle2, Clock, XCircle, RotateCcw,
  ChevronDown, ExternalLink, User,
  RefreshCw, AlertCircle, Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import type { Lead, CallLogEntry, CallOutcome } from '../types';
import { generateId } from '../utils/storage';
import {
  fetchLeadsFromSheet,
  updateLeadInSheet,
  signIn,
  isSignedIn,
  waitForGis,
  initTokenClient,
  ensureHeaderColumns,
} from '../lib/googleSheets';

type FilterMode = 'all' | 'not_called' | 'today' | 'callback' | 'completed';

const FILTER_TABS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_called', label: 'Not Called' },
  { key: 'today', label: 'Called Today' },
  { key: 'callback', label: 'Needs Callback' },
  { key: 'completed', label: 'Completed' },
];

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 size={20} />, color: 'text-green-600 bg-green-100' },
  { value: 'no_answer', label: 'No Answer', icon: <XCircle size={20} />, color: 'text-amber-600 bg-amber-100' },
  { value: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={20} />, color: 'text-red-600 bg-red-100' },
  { value: 'callback', label: 'Callback', icon: <RotateCcw size={20} />, color: 'text-blue-600 bg-blue-100' },
];

/** Extracts the review count from the Places API JSON blob in the sheet. */
function ReviewCount({ raw }: { raw: string }) {
  let count = raw.trim();
  // If it looks like a JSON array, extract its length
  if (raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) count = parsed.length.toString();
    } catch { /* fall through */ }
  }
  return <span className="text-gray-400">({count})</span>;
}

export function LeadsPage() {
  const { state, dispatch, currentUser } = useApp();
  const isOwner = currentUser?.role === 'owner';
  if (!isOwner) return null;

  // ── Leads come from Firestore (synced via onSnapshot) ──
  const leadsFromFirestore = state.leads;
  const hasLeads = leadsFromFirestore.length > 0;

  // ── Sheets import state (only needed when Firestore is empty) ──
  const [importingFromSheets, setImportingFromSheets] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  // ── Data state ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── UI state ──
  const [filter, setFilter] = useState<FilterMode>('all');
  const [outcomeLead, setOutcomeLead] = useState<Lead | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome>('completed');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Call logs from Firestore (real-time)
  const callLogs = state.callLogs;

  // ── Sync leads from Firestore into local state ──
  useEffect(() => {
    setLeads(leadsFromFirestore);
  }, [leadsFromFirestore]);

  // ── Pre-load GIS lib (in background) so it's ready if needed ──
  useEffect(() => {
    if (!hasLeads) {
      waitForGis().then(initTokenClient).catch(() => {});
    }
  }, [hasLeads]);

  // ── Import leads from Google Sheets ──
  const importLeadsFromSheets = useCallback(async () => {
    setImportingFromSheets(true);
    try {
      await ensureHeaderColumns();
      const sheetLeads = await fetchLeadsFromSheet();
      // Save to Firestore via customDispatch → syncActionToFirestore
      dispatch({ type: 'SET_LEADS', payload: sheetLeads });
      toast.success(`Imported ${sheetLeads.length} leads`);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        setNeedsAuth(true);
      } else {
        toast.error('Failed to load leads from sheet');
        console.error(err);
      }
    } finally {
      setImportingFromSheets(false);
    }
  }, [dispatch]);

  // ── Build map of leadId → latest call ──
  const latestCallsMap = useMemo(() => {
    const map = new Map<string, CallLogEntry>();
    for (const log of callLogs) {
      const existing = map.get(log.leadId);
      if (!existing || new Date(log.calledAt) > new Date(existing.calledAt)) {
        map.set(log.leadId, log);
      }
    }
    return map;
  }, [callLogs]);

  // ── Derive daily called lead IDs ──
  const todayLeadIds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Set(
      callLogs
        .filter(log => new Date(log.calledAt) >= today)
        .map(log => log.leadId)
    );
  }, [callLogs]);

  // ── Merge leads with call data and apply filters ──
  const mergedLeads = useMemo(() => {
    let result = leads.map(lead => ({
      ...lead,
      latestCall: latestCallsMap.get(lead.placeId) || null,
    }));

    // Filter
    switch (filter) {
      case 'not_called':
        result = result.filter(l => !l.latestCall);
        break;
      case 'today':
        result = result.filter(l => l.latestCall && todayLeadIds.has(l.placeId));
        break;
      case 'callback':
        result = result.filter(l => l.latestCall?.outcome === 'callback');
        break;
      case 'completed':
        result = result.filter(l => l.latestCall?.outcome === 'completed');
        break;
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.address.toLowerCase().includes(q)
      );
    }

    // Sort: uncalled first, then by rating desc
    result.sort((a, b) => {
      const aCalled = a.latestCall ? 1 : 0;
      const bCalled = b.latestCall ? 1 : 0;
      if (aCalled !== bCalled) return aCalled - bCalled;
      return parseFloat(b.rating) - parseFloat(a.rating);
    });

    return result;
  }, [leads, latestCallsMap, filter, searchQuery, todayLeadIds]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = leads.length;
    const notCalled = leads.filter(l => !latestCallsMap.has(l.placeId)).length;
    const calledToday = callLogs.filter(l => todayLeadIds.has(l.leadId)).length;
    const callbacks = callLogs.filter(l => l.outcome === 'callback' && !todayLeadIds.has(l.leadId)).length;
    const completed = callLogs.filter(l => l.outcome === 'completed').length;
    return { total, notCalled, calledToday, callbacks, completed };
  }, [leads, latestCallsMap, callLogs, todayLeadIds]);

  // ── Connect to Google & import ──
  const handleConnect = async () => {
    setAuthInProgress(true);
    try {
      await waitForGis();
      initTokenClient();
      await signIn();
      setNeedsAuth(false);
      await importLeadsFromSheets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect');
    } finally {
      setAuthInProgress(false);
    }
  };

  // ── Handle call outcome ──
  const handleSaveOutcome = async () => {
    if (!outcomeLead || !currentUser) return;
    setSavingOutcome(true);
    try {
      const entry: CallLogEntry = {
        id: generateId(),
        leadId: outcomeLead.placeId,
        businessName: outcomeLead.businessName,
        phone: outcomeLead.phone,
        sheetRowIndex: outcomeLead.rowIndex,
        calledById: currentUser.id,
        calledByName: currentUser.name,
        calledAt: new Date().toISOString(),
        outcome,
        notes: outcomeNotes,
        createdAt: new Date().toISOString(),
      };

      // 1. Save to Firestore (real-time sync)
      dispatch({ type: 'ADD_CALL_LOG', payload: entry });

      // 2. Write back to sheet (fire-and-forget but catch errors)
      updateLeadInSheet(outcomeLead.rowIndex, outcome, currentUser.name, outcomeNotes)
        .catch(err => console.warn('Sheet write failed:', err));

      toast.success('Call logged');
      setOutcomeLead(null);
      setOutcome('completed');
      setOutcomeNotes('');
    } catch (err) {
      toast.error('Failed to save outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  // ── Render ──
  if (!hasLeads && needsAuth) {
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[70vh]">
          <Card className="max-w-md w-full text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Database size={40} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Leads Call Center</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                No leads found in your workspace. Connect to Google Sheets to import leads from your "Results" tab.
                Once imported, all owners will see the same leads — no need to connect again.
              </p>
              <Button
                icon={ExternalLink}
                onClick={handleConnect}
                disabled={authInProgress}
                size="lg"
                className="mt-4"
              >
                {authInProgress ? 'Connecting...' : 'Connect Google Sheets'}
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!hasLeads && importingFromSheets) {
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-sm">Importing leads from Google Sheets...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasLeads && !needsAuth) {
    // GIS loaded but no leads yet — waiting for user to connect
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Database size={32} className="opacity-50" />
            <p className="text-sm">Ready to connect. Click the button above to import leads.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Leads Call Center">
      <div className="page-container flex flex-col gap-6 pb-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Leads" value={stats.total.toString()} icon={Building2} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard label="Not Called" value={stats.notCalled.toString()} icon={Phone} iconColor="text-red-600" iconBg="bg-red-100" />
          <StatCard label="Called Today" value={stats.calledToday.toString()} icon={Clock} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard label="Callbacks" value={stats.callbacks.toString()} icon={RotateCcw} iconColor="text-amber-600" iconBg="bg-amber-100" />
          <StatCard label="Completed" value={stats.completed.toString()} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Refresh from Sheets (only shown when leads exist in Firestore) */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {mergedLeads.length} of {leads.length} leads
          </p>
          <button
            onClick={importLeadsFromSheets}
            disabled={importingFromSheets}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={importingFromSheets ? 'animate-spin' : ''} />
            {importingFromSheets ? 'Importing...' : 'Refresh from Sheets'}
          </button>
        </div>

        {/* Lead Cards */}
        {mergedLeads.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <Building2 size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search term.' : 'All leads have been processed.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {mergedLeads.map(lead => {
              const latestCall = lead.latestCall;
              const calledToday = latestCall && todayLeadIds.has(lead.placeId);
              const isExpanded = expandedId === lead.placeId;
              const leadCallLogs = callLogs.filter(l => l.leadId === lead.placeId);

              const statusBadge = !latestCall
                ? <Badge label="Not Called" variant="danger" className="text-[10px]" />
                : latestCall.outcome === 'completed'
                  ? <Badge label="Completed" variant="success" className="text-[10px]" />
                  : latestCall.outcome === 'no_answer'
                    ? <Badge label="No Answer" variant="warning" className="text-[10px]" />
                    : latestCall.outcome === 'wrong_number'
                      ? <Badge label="Wrong Number" variant="danger" className="text-[10px]" />
                      : <Badge label="Callback" variant="info" className="text-[10px]" />;

              return (
                <Card key={lead.placeId} className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-3">
                    {/* Main row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{lead.businessName || 'Unknown Business'}</h3>
                          {statusBadge}
                          {calledToday && <Badge label="Called Today" variant="success" className="text-[10px]" />}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                              <Phone size={12} />
                              {lead.phone}
                            </a>
                          )}
                          {lead.rating && (
                            <span className="flex items-center gap-1">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              {lead.rating}
                              {lead.reviews ? (
                                <ReviewCount raw={lead.reviews} />
                              ) : null}
                            </span>
                          )}
                          {lead.address && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin size={12} />
                              {lead.address}
                            </span>
                          )}
                          {lead.type && (
                            <span className="text-gray-400">{lead.type}</span>
                          )}
                        </div>

                        {latestCall && (
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <User size={11} />
                            Called by {latestCall.calledByName} · {new Date(latestCall.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={`tel:${lead.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          onClick={() => {
                            // Show outcome modal after a brief delay to let the tel: link fire
                            setTimeout(() => setOutcomeLead(lead), 500);
                          }}
                        >
                          <Phone size={14} />
                          Call
                        </a>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : lead.placeId)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={16} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Call history */}
                    {isExpanded && leadCallLogs.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-1">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call History</h4>
                        <div className="space-y-2">
                          {leadCallLogs.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime()).map(log => (
                            <div key={log.id} className="flex items-start gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5">
                              <div className={`p-1.5 rounded-full flex-shrink-0 ${
                                log.outcome === 'completed' ? 'bg-green-100 text-green-600'
                                : log.outcome === 'no_answer' ? 'bg-amber-100 text-amber-600'
                                : log.outcome === 'wrong_number' ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                              }`}>
                                {log.outcome === 'completed' ? <CheckCircle2 size={14} />
                                  : log.outcome === 'no_answer' ? <XCircle size={14} />
                                  : log.outcome === 'wrong_number' ? <AlertCircle size={14} />
                                  : <RotateCcw size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-700">
                                  {log.calledByName} — {log.outcome.replace('_', ' ')}
                                </p>
                                <p className="text-gray-400 mt-0.5">
                                  {new Date(log.calledAt).toLocaleDateString('en-CA', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                  })}
                                </p>
                                {log.notes && <p className="text-gray-500 mt-0.5 italic">"{log.notes}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Outcome Modal */}
      <Modal isOpen={!!outcomeLead} onClose={() => { setOutcomeLead(null); setOutcomeNotes(''); }} title="Log Call Outcome" size="md">
        {outcomeLead && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900">{outcomeLead.businessName}</h4>
              <a href={`tel:${outcomeLead.phone}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1">
                <Phone size={12} /> {outcomeLead.phone}
              </a>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">How did the call go?</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOutcome(opt.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      outcome === opt.value
                        ? `${opt.color} border-current`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
              <textarea
                value={outcomeNotes}
                onChange={e => setOutcomeNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Any notes about the call…"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setOutcomeLead(null); setOutcomeNotes(''); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveOutcome} disabled={savingOutcome}>
                {savingOutcome ? 'Saving...' : 'Save Outcome'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
