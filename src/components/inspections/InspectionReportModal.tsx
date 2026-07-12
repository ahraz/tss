import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatDate } from '../../utils/formatters';
import type { Inspection, User, Site, InspectionItem } from '../../types';

interface Props {
  isOpen: boolean;
  viewReport: Inspection | null;
  reportPhotos: string[];
  sites: Site[];
  users: User[];
  templates: InspectionItem[];
  onClose: () => void;
}

export function InspectionReportModal({
  isOpen, viewReport, reportPhotos, sites, users, templates, onClose,
}: Props) {
  if (!viewReport) return null;

  const site = sites.find(s => s.id === viewReport.siteId);
  const inspector = users.find(u => u.id === viewReport.performedById);
  const passCount = viewReport.items.filter(r => r.rating === 'pass').length;
  const failCount = viewReport.items.filter(r => r.rating === 'fail').length;
  const needsCount = viewReport.items.filter(r => r.rating === 'pass_needs').length;
  const total = viewReport.items.length;

  const itemsWithCats = viewReport.items.map(result => {
    const tmpl = templates.find(t => t.id === result.itemId);
    return { ...result, label: tmpl?.label || 'Unknown', category: tmpl?.category || 'Other' };
  });
  const grouped = new Map<string, typeof itemsWithCats>();
  for (const item of itemsWithCats) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inspection Report" size="lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{site?.name || 'Unknown Site'}</h2>
        <p className="text-sm text-gray-500">{formatDate(viewReport.performedAt)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">Inspector: {inspector?.name || 'Unknown'}</span>
        </div>
      </div>

      {/* Score summary */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">{passCount}/{total} Pass</span>
        </div>
        {needsCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">{needsCount} Needs Work</span>
          </div>
        )}
        {failCount > 0 && (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
            <XCircle size={16} />
            <span className="text-sm font-medium">{failCount} Fails</span>
          </div>
        )}
      </div>

      {/* Items by category */}
      <div className="space-y-4 mb-6">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</p>
            {items.map((item, idx) => {
              const Icon = item.rating === 'pass' ? CheckCircle : item.rating === 'pass_needs' ? AlertTriangle : XCircle;
              const color = item.rating === 'pass' ? 'text-green-600' : item.rating === 'pass_needs' ? 'text-amber-600' : 'text-red-600';
              return (
                <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <Icon size={16} className={`${color} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-sm text-gray-700">{item.label}</p>
                    {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Notes */}
      {viewReport.notes && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Overall Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewReport.notes}</p>
        </div>
      )}

      {/* Photos */}
      {reportPhotos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo Evidence ({reportPhotos.length})</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {reportPhotos.map((photo, idx) => (
              <img key={idx} src={photo} alt={`Evidence ${idx + 1}`} className="rounded-lg object-cover w-full h-24" />
            ))}
          </div>
        </div>
      )}

      {/* Client sign-off */}
      {viewReport.clientSigned && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Signed off by {viewReport.signedByName || 'client'}</span>
            <span className="text-xs text-gray-400">{viewReport.clientSignedAt ? formatDate(viewReport.clientSignedAt) : ''}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
