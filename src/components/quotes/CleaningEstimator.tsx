import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { formatCAD } from '../../utils/formatters';
import { generateId } from '../../utils/storage';
import type { QuoteTemplate, QuoteLineItem, CleaningFrequency } from '../../types';
import { FACILITY_LABELS } from '../../types';

interface EstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (items: QuoteLineItem[]) => void;
  templates: QuoteTemplate[];
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const VISIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function CleaningEstimator({ isOpen, onClose, onGenerate, templates }: EstimatorProps) {
  const [sqft, setSqft] = useState(1500);
  const [rooms, setRooms] = useState(3);
  const [washrooms, setWashrooms] = useState(2);
  const [reception, setReception] = useState(1);
  const [days, setDays] = useState(6);
  const [frequency, setFrequency] = useState<CleaningFrequency>('weekly');

  const freq = frequency === 'daily' ? 22 : frequency === 'weekly' ? 4.33 : frequency === 'biweekly' ? 2.17 : 1;
  const visitsPerWeek = frequency === 'monthly' ? 1 : days;
  const monthlyMultiplier = freq;

  const breakdown = useMemo(() => {
    const base = sqft * 0.017 * monthlyMultiplier * visitsPerWeek;
    const roomTotal = rooms * 2.80 * monthlyMultiplier * visitsPerWeek;
    const washTotal = washrooms * 2.23 * monthlyMultiplier * visitsPerWeek;
    const receptTotal = reception * 2.46 * monthlyMultiplier * visitsPerWeek;
    const total = base + roomTotal + washTotal + receptTotal;
    const perVisit = visitsPerWeek > 0 ? total / (visitsPerWeek * monthlyMultiplier) : 0;
    return { base, roomTotal, washTotal, receptTotal, total, perVisit };
  }, [sqft, rooms, washrooms, reception, visitsPerWeek, monthlyMultiplier]);

  const handleApply = () => {
    const items: QuoteLineItem[] = [];
    const baseId = generateId();

    if (sqft > 0) {
      const rate = Math.round(sqft * 0.017 * 100) / 100;
      items.push({
        id: `${baseId}-base`,
        description: `Base Cleaning — ${sqft.toLocaleString()} sq ft`,
        siteId: null, frequency, amountPerVisit: rate,
        visitsPerWeek, monthlyAmount: Math.round(rate * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }
    if (rooms > 0) {
      const rate = Math.round(rooms * 2.80 * 100) / 100;
      items.push({
        id: `${baseId}-rooms`,
        description: `Room Cleaning (${rooms} rooms)`,
        siteId: null, frequency, amountPerVisit: rate,
        visitsPerWeek, monthlyAmount: Math.round(rate * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }
    if (washrooms > 0) {
      const rate = Math.round(washrooms * 2.23 * 100) / 100;
      items.push({
        id: `${baseId}-wash`,
        description: `Washroom Cleaning (${washrooms} washroom${washrooms > 1 ? 's' : ''})`,
        siteId: null, frequency, amountPerVisit: rate,
        visitsPerWeek, monthlyAmount: Math.round(rate * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }
    if (reception > 0) {
      const rate = Math.round(reception * 2.46 * 100) / 100;
      items.push({
        id: `${baseId}-recept`,
        description: `Reception Area Cleaning (${reception} area${reception > 1 ? 's' : ''})`,
        siteId: null, frequency, amountPerVisit: rate,
        visitsPerWeek, monthlyAmount: Math.round(rate * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }

    onGenerate(items);
    onClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (!t) return;
    setSqft(t.params.squareFeet);
    setRooms(t.params.rooms);
    setWashrooms(t.params.washrooms);
    setReception(t.params.receptionAreas);
    setFrequency(t.params.frequency);
    setDays(t.params.visitsPerWeek);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Estimator" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Enter facility details to generate quote line items.
        </p>

        {/* Template Dropdown */}
        {templates.length > 0 && (
          <Select
            label="Load from Saved Template"
            options={[
              { value: '', label: '— Select a template —' },
              ...templates.map(t => ({
                value: t.id,
                label: `${t.name} (${FACILITY_LABELS[t.params.facilityType]}, ${t.params.squareFeet} sq ft)`,
              })),
            ]}
            value=""
            onChange={e => e.target.value && handleTemplateSelect(e.target.value)}
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
          {(['rooms', 'washrooms', 'reception'] as const).map(key => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">
                {key === 'washrooms' ? 'Washrooms' : key === 'reception' ? 'Reception Areas' : 'Rooms'}
              </label>
              <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const setter = key === 'rooms' ? setRooms : key === 'washrooms' ? setWashrooms : setReception;
                    const val = key === 'rooms' ? rooms : key === 'washrooms' ? washrooms : reception;
                    setter(Math.max(0, val - 1));
                  }}
                  className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  −
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900 text-sm">
                  {key === 'rooms' ? rooms : key === 'washrooms' ? washrooms : reception}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const setter = key === 'rooms' ? setRooms : key === 'washrooms' ? setWashrooms : setReception;
                    const val = key === 'rooms' ? rooms : key === 'washrooms' ? washrooms : reception;
                    setter(val + 1);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Service Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={e => setFrequency(e.target.value as CleaningFrequency)}
          />
          {frequency !== 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visits per Week</label>
              <div className="flex flex-wrap gap-2">
                {VISIT_OPTIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {d}×
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base cleaning ({sqft.toLocaleString()} sq ft)</span>
            <span className="font-medium">{formatCAD(breakdown.base)}</span>
          </div>
          {rooms > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rooms ({rooms})</span>
              <span className="font-medium">{formatCAD(breakdown.roomTotal)}</span>
            </div>
          )}
          {washrooms > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Washrooms ({washrooms})</span>
              <span className="font-medium">{formatCAD(breakdown.washTotal)}</span>
            </div>
          )}
          {reception > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Reception ({reception})</span>
              <span className="font-medium">{formatCAD(breakdown.receptTotal)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Estimated Monthly</span>
            <span className="text-blue-600 text-lg">{formatCAD(breakdown.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{Math.round(visitsPerWeek * monthlyMultiplier)} visits/month</span>
            <span>{formatCAD(breakdown.perVisit)} /visit</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Plus} onClick={handleApply}>
            Add {[sqft > 0, rooms > 0, washrooms > 0, reception > 0].filter(Boolean).length} Line Items
          </Button>
        </div>
      </div>
    </Modal>
  );
}
