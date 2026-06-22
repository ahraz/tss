import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bookmark, Trash2, ChevronDown, Check } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedTemplates = useMemo(() =>
    [...templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [templates]);

  // Close menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        size="sm"
        variant="secondary"
        icon={Bookmark}
        onClick={() => setOpen(!open)}
        className={open ? 'ring-2 ring-blue-400' : ''}
      >
        Templates
        {templates.length > 0 && (
          <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{templates.length}</span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {templates.length === 0 ? (
            <div className="p-5 text-center">
              <Bookmark size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No saved templates</p>
              <p className="text-xs text-gray-400 mt-1">Open the estimator and click <strong>Save as Template</strong></p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {sortedTemplates.map(t => (
                <div key={t.id} className="px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400 truncate">{FACILITY_LABELS[t.facilityType]} · {t.params.squareFeet.toLocaleString()} sq ft · {t.params.rooms}r/{t.params.washrooms}w</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { onApply(t.params); setOpen(false); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Apply template"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
