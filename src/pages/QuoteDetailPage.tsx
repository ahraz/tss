import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, DollarSign, Plus, Trash2, Printer, Send, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { formatCAD, formatDate } from '../utils/formatters';
import { generateId } from '../utils/storage';
import type { Quote, QuoteLineItem, QuoteStatus, CleaningFrequency } from '../types';

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
  const [showEditLineItem, setShowEditLineItem] = useState<string | null>(null);

  const quote = state.quotes.find(q => q.id === id);
  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const [lineItemForm, setLineItemForm] = useState({
    description: '', siteId: '', frequency: 'weekly' as CleaningFrequency,
    amountPerVisit: 0, visitsPerWeek: 1,
  });

  const getMonthlyAmount = (visits: number, perVisit: number, freq: CleaningFrequency) => {
    const multiplier = freq === 'weekly' ? 4.33 : freq === 'biweekly' ? 2.17 : 1;
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
    dispatch({ type: 'UPDATE_QUOTE', payload: { ...quote, status, updatedAt: new Date().toISOString() } });
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
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: { ...quote, lineItems, totalMonthly, updatedAt: new Date().toISOString() },
    });
    setShowAddLineItem(false);
    setLineItemForm({ description: '', siteId: '', frequency: 'weekly', amountPerVisit: 0, visitsPerWeek: 1 });
  };

  const handleRemoveLineItem = (itemId: string) => {
    const lineItems = quote.lineItems.filter(li => li.id !== itemId);
    const totalMonthly = lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);
    dispatch({
      type: 'UPDATE_QUOTE',
      payload: { ...quote, lineItems, totalMonthly, updatedAt: new Date().toISOString() },
    });
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
                <Button size="sm" icon={Printer} variant="secondary" onClick={handlePrint}>Print</Button>
                <Button size="sm" icon={Trash2} variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </>
            )}
          </div>
        </div>

        {/* Print-Friendly Proposal View */}
        <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 print:shadow-none print:border-0 print:p-0">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-6 print:pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quote.prospectName}</h1>
                <p className="text-gray-500 mt-1">{quote.prospectAddress}</p>
                <p className="text-gray-500">{quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}</p>
                {quote.prospectPhone && <p className="text-gray-500">{quote.prospectPhone}</p>}
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

          {/* Quote Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Cleaning Service Proposal</h2>
            <p className="text-sm text-gray-500">Prepared by {state.settings.businessName} for {quote.prospectName}</p>
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

          {/* Add Line Item */}
          {isOwnerOrPartner && (
            <div className="no-print mb-6">
              <Button size="sm" icon={Plus} variant="secondary" onClick={() => setShowAddLineItem(true)}>Add Line Item</Button>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <div className="border-t border-gray-200 pt-4 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-6 text-center text-xs text-gray-400 print:mt-4">
            <p>{state.settings.businessName} — Professional Cleaning Services</p>
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
            options={[{ value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-weekly' }, { value: 'monthly', label: 'Monthly' }]}
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
    </AppShell>
  );
}
