import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Receipt, Users, AlertTriangle } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, isWithinInterval, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { calculateSiteProfit } from '../utils/calculations';
import { formatCAD } from '../utils/formatters';

export function AnalyticsPage() {
  const { state, currentUser } = useApp();
  
  const [period, setPeriod] = useState<'week'|'month'|'lastMonth'|'year'|'custom'>('month');
  const [customStart, setCustomStart] = useState(() => startOfMonth(new Date()).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(() => endOfMonth(new Date()).toISOString().split('T')[0]);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom': return { start: new Date(customStart), end: new Date(customEnd) };
    }
  }, [period, customStart, customEnd]);

  // Aggregate Data
  const siteProfits = useMemo(() => {
    return state.sites.map(site => {
      const stats = calculateSiteProfit(site.id, state.payments, state.shifts, state.users, state.expenses, dateRange.start, dateRange.end);
      return { site, ...stats };
    }).sort((a, b) => b.net - a.net);
  }, [state, dateRange]);

  const totalRevenue = siteProfits.reduce((sum, s) => sum + s.revenue, 0);
  const totalLabour = siteProfits.reduce((sum, s) => sum + s.labourCost, 0);
  // Add general expenses not linked to a specific site
  const generalExpenses = state.expenses
    .filter(e => !e.siteId && isWithinInterval(new Date(e.date), dateRange))
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = siteProfits.reduce((sum, s) => sum + s.expenses, 0) + generalExpenses;
  const netProfit = totalRevenue - totalLabour - totalExpenses;
  const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Chart Data preparation (Daily for week/month, Weekly/Monthly for larger periods)
  const chartData = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayRev = state.payments.filter(p => isWithinInterval(new Date(p.date), {start: dayStart, end: dayEnd})).reduce((sum, p) => sum + p.amount, 0);
      const dayExp = state.expenses.filter(e => isWithinInterval(new Date(e.date), {start: dayStart, end: dayEnd})).reduce((sum, e) => sum + e.amount, 0);
      // Rough labour estimation by clock-in day
      const dayLab = state.shifts.filter(s => s.status === 'completed' && isWithinInterval(new Date(s.clockInTime), {start: dayStart, end: dayEnd}))
        .reduce((sum, s) => {
          const u = state.users.find(x => x.id === s.userId);
          return sum + ((s.durationMinutes||0)/60)*(u?.hourlyRate||0);
        }, 0);

      return {
        date: format(day, 'MMM d'),
        Revenue: dayRev,
        Costs: dayExp + dayLab,
        Profit: dayRev - dayExp - dayLab
      };
    });
  }, [state, dateRange]);

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'partner')) return null;

  return (
    <AppShell pageTitle="Analytics">
      <div className="page-container flex flex-col gap-6">

        {/* Header & Period Selector */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex overflow-x-auto w-full lg:w-auto bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'week' as const, label: 'This Week' },
              { id: 'month' as const, label: 'This Month' },
              { id: 'lastMonth' as const, label: 'Last Month' },
              { id: 'year' as const, label: 'This Year' },
              { id: 'custom' as const, label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <DateRangePicker startDate={customStart} endDate={customEnd} onStartChange={setCustomStart} onEndChange={setCustomEnd} />
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={formatCAD(totalRevenue)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard label="Total Labour Cost" value={formatCAD(totalLabour)} icon={Users} iconColor="text-red-600" iconBg="bg-red-100" />
          <StatCard label="Other Expenses" value={formatCAD(totalExpenses)} icon={Receipt} iconColor="text-amber-600" iconBg="bg-amber-100" />
          <StatCard label="Net Profit" value={formatCAD(netProfit)} icon={TrendingUp} trend={overallMargin >= 0 ? 'up' : 'down'} trendValue={`${overallMargin.toFixed(1)}% margin`} iconColor="text-blue-600" iconBg="bg-blue-100" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-96 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <Tooltip formatter={(value: number) => formatCAD(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="Profit" stroke="#1d4ed8" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="h-96 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Costs</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <Tooltip formatter={(value: number) => formatCAD(value)} cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Revenue" fill="#15803d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Costs" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Site Breakdown Table */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-semibold text-gray-900">Site Performance</h3>
          </div>

          {/* Mobile View - Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {siteProfits.map((s, idx) => (
              <div key={s.site.id} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  {idx < 3 && s.net > 0 && <span title={`#${idx+1} Most Profitable`}>🏆</span>}
                  {s.net < 0 && <AlertTriangle size={16} className="text-red-500" />}
                  <p className="font-semibold text-gray-900">{s.site.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Revenue:</span> <span className="font-medium text-green-600">{formatCAD(s.revenue)}</span></div>
                  <div><span className="text-gray-500">Labour:</span> <span className="font-medium text-amber-600">{formatCAD(s.labourCost)}</span></div>
                  <div><span className="text-gray-500">Expenses:</span> <span className="font-medium text-red-500">{formatCAD(s.expenses)}</span></div>
                  <div>
                    <span className="text-gray-500">Net:</span>{' '}
                    <span className={`font-bold ${s.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCAD(s.net)}</span>
                  </div>
                </div>
                <Badge label={`${s.margin.toFixed(1)}% margin`} variant={s.margin >= 40 ? 'success' : s.margin >= 20 ? 'warning' : 'danger'} />
              </div>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-500 uppercase">Site</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-right">Revenue</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-right">Labour</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-right">Expenses</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-right">Net Profit</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {siteProfits.map((s, idx) => (
                  <tr key={s.site.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900 flex items-center gap-2">
                      {idx < 3 && s.net > 0 && <span title={`#${idx+1} Most Profitable`}>🏆</span>}
                      {s.net < 0 && <span title="Operating at a loss"><AlertTriangle size={16} className="text-red-500" /></span>}
                      {s.site.name}
                    </td>
                    <td className="p-4 text-right">{formatCAD(s.revenue)}</td>
                    <td className="p-4 text-right text-gray-500">{formatCAD(s.labourCost)}</td>
                    <td className="p-4 text-right text-gray-500">{formatCAD(s.expenses)}</td>
                    <td className="p-4 text-right font-semibold text-gray-900">{formatCAD(s.net)}</td>
                    <td className="p-4">
                      <Badge label={`${s.margin.toFixed(1)}%`} variant={s.margin >= 40 ? 'success' : s.margin >= 20 ? 'warning' : 'danger'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </AppShell>
  );
}
