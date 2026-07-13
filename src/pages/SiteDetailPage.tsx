import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Phone, KeySquare, Users, Edit3, Trash2, Plus, Building2, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
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
import type { Site, SiteType, CleaningFrequency, DayOfWeek, SupplyItem, SupplyCategory, SupplyUnit } from '../types';

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info'|'shifts'|'finances'|'checklist'|'inventory'>('info');
  
  const site = state.sites.find(s => s.id === id);
  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  // Checklist state
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [deleteChecklistItemId, setDeleteChecklistItemId] = useState<string | null>(null);

  // Edit Site Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Site>>({});

  // Add supply item inline
  const [showAddSupply, setShowAddSupply] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ name: '', category: 'other' as SupplyCategory, unit: 'each' as SupplyUnit, reorderAt: 5, perVisitUsage: 0 });

  // Delete Site State
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);

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

  const handleDeleteSite = () => {
    if (deleteSiteId) {
      dispatch({ type: 'DELETE_SITE', payload: deleteSiteId });
      setDeleteSiteId(null);
    }
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

        {/* Client info inline */}
        {site.clientId && (() => {
          const client = state.clients.find(c => c.id === site.clientId);
          if (!client) return null;
          const otherSites = state.sites.filter(s => s.clientId === site.clientId && s.id !== site.id);
          return (
            <Card className="bg-indigo-50 border-indigo-200">
              <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 size={16} /> Client
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-indigo-900">{client.name}</p>
                <p className="text-sm text-indigo-800 flex items-center gap-2">
                  <MapPin size={14} /> {client.address}, {client.city}
                </p>
                {client.contactName && (
                  <p className="text-sm text-indigo-800 flex items-center gap-2">
                    <Users size={14} /> {client.contactName}
                  </p>
                )}
                {client.contactPhone && (
                  <p className="text-sm text-indigo-800 flex items-center gap-2">
                    <Phone size={14} />
                    <a href={`tel:${client.contactPhone}`} className="hover:underline">{client.contactPhone}</a>
                  </p>
                )}
                {otherSites.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-200">
                    <p className="text-xs font-medium text-indigo-600 mb-1">Other sites for this client:</p>
                    <div className="flex flex-wrap gap-2">
                      {otherSites.map(s => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/sites/${s.id}`)}
                          className="text-xs bg-white px-2.5 py-1 rounded-full text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })()}
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

  const renderInventoryTab = () => {
    const siteInv = state.siteInventory.filter(si => si.siteId === site.id);
    if (!isOwnerOrPartner) return null;

    const handleAddSupply = () => {
      if (!supplyForm.name.trim()) { toast.error('Item name required'); return; }
      const item: SupplyItem = { id: generateId(), ...supplyForm, name: supplyForm.name.trim(), notes: '' };
      dispatch({ type: 'ADD_SUPPLY_ITEM', payload: item });
      // Auto-stock at this site
      dispatch({ type: 'ADD_SITE_INVENTORY', payload: { id: generateId(), siteId: site.id, itemId: item.id, quantity: item.reorderAt * 3, lastRestocked: new Date().toISOString() } });
      setSupplyForm({ name: '', category: 'other', unit: 'each', reorderAt: 5, perVisitUsage: 0 });
      setShowAddSupply(false);
      toast.success(`Added ${item.name} + stocked ${item.reorderAt * 3} ${item.unit}`);
    };

    const handleSeedDefaults = () => {
      const defaults = [
        { name: 'Paper Towels', category: 'paper' as SupplyCategory, unit: 'roll' as SupplyUnit, reorderAt: 6, perVisitUsage: 1.5 },
        { name: 'Toilet Paper', category: 'paper' as SupplyCategory, unit: 'roll' as SupplyUnit, reorderAt: 12, perVisitUsage: 2 },
        { name: 'Garbage Bags (Large)', category: 'plastic' as SupplyCategory, unit: 'box' as SupplyUnit, reorderAt: 1, perVisitUsage: 0.3 },
        { name: 'All-Purpose Cleaner', category: 'chemical' as SupplyCategory, unit: 'bottle' as SupplyUnit, reorderAt: 2, perVisitUsage: 0.2 },
        { name: 'Glass Cleaner', category: 'chemical' as SupplyCategory, unit: 'bottle' as SupplyUnit, reorderAt: 2, perVisitUsage: 0.15 },
        { name: 'Disinfectant Spray', category: 'chemical' as SupplyCategory, unit: 'bottle' as SupplyUnit, reorderAt: 2, perVisitUsage: 0.2 },
        { name: 'Hand Soap', category: 'chemical' as SupplyCategory, unit: 'bottle' as SupplyUnit, reorderAt: 3, perVisitUsage: 0.15 },
        { name: 'Microfiber Cloths', category: 'equipment' as SupplyCategory, unit: 'each' as SupplyUnit, reorderAt: 10, perVisitUsage: 0.5 },
        { name: 'Latex Gloves', category: 'safety' as SupplyCategory, unit: 'box' as SupplyUnit, reorderAt: 2, perVisitUsage: 0.1 },
      ];
      defaults.forEach(s => {
        const item: SupplyItem = { id: generateId(), ...s, notes: '' };
        dispatch({ type: 'ADD_SUPPLY_ITEM', payload: item });
        dispatch({ type: 'ADD_SITE_INVENTORY', payload: { id: generateId(), siteId: site.id, itemId: item.id, quantity: s.reorderAt * 3, lastRestocked: new Date().toISOString() } });
      });
      toast.success(`Added ${defaults.length} supplies to ${site.name}`);
    };

    return (
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">Stock at {site.name}</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setShowAddSupply(true)}>Add Item</Button>
            {state.supplyItems.length === 0 && (
              <Button variant="secondary" size="sm" onClick={handleSeedDefaults}>Seed Defaults</Button>
            )}
          </div>
        </div>

        {/* Inline add supply form */}
        {showAddSupply && (
          <Card className="border-blue-200 bg-blue-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input placeholder="Item name" value={supplyForm.name} onChange={e => setSupplyForm({...supplyForm, name: e.target.value})} className="sm:col-span-2" />
              <Select options={[
                { value: 'paper', label: 'Paper' }, { value: 'chemical', label: 'Chemical' },
                { value: 'plastic', label: 'Plastic' }, { value: 'equipment', label: 'Equipment' },
                { value: 'safety', label: 'Safety' }, { value: 'other', label: 'Other' },
              ]} value={supplyForm.category} onChange={e => setSupplyForm({...supplyForm, category: e.target.value as SupplyCategory})} />
              <Select options={[
                { value: 'each', label: 'Each' }, { value: 'roll', label: 'Roll' },
                { value: 'bottle', label: 'Bottle' }, { value: 'box', label: 'Box' },
                { value: 'case', label: 'Case' }, { value: 'litre', label: 'Litre' },
              ]} value={supplyForm.unit} onChange={e => setSupplyForm({...supplyForm, unit: e.target.value as SupplyUnit})} />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowAddSupply(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddSupply} disabled={!supplyForm.name.trim()}>Add & Stock</Button>
            </div>
          </Card>
        )}

        {state.supplyItems.length === 0 && !showAddSupply ? (
          <Card>
            <p className="text-gray-500 text-sm text-center py-8">
              No supplies yet. Use <strong>"Seed Defaults"</strong> to auto-add common cleaning supplies, or <strong>"Add Item"</strong> to create custom ones.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {state.supplyItems.map((item: SupplyItem) => {
              const inv = siteInv.find(si => si.itemId === item.id);
              const qty = inv ? inv.quantity : 0;
              const isLow = qty <= item.reorderAt;
              return (
                <Card key={item.id} className={`${isLow ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{qty}</span>
                        <span className="text-xs text-gray-500">{item.unit}</span>
                        {isLow && <AlertTriangle size={14} className="text-amber-500" />}
                      </div>
                      {isLow && <p className="text-[10px] text-red-600 mt-0.5">Reorder at {item.reorderAt}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const existing = state.siteInventory.find(si => si.siteId === site.id && si.itemId === item.id);
                          if (existing) {
                            dispatch({ type: 'UPDATE_SITE_INVENTORY', payload: { ...existing, quantity: existing.quantity + 1, lastRestocked: new Date().toISOString() } });
                          } else {
                            dispatch({ type: 'ADD_SITE_INVENTORY', payload: { id: generateId(), siteId: site.id, itemId: item.id, quantity: 1, lastRestocked: new Date().toISOString() } });
                          }
                          toast.success('Restocked +1');
                        }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Restock +1"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const existing = state.siteInventory.find(si => si.siteId === site.id && si.itemId === item.id);
                          if (existing && existing.quantity > 0) {
                            dispatch({ type: 'UPDATE_SITE_INVENTORY', payload: { ...existing, quantity: Math.max(0, existing.quantity - 1) } });
                            toast.success('Used 1');
                          } else { toast.error('None in stock'); }
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Use 1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
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
              <div className="flex gap-2">
                <Button variant="secondary" icon={Edit3} onClick={openEditModal}>Edit Site</Button>
                <Button variant="danger" icon={Trash2} onClick={() => setDeleteSiteId(site.id)}>Delete</Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200">
          {[
            { id: 'info', label: 'Information' },
            { id: 'shifts', label: 'Recent Shifts' },
            { id: 'checklist', label: 'Checklist' },
            ...(isOwnerOrPartner ? [{ id: 'inventory', label: 'Inventory' }] : []),
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
          {activeTab === 'inventory' && isOwnerOrPartner && renderInventoryTab()}
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

      <ConfirmModal
        isOpen={!!deleteSiteId}
        onClose={() => setDeleteSiteId(null)}
        onConfirm={handleDeleteSite}
        title="Delete Site"
        message="Are you sure you want to delete this site? This action cannot be undone. All associated data will be removed."
        confirmLabel="Delete"
      />

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Site" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Site Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
            <Select label="Type" options={['clinic','office','plaza','retail','warehouse','other'].map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))} value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value as SiteType})} />
          </div>
          
          <Input label="Address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
