import React from 'react';
import { Clock, CheckCircle, Banknote, FileText, XCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
import { formatCAD, formatDate } from '../../utils/formatters';
import type { User, PayrollRecord, Shift, Site } from '../../types';

interface EmployeePayCardProps {
  user: User;
  hours: number;
  gross: number;
  record: PayrollRecord | undefined;
  userShifts: Shift[];
  sites: Site[];
  reviewEmployee: string | null;
  onReviewToggle: (userId: string) => void;
  onApprove: (userId: string) => void;
  onMarkPaid: (userId: string) => void;
  onShowPayStub: (recordId: string) => void;
  onVoidRecord: (recordId: string) => void;
}

export function EmployeePayCard({
  user, hours, gross, record, userShifts, sites,
  reviewEmployee, onReviewToggle, onApprove, onMarkPaid, onShowPayStub, onVoidRecord,
}: EmployeePayCardProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
        <UserAvatar user={user} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
          <p className="text-xs text-gray-500">{formatCAD(user.hourlyRate)}/hr</p>
        </div>
        {record && (
          <Badge
            label={record.status}
            variant={record.status === 'paid' ? 'success' : record.status === 'approved' ? 'info' : 'warning'}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium">Hours</p>
          <p className="text-xl font-bold text-gray-900">{hours.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium">Gross Pay</p>
          <p className="text-xl font-bold text-green-600">{formatCAD(gross)}</p>
        </div>
      </div>

      {userShifts.length > 0 && (
        <p className="text-xs text-gray-400 mb-4">
          {userShifts.length} shift{userShifts.length !== 1 ? 's' : ''} in this period
        </p>
      )}

      <div className="mt-auto space-y-2">
        {userShifts.length > 0 && (
          <Button variant="secondary" onClick={() => onReviewToggle(user.id)} className="w-full">
            <Clock size={14} />
            {reviewEmployee === user.id ? 'Hide Shifts' : 'Review Shifts'}
          </Button>
        )}

        {record?.status === 'calculated' && (
          <Button onClick={() => onApprove(user.id)} className="w-full">
            <CheckCircle size={14} />
            Approve & Record
          </Button>
        )}

        {record?.status === 'approved' && (
          <Button onClick={() => onMarkPaid(user.id)} className="w-full">
            <Banknote size={14} />
            Mark as Paid
          </Button>
        )}

        {record?.status === 'paid' && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onShowPayStub(record.id)} className="flex-1">
              <FileText size={14} />
              Pay Stub
            </Button>
            <button
              onClick={() => onVoidRecord(record.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete record"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {!record && hours > 0 && (
          <p className="text-xs text-gray-400 text-center py-1">
            Click "Calculate Payroll" to create records
          </p>
        )}

        {hours === 0 && !record && (
          <p className="text-xs text-gray-400 text-center py-1">No shifts in this period</p>
        )}
      </div>

      {reviewEmployee === user.id && userShifts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Shift Breakdown</p>
          {userShifts.map(shift => {
            const site = sites.find(s => s.id === shift.siteId);
            return (
              <div key={shift.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-2">
                <div>
                  <p className="font-medium text-gray-700">{site?.name || 'Unknown Site'}</p>
                  <p className="text-xs text-gray-400">{formatDate(shift.clockInTime)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-700">
                    {shift.durationMinutes ? `${(shift.durationMinutes / 60).toFixed(1)}h` : '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {shift.durationMinutes ? formatCAD((shift.durationMinutes / 60) * user.hourlyRate) : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
