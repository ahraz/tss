import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, DollarSign, Users } from 'lucide-react';
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
import { formatCAD } from '../utils/formatters';
import { generateId } from '../utils/storage';
import type { Client, CleaningFrequency, DayOfWeek, SiteStatus } from '../types';

export function ClientsPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SiteStatus | 'all'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
    contactName: '', contactPhone: '', contractRate: 0,
    frequency: 'weekly' as CleaningFrequency, cleaningDays: ['monday'] as DayOfWeek[],
    status: 'active' as SiteStatus, notes: '',
  });

  const filteredClients = useMemo(() => {
    return state.clients.filter(client => {
      if (statusFilter !== 'all' && client.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return client.name.toLowerCase().includes(q) ||
          client.address.toLowerCase().includes(q) ||
          client.city.toLowerCase().includes(q) ||
          client.postalCode.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.clients, statusFilter, searchQuery]);

  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const getSubSiteCount = (clientId: string) =>
    state.sites.filter(s => s.clientId === clientId).length;

  const getClientRevenue = (clientId: string) =>
    state.sites.filter(s => s.clientId === clientId)
      .reduce((sum, s) => sum + s.contractRate, 0);

  const handleAddClient = () => {
    const newClient: Client = {
      id: generateId(),
      ...formData,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CLIENT', payload: newClient });
    setShowAddModal(false);
    setFormData({ name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
      contactName: '', contactPhone: '', contractRate: 0, frequency: 'weekly',
      cleaningDays: ['monday'], status: 'active', notes: '' });
  };

  return (
    <AppShell pageTitle="Clients">
      <div className="page-container flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex overflow-x-auto w-full md:w-auto bg-gray-100 p-1 rounded-xl">
            {(['active', 'all', 'paused', 'cancelled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  statusFilter === tab ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
                <span className="ml-2 text-xs opacity-60">
                  {state.clients.filter(c => tab === 'all' || c.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <div className="flex-1 md:w-64">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, address, or postal code..." />
            </div>
            {isOwnerOrPartner && (
              <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Client</Button>
            )}
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <Card className="flex-1">
            <EmptyState icon={Building2} title="No clients found" description="Add your first client to get started." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => {
              const subSiteCount = getSubSiteCount(client.id);
              const revenue = getClientRevenue(client.id);
              return (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border border-gray-150"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Building2 size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{client.name}</h4>
                        <Badge label={client.status} variant={client.status === 'active' ? 'success' : client.status === 'paused' ? 'warning' : 'danger'} className="text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{client.address}, {client.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{formatCAD(revenue)}/week from {subSiteCount} sub-site{subSiteCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <span>{subSiteCount} location{subSiteCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {client.notes && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">{client.notes}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Client/Business Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Kennedy Medical Clinic" required className="col-span-2" />
            <Input label="Street Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="7990 Kennedy Rd S" className="col-span-2" />
            <Input label="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            <Input label="Province" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
            <Input label="Postal Code" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} placeholder="L6W 4L3" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Dr. Kennedy" />
            <Input label="Contact Phone" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} placeholder="905-555-0404" />
          </div>
          <Input label="Contract Rate (CAD/month)" type="number" value={formData.contractRate.toString()} onChange={e => setFormData({...formData, contractRate: parseFloat(e.target.value) || 0})} />
          <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }]} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as SiteStatus})} />
          <Textarea label="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any notes about this client..." rows={3} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!formData.name}>Add Client</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
