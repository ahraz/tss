import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Key, Trash2, Phone, DollarSign, Users, ShieldAlert, Award, Briefcase, Lock, Eye, FileText, Star, Calendar, Shirt, AlertTriangle, User as UserIcon, Car, Globe, Clock, CheckCircle2 } from 'lucide-react';
import { startOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useTeam } from '../hooks/useTeam';
import { formatCAD, formatDuration } from '../utils/formatters';
import { getPhoto } from '../utils/photoStore';
import type { DayOfWeek, User, UserRole } from '../types';

export function TeamPage() {
  const {
    state, currentUser, isOwnerOrPartner,
    showAddModal, setShowAddModal,
    showEditModal, setShowEditModal,
    showPinModal, setShowPinModal,
    userToDelete, setUserToDelete,
    selectedUser,
    addFormData, setAddFormData,
    editFormData, setEditFormData,
    newPin, setNewPin,
    handleAddUser, handleEditUser, handleDeleteUser,
    openEditModal, openPinModal, handleChangePin,
  } = useTeam();

  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [docData, setDocData] = useState<Record<string, string>>({});

  // Load document data URLs from Firestore or fall back to IndexedDB
  // for backward compat with docs stored before the Firestore change.
  useEffect(() => {
    if (!viewedUser?.documents) { setDocData({}); return; }
    const entries = Object.entries(viewedUser.documents) as [string, string][];
    const result: Record<string, string> = {};
    let pending = entries.length;
    if (pending === 0) { setDocData({}); return; }
    for (const [label, value] of entries) {
      if (value.startsWith('data:')) {
        result[label] = value;
        if (--pending === 0) setDocData({ ...result });
      } else {
        // Old-style IndexedDB key — try to load it
        getPhoto(value).then(dataUrl => {
          if (dataUrl) result[label] = dataUrl;
          if (--pending === 0) setDocData({ ...result });
        });
      }
    }
  }, [viewedUser]);

  const roleOptions = [
    { value: 'employee' as const, label: 'Employee' },
    { value: 'partner' as const, label: 'Partner' },
    ...(currentUser?.role === 'owner' ? [{ value: 'owner' as const, label: 'Owner' }] : []),
  ];

  if (!isOwnerOrPartner) return null;

  const roleIcon: Record<string, React.ReactNode> = {
    owner: <ShieldAlert size={16} />,
    partner: <Award size={16} />,
    employee: <Briefcase size={16} />,
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    partner: 'bg-blue-100 text-blue-700',
    employee: 'bg-gray-100 text-gray-700',
  };

  return (
    <AppShell pageTitle="Team">
      <div className="page-container h-full flex flex-col gap-6">

        {/* Header */}
        <div className="flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team</h1>
            <p className="text-sm text-gray-500">{state.users.length} member{state.users.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Member
          </Button>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.users.map(user => (
            <Card key={user.id} className="flex flex-col">
              {/* User Info */}
              <div className="flex items-center gap-4 mb-4">
                <UserAvatar user={user} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                    {!user.isActive && (
                      <Badge label="Inactive" variant="neutral" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[user.role] || ''}`}>
                      {roleIcon[user.role]}
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign size={14} />
                  <span>{formatCAD(user.hourlyRate)}/hr</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setViewedUser(user)}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  title="View profile"
                >
                  <Eye size={18} />
                </button>
                <Button variant="secondary" onClick={() => openEditModal(user)} size="sm" className="flex-1">
                  <Edit2 size={14} />
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => openPinModal(user)} size="sm" className="flex-1">
                  <Key size={14} />
                  PIN
                </Button>
                <button
                  onClick={() => setUserToDelete(user)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete user"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))}

          {state.users.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No team members yet</p>
              <p className="text-sm mt-1">Click "Add Member" to get started.</p>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); }} title="Add Team Member" size="md">
          <div className="space-y-4">
            <Input label="Full Name" value={addFormData.name} onChange={e => setAddFormData({...addFormData, name: e.target.value})} placeholder="e.g. John Smith" />
            <Select label="Role" value={addFormData.role} onChange={e => setAddFormData({...addFormData, role: e.target.value as UserRole})} options={roleOptions} />
            <Input label="Hourly Rate (CAD)" type="number" value={addFormData.hourlyRate} onChange={e => setAddFormData({...addFormData, hourlyRate: e.target.value})} />
            <Input label="Phone (optional)" type="tel" value={addFormData.phone} onChange={e => setAddFormData({...addFormData, phone: e.target.value})} placeholder="e.g. 416-555-1234" />
            <Input label="Secure PIN (4 digits)" type="password" maxLength={4} value={addFormData.pin} onChange={e => setAddFormData({...addFormData, pin: e.target.value.replace(/\D/g, '').slice(0,4)})} placeholder="••••" />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddUser}>Add Member</Button>
            </div>
          </div>
        </Modal>

        {/* Edit User Modal */}
        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Account Details" size="md">
          <div className="space-y-4">
            <Input label="Full Name" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
            <Select label="Role" value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value as UserRole})} options={roleOptions} />
            <Input label="Hourly Rate (CAD)" type="number" value={editFormData.hourlyRate} onChange={e => setEditFormData({...editFormData, hourlyRate: e.target.value})} />
            <Input label="Phone" type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} />
            <Select label="Status" value={editFormData.isActive ? 'active' : 'inactive'} onChange={e => setEditFormData({...editFormData, isActive: e.target.value === 'active'})} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleEditUser}>Save Changes</Button>
            </div>
          </div>
        </Modal>

        {/* Change PIN Modal */}
        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Change Secure PIN" size="sm">
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <Lock size={16} className="mt-0.5 flex-shrink-0" />
              <span>Changing the PIN will update the code this user clocks in with.</span>
            </div>
            <Input label="New 4-Digit PIN" type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0,4))} placeholder="••••" inputMode="numeric" className="text-center font-bold text-lg tracking-widest" />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowPinModal(false)}>Cancel</Button>
              <Button onClick={handleChangePin} disabled={newPin.length !== 4} className="bg-amber-600 hover:bg-amber-700 text-white">Update PIN</Button>
            </div>
          </div>
        </Modal>

        {/* Delete User Confirm Modal */}
        <ConfirmModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
          title={`Delete Account: ${userToDelete?.name}?`}
          message="Are you sure you want to permanently delete this employee account? This will wipe their profile from the database. Note: It is safer to simply 'Deactivate' the account instead, so their historic shifts remain fully preserved."
          confirmLabel="Yes, Delete Account"
          variant="danger"
        />

        {/* View Profile Modal */}
        <Modal isOpen={!!viewedUser} onClose={() => setViewedUser(null)} title={viewedUser?.name || 'Employee Profile'} size="lg">
          {viewedUser && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex items-center gap-4">
                <UserAvatar user={viewedUser} size="lg" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewedUser.name}</h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[viewedUser.role] || ''}`}>
                    {roleIcon[viewedUser.role]}
                    {viewedUser.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Info */}
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><UserIcon size={14} /> Personal</h4>
                  <div className="space-y-2 text-sm">
                    {viewedUser.phone && <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{viewedUser.phone}</span></div>}
                    {viewedUser.email && <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{viewedUser.email}</span></div>}
                    {viewedUser.address && <div><span className="text-gray-500">Address:</span> <span className="text-gray-900">{viewedUser.address}</span></div>}
                    {viewedUser.dateOfBirth && <div><span className="text-gray-500">DOB:</span> <span className="text-gray-900">{new Date(viewedUser.dateOfBirth).toLocaleDateString()}</span></div>}
                    {!viewedUser.phone && !viewedUser.email && !viewedUser.address && !viewedUser.dateOfBirth && <span className="text-gray-400 italic">No info provided</span>}
                  </div>
                </Card>

                {/* Job Details */}
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Briefcase size={14} /> Job</h4>
                  <div className="space-y-2 text-sm">
                    {viewedUser.jobTitle && <div><span className="text-gray-500">Title:</span> <span className="text-gray-900">{viewedUser.jobTitle}</span></div>}
                    {viewedUser.hireDate && <div><span className="text-gray-500">Hired:</span> <span className="text-gray-900">{new Date(viewedUser.hireDate).toLocaleDateString()}</span></div>}
                    {viewedUser.employeeId && <div><span className="text-gray-500">Employee ID:</span> <span className="text-gray-900">{viewedUser.employeeId}</span></div>}
                    <div><span className="text-gray-500">Rate:</span> <span className="text-gray-900">{formatCAD(viewedUser.hourlyRate)}/hr</span></div>
                    {!viewedUser.jobTitle && !viewedUser.hireDate && !viewedUser.employeeId && <span className="text-gray-400 italic">No job details</span>}
                  </div>
                </Card>

                {/* Performance Stats */}
                {viewedUser.role === 'employee' && (() => {
                  const now = new Date();
                  const weekStart = startOfWeek(now);
                  const monthStartDate = startOfMonth(now);
                  const monthEndDate = endOfMonth(now);
                  const userShifts = state.shifts.filter(s => s.userId === viewedUser.id && s.status === 'completed');
                  const weekHours = userShifts
                    .filter(s => isWithinInterval(new Date(s.clockInTime), { start: weekStart, end: now }))
                    .reduce((sum, s) => sum + ((s.durationMinutes || 0) / 60), 0);
                  const monthHours = userShifts
                    .filter(s => isWithinInterval(new Date(s.clockInTime), { start: monthStartDate, end: monthEndDate }))
                    .reduce((sum, s) => sum + ((s.durationMinutes || 0) / 60), 0);
                  const monthShifts = userShifts.filter(s => isWithinInterval(new Date(s.clockInTime), { start: monthStartDate, end: monthEndDate })).length;
                  const completedTasks = state.tasks.filter(t => t.assignedUserId === viewedUser.id && t.status === 'done').length;
                  return (
                    <Card>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Award size={14} /> Performance</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-600 font-medium">Week Hours</p>
                          <p className="text-lg font-bold text-blue-700">{weekHours.toFixed(1)}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 font-medium">Month Hours</p>
                          <p className="text-lg font-bold text-green-700">{monthHours.toFixed(1)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-purple-600 font-medium">Month Shifts</p>
                          <p className="text-lg font-bold text-purple-700">{monthShifts}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-amber-600 font-medium">Tasks Done</p>
                          <p className="text-lg font-bold text-amber-700">{completedTasks}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

                {/* Uniform & Equipment */}
                {(viewedUser.tshirtSize || viewedUser.equipmentIssued) && (
                  <Card>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Shirt size={14} /> Uniform & Equipment</h4>
                    <div className="space-y-2 text-sm">
                      {viewedUser.tshirtSize && <div><span className="text-gray-500">T-Shirt:</span> <span className="text-gray-900">{viewedUser.tshirtSize}</span></div>}
                      {viewedUser.equipmentIssued && <div><span className="text-gray-500">Equipment:</span> <span className="text-gray-900">{viewedUser.equipmentIssued}</span></div>}
                    </div>
                  </Card>
                )}

                {/* Emergency Contact */}
                {(viewedUser.emergencyName || viewedUser.emergencyPhone) && (
                  <Card>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Emergency Contact</h4>
                    <div className="space-y-2 text-sm">
                      {viewedUser.emergencyName && <div><span className="text-gray-500">Name:</span> <span className="text-gray-900">{viewedUser.emergencyName}</span></div>}
                      {viewedUser.emergencyPhone && <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{viewedUser.emergencyPhone}</span></div>}
                      {viewedUser.emergencyRelation && <div><span className="text-gray-500">Relationship:</span> <span className="text-gray-900">{viewedUser.emergencyRelation}</span></div>}
                    </div>
                  </Card>
                )}
              </div>

              {/* Skills */}
              {viewedUser.skills && viewedUser.skills.length > 0 && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Award size={14} /> Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewedUser.skills.map(s => (
                      <span key={s} className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700">{s}</span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Availability */}
              <Card>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={14} /> Availability</h4>
                {viewedUser.availability && Object.keys(viewedUser.availability).length > 0 ? (
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const).map(d => {
                      const DAY_MAP: Record<string, DayOfWeek> = { 'Mon':'monday', 'Tue':'tuesday', 'Wed':'wednesday', 'Thu':'thursday', 'Fri':'friday', 'Sat':'saturday', 'Sun':'sunday' };
                      const dayKey = DAY_MAP[d];
                      const slot = viewedUser.availability?.[dayKey];
                      const isAvail = slot != null && typeof slot !== 'string';
                      return (
                        <div key={d} className={`p-2 rounded-lg font-medium ${isAvail ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                          <div className="font-semibold mb-1">{d}</div>
                          {isAvail ? (
                            slot?.allDay ? (
                              <div className="text-green-600">All day</div>
                            ) : (
                              <div className="text-green-600">{slot?.start}–{slot?.end}</div>
                            )
                          ) : (
                            <div>—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No availability set yet</p>
                )}
              </Card>

              {/* Languages */}
              {viewedUser.languages && viewedUser.languages.length > 0 && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Globe size={14} /> Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewedUser.languages.map(l => (
                      <span key={l} className="px-3 py-1 rounded-lg text-sm font-medium bg-purple-50 text-purple-700">{l}</span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Driver & Vehicle */}
              {(viewedUser.driversLicense || viewedUser.vehicleInfo) && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Car size={14} /> Driver & Vehicle</h4>
                  <div className="space-y-2 text-sm">
                    {viewedUser.driversLicense && <div><span className="text-gray-500">License:</span> <span className="text-gray-900">{viewedUser.driversLicense}</span></div>}
                    {viewedUser.vehicleInfo && <div><span className="text-gray-500">Vehicle:</span> <span className="text-gray-900">{viewedUser.vehicleInfo}</span></div>}
                  </div>
                </Card>
              )}

              {/* Performance Rating */}
              {viewedUser.performanceRating ? (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Star size={14} /> Performance</h4>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={20} fill={viewedUser.performanceRating! >= n ? '#eab308' : 'none'} className={viewedUser.performanceRating! >= n ? 'text-yellow-500' : 'text-gray-300'} />
                    ))}
                  </div>
                </Card>
              ) : null}

              {/* Notes */}
              {viewedUser.notes && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} /> Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewedUser.notes}</p>
                </Card>
              )}

              {/* Documents */}
              {viewedUser.documents && Object.keys(viewedUser.documents).length > 0 && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} /> Documents ({Object.keys(viewedUser.documents).length})</h4>
                  <div className="space-y-3">
                    {Object.entries(viewedUser.documents).map(([label, value]) => {
                      const dataUrl = docData[label];
                      return (
                        <div key={label} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
                          {dataUrl ? (
                            dataUrl.startsWith('data:image/') ? (
                              <img src={dataUrl} alt={label} className="max-w-full rounded border border-gray-200" style={{ maxHeight: 300 }} />
                            ) : dataUrl.startsWith('data:application/pdf') ? (
                              <iframe src={dataUrl} title={label} className="w-full rounded border border-gray-200" style={{ height: 400 }} />
                            ) : (
                              <a href={dataUrl} download={label} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                                <FileText size={14} /> View / Download
                              </a>
                            )
                          ) : value && !value.startsWith('data:') ? (
                            <p className="text-xs text-gray-400 italic">Document only available on the employee's device</p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Loading...</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Banking (owner-only view) */}
              {viewedUser.bankingInfo && (
                <Card>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={14} /> Banking & Payroll</h4>
                  <p className="text-sm text-gray-700 font-mono">{viewedUser.bankingInfo}</p>
                </Card>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
