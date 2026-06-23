import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Plus, Trash2, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { generateId } from '../utils/storage';
import toast from 'react-hot-toast';
import type { FacilityType, CleaningFrequency, EstimatorParams, QuoteTemplate } from '../types';
import { FACILITY_LABELS, FACILITY_BASE_RATES, DEFAULT_ADDONS } from '../types';
import { formatCAD } from '../utils/formatters';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const FACILITY_OPTIONS = (Object.keys(FACILITY_LABELS) as FacilityType[]).map(ft => ({
  value: ft,
  label: FACILITY_LABELS[ft],
}));

export function TemplatesPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const templates = state.quoteTemplates;

  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('medical_clinic');
  const [squareFeet, setSquareFeet] = useState(1500);
  const [rooms, setRooms] = useState(3);
  const [washrooms, setWashrooms] = useState(2);
  const [receptionAreas, setReceptionAreas] = useState(1);
  const [frequency, setFrequency] = useState<CleaningFrequency>('weekly');
  const [visitsPerWeek, setVisitsPerWeek] = useState(3);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const availableAddons = useMemo(() =>
    DEFAULT_ADDONS.filter(a => a.relevantFor.includes(facilityType)),
  [facilityType]);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const sortedTemplates = useMemo(() =>
    [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [templates]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    const params: EstimatorParams = {
      facilityType, squareFeet, rooms, washrooms, receptionAreas,
      frequency, visitsPerWeek, selectedAddons,
    };
    const now = new Date().toISOString();
    const template: QuoteTemplate = {
      id: generateId(),
      name: name.trim(),
      description: `${FACILITY_LABELS[facilityType]} — ${squareFeet.toLocaleString()} sq ft`,
      facilityType,
      params,
      createdAt: now,
    };
    dispatch({ type: 'ADD_QUOTE_TEMPLATE', payload: template });
    toast.success('Template saved');
    // Reset form
    setName('');
    setFacilityType('medical_clinic');
    setSquareFeet(1500);
    setRooms(3);
    setWashrooms(2);
    setReceptionAreas(1);
    setFrequency('weekly');
    setVisitsPerWeek(3);
    setSelectedAddons([]);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_QUOTE_TEMPLATE', payload: id });
    setDeleteId(null);
    toast.success('Template deleted');
  };

  const handleEditTemplate = (t: QuoteTemplate) => {
    setName(t.name);
    setFacilityType(t.params.facilityType);
    setSquareFeet(t.params.squareFeet);
    setRooms(t.params.rooms);
    setWashrooms(t.params.washrooms);
    setReceptionAreas(t.params.receptionAreas);
    setFrequency(t.params.frequency);
    setVisitsPerWeek(t.params.visitsPerWeek);
    setSelectedAddons(t.params.selectedAddons);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {/* Left: Create / Edit Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {name ? 'Edit Template' : 'Create New Template'}
              </h2>
              <div className="space-y-5">
                <Input
                  label="Template Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Standard Medical Clinic"
                />

                <Select
                  label="Facility Type"
                  options={FACILITY_OPTIONS}
                  value={facilityType}
                  onChange={e => setFacilityType(e.target.value as FacilityType)}
                />

                {facilityType && (
                  <p className="text-xs text-gray-400 -mt-3">
                    Base rate: {formatCAD(FACILITY_BASE_RATES[facilityType])}/sq ft/visit
                  </p>
                )}

                <Input
                  label="Square Footage"
                  type="number"
                  value={squareFeet.toString()}
                  onChange={e => setSquareFeet(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="1500"
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {facilityType === 'medical_clinic' || facilityType === 'dental_clinic'
                        ? 'Treatment Rooms' : 'Rooms'}
                    </label>
                    <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => setRooms(Math.max(0, rooms - 1))} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">−</button>
                      <span className="flex-1 text-center font-semibold text-gray-900 text-sm">{rooms}</span>
                      <button onClick={() => setRooms(rooms + 1)} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Washrooms</label>
                    <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => setWashrooms(Math.max(0, washrooms - 1))} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">−</button>
                      <span className="flex-1 text-center font-semibold text-gray-900 text-sm">{washrooms}</span>
                      <button onClick={() => setWashrooms(washrooms + 1)} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reception Areas</label>
                    <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                      <button onClick={() => setReceptionAreas(Math.max(0, receptionAreas - 1))} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">−</button>
                      <span className="flex-1 text-center font-semibold text-gray-900 text-sm">{receptionAreas}</span>
                      <button onClick={() => setReceptionAreas(receptionAreas + 1)} className="w-9 h-9 flex items-center justify-center text-blue-600 text-xl font-light hover:bg-gray-200">+</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Service Frequency"
                    options={FREQUENCY_OPTIONS}
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as CleaningFrequency)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Visits per Week</label>
                    <div className="flex gap-1.5">
                      {[1,2,3,4,5,6,7].map(v => (
                        <button key={v} onClick={() => setVisitsPerWeek(v)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                            visitsPerWeek === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                {availableAddons.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Optional Add-On Services</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {availableAddons.map(addon => (
                        <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 text-left transition-all ${
                            selectedAddons.includes(addon.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <span className="text-sm font-medium text-gray-800">{addon.label}</span>
                          <span className="text-sm font-semibold text-gray-700">{formatCAD(addon.monthlyPrice)}<span className="text-xs text-gray-400 font-normal">/mo</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button icon={Save} onClick={handleSave} disabled={!name.trim()}>
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Saved Templates List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Saved Templates</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{templates.length}</span>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No templates yet</p>
                  <p className="text-xs text-gray-400 mt-1">Fill in the form on the left and click Save</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sortedTemplates.map(t => (
                    <div key={t.id} className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                          <p className="text-xs text-gray-400">{FACILITY_LABELS[t.facilityType]} · {t.params.squareFeet.toLocaleString()} sq ft</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.params.rooms}r/{t.params.washrooms}w · {t.params.frequency} · {t.params.visitsPerWeek}x/wk</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleEditTemplate(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(t.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
