import React, { useState, useMemo } from 'react';
import { Download, FileWarning } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDateTime, formatDate, formatDuration, formatCAD } from '../utils/formatters';
import { exportToCSV } from '../utils/csv';
import type { Shift } from '../types';

export function ShiftsPage() {
  const { state, currentUser, dispatch } = useApp();
  const [startDate, setStartDate] = useState(() => startOfMonth(new Date()).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => endOfMonth(new Date()).toISOString().split('T')[0]);
  const [siteFilter, setSiteFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editNotes, setEditNotes] = useState('');

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const filteredShifts = useMemo(() => {
    return state.shifts
      .filter(s => {
        // Role filter
        if (!isOwnerOrPartner && s.userId !== currentUser.id) return false;
        
        // Date filter
        const shiftDate = new Date(s.clockInTime);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!isWithinInterval(shiftDate, { start, end })) return false;

        // Other filters
        if (siteFilter && s.siteId !== siteFilter) return false;
        if (employeeFilter && s.userId !== employeeFilter) return false;
        if (statusFilter && s.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
  }, [state.shifts, isOwnerOrPartner, currentUser.id, startDate, endDate, siteFilter, employeeFilter, statusFilter]);

  const totalHours = filteredShifts.reduce((acc, s) => acc + (s.durationMinutes || 0) / 60, 0);

  const handleExport = () => {
    exportToCSV(
      filteredShifts,
      [
        { header: 'Date', accessor: s => formatDate(s.clockInTime) },
        { header: 'Employee', accessor: s => state.users.find(u => u.id === s.userId)?.name || 'Unknown' },
        { header: 'Site', accessor: s => state.sites.find(site => site.id === s.siteId)?.name || 'Unknown' },
        { header: 'Clock In', accessor: s => new Date(s.clockInTime).toLocaleTimeString() },
        { header: 'Clock Out', accessor: s => s.clockOutTime ? new Date(s.clockOutTime).toLocaleTimeString() : '' },
        { header: 'Duration (mins)', accessor: s => s.durationMinutes || 0 },
        { header: 'Status', accessor: s => s.status },
        { header: 'Notes', accessor: s => s.notes }
      ],
      `shifts_export_${startDate}_to_${endDate}.csv`
    );
  };

  const handleSaveNotes = () => {
    if (selectedShift) {
      dispatch({ type: 'UPDATE_SHIFT', payload: { ...selectedShift, notes: editNotes } });
      setSelectedShift({ ...selectedShift, notes: editNotes });
    }
  };

  const siteOptions = state.sites.map(s => ({ value: s.id, label: s.name }));
  const employeeOptions = state.users.map(u => ({ value: u.id, label: u.name }));

  return (
    <AppShell pageTitle="Shifts">
      <div className="page-container flex flex-col h-full gap-6">
        <Card className="flex-shrink-0">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full lg:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date Range</label>
              <DateRangePicker 
                startDate={startDate} endDate={endDate}
                onStartChange={setStartDate} onEndChange={setEndDate}
              />
            </div>
            <div className="flex-1 w-full lg:w-auto grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select label="Site" options={siteOptions} value={siteFilter} onChange={e => setSiteFilter(e.target.value)} placeholder="All Sites" />
              {isOwnerOrPartner && (
                <Select label="Employee" options={employeeOptions} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} placeholder="All Employees" />
              )}
              <Select label="Status" options={[{value:'active', label:'Active'}, {value:'completed', label:'Completed'}]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="All Statuses" className="col-span-2 md:col-span-1" />
            </div>
          </div>
        </Card>

        <div className="flex justify-between items-center px-1">
          <p className="text-sm text-gray-500 font-medium">
            {filteredShifts.length} shifts • {totalHours.toFixed(1)} hours
          </p>
          <Button variant="ghost" size="sm" icon={Download} onClick={handleExport} disabled={filteredShifts.length === 0}>
            Export CSV
          </Button>
        </div>

        <Card className="flex-1 p-0 overflow-hidden flex flex-col">
          {filteredShifts.length === 0 ? (
            <EmptyState icon={FileWarning} title="No shifts found" description="Try adjusting your filters or date range to see results." />
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Site</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShifts.map(shift => {
                    const user = state.users.find(u => u.id === shift.userId);
                    const site = state.sites.find(s => s.id === shift.siteId);
                    return (
                      <tr 
                        key={shift.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedShift(shift); setEditNotes(shift.notes); }}
                      >
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-medium text-gray-900 text-sm">{formatDate(shift.clockInTime)}</p>
                          <p className="text-xs text-gray-500">{new Date(shift.clockInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {user && <UserAvatar user={user} size="sm" />}
                            <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-900 truncate max-w-[150px] sm:max-w-xs">{site?.name}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap hidden md:table-cell text-sm text-gray-600">
                          {shift.durationMinutes ? formatDuration(shift.durationMinutes) : '-'}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge 
                            label={shift.status} 
                            variant={shift.status === 'active' ? 'info' : 'success'} 
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Shift Detail Modal */}
        <Modal isOpen={!!selectedShift} onClose={() => setSelectedShift(null)} title="Shift Details" size="lg">
          {selectedShift && (() => {
            const user = state.users.find(u => u.id === selectedShift.userId);
            const site = state.sites.find(s => s.id === selectedShift.siteId);
            return (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  {user && <UserAvatar user={user} size="lg" />}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{user?.name}</h3>
                    <p className="text-sm text-gray-500">{site?.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <Badge label={selectedShift.status} variant={selectedShift.status === 'active' ? 'info' : 'success'} className="mb-1" />
                    <p className="font-mono text-sm font-medium text-gray-900">{selectedShift.durationMinutes ? formatDuration(selectedShift.durationMinutes) : 'In progress'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Clock In</p>
                      <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedShift.clockInTime)}</p>
                    </div>
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                      {selectedShift.clockInPhotoDataUrl ? (
                        <img src={selectedShift.clockInPhotoDataUrl} alt="Clock In" className="w-full h-full object-contain" />
                      ) : (
                        <p className="text-xs text-gray-400">No photo</p>
                      )}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Clock Out</p>
                      <p className="text-sm font-medium text-gray-900">{selectedShift.clockOutTime ? formatDateTime(selectedShift.clockOutTime) : '—'}</p>
                    </div>
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                      {selectedShift.clockOutPhotoDataUrl ? (
                        <img src={selectedShift.clockOutPhotoDataUrl} alt="Clock Out" className="w-full h-full object-contain" />
                      ) : (
                        <p className="text-xs text-gray-400">No photo</p>
                      )}
                    </div>
                  </div>
                </div>

                {isOwnerOrPartner && user && selectedShift.status === 'completed' && selectedShift.durationMinutes && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Calculated Earnings</span>
                    <span className="font-bold text-green-700 text-lg">{formatCAD((selectedShift.durationMinutes/60) * user.hourlyRate)}</span>
                  </div>
                )}

                {site && site.checklist.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Checklist</h4>
                    <div className="space-y-1">
                      {site.checklist.map(item => {
                        const isCompleted = selectedShift.checklistCompletions.find(c => c.itemId === item.id)?.completed;
                        return (
                          <div key={item.id} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50">
                            {isCompleted ? <span className="text-green-500 font-bold">✓</span> : <span className="text-red-400 font-bold">✗</span>}
                            <span className={isCompleted ? 'text-gray-900' : 'text-gray-500 line-through'}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                  {isOwnerOrPartner ? (
                    <div className="flex gap-2 items-start">
                      <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="flex-1" />
                      <Button variant="secondary" onClick={handleSaveNotes} disabled={editNotes === selectedShift.notes}>Save</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[60px] whitespace-pre-wrap">
                      {selectedShift.notes || 'No notes.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    </AppShell>
  );
}
