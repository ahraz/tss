import React, { useState, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { generateId } from '../utils/storage';
import type { SupplyItem, SupplyCategory, SupplyUnit } from '../types';

const CATEGORIES: { value: SupplyCategory; label: string }[] = [
  { value: 'paper', label: '🧻 Paper' },
  { value: 'chemical', label: '🧪 Chemicals' },
  { value: 'plastic', label: '🚮 Bags & Liners' },
  { value: 'equipment', label: '🔧 Equipment' },
  { value: 'safety', label: '🦺 Safety' },
  { value: 'other', label: '📦 Other' },
];

const UNITS: { value: SupplyUnit; label: string }[] = [
  { value: 'each', label: 'Each' },
  { value: 'roll', label: 'Roll' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'box', label: 'Box' },
  { value: 'case', label: 'Case' },
  { value: 'litre', label: 'Litre' },
  { value: 'kg', label: 'Kg' },
];

const DEFAULT_SUPPLIES: Omit<SupplyItem, 'id'>[] = [
  { name: 'Paper Towels', category: 'paper', unit: 'roll', reorderAt: 6, perVisitUsage: 1.5 },
  { name: 'Toilet Paper', category: 'paper', unit: 'roll', reorderAt: 12, perVisitUsage: 2 },
  { name: 'Garbage Bags (Large)', category: 'plastic', unit: 'box', reorderAt: 1, perVisitUsage: 0.3 },
  { name: 'Garbage Bags (Small)', category: 'plastic', unit: 'box', reorderAt: 1, perVisitUsage: 0.5 },
  { name: 'All-Purpose Cleaner', category: 'chemical', unit: 'bottle', reorderAt: 2, perVisitUsage: 0.2 },
  { name: 'Glass Cleaner', category: 'chemical', unit: 'bottle', reorderAt: 2, perVisitUsage: 0.15 },
  { name: 'Disinfectant Spray', category: 'chemical', unit: 'bottle', reorderAt: 2, perVisitUsage: 0.2 },
  { name: 'Floor Cleaner', category: 'chemical', unit: 'litre', reorderAt: 2, perVisitUsage: 0.3 },
  { name: 'Hand Soap', category: 'chemical', unit: 'bottle', reorderAt: 3, perVisitUsage: 0.15 },
  { name: 'Microfiber Cloths', category: 'equipment', unit: 'each', reorderAt: 10, perVisitUsage: 0.5 },
  { name: 'Mop Head', category: 'equipment', unit: 'each', reorderAt: 3, perVisitUsage: 0 },
  { name: 'Latex Gloves', category: 'safety', unit: 'box', reorderAt: 2, perVisitUsage: 0.1 },
];

export function InventoryPage() {
  const { state, dispatch, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'items' | 'site'>('items');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [editItem, setEditItem] = useState<SupplyItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'other' as SupplyCategory, unit: 'each' as SupplyUnit, reorderAt: 5, perVisitUsage: 0, notes: '' });
  const [adjustSite, setAdjustSite] = useState<{ siteId: string; itemId: string; qty: number } | null>(null);

  const activeSites = state.sites.filter(s => s.status === 'active');

  // Low stock items across all sites
  const lowStockAlerts = useMemo(() => {
    const alerts: { siteName: string; itemName: string; qty: number; reorderAt: number }[] = [];
    state.siteInventory.forEach(si => {
      const item = state.supplyItems.find(i => i.id === si.itemId);
      const site = state.sites.find(s => s.id === si.siteId);
      if (item && site && si.quantity <= item.reorderAt) {
        alerts.push({ siteName: site.name, itemName: item.name, qty: si.quantity, reorderAt: item.reorderAt });
      }
    });
    return alerts;
  }, [state.siteInventory, state.supplyItems, state.sites]);

  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'partner';
  if (!isOwner) return null;

  const handleSeedDefaults = () => {
    DEFAULT_SUPPLIES.forEach(s => {
      const item: SupplyItem = { id: generateId(), ...s };
      dispatch({ type: 'ADD_SUPPLY_ITEM', payload: item });

      // Add to every active site
      activeSites.forEach(site => {
        const existing = state.siteInventory.find(si => si.itemId === item.id && si.siteId === site.id);
        if (!existing) {
          dispatch({
            type: 'ADD_SITE_INVENTORY',
            payload: {
              id: generateId(),
              siteId: site.id,
              itemId: item.id,
              quantity: item.reorderAt * 3, // Start with 3x reorder level
              lastRestocked: new Date().toISOString(),
            }
          });
        }
      });
    });
    setShowSeedModal(false);
    toast.success(`${DEFAULT_SUPPLIES.length} supply items added to ${activeSites.length} sites`);
  };

  const handleAddItem = () => {
    if (!itemForm.name.trim()) { toast.error('Item name required'); return; }
    const item: SupplyItem = { id: generateId(), ...itemForm, name: itemForm.name.trim() };
    dispatch({ type: 'ADD_SUPPLY_ITEM', payload: item });
    setShowAddItem(false);
    setItemForm({ name: '', category: 'other', unit: 'each', reorderAt: 5, perVisitUsage: 0, notes: '' });
    toast.success('Supply item added');
  };

  const handleUpdateItem = () => {
    if (!editItem || !itemForm.name.trim()) return;
    dispatch({ type: 'UPDATE_SUPPLY_ITEM', payload: { ...editItem, ...itemForm, name: itemForm.name.trim() } });
    setEditItem(null);
    toast.success('Item updated');
  };

  const handleDeleteItem = (id: string) => {
    dispatch({ type: 'DELETE_SUPPLY_ITEM', payload: id });
    // Also remove from site inventories
    state.siteInventory.filter(si => si.itemId === id).forEach(si => {
      dispatch({ type: 'DELETE_SITE_INVENTORY', payload: si.id });
    });
    toast.success('Item removed');
  };

  const handleAdjustQty = () => {
    if (!adjustSite) return;
    const existing = state.siteInventory.find(si => si.siteId === adjustSite.siteId && si.itemId === adjustSite.itemId);
    if (existing) {
      dispatch({
        type: 'UPDATE_SITE_INVENTORY',
        payload: { ...existing, quantity: Math.max(0, existing.quantity + adjustSite.qty), lastRestocked: adjustSite.qty > 0 ? new Date().toISOString() : existing.lastRestocked }
      });
    } else {
      dispatch({
        type: 'ADD_SITE_INVENTORY',
        payload: { id: generateId(), siteId: adjustSite.siteId, itemId: adjustSite.itemId, quantity: Math.max(0, adjustSite.qty), lastRestocked: adjustSite.qty > 0 ? new Date().toISOString() : null }
      });
    }
    setAdjustSite(null);
  };

  const siteInv = (siteId: string, itemId: string) =>
    state.siteInventory.find(si => si.siteId === siteId && si.itemId === itemId);

  const renderItemList = () => (
    <div className="space-y-4">
      {/* Low stock alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-3"><AlertTriangle size={18} /> Low Stock Alerts</h4>
          <div className="space-y-1.5">
            {lowStockAlerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-amber-800"><strong>{a.itemName}</strong> @ {a.siteName}</span>
                <Badge label={`${a.qty} left (min ${a.reorderAt})`} variant="danger" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Master supply list */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">All Supply Items</h3>
        <div className="flex gap-2">
          {state.supplyItems.length === 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowSeedModal(true)} icon={Plus}>Add Defaults</Button>
          )}
          <Button size="sm" icon={Plus} onClick={() => setShowAddItem(true)}>Add Item</Button>
        </div>
      </div>

      {state.supplyItems.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No supply items yet.</p>
            <p className="text-xs mt-1">Click "Add Defaults" to pre-fill with common cleaning supplies.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.supplyItems.map(item => (
            <Card key={item.id} className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                  <Badge label={item.category} variant="neutral" className="text-[10px] mt-1" />
                  <p className="text-xs text-gray-500 mt-1">{item.unit} • Reorder at {item.reorderAt}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem(item); setItemForm({ name: item.name, category: item.category, unit: item.unit, reorderAt: item.reorderAt, perVisitUsage: item.perVisitUsage, notes: item.notes || '' }); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSiteView = () => (
    <div className="space-y-4">
      <Select
        label="Select Site"
        options={activeSites.map(s => ({ value: s.id, label: s.name }))}
        value={selectedSiteId}
        onChange={e => setSelectedSiteId(e.target.value)}
        placeholder="Choose a site…"
      />

      {selectedSiteId && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Stock Levels</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.supplyItems.map(item => {
              const inv = siteInv(selectedSiteId, item.id);
              const qty = inv?.quantity ?? 0;
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
                      <button onClick={() => setAdjustSite({ siteId: selectedSiteId, itemId: item.id, qty: 1 })}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Restock +1"><Plus size={14} /></button>
                      <button onClick={() => setAdjustSite({ siteId: selectedSiteId, itemId: item.id, qty: -1 })}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Use 1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppShell pageTitle="Inventory & Supplies">
      <div className="page-container max-w-5xl flex flex-col gap-6 pb-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl self-start">
          <button onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'items' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Package size={16} className="inline mr-1.5" />Supply Items
          </button>
          <button onClick={() => setActiveTab('site')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'site' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Building2 size={16} className="inline mr-1.5" />Per Site Stock
          </button>
        </div>

        {activeTab === 'items' ? renderItemList() : renderSiteView()}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} title="Add Supply Item" size="sm">
        <div className="space-y-3">
          <Input label="Item Name" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CATEGORIES} value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value as SupplyCategory})} />
            <Select label="Unit" options={UNITS} value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value as SupplyUnit})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Reorder At" type="number" value={String(itemForm.reorderAt)} onChange={e => setItemForm({...itemForm, reorderAt: parseInt(e.target.value) || 0})} />
            <Input label="Per-Visit Usage" type="number" value={String(itemForm.perVisitUsage)} onChange={e => setItemForm({...itemForm, perVisitUsage: parseFloat(e.target.value) || 0})} />
          </div>
          <Input label="Notes" value={itemForm.notes} onChange={e => setItemForm({...itemForm, notes: e.target.value})} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Supply Item" size="sm">
        <div className="space-y-3">
          <Input label="Item Name" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CATEGORIES} value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value as SupplyCategory})} />
            <Select label="Unit" options={UNITS} value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value as SupplyUnit})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Reorder At" type="number" value={String(itemForm.reorderAt)} onChange={e => setItemForm({...itemForm, reorderAt: parseInt(e.target.value) || 0})} />
            <Input label="Per-Visit Usage" type="number" value={String(itemForm.perVisitUsage)} onChange={e => setItemForm({...itemForm, perVisitUsage: parseFloat(e.target.value) || 0})} />
          </div>
          <Input label="Notes" value={itemForm.notes} onChange={e => setItemForm({...itemForm, notes: e.target.value})} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleUpdateItem}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust Quantity Modal */}
      <Modal isOpen={!!adjustSite} onClose={() => setAdjustSite(null)} title={adjustSite?.qty && adjustSite.qty > 0 ? 'Restock' : 'Reduce Stock'} size="sm">
        {adjustSite && (() => {
          const item = state.supplyItems.find(i => i.id === adjustSite.itemId);
          const site = state.sites.find(s => s.id === adjustSite.siteId);
          const current = siteInv(adjustSite.siteId, adjustSite.itemId)?.quantity ?? 0;
          return (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">
                {adjustSite.qty > 0
                  ? `Add to ${item?.name} at ${site?.name}`
                  : `Remove from ${item?.name} at ${site?.name}`}
              </p>
              <p className="text-3xl font-bold text-gray-900">{current}</p>
              <p className="text-xs text-gray-500">Current stock</p>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="secondary" onClick={() => setAdjustSite(null)}>Cancel</Button>
                <Button onClick={handleAdjustQty}>{adjustSite.qty > 0 ? 'Add' : 'Remove'}</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Seed defaults modal */}
      <Modal isOpen={showSeedModal} onClose={() => setShowSeedModal(false)} title="Add Default Supplies?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will add {DEFAULT_SUPPLIES.length} common cleaning supplies (paper towels, chemicals, bags, etc.)
            to your inventory and stock them at all {activeSites.length} active site{activeSites.length !== 1 ? 's' : ''}.
          </p>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            You can edit, add, or remove items anytime.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowSeedModal(false)}>Cancel</Button>
            <Button onClick={handleSeedDefaults}>Add Defaults</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
