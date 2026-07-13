import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getPayPeriodDates, calculateEmployeeHours, calculateEmployeePay } from '../utils/calculations';
import { generateId } from '../utils/storage';
import { NOTIFICATION_CONTENT } from '../types/notification';
import { showNotification } from '../services/notificationService';
import app, { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { PayrollRecord, PayPeriod } from '../types';

export type PayrollTab = 'current' | 'history';

export function usePayroll() {
  const { state, currentUser, dispatch } = useApp();

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
  const handleCalculatePayroll = async () => {
    let createdCount = 0;
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
      createdCount++;
    }

    const pendingCount = state.payroll.filter(r => r.status === 'calculated' && !r.isPaid).length + createdCount;
    if (pendingCount > 0) {
      const notificationId = generateId();
      const content = NOTIFICATION_CONTENT.payroll_pending({ count: pendingCount });
      await setDoc(doc(db, 'notifications', notificationId), {
        id: notificationId,
        type: 'payroll_pending',
        title: content.title,
        body: content.body,
        link: content.link,
        read: false,
        createdAt: new Date().toISOString(),
        userId: getAuth(app).currentUser?.uid || '',
      });
      showNotification(content.title, content.body, content.link);
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

  // Pay stub data
  const payStubRecord = showPayStub ? state.payroll.find(r => r.id === showPayStub) : null;
  const payStubUser = payStubRecord ? state.users.find(u => u.id === payStubRecord.userId) : null;
  const payStubShifts = payStubRecord
    ? state.shifts.filter(s => payStubRecord.shiftIds.includes(s.id))
    : [];

  return {
    state, currentUser, dispatch,
    activeTab, setActiveTab,
    selectedPeriod, setSelectedPeriod,
    reviewEmployee, setReviewEmployee,
    showPayStub, setShowPayStub,
    searchQuery, setSearchQuery,
    isOwnerOrPartner,
    periodDates, periodLabel,
    employees, periodShifts, existingRecords,
    employeeSummaries, filteredSummaries,
    totals, historyPeriods,
    handleCalculatePayroll, handleApprove, handleMarkPaid, handleVoidRecord,
    payStubRecord, payStubUser, payStubShifts,
  };
}
