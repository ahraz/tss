import React, { useState, useMemo } from 'react';
import { Bookmark, Trash2, ChevronDown, Check, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { QuoteTemplate, EstimatorParams } from '../../types';
import { FACILITY_LABELS } from '../../types';

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bookmark size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">Saved Templates</span>
        {templates.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{templates.length}</span>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">No templates saved yet</p>
            <p className="text-xs text-amber-700 mt-1">
              Click <strong>Open Estimator</strong> above, configure your facility settings, then click <strong>Save as Template</strong> to create a reusable template.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 mb-6">
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
      )}

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
