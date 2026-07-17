import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Receipt, Users as UsersIcon, Banknote,
  Plus, CheckCircle2, XCircle, Edit3, Trash2,
  Clock, ChevronLeft, Search, FileText,
} from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { formatCAD, formatDate } from '../utils/formatters';

import { generateId } from '../utils/storage';
import { EmployeePayCard } from '../components/payroll/EmployeePayCard';
import { PayHistory } from '../components/payroll/PayHistory';
import { PayStubModal } from '../components/payroll/PayStubModal';
import { usePayroll } from '../hooks/usePayroll';
import type {
  Payment, Expense,
  PaymentMethod, ExpenseCategory,
} from '../types';

type FinanceTab = 'revenue' | 'expenses' | 'profit' | 'payroll';

export function MoneyBookPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FinanceTab>('revenue');

  // ── Payroll hook ──────────────────────────────────────────
  const [payrollSubTab, setPayrollSubTab] = useState<'current' | 'history'>('current');
  const payroll = usePayroll();
  const {
    selectedPeriod, setSelectedPeriod,
    reviewEmployee, setReviewEmployee,
    setShowPayStub,
    searchQuery, setSearchQuery,
    periodLabel, employees, periodShifts,
    filteredSummaries, totals, historyPeriods,
    handleCalculatePayroll, handleApprove, handleMarkPaid, handleVoidRecord,
    payStubRecord, payStubUser, payStubShifts,
  } = payroll;
  
  // Filters
  const [startDate, setStartDate] = useState(() => startOfMonth(new Date()).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => endOfMonth(new Date()).toISOString().split('T')[0]);
  const [siteFilter, setSiteFilter] = useState('');
  
  // Add Modals
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [paymentFormData, setPaymentFormData] = useState<Partial<Payment>>({
    siteId: '', amount: 0, date: new Date().toISOString().split('T')[0], method: 'etransfer', forPeriod: '', isPaid: false, notes: ''
  });
  
  const [expenseFormData, setExpenseFormData] = useState<Partial<Expense>>({
    description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'supplies', siteId: '', notes: ''
  });

  // Edit/Delete State
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editPaymentFormData, setEditPaymentFormData] = useState<Partial<Payment>>({});
  const [editExpenseFormData, setEditExpenseFormData] = useState<Partial<Expense>>({});
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'partner')) return null;

  const handleTogglePaid = (payment: Payment) => {
    dispatch({ type: 'UPDATE_PAYMENT', payload: { ...payment, isPaid: !payment.isPaid } });
  };

  const handleAddPayment = () => {
    const newPayment: Payment = {
      ...paymentFormData as Payment,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_PAYMENT', payload: newPayment });
    setShowAddPayment(false);
    setPaymentFormData({ siteId: '', amount: 0, date: new Date().toISOString().split('T')[0], method: 'etransfer', forPeriod: '', isPaid: false, notes: '' });
  };

  const handleAddExpense = () => {
    const newExpense: Expense = {
      ...expenseFormData as Expense,
      id: generateId(),
      receiptPhotoDataUrl: null,
      siteId: expenseFormData.siteId || null,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
    setShowAddExpense(false);
    setExpenseFormData({ description: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'supplies', siteId: '', notes: '' });
  };

  const openEditPayment = (p: Payment) => {
    setEditPayment(p);
    setEditPaymentFormData(p);
  };

  const handleUpdatePayment = () => {
    if (!editPayment) return;
    dispatch({ type: 'UPDATE_PAYMENT', payload: { ...editPaymentFormData, id: editPayment.id } as Payment });
    setEditPayment(null);
  };

  const handleDeletePayment = () => {
    if (deletePaymentId) {
      dispatch({ type: 'DELETE_PAYMENT', payload: deletePaymentId });
      setDeletePaymentId(null);
    }
  };

  const openEditExpense = (e: Expense) => {
    setEditExpense(e);
    setEditExpenseFormData(e);
  };

  const handleUpdateExpense = () => {
    if (!editExpense) return;
    dispatch({ type: 'UPDATE_EXPENSE', payload: { ...editExpenseFormData, id: editExpense.id } as Expense });
    setEditExpense(null);
  };

  const handleDeleteExpense = () => {
    if (deleteExpenseId) {
      dispatch({ type: 'DELETE_EXPENSE', payload: deleteExpenseId });
      setDeleteExpenseId(null);
    }
  };

  const renderRevenueTab = () => {
    const filteredPayments = state.payments.filter(p => {
      const pDate = new Date(p.date);
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      if (!isWithinInterval(pDate, { start, end })) return false;
      if (siteFilter && p.siteId !== siteFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    return (
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-end">
          <div className="text-2xl font-bold text-gray-900">{formatCAD(totalRevenue)}</div>
          <Button icon={Plus} onClick={() => setShowAddPayment(true)}>Add Payment</Button>
        </div>

        <Card className="flex-1 p-0 overflow-hidden flex flex-col">
          {filteredPayments.length === 0 ? (
            <EmptyState icon={DollarSign} title="No payments found" description="Adjust your filters or add a new payment." />
          ) : (
            <>
              {/* Mobile View - Card List */}
              <div className="md:hidden flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredPayments.map(p => {
                  const site = state.sites.find(s => s.id === p.siteId);
                  return (
                    <div key={p.id} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{site?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{formatDate(p.date)}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatCAD(p.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge label={p.method} />
                        <button onClick={() => handleTogglePaid(p)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.isPaid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {p.isPaid ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                          {p.isPaid ? 'Paid' : 'Unpaid'}
                        </button>
                      </div>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditPayment(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => setDeletePaymentId(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden lg:block overflow-x-auto flex-1">
                <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Site</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-900 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="p-4 text-sm font-medium text-gray-900">{state.sites.find(s => s.id === p.siteId)?.name}</td>
                      <td className="p-4 text-sm font-semibold text-gray-900">{formatCAD(p.amount)}</td>
                      <td className="p-4"><Badge label={p.method} /></td>
                      <td className="p-4">
                        <button onClick={() => handleTogglePaid(p)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.isPaid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {p.isPaid ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                          {p.isPaid ? 'Paid' : 'Unpaid'}
                        </button>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditPayment(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => setDeletePaymentId(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  const renderExpensesTab = () => {
    const filteredExpenses = state.expenses.filter(e => {
      const eDate = new Date(e.date);
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      if (!isWithinInterval(eDate, { start, end })) return false;
      if (siteFilter && e.siteId !== siteFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-end">
          <div className="text-2xl font-bold text-gray-900">{formatCAD(totalExpenses)}</div>
          <Button icon={Plus} onClick={() => setShowAddExpense(true)}>Add Expense</Button>
        </div>

        <Card className="flex-1 p-0 overflow-hidden flex flex-col">
          {filteredExpenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses found" description="Adjust your filters or add a new expense." />
          ) : (
            <>
              {/* Mobile View - Card List */}
              <div className="md:hidden flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredExpenses.map(e => {
                  const site = state.sites.find(s => s.id === e.siteId);
                  return (
                    <div key={e.id} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{e.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(e.date)}</p>
                        </div>
                        <p className="text-sm font-bold text-red-600">{formatCAD(e.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge label={e.category} variant="neutral" />
                        {site && <span className="text-xs text-gray-500">{site.name}</span>}
                      </div>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditExpense(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => setDeleteExpenseId(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden lg:block overflow-x-auto flex-1">
                <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-900 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-900">{e.description}</p>
                        {e.siteId && <p className="text-xs text-gray-500">{state.sites.find(s => s.id === e.siteId)?.name}</p>}
                      </td>
                      <td className="p-4"><Badge label={e.category} variant="neutral" /></td>
                      <td className="p-4 text-sm font-semibold text-red-600">{formatCAD(e.amount)}</td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditExpense(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => setDeleteExpenseId(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  const renderProfitTab = () => {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    
    const siteProfits = state.sites.map(site => {
      const payments = state.payments
        .filter(p => p.siteId === site.id && isWithinInterval(new Date(p.date), { start, end }))
        .reduce((sum, p) => sum + p.amount, 0);
      const expenses = state.expenses
        .filter(e => e.siteId === site.id && isWithinInterval(new Date(e.date), { start, end }))
        .reduce((sum, e) => sum + e.amount, 0);
      const shiftCosts = state.shifts
        .filter(s => s.siteId === site.id && s.status === 'completed' && isWithinInterval(new Date(s.clockInTime), { start, end }))
        .reduce((sum, s) => {
          const user = state.users.find(u => u.id === s.userId);
          return sum + ((s.durationMinutes || 0) / 60) * (user?.hourlyRate || 0);
        }, 0);
      const totalCosts = expenses + shiftCosts;
      return { site, revenue: payments, expenses, labour: shiftCosts, net: payments - totalCosts };
    }).sort((a, b) => b.net - a.net);

    const totalRevenue = siteProfits.reduce((s, p) => s + p.revenue, 0);
    const totalExpenses = siteProfits.reduce((s, p) => s + p.expenses, 0);
    const totalLabour = siteProfits.reduce((s, p) => s + p.labour, 0);
    const totalNet = siteProfits.reduce((s, p) => s + p.net, 0);

    if (siteProfits.length === 0) {
      return <EmptyState icon={DollarSign} title="No data" description="Add sites to see profitability." />;
    }

    return (
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-green-200 bg-green-50/30">
            <p className="text-xs text-gray-500 uppercase font-medium">Revenue</p>
            <p className="text-xl font-bold text-green-600">{formatCAD(totalRevenue)}</p>
          </Card>
          <Card className="p-4 border-red-200 bg-red-50/30">
            <p className="text-xs text-gray-500 uppercase font-medium">Expenses</p>
            <p className="text-xl font-bold text-red-500">{formatCAD(totalExpenses)}</p>
          </Card>
          <Card className="p-4 border-amber-200 bg-amber-50/30">
            <p className="text-xs text-gray-500 uppercase font-medium">Labour</p>
            <p className="text-xl font-bold text-amber-600">{formatCAD(totalLabour)}</p>
          </Card>
          <Card className="p-4 border-blue-200 bg-blue-50/30">
            <p className="text-xs text-gray-500 uppercase font-medium">Net Profit</p>
            <p className={`text-xl font-bold ${totalNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCAD(totalNet)}</p>
          </Card>
        </div>

        {/* Per-site breakdown */}
        <Card className="flex-1 p-0 overflow-hidden flex flex-col">
          {/* Mobile View - Card List */}
          <div className="md:hidden flex-1 overflow-y-auto divide-y divide-gray-100">
            {siteProfits.map(({ site, revenue, expenses, labour, net }) => {
              const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(0) : '—';
              return (
                <div key={site.id} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-semibold text-gray-900">{site.name}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Revenue:</span> <span className="font-medium text-green-600">{formatCAD(revenue)}</span></div>
                    <div><span className="text-gray-500">Labour:</span> <span className="font-medium text-amber-600">{formatCAD(labour)}</span></div>
                    <div><span className="text-gray-500">Expenses:</span> <span className="font-medium text-red-500">{formatCAD(expenses)}</span></div>
                    <div>
                      <span className="text-gray-500">Net:</span>{' '}
                      <span className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCAD(net)}</span>
                    </div>
                  </div>
                  <div>
                    <Badge
                      label={margin === '—' ? '—' : `${margin}% margin`}
                      variant={margin === '—' ? 'neutral' : parseInt(margin) >= 20 ? 'success' : parseInt(margin) >= 0 ? 'warning' : 'danger'}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden lg:block overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Site</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Expenses</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Labour</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Net</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {siteProfits.map(({ site, revenue, expenses, labour, net }) => {
                  const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(0) : '—';
                  return (
                    <tr key={site.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium text-sm text-gray-900">{site.name}</p>
                      </td>
                      <td className="p-4 text-sm text-green-600 font-medium">{formatCAD(revenue)}</td>
                      <td className="p-4 text-sm text-red-500 font-medium">{formatCAD(expenses)}</td>
                      <td className="p-4 text-sm text-amber-600 font-medium">{formatCAD(labour)}</td>
                      <td className="p-4">
                        <span className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCAD(net)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge
                          label={margin === '—' ? '—' : `${margin}%`}
                          variant={margin === '—' ? 'neutral' : parseInt(margin) >= 20 ? 'success' : parseInt(margin) >= 0 ? 'warning' : 'danger'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderPayrollTab = () => (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      {/* Sub-tabs: Current Period / Pay History */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'current' as const, icon: Clock, label: 'Current Period' },
          { id: 'history' as const, icon: FileText, label: 'Pay History' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setPayrollSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              payrollSubTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {payrollSubTab === 'current' && (
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
            <Button onClick={handleCalculatePayroll} disabled={periodShifts.length === 0} variant="secondary">
              <Clock size={16} />
              Calculate Payroll
            </Button>
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
              placeholder="Search employees\u2026"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Employee payroll cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map(({ user, hours, gross, record, userShifts }) => (
              <EmployeePayCard
                key={user.id}
                user={user}
                hours={hours}
                gross={gross}
                record={record}
                userShifts={userShifts}
                sites={state.sites}
                reviewEmployee={reviewEmployee}
                onReviewToggle={userId => setReviewEmployee(reviewEmployee === userId ? null : userId)}
                onApprove={handleApprove}
                onMarkPaid={handleMarkPaid}
                onShowPayStub={setShowPayStub}
                onVoidRecord={handleVoidRecord}
              />
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

      {payrollSubTab === 'history' && (
        <PayHistory
          historyPeriods={historyPeriods}
          users={state.users}
          onShowPayStub={setShowPayStub}
        />
      )}

      {/* Pay Stub Modal (rendered at top level) */}
      <PayStubModal
        record={payStubRecord}
        user={payStubUser}
        shifts={payStubShifts}
        sites={state.sites}
        onClose={() => setShowPayStub(null)}
      />
    </div>
  );

  return (
    <AppShell pageTitle="Finance">
      <div className="page-container h-full flex flex-col gap-6">
        
        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end flex-shrink-0">
          <div className="flex overflow-x-auto w-full md:w-auto bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'revenue', icon: DollarSign, label: 'Revenue' },
              { id: 'expenses', icon: Receipt, label: 'Expenses' },
              { id: 'profit', icon: UsersIcon, label: 'Profit by Site' },
              { id: 'payroll', icon: Banknote, label: 'Payroll' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FinanceTab)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== 'payroll' && (
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
              <Select 
                options={state.sites.map(s => ({value: s.id, label: s.name}))}
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value)}
                placeholder="All Sites"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'expenses' && renderExpensesTab()}
        {activeTab === 'profit' && renderProfitTab()}
        {activeTab === 'payroll' && renderPayrollTab()}

      </div>

      <Modal isOpen={showAddPayment} onClose={() => setShowAddPayment(false)} title="Add Payment" size="md">
        <div className="space-y-4">
          <Select label="Site" options={state.sites.map(s => ({value: s.id, label: s.name}))} value={paymentFormData.siteId || ''} onChange={e => setPaymentFormData({...paymentFormData, siteId: e.target.value})} placeholder="Select a site" />
          <Input label="Amount (CAD)" type="number" value={paymentFormData.amount || ''} onChange={e => setPaymentFormData({...paymentFormData, amount: Number(e.target.value)})} />
          <Input label="Date" type="date" value={paymentFormData.date || ''} onChange={e => setPaymentFormData({...paymentFormData, date: e.target.value})} />
          <Select label="Method" options={[{value:'etransfer',label:'E-Transfer'},{value:'cheque',label:'Cheque'},{value:'cash',label:'Cash'},{value:'other',label:'Other'}]} value={paymentFormData.method || ''} onChange={e => setPaymentFormData({...paymentFormData, method: e.target.value as PaymentMethod})} />
          <Input label="For Period" value={paymentFormData.forPeriod || ''} onChange={e => setPaymentFormData({...paymentFormData, forPeriod: e.target.value})} placeholder="e.g. Week of Oct 10" />
          <Textarea label="Notes" value={paymentFormData.notes || ''} onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})} />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={paymentFormData.isPaid || false} onChange={e => setPaymentFormData({...paymentFormData, isPaid: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5" />
            <span className="text-sm font-medium text-gray-700">Payment Received</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddPayment(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={!paymentFormData.siteId || !paymentFormData.amount}>Add Payment</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense" size="md">
        <div className="space-y-4">
          <Input label="Description" value={expenseFormData.description || ''} onChange={e => setExpenseFormData({...expenseFormData, description: e.target.value})} />
          <Input label="Amount (CAD)" type="number" value={expenseFormData.amount || ''} onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})} />
          <Input label="Date" type="date" value={expenseFormData.date || ''} onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})} />
          <Select label="Category" options={[{value:'supplies',label:'Supplies'},{value:'fuel',label:'Fuel'},{value:'equipment',label:'Equipment'},{value:'insurance',label:'Insurance'},{value:'other',label:'Other'}]} value={expenseFormData.category || ''} onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value as ExpenseCategory})} />
          <Select label="Linked Site (Optional)" options={state.sites.map(s => ({value: s.id, label: s.name}))} value={expenseFormData.siteId || ''} onChange={e => setExpenseFormData({...expenseFormData, siteId: e.target.value})} placeholder="None" />
          <Textarea label="Notes" value={expenseFormData.notes || ''} onChange={e => setExpenseFormData({...expenseFormData, notes: e.target.value})} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddExpense(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={!expenseFormData.description || !expenseFormData.amount}>Add Expense</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Payment" size="md">
        <div className="space-y-4">
          <Select label="Site" options={state.sites.map(s => ({value: s.id, label: s.name}))} value={editPaymentFormData.siteId || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, siteId: e.target.value})} placeholder="Select a site" />
          <Input label="Amount (CAD)" type="number" value={editPaymentFormData.amount || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, amount: Number(e.target.value)})} />
          <Input label="Date" type="date" value={editPaymentFormData.date || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, date: e.target.value})} />
          <Select label="Method" options={[{value:'etransfer',label:'E-Transfer'},{value:'cheque',label:'Cheque'},{value:'cash',label:'Cash'},{value:'other',label:'Other'}]} value={editPaymentFormData.method || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, method: e.target.value as PaymentMethod})} />
          <Input label="For Period" value={editPaymentFormData.forPeriod || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, forPeriod: e.target.value})} placeholder="e.g. Week of Oct 10" />
          <Textarea label="Notes" value={editPaymentFormData.notes || ''} onChange={e => setEditPaymentFormData({...editPaymentFormData, notes: e.target.value})} />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={editPaymentFormData.isPaid || false} onChange={e => setEditPaymentFormData({...editPaymentFormData, isPaid: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5" />
            <span className="text-sm font-medium text-gray-700">Payment Received</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setEditPayment(null)}>Cancel</Button>
            <Button onClick={handleUpdatePayment} disabled={!editPaymentFormData.siteId || !editPaymentFormData.amount}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense" size="md">
        <div className="space-y-4">
          <Input label="Description" value={editExpenseFormData.description || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, description: e.target.value})} />
          <Input label="Amount (CAD)" type="number" value={editExpenseFormData.amount || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, amount: Number(e.target.value)})} />
          <Input label="Date" type="date" value={editExpenseFormData.date || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, date: e.target.value})} />
          <Select label="Category" options={[{value:'supplies',label:'Supplies'},{value:'fuel',label:'Fuel'},{value:'equipment',label:'Equipment'},{value:'insurance',label:'Insurance'},{value:'other',label:'Other'}]} value={editExpenseFormData.category || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, category: e.target.value as ExpenseCategory})} />
          <Select label="Linked Site (Optional)" options={state.sites.map(s => ({value: s.id, label: s.name}))} value={editExpenseFormData.siteId || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, siteId: e.target.value})} placeholder="None" />
          <Textarea label="Notes" value={editExpenseFormData.notes || ''} onChange={e => setEditExpenseFormData({...editExpenseFormData, notes: e.target.value})} />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setEditExpense(null)}>Cancel</Button>
            <Button onClick={handleUpdateExpense} disabled={!editExpenseFormData.description || !editExpenseFormData.amount}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modals */}
      <ConfirmModal
        isOpen={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmLabel="Delete"
      />
      <ConfirmModal
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmLabel="Delete"
      />
    </AppShell>
  );
}
