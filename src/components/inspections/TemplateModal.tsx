import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  isOpen: boolean;
  editTemplateId: string | null;
  templateCategory: string;
  templateItemLabel: string;
  templateItems: { category: string; label: string }[];
  onCategoryChange: (v: string) => void;
  onItemLabelChange: (v: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TemplateModal({
  isOpen, editTemplateId, templateCategory, templateItemLabel, templateItems,
  onCategoryChange, onItemLabelChange, onAddItem, onRemoveItem, onSave, onClose,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTemplateId ? 'Edit Template' : 'New Template'}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Add checklist items grouped by category (e.g., Floors, Washrooms, Kitchen).
        </p>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Category"
              value={templateCategory}
              onChange={e => onCategoryChange(e.target.value)}
              placeholder="e.g., Washrooms"
            />
          </div>
          <div className="flex-1">
            <Input
              label="Item"
              value={templateItemLabel}
              onChange={e => onItemLabelChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddItem(); } }}
              placeholder="e.g., Mirrors cleaned"
            />
          </div>
          <button
            onClick={onAddItem}
            disabled={!templateCategory.trim() || !templateItemLabel.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Plus size={18} />
          </button>
        </div>

        {templateItems.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {templateItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">{item.category}</span>
                  <p className="text-sm text-gray-700">{item.label}</p>
                </div>
                <button onClick={() => onRemoveItem(index)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={templateItems.length === 0}>
            {editTemplateId ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
