import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Building2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatTime } from '../utils/formatters';
import type { DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SHORT_DAYS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function SchedulePage() {
  const { state, currentUser } = useApp();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay();
    const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex];
  });

  if (!currentUser) return null;
  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  // All sites scheduled for the selected day
  const daySites = useMemo(() => {
    return state.sites
      .filter(s => s.status === 'active' && s.cleaningDays.includes(selectedDay))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.sites, selectedDay]);

  // Get today's shifts
  const todayShifts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.shifts.filter(s => s.clockInTime?.startsWith(today)).sort(
      (a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime()
    );
  }, [state.shifts]);

  const getAssignedNames = (userIds: string[]) => {
    return userIds.map(id => state.users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  const dayTotals = useMemo(() => {
    return {
      sites: daySites.length,
      revenue: daySites.reduce((sum, s) => sum + s.contractRate, 0),
      employees: new Set(daySites.flatMap(s => s.assignedUserIds)).size,
    };
  }, [daySites]);

  return (
    <AppShell pageTitle="Schedule">
      <div className="page-container flex flex-col gap-6">
        {/* Day Selector */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const idx = DAYS.indexOf(selectedDay);
                setSelectedDay(DAYS[(idx - 1 + 7) % 7]);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-1 overflow-x-auto">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    day === selectedDay
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="hidden md:inline capitalize">{day}</span>
                  <span className="md:hidden">{SHORT_DAYS[day]}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const idx = DAYS.indexOf(selectedDay);
                setSelectedDay(DAYS[(idx + 1) % 7]);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </Card>

        {/* Day Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-blue-600">{dayTotals.sites}</p>
            <p className="text-xs text-gray-500 mt-1">Sites Today</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-green-600">${dayTotals.revenue}</p>
            <p className="text-xs text-gray-500 mt-1">Daily Revenue</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-purple-600">{dayTotals.employees}</p>
            <p className="text-xs text-gray-500 mt-1">Staff Needed</p>
          </Card>
        </div>

        {/* Schedule List */}
        <div className="flex-1 space-y-3">
          <h3 className="font-semibold text-gray-900 capitalize">{selectedDay}'s Schedule ({daySites.length} site{daySites.length !== 1 ? 's' : ''})</h3>

          {daySites.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center py-8 text-gray-400">
                <CalendarIcon size={40} className="mb-2" />
                <p className="text-sm">No sites scheduled for {selectedDay}</p>
              </div>
            </Card>
          ) : (
            daySites.map(site => {
              const client = site.clientId ? state.clients.find(c => c.id === site.clientId) : null;
              const assignedNames = getAssignedNames(site.assignedUserIds);
              return (
                <Card
                  key={site.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/sites/${site.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-blue-500" />
                        <h4 className="font-semibold text-gray-900">{site.name}</h4>
                        {client && (
                          <span className="text-xs text-gray-400">· {client.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatTime('17:00')} - {formatTime('19:00')}</span>
                        </div>
                        {assignedNames && (
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>{assignedNames}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${site.contractRate}</p>
                      <Badge label={site.frequency} variant="neutral" className="text-xs mt-1" />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Today's Active Shifts */}
        {todayShifts.length > 0 && (
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Today's Active Shifts</h4>
            <div className="space-y-2">
              {todayShifts.map(shift => {
                const user = state.users.find(u => u.id === shift.userId);
                const site = state.sites.find(s => s.id === shift.siteId);
                return (
                  <div key={shift.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="font-medium">{user?.name || 'Unknown'}</span>
                      <span className="text-gray-400">at</span>
                      <span>{site?.name || 'Unknown site'}</span>
                    </div>
                    <Badge label={shift.status} variant={shift.status === 'completed' ? 'success' : 'warning'} className="text-xs" />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
