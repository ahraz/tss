import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, DollarSign, Phone, User, Edit3, Trash2, Plus } from 'lucide-react';
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
import type { Site, SiteType, CleaningFrequency, DayOfWeek, SiteStatus } from '../types';

type TabType = 'overview' | 'sites' | 'finances';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, currentUser, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);

  const client = state.clients.find(c => c.id === id);
  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  if (!client) {
    return (
      <AppShell pageTitle="Client Not Found">
        <div className="page-container flex flex-col items-center justify-center gap-4 py-20">
          <Building2 size={48} className="text-gray-300" />
          <p className="text-gray-500">Client not found</p>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </AppShell>
    );
  }

  const subSites = state.sites.filter(s => s.clientId === client.id);
  const siteIds = subSites.map(s => s.id);

  // Financials
  const totalRevenue = subSites.reduce((sum, s) => sum + s.contractRate, 0);
  const clientPayments = state.payments.filter(p => siteIds.includes(p.siteId));
  const clientExpenses = state.expenses.filter(e => e.siteId && siteIds.includes(e.siteId));
  const totalPaid = clientPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = clientExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDue = clientPayments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);

  // Edit form
  const [editForm, setEditForm] = useState({ ...client });

  const handleEdit = () => {
    dispatch({ type: 'UPDATE_CLIENT', payload: { ...editForm } });
    setShowEditModal(false);
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_CLIENT', payload: client.id });
    navigate('/clients');
  };

  // Add sub-site
  const [siteForm, setSiteForm] = useState<Partial<Site>>({
    name: '', address: client.address, city: client.city, province: client.province,
    postalCode: client.postalCode, type: 'clinic', contactName: client.contactName,
    contactPhone: client.contactPhone, contractRate: 0, frequency: 'weekly',
    cleaningDays: [], assignedUserIds: [], accessNotes: '', status: 'active',
  });

  const handleAddSite = () => {
    const newSite: Site = {
      ...siteForm as Site,
      id: generateId(),
      clientId: client.id,
      isSubSite: true,
      checklist: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SITE', payload: newSite });
    setShowAddSiteModal(false);
  };

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <AppShell pageTitle={client.name}>
      <div className="page-container flex flex-col gap-6">
        {/* Back button */}
        <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 w-fit">
          <ArrowLeft size={16} /> Back to Clients
        </button>

        {/* Client Header */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                <Building2 size={28} className="text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                  <Badge label={client.status} variant={client.status === 'active' ? 'success' : client.status === 'paused' ? 'warning' : 'danger'} />
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                  <MapPin size={14} />
                  <span>{client.address}, {client.city}, {client.province} {client.postalCode}</span>
                </div>
              </div>
            </div>
            {isOwnerOrPartner && (
              <div className="flex gap-2">
                <Button variant="secondary" icon={Edit3} onClick={() => { setEditForm({ ...client }); setShowEditModal(true); }}>Edit</Button>
                <Button variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Contact</p>
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-gray-400" />
                <span>{client.contactName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Phone size={14} className="text-gray-400" />
                <span>{client.contactPhone}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Contract Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatCAD(client.contractRate)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sub-Sites</p>
              <p className="text-2xl font-bold text-gray-900">{subSites.length}</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          {(['overview', 'sites', 'finances'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Quick Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Weekly Revenue</span><span className="font-medium">{formatCAD(totalRevenue)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sub-Sites</span><span className="font-medium">{subSites.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payments Collected</span><span className="font-medium text-green-600">{formatCAD(totalPaid)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className={`font-medium ${totalDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCAD(totalDue)}</span></div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-sm text-gray-600">{client.notes || 'No notes added.'}</p>
            </Card>
          </div>
        )}

        {/* Sites Tab */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Sub-Sites ({subSites.length})</h3>
              {isOwnerOrPartner && (
                <Button size="sm" icon={Plus} onClick={() => setShowAddSiteModal(true)}>Add Sub-Site</Button>
              )}
            </div>
            {subSites.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-sm text-center py-8">No sub-sites added yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subSites.map(site => (
                  <Card key={site.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/sites/${site.id}`)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{site.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{site.address}</p>
                      </div>
                      <Badge label={site.status} variant={site.status === 'active' ? 'success' : 'danger'} />
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{formatCAD(site.contractRate)}</span>
                      <span className="text-gray-300">|</span>
                      <span className="capitalize">{site.frequency}</span>
                      <span className="text-gray-300">|</span>
                      <span>{site.cleaningDays.length} day{site.cleaningDays.length !== 1 ? 's' : ''}/week</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Finances Tab */}
        {activeTab === 'finances' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-1">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">{formatCAD(totalPaid)}</p>
              <p className="text-xs text-gray-500">From {clientPayments.length} payment{clientPayments.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-1">Expenses</h3>
              <p className="text-2xl font-bold text-red-600">{formatCAD(totalExpenses)}</p>
              <p className="text-xs text-gray-500">Across {clientExpenses.length} expense{clientExpenses.length !== 1 ? 's' : ''}</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-1">Net Profit</h3>
              <p className={`text-2xl font-bold ${totalPaid - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCAD(totalPaid - totalExpenses)}
              </p>
              <p className="text-xs text-gray-500">{totalDue > 0 ? `${formatCAD(totalDue)} outstanding` : 'All paid'}</p>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Client" size="lg">
        <div className="space-y-4">
          <Input label="Client Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Address" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
            <Input label="City" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
            <Input label="Province" value={editForm.province} onChange={e => setEditForm({...editForm, province: e.target.value})} />
            <Input label="Postal Code" value={editForm.postalCode} onChange={e => setEditForm({...editForm, postalCode: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" value={editForm.contactName} onChange={e => setEditForm({...editForm, contactName: e.target.value})} />
            <Input label="Contact Phone" value={editForm.contactPhone} onChange={e => setEditForm({...editForm, contactPhone: e.target.value})} />
          </div>
          <Input label="Contract Rate (CAD/month)" type="number" value={editForm.contractRate.toString()} onChange={e => setEditForm({...editForm, contractRate: parseFloat(e.target.value) || 0})} />
          <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }]} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as SiteStatus})} />
          <Textarea label="Notes" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete ${client.name}?`}
        message="Are you sure you want to delete this client? Sub-sites will not be deleted but will lose their client association."
        confirmLabel="Yes, Delete Client"
        variant="danger"
      />

      {/* Add Sub-Site Modal */}
      <Modal isOpen={showAddSiteModal} onClose={() => setShowAddSiteModal(false)} title={`Add Sub-Site under ${client.name}`} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label="Site Name" value={siteForm.name || ''} onChange={e => setSiteForm({...siteForm, name: e.target.value})} placeholder="e.g. KMC Pharmacy" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Address" value={siteForm.address || ''} onChange={e => setSiteForm({...siteForm, address: e.target.value})} />
            <Input label="City" value={siteForm.city || ''} onChange={e => setSiteForm({...siteForm, city: e.target.value})} />
            <Input label="Postal Code" value={siteForm.postalCode || ''} onChange={e => setSiteForm({...siteForm, postalCode: e.target.value})} />
          </div>
          <Select label="Type" options={[{ value: 'clinic', label: 'Clinic' }, { value: 'office', label: 'Office' }, { value: 'retail', label: 'Retail' }, { value: 'plaza', label: 'Plaza' }, { value: 'warehouse', label: 'Warehouse' }, { value: 'other', label: 'Other' }]} value={siteForm.type || 'clinic'} onChange={e => setSiteForm({...siteForm, type: e.target.value as SiteType})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" value={siteForm.contactName || ''} onChange={e => setSiteForm({...siteForm, contactName: e.target.value})} />
            <Input label="Contact Phone" value={siteForm.contactPhone || ''} onChange={e => setSiteForm({...siteForm, contactPhone: e.target.value})} />
          </div>
          <Input label="Contract Rate (CAD/week)" type="number" value={siteForm.contractRate?.toString() || '0'} onChange={e => setSiteForm({...siteForm, contractRate: parseFloat(e.target.value) || 0})} />
          <Select label="Frequency" options={[{ value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'daily', label: 'Daily' }]} value={siteForm.frequency || 'weekly'} onChange={e => setSiteForm({...siteForm, frequency: e.target.value as CleaningFrequency})} />
          <Textarea label="Access Notes" value={siteForm.accessNotes || ''} onChange={e => setSiteForm({...siteForm, accessNotes: e.target.value})} rows={2} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddSiteModal(false)}>Cancel</Button>
            <Button onClick={handleAddSite} disabled={!siteForm.name}>Add Sub-Site</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
