import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Trash2, Printer, Send, CheckCircle, XCircle, Download, Calculator, Building2, Bookmark, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { CleaningEstimator } from '../components/quotes/CleaningEstimator';
import toast from 'react-hot-toast';
import { Logo } from '../assets/Logo';
import { formatCAD, formatDate } from '../utils/formatters';
import { generateId } from '../utils/storage';
import type { Quote, QuoteLineItem, QuoteStatus, CleaningFrequency, QuoteVersion } from '../types';
import { createVersion, addVersionToQuote } from '../types';
import { QuoteVersionHistory } from '../components/quotes/QuoteVersionHistory';
import { QuoteVersionCompare } from '../components/quotes/QuoteVersionCompare';
import { QuotePdfPreview } from '../components/quotes/QuotePdfPreview';

const statusColors: Record<QuoteStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
};

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, currentUser, dispatch } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLineItem, setShowAddLineItem] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    v1: QuoteVersion;
    v2: QuoteVersion;
  } | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const quote = state.quotes.find(q => q.id === id);
  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const [lineItemForm, setLineItemForm] = useState({
    description: '', siteId: '', frequency: 'weekly' as CleaningFrequency,
    amountPerVisit: 0, visitsPerWeek: 1,
  });

  const getMonthlyAmount = (visits: number, perVisit: number, freq: CleaningFrequency) => {
    const multiplier = freq === 'daily' ? 22 : freq === 'weekly' ? 4.33 : freq === 'biweekly' ? 2.17 : 1;
    return visits * perVisit * multiplier;
  };

  if (!quote) {
    return (
      <AppShell pageTitle="Quote Not Found">
        <div className="page-container flex flex-col items-center justify-center gap-4 py-20">
          <FileText size={48} className="text-gray-300" />
          <p className="text-gray-500">Quote not found</p>
          <Button onClick={() => navigate('/quotes')}>Back to Quotes</Button>
        </div>
      </AppShell>
    );
  }

  const handleStatusChange = (status: QuoteStatus) => {
    const version = createVersion(quote, currentUser.id, `Status changed to ${status}`);
    const updatedQuote = addVersionToQuote(quote, version);
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: { ...updatedQuote, status, updatedAt: new Date().toISOString() },
    });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_QUOTE', payload: quote.id });
    navigate('/quotes');
  };

  const handleAddLineItem = () => {
    const visits = lineItemForm.visitsPerWeek;
    const amount = lineItemForm.amountPerVisit;
    const freq = lineItemForm.frequency;
    const monthly = getMonthlyAmount(visits, amount, freq);
    const newItem: QuoteLineItem = {
      id: generateId(),
      description: lineItemForm.description,
      siteId: lineItemForm.siteId || null,
      frequency: freq,
      amountPerVisit: amount,
      visitsPerWeek: visits,
      monthlyAmount: monthly,
    };
    const lineItems = [...quote.lineItems, newItem];
    const totalMonthly = lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);
    const version = createVersion(quote, currentUser.id, `Added line item: ${newItem.description}`);
    const updatedQuote = addVersionToQuote(quote, version);
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: {
        ...updatedQuote,
        lineItems,
        totalMonthly,
        updatedAt: new Date().toISOString(),
      },
    });
    setShowAddLineItem(false);
    setLineItemForm({ description: '', siteId: '', frequency: 'weekly', amountPerVisit: 0, visitsPerWeek: 1 });
  };

  const handleRemoveLineItem = (itemId: string) => {
    const item = quote.lineItems.find(li => li.id === itemId);
    const lineItems = quote.lineItems.filter(li => li.id !== itemId);
    const totalMonthly = lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);
    const version = createVersion(quote, currentUser.id, `Removed line item: ${item?.description}`);
    const updatedQuote = addVersionToQuote(quote, version);
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: {
        ...updatedQuote,
        lineItems,
        totalMonthly,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleEstimatorGenerated = (items: QuoteLineItem[]) => {
    const lineItems = [...quote.lineItems, ...items];
    const totalMonthly = lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: { ...quote, lineItems, totalMonthly, updatedAt: new Date().toISOString() },
    });
    toast.success(`Added ${items.length} items from estimator`);
  };

  const handleConvertToClient = () => {
    // Create a new client from the quote prospect data
    const now = new Date().toISOString();
    const clientId = generateId();
    const newClient = {
      id: clientId,
      name: quote.prospectName,
      address: quote.prospectAddress,
      city: quote.prospectCity,
      province: quote.prospectProvince,
      postalCode: quote.prospectPostalCode,
      contactName: quote.prospectName,
      contactPhone: quote.prospectPhone,
      contractRate: quote.totalMonthly,
      frequency: 'weekly' as CleaningFrequency,
      cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
      status: 'active' as const,
      notes: `Converted from Quote #${quote.id.slice(-6).toUpperCase()}`,
      createdAt: now,
    };
    dispatch({ type: 'ADD_CLIENT', payload: newClient });
    // Also create a site for them
    const siteId = generateId();
    const newSite = {
      id: siteId,
      name: quote.prospectName,
      address: quote.prospectAddress,
      city: quote.prospectCity,
      province: quote.prospectProvince,
      postalCode: quote.prospectPostalCode,
      areaTags: [],
      type: 'other' as const,
      contactName: quote.prospectName,
      contactPhone: quote.prospectPhone,
      contractRate: quote.totalMonthly,
      frequency: 'weekly' as CleaningFrequency,
      cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
      scheduleStart: '17:00',
      scheduleEnd: '19:00',
      assignedUserIds: [],
      accessNotes: '',
      status: 'active' as const,
      checklist: [],
      clientId,
      isSubSite: false,
      createdAt: now,
    };
    dispatch({ type: 'ADD_SITE', payload: newSite });
    // Mark quote as accepted
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: { ...quote, status: 'accepted', updatedAt: now },
    });
    setShowConvertConfirm(false);
    toast.success(`Converted "${quote.prospectName}" to client + site`);
    navigate(`/sites/${siteId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAnnual = quote.totalMonthly * 12;

  return (
    <AppShell pageTitle={`Quote: ${quote.prospectName}`}>
      <div className="page-container flex flex-col gap-6">
        {/* Back and Actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to Quotes
          </button>
          <div className="flex gap-2 no-print">
            {isOwnerOrPartner && (
              <>
                {quote.status === 'draft' && (
                  <Button size="sm" icon={Send} onClick={() => handleStatusChange('sent')}>Mark Sent</Button>
                )}
                {quote.status === 'sent' && (
                  <>
                    <Button size="sm" icon={CheckCircle} variant="secondary" onClick={() => handleStatusChange('accepted')}>Accept</Button>
                    <Button size="sm" icon={XCircle} variant="danger" onClick={() => handleStatusChange('rejected')}>Reject</Button>
                  </>
                )}
                <Button size="sm" icon={Download} variant="secondary" onClick={() => setShowPdfPreview(true)}>Download PDF</Button>
                <Button size="sm" icon={Printer} variant="secondary" onClick={handlePrint}>Print</Button>
                <Button size="sm" icon={Clock} variant="secondary" onClick={() => setShowVersionHistory(true)}>
                  History (v{quote.currentVersion || 1})
                </Button>
                <Button size="sm" icon={Trash2} variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </>
            )}
          </div>
        </div>

        {/* Print-Friendly Proposal View */}
        <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 print:shadow-none print:border-0 print:p-0">
          {/* Letterhead */}
          <div className="border-b border-gray-200 pb-6 mb-6 print:pb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <Logo size={64} showText={false} />
                <div>
                  <div className="text-xl font-bold text-gray-900">GTA Scrub</div>
                  <div className="text-sm text-gray-500">Commercial Cleaning Services</div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{formatCAD(quote.totalMonthly)}<span className="text-lg font-normal text-gray-500">/mo</span></p>
                <Badge label={quote.status} variant={statusColors[quote.status]} className="mt-2" />
                {quote.validUntil && (
                  <p className="text-xs text-gray-400 mt-2">Valid until {formatDate(quote.validUntil)}</p>
                )}
              </div>
            </div>
          </div>

          {/* To: */}
          <div className="mb-8">
            <div className="text-sm text-gray-400 uppercase tracking-wide font-semibold mb-1">Prepared For</div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.prospectName}</h1>
            <p className="text-gray-600 mt-1">{quote.prospectAddress}</p>
            <p className="text-gray-600">{quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}</p>
            {quote.prospectPhone && <p className="text-gray-600">{quote.prospectPhone}</p>}
          </div>

          {/* Quote Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Cleaning Service Proposal</h2>
            <p className="text-sm text-gray-500">Prepared on {formatDate(new Date().toISOString())} &middot; Quote #{quote.id.slice(-6).toUpperCase()}</p>
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-6 print:break-inside-avoid">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-center py-2 text-sm font-semibold text-gray-700">Frequency</th>
                <th className="text-center py-2 text-sm font-semibold text-gray-700">Visits/Week</th>
                <th className="text-center py-2 text-sm font-semibold text-gray-700">Rate/Visit</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700">Monthly</th>
                {isOwnerOrPartner && <th className="w-10 no-print"></th>}
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-800">{item.description}</td>
                  <td className="py-3 text-sm text-gray-600 text-center capitalize">{item.frequency}</td>
                  <td className="py-3 text-sm text-gray-600 text-center">{item.visitsPerWeek}x</td>
                  <td className="py-3 text-sm text-gray-600 text-center">{formatCAD(item.amountPerVisit)}</td>
                  <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCAD(item.monthlyAmount)}</td>
                  {isOwnerOrPartner && (
                    <td className="py-3 text-center no-print">
                      <button onClick={() => handleRemoveLineItem(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-3 text-right text-sm font-semibold text-gray-700">Total Monthly</td>
                <td className="py-3 text-right text-lg font-bold text-blue-600">{formatCAD(quote.totalMonthly)}</td>
                {isOwnerOrPartner && <td></td>}
              </tr>
              <tr>
                <td colSpan={4} className="py-1 text-right text-sm text-gray-500">Estimated Annual</td>
                <td className="py-1 text-right text-base font-semibold text-gray-700">{formatCAD(totalAnnual)}</td>
                {isOwnerOrPartner && <td></td>}
              </tr>
            </tfoot>
          </table>

          {/* Action Buttons */}
          {isOwnerOrPartner && (
            <div className="no-print mb-4 flex flex-wrap items-center gap-2">
              <Button size="sm" icon={Plus} variant="secondary" onClick={() => setShowAddLineItem(true)}>Add Line Item</Button>
              <Button size="sm" icon={Calculator} variant="secondary" onClick={() => setShowEstimator(true)}>Open Estimator</Button>
              <Button size="sm" icon={Bookmark} variant="secondary" onClick={() => navigate('/quotes/templates')}>
                Templates
              </Button>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="border-t border-gray-200 pt-4 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Convert to Client */}
          {isOwnerOrPartner && (quote.status === 'accepted') && (
            <div className="no-print border-t border-gray-200 pt-4 mt-6">
              <Button icon={Building2} onClick={() => setShowConvertConfirm(true)}>
                Convert to Client & Site
              </Button>
              <p className="text-xs text-gray-400 mt-1">Creates a client record and site from this accepted quote</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-6 text-center text-xs text-gray-400 print:mt-4">
            <div className="flex justify-center items-center gap-3 mb-2">
              <Logo size={24} variant="icon" />
              <span className="font-medium text-gray-500">{state.settings.businessName}</span>
            </div>
            <p>Commercial Cleaning Services</p>
            <p>This proposal is valid until {formatDate(quote.validUntil)}. Prices subject to change.</p>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete} title="Delete Quote?" message="This action cannot be undone."
        confirmLabel="Delete" variant="danger" />

      {/* Add Line Item Modal */}
      <Modal isOpen={showAddLineItem} onClose={() => setShowAddLineItem(false)} title="Add Cleaning Service" size="md">
        <div className="space-y-4">
          <Input label="Service Description" value={lineItemForm.description}
            onChange={e => setLineItemForm({...lineItemForm, description: e.target.value})}
            placeholder="e.g. Full Office Cleaning - KMC Pharmacy" />
          <Select label="Frequency"
            options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-weekly' }, { value: 'monthly', label: 'Monthly' }]}
            value={lineItemForm.frequency} onChange={e => setLineItemForm({...lineItemForm, frequency: e.target.value as CleaningFrequency})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Visits per Week" type="number" value={lineItemForm.visitsPerWeek.toString()}
              onChange={e => setLineItemForm({...lineItemForm, visitsPerWeek: parseInt(e.target.value) || 1})} />
            <Input label="Rate per Visit (CAD)" type="number" value={lineItemForm.amountPerVisit.toString()}
              onChange={e => setLineItemForm({...lineItemForm, amountPerVisit: parseFloat(e.target.value) || 0})} />
          </div>
          <p className="text-sm text-gray-500">
            Estimated monthly: <span className="font-medium text-gray-900">
              {formatCAD(getMonthlyAmount(lineItemForm.visitsPerWeek, lineItemForm.amountPerVisit, lineItemForm.frequency))}
            </span>
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddLineItem(false)}>Cancel</Button>
            <Button onClick={handleAddLineItem} disabled={!lineItemForm.description || lineItemForm.amountPerVisit <= 0}>Add Service</Button>
          </div>
        </div>
      </Modal>

      {/* Estimator Modal */}
      <CleaningEstimator
        isOpen={showEstimator}
        onClose={() => setShowEstimator(false)}
        onGenerate={handleEstimatorGenerated}
        templates={state.quoteTemplates}
      />

      {/* Version History Panel */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Version History</h3>
              <button onClick={() => setShowVersionHistory(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <QuoteVersionHistory
                versions={quote.versions || []}
                currentVersion={quote.currentVersion || 1}
                onRestore={(v) => {
                  const restoredQuote = { ...v.snapshot, id: quote.id } as Quote;
                  dispatch({ type: 'UPDATE_QUOTE', payload: restoredQuote });
                  setShowVersionHistory(false);
                  toast.success(`Restored to v${v.version}`);
                }}
                onCompare={(v1, v2) => setCompareVersions({ v1, v2 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Version Compare Modal */}
      {compareVersions && (
        <QuoteVersionCompare
          isOpen={true}
          onClose={() => setCompareVersions(null)}
          versionA={compareVersions.v1}
          versionB={compareVersions.v2}
        />
      )}

      {/* Convert to Client Confirm */}
      <ConfirmModal
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvertToClient}
        title={`Convert "${quote.prospectName}" to Client?`}
        message="This will create a new client record and site, and mark this quote as accepted."
        confirmLabel="Convert to Client"
        variant="warning"
      />

      {/* PDF Preview Modal */}
      <QuotePdfPreview
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        quote={quote}
        businessName={state.settings.businessName}
      />
    </AppShell>
  );
}
