import { useEffect, useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { getPhoto } from '../../utils/photoStore';
import type { Inspection, InspectionItem } from '../../types';

interface Props {
  inspection: Inspection;
  templates: InspectionItem[];
}

export function CleanCheckReportView({ inspection, templates }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        (inspection.photoIds || []).map(id => getPhoto(id))
      );
      setPhotos(results.filter((p): p is string => p !== null));
    }
    load();
  }, [inspection.photoIds]);

  const itemsWithMeta = useMemo(() => {
    return inspection.items.map(result => {
      const tmpl = templates.find(t => t.id === result.itemId);
      return { ...result, label: tmpl?.label || 'Unknown', category: tmpl?.category || 'Other' };
    });
  }, [inspection.items, templates]);

  const grouped = new Map<string, typeof itemsWithMeta>();
  for (const item of itemsWithMeta) {
    const cat = item.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</p>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              {item.rating === 'pass' ? (
                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
              ) : item.rating === 'pass_needs' ? (
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 font-medium">{item.label}</p>
                  <span className={`text-xs font-medium ${
                    item.rating === 'pass' ? 'text-green-600' :
                    item.rating === 'pass_needs' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {item.rating === 'pass' ? 'Pass' : item.rating === 'pass_needs' ? 'Needs Work' : 'Fail'}
                  </span>
                </div>
                {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {inspection.notes && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Overall Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{inspection.notes}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo Evidence ({photos.length})</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo, idx) => (
              <img key={idx} src={photo} alt="" className="rounded-lg object-cover w-full h-24 cursor-pointer" />
            ))}
          </div>
        </div>
      )}

      {inspection.clientSigned && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Signed off by {inspection.signedByName || 'client'}</span>
            <span className="text-xs text-gray-400">
              {inspection.clientSignedAt ? formatDate(inspection.clientSignedAt) : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
