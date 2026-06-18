import React, { useState, useMemo } from 'react';
import { DollarSign, Receipt, Users, Plus, Download, CheckCircle2, XCircle } from 'lucide-react';
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
import { UserAvatar } from '../components/ui/UserAvatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { formatCAD, formatDate } from '../utils/formatters';
import { calculateEmployeePay, calculateEmployeeHours, getPayPeriodDates } from '../utils/calculations';
import { generateId } from '../utils/storage';
import { exportToCSV } from '../utils/csv';
import type { Payment, Expense, PayrollRecord, PaymentMethod, ExpenseCategory } from '../types';

export function MoneyBookPage() {
  const { state, currentUser, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'revenue' | 'expenses'>('revenue');
  
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
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Site</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  };


  return (
    <AppShell pageTitle="Money Book">
      <div className="page-container h-full flex flex-col gap-6">
        
        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end flex-shrink-0">
          <div className="flex overflow-x-auto w-full md:w-auto bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'revenue', icon: DollarSign, label: 'Revenue' },
              { id: 'expenses', icon: Receipt, label: 'Expenses' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
              <Select 
                options={state.sites.map(s => ({value: s.id, label: s.name}))}
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value)}
                placeholder="All Sites"
              />
            </div>
        </div>

        {/* Content */}
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'expenses' && renderExpensesTab()}

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
    </AppShell>
  );
}
