import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, DollarSign, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { formatCAD, formatDate } from '../utils/formatters';
import { generateId } from '../utils/storage';
import { validateQuoteForm } from '../utils/quote-validation';
import type { Quote, QuoteStatus } from '../types';

const statusColors: Record<QuoteStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
};

export function QuotesPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('draft');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    prospectName: '', prospectAddress: '', prospectCity: 'Brampton',
    prospectProvince: 'ON', prospectPostalCode: '', prospectPhone: '',
    clientId: '', notes: '', validUntil: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const filteredQuotes = useMemo(() => {
    return state.quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        return q.prospectName.toLowerCase().includes(sq) ||
          q.prospectAddress.toLowerCase().includes(sq) ||
          q.prospectPostalCode.toLowerCase().includes(sq);
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.quotes, statusFilter, searchQuery]);

  const handleCreateQuote = () => {
    const result = validateQuoteForm(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const now = new Date().toISOString();
    const validUntil = formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newQuote: Quote = {
      id: generateId(),
      clientId: formData.clientId || null,
      prospectName: formData.prospectName,
      prospectAddress: formData.prospectAddress,
      prospectCity: formData.prospectCity,
      prospectProvince: formData.prospectProvince,
      prospectPostalCode: formData.prospectPostalCode,
      prospectPhone: formData.prospectPhone,
      lineItems: [],
      totalMonthly: 0,
      status: 'draft',
      validUntil,
      notes: formData.notes,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_QUOTE', payload: newQuote });
    setShowAddModal(false);
    navigate(`/quotes/${newQuote.id}`);
  };

  return (
    <AppShell pageTitle="Quotes & Proposals">
      <div className="page-container flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex overflow-x-auto w-full md:w-auto bg-gray-100 p-1 rounded-xl">
            {(['draft', 'sent', 'accepted', 'rejected', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  statusFilter === tab ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
                <span className="ml-2 text-xs opacity-60">
                  {tab === 'all' ? state.quotes.length : state.quotes.filter(q => q.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <div className="flex-1 md:w-64">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search quotes..." />
            </div>
            {isOwnerOrPartner && (
              <Button icon={Plus} onClick={() => setShowAddModal(true)}>New Quote</Button>
            )}
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <Card className="flex-1">
            <EmptyState icon={FileText} title="No quotes found" description={statusFilter === 'draft' ? 'Create your first quote to get started.' : 'No quotes match the current filter.'} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotes.map(quote => (
              <Card
                key={quote.id}
                className="cursor-pointer hover:shadow-md transition-shadow border border-gray-150"
                onClick={() => navigate(`/quotes/${quote.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileText size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{quote.prospectName}</h4>
                      <div className="flex items-center gap-2">
                        <Badge label={quote.status} variant={statusColors[quote.status]} className="text-xs" />
                        {quote.currentVersion && quote.currentVersion > 1 && (
                          <Badge label={`v${quote.currentVersion}`} variant="neutral" className="text-xs" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-gray-400" />
                    <span className="font-medium">{formatCAD(quote.totalMonthly)}<span className="text-gray-500 font-normal">/mo</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>Valid until {formatDate(quote.validUntil)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span>{quote.lineItems.length} line item{quote.lineItems.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Quote Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Quote" size="lg">
        <div className="space-y-4">
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {Object.values(formErrors).filter(Boolean).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <Input label="Prospect / Business Name" value={formData.prospectName} onChange={e => {
            setFormData({...formData, prospectName: e.target.value});
            if (formErrors.prospectName) setFormErrors(prev => ({ ...prev, prospectName: '' }));
          }} placeholder="e.g. Kennedy Medical Clinic" required error={formErrors.prospectName} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Address" value={formData.prospectAddress} onChange={e => {
              setFormData({...formData, prospectAddress: e.target.value});
              if (formErrors.prospectAddress) setFormErrors(prev => ({ ...prev, prospectAddress: '' }));
            }} placeholder="7990 Kennedy Rd S" error={formErrors.prospectAddress} />
            <Input label="City" value={formData.prospectCity} onChange={e => {
              setFormData({...formData, prospectCity: e.target.value});
              if (formErrors.prospectCity) setFormErrors(prev => ({ ...prev, prospectCity: '' }));
            }} error={formErrors.prospectCity} />
            <Input label="Province" value={formData.prospectProvince} onChange={e => {
              setFormData({...formData, prospectProvince: e.target.value});
              if (formErrors.prospectProvince) setFormErrors(prev => ({ ...prev, prospectProvince: '' }));
            }} error={formErrors.prospectProvince} />
            <Input label="Postal Code" value={formData.prospectPostalCode} onChange={e => {
              setFormData({...formData, prospectPostalCode: e.target.value});
              if (formErrors.prospectPostalCode) setFormErrors(prev => ({ ...prev, prospectPostalCode: '' }));
            }} error={formErrors.prospectPostalCode} />
          </div>
          <Input label="Phone" value={formData.prospectPhone} onChange={e => {
            setFormData({...formData, prospectPhone: e.target.value});
            if (formErrors.prospectPhone) setFormErrors(prev => ({ ...prev, prospectPhone: '' }));
          }} placeholder="905-555-0404" error={formErrors.prospectPhone} />
          <Select label="Link to Existing Client (optional)"
            options={[
              { value: '', label: '— None —' },
              ...state.clients.map(c => ({ value: c.id, label: c.name })),
            ]}
            value={formData.clientId}
            onChange={e => setFormData({...formData, clientId: e.target.value})}
          />
          <Input label="Valid Until" type="date" value={formData.validUntil} onChange={e => {
            setFormData({...formData, validUntil: e.target.value});
            if (formErrors.validUntil) setFormErrors(prev => ({ ...prev, validUntil: '' }));
          }} error={formErrors.validUntil} />
          <Textarea label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateQuote} disabled={!formData.prospectName}>Create Quote</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
