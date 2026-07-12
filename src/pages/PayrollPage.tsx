import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Users as UsersIcon, Clock,
  ChevronLeft, Search,
  FileText,
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { EmployeePayCard } from '../components/payroll/EmployeePayCard';
import { PayHistory } from '../components/payroll/PayHistory';
import { PayStubModal } from '../components/payroll/PayStubModal';
import { usePayroll } from '../hooks/usePayroll';
import { formatCAD } from '../utils/formatters';
export function PayrollPage() {
  const {
    state, currentUser,
    activeTab, setActiveTab,
    selectedPeriod, setSelectedPeriod,
    reviewEmployee, setReviewEmployee,
    showPayStub, setShowPayStub,
    searchQuery, setSearchQuery,
    isOwnerOrPartner,
    periodLabel, employees, periodShifts,
    filteredSummaries, totals, historyPeriods,
    handleCalculatePayroll, handleApprove, handleMarkPaid, handleVoidRecord,
    payStubRecord, payStubUser, payStubShifts,
  } = usePayroll();

  const navigate = useNavigate();

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
    <AppShell pageTitle={`Payroll \u2014 ${periodLabel}`}>
      <div className="page-container h-full flex flex-col gap-6">

        {/* Tab header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end flex-shrink-0">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'current' as const, icon: Clock, label: 'Current Period' },
              { id: 'history' as const, icon: FileText, label: 'Pay History' },
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

        {/* Pay History Tab */}
        {activeTab === 'history' && (
          <PayHistory
            historyPeriods={historyPeriods}
            users={state.users}
            onShowPayStub={setShowPayStub}
          />
        )}

        {/* Pay Stub Modal */}
        <PayStubModal
          record={payStubRecord}
          user={payStubUser}
          shifts={payStubShifts}
          sites={state.sites}
          onClose={() => setShowPayStub(null)}
        />
      </div>
    </AppShell>
  );
}
