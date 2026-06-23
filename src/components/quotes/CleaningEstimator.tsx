import React, { useState, useMemo } from 'react';
import { Plus, Minus, Check, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  FACILITY_LABELS,
  FACILITY_BASE_RATES,
  DEFAULT_ADDONS,
} from '../../types';
import type {
  FacilityType,
  CleaningFrequency,
  QuoteLineItem,
  EstimatorParams,
} from '../../types';
import { formatCAD } from '../../utils/formatters';
import { generateId } from '../../utils/storage';

interface EstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (items: QuoteLineItem[]) => void;
  onSaveTemplate?: (params: EstimatorParams, name: string) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const VISIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

interface CounterProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  hint?: string;
}

function Counter({ label, value, min = 0, max = 50, onChange, hint }: CounterProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={13} />
        </button>
        <span className="w-6 text-center font-semibold text-gray-900 text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function CleaningEstimator({ isOpen, onClose, onGenerate, onSaveTemplate }: EstimatorProps) {
  const [facilityType, setFacilityType] = useState<FacilityType>('medical_clinic');
  const [squareFeet, setSquareFeet] = useState(1500);
  const [rooms, setRooms] = useState(3);
  const [washrooms, setWashrooms] = useState(2);
  const [receptionAreas, setReceptionAreas] = useState(1);
  const [frequency, setFrequency] = useState<CleaningFrequency>('weekly');
  const [visitsPerWeek, setVisitsPerWeek] = useState(3);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const availableAddons = useMemo(() =>
    DEFAULT_ADDONS.filter(a => a.relevantFor.includes(facilityType)),
  [facilityType]);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Calculate pricing
  const breakdown = useMemo(() => {
    const baseRate = FACILITY_BASE_RATES[facilityType];
    const monthlyMultiplier = frequency === 'daily' ? 22
      : frequency === 'weekly' ? 4.33
      : frequency === 'biweekly' ? 2.17
      : 1;

    // Base cleaning: sq ft * rate * visits/week * monthly multiplier
    const basePerVisit = Math.round(squareFeet * baseRate * 100) / 100;
    const baseMonthly = Math.round(basePerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100;

    // Room cleaning: each room adds $2.80/visit (treatment room rate)
    const roomPerVisit = Math.round(rooms * 2.80 * 100) / 100;
    const roomMonthly = Math.round(roomPerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100;

    // Washroom: $2.23/washroom/visit
    const washroomPerVisit = Math.round(washrooms * 2.23 * 100) / 100;
    const washroomMonthly = Math.round(washroomPerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100;

    // Reception: $2.46/area/visit
    const receptionPerVisit = Math.round(receptionAreas * 2.46 * 100) / 100;
    const receptionMonthly = Math.round(receptionPerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100;

    // Add-ons (monthly flat amounts)
    const addonsMonthly = selectedAddons.reduce((sum, id) => {
      const addon = DEFAULT_ADDONS.find(a => a.id === id);
      return sum + (addon?.monthlyPrice ?? 0);
    }, 0);

    const subtotal = baseMonthly + roomMonthly + washroomMonthly + receptionMonthly;

    return {
      basePerVisit,
      baseMonthly,
      roomPerVisit,
      roomMonthly,
      washroomPerVisit,
      washroomMonthly,
      receptionPerVisit,
      receptionMonthly,
      addonsMonthly,
      subtotal,
      totalMonthly: subtotal + addonsMonthly,
    };
  }, [facilityType, squareFeet, rooms, washrooms, receptionAreas, frequency, visitsPerWeek, selectedAddons]);

  const params: EstimatorParams = {
    facilityType, squareFeet, rooms, washrooms, receptionAreas,
    frequency, visitsPerWeek, selectedAddons,
  };

  const handleGenerate = () => {
    const monthlyMultiplier = frequency === 'daily' ? 22
      : frequency === 'weekly' ? 4.33
      : frequency === 'biweekly' ? 2.17
      : 1;

    const items: QuoteLineItem[] = [];
    const baseId = generateId();

    // Base cleaning line item
    if (squareFeet > 0) {
      const ratePerVisit = Math.round(squareFeet * FACILITY_BASE_RATES[facilityType] * 100) / 100;
      items.push({
        id: `${baseId}-base`,
        description: `Base Cleaning — ${squareFeet.toLocaleString()} sq ft (${FACILITY_LABELS[facilityType]})`,
        siteId: null,
        frequency,
        amountPerVisit: ratePerVisit,
        visitsPerWeek,
        monthlyAmount: Math.round(ratePerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }

    // Room cleaning
    if (rooms > 0) {
      const ratePerVisit = Math.round(rooms * 2.80 * 100) / 100;
      items.push({
        id: `${baseId}-rooms`,
        description: roomLabel(rooms, facilityType),
        siteId: null,
        frequency,
        amountPerVisit: ratePerVisit,
        visitsPerWeek,
        monthlyAmount: Math.round(ratePerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }

    // Washroom
    if (washrooms > 0) {
      const ratePerVisit = Math.round(washrooms * 2.23 * 100) / 100;
      items.push({
        id: `${baseId}-washrooms`,
        description: `Washroom Cleaning (${washrooms} washroom${washrooms > 1 ? 's' : ''})`,
        siteId: null,
        frequency,
        amountPerVisit: ratePerVisit,
        visitsPerWeek,
        monthlyAmount: Math.round(ratePerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }

    // Reception
    if (receptionAreas > 0) {
      const ratePerVisit = Math.round(receptionAreas * 2.46 * 100) / 100;
      items.push({
        id: `${baseId}-reception`,
        description: `Reception Area Cleaning (${receptionAreas} area${receptionAreas > 1 ? 's' : ''})`,
        siteId: null,
        frequency,
        amountPerVisit: ratePerVisit,
        visitsPerWeek,
        monthlyAmount: Math.round(ratePerVisit * visitsPerWeek * monthlyMultiplier * 100) / 100,
      });
    }

    // Add-on items
    for (const addonId of selectedAddons) {
      const addon = DEFAULT_ADDONS.find(a => a.id === addonId);
      if (!addon) continue;
      items.push({
        id: `${baseId}-${addon.id}`,
        description: addon.label,
        siteId: null,
        frequency: 'monthly',
        amountPerVisit: addon.monthlyPrice,
        visitsPerWeek: 0,
        monthlyAmount: addon.monthlyPrice,
      });
    }

    onGenerate(items);
    onClose();
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !onSaveTemplate) return;
    onSaveTemplate(params, templateName.trim());
    setTemplateName('');
    setShowSaveDialog(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Cleaning Price Estimator" size="xl">
        <div className="space-y-6">
          {/* Facility Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Facility Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(FACILITY_LABELS) as FacilityType[]).map(ft => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFacilityType(ft)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    facilityType === ft
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {FACILITY_LABELS[ft]}
                </button>
              ))}
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Square Footage</label>
              <span className="text-2xl font-bold text-gray-900">{squareFeet.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSquareFeet(Math.max(200, squareFeet - 100))}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Minus size={15} />
              </button>
              <input
                type="range"
                min={200}
                max={50000}
                step={100}
                value={squareFeet}
                onChange={e => setSquareFeet(parseInt(e.target.value) || 1500)}
                className="flex-1 accent-blue-600 h-2"
              />
              <button
                type="button"
                onClick={() => setSquareFeet(Math.min(50000, squareFeet + 100))}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>200</span>
              <span>50,000</span>
            </div>
          </div>

          {/* Counters */}
          <div className="divide-y divide-gray-100">
            <Counter
              label="Treatment / Patient Rooms"
              value={rooms}
              onChange={setRooms}
              hint="Exam rooms, patient rooms, offices"
            />
            <Counter
              label="Washrooms"
              value={washrooms}
              onChange={setWashrooms}
              hint="Public & staff washrooms"
            />
            <Counter
              label="Reception Areas"
              value={receptionAreas}
              onChange={setReceptionAreas}
              hint="Waiting rooms, front desk areas"
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Service Frequency"
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={e => setFrequency(e.target.value as CleaningFrequency)}
            />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Visits per Week</label>
              <div className="flex gap-1.5">
                {VISIT_OPTIONS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisitsPerWeek(v)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      visitsPerWeek === v
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add-ons */}
          {availableAddons.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Optional Add-On Services</label>
              <div className="space-y-1.5">
                {availableAddons.map(addon => (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                      selectedAddons.includes(addon.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedAddons.includes(addon.id)
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300'
                      }`}>
                        {selectedAddons.includes(addon.id) && <Check size={12} />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{addon.label}</span>
                        <p className="text-xs text-gray-400">{addon.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{formatCAD(addon.monthlyPrice)}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Cleaning <span className="text-gray-400">({squareFeet.toLocaleString()} sq ft × {formatCAD(breakdown.basePerVisit)}/visit)</span></span>
              <span className="font-medium text-gray-900">{formatCAD(breakdown.baseMonthly)}</span>
            </div>
            {rooms > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Room Cleaning <span className="text-gray-400">({rooms} rooms)</span></span>
                <span className="font-medium text-gray-900">{formatCAD(breakdown.roomMonthly)}</span>
              </div>
            )}
            {washrooms > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Washroom Cleaning <span className="text-gray-400">({washrooms} washrooms)</span></span>
                <span className="font-medium text-gray-900">{formatCAD(breakdown.washroomMonthly)}</span>
              </div>
            )}
            {receptionAreas > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reception Area <span className="text-gray-400">({receptionAreas} area{receptionAreas > 1 ? 's' : ''})</span></span>
                <span className="font-medium text-gray-900">{formatCAD(breakdown.receptionMonthly)}</span>
              </div>
            )}
            {selectedAddons.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Add-Ons <span className="text-gray-400">({selectedAddons.length} selected)</span></span>
                <span className="font-medium text-gray-900">{formatCAD(breakdown.addonsMonthly)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Estimated Monthly Total</span>
              <span className="text-xl font-bold text-blue-600">{formatCAD(breakdown.totalMonthly)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Estimated Annual</span>
              <span className="font-medium">{formatCAD(breakdown.totalMonthly * 12)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div>
              {onSaveTemplate && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Save}
                  onClick={() => setShowSaveDialog(true)}
                >
                  Save as Template
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleGenerate}>
                Add {rooms > 0 ? 2 + (washrooms > 0 ? 1 : 0) + (receptionAreas > 0 ? 1 : 0) + selectedAddons.length : selectedAddons.length + 1} Line Items
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Save Template Dialog */}
      <Modal isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} title="Save as Template" size="sm">
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="e.g. Standard Medical Clinic"
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>Save Template</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function roomLabel(count: number, type: FacilityType): string {
  const prefix = type === 'medical_clinic' ? 'Patient / Treatment'
    : type === 'dental_clinic' ? 'Operatory / Treatment'
    : type === 'office' ? 'Office'
    : 'Room';
  return `${prefix} Cleaning (${count} ${prefix.toLowerCase().includes('office') ? 'offices' : 'rooms'})`;
}
