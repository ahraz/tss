import { ClipboardCheck, Search, CheckCircle, FileText, UserCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { UserAvatar } from '../ui/UserAvatar';
import { formatDate } from '../../utils/formatters';
import type { Inspection, User, Site } from '../../types';

interface Props {
  inspections: Inspection[];
  filteredInspections: Inspection[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  sites: Site[];
  users: User[];
  onViewReport: (id: string) => void;
  onSignOff: (id: string) => void;
  onNewInspection: () => void;
}

export function InspectionHistory({
  inspections, filteredInspections, searchQuery, onSearchChange,
  sites, users, onViewReport, onSignOff, onNewInspection,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by site name…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
          <p className="text-xl font-bold text-gray-900">{inspections.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Passed</p>
          <p className="text-xl font-bold text-green-600">
            {inspections.filter(i => i.items.every(r => r.rating === 'pass')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Needs Work</p>
          <p className="text-xl font-bold text-amber-600">
            {inspections.filter(i => i.items.some(r => r.rating === 'pass_needs') && !i.items.some(r => r.rating === 'fail')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Has Fails</p>
          <p className="text-xl font-bold text-red-600">
            {inspections.filter(i => i.items.some(r => r.rating === 'fail')).length}
          </p>
        </Card>
      </div>

      {/* Inspection list */}
      {filteredInspections.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No inspections yet"
          description="Perform your first quality inspection to see it here."
          actionLabel="New Inspection"
          onAction={onNewInspection}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInspections.map(inspection => {
            const site = sites.find(s => s.id === inspection.siteId);
            const inspector = users.find(u => u.id === inspection.performedById);
            const passCount = inspection.items.filter(r => r.rating === 'pass').length;
            const needsCount = inspection.items.filter(r => r.rating === 'pass_needs').length;
            const failCount = inspection.items.filter(r => r.rating === 'fail').length;
            const total = inspection.items.length;

            return (
              <Card key={inspection.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{site?.name || 'Unknown Site'}</h3>
                    <p className="text-xs text-gray-500">{formatDate(inspection.performedAt)}</p>
                  </div>
                  <Badge
                    label={failCount > 0 ? 'FAIL' : needsCount > 0 ? 'NEEDS' : 'PASS'}
                    variant={failCount > 0 ? 'danger' : needsCount > 0 ? 'warning' : 'success'}
                  />
                </div>

                {/* Score bar */}
                <div className="flex gap-1 mb-3">
                  <div className="flex-1 h-1.5 bg-green-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(passCount / total) * 100}%` }} />
                  </div>
                  {needsCount > 0 && (
                    <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(needsCount / total) * 100}%` }} />
                    </div>
                  )}
                  {failCount > 0 && (
                    <div className="flex-1 h-1.5 bg-red-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(failCount / total) * 100}%` }} />
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  {passCount}/{total} pass · {needsCount} need{needsCount !== 1 ? 's' : ''} work · {failCount} fail{failCount !== 1 ? 's' : ''}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  {inspector && <UserAvatar user={inspector} size="sm" />}
                  <span className="text-xs text-gray-500">{inspector?.name || 'Unknown'}</span>
                </div>

                {inspection.clientSigned && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3">
                    <CheckCircle size={14} />
                    Signed off by {inspection.signedByName || 'client'} on {formatDate(inspection.clientSignedAt!)}
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button variant="secondary" onClick={() => onViewReport(inspection.id)} className="flex-1">
                    <FileText size={14} /> View Report
                  </Button>
                  {!inspection.clientSigned && (
                    <Button onClick={() => onSignOff(inspection.id)} className="flex-1">
                      <UserCheck size={14} /> Client Sign-off
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
