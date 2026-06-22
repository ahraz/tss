import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCAD } from '../../utils/formatters';
import { generateId } from '../../utils/storage';
import type { QuoteLineItem } from '../../types';

interface EstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: QuoteLineItem[], notes: string) => void;
}

interface EstimatorState {
  sqft: number;
  rooms: number;
  washrooms: number;
  reception: number;
  days: number;
  breakroom: boolean;
  windows: boolean;
  deepclean: boolean;
}

const BASE_PER_SQFT = 0.40;
const RATE_ROOM = 40;
const RATE_WASH = 50;
const RATE_RECEPT = 55;
const FREQ_MULT: Record<number, number> = { 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 };
const DAYS_OPTIONS = [3, 4, 5, 6, 7];

export function CleaningEstimator({ isOpen, onClose, onApply }: EstimatorProps) {
  const [form, setForm] = useState<EstimatorState>({
    sqft: 1500, rooms: 7, washrooms: 2, reception: 1,
    days: 6, breakroom: false, windows: false, deepclean: false,
  });

  const update = <K extends keyof EstimatorState>(key: K, value: EstimatorState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const step = (key: 'rooms' | 'washrooms' | 'reception', delta: number) =>
    update(key, Math.max(0, form[key] + delta));

  const freq = FREQ_MULT[form.days] ?? 1.0;

  const breakdown = useMemo(() => {
    const base = form.sqft * BASE_PER_SQFT * freq;
    const rooms = form.rooms * RATE_ROOM * freq;
    const wash = form.washrooms * RATE_WASH * freq;
    const recept = form.reception * RATE_RECEPT * freq;
    const addons = (form.breakroom ? 40 : 0) + (form.windows ? 80 : 0) + (form.deepclean ? 120 : 0);
    const subtotal = base + rooms + wash + recept + addons;
    const total = Math.ceil(subtotal / 5) * 5;
    const visits = form.days * 4.33;
    const perVisit = total / visits;
    return { base, rooms, wash, recept, addons, total, visits, perVisit };
  }, [form]);

  const handleApply = () => {
    const freq = FREQ_MULT[form.days] ?? 1.0;
    const visitsPerWeek = form.days;
    const items: QuoteLineItem[] = [];

    if (form.sqft > 0) {
      const baseMonthly = form.sqft * BASE_PER_SQFT * freq;
      items.push({
        id: generateId(),
        description: `Base Cleaning — ${form.sqft.toLocaleString()} sq ft`,
        siteId: null,
        frequency: 'weekly',
        amountPerVisit: Math.round(baseMonthly / (form.days * 4.33) * 100) / 100,
        visitsPerWeek,
        monthlyAmount: Math.round(baseMonthly * 100) / 100,
      });
    }

    if (form.rooms > 0) {
      const roomMonthly = form.rooms * RATE_ROOM * freq;
      items.push({
        id: generateId(),
        description: `Patient / Treatment Room Cleaning (${form.rooms} rooms)`,
        siteId: null,
        frequency: 'weekly',
        amountPerVisit: Math.round(roomMonthly / (form.days * 4.33) * 100) / 100,
        visitsPerWeek,
        monthlyAmount: Math.round(roomMonthly * 100) / 100,
      });
    }

    if (form.washrooms > 0) {
      const washMonthly = form.washrooms * RATE_WASH * freq;
      items.push({
        id: generateId(),
        description: `Washroom Cleaning (${form.washrooms} washrooms)`,
        siteId: null,
        frequency: 'weekly',
        amountPerVisit: Math.round(washMonthly / (form.days * 4.33) * 100) / 100,
        visitsPerWeek,
        monthlyAmount: Math.round(washMonthly * 100) / 100,
      });
    }

    if (form.reception > 0) {
      const receptMonthly = form.reception * RATE_RECEPT * freq;
      items.push({
        id: generateId(),
        description: `Reception Area Cleaning (${form.reception} area${form.reception > 1 ? 's' : ''})`,
        siteId: null,
        frequency: 'weekly',
        amountPerVisit: Math.round(receptMonthly / (form.days * 4.33) * 100) / 100,
        visitsPerWeek,
        monthlyAmount: Math.round(receptMonthly * 100) / 100,
      });
    }

    if (form.breakroom) {
      items.push({
        id: generateId(),
        description: 'Breakroom / Kitchen Cleaning',
        siteId: null,
        frequency: 'monthly',
        amountPerVisit: 40,
        visitsPerWeek: 0,
        monthlyAmount: 40,
      });
    }
    if (form.windows) {
      items.push({
        id: generateId(),
        description: 'Monthly Window Cleaning',
        siteId: null,
        frequency: 'monthly',
        amountPerVisit: 80,
        visitsPerWeek: 0,
        monthlyAmount: 80,
      });
    }
    if (form.deepclean) {
      items.push({
        id: generateId(),
        description: 'Monthly Deep Cleaning Service',
        siteId: null,
        frequency: 'monthly',
        amountPerVisit: 120,
        visitsPerWeek: 0,
        monthlyAmount: 120,
      });
    }

    const notes =
      `Cleaning estimate generated from facility details:\n` +
      `${form.sqft.toLocaleString()} sq ft · ${form.rooms} rooms · ${form.washrooms} washrooms · ` +
      `${form.reception} reception · ${form.days}×/week`;

    onApply(items, notes);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Estimator" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Enter facility details to automatically generate quote line items.
        </p>

        <Input
          label="Square Feet"
          type="number"
          value={form.sqft.toString()}
          onChange={e => update('sqft', Math.max(0, parseFloat(e.target.value) || 0))}
          placeholder="1500"
        />

        <div className="grid grid-cols-3 gap-4">
          {(['rooms', 'washrooms', 'reception'] as const).map(key => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">
                {key === 'washrooms' ? 'Washrooms' : key === 'reception' ? 'Reception Areas' : 'Treatment Rooms'}
              </label>
              <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => step(key, -1)}
                  className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  −
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900 text-sm min-w-[2rem]">
                  {form[key]}
                </span>
                <button
                  type="button"
                  onClick={() => step(key, 1)}
                  className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Days per Week</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => update('days', d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.days === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d}×
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Add-ons</label>
          <div className="space-y-2">
            {([
              { key: 'breakroom' as const, label: 'Breakroom / Kitchen', rate: 40 },
              { key: 'windows' as const, label: 'Monthly Window Clean', rate: 80 },
              { key: 'deepclean' as const, label: 'Monthly Deep Clean', rate: 120 },
            ]).map(({ key, label, rate }) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-700">{label} <span className="text-gray-400">+{formatCAD(rate)}/mo</span></span>
                <button
                  type="button"
                  onClick={() => update(key, !form[key])}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form[key] ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      form[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base cleaning ({form.sqft.toLocaleString()} sq ft)</span>
            <span className="font-medium">{formatCAD(breakdown.base)}</span>
          </div>
          {form.rooms > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Treatment rooms ({form.rooms})</span>
              <span className="font-medium">{formatCAD(breakdown.rooms)}</span>
            </div>
          )}
          {form.washrooms > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Washrooms ({form.washrooms})</span>
              <span className="font-medium">{formatCAD(breakdown.wash)}</span>
            </div>
          )}
          {form.reception > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Reception ({form.reception})</span>
              <span className="font-medium">{formatCAD(breakdown.recept)}</span>
            </div>
          )}
          {breakdown.addons > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Add-ons</span>
              <span className="font-medium">{formatCAD(breakdown.addons)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Estimated Monthly</span>
            <span className="text-blue-600 text-lg">{formatCAD(breakdown.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>~{Math.round(breakdown.visits)} visits/month</span>
            <span>{formatCAD(breakdown.perVisit)} /visit</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Plus} onClick={handleApply}>
            Add {(() => {
              let count = 0;
              if (form.sqft > 0) count++;
              if (form.rooms > 0) count++;
              if (form.washrooms > 0) count++;
              if (form.reception > 0) count++;
              if (form.breakroom) count++;
              if (form.windows) count++;
              if (form.deepclean) count++;
              return count;
            })()} Line Items
          </Button>
        </div>
      </div>
    </Modal>
  );
}
