import React from 'react';
import { Plus, Edit2, Key, Trash2, Phone, DollarSign, Users, ShieldAlert, Award, Briefcase, Lock } from 'lucide-react';
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
import { formatCAD } from '../utils/formatters';
import type { UserRole } from '../types';

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
      </div>
    </AppShell>
  );
}
