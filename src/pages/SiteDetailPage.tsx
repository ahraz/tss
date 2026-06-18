import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, KeySquare, Users, Edit3, Trash2, Plus } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { formatCAD, formatDate, formatTime } from '../utils/formatters';
import { calculateSiteProfit } from '../utils/calculations';
import { generateId } from '../utils/storage';
import type { Site, SiteType, CleaningFrequency, DayOfWeek } from '../types';

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentUser, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'info'|'shifts'|'finances'|'checklist'>('info');
  
  const site = state.sites.find(s => s.id === id);
  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  // Checklist state
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [deleteChecklistItemId, setDeleteChecklistItemId] = useState<string | null>(null);

  // Edit Site Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Site>>({});

  if (!site || !currentUser) return null;

  const handleAddChecklist = () => {
    if (!newChecklistItem.trim()) return;
    const updated = {
      ...site,
      checklist: [
        ...site.checklist, 
        { id: generateId(), label: newChecklistItem, order: site.checklist.length + 1 }
      ]
    };
    dispatch({ type: 'UPDATE_SITE', payload: updated });
    setNewChecklistItem('');
  };

  const handleDeleteChecklist = () => {
    if (!deleteChecklistItemId) return;
    const updated = {
      ...site,
      checklist: site.checklist.filter(c => c.id !== deleteChecklistItemId).map((c, i) => ({...c, order: i+1}))
    };
    dispatch({ type: 'UPDATE_SITE', payload: updated });
    setDeleteChecklistItemId(null);
  };

  const moveChecklistItem = (index: number, direction: -1 | 1) => {
    const list = [...site.checklist];
    if (index + direction < 0 || index + direction >= list.length) return;
    const temp = list[index];
    list[index] = list[index + direction];
    list[index + direction] = temp;
    // Fix orders
    list.forEach((item, i) => item.order = i + 1);
    dispatch({ type: 'UPDATE_SITE', payload: { ...site, checklist: list } });
  };

  const openEditModal = () => {
    setFormData(site);
    setShowEditModal(true);
  };

  const handleUpdateSite = () => {
    if (!formData.name || !formData.address) return;
    dispatch({ type: 'UPDATE_SITE', payload: formData as Site });
    setShowEditModal(false);
  };

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const renderInfoTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Details</h3>
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users size={18}/></div>
            <span className="font-medium">{site.contactName || 'No contact name'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Phone size={18}/></div>
            <a href={`tel:${site.contactPhone}`} className="font-medium hover:text-blue-600">{site.contactPhone || 'No phone'}</a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contract & Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Rate</p>
              <p className="font-bold text-gray-900">{formatCAD(site.contractRate)} <span className="text-xs font-normal">/visit</span></p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Frequency</p>
              <p className="font-medium text-gray-900 capitalize">{site.frequency}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Schedule</p>
              <p className="font-medium text-gray-900">
                {site.scheduleStart && site.scheduleEnd
                  ? `${formatTime(site.scheduleStart)} – ${formatTime(site.scheduleEnd)}`
                  : '—'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {site.cleaningDays.map(d => (
              <Badge key={d} label={d.slice(0,3).toUpperCase()} variant="info" />
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="bg-amber-50 border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2"><KeySquare size={16}/> Access Notes</h3>
          <p className="text-amber-900 text-sm whitespace-pre-wrap">{site.accessNotes || 'No access instructions provided.'}</p>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned Team</h3>
          <div className="flex flex-wrap gap-3">
            {site.assignedUserIds.map(uid => {
              const user = state.users.find(u => u.id === uid);
              if (!user) return null;
              return (
                <div key={user.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pr-3">
                  <UserAvatar user={user} size="sm" />
                  <span className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</span>
                </div>
              );
            })}
            {site.assignedUserIds.length === 0 && <p className="text-sm text-gray-500">No employees assigned</p>}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderChecklistTab = () => (
    <Card className="max-w-3xl mx-auto">
      <div className="mb-6 flex gap-3">
        <Input 
          placeholder="Add new checklist item..." 
          value={newChecklistItem} 
          onChange={e => setNewChecklistItem(e.target.value)}
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
        />
        <Button icon={Plus} onClick={handleAddChecklist} disabled={!newChecklistItem.trim()}>Add</Button>
      </div>

      <div className="space-y-2">
        {site.checklist.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No checklist items defined.</p>
        ) : (
          site.checklist.sort((a,b)=>a.order-b.order).map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm group">
              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveChecklistItem(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">▲</button>
                <button onClick={() => moveChecklistItem(index, 1)} disabled={index === site.checklist.length-1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">▼</button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
              </div>
              <button onClick={() => setDeleteChecklistItemId(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderFinancesTab = () => {
    const now = new Date();
    const stats = calculateSiteProfit(site.id, state.payments, state.shifts, state.users, state.expenses, startOfMonth(now), endOfMonth(now));
    
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900">This Month's Financials</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <p className="text-xs font-semibold text-green-700 uppercase mb-1">Revenue</p>
            <p className="text-2xl font-bold text-green-900">{formatCAD(stats.revenue)}</p>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <p className="text-xs font-semibold text-red-700 uppercase mb-1">Labour Cost</p>
            <p className="text-2xl font-bold text-red-900">{formatCAD(stats.labourCost)}</p>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Expenses</p>
            <p className="text-2xl font-bold text-amber-900">{formatCAD(stats.expenses)}</p>
          </Card>
          <Card className={stats.net >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}>
            <p className={`text-xs font-semibold uppercase mb-1 ${stats.net >= 0 ? "text-blue-700" : "text-red-700"}`}>Net Profit</p>
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-bold ${stats.net >= 0 ? "text-blue-900" : "text-red-900"}`}>{formatCAD(stats.net)}</p>
              <Badge label={`${stats.margin.toFixed(1)}%`} variant={stats.margin >= 40 ? 'success' : stats.margin >= 20 ? 'warning' : 'danger'} />
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <AppShell pageTitle="Site Details">
      <div className="page-container flex flex-col gap-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
                <div className={`w-3 h-3 rounded-full ${site.status === 'active' ? 'bg-green-500' : site.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} title={site.status} />
              </div>
              <div className="flex items-center gap-2 text-gray-500 mb-3">
                <MapPin size={16} />
                <span>{site.address}, {site.city}, {site.province} {site.postalCode}</span>
              </div>
              <div className="flex gap-2">
                <Badge label={site.type} />
                <Badge label={site.status} variant={site.status === 'active' ? 'success' : site.status === 'paused' ? 'warning' : 'danger'} />
              </div>
            </div>
            {isOwnerOrPartner && (
              <Button variant="secondary" icon={Edit3} onClick={openEditModal}>Edit Site</Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200">
          {[
            { id: 'info', label: 'Information' },
            { id: 'shifts', label: 'Recent Shifts' },
            { id: 'checklist', label: 'Checklist' },
            ...(isOwnerOrPartner ? [{ id: 'finances', label: 'Finances' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="pt-2">
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'checklist' && renderChecklistTab()}
          {activeTab === 'finances' && isOwnerOrPartner && renderFinancesTab()}
          {activeTab === 'shifts' && (
            <div className="space-y-3">
              {state.shifts.filter(s => s.siteId === site.id).length === 0 ? (
                <Card>
                  <p className="text-gray-500 text-center py-8">No shifts recorded for this site yet.</p>
                </Card>
              ) : (
                [...state.shifts]
                  .filter(s => s.siteId === site.id)
                  .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())
                  .slice(0, 20)
                  .map(shift => {
                    const user = state.users.find(u => u.id === shift.userId);
                    return (
                      <Card key={shift.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user || null} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{formatDate(shift.clockInTime)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge label={shift.status} variant={shift.status === 'completed' ? 'success' : 'warning'} />
                          <p className="text-xs text-gray-400 mt-1">
                            {shift.clockInTime ? formatTime(shift.clockInTime) : ''}
                            {shift.durationMinutes ? ` · ${Math.round(shift.durationMinutes / 60 * 10) / 10}h` : ''}
                          </p>
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
          )}
        </div>

      </div>

      <ConfirmModal 
        isOpen={!!deleteChecklistItemId} 
        onClose={() => setDeleteChecklistItemId(null)}
        onConfirm={handleDeleteChecklist}
        title="Delete Checklist Item"
        message="Are you sure you want to remove this item? This will not affect past shifts."
      />

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Site" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Site Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
            <Select label="Type" options={['clinic','office','plaza','retail','warehouse','other'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value as SiteType})} />
          </div>
          
          <Input label="Address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} className="col-span-1" />
            <Input label="Province" value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} className="col-span-1" />
            <Input label="Postal Code" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} className="col-span-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <Input label="Contact Name" value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} />
            <Input label="Contact Phone" value={formData.contactPhone || ''} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <Input label="Contract Rate (CAD)" type="number" value={formData.contractRate || ''} onChange={e => setFormData({...formData, contractRate: Number(e.target.value)})} />
            <Select label="Frequency" options={['daily','weekly','biweekly','monthly'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.frequency || ''} onChange={e => setFormData({...formData, frequency: e.target.value as CleaningFrequency})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Schedule Start" type="time" value={formData.scheduleStart || ''} onChange={e => setFormData({...formData, scheduleStart: e.target.value})} />
            <Input label="Schedule End" type="time" value={formData.scheduleEnd || ''} onChange={e => setFormData({...formData, scheduleEnd: e.target.value})} />
          </div>

          <Select label="Status" options={['active','paused','cancelled'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as any})} />

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
                    checked={formData.assignedUserIds?.includes(u.id) || false}
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

          <Textarea label="Access Notes" placeholder="Door codes, alarms, special instructions..." value={formData.accessNotes || ''} onChange={e => setFormData({...formData, accessNotes: e.target.value})} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateSite} disabled={!formData.name || !formData.address}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
