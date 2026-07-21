import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, ExternalLink, RefreshCw, Database, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LeadCard } from '../components/leads/LeadCard';
import { CallOutcomeModal } from '../components/leads/CallOutcomeModal';
import type { Lead, CallLogEntry, CallOutcome, EmailLog } from '../types';
import { generateId } from '../utils/storage';
import {
  fetchLeadsFromSheet,
  signIn,
  waitForGis,
  initTokenClient,
  ensureHeaderColumns,
  scrapeLeadsFromMaps,
  importScrapedEmails,
} from '../lib/googleSheets';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FilterMode = 'all' | 'not_called' | 'today' | 'callback' | 'completed' | 'no_answer' | 'wrong_number' | 'emailed';

function getTemplateCategory(leadType: string): string {
  const t = leadType.toLowerCase();
  if (t.includes('dental') || t.includes('medical') || t.includes('physio') || t.includes('vet')) return 'medical';
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return 'professional';
  return 'general';
}

export function LeadsPage() {
  const { state, dispatch, currentUser } = useApp();
  const isOwner = currentUser?.role === 'owner';

  const leadsFromFirestore = state.leads;
  const hasLeads = leadsFromFirestore.length > 0;

  const [importingFromSheets, setImportingFromSheets] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  const leads = leadsFromFirestore;
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
  const [emailEditValues, setEmailEditValues] = useState<Record<string, string>>({});
  const [copyingLeadId, setCopyingLeadId] = useState<string | null>(null);
  const [editingCallLogId, setEditingCallLogId] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [importingEmails, setImportingEmails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const callLogs = state.callLogs;
  const emailLogs = state.emailLogs;

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
      if (orphaned.length === 0) return;
      const batch = writeBatch(db);
      for (const log of orphaned) {
        const correctDocId = rowToDocId.get(log.sheetRowIndex)!;
        batch.update(doc(db, 'callLogs', log._id), { leadId: correctDocId });
      }
      await batch.commit();
    } catch (e) {
      console.error('Repair failed:', e);
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
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'NEEDS_AUTH') {
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
      case 'emailed':
        result = result.filter(l => emailLogsByLead.has(leadKey(l)));
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
  }, [leads, latestCallsMap, filter, searchQuery, todayLeadIds, typeFilter, areaFilter, emailLogsByLead]);

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
    counts.emailed = emailLogsByLead.size;
    return counts;
  }, [leads, callLogs, todayLeadIds, emailLogsByLead]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(mergedLeads.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = mergedLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [mergedLeads.length]);

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
      } catch (err2: unknown) {
        toast.error(err2 instanceof Error ? err2.message : 'Failed to import leads');
      } finally {
        setImportingFromSheets(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
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

      toast.success('Call logged');
      setOutcomeLead(null);
      setOutcome('completed');
      setOutcomeNotes('');
    } catch {
      toast.error('Failed to save outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  const handleStartEditEmail = (lead: Lead) => {
    setEditingEmailFor(leadKey(lead));
    setEmailEditValues(prev => ({ ...prev, [leadKey(lead)]: lead.email || '' }));
  };

  const handleSaveEmail = async (leadId: string) => {
    const val = (emailEditValues[leadId] || '').trim();
    try {
      await dispatch({ type: 'UPDATE_LEAD_EMAIL', payload: { leadId, email: val } });
      toast.success(val ? 'Email saved' : 'Email cleared');
      setEditingEmailFor(null);
    } catch {
      // Error toast already shown by customDispatch
    }
  };

  const handleCancelEditEmail = () => {
    setEditingEmailFor(null);
  };

  const handleMarkEmailSent = async (lead: Lead) => {
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
    try {
      await dispatch({ type: 'ADD_EMAIL_LOG', payload: entry });
      toast.success('Email marked as sent');
    } catch {
      // Error toast already shown by customDispatch
    }
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'NEEDS_AUTH') {
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
        toast.error(errMsg || 'Scraping failed');
      }
    } finally {
      setScraping(false);
    }
  };

  const handleImportEmails = async () => {
    setImportingEmails(true);
    try {
      const result = await importScrapedEmails((msg) => {
        toast(msg, { duration: 3000 });
      });
      toast.success(`Imported ${result.updated} emails to sheet`);
      // Re-import leads from sheet to update state
      await importLeadsFromSheets();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'NEEDS_AUTH') {
        try {
          await waitForGis();
          initTokenClient();
          await signIn();
          setImportingEmails(true);
          const result = await importScrapedEmails((msg) => toast(msg, { duration: 3000 }));
          toast.success(`Imported ${result.updated} emails to sheet`);
          await importLeadsFromSheets();
          return;
        } catch {
          toast.error('Failed to connect. Please try again.');
        }
      } else {
        toast.error(errMsg || 'Email import failed');
      }
    } finally {
      setImportingEmails(false);
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
      try { reviewsCount = JSON.parse(lead.reviews).length.toString(); } catch { /* noop */ }
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

  if (!isOwner) return null;

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

  if (!state.isInitialized) {
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-sm">Loading leads...</p>
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

        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all' as FilterMode, label: 'All' },
            { key: 'not_called' as FilterMode, label: 'Not Called' },
            { key: 'today' as FilterMode, label: 'Today' },
            { key: 'callback' as FilterMode, label: 'Callback' },
            { key: 'completed' as FilterMode, label: 'Completed' },
            { key: 'no_answer' as FilterMode, label: 'No Answer' },
            { key: 'wrong_number' as FilterMode, label: 'Wrong Number' },
            { key: 'emailed' as FilterMode, label: 'Emailed' },
          ]).map(opt => (
            <button key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {opt.label} ({callStatusCounts[opt.key] || 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-300 text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]">
              <option value="all">All Types ({leads.length})</option>
              {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-300 text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]">
              <option value="all">All Areas ({leads.length})</option>
              {areaOptions.map(([area, count]) => <option key={area} value={area}>{area} ({count})</option>)}
            </select>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {mergedLeads.length === 0
              ? '0 leads'
              : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, mergedLeads.length)} of ${mergedLeads.length} leads`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleImportEmails}
              disabled={importingEmails}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              title="Import scraped emails to sheet"
            >
              <RefreshCw size={14} className={importingEmails ? 'animate-spin' : ''} />
              {importingEmails ? 'Importing...' : 'Import Emails'}
            </button>
            <button
              onClick={handleScrapeLeads}
              disabled={scraping}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              title="Scrape Google Maps for new leads"
            >
              <RefreshCw size={14} className={scraping ? 'animate-spin' : ''} />
              {scraping ? 'Scraping...' : 'Scrape'}
            </button>
          </div>
        </div>

        {paginatedLeads.length === 0 ? (
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
            {paginatedLeads.map(lead => {
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
                  emailEditValues={emailEditValues}
                  copyingLeadId={copyingLeadId}
                  editingCallLogId={editingCallLogId}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : leadKey(lead))}
                  onStartEditEmail={() => handleStartEditEmail(lead)}
                  onSaveEmail={handleSaveEmail}
                  onCancelEditEmail={handleCancelEditEmail}
                   onEmailValueChange={(leadId, v) => setEmailEditValues(prev => ({ ...prev, [leadId]: v }))}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              ← Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - safePage) <= 2;
              })
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-0.5">
                  {idx > 0 && p - arr[idx - 1] > 1 && (
                    <span className="px-1 text-gray-400 text-xs">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      p === safePage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Next →
            </button>
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
