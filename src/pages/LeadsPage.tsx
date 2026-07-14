import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Phone, Clock, CheckCircle2, RotateCcw,
  ExternalLink, RefreshCw, Database, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { LeadCard } from '../components/leads/LeadCard';
import { LeadFilters, FILTER_OPTIONS } from '../components/leads/LeadFilters';
import { CallOutcomeModal } from '../components/leads/CallOutcomeModal';
import type { Lead, CallLogEntry, CallOutcome, EmailLog } from '../types';
import { generateId } from '../utils/storage';
import {
  fetchLeadsFromSheet,
  updateLeadInSheet,
  signIn,
  isSignedIn,
  waitForGis,
  initTokenClient,
  ensureHeaderColumns,
  syncCategoriesToSheet,
  scrapeLeadsFromMaps,
  backfillPlaceIds,
} from '../lib/googleSheets';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FilterMode = 'all' | 'not_called' | 'today' | 'callback' | 'completed' | 'no_answer' | 'wrong_number';

function getTemplateCategory(leadType: string): string {
  const t = leadType.toLowerCase();
  if (t.includes('dental') || t.includes('medical') || t.includes('physio') || t.includes('vet')) return 'medical';
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return 'professional';
  return 'general';
}

export function LeadsPage() {
  const { state, dispatch, currentUser } = useApp();
  const isOwner = currentUser?.role === 'owner';
  if (!isOwner) return null;

  const leadsFromFirestore = state.leads;
  const hasLeads = leadsFromFirestore.length > 0;

  const [importingFromSheets, setImportingFromSheets] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [filter, setFilter] = useState<FilterMode>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [outcomeLead, setOutcomeLead] = useState<Lead | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome>('completed');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<Record<string, string>>({});
  const [editingEmailFor, setEditingEmailFor] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [copyingLeadId, setCopyingLeadId] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [editingCallLogId, setEditingCallLogId] = useState<string | null>(null);
  const [syncingCategories, setSyncingCategories] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const callLogs = state.callLogs;
  const emailLogs = state.emailLogs;

  useEffect(() => {
    setLeads(leadsFromFirestore);
  }, [leadsFromFirestore]);

  useEffect(() => {
    if (!hasLeads) {
      waitForGis().then(initTokenClient).catch(() => {});
    }
  }, [hasLeads]);

  useEffect(() => {
    const templates = {
      medical: '/emails/cold-outreach-medical.html',
      professional: '/emails/cold-outreach-professional.html',
      general: '/emails/cold-outreach-general.html',
    };
    Promise.all(
      Object.entries(templates).map(([key, url]) =>
        fetch(url).then(r => r.text()).then(html => ({ key, html }))
      )
    ).then(results => {
      const map: Record<string, string> = {};
      results.forEach(({ key, html }) => { map[key] = html; });
      setEmailTemplates(map);
    }).catch(() => {});
  }, []);

  const repairCallLogs = useCallback(async () => {
    setRepairing(true);
    try {
      const [leadsSnap, callLogsSnap] = await Promise.all([
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'callLogs')),
      ]);
      const rowToDocId = new Map<number, string>();
      leadsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.rowIndex) rowToDocId.set(data.rowIndex, d.id);
      });
      const logs = callLogsSnap.docs.map(d => ({ _id: d.id, ...d.data() })) as (CallLogEntry & { _id: string })[];
      const orphaned = logs.filter(log => {
        const docId = rowToDocId.get(log.sheetRowIndex);
        return docId && log.leadId !== docId;
      });
      if (orphaned.length === 0) {
        toast('Call history is already up to date');
        return;
      }
      const batch = writeBatch(db);
      for (const log of orphaned) {
        const correctDocId = rowToDocId.get(log.sheetRowIndex)!;
        batch.update(doc(db, 'callLogs', log._id), { leadId: correctDocId });
      }
      await batch.commit();
      toast.success(`Restored ${orphaned.length} call records`);
    } catch (e) {
      console.error('Repair failed:', e);
      toast.error('Failed to restore call history');
    } finally {
      setRepairing(false);
    }
  }, []);

  const importLeadsFromSheets = useCallback(async () => {
    setImportingFromSheets(true);
    try {
      await ensureHeaderColumns();
      const sheetLeads = await fetchLeadsFromSheet();
      dispatch({ type: 'SET_LEADS', payload: sheetLeads });
      toast.success(`Imported ${sheetLeads.length} leads`);
      setTimeout(() => repairCallLogs(), 1500);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        try {
          await waitForGis();
          initTokenClient();
          await signIn();
          await ensureHeaderColumns();
          const sheetLeads = await fetchLeadsFromSheet();
          dispatch({ type: 'SET_LEADS', payload: sheetLeads });
          toast.success(`Imported ${sheetLeads.length} leads`);
          setTimeout(() => repairCallLogs(), 1500);
          return;
        } catch {
          toast.error('Failed to connect. Please try again.');
        }
      } else {
        toast.error('Failed to load leads from sheet');
        console.error(err);
      }
    } finally {
      setImportingFromSheets(false);
    }
  }, [dispatch]);

  const latestCallsMap = useMemo(() => {
    const map = new Map<string, CallLogEntry>();
    for (const log of callLogs) {
      const existing = map.get(log.leadId);
      if (!existing || new Date(log.calledAt) > new Date(existing.calledAt)) {
        map.set(log.leadId, log);
      }
      if (log.sheetRowIndex) {
        const rowKey = `row_${log.sheetRowIndex}`;
        const existingRow = map.get(rowKey);
        if (!existingRow || new Date(log.calledAt) > new Date(existingRow.calledAt)) {
          map.set(rowKey, log);
        }
      }
    }
    return map;
  }, [callLogs]);

  const leadCallFor = (lead: Lead) =>
    latestCallsMap.get(leadKey(lead)) || latestCallsMap.get(`row_${lead.rowIndex}`) || null;

  const leadKey = (lead: Lead) => lead.id || lead.placeId || String(lead.rowIndex);

  const todayLeadIds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Set(
      callLogs
        .filter(log => new Date(log.calledAt) >= today)
        .map(log => log.leadId)
    );
  }, [callLogs]);

  const emailLogsByLead = useMemo(() => {
    const map = new Map<string, EmailLog[]>();
    for (const log of emailLogs) {
      const list = map.get(log.leadId) || [];
      list.push(log);
      map.set(log.leadId, list);
    }
    return map;
  }, [emailLogs]);

  const mergedLeads = useMemo(() => {
    let result = leads.map(lead => ({
      ...lead,
      latestCall: leadCallFor(lead),
    }));

    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    if (areaFilter !== 'all') {
      result = result.filter(l => {
        const city = (l.address || '').split(',')[1]?.trim() || '';
        const pcMatch = (l.address || '').match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
        const postal = pcMatch ? pcMatch[0].replace(/\s/g, '').slice(0, 3) : '';
        return city === areaFilter || postal === areaFilter;
      });
    }

    switch (filter) {
      case 'not_called':
        result = result.filter(l => !l.latestCall);
        break;
      case 'today':
        result = result.filter(l => l.latestCall && todayLeadIds.has(leadKey(l)));
        break;
      case 'callback':
        result = result.filter(l => l.latestCall?.outcome === 'callback');
        break;
      case 'completed':
        result = result.filter(l => l.latestCall?.outcome === 'completed');
        break;
      case 'no_answer':
        result = result.filter(l => l.latestCall?.outcome === 'no_answer');
        break;
      case 'wrong_number':
        result = result.filter(l => l.latestCall?.outcome === 'wrong_number');
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const aCalled = a.latestCall ? 1 : 0;
      const bCalled = b.latestCall ? 1 : 0;
      if (aCalled !== bCalled) return aCalled - bCalled;
      return parseFloat(b.rating) - parseFloat(a.rating);
    });

    return result;
  }, [leads, latestCallsMap, filter, searchQuery, todayLeadIds, typeFilter, areaFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const notCalled = leads.filter(l => !leadCallFor(l)).length;
    const calledToday = callLogs.filter(l => todayLeadIds.has(l.leadId)).length;
    const callbacks = callLogs.filter(l => l.outcome === 'callback' && !todayLeadIds.has(l.leadId)).length;
    const completed = callLogs.filter(l => l.outcome === 'completed').length;
    return { total, notCalled, calledToday, callbacks, completed };
  }, [leads, latestCallsMap, callLogs, todayLeadIds]);

  const businessTypes = useMemo(() => {
    const types = new Set(leads.map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [leads]);

  const areaOptions = useMemo(() => {
    const areas = new Map<string, number>();
    for (const lead of leads) {
      const city = (lead.address || '').split(',')[1]?.trim();
      const pcMatch = (lead.address || '').match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i);
      const postal = pcMatch ? pcMatch[0].replace(/\s/g, '').slice(0, 3) : null;
      if (city) areas.set(city, (areas.get(city) || 0) + 1);
      if (postal) areas.set(postal, (areas.get(postal) || 0) + 1);
    }
    return Array.from(areas.entries()).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const callStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    for (const lead of leads) {
      const call = leadCallFor(lead);
      if (!call) { counts.not_called = (counts.not_called || 0) + 1; continue; }
      if (todayLeadIds.has(leadKey(lead))) counts.today = (counts.today || 0) + 1;
      counts[call.outcome] = (counts[call.outcome] || 0) + 1;
    }
    return counts;
  }, [leads, callLogs, todayLeadIds]);

  const handleConnect = useCallback(async () => {
    setAuthInProgress(true);
    try {
      await waitForGis();
      initTokenClient();
      await signIn();
      setImportingFromSheets(true);
      try {
        await ensureHeaderColumns();
        const sheetLeads = await fetchLeadsFromSheet();
        dispatch({ type: 'SET_LEADS', payload: sheetLeads });
        toast.success(`Imported ${sheetLeads.length} leads`);
      } catch (err2: any) {
        toast.error(err2.message || 'Failed to import leads');
      } finally {
        setImportingFromSheets(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect');
    } finally {
      setAuthInProgress(false);
    }
  }, [dispatch]);

  const handleSaveOutcome = async () => {
    if (!outcomeLead || !currentUser) return;
    setSavingOutcome(true);
    try {
      const entry: CallLogEntry = {
        id: generateId(),
        leadId: outcomeLead.id || outcomeLead.placeId || String(outcomeLead.rowIndex),
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

      dispatch({ type: 'ADD_CALL_LOG', payload: entry });

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

  const handleStartEditEmail = (lead: Lead) => {
    setEditingEmailFor(leadKey(lead));
    setEmailValue(lead.email || '');
  };

  const handleSaveEmail = (leadId: string) => {
    const trimmed = emailValue.trim();
    if (trimmed) {
      dispatch({ type: 'UPDATE_LEAD_EMAIL', payload: { leadId, email: trimmed } });
      toast.success('Email saved');
    }
    setEditingEmailFor(null);
    setEmailValue('');
  };

  const handleCancelEditEmail = () => {
    setEditingEmailFor(null);
    setEmailValue('');
  };

  const handleMarkEmailSent = (lead: Lead) => {
    if (!lead.email || !currentUser) return;
    const entry: EmailLog = {
      id: generateId(),
      leadId: leadKey(lead),
      businessName: lead.businessName,
      email: lead.email,
      sheetRowIndex: lead.rowIndex,
      sentById: currentUser.id,
      sentByName: currentUser.name,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_EMAIL_LOG', payload: entry });
    toast.success('Email marked as sent');
  };

  const handleChangeOutcome = (log: CallLogEntry, newOutcome: CallOutcome) => {
    dispatch({ type: 'UPDATE_CALL_LOG', payload: { ...log, outcome: newOutcome } });
    toast.success(`Outcome changed to ${newOutcome.replace('_', ' ')}`);
    setEditingCallLogId(null);
  };

  const handleScrapeLeads = async () => {
    setScraping(true);
    try {
      const result = await scrapeLeadsFromMaps((msg) => {
        toast(msg, { duration: 2000 });
      });
      toast.success(`Scraped ${result.searched} queries — ${result.added} new leads added`);
      setTimeout(() => importLeadsFromSheets(), 1500);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        try {
          await waitForGis();
          initTokenClient();
          await signIn();
          setScraping(true);
          const result = await scrapeLeadsFromMaps((msg) => toast(msg, { duration: 2000 }));
          toast.success(`Scraped ${result.searched} queries — ${result.added} new leads added`);
          setTimeout(() => importLeadsFromSheets(), 1500);
          return;
        } catch {
          toast.error('Failed to connect. Please try again.');
        }
      } else {
        toast.error(err.message || 'Scraping failed');
      }
    } finally {
      setScraping(false);
    }
  };

  const handleBackfillPlaceIds = async () => {
    setBackfilling(true);
    try {
      const result = await backfillPlaceIds((msg) => toast(msg));
      toast.success(`Backfilled ${result.updated} place IDs`);
      setTimeout(() => importLeadsFromSheets(), 1500);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        try {
          await waitForGis();
          initTokenClient();
          await signIn();
          setBackfilling(true);
          const result = await backfillPlaceIds((msg) => toast(msg));
          toast.success(`Backfilled ${result.updated} place IDs`);
          setTimeout(() => importLeadsFromSheets(), 1500);
          return;
        } catch {
          toast.error('Failed to connect. Please try again.');
        }
      } else {
        toast.error('Backfill failed');
      }
    } finally {
      setBackfilling(false);
    }
  };

  const handleSyncCategories = async () => {
    setSyncingCategories(true);
    try {
      await syncCategoriesToSheet();
      toast.success('Categories synced to sheet');
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        try {
          await waitForGis();
          initTokenClient();
          await signIn();
          await syncCategoriesToSheet();
          toast.success('Categories synced to sheet');
          return;
        } catch {
          toast.error('Failed to connect. Please try again.');
        }
      } else {
        toast.error('Failed to sync categories. Reconnect Google Sheets first.');
      }
    } finally {
      setSyncingCategories(false);
    }
  };

  const handleCopyEmail = async (lead: Lead) => {
    const category = getTemplateCategory(lead.type);
    const template = emailTemplates[category];
    if (!template || !lead.email) return;
    setCopyingLeadId(leadKey(lead));

    const city = (lead.address || '').split(',')[1]?.trim() || 'the GTA';
    const rating = lead.rating || 'N/A';
    let reviewsCount = '0';
    if (lead.reviews?.trim().startsWith('[')) {
      try { reviewsCount = JSON.parse(lead.reviews).length.toString(); } catch {}
    }

    const rendered = template
      .replace(/\{\{business_name\}\}/g, lead.businessName)
      .replace(/\{\{rating\}\}/g, rating)
      .replace(/\{\{reviews_count\}\}/g, reviewsCount)
      .replace(/\{\{city\}\}/g, city)
      .replace(/\{\{unsubscribe_url\}\}/g, 'https://gtascrub.com/unsubscribe');

    const subject = `Quick intro - commercial cleaning for ${lead.businessName}`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([rendered], { type: 'text/html' }),
          'text/plain': new Blob([rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()], { type: 'text/plain' }),
        }),
      ]);
      toast.success(
        <span>
          Copied email.{' '}
          <span className="block text-xs opacity-80 mt-0.5">
            To: {lead.email} · Subject: {subject}
          </span>
        </span>,
        { duration: 4000 }
      );
    } catch {
      toast.error('Failed to copy to clipboard');
    } finally {
      setCopyingLeadId(null);
    }
  };

  if (importingFromSheets) {
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

  if (!hasLeads) {
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
                {authInProgress ? 'Connecting...' : 'Connect Google Sheets & Import'}
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Leads Call Center">
      <div className="page-container flex flex-col gap-6 pb-8">

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Leads" value={stats.total.toString()} icon={Building2} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard label="Not Called" value={stats.notCalled.toString()} icon={Phone} iconColor="text-red-600" iconBg="bg-red-100" />
          <StatCard label="Called Today" value={stats.calledToday.toString()} icon={Clock} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard label="Callbacks" value={stats.callbacks.toString()} icon={RotateCcw} iconColor="text-amber-600" iconBg="bg-amber-100" />
          <StatCard label="Completed" value={stats.completed.toString()} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        </div>

        <LeadFilters
          filter={filter}
          typeFilter={typeFilter}
          areaFilter={areaFilter}
          searchQuery={searchQuery}
          businessTypes={businessTypes}
          areaOptions={areaOptions}
          callStatusCounts={callStatusCounts}
          leadCount={leads.length}
          onFilterChange={setFilter}
          onTypeFilterChange={setTypeFilter}
          onAreaFilterChange={setAreaFilter}
          onSearchChange={setSearchQuery}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {mergedLeads.length} of {leads.length} leads
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleScrapeLeads}
              disabled={scraping}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              title="Scrape Google Maps for new leads"
            >
              <RefreshCw size={14} className={scraping ? 'animate-spin' : ''} />
              {scraping ? 'Scraping...' : 'Scrape Leads'}
            </button>
            <button
              onClick={handleSyncCategories}
              disabled={syncingCategories}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncingCategories ? 'animate-spin' : ''} />
              {syncingCategories ? 'Syncing...' : 'Sync Categories'}
            </button>
            <button
              onClick={handleBackfillPlaceIds}
              disabled={backfilling}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={backfilling ? 'animate-spin' : ''} />
              {backfilling ? 'Backfilling...' : 'Backfill Place IDs'}
            </button>
            <button
              onClick={repairCallLogs}
              disabled={repairing}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50"
            >
              <Wrench size={14} className={repairing ? 'animate-spin' : ''} />
              {repairing ? 'Restoring...' : 'Restore Call History'}
            </button>
            <button
              onClick={importLeadsFromSheets}
              disabled={importingFromSheets}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={importingFromSheets ? 'animate-spin' : ''} />
              {importingFromSheets ? 'Importing...' : 'Refresh from Sheets'}
            </button>
          </div>
        </div>

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
              const calledToday = latestCall && todayLeadIds.has(leadKey(lead));
              const isExpanded = expandedId === leadKey(lead);
              const leadCallLogs = callLogs.filter(l => l.leadId === leadKey(lead));
              const hasBeenEmailed = emailLogsByLead.has(leadKey(lead));

              return (
                <LeadCard
                  key={leadKey(lead)}
                  lead={lead}
                  leadKey={leadKey(lead)}
                  latestCall={latestCall}
                  calledToday={!!calledToday}
                  hasBeenEmailed={hasBeenEmailed}
                  isExpanded={isExpanded}
                  leadCallLogs={leadCallLogs}
                  emailLogsByLead={emailLogsByLead}
                  editingEmailFor={editingEmailFor}
                  emailValue={emailValue}
                  copyingLeadId={copyingLeadId}
                  editingCallLogId={editingCallLogId}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : leadKey(lead))}
                  onStartEditEmail={() => handleStartEditEmail(lead)}
                  onSaveEmail={handleSaveEmail}
                  onCancelEditEmail={handleCancelEditEmail}
                  onEmailValueChange={setEmailValue}
                  onCopyEmail={handleCopyEmail}
                  onMarkEmailSent={handleMarkEmailSent}
                  onChangeOutcome={handleChangeOutcome}
                  onSetEditingCallLogId={setEditingCallLogId}
                  onCallClick={setOutcomeLead}
                />
              );
            })}
          </div>
        )}
      </div>

      <CallOutcomeModal
        lead={outcomeLead}
        outcome={outcome}
        notes={outcomeNotes}
        saving={savingOutcome}
        onClose={() => { setOutcomeLead(null); setOutcomeNotes(''); }}
        onSave={handleSaveOutcome}
        setOutcome={setOutcome}
        setNotes={setOutcomeNotes}
      />
    </AppShell>
  );
}
