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
import type { FacilityType, QuoteTemplate, TemplatePricing, TemplateAddon } from '../types';
import { FACILITY_LABELS } from '../types';
import { formatCAD } from '../utils/formatters';

const FACILITY_OPTIONS = (Object.keys(FACILITY_LABELS) as FacilityType[]).map(ft => ({
  value: ft,
  label: FACILITY_LABELS[ft],
}));

const INITIAL_PRICING: TemplatePricing = {
  baseRatePerSqft: 0.40,
  roomRate: 40,
  washroomRate: 50,
  receptionRate: 55,
  frequencyMultipliers: { 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 },
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const templates = state.quoteTemplates;

  // ── Form state ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('medical_clinic');

  // Defaults
  const [defaultSqft, setDefaultSqft] = useState(1500);
  const [defaultRooms, setDefaultRooms] = useState(7);
  const [defaultWashrooms, setDefaultWashrooms] = useState(2);
  const [defaultReception, setDefaultReception] = useState(1);
  const [defaultDays, setDefaultDays] = useState(6);

  // Pricing
  const [baseRate, setBaseRate] = useState(INITIAL_PRICING.baseRatePerSqft);
  const [roomRate, setRoomRate] = useState(INITIAL_PRICING.roomRate);
  const [washroomRate, setWashroomRate] = useState(INITIAL_PRICING.washroomRate);
  const [receptionRate, setReceptionRate] = useState(INITIAL_PRICING.receptionRate);

  // Frequency multipliers (visits 1-7)
  const [freqMults, setFreqMults] = useState<Record<number, number>>(INITIAL_PRICING.frequencyMultipliers);

  // Add-ons
  const [addons, setAddons] = useState<TemplateAddon[]>([
    { id: 'breakroom', label: 'Breakroom / Kitchen', price: 40 },
    { id: 'windows', label: 'Monthly Window Clean', price: 80 },
    { id: 'deepclean', label: 'Monthly Deep Clean', price: 120 },
  ]);

  // Include toggles
  const [includeBase, setIncludeBase] = useState(true);
  const [includeRooms, setIncludeRooms] = useState(true);
  const [includeWashrooms, setIncludeWashrooms] = useState(true);
  const [includeReception, setIncludeReception] = useState(true);
  const [roomLabel, setRoomLabel] = useState('Patient / Treatment Rooms');

  // New add-on form
  const [newAddonLabel, setNewAddonLabel] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState(0);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedTemplates = useMemo(() =>
    [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [templates]);

  // ── Compute a live preview ─────────────────────────────────
  const previewMonthly = useMemo(() => {
    const fm = freqMults[defaultDays] ?? 1.0;
    let total = 0;
    const items: { label: string; amount: number }[] = [];
    if (includeBase) {
      const amt = defaultSqft * baseRate * fm;
      total += amt;
      items.push({ label: `Base (${defaultSqft} sq ft × $${baseRate.toFixed(2)})`, amount: amt });
    }
    if (includeRooms && defaultRooms > 0) {
      const amt = defaultRooms * roomRate * fm;
      total += amt;
      items.push({ label: `${roomLabel} (${defaultRooms} × $${roomRate.toFixed(2)})`, amount: amt });
    }
    if (includeWashrooms && defaultWashrooms > 0) {
      const amt = defaultWashrooms * washroomRate * fm;
      total += amt;
      items.push({ label: `Washrooms (${defaultWashrooms} × $${washroomRate.toFixed(2)})`, amount: amt });
    }
    if (includeReception && defaultReception > 0) {
      const amt = defaultReception * receptionRate * fm;
      total += amt;
      items.push({ label: `Reception (${defaultReception} × $${receptionRate.toFixed(2)})`, amount: amt });
    }
    const addonTotal = addons.reduce((s, a) => s + a.price, 0);
    if (addonTotal > 0) {
      items.push({ label: `Add-ons (${addons.length})`, amount: addonTotal });
    }
    total = Math.ceil((total + addonTotal) / 5) * 5;
    return { items, total, visits: defaultDays * 4.33, perVisit: total / (defaultDays * 4.33) };
  }, [defaultSqft, defaultRooms, defaultWashrooms, defaultReception, defaultDays, baseRate, roomRate, washroomRate, receptionRate, freqMults, includeBase, includeRooms, includeWashrooms, includeReception, roomLabel, addons]);

  // ── Add / remove add-ons ───────────────────────────────────
  const handleAddAddon = () => {
    if (!newAddonLabel.trim()) { toast.error('Enter a label'); return; }
    if (newAddonPrice <= 0) { toast.error('Enter a price greater than 0'); return; }
    setAddons(prev => [...prev, { id: generateId(), label: newAddonLabel.trim(), price: newAddonPrice }]);
    setNewAddonLabel('');
    setNewAddonPrice(0);
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
      description: `${name.trim()} — ${defaultSqft.toLocaleString()} sq ft, ${defaultDays}×/week`,
      facilityType,
      defaultSqft,
      defaultRooms,
      defaultWashrooms,
      defaultReception,
      defaultDays,
      pricing: {
        baseRatePerSqft: baseRate,
        roomRate,
        washroomRate,
        receptionRate,
        frequencyMultipliers: { ...freqMults },
      },
      addons: [...addons],
      includeBase,
      includeRooms,
      includeWashrooms,
      includeReception,
      roomLabel: roomLabel.trim() || 'Rooms',
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      // Replace existing
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
    const copy: QuoteTemplate = { ...t, id: generateId(), name: `${t.name} (copy)`, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_QUOTE_TEMPLATE', payload: copy });
    toast.success('Template duplicated');
  };

  const handleEdit = (t: QuoteTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setFacilityType(t.facilityType);
    setDefaultSqft(t.defaultSqft);
    setDefaultRooms(t.defaultRooms);
    setDefaultWashrooms(t.defaultWashrooms);
    setDefaultReception(t.defaultReception);
    setDefaultDays(t.defaultDays);
    setBaseRate(t.pricing.baseRatePerSqft);
    setRoomRate(t.pricing.roomRate);
    setWashroomRate(t.pricing.washroomRate);
    setReceptionRate(t.pricing.receptionRate);
    setFreqMults({ ...t.pricing.frequencyMultipliers });
    setAddons(t.addons.map(a => ({ ...a })));
    setIncludeBase(t.includeBase);
    setIncludeRooms(t.includeRooms);
    setIncludeWashrooms(t.includeWashrooms);
    setIncludeReception(t.includeReception);
    setRoomLabel(t.roomLabel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setFacilityType('medical_clinic');
    setDefaultSqft(1500);
    setDefaultRooms(7);
    setDefaultWashrooms(2);
    setDefaultReception(1);
    setDefaultDays(6);
    setBaseRate(INITIAL_PRICING.baseRatePerSqft);
    setRoomRate(INITIAL_PRICING.roomRate);
    setWashroomRate(INITIAL_PRICING.washroomRate);
    setReceptionRate(INITIAL_PRICING.receptionRate);
    setFreqMults(INITIAL_PRICING.frequencyMultipliers);
    setAddons([{ id: 'breakroom', label: 'Breakroom / Kitchen', price: 40 }, { id: 'windows', label: 'Monthly Window Clean', price: 80 }, { id: 'deepclean', label: 'Monthly Deep Clean', price: 120 }]);
    setIncludeBase(true);
    setIncludeRooms(true);
    setIncludeWashrooms(true);
    setIncludeReception(true);
    setRoomLabel('Patient / Treatment Rooms');
  };

  return (
    <AppShell pageTitle="Templates">
      <div className="page-container flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to Quotes
          </button>
          <h1 className="text-lg font-bold text-gray-900">Estimation Templates</h1>
          <div />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── LEFT: Form ─────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Identity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Template' : 'Create New Template'}
              </h2>
              <div className="space-y-4">
                <Input label="Template Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Medical Clinic" />
                <Select label="Facility Type" options={FACILITY_OPTIONS} value={facilityType} onChange={e => setFacilityType(e.target.value as FacilityType)} />
              </div>
            </div>

            {/* Default Values */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Default Values</h3>
              <div className="space-y-4">
                <Input label="Square Footage" type="number" value={defaultSqft.toString()} onChange={e => setDefaultSqft(Math.max(0, parseInt(e.target.value) || 0))} placeholder="1500" />
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { key: 'rooms' as const, label: 'Rooms', val: defaultRooms, set: setDefaultRooms },
                    { key: 'washrooms' as const, label: 'Washrooms', val: defaultWashrooms, set: setDefaultWashrooms },
                    { key: 'reception' as const, label: 'Reception Areas', val: defaultReception, set: setDefaultReception },
                  ]).map(({ key, label, val, set }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                        <button onClick={() => set(Math.max(0, val - 1))} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">−</button>
                        <span className="flex-1 text-center font-semibold text-gray-900 text-sm">{val}</span>
                        <button onClick={() => set(val + 1)} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Visits per Week</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(v => (
                      <button key={v} onClick={() => setDefaultDays(v)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${defaultDays === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pricing Model</h3>
              <p className="text-xs text-gray-400 mb-4">Monthly = rate × quantity × frequency multiplier. Tune every rate and multiplier.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Base Rate ($/sq ft)" type="number" step="0.01" value={baseRate.toString()} onChange={e => setBaseRate(parseFloat(e.target.value) || 0)} />
                <Input label="Room Rate ($/room)" type="number" step="0.01" value={roomRate.toString()} onChange={e => setRoomRate(parseFloat(e.target.value) || 0)} />
                <Input label="Washroom Rate ($/washroom)" type="number" step="0.01" value={washroomRate.toString()} onChange={e => setWashroomRate(parseFloat(e.target.value) || 0)} />
                <Input label="Reception Rate ($/area)" type="number" step="0.01" value={receptionRate.toString()} onChange={e => setReceptionRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Frequency Multipliers (per visits/week)</label>
                <p className="text-xs text-gray-400 mb-2">Adjusts monthly price based on cleaning frequency. 6×/week = 1.0× baseline.</p>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(v => (
                    <div key={v} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{v}×</span>
                      <input
                        type="number"
                        step="0.01"
                        value={freqMults[v] ?? 0}
                        onChange={e => setFreqMults(prev => ({ ...prev, [v]: parseFloat(e.target.value) || 0 }))}
                        className="w-full text-center border border-gray-300 rounded-lg px-1 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Add-On Services</h3>
              <p className="text-xs text-gray-400 mb-3">These appear as toggle switches in the estimator. Monthly flat-price add-ons.</p>
              <div className="space-y-2 mb-4">
                {addons.length === 0 && <p className="text-sm text-gray-400 italic">No add-ons yet. Add one below.</p>}
                {addons.map(addon => (
                  <div key={addon.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-gray-800">{addon.label}</span>
                    <span className="text-sm font-semibold text-gray-700">{formatCAD(addon.price)}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                    <button onClick={() => handleRemoveAddon(addon.id)} className="text-red-400 hover:text-red-600 p-1">
                      <X size={14} />
                    </button>
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

            {/* Line item settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Line Items & Labels</h3>
              <div className="space-y-3">
                {([
                  { key: 'includeBase' as const, label: 'Base Cleaning (sq ft)' },
                  { key: 'includeRooms' as const, label: 'Room Cleaning' },
                  { key: 'includeWashrooms' as const, label: 'Washroom Cleaning' },
                  { key: 'includeReception' as const, label: 'Reception Area Cleaning' },
                ]).map(({ key, label }) => {
                  const val = key === 'includeBase' ? includeBase : key === 'includeRooms' ? includeRooms : key === 'includeWashrooms' ? includeWashrooms : includeReception;
                  const set = key === 'includeBase' ? setIncludeBase : key === 'includeRooms' ? setIncludeRooms : key === 'includeWashrooms' ? setIncludeWashrooms : setIncludeReception;
                  return (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">{label}</span>
                      <button
                        type="button"
                        onClick={() => set(!val)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${val ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  );
                })}
                <div className="pt-2">
                  <Input label="Custom Room Label" value={roomLabel} onChange={e => setRoomLabel(e.target.value)} placeholder="e.g. Patient / Treatment Rooms" />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3">
              {editingId && (
                <Button variant="secondary" onClick={resetForm}>Cancel Editing</Button>
              )}
              <Button icon={Save} onClick={handleSave} disabled={!name.trim()}>
                {editingId ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>

          {/* ── RIGHT: Preview + Saved List ────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Preview */}
            <div className="bg-blue-600 rounded-2xl p-5 text-white">
              <h3 className="text-sm font-semibold opacity-80 mb-1">Live Preview</h3>
              <p className="text-3xl font-bold">{formatCAD(previewMonthly.total)}</p>
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

            {/* Saved Templates */}
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
                          <p className="text-xs text-gray-400">{t.defaultSqft.toLocaleString()} sq ft · {t.defaultDays}×/wk · {t.addons.length} add-ons</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleDuplicate(t)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Duplicate">
                            <Copy size={13} />
                          </button>
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors text-xs font-medium">Edit</button>
                          <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
          title="Delete Template?"
          message="This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
        />
      </div>
    </AppShell>
  );
}
