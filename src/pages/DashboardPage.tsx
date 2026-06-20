import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Building2, Clock, CheckCircle2, Plus, Banknote, ClipboardCheck, PhoneCall, Calendar, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { formatCAD, formatDuration } from '../utils/formatters';
import { calculateSiteProfit, calculateEmployeePay } from '../utils/calculations';

export function DashboardPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Active Shifts
  const activeShifts = state.shifts.filter(s => s.status === 'active');
  const myActiveShift = activeShifts.find(s => s.userId === currentUser.id);

  // Owner/Partner calculations
  let todayRevenue = 0;
  let monthlyNetProfit = 0;
  let activeSitesCount = 0;
  let totalHoursToday = 0;

  if (isOwnerOrPartner) {
    todayRevenue = state.payments
      .filter(p => isWithinInterval(new Date(p.date), { start: todayStart, end: todayEnd }))
      .reduce((sum, p) => sum + p.amount, 0);

    const siteProfits = state.sites.map(site => 
      calculateSiteProfit(site.id, state.payments, state.shifts, state.users, state.expenses, monthStart, monthEnd)
    );
    monthlyNetProfit = siteProfits.reduce((sum, p) => sum + p.net, 0);

    activeSitesCount = state.sites.filter(s => s.status === 'active').length;

    totalHoursToday = state.shifts
      .filter(s => s.status === 'completed' && isWithinInterval(new Date(s.clockInTime), { start: todayStart, end: todayEnd }))
      .reduce((sum, s) => sum + ((s.durationMinutes || 0) / 60), 0);
  }

  // Payroll summary (owner/partner)
  const pendingPayroll = state.payroll.filter(r => r.status === 'approved' && !r.isPaid);
  const pendingPayrollTotal = pendingPayroll.reduce((s, r) => s + r.grossAmount, 0);
  const pendingApproval = state.payroll.filter(r => r.status === 'calculated');
  const pendingApprovalCount = pendingApproval.length;

  // Employee calculations
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const myHoursThisWeek = state.shifts
    .filter(s => s.userId === currentUser.id && s.status === 'completed' && isWithinInterval(new Date(s.clockInTime), { start: weekStart, end: weekEnd }))
    .reduce((sum, s) => sum + ((s.durationMinutes || 0) / 60), 0);
  const myEarningsThisWeek = myHoursThisWeek * currentUser.hourlyRate;

  const myTasks = state.tasks.filter(t => t.assignedUserId === currentUser.id && t.status !== 'done');
  const upcomingTasks = state.tasks.filter(t => t.status !== 'done').sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 5);

  const renderOwnerDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={formatCAD(todayRevenue)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-100" />
        <StatCard label="Monthly Net Profit" value={formatCAD(monthlyNetProfit)} icon={TrendingUp} iconColor="text-blue-600" iconBg="bg-blue-100" />
        <StatCard label="Active Sites" value={activeSitesCount.toString()} icon={Building2} iconColor="text-purple-600" iconBg="bg-purple-100" />
        <StatCard label="Hours Today" value={totalHoursToday.toFixed(1) + 'h'} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-100" />
      </div>

      {/* Payroll summary */}
      {(pendingPayrollTotal > 0 || pendingApprovalCount > 0) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Banknote size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payroll Summary</p>
                <p className="text-sm text-gray-600">
                  {pendingPayroll.length > 0 && <span>{pendingPayroll.length} employee{pendingPayroll.length > 1 ? 's' : ''} ready to pay · <strong>{formatCAD(pendingPayrollTotal)}</strong></span>}
                  {pendingPayroll.length > 0 && pendingApprovalCount > 0 && <span> · </span>}
                  {pendingApprovalCount > 0 && <span>{pendingApprovalCount} pending approval</span>}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/payroll')}>
              <Banknote size={16} />
              Go to Payroll
            </Button>
          </div>
        </Card>
      )}

      {/* Inspections summary */}
      {state.inspections.length > 0 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-2.5 rounded-xl">
                <ClipboardCheck size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Quality Inspections</p>
                <p className="text-sm text-gray-600">
                  {state.inspections.length} total · {state.inspections.filter(i => i.items.some(r => r.rating === 'fail')).length} with fails · {state.inspections.filter(i => i.clientSigned).length} signed off
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/inspections')}>
              <ClipboardCheck size={16} />
              View Inspections
            </Button>
          </div>
        </Card>
      )}

      {activeShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            Active Shifts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeShifts.map(shift => {
              const user = state.users.find(u => u.id === shift.userId);
              const site = state.sites.find(s => s.id === shift.siteId);
              const elapsedMs = new Date().getTime() - new Date(shift.clockInTime).getTime();
              const elapsedMins = Math.floor(elapsedMs / 60000);
              return (
                <Card key={shift.id} className="border-blue-200 bg-blue-50/50 flex items-center gap-4">
                  {user && <UserAvatar user={user} size="lg" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{site?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-blue-700">{formatDuration(elapsedMins)}</p>
                    <p className="text-xs text-gray-500">elapsed</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-green-200 bg-green-50/30">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Monthly Revenue</p>
          <p className="text-xl font-bold text-green-600">{formatCAD(monthlyRevenue)}</p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50/30">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Monthly Expenses</p>
          <p className="text-xl font-bold text-red-500">{formatCAD(monthlyExpenses)}</p>
        </Card>
        <Card className="p-4 border-blue-200 bg-blue-50/30">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Net Cash Flow</p>
          <p className={`text-xl font-bold ${monthlyRevenue - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCAD(monthlyRevenue - monthlyExpenses)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View All</Button>
          </div>
          <div className="space-y-3 flex-1">
            {upcomingTasks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No upcoming tasks.</p>
            ) : (
              upcomingTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-10 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{task.title}</p>
                      {task.dueDate && <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {format(new Date(task.dueDate), 'MMM d')}</p>}
                    </div>
                  </div>
                  {task.assignedUserId && <UserAvatar user={state.users.find(u => u.id === task.assignedUserId)} size="sm" />}
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Payments</h3>
              <div className="space-y-2">
                {recentPayments.map(p => {
                  const site = state.sites.find(s => s.id === p.siteId);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{site?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{format(parseISO(p.date), 'MMM d')}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{formatCAD(p.amount)}</span>
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/money')}>
                <ArrowRight size={14} /> View All
              </Button>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <Button variant="secondary" className="justify-start" icon={Clock} onClick={() => navigate('/clock')}>Clock In / Out</Button>
              <Button variant="secondary" className="justify-start" icon={DollarSign} onClick={() => navigate('/money')}>Add Payment</Button>
              <Button variant="secondary" className="justify-start" icon={CheckCircle2} onClick={() => navigate('/tasks')}>Add Task</Button>
              <Button variant="secondary" className="justify-start" icon={Plus} onClick={() => navigate('/money')}>New Expense</Button>
              <Button variant="secondary" className="justify-start" icon={Banknote} onClick={() => navigate('/payroll')}>Process Payroll</Button>
              {currentUser.role === 'owner' && (
                <Button variant="secondary" className="justify-start" icon={PhoneCall} onClick={() => navigate('/leads')}>View Leads</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // ─── Employee: Today's assigned sites ──────────────────────
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const todayDayName = dayNames[today.getDay()] as string;
  const mySitesToday = state.sites.filter(s =>
    s.assignedUserIds.includes(currentUser.id) &&
    s.status === 'active' &&
    s.cleaningDays.some(d => d.toLowerCase() === todayDayName)
  );

  // Check if I already clocked in at each site today
  const myShiftsToday = state.shifts.filter(s =>
    s.userId === currentUser.id &&
    isSameDay(parseISO(s.clockInTime), today)
  );

  // ─── Owner: Monthly expenses ───────────────────────────────
  const monthlyExpenses = isOwnerOrPartner ? state.expenses
    .filter(e => isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd }))
    .reduce((sum, e) => sum + e.amount, 0) : 0;

  const monthlyRevenue = isOwnerOrPartner ? state.payments
    .filter(p => isWithinInterval(new Date(p.date), { start: monthStart, end: monthEnd }))
    .reduce((sum, p) => sum + p.amount, 0) : 0;

  // ─── Owner: Recent payments ────────────────────────────────
  const recentPayments = [...state.payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const renderEmployeeDashboard = () => (
    <div className="space-y-6">
      <Card className={`p-6 sm:p-8 text-center border-2 ${myActiveShift ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Clock size={32} className={myActiveShift ? "text-blue-600" : "text-gray-400"} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {myActiveShift ? 'Currently Clocked In' : 'Ready to work?'}
        </h2>
        {myActiveShift ? (
          <p className="text-gray-600 mb-6">You are clocked in at {state.sites.find(s => s.id === myActiveShift.siteId)?.name}</p>
        ) : (
          <p className="text-gray-500 mb-6">Select a site and take a photo to start your shift.</p>
        )}
        <Button size="lg" className="w-full sm:w-auto px-8" onClick={() => navigate('/clock')}>
          {myActiveShift ? 'View Shift' : 'Clock In Now'}
        </Button>
      </Card>

      {/* Today's Schedule */}
      {mySitesToday.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" /> Today's Schedule
          </h3>
          <div className="space-y-3">
            {mySitesToday.map(site => {
              const clockedIn = myShiftsToday.some(s => s.siteId === site.id && s.status === 'active');
              const completed = myShiftsToday.some(s => s.siteId === site.id && s.status === 'completed');
              return (
                <div key={site.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${completed ? 'bg-green-500' : clockedIn ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{site.name}</p>
                    <p className="text-xs text-gray-500">{site.scheduleStart} - {site.scheduleEnd} · {site.address}</p>
                  </div>
                  <Badge label={completed ? 'Done' : clockedIn ? 'Active' : 'Due'} variant={completed ? 'success' : clockedIn ? 'info' : 'neutral'} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="My Hours This Week" value={myHoursThisWeek.toFixed(1) + 'h'} icon={Clock} />
        <StatCard label="Estimated Earnings" value={formatCAD(myEarningsThisWeek)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-100" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-600"/> My Tasks
          </h3>
          <div className="flex items-center gap-2">
            <Badge label={`${myTasks.length} pending`} variant="info" />
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View All</Button>
          </div>
        </div>
        <div className="space-y-2">
          {myTasks.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">You're all caught up!</p>
          ) : (
            myTasks.map(task => (
              <div key={task.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => {
                      dispatch({
                        type: 'UPDATE_TASK',
                        payload: { ...task, status: 'done', completedAt: new Date().toISOString() }
                      });
                    }}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
                    title="Mark as done"
                  >
                    <CheckCircle2 size={14} className="opacity-0 hover:opacity-100 text-green-500" />
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900">{task.title}</p>
                    {task.siteId && <p className="text-xs text-gray-500 mt-0.5">{state.sites.find(s => s.id === task.siteId)?.name}</p>}
                  </div>
                </div>
                <Badge label={task.priority} variant={task.priority === 'urgent' ? 'danger' : 'neutral'} />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <AppShell pageTitle="Dashboard">
      <div className="page-container">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {currentUser.name.split(' ')[0]}</h1>
          <p className="text-gray-500 mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {isOwnerOrPartner ? renderOwnerDashboard() : renderEmployeeDashboard()}
      </div>
    </AppShell>
  );
}
