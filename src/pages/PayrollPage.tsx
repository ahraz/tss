import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Users as UsersIcon, CheckCircle, Clock, Download,
  ChevronLeft, ChevronRight, AlertCircle, Search, Calendar,
  FileText, Banknote, XCircle, ArrowUpDown, CheckSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Modal } from '../components/ui/Modal';
import { formatCAD, formatDate, formatDateTime } from '../utils/formatters';
import { getPayPeriodDates, calculateEmployeeHours, calculateEmployeePay } from '../utils/calculations';
import { generateId } from '../utils/storage';
import type { PayrollRecord, Shift, PayPeriod } from '../types';

type PayrollTab = 'current' | 'history';

export function PayrollPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PayrollTab>('current');
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'previous'>('current');
  const [reviewEmployee, setReviewEmployee] = useState<string | null>(null);
  const [showPayStub, setShowPayStub] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  // Determine period dates
  const periodDates = useMemo(() => {
    const current = getPayPeriodDates(state.settings.payPeriod);
    if (selectedPeriod === 'current') return current;
    // Previous period: subtract length of period from current
    const days = state.settings.payPeriod === 'monthly' ? 28 : 14;
    const prevStart = new Date(current.start);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(current.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    return { start: prevStart, end: prevEnd };
  }, [selectedPeriod, state.settings.payPeriod]);

  const periodLabel = useMemo(() => {
    const s = periodDates.start;
    const e = periodDates.end;
    if (state.settings.payPeriod === 'monthly') {
      return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [periodDates, state.settings.payPeriod]);

  // Active employees
  const employees = useMemo(() =>
    state.users.filter(u => u.isActive && u.role === 'employee'),
    [state.users]
  );

  // Completed shifts in the period
  const periodShifts = useMemo(() =>
    state.shifts.filter(s => {
      if (s.status !== 'completed') return false;
      const t = new Date(s.clockInTime).getTime();
      return t >= periodDates.start.getTime() && t <= periodDates.end.getTime();
    }),
    [state.shifts, periodDates]
  );

  // Existing payroll records for this period
  const existingRecords = useMemo(() =>
    state.payroll.filter(r =>
      r.periodStart === periodDates.start.toISOString() &&
      r.periodEnd === periodDates.end.toISOString()
    ),
    [state.payroll, periodDates]
  );

  // Employee payroll summaries
  const employeeSummaries = useMemo(() =>
    employees.map(user => {
      const hours = calculateEmployeeHours(user.id, state.shifts, periodDates.start, periodDates.end);
      const gross = calculateEmployeePay(user.id, state.shifts, user, periodDates.start, periodDates.end);
      const record = existingRecords.find(r => r.userId === user.id);
      const userShifts = periodShifts.filter(s => s.userId === user.id);
      return { user, hours, gross, record, userShifts };
    }),
    [employees, state.shifts, periodDates, existingRecords, periodShifts]
  );

  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return employeeSummaries;
    const q = searchQuery.toLowerCase();
    return employeeSummaries.filter(s => s.user.name.toLowerCase().includes(q));
  }, [employeeSummaries, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    let totalHours = 0, totalGross = 0, totalApproved = 0;
    for (const s of employeeSummaries) {
      totalHours += s.hours;
      totalGross += s.gross;
      if (s.record?.status === 'approved' || s.record?.status === 'paid') totalApproved += s.gross;
    }
    return { totalHours, totalGross, totalApproved };
  }, [employeeSummaries]);

  // History: past payroll records grouped by period
  const historyPeriods = useMemo(() => {
    const grouped = new Map<string, PayrollRecord[]>();
    for (const r of state.payroll) {
      const key = r.payPeriodLabel || `${r.periodStart}–${r.periodEnd}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => b[1][0].periodStart.localeCompare(a[1][0].periodStart));
  }, [state.payroll]);

  // Calculate & create payroll records
  const handleCalculatePayroll = () => {
    for (const summary of employeeSummaries) {
      if (summary.hours <= 0) continue;
      if (existingRecords.find(r => r.userId === summary.user.id)) continue;

      const record: PayrollRecord = {
        id: generateId(),
        userId: summary.user.id,
        periodStart: periodDates.start.toISOString(),
        periodEnd: periodDates.end.toISOString(),
        hoursWorked: summary.hours,
        hourlyRate: summary.user.hourlyRate,
        grossAmount: summary.gross,
        status: 'calculated',
        isPaid: false,
        paidDate: null,
        approvedAt: null,
        approvedById: null,
        payPeriodLabel: periodLabel,
        shiftIds: summary.userShifts.map(s => s.id),
        notes: '',
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_PAYROLL', payload: record });
    }
  };

  // Approve an employee's pay
  const handleApprove = (userId: string) => {
    const record = existingRecords.find(r => r.userId === userId);
    if (!record || !currentUser) return;
    dispatch({
      type: 'UPDATE_PAYROLL',
      payload: { ...record, status: 'approved', approvedAt: new Date().toISOString(), approvedById: currentUser.id },
    });
    setReviewEmployee(null);
  };

  // Mark as paid
  const handleMarkPaid = (userId: string) => {
    const record = existingRecords.find(r => r.userId === userId);
    if (!record) return;
    dispatch({
      type: 'UPDATE_PAYROLL',
      payload: { ...record, status: 'paid', isPaid: true, paidDate: new Date().toISOString() },
    });
  };

  // Void / delete a record
  const handleVoidRecord = (recordId: string) => {
    dispatch({ type: 'DELETE_PAYROLL', payload: recordId });
  };

  // Pay stubs: for a specific record
  const payStubRecord = showPayStub ? state.payroll.find(r => r.id === showPayStub) : null;
  const payStubUser = payStubRecord ? state.users.find(u => u.id === payStubRecord.userId) : null;
  const payStubShifts = payStubRecord
    ? state.shifts.filter(s => payStubRecord.shiftIds.includes(s.id))
    : [];

  if (!isOwnerOrPartner) {
    return (
      <AppShell pageTitle="Payroll">
        <div className="page-container h-full flex flex-col items-center justify-center gap-4">
          <DollarSign size={48} className="text-gray-300" />
          <p className="text-gray-500 text-lg font-medium">Payroll management is only available to owners and partners.</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={`Payroll — ${periodLabel}`}>
      <div className="page-container h-full flex flex-col gap-6">

        {/* Tab header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end flex-shrink-0">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'current' as PayrollTab, icon: Clock, label: 'Current Period' },
              { id: 'history' as PayrollTab, icon: FileText, label: 'Pay History' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'current' && (
          <>
            {/* Period navigation + summary cards */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPeriod(p => p === 'current' ? 'previous' : 'current')}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ChevronLeft size={16} />
                  {selectedPeriod === 'current' ? 'Previous' : 'Current'}
                </button>
                <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                  {periodLabel}
                </span>
                <Badge label={state.settings.payPeriod} variant="neutral" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCalculatePayroll}
                  disabled={periodShifts.length === 0}
                  variant="secondary"
                >
                  <Clock size={16} />
                  Calculate Payroll
                </Button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalHours.toFixed(1)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Gross Payroll</p>
                <p className="text-2xl font-bold text-gray-900">{formatCAD(totals.totalGross)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-600">{formatCAD(totals.totalApproved)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Employee payroll cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSummaries.map(({ user, hours, gross, record, userShifts }) => (
                <Card key={user.id} className="flex flex-col">
                  {/* Employee header */}
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

                  {/* Hours & Gross */}
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

                  {/* Shifts in period count */}
                  {userShifts.length > 0 && (
                    <p className="text-xs text-gray-400 mb-4">
                      {userShifts.length} shift{userShifts.length !== 1 ? 's' : ''} in this period
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto space-y-2">
                    {userShifts.length > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => setReviewEmployee(reviewEmployee === user.id ? null : user.id)}
                        className="w-full"
                      >
                        <Clock size={14} />
                        {reviewEmployee === user.id ? 'Hide Shifts' : 'Review Shifts'}
                      </Button>
                    )}

                    {record?.status === 'calculated' && (
                      <Button onClick={() => handleApprove(user.id)} className="w-full">
                        <CheckCircle size={14} />
                        Approve & Record
                      </Button>
                    )}

                    {record?.status === 'approved' && (
                      <Button onClick={() => handleMarkPaid(user.id)} className="w-full">
                        <Banknote size={14} />
                        Mark as Paid
                      </Button>
                    )}

                    {record?.status === 'paid' && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setShowPayStub(record.id)}
                          className="flex-1"
                        >
                          <FileText size={14} />
                          Pay Stub
                        </Button>
                        <button
                          onClick={() => handleVoidRecord(record.id)}
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

                  {/* Expandable shift review */}
                  {reviewEmployee === user.id && userShifts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Shift Breakdown</p>
                      {userShifts.map(shift => {
                        const site = state.sites.find(s => s.id === shift.siteId);
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
              ))}

              {filteredSummaries.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={UsersIcon}
                    title="No employees found"
                    description={searchQuery ? 'Try a different search term.' : 'Add employees to the Team page to manage payroll.'}
                    actionLabel={!searchQuery ? 'Go to Team' : undefined}
              onAction={!searchQuery ? () => navigate('/team') : undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ─────── Pay History Tab ─────── */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {historyPeriods.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No payroll history yet"
                description="Once you calculate and approve payroll, past periods will appear here."
              />
            ) : (
              historyPeriods.map(([label, records]) => {
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
                        const user = state.users.find(u => u.id === r.userId);
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
                                onClick={() => setShowPayStub(r.id)}
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
              })
            )}
          </div>
        )}

        {/* ─────── Pay Stub Modal ─────── */}
        <Modal isOpen={!!showPayStub} onClose={() => setShowPayStub(null)} title="Pay Stub">
          {payStubRecord && payStubUser && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
                <UserAvatar user={payStubUser} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{payStubUser.name}</h3>
                  <p className="text-sm text-gray-500">{payStubRecord.payPeriodLabel}</p>
                </div>
              </div>

              {/* Earnings summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">Hourly Rate</p>
                  <p className="text-lg font-bold text-gray-900">{formatCAD(payStubRecord.hourlyRate)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Hours</p>
                  <p className="text-lg font-bold text-gray-900">{payStubRecord.hoursWorked.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">Gross Pay</p>
                  <p className="text-lg font-bold text-green-600">{formatCAD(payStubRecord.grossAmount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                  <Badge
                    label={payStubRecord.status}
                    variant={payStubRecord.status === 'paid' ? 'success' : payStubRecord.status === 'approved' ? 'info' : 'warning'}
                  />
                </div>
              </div>

              {/* Shift breakdown */}
              {payStubShifts.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Shifts ({payStubShifts.length})</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {payStubShifts.map(shift => {
                      const site = state.sites.find(s => s.id === shift.siteId);
                      return (
                        <div key={shift.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-700">{site?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{formatDate(shift.clockInTime)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-700">{shift.durationMinutes ? `${(shift.durationMinutes / 60).toFixed(1)}h` : '—'}</p>
                            <p className="text-xs text-gray-500">
                              {shift.durationMinutes ? formatCAD((shift.durationMinutes / 60) * payStubRecord.hourlyRate) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                <span className="font-semibold text-gray-700">Total Gross Pay</span>
                <span className="text-xl font-bold text-green-600">{formatCAD(payStubRecord.grossAmount)}</span>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>Period: {formatDate(payStubRecord.periodStart)} – {formatDate(payStubRecord.periodEnd)}</p>
                {payStubRecord.approvedAt && <p>Approved: {formatDateTime(payStubRecord.approvedAt)}</p>}
                {payStubRecord.paidDate && <p>Paid: {formatDateTime(payStubRecord.paidDate)}</p>}
                <p>Created: {formatDateTime(payStubRecord.createdAt)}</p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
