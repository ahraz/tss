import React from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
import { EmptyState } from '../ui/EmptyState';
import { formatCAD } from '../../utils/formatters';
import type { PayrollRecord, User } from '../../types';

interface PayHistoryProps {
  historyPeriods: [string, PayrollRecord[]][];
  users: User[];
  onShowPayStub: (recordId: string) => void;
}

export function PayHistory({ historyPeriods, users, onShowPayStub }: PayHistoryProps) {
  if (historyPeriods.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No payroll history yet"
        description="Once you calculate and approve payroll, past periods will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {historyPeriods.map(([label, records]) => {
        const total = records.reduce((s, r) => s + r.grossAmount, 0);
        const paid = records.filter(r => r.isPaid).length;
        return (
          <Card key={label} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{label}</h3>
                <p className="text-xs text-gray-500">
                  {records.length} employee{records.length !== 1 ? 's' : ''} · {paid} of {records.length} paid
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCAD(total)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {records.map(r => {
                const user = users.find(u => u.id === r.userId);
                return (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {user && <UserAvatar user={user} size="sm" />}
                      <div>
                        <p className="text-sm font-medium text-gray-700">{user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">
                          {r.hoursWorked.toFixed(1)}h × {formatCAD(r.hourlyRate)}/hr
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">{formatCAD(r.grossAmount)}</span>
                      <Badge
                        label={r.status}
                        variant={r.status === 'paid' ? 'success' : r.status === 'approved' ? 'info' : 'warning'}
                      />
                      <button
                        onClick={() => onShowPayStub(r.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Pay Stub"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
