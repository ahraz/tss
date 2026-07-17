import { useState, useMemo } from 'react';
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

/** Dynamic qty state for one line item */
type ItemState = { id: string; qty: number; included: boolean };

export function CleaningEstimator({ isOpen, onClose, onGenerate, templates }: EstimatorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const template = useMemo(() => {
    if (!selectedTemplateId && templates.length > 0) return templates[0];
    return templates.find(t => t.id === selectedTemplateId) || templates[0] || null;
  }, [templates, selectedTemplateId]);

  const [sqft, setSqft] = useState(template?.defaultSqft ?? 1500);
  const [days, setDays] = useState(template?.defaultDays ?? 6);
  const [itemStates, setItemStates] = useState<ItemState[]>(() => {
    if (!template) return [];
    return template.lineItems.map(li => ({ id: li.id, qty: li.defaultQty, included: li.included }));
  });
  const [activeAddons, setActiveAddons] = useState<string[]>([]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) {
      setSqft(t.defaultSqft);
      setDays(t.defaultDays);
      setItemStates(t.lineItems.map(li => ({ id: li.id, qty: li.defaultQty, included: li.included })));
      setActiveAddons([]);
    }
  };

  const fm = template ? (template.frequencyMultipliers[days] ?? 1.0) : 1.0;

  const breakdown = useMemo(() => {
    if (!template) return null;
    let total = 0;
    const items: { label: string; amount: number }[] = [];

    const baseAmt = sqft * template.baseRatePerSqft * fm;
    total += baseAmt;
    items.push({ label: `Base (${sqft.toLocaleString()} sq ft)`, amount: baseAmt });

    for (const st of itemStates) {
      const li = template.lineItems.find(l => l.id === st.id);
      if (!li || !st.included || st.qty <= 0) continue;
      const amt = st.qty * li.ratePerUnit * fm;
      total += amt;
      items.push({ label: `${li.label} (${st.qty} × $${li.ratePerUnit.toFixed(2)})`, amount: amt });
    }

    let addonTotal = 0;
    const activeAddonObjs = (template.addons || []).filter(a => activeAddons.includes(a.id));
    for (const addon of activeAddonObjs) addonTotal += addon.price;
    if (addonTotal > 0) items.push({ label: `Add-ons (${activeAddonObjs.length})`, amount: addonTotal });

    const grandTotal = Math.ceil((total + addonTotal) / 5) * 5;
    const visitsPerMonth = days * 4.33;
    return { items, total, addonTotal, grandTotal, visitsPerMonth, perVisit: grandTotal / visitsPerMonth };
  }, [template, sqft, days, fm, itemStates, activeAddons]);

  const updateItem = (id: string, patch: Partial<ItemState>) => {
    setItemStates(prev => prev.map(st => st.id === id ? { ...st, ...patch } : st));
  };

  const toggleAddon = (id: string) => {
    setActiveAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleApply = () => {
    if (!template || !breakdown) return;
    const items: QuoteLineItem[] = [];
    const baseId = generateId();
    const visitsM = days * 4.33;

    // Base
    const baseMonthly = sqft * template.baseRatePerSqft * fm;
    items.push({
      id: `${baseId}-base`,
      description: `Base Cleaning — ${sqft.toLocaleString()} sq ft`,
      siteId: null, frequency: 'weekly', amountPerVisit: Math.round((baseMonthly / visitsM) * 100) / 100,
      visitsPerWeek: days, monthlyAmount: Math.round(baseMonthly * 100) / 100,
    });

    // Dynamic line items
    for (const st of itemStates) {
      const li = template.lineItems.find(l => l.id === st.id);
      if (!li || !st.included || st.qty <= 0) continue;
      const monthly = st.qty * li.ratePerUnit * fm;
      items.push({
        id: `${baseId}-${li.id}`,
        description: `${li.label} (${st.qty})`,
        siteId: null, frequency: 'weekly', amountPerVisit: Math.round((monthly / visitsM) * 100) / 100,
        visitsPerWeek: days, monthlyAmount: Math.round(monthly * 100) / 100,
      });
    }

    // Add-ons
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Estimator" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Using <strong>{template.name}</strong>. Adjust values below.
        </p>

        {templates.length > 1 && (
          <Select
            label="Template"
            options={templates.map(t => ({ value: t.id, label: t.name }))}
            value={selectedTemplateId || templates[0]?.id || ''}
            onChange={e => handleTemplateChange(e.target.value)}
          />
        )}

        <Input label="Square Feet" type="number" value={sqft.toString()}
          onChange={e => setSqft(Math.max(0, parseFloat(e.target.value) || 0))} placeholder="1500" />

        {/* Dynamic line items */}
        {itemStates.map(st => {
          const li = template.lineItems.find(l => l.id === st.id);
          if (!li) return null;
          return (
            <div key={st.id} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button onClick={() => updateItem(st.id, { included: !st.included })}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${st.included ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${st.included ? 'translate-x-5' : ''}`} />
                  </button>
                  <label className="text-sm font-medium text-gray-700 truncate">{li.label}</label>
                </div>
                <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <button onClick={() => updateItem(st.id, { qty: Math.max(0, st.qty - 1) })}
                    className="w-8 h-8 flex items-center justify-center text-blue-600 text-lg font-light hover:bg-gray-200">−</button>
                  <span className="w-8 text-center font-semibold text-gray-900 text-sm">{st.qty}</span>
                  <button onClick={() => updateItem(st.id, { qty: st.qty + 1 })}
                    className="w-8 h-8 flex items-center justify-center text-blue-600 text-lg font-light hover:bg-gray-200">+</button>
                </div>
                <span className="text-sm font-semibold text-gray-700 w-16 text-right flex-shrink-0">
                  {formatCAD(st.qty * li.ratePerUnit * fm)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Visits per week */}
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
          <p className="text-xs text-gray-400 mt-1">Freq multiplier: <strong>{fm.toFixed(2)}×</strong></p>
        </div>

        {/* Add-ons */}
        {(template.addons || []).length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Add-On Services</label>
            <div className="space-y-1.5">
              {template.addons.map(addon => (
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

        {/* Breakdown */}
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
            No pricing model configured.
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
