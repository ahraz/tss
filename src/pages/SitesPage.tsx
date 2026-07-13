import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, DollarSign, Calendar, Search, Building2, Layers, Edit2, Trash2, UserPlus } from 'lucide-react';
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
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { formatCAD, formatDate } from '../utils/formatters';
import { generateId } from '../utils/storage';
import type { Site, SiteType, CleaningFrequency, DayOfWeek, SiteStatus } from '../types';

export function SitesPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'cancelled'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'area'>('list');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Site Form State
  const [formData, setFormData] = useState<Partial<Site>>({
    name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
    type: 'clinic', contactName: '', contactPhone: '', contractRate: 0,
    frequency: 'weekly', cleaningDays: [], assignedUserIds: [], accessNotes: '', status: 'active', clientId: null,
  });

  // Edit Site State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Site>>({});
  const [editSiteId, setEditSiteId] = useState<string | null>(null);

  // Delete Site State
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);

  // Add Client State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
    contactName: '', contactPhone: '', contractRate: 0,
    frequency: 'weekly' as CleaningFrequency, cleaningDays: ['monday'] as DayOfWeek[],
    status: 'active' as SiteStatus, notes: '',
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

  const openEditModal = (site: Site) => {
    setEditSiteId(site.id);
    setEditFormData(site);
    setShowEditModal(true);
  };

  const handleUpdateSite = () => {
    if (!editFormData.name || !editFormData.address || !editSiteId) return;
    dispatch({ type: 'UPDATE_SITE', payload: { ...editFormData, id: editSiteId } as Site });
    setShowEditModal(false);
    setEditSiteId(null);
  };

  const handleDeleteSite = () => {
    if (deleteSiteId) {
      dispatch({ type: 'DELETE_SITE', payload: deleteSiteId });
      setDeleteSiteId(null);
    }
  };

  const handleAddClient = () => {
    if (!clientForm.name.trim()) return;
    const newClient = {
      id: generateId(),
      ...clientForm,
      name: clientForm.name.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CLIENT', payload: newClient });
    setShowAddClientModal(false);
    setClientForm({ name: '', address: '', city: 'Brampton', province: 'ON', postalCode: '',
      contactName: '', contactPhone: '', contractRate: 0, frequency: 'weekly',
      cleaningDays: ['monday'], status: 'active', notes: '' });
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
              <Button
                icon={viewMode === 'area' ? Building2 : Layers}
                variant="secondary"
                onClick={() => setViewMode(viewMode === 'list' ? 'area' : 'list')}
                className="hidden md:inline-flex"
              >
                {viewMode === 'area' ? 'List View' : 'By Area'}
              </Button>
            )}
            {isOwnerOrPartner && (
              <Button icon={Plus} onClick={() => setShowAddModal(true)}><span className="hidden sm:inline">Add Site</span></Button>
            )}
            {isOwnerOrPartner && (
              <Button icon={UserPlus} variant="secondary" onClick={() => setShowAddClientModal(true)}><span className="hidden sm:inline">Add Client</span></Button>
            )}
          </div>
        </div>

        {/* Mobile View Toggle */}
        {isOwnerOrPartner && (
          <div className="flex md:hidden bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600'}`}
            >
              <Building2 size={16} className="inline mr-1" /> List
            </button>
            <button
              onClick={() => setViewMode('area')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'area' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600'}`}
            >
              <Layers size={16} className="inline mr-1" /> By Area
            </button>
          </div>
        )}

        {viewMode === 'area' ? (
          <AreaView
            sites={filteredSites}
            navigate={navigate}
            formatCAD={formatCAD}
            state={state}
          />
        ) : filteredSites.length === 0 ? (
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
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Cleaning Days</p>
                        <p className="font-medium text-gray-900 text-xs truncate">{site.cleaningDays.map(d => d.slice(0, 2).toUpperCase()).join(', ') || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {isOwnerOrPartner && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" icon={Edit2} onClick={() => openEditModal(site)}>Edit</Button>
                      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteSiteId(site.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">Delete</Button>
                    </div>
                  )}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <Input label="Schedule Start" type="time" value={formData.scheduleStart || ''} onChange={e => setFormData({...formData, scheduleStart: e.target.value})} />
              <Input label="Schedule End" type="time" value={formData.scheduleEnd || ''} onChange={e => setFormData({...formData, scheduleEnd: e.target.value})} />
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

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Client</label>
              <Select
                options={[
                  { value: '', label: '— No client —' },
                  ...state.clients.map(c => ({ value: c.id, label: c.name })),
                ]}
                value={formData.clientId || ''}
                onChange={e => setFormData({...formData, clientId: e.target.value || null})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddSite} disabled={!formData.name || !formData.address}>Create Site</Button>
            </div>
          </div>
        </Modal>

        {/* Edit Site Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Site" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Site Name" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
              <Select label="Type" options={['clinic','office','plaza','retail','warehouse','other'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={editFormData.type || ''} onChange={e => setEditFormData({...editFormData, type: e.target.value as SiteType})} />
            </div>
            
            <Input label="Address" value={editFormData.address || ''} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="City" value={editFormData.city || ''} onChange={e => setEditFormData({...editFormData, city: e.target.value})} className="col-span-1" />
              <Input label="Province" value={editFormData.province || ''} onChange={e => setEditFormData({...editFormData, province: e.target.value})} className="col-span-1" />
              <Input label="Postal Code" value={editFormData.postalCode || ''} onChange={e => setEditFormData({...editFormData, postalCode: e.target.value})} className="col-span-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <Input label="Contact Name" value={editFormData.contactName || ''} onChange={e => setEditFormData({...editFormData, contactName: e.target.value})} />
              <Input label="Contact Phone" value={editFormData.contactPhone || ''} onChange={e => setEditFormData({...editFormData, contactPhone: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <Input label="Contract Rate (CAD)" type="number" value={editFormData.contractRate || ''} onChange={e => setEditFormData({...editFormData, contractRate: Number(e.target.value)})} />
              <Select label="Frequency" options={['daily','weekly','biweekly','monthly'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={editFormData.frequency || ''} onChange={e => setEditFormData({...editFormData, frequency: e.target.value as CleaningFrequency})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Schedule Start" type="time" value={editFormData.scheduleStart || ''} onChange={e => setEditFormData({...editFormData, scheduleStart: e.target.value})} />
              <Input label="Schedule End" type="time" value={editFormData.scheduleEnd || ''} onChange={e => setEditFormData({...editFormData, scheduleEnd: e.target.value})} />
            </div>

            <Select label="Status" options={['active','paused','cancelled'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={editFormData.status || ''} onChange={e => setEditFormData({...editFormData, status: e.target.value as any})} />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Cleaning Days</label>
              <div className="flex flex-wrap gap-2">
                {days.map(d => {
                  const isSelected = editFormData.cleaningDays?.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => setEditFormData({
                        ...editFormData, 
                        cleaningDays: isSelected ? editFormData.cleaningDays!.filter(x => x !== d) : [...(editFormData.cleaningDays||[]), d]
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
                      checked={editFormData.assignedUserIds?.includes(u.id) || false}
                      onChange={(e) => {
                        const ids = editFormData.assignedUserIds || [];
                        setEditFormData({...editFormData, assignedUserIds: e.target.checked ? [...ids, u.id] : ids.filter(id => id !== u.id)});
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{u.name} ({u.role})</span>
                  </label>
                ))}
              </div>
            </div>

            <Textarea label="Access Notes" placeholder="Door codes, alarms, special instructions..." value={editFormData.accessNotes || ''} onChange={e => setEditFormData({...editFormData, accessNotes: e.target.value})} />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Client</label>
              <Select
                options={[
                  { value: '', label: '— No client —' },
                  ...state.clients.map(c => ({ value: c.id, label: c.name })),
                ]}
                value={editFormData.clientId || ''}
                onChange={e => setEditFormData({...editFormData, clientId: e.target.value || null})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleUpdateSite} disabled={!editFormData.name || !editFormData.address}>Save Changes</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Site Confirm Modal */}
        <ConfirmModal
          isOpen={!!deleteSiteId}
          onClose={() => setDeleteSiteId(null)}
          onConfirm={handleDeleteSite}
          title="Delete Site"
          message="Are you sure you want to delete this site? This action cannot be undone."
          confirmLabel="Delete"
        />

        {/* Add Client Modal */}
        <Modal isOpen={showAddClientModal} onClose={() => setShowAddClientModal(false)} title="Add New Client" size="lg">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <Input label="Client/Business Name" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} placeholder="e.g. Kennedy Medical Clinic" required />
            <Input label="Address" value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="City" value={clientForm.city} onChange={e => setClientForm({...clientForm, city: e.target.value})} />
              <Input label="Province" value={clientForm.province} onChange={e => setClientForm({...clientForm, province: e.target.value})} />
              <Input label="Postal Code" value={clientForm.postalCode} onChange={e => setClientForm({...clientForm, postalCode: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Name" value={clientForm.contactName} onChange={e => setClientForm({...clientForm, contactName: e.target.value})} />
              <Input label="Contact Phone" value={clientForm.contactPhone} onChange={e => setClientForm({...clientForm, contactPhone: e.target.value})} />
            </div>
            <Input label="Contract Rate (CAD/month)" type="number" value={String(clientForm.contractRate)} onChange={e => setClientForm({...clientForm, contractRate: parseFloat(e.target.value) || 0})} />
            <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }]} value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value as SiteStatus})} />
            <Textarea label="Notes" value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes: e.target.value})} rows={3} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowAddClientModal(false)}>Cancel</Button>
              <Button onClick={handleAddClient} disabled={!clientForm.name}>Add Client</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

// ─── Area View ────────────────────────────────────────────────
function AreaView({ sites, navigate, formatCAD, state }: {
  sites: Site[];
  navigate: ReturnType<typeof useNavigate>;
  formatCAD: (n: number) => string;
  state: { users: any[]; clients: any[] };
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Site[]>();
    for (const site of sites) {
      const tags = site.areaTags.length > 0 ? site.areaTags : ['Uncategorized'];
      for (const tag of tags) {
        if (!map.has(tag)) map.set(tag, []);
        map.get(tag)!.push(site);
      }
    }
    // Sort by area name
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [sites]);

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([area, areaSites]) => (
        <div key={area}>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
              {area}
            </div>
            <span className="text-xs text-gray-400">{areaSites.length} site{areaSites.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areaSites.map(site => {
              const client = site.clientId ? state.clients.find((c: any) => c.id === site.clientId) : null;
              return (
                <Card key={site.id} className="cursor-pointer hover:shadow-md transition-shadow border border-gray-150"
                  onClick={() => navigate(`/sites/${site.id}`)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500" />
                      <h4 className="font-semibold text-gray-900">{site.name}</h4>
                    </div>
                    <Badge label={site.status} variant={site.status === 'active' ? 'success' : 'danger'} className="text-xs" />
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{site.address}, {site.postalCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-gray-400" />
                      <span className="font-medium">${site.contractRate}<span className="text-gray-500 font-normal">/{site.frequency}</span></span>
                    </div>
                    {client && (
                      <div className="text-xs text-indigo-600">Client: {client.name}</div>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {site.areaTags.filter(t => t !== area).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
