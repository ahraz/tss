import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Plus, Trash2, Save, X, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { generateId } from '../utils/storage';
import toast from 'react-hot-toast';
import type { FacilityType, QuoteTemplate, TemplateLineItem, TemplateAddon } from '../types';
import { FACILITY_LABELS, createTemplateForFacility } from '../types';
import { formatCAD } from '../utils/formatters';

const FACILITY_OPTIONS = (Object.keys(FACILITY_LABELS) as FacilityType[]).map(ft => ({
  value: ft,
  label: FACILITY_LABELS[ft],
}));

let lineIdCounter = 0;
function newLineId(): string {
  lineIdCounter++;
  return `li-${lineIdCounter}-${Date.now()}`;
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const templates = state.quoteTemplates;

  // Core fields
  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('medical_clinic');
  const [baseRate, setBaseRate] = useState(0.40);
  const [defaultSqft, setDefaultSqft] = useState(1500);
  const [defaultDays, setDefaultDays] = useState(6);
  const [freqMults, setFreqMults] = useState<Record<number, number>>(
    { 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 }
  );

  // Dynamic line items
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([]);

  // Add-ons
  const [addons, setAddons] = useState<TemplateAddon[]>([]);
  const [newAddonLabel, setNewAddonLabel] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState(0);

  // New line item form
  const [newLiLabel, setNewLiLabel] = useState('');
  const [newLiRate, setNewLiRate] = useState(0);
  const [newLiQty, setNewLiQty] = useState(0);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Autofill defaults when facility type changes (only for new templates)
  const handleFacilityChange = (ft: FacilityType) => {
    setFacilityType(ft);
    if (!editingId) {
      const defaults = createTemplateForFacility(ft);
      setBaseRate(defaults.baseRatePerSqft);
      setDefaultSqft(defaults.defaultSqft);
      setDefaultDays(defaults.defaultDays);
      setLineItems(defaults.lineItems!.map(li => ({ ...li, id: newLineId() })));
      setAddons(defaults.addons!.map(a => ({ ...a, id: generateId() })));
    }
  };

  const sortedTemplates = useMemo(() =>
    [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [templates]);

  // ── Live preview ───────────────────────────────────────────
  const previewMonthly = useMemo(() => {
    const fm = freqMults[defaultDays] ?? 1.0;
    let total = 0;
    const items: { label: string; amount: number }[] = [];

    const baseAmt = defaultSqft * baseRate * fm;
    total += baseAmt;
    items.push({ label: `Base (${defaultSqft} sq ft)`, amount: baseAmt });

    for (const li of lineItems) {
      if (!li.included || li.defaultQty <= 0) continue;
      const amt = li.defaultQty * li.ratePerUnit * fm;
      total += amt;
      items.push({ label: `${li.label} (${li.defaultQty} × $${li.ratePerUnit.toFixed(2)})`, amount: amt });
    }

    const addonTotal = addons.reduce((s, a) => s + a.price, 0);
    if (addonTotal > 0) {
      items.push({ label: `Add-ons (${addons.length})`, amount: addonTotal });
    }
    const grandTotal = Math.ceil((total + addonTotal) / 5) * 5;
    return { items, total, addonTotal, grandTotal, visits: defaultDays * 4.33, perVisit: grandTotal / (defaultDays * 4.33) };
  }, [defaultSqft, defaultDays, baseRate, freqMults, lineItems, addons]);

  // ── Line item management ───────────────────────────────────
  const handleAddLineItem = () => {
    if (!newLiLabel.trim()) { toast.error('Enter a label'); return; }
    if (newLiRate <= 0) { toast.error('Rate must be greater than 0'); return; }
    setLineItems(prev => [...prev, {
      id: newLineId(), label: newLiLabel.trim(),
      ratePerUnit: newLiRate, defaultQty: Math.max(1, newLiQty), included: true,
    }]);
    setNewLiLabel(''); setNewLiRate(0); setNewLiQty(0);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  };

  const handleToggleLineItem = (id: string) => {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, included: !li.included } : li));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<TemplateLineItem>) => {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, ...updates } : li));
  };

  // ── Add-on management ──────────────────────────────────────
  const handleAddAddon = () => {
    if (!newAddonLabel.trim()) { toast.error('Enter a label'); return; }
    if (newAddonPrice <= 0) { toast.error('Enter a price greater than 0'); return; }
    setAddons(prev => [...prev, { id: generateId(), label: newAddonLabel.trim(), price: newAddonPrice }]);
    setNewAddonLabel(''); setNewAddonPrice(0);
  };

  const handleRemoveAddon = (id: string) => {
    setAddons(prev => prev.filter(a => a.id !== id));
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter a template name'); return; }
    const template: QuoteTemplate = {
      id: editingId || generateId(),
      name: name.trim(),
      description: `${name.trim()} — ${defaultSqft.toLocaleString()} sq ft`,
      facilityType,
      baseRatePerSqft: baseRate,
      defaultSqft,
      defaultDays,
      frequencyMultipliers: { ...freqMults },
      lineItems: lineItems.map(li => ({ ...li })),
      addons: addons.map(a => ({ ...a })),
      createdAt: new Date().toISOString(),
    };
    if (editingId) {
      dispatch({ type: 'DELETE_QUOTE_TEMPLATE', payload: editingId });
      dispatch({ type: 'ADD_QUOTE_TEMPLATE', payload: template });
      toast.success('Template updated');
    } else {
      dispatch({ type: 'ADD_QUOTE_TEMPLATE', payload: template });
      toast.success('Template saved');
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_QUOTE_TEMPLATE', payload: id });
    setDeleteId(null);
    toast.success('Template deleted');
  };

  const handleDuplicate = (t: QuoteTemplate) => {
    const copy: QuoteTemplate = {
      ...t, id: generateId(), name: `${t.name} (copy)`,
      lineItems: t.lineItems.map(li => ({ ...li, id: newLineId() })),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_QUOTE_TEMPLATE', payload: copy });
    toast.success('Template duplicated');
  };

  const handleEdit = (t: QuoteTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setFacilityType(t.facilityType);
    setBaseRate(t.baseRatePerSqft);
    setDefaultSqft(t.defaultSqft);
    setDefaultDays(t.defaultDays);
    setFreqMults({ ...t.frequencyMultipliers });
    setLineItems(t.lineItems.map(li => ({ ...li, id: newLineId() })));
    setAddons(t.addons.map(a => ({ ...a, id: generateId() })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName(''); setFacilityType('medical_clinic');
    setBaseRate(0.40); setDefaultSqft(1500); setDefaultDays(6);
    setFreqMults({ 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 });
    setLineItems([]); setAddons([]);
  };

  return (
    <AppShell pageTitle="Templates">
      <div className="page-container flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to Quotes
          </button>
          <h1 className="text-lg font-bold text-gray-900">Estimation Templates</h1>
          <div />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── LEFT ──────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Identity + Base */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Template' : 'Create New Template'}
              </h2>
              <div className="space-y-4">
                <Input label="Template Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Medical Clinic" />
                <Select label="Business Type" options={FACILITY_OPTIONS} value={facilityType} onChange={e => handleFacilityChange(e.target.value as FacilityType)} />
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Base Rate ($/sq ft)" type="number" step="0.01" value={baseRate.toString()} onChange={e => setBaseRate(parseFloat(e.target.value) || 0)} />
                  <Input label="Default Sq Ft" type="number" value={defaultSqft.toString()} onChange={e => setDefaultSqft(Math.max(0, parseInt(e.target.value) || 0))} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Days/Wk</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7].map(v => (
                        <button key={v} onClick={() => setDefaultDays(v)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${defaultDays === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Frequency Multipliers</label>
                  <p className="text-xs text-gray-400 mb-2">6×/week = 1.0× baseline</p>
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(v => (
                      <div key={v} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{v}×</span>
                        <input type="number" step="0.01" value={freqMults[v] ?? 0}
                          onChange={e => setFreqMults(prev => ({ ...prev, [v]: parseFloat(e.target.value) || 0 }))}
                          className="w-full text-center border border-gray-300 rounded-lg px-1 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Line Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Line Items</h3>
              <p className="text-xs text-gray-400 mb-4">
                These are the things you charge for based on your business type.
                A clinic has <em>Patient Rooms</em>, a law firm has <em>Offices</em> — define yours here.
              </p>

              {lineItems.length === 0 && (
                <p className="text-sm text-gray-400 italic mb-4">No line items yet. Select a business type above or add one below.</p>
              )}

              <div className="space-y-2 mb-4">
                {lineItems.map(li => (
                  <div key={li.id} className={`rounded-xl border-2 px-3 py-2.5 transition-colors ${li.included ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleLineItem(li.id)}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${li.included ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${li.included ? 'translate-x-5' : ''}`} />
                      </button>
                      <input
                        value={li.label}
                        onChange={e => handleUpdateLineItem(li.id, { label: e.target.value })}
                        className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:text-blue-700"
                      />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">$</span>
                        <input type="number" step="0.01" value={li.ratePerUnit}
                          onChange={e => handleUpdateLineItem(li.id, { ratePerUnit: parseFloat(e.target.value) || 0 })}
                          className="w-16 text-right border border-gray-200 rounded-md px-1.5 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        <span className="text-gray-400">×</span>
                        <input type="number" value={li.defaultQty}
                          onChange={e => handleUpdateLineItem(li.id, { defaultQty: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-12 text-center border border-gray-200 rounded-md px-1.5 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        <button onClick={() => handleRemoveLineItem(li.id)} className="text-red-300 hover:text-red-500 p-1">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add line item form */}
              <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <Input label="Item Name" value={newLiLabel} onChange={e => setNewLiLabel(e.target.value)} placeholder="e.g. Patient Rooms" />
                </div>
                <div className="w-20">
                  <Input label="$/unit" type="number" value={newLiRate || ''} onChange={e => setNewLiRate(parseFloat(e.target.value) || 0)} placeholder="40" />
                </div>
                <div className="w-16">
                  <Input label="Qty" type="number" value={newLiQty || ''} onChange={e => setNewLiQty(parseInt(e.target.value) || 0)} placeholder="7" />
                </div>
                <Button size="sm" icon={Plus} onClick={handleAddLineItem}>Add</Button>
              </div>
            </div>

            {/* Add-ons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Add-On Services</h3>
              <p className="text-xs text-gray-400 mb-3">Flat-rate monthly add-ons that can be toggled in the estimator.</p>
              <div className="space-y-2 mb-4">
                {addons.length === 0 && <p className="text-sm text-gray-400 italic">No add-ons yet.</p>}
                {addons.map(addon => (
                  <div key={addon.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-gray-800">{addon.label}</span>
                    <span className="text-sm font-semibold text-gray-700">{formatCAD(addon.price)}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                    <button onClick={() => handleRemoveAddon(addon.id)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input label="Add-on Name" value={newAddonLabel} onChange={e => setNewAddonLabel(e.target.value)} placeholder="e.g. Window Cleaning" />
                </div>
                <div className="w-24">
                  <Input label="Price/mo" type="number" value={newAddonPrice || ''} onChange={e => setNewAddonPrice(parseFloat(e.target.value) || 0)} placeholder="99" />
                </div>
                <Button size="sm" icon={Plus} onClick={handleAddAddon}>Add</Button>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3">
              {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
              <Button icon={Save} onClick={handleSave} disabled={!name.trim()}>
                {editingId ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>

          {/* ── RIGHT ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Preview */}
            <div className="bg-blue-600 rounded-2xl p-5 text-white">
              <h3 className="text-sm font-semibold opacity-80 mb-1">Live Preview</h3>
              <p className="text-3xl font-bold">{formatCAD(previewMonthly.grandTotal)}</p>
              <p className="text-xs opacity-70 mb-3">/month · {defaultDays}×/week · ~{Math.round(previewMonthly.visits)} visits</p>
              <div className="border-t border-white/20 pt-3 space-y-1.5">
                {previewMonthly.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="opacity-70">{item.label}</span>
                    <span className="font-medium">{formatCAD(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/20 mt-2 pt-2 flex justify-between text-sm">
                <span className="opacity-70">Per visit</span>
                <span className="font-semibold">{formatCAD(previewMonthly.perVisit)}</span>
              </div>
            </div>

            {/* Saved */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Saved Templates</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{templates.length}</span>
              </div>
              {templates.length === 0 ? (
                <div className="text-center py-6">
                  <Bookmark size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No templates yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sortedTemplates.map(t => (
                    <div key={t.id} className={`border rounded-xl p-3 transition-colors ${editingId === t.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.facilityType && FACILITY_LABELS[t.facilityType]} · {t.lineItems.length} items · {t.addons.length} add-ons</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleDuplicate(t)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Duplicate"><Copy size={13} /></button>
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium">Edit</button>
                          <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)}
          onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
          title="Delete Template?" message="This cannot be undone." confirmLabel="Delete" variant="danger" />
      </div>
    </AppShell>
  );
}
