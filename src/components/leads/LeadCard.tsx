import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, CheckCircle2, XCircle, RotateCcw,
  ChevronDown, ExternalLink, User, AlertCircle, FileText, Mail, Copy, Trash2, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Lead, CallLogEntry, CallOutcome, EmailLog, Quote, QuoteLineItem, CleaningFrequency } from '../../types';
import { generateId } from '../../utils/storage';
import { useApp } from '../../context/AppContext';

interface Props {
  lead: Lead;
  leadKey: string;
  latestCall: CallLogEntry | null;
  calledToday: boolean;
  hasBeenEmailed: boolean;
  isExpanded: boolean;
  leadCallLogs: CallLogEntry[];
  emailLogsByLead: Map<string, EmailLog[]>;
  editingEmailFor: string | null;
  emailEditValues: Record<string, string>;
  copyingLeadId: string | null;
  editingCallLogId: string | null;
  onToggleExpand: () => void;
  onStartEditEmail: () => void;
  onSaveEmail: (leadId: string) => void;
  onCancelEditEmail: () => void;
  onEmailValueChange: (leadId: string, v: string) => void;
  onCopyEmail: (lead: Lead) => void;
  onMarkEmailSent: (lead: Lead) => void;
  onChangeOutcome: (log: CallLogEntry, newOutcome: CallOutcome) => void;
  onSetEditingCallLogId: (id: string | null) => void;
  onCallClick: (lead: Lead) => void;
}

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 size={20} />, color: 'text-green-600 bg-green-100' },
  { value: 'no_answer', label: 'No Answer', icon: <XCircle size={20} />, color: 'text-amber-600 bg-amber-100' },
  { value: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={20} />, color: 'text-red-600 bg-red-100' },
  { value: 'callback', label: 'Callback', icon: <RotateCcw size={20} />, color: 'text-blue-600 bg-blue-100' },
];

function getLineItemsForType(businessType: string): QuoteLineItem[] {
  const base = (desc: string): QuoteLineItem => ({
    id: generateId(),
    description: desc,
    siteId: null,
    frequency: 'weekly' as CleaningFrequency,
    amountPerVisit: 0,
    visitsPerWeek: 1,
    monthlyAmount: 0,
  });
  const t = businessType.toLowerCase();
  if (t.includes('dental')) return [base('Medical-grade disinfection'), base('Exam room cleaning'), base('Reception area'), base('Floor care')];
  if (t.includes('medical')) return [base('Medical-grade disinfection'), base('Waiting room'), base('Exam rooms'), base('Sanitization')];
  if (t.includes('physio') || t.includes('vet')) return [base('Treatment area cleaning'), base('Reception'), base('Floor care'), base('Sanitization')];
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return [base('Reception area'), base('Conference rooms'), base('Office cleaning'), base('Window cleaning')];
  return [base('Workstation cleaning'), base('Reception'), base('Floor care'), base('Breakroom')];
}

const FREQ_MULT: Record<number, number> = { 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 };

function leadTypeToRate(leadType: string): { rate: number; facility: string } {
  const t = (leadType || '').toLowerCase();
  if (t.includes('dental')) return { rate: 0.55, facility: 'Dental Clinic' };
  if (t.includes('medical') || t.includes('physio') || t.includes('vet')) return { rate: 0.55, facility: 'Medical Clinic' };
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return { rate: 0.36, facility: 'Office' };
  if (t.includes('retail')) return { rate: 0.30, facility: 'Retail' };
  if (t.includes('warehouse')) return { rate: 0.22, facility: 'Warehouse' };
  if (t.includes('restaurant')) return { rate: 0.44, facility: 'Restaurant' };
  return { rate: 0.36, facility: 'Commercial' };
}

export function LeadCard({
  lead, leadKey: lk, latestCall, calledToday, hasBeenEmailed, isExpanded, leadCallLogs, emailLogsByLead,
  editingEmailFor, emailEditValues, copyingLeadId, editingCallLogId,
  onToggleExpand, onStartEditEmail, onSaveEmail, onCancelEditEmail, onEmailValueChange,
  onCopyEmail, onMarkEmailSent, onChangeOutcome, onSetEditingCallLogId, onCallClick,
}: Props) {
  const navigate = useNavigate();
  const { currentUser, dispatch } = useApp();
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [showClearData, setShowClearData] = useState(false);
  const [showQuickQuote, setShowQuickQuote] = useState(false);
  const [qqSqft, setQqSqft] = useState(1500);
  const [qqDays, setQqDays] = useState(6);
  const [qqGeneratedQuoteId, setQqGeneratedQuoteId] = useState<string | null>(null);
  const [qqShareUrl, setQqShareUrl] = useState('');

  const handleQuickQuote = () => {
    if (!currentUser) return;
    setQqSqft(1500);
    setQqDays(6);
    setQqGeneratedQuoteId(null);
    setQqShareUrl('');
    setShowQuickQuote(true);
  };

  const handleGenerateQuickQuote = () => {
    if (!currentUser) return;
    const { rate, facility } = leadTypeToRate(lead.type);
    const mul = FREQ_MULT[qqDays] || 1.0;
    const baseMonthly = Math.ceil(qqSqft * rate * mul);
    const lineItems: QuoteLineItem[] = [
      { id: generateId(), description: `${facility} cleaning — ${qqSqft} sq ft`, siteId: null, frequency: 'weekly' as CleaningFrequency, amountPerVisit: Math.round(baseMonthly / (qqDays * 4.33)), visitsPerWeek: qqDays, monthlyAmount: baseMonthly },
    ];
    const totalMonthly = baseMonthly;
    const now = new Date().toISOString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const quoteId = generateId();
    const token = Array.from({ length: 20 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
    const shareUrl = `${window.location.origin}/#/quote/${token}`;
    const addrParts = (lead.address || '').split(',').map(s => s.trim());
    const q: Quote = {
      id: quoteId, clientId: null,
      prospectName: lead.businessName, prospectAddress: addrParts[0] || lead.address,
      prospectCity: addrParts[1] || '', prospectProvince: addrParts[2]?.slice(0, 2).toUpperCase() || 'ON',
      prospectPostalCode: addrParts[2]?.match(/[A-Z0-9]{3}\s?[A-Z0-9]{3}/i)?.[0] || '',
      prospectPhone: lead.phone, lineItems, totalMonthly, status: 'draft',
      validUntil, shareToken: token,
      notes: `Quick quote from lead: ${lead.businessName}`.trim(),
      createdBy: currentUser.id, createdAt: now, updatedAt: now,
    };
    dispatch({ type: 'ADD_QUOTE', payload: q });
    setQqGeneratedQuoteId(quoteId);
    setQqShareUrl(shareUrl);
    toast.success('Quote generated');
  };

  const handleCreateQuote = () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const addrParts = (lead.address || '').split(',').map(s => s.trim());
    const lineItems = getLineItemsForType(lead.type);
    const totalMonthly = lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);
    const q: Quote = {
      id: generateId(),
      clientId: null,
      prospectName: lead.businessName,
      prospectAddress: addrParts[0] || lead.address,
      prospectCity: addrParts[1] || '',
      prospectProvince: addrParts[2]?.slice(0, 2).toUpperCase() || 'ON',
      prospectPostalCode: addrParts[2]?.match(/[A-Z0-9]{3}\s?[A-Z0-9]{3}/i)?.[0] || '',
      prospectPhone: lead.phone,
      lineItems,
      totalMonthly,
      status: 'draft',
      validUntil,
      notes: `Lead: ${lead.businessName} · ${lead.type || ''} · Rating: ${lead.rating || 'N/A'}`.trim(),
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_QUOTE', payload: q });
    toast.success('Quote created from lead');
    navigate(`/quotes/${q.id}`);
  };

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
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Contact info row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm">{lead.businessName || 'Unknown Business'}</h3>
              {statusBadge}
              {calledToday && <Badge label="Called Today" variant="success" className="text-[10px]" />}
              {hasBeenEmailed && lead.email && <Badge label="Emailed" variant="info" className="text-[10px]" />}
            </div>

            <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-gray-600">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium">
                  <Phone size={12} />{lead.phone}
                </a>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                {editingEmailFor === lk ? (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    <input type="email" value={emailEditValues[lk] || ''} onChange={e => onEmailValueChange(lk, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onSaveEmail(lk); if (e.key === 'Escape') onCancelEditEmail(); }}
                      placeholder="email@example.com"
                      className="w-40 px-1.5 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                    <button onClick={() => onSaveEmail(lk)} className="text-green-600 hover:text-green-700 ml-0.5"><CheckCircle2 size={12} /></button>
                    <button onClick={onCancelEditEmail} className="text-gray-400 hover:text-gray-600"><XCircle size={12} /></button>
                  </span>
                ) : lead.email ? (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /><span className="truncate max-w-[180px]">{lead.email}</span>
                    <button onClick={onStartEditEmail} className="text-gray-400 hover:text-blue-500 ml-0.5"><ExternalLink size={10} /></button>
                  </span>
                ) : (
                  <button onClick={onStartEditEmail} className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                    <Mail size={12} />Add email
                  </button>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 truncate max-w-[200px]">
                    <ExternalLink size={12} />{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {lead.rating && (
                  <span className="flex items-center gap-1 text-amber-500"><Star size={12} className="fill-amber-400" />{lead.rating}</span>
                )}
              </div>
              {lead.address && (
                <span className="flex items-center gap-1.5 text-gray-400 truncate max-w-[400px] sm:max-w-none">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate sm:text-clip">{lead.address}</span>
                </span>
              )}
              {lead.type && <span className="text-gray-400">{lead.type}</span>}
            </div>

            {latestCall && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <User size={11} />
                Called by {latestCall.calledByName} · {new Date(latestCall.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={`tel:${lead.phone}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              onClick={() => setTimeout(() => onCallClick(lead), 500)}>
              <Phone size={14} />Call
            </a>
            <button title="Quick Quote" onClick={handleQuickQuote}
              className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
              <Zap size={16} />
            </button>
            <button onClick={onToggleExpand} className="p-2 text-gray-400 hover:text-gray-600">
              <ChevronDown size={16} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </div>

        {/* Intel section — collapsed by default */}
        <details className="group text-xs">
          <summary className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-700 select-none">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            <span className="font-medium">Intel</span>
          </summary>
          <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Current cleaner</span>
              <span className="text-gray-700">{lead.currentCleaner || '—'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Notes</span>
              <span className="text-gray-700">{lead.competitorNotes || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Last contacted</span>
              <span className="text-gray-700">
                {lead.lastContactedAt
                  ? (() => { try { return new Date(lead.lastContactedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; } })()
                  : '—'}
              </span>
            </div>
          </div>
        </details>

        {/* Expanded section */}
        {isExpanded && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            {lead.email && (
              <>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => onCopyEmail(lead)} disabled={copyingLeadId === lk}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50">
                    {copyingLeadId === lk ? <>Copying...</> : <><Copy size={15} />Copy Template</>}
                  </button>
                  <button onClick={() => onMarkEmailSent(lead)}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all">
                    <Mail size={15} />Mark as Sent
                  </button>
                </div>

                {(() => {
                  const logs = emailLogsByLead.get(lk);
                  if (!logs || logs.length === 0) return null;
                  return (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email History</h4>
                      <div className="space-y-2">
                        {logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).map(log => (
                          <div key={log.id} className="flex items-start gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 relative group">
                            <div className="p-1.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-600"><Mail size={14} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700">{log.sentByName} — Sent to {log.email}</p>
                              <p className="text-gray-400 mt-0.5">
                                {new Date(log.sentAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <button onClick={() => dispatch({ type: 'DELETE_EMAIL_LOG', payload: log.id })}
                              className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <XCircle size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            <button onClick={handleCreateQuote}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all mb-3">
              <FileText size={15} />Full Quote
            </button>

            {leadCallLogs.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call History</h4>
                <div className="space-y-2">
                  {leadCallLogs.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime()).map(log => (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="flex-1 flex items-start gap-3 bg-gray-50 rounded-lg p-2.5">
                        <button onClick={() => onSetEditingCallLogId(editingCallLogId === log.id ? null : log.id)}
                          className={`p-1.5 rounded-full flex-shrink-0 transition-colors ${
                            log.outcome === 'completed' ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : log.outcome === 'no_answer' ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : log.outcome === 'wrong_number' ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`} title="Click to change outcome">
                          {log.outcome === 'completed' ? <CheckCircle2 size={14} />
                            : log.outcome === 'no_answer' ? <XCircle size={14} />
                            : log.outcome === 'wrong_number' ? <AlertCircle size={14} />
                            : <RotateCcw size={14} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700">{log.calledByName} — {log.outcome.replace('_', ' ')}</p>
                          {editingCallLogId === log.id && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {OUTCOME_OPTIONS.filter(o => o.value !== log.outcome).map(opt => (
                                <button key={opt.value} onClick={() => onChangeOutcome(log, opt.value)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${opt.color}`}>{opt.label}</button>
                              ))}
                            </div>
                          )}
                          <p className="text-gray-400 mt-0.5">
                            {new Date(log.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {log.notes && <p className="text-gray-500 mt-0.5 italic">"{log.notes}"</p>}
                        </div>
                      </div>
                      <button onClick={() => setDeleteLogId(log.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => setShowClearData(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 mt-3 bg-red-50 border-2 border-dashed border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 hover:border-red-300 transition-all">
              <Trash2 size={15} />Clear Call Logs
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={showQuickQuote} onClose={() => { setShowQuickQuote(false); setQqGeneratedQuoteId(null); }} title="Quick Quote" size="sm">
        <div className="space-y-5">
          {!qqGeneratedQuoteId ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Square Footage</label>
                <input type="number" value={qqSqft} onChange={e => setQqSqft(Math.max(100, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" min={100} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Visits per Week</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <button key={d} onClick={() => setQqDays(d)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        qqDays === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Estimated monthly</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(qqSqft * leadTypeToRate(lead.type).rate * (FREQ_MULT[qqDays] || 1.0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
              </div>
              <Button onClick={handleGenerateQuickQuote} className="w-full">Generate Quote & Share</Button>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-emerald-700">Quote generated!</p>
                <p className="text-xs text-gray-500 mt-1">Share this link with your prospect</p>
                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                  <input type="text" value={qqShareUrl} readOnly
                    className="flex-1 text-xs text-gray-600 bg-transparent outline-none truncate" />
                  <button onClick={() => { navigator.clipboard.writeText(qqShareUrl); toast.success('Link copied'); }}
                    className="p-1.5 text-blue-600 hover:text-blue-700 flex-shrink-0">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <Button onClick={() => navigate(`/quotes/${qqGeneratedQuoteId}`)} className="w-full">Open Quote</Button>
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteLogId}
        onClose={() => setDeleteLogId(null)}
        title="Delete Call Log"
        message="Remove this call log entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteLogId) dispatch({ type: 'DELETE_CALL_LOG', payload: deleteLogId }); }}
      />

      <ConfirmModal
        isOpen={showClearData}
        onClose={() => setShowClearData(false)}
        title="Clear Call Logs"
        message="Delete all call logs for this lead? Call history cannot be restored. Emails are kept."
        confirmLabel="Clear All"
        onConfirm={() => {
          leadCallLogs.forEach(log => dispatch({ type: 'DELETE_CALL_LOG', payload: log.id }));
        }}
      />
    </Card>
  );
}
