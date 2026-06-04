import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, DollarSign, Calendar, Search, Building2 } from 'lucide-react';
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
import type { Site, SiteType, CleaningFrequency, DayOfWeek } from '../types';

export function SitesPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'cancelled'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Site Form State
  const [formData, setFormData] = useState<Partial<Site>>({
    name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
    type: 'clinic', contactName: '', contactPhone: '', contractRate: 0,
    frequency: 'weekly', cleaningDays: [], assignedUserIds: [], accessNotes: '', status: 'active',
  });

  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const filteredSites = useMemo(() => {
    return state.sites.filter(site => {
      if (activeTab !== 'all' && site.status !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return site.name.toLowerCase().includes(q) || site.address.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.sites, activeTab, searchQuery]);

  const getLastVisit = (siteId: string) => {
    const siteShifts = state.shifts.filter(s => s.siteId === siteId && s.status === 'completed');
    if (siteShifts.length === 0) return null;
    const latest = siteShifts.reduce((a, b) => new Date(a.clockInTime) > new Date(b.clockInTime) ? a : b);
    return latest.clockInTime;
  };

  const handleAddSite = () => {
    const newSite: Site = {
      ...formData as Site,
      id: generateId(),
      checklist: [],
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_SITE', payload: newSite });
    setShowAddModal(false);
  };

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <AppShell pageTitle="Sites">
      <div className="page-container flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex overflow-x-auto w-full md:w-auto bg-gray-100 p-1 rounded-xl">
            {['all', 'active', 'paused', 'cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {tab}
                <span className="ml-2 text-xs opacity-60">
                  {state.sites.filter(s => tab === 'all' || s.status === tab).length}
                </span>
              </button>
            ))}
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <div className="flex-1 md:w-64">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search sites..." />
            </div>
            {isOwnerOrPartner && (
              <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Site</Button>
            )}
          </div>
        </div>

        {filteredSites.length === 0 ? (
          <Card className="flex-1">
            <EmptyState icon={Building2} title="No sites found" description="Try adjusting your search or filters." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSites.map(site => {
              const lastVisit = getLastVisit(site.id);
              return (
                <Card key={site.id} hoverable onClick={() => navigate(`/sites/${site.id}`)} className="flex flex-col h-full group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{site.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{site.address}, {site.city}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`w-3 h-3 rounded-full ${site.status === 'active' ? 'bg-green-500' : site.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} title={site.status} />
                      <Badge label={site.type} />
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><DollarSign size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Rate</p>
                        <p className="font-semibold text-gray-900">{formatCAD(site.contractRate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Last Visit</p>
                        <p className="font-medium text-gray-900">{lastVisit ? formatDate(lastVisit) : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Site Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Site" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Site Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Select label="Type" options={['clinic','office','plaza','retail','warehouse','other'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as SiteType})} />
            </div>
            
            <Input label="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            
            <div className="grid grid-cols-3 gap-4">
              <Input label="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="col-span-1" />
              <Input label="Province" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="col-span-1" />
              <Input label="Postal Code" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} className="col-span-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <Input label="Contact Name" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
              <Input label="Contact Phone" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <Input label="Contract Rate (CAD)" type="number" value={formData.contractRate} onChange={e => setFormData({...formData, contractRate: Number(e.target.value)})} />
              <Select label="Frequency" options={['daily','weekly','biweekly','monthly'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as CleaningFrequency})} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Cleaning Days</label>
              <div className="flex flex-wrap gap-2">
                {days.map(d => {
                  const isSelected = formData.cleaningDays?.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => setFormData({
                        ...formData, 
                        cleaningDays: isSelected ? formData.cleaningDays!.filter(x => x !== d) : [...(formData.cleaningDays||[]), d]
                      })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Assigned Employees</label>
              <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {state.users.filter(u => u.isActive && u.role !== 'owner').map(u => (
                  <label key={u.id} className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={formData.assignedUserIds?.includes(u.id)}
                      onChange={(e) => {
                        const ids = formData.assignedUserIds || [];
                        setFormData({...formData, assignedUserIds: e.target.checked ? [...ids, u.id] : ids.filter(id => id !== u.id)});
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{u.name} ({u.role})</span>
                  </label>
                ))}
              </div>
            </div>

            <Textarea label="Access Notes" placeholder="Door codes, alarms, special instructions..." value={formData.accessNotes} onChange={e => setFormData({...formData, accessNotes: e.target.value})} />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddSite} disabled={!formData.name || !formData.address}>Create Site</Button>
            </div>
          </div>
        </Modal>

      </div>
    </AppShell>
  );
}
