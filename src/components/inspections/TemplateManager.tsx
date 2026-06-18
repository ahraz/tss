import { Plus, PenSquare, Trash2, ListChecks } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import type { InspectionItem } from '../../types';

interface Props {
  templatesByCategory: Map<string, InspectionItem[]>;
  availableTemplates: Map<string, InspectionItem[]>;
  templates: InspectionItem[];
  onNewTemplate: () => void;
  onEditTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export function TemplateManager({
  templatesByCategory, availableTemplates, templates,
  onNewTemplate, onEditTemplate, onDeleteTemplate,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {templates.length} items across {templatesByCategory.size} categories
        </p>
        <Button onClick={onNewTemplate}>
          <Plus size={16} /> New Template
        </Button>
      </div>

      {templatesByCategory.size === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No templates yet"
          description="Create an inspection template with categories like Floors, Washrooms, Kitchen, and Dusting."
          actionLabel="Create Template"
          onAction={onNewTemplate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...availableTemplates.keys()].map(templateId => {
            const items = availableTemplates.get(templateId)!;
            const cats = [...new Set(items.map(i => i.category))];
            return (
              <Card key={templateId}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cats.join(' / ')}</h3>
                    <p className="text-xs text-gray-500">{items.length} items · {cats.length} categories</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEditTemplate(templateId)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      <PenSquare size={16} />
                    </button>
                    <button onClick={() => onDeleteTemplate(templateId)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {cats.map(cat => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mt-2 first:mt-0">{cat}</p>
                      {items.filter(i => i.category === cat).sort((a, b) => a.order - b.order).map(item => (
                        <p key={item.id} className="text-sm text-gray-700 ml-2">• {item.label}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
