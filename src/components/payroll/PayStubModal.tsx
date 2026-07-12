import React from 'react';
import { UserAvatar } from '../ui/UserAvatar';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatCAD, formatDate, formatDateTime } from '../../utils/formatters';
import type { PayrollRecord, User, Shift, Site } from '../../types';

interface PayStubModalProps {
  record: PayrollRecord | null | undefined;
  user: User | null | undefined;
  shifts: Shift[];
  sites: Site[];
  onClose: () => void;
}

export function PayStubModal({ record, user, shifts, sites, onClose }: PayStubModalProps) {
  return (
    <Modal isOpen={!!record} onClose={onClose} title="Pay Stub">
      {record && user && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
            <UserAvatar user={user} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500">{record.payPeriodLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Hourly Rate</p>
              <p className="text-lg font-bold text-gray-900">{formatCAD(record.hourlyRate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Hours</p>
              <p className="text-lg font-bold text-gray-900">{record.hoursWorked.toFixed(1)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Gross Pay</p>
              <p className="text-lg font-bold text-green-600">{formatCAD(record.grossAmount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
              <Badge
                label={record.status}
                variant={record.status === 'paid' ? 'success' : record.status === 'approved' ? 'info' : 'warning'}
              />
            </div>
          </div>

          {shifts.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Shifts ({shifts.length})</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {shifts.map(shift => {
                  const site = sites.find(s => s.id === shift.siteId);
                  return (
                    <div key={shift.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-700">{site?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{formatDate(shift.clockInTime)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-700">{shift.durationMinutes ? `${(shift.durationMinutes / 60).toFixed(1)}h` : '—'}</p>
                        <p className="text-xs text-gray-500">
                          {shift.durationMinutes ? formatCAD((shift.durationMinutes / 60) * record.hourlyRate) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-gray-200 pt-4">
            <span className="font-semibold text-gray-700">Total Gross Pay</span>
            <span className="text-xl font-bold text-green-600">{formatCAD(record.grossAmount)}</span>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <p>Period: {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}</p>
            {record.approvedAt && <p>Approved: {formatDateTime(record.approvedAt)}</p>}
            {record.paidDate && <p>Paid: {formatDateTime(record.paidDate)}</p>}
            <p>Created: {formatDateTime(record.createdAt)}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
