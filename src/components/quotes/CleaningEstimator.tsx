import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { formatCAD } from '../../utils/formatters';
import { generateId } from '../../utils/storage';
import type { QuoteTemplate, QuoteLineItem } from '../../types';

interface EstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (items: QuoteLineItem[]) => void;
  templates: QuoteTemplate[];
}

type TemplateSelector = { label: string; value: string };
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function CleaningEstimator({ isOpen, onClose, onGenerate, templates }: EstimatorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const template = useMemo(() => {
    if (!selectedTemplateId && templates.length > 0) return templates[0];
    return templates.find(t => t.id === selectedTemplateId) || templates[0] || null;
  }, [templates, selectedTemplateId]);

  const [sqft, setSqft] = useState(template?.defaultSqft ?? 1500);
  const [rooms, setRooms] = useState(template?.defaultRooms ?? 0);
  const [washrooms, setWashrooms] = useState(template?.defaultWashrooms ?? 0);
  const [reception, setReception] = useState(template?.defaultReception ?? 0);
  const [days, setDays] = useState(template?.defaultDays ?? 6);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);

  // Reset form when template changes
  const initFromTemplate = (t: QuoteTemplate) => {
    setSqft(t.defaultSqft);
    setRooms(t.defaultRooms);
    setWashrooms(t.defaultWashrooms);
    setReception(t.defaultReception);
    setDays(t.defaultDays);
    setActiveAddons([]);
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) initFromTemplate(t);
  };

  const pricing = template?.pricing ?? null;
  const fm = pricing ? (pricing.frequencyMultipliers[days] ?? 1.0) : 1.0;

  const breakdown = useMemo(() => {
    if (!pricing) return null;
    let total = 0;
    const items: { label: string; amount: number }[] = [];

    if (template?.includeBase !== false && sqft > 0) {
      const amt = sqft * pricing.baseRatePerSqft * fm;
      total += amt;
      items.push({ label: `Base (${sqft.toLocaleString()} sq ft)`, amount: amt });
    }
    if (template?.includeRooms !== false && rooms > 0) {
      const amt = rooms * pricing.roomRate * fm;
      total += amt;
      items.push({ label: `${template?.roomLabel || 'Rooms'} (${rooms})`, amount: amt });
    }
    if (template?.includeWashrooms !== false && washrooms > 0) {
      const amt = washrooms * pricing.washroomRate * fm;
      total += amt;
      items.push({ label: `Washrooms (${washrooms})`, amount: amt });
    }
    if (template?.includeReception !== false && reception > 0) {
      const amt = reception * pricing.receptionRate * fm;
      total += amt;
      items.push({ label: `Reception (${reception})`, amount: amt });
    }

    let addonTotal = 0;
    const activeAddonObjs = (template?.addons || []).filter(a => activeAddons.includes(a.id));
    for (const addon of activeAddonObjs) {
      addonTotal += addon.price;
    }
    if (addonTotal > 0) {
      items.push({ label: `Add-ons (${activeAddonObjs.length})`, amount: addonTotal });
    }

    const grandTotal = Math.ceil((total + addonTotal) / 5) * 5;
    const visitsPerMonth = days * 4.33;
    return { items, total, addonTotal, grandTotal, visitsPerMonth, perVisit: grandTotal / visitsPerMonth };
  }, [pricing, fm, sqft, rooms, washrooms, reception, days, template, activeAddons]);

  const toggleAddon = (id: string) => {
    setActiveAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleApply = () => {
    if (!pricing || !template) return;
    const items: QuoteLineItem[] = [];
    const baseId = generateId();
    const monthlyM = 4.33; // standard weeks/month
    const visitsM = days * monthlyM; // visits per month

    if (template.includeBase !== false && sqft > 0) {
      const monthly = sqft * pricing.baseRatePerSqft * fm;
      const perVisit = monthly / visitsM;
      items.push({
        id: `${baseId}-base`,
        description: `Base Cleaning — ${sqft.toLocaleString()} sq ft`,
        siteId: null, frequency: 'weekly', amountPerVisit: Math.round(perVisit * 100) / 100,
        visitsPerWeek: days, monthlyAmount: Math.round(monthly * 100) / 100,
      });
    }
    if (template.includeRooms !== false && rooms > 0) {
      const monthly = rooms * pricing.roomRate * fm;
      const perVisit = monthly / visitsM;
      items.push({
        id: `${baseId}-rooms`,
        description: `${template.roomLabel || 'Room'} Cleaning (${rooms})`,
        siteId: null, frequency: 'weekly', amountPerVisit: Math.round(perVisit * 100) / 100,
        visitsPerWeek: days, monthlyAmount: Math.round(monthly * 100) / 100,
      });
    }
    if (template.includeWashrooms !== false && washrooms > 0) {
      const monthly = washrooms * pricing.washroomRate * fm;
      const perVisit = monthly / visitsM;
      items.push({
        id: `${baseId}-wash`,
        description: `Washroom Cleaning (${washrooms})`,
        siteId: null, frequency: 'weekly', amountPerVisit: Math.round(perVisit * 100) / 100,
        visitsPerWeek: days, monthlyAmount: Math.round(monthly * 100) / 100,
      });
    }
    if (template.includeReception !== false && reception > 0) {
      const monthly = reception * pricing.receptionRate * fm;
      const perVisit = monthly / visitsM;
      items.push({
        id: `${baseId}-recept`,
        description: `Reception Area Cleaning (${reception})`,
        siteId: null, frequency: 'weekly', amountPerVisit: Math.round(perVisit * 100) / 100,
        visitsPerWeek: days, monthlyAmount: Math.round(monthly * 100) / 100,
      });
    }
    for (const addon of (template.addons || [])) {
      if (!activeAddons.includes(addon.id)) continue;
      items.push({
        id: `${baseId}-${addon.id}`,
        description: addon.label,
        siteId: null, frequency: 'monthly', amountPerVisit: addon.price,
        visitsPerWeek: 0, monthlyAmount: addon.price,
      });
    }

    onGenerate(items);
    onClose();
  };

  if (!template) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Estimator" size="lg">
        <div className="py-8 text-center text-sm text-gray-400">
          No templates available. Create one first in <strong>Templates</strong>.
        </div>
      </Modal>
    );
  }

  const visibleAddons = template.addons || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Estimator" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Using <strong>{template.name}</strong> pricing model. Adjust values below.
        </p>

        {/* Template selector */}
        {templates.length > 1 && (
          <Select
            label="Template"
            options={templates.map(t => ({ value: t.id, label: t.name })) as TemplateSelector[]}
            value={selectedTemplateId || templates[0]?.id || ''}
            onChange={e => handleTemplateChange(e.target.value)}
          />
        )}

        <Input
          label="Square Feet"
          type="number"
          value={sqft.toString()}
          onChange={e => setSqft(Math.max(0, parseFloat(e.target.value) || 0))}
          placeholder="1500"
        />

        <div className="grid grid-cols-3 gap-4">
          {([
            { key: 'rooms' as const, label: template.roomLabel || 'Rooms', val: rooms, set: setRooms },
            { key: 'washrooms' as const, label: 'Washrooms', val: washrooms, set: setWashrooms },
            { key: 'reception' as const, label: 'Reception Areas', val: reception, set: setReception },
          ]).map(({ key, label, val, set }) => {
            const include = key === 'rooms' ? template.includeRooms : key === 'washrooms' ? template.includeWashrooms : template.includeReception;
            if (include === false) return null;
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                  <button onClick={() => set(Math.max(0, val - 1))} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">−</button>
                  <span className="flex-1 text-center font-semibold text-gray-900 text-sm">{val}</span>
                  <button onClick={() => set(val + 1)} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">+</button>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visits per Week</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {d}×
              </button>
            ))}
          </div>
          {pricing && (
            <p className="text-xs text-gray-400 mt-1">Freq multiplier: <strong>{fm.toFixed(2)}×</strong></p>
          )}
        </div>

        {/* Add-ons */}
        {visibleAddons.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Add-On Services</label>
            <div className="space-y-1.5">
              {visibleAddons.map(addon => (
                <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                    activeAddons.includes(addon.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="text-sm font-medium text-gray-700">{addon.label}</span>
                  <span className="text-sm font-semibold text-gray-700">{formatCAD(addon.price)}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200" />

        {/* Price breakdown */}
        {breakdown ? (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {breakdown.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-medium">{formatCAD(item.amount)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-gray-900">Estimated Monthly</span>
              <span className="text-blue-600 text-xl font-bold">{formatCAD(breakdown.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>~{Math.round(breakdown.visitsPerMonth)} visits/month</span>
              <span>{formatCAD(breakdown.perVisit)} /visit</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
            No pricing model configured for this template.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Plus} onClick={handleApply} disabled={!breakdown}>
            Add Line Items
          </Button>
        </div>
      </div>
    </Modal>
  );
}
