import React, { useState, useMemo } from 'react';
import { Bookmark, Trash2, ChevronDown, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { QuoteTemplate, EstimatorParams, QuoteLineItem, CleaningFrequency, FacilityType } from '../../types';
import { FACILITY_LABELS, FACILITY_BASE_RATES, DEFAULT_ADDONS } from '../../types';
import { formatCAD } from '../../utils/formatters';

interface TemplateManagerProps {
  templates: QuoteTemplate[];
  onApply: (params: EstimatorParams) => void;
  onDelete: (id: string) => void;
}

export function QuoteTemplateManager({ templates, onApply, onDelete }: TemplateManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedTemplates = useMemo(() =>
    [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [templates]);

  if (templates.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Bookmark size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">Saved Templates</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{templates.length}</span>
      </div>
      <div className="space-y-1.5">
        {sortedTemplates.map(t => (
          <div key={t.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bookmark size={15} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">{FACILITY_LABELS[t.facilityType]} · {t.params.squareFeet.toLocaleString()} sq ft</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedId === t.id ? 'rotate-180' : ''}`} />
            </button>
            {expandedId === t.id && (
              <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 my-2">
                  <div>{t.params.rooms} rooms</div>
                  <div>{t.params.washrooms} washrooms</div>
                  <div>{t.params.receptionAreas} reception</div>
                  <div>{t.params.frequency}</div>
                  <div>{t.params.visitsPerWeek}x/week</div>
                  <div>{t.params.selectedAddons.length} add-ons</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    icon={Check}
                    onClick={() => onApply(t.params)}
                  >
                    Apply
                  </Button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}
        title="Delete Template?"
        message="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
