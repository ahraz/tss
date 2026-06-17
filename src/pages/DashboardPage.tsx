import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Building2, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { formatCAD, formatRelativeTime, formatDuration } from '../utils/formatters';
import { calculateSiteProfit, calculateEmployeePay } from '../utils/calculations';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

export function DashboardPage() {
  const { state, currentUser } = useApp();
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

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" className="justify-start" icon={Clock} onClick={() => navigate('/clock')}>Clock In / Out</Button>
            <Button variant="secondary" className="justify-start" icon={DollarSign} onClick={() => navigate('/money')}>Add Payment</Button>
            <Button variant="secondary" className="justify-start" icon={CheckCircle2} onClick={() => navigate('/tasks')}>Add Task</Button>
            <Button variant="secondary" className="justify-start" icon={Plus} onClick={() => navigate('/money')}>New Expense</Button>
          </div>
        </Card>
      </div>
    </div>
  );

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="My Hours This Week" value={myHoursThisWeek.toFixed(1) + 'h'} icon={Clock} />
        <StatCard label="Estimated Earnings" value={formatCAD(myEarningsThisWeek)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-100" />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-600"/> My Tasks
          </h3>
          <Badge label={`${myTasks.length} pending`} variant="info" />
        </div>
        <div className="space-y-2">
          {myTasks.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">You're all caught up!</p>
          ) : (
            myTasks.map(task => (
              <div key={task.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{task.title}</p>
                    {task.siteId && <p className="text-xs text-gray-500 mt-0.5">{state.sites.find(s => s.id === task.siteId)?.name}</p>}
                  </div>
                  <Badge label={task.priority} variant={task.priority === 'urgent' ? 'danger' : 'neutral'} />
                </div>
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
