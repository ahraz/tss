import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDate } from '../../utils/formatters';
import { CleanCheckReportView } from './CleanCheckReportView';
import type { Inspection, InspectionItem } from '../../types';

interface Props {
  inspections: Inspection[];
  templates: InspectionItem[];
}

export function CleanCheckCard({ inspections, templates }: Props) {
  const [expanded, setExpanded] = useState(false);
  const latest = inspections[0] || null;

  const passCount = latest ? latest.items.filter(i => i.rating === 'pass').length : 0;
  const failCount = latest ? latest.items.filter(i => i.rating === 'fail').length : 0;
  const needsCount = latest ? latest.items.filter(i => i.rating === 'pass_needs').length : 0;
  const total = latest ? latest.items.length : 0;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">CleanCheck</h2>
          </div>

          {!latest ? (
            <p className="text-sm text-gray-400">No inspection yet — first one coming soon.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <span className={`text-3xl font-bold ${
                  pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {pct}%
                </span>
                <div className="flex gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> {passCount}
                  </span>
                  {needsCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle size={14} /> {needsCount}
                    </span>
                  )}
                  {failCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} /> {failCount}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Inspector: Unknown · {formatDate(latest.performedAt)}
              </p>
            </>
          )}
        </div>

        {latest && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Report'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && latest && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <CleanCheckReportView inspection={latest} templates={templates} />
        </div>
      )}
    </Card>
  );
}
