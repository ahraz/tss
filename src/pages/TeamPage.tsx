import React, { useState } from 'react';
import { Plus, Edit2, Key, Trash2, Phone, DollarSign, Users, ShieldAlert, Award, Briefcase, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { generateId } from '../utils/storage';
import { getInitials, formatCAD } from '../utils/formatters';
import type { User, UserRole } from '../types';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-green-600',
  'bg-indigo-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-red-600'
];

export function TeamPage() {
  const { state, currentUser, dispatch } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Selection State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form States
  const [addFormData, setAddFormData] = useState({
    name: '',
    role: 'employee' as UserRole,
    hourlyRate: '18.50',
    pin: '',
    phone: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'employee' as UserRole,
    hourlyRate: '18.50',
    phone: '',
    isActive: true,
  });

  const [newPin, setNewPin] = useState('');

  // Guard: Only Owner and Partner can access this page
  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'partner')) {
    return null;
  }

  const activeUsers = state.users.filter(u => u.isActive);
  const inactiveUsers = state.users.filter(u => !u.isActive);

  // Handlers
  const handleAddUser = () => {
    const { name, role, hourlyRate, pin, phone } = addFormData;
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    const rate = role === 'employee' ? parseFloat(hourlyRate) || 0 : 0;
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newUser: User = {
      id: generateId(),
      name: name.trim(),
      role,
      pin,
      avatarInitials: getInitials(name),
      avatarColor: randomColor,
      hourlyRate: rate,
      phone: phone.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_USER', payload: newUser });
    toast.success(`${name} added to the team!`);
    setShowAddModal(false);
    setAddFormData({ name: '', role: 'employee', hourlyRate: '18.50', pin: '', phone: '' });
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      hourlyRate: user.hourlyRate.toString(),
      phone: user.phone || '',
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    const { name, role, hourlyRate, phone, isActive } = editFormData;
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Prevent Owner from deactivating themselves or changing their own role to employee
    if (selectedUser.id === currentUser.id) {
      if (!isActive) {
        toast.error('You cannot deactivate your own account!');
        return;
      }
      if (role !== selectedUser.role) {
        toast.error('You cannot change your own role!');
        return;
      }
    }

    const rate = role === 'employee' ? parseFloat(hourlyRate) || 0 : 0;

    const updatedUser: User = {
      ...selectedUser,
      name: name.trim(),
      role,
      hourlyRate: rate,
      phone: phone.trim() || undefined,
      isActive,
      avatarInitials: getInitials(name),
    };

    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    toast.success('Account updated successfully');
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleOpenPin = (user: User) => {
    setSelectedUser(user);
    setNewPin('');
    setShowPinModal(true);
  };

  const handleChangePin = () => {
    if (!selectedUser) return;
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    const updatedUser: User = {
      ...selectedUser,
      pin: newPin,
    };

    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    toast.success(`PIN updated successfully for ${selectedUser.name}`);
    setShowPinModal(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      toast.error('You cannot delete your own account!');
      setUserToDelete(null);
      return;
    }

    dispatch({ type: 'DELETE_USER', payload: userToDelete.id });
    toast.success(`${userToDelete.name} deleted from database.`);
    setUserToDelete(null);
  };

  const renderUserCard = (user: User) => {
    const isSelf = user.id === currentUser.id;

    return (
      <Card key={user.id} className="relative overflow-hidden hover:shadow-md transition-shadow border border-gray-150">
        <div className="flex items-start gap-4">
          <UserAvatar user={user} size="lg" className="shadow-sm border border-white/20" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 text-lg truncate">{user.name}</h4>
              {isSelf && <Badge label="You" variant="info" className="text-xs" />}
            </div>
            
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
              <Briefcase size={12} />
              <Badge 
                label={user.role} 
                variant={user.role === 'owner' ? 'warning' : user.role === 'partner' ? 'info' : 'neutral'} 
                className="capitalize py-0 px-2"
              />
            </div>

            {user.role === 'employee' && (
              <div className="flex items-center gap-1 text-gray-700 text-sm mt-2 font-medium">
                <DollarSign size={14} className="text-gray-400" />
                <span>{formatCAD(user.hourlyRate)}/hr</span>
              </div>
            )}

            {user.phone && (
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-2">
                <Phone size={12} />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <Button 
            size="sm" 
            variant="secondary" 
            icon={Edit2} 
            onClick={() => handleOpenEdit(user)}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            icon={Key} 
            onClick={() => handleOpenPin(user)}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            PIN
          </Button>
          {!isSelf && (
            <Button 
              size="sm" 
              variant="secondary" 
              icon={Trash2} 
              onClick={() => setUserToDelete(user)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
            >
              Delete
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <AppShell pageTitle="Team Management">
      <div className="page-container flex flex-col gap-6 max-w-6xl mx-auto">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900">Manage Accounts</h2>
              <p className="text-sm text-gray-500">Create, edit, and manage login PINs for all staff.</p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Team Member</Button>
        </div>

        {/* Active Team Grid */}
        <div>
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            Active Staff <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{activeUsers.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeUsers.map(renderUserCard)}
            {activeUsers.length === 0 && (
              <div className="col-span-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-medium">
                No active users found.
              </div>
            )}
          </div>
        </div>

        {/* Inactive Team Grid */}
        {inactiveUsers.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              Deactivated Accounts <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{inactiveUsers.length}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
              {inactiveUsers.map(renderUserCard)}
            </div>
          </div>
        )}

      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Team Member" size="md">
        <div className="space-y-4">
          <Input 
            label="Full Name" 
            value={addFormData.name} 
            onChange={e => setAddFormData({...addFormData, name: e.target.value})} 
            placeholder="e.g. John Doe" 
            required 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="System Role" 
              options={[
                { value: 'employee', label: 'Employee (Cleaner)' },
                { value: 'partner', label: 'Partner (Admin)' },
                { value: 'owner', label: 'Owner (Admin/Full Access)' }
              ]} 
              value={addFormData.role} 
              onChange={e => setAddFormData({...addFormData, role: e.target.value as UserRole})} 
            />

            {addFormData.role === 'employee' ? (
              <Input 
                label="Hourly Rate (CAD)" 
                type="number" 
                value={addFormData.hourlyRate} 
                onChange={e => setAddFormData({...addFormData, hourlyRate: e.target.value})} 
                placeholder="18.50" 
                required 
              />
            ) : (
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-center text-center text-xs text-gray-500">
                Admins have salary or custom arrangements. Rate set to $0.00.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="4-Digit Secure PIN" 
              type="password" 
              maxLength={4}
              value={addFormData.pin} 
              onChange={e => setAddFormData({...addFormData, pin: e.target.value.replace(/\D/g, '')})} 
              placeholder="1234" 
              required 
            />
            <Input 
              label="Phone Number (Optional)" 
              value={addFormData.phone} 
              onChange={e => setAddFormData({...addFormData, phone: e.target.value})} 
              placeholder="905-555-0199" 
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-xl flex gap-2.5 items-start text-xs text-blue-700 border border-blue-100">
            <Lock size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
            <p>Staff members will use their 4-digit PIN to securely sign in and clock in/out on their own mobile devices.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={!addFormData.name || addFormData.pin.length !== 4}>
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Account Details" size="md">
        <div className="space-y-4">
          <Input 
            label="Full Name" 
            value={editFormData.name} 
            onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="System Role" 
              options={[
                { value: 'employee', label: 'Employee (Cleaner)' },
                { value: 'partner', label: 'Partner (Admin)' },
                { value: 'owner', label: 'Owner (Admin/Full Access)' }
              ]} 
              value={editFormData.role} 
              onChange={e => setEditFormData({...editFormData, role: e.target.value as UserRole})} 
            />

            {editFormData.role === 'employee' ? (
              <Input 
                label="Hourly Rate (CAD)" 
                type="number" 
                value={editFormData.hourlyRate} 
                onChange={e => setEditFormData({...editFormData, hourlyRate: e.target.value})} 
                required 
              />
            ) : (
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-center text-center text-xs text-gray-500">
                Admins have custom compensation. Rate is set to $0.00.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Phone Number" 
              value={editFormData.phone} 
              onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
            />
            <Select 
              label="Account Status" 
              options={[
                { value: 'true', label: 'Active (Can login)' },
                { value: 'false', label: 'Deactivated (Access blocked)' }
              ]} 
              value={editFormData.isActive.toString()} 
              onChange={e => setEditFormData({...editFormData, isActive: e.target.value === 'true'})} 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={!editFormData.name}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change PIN Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Change Secure PIN" size="sm">
        <div className="space-y-4">
          <div className="flex flex-col items-center py-2">
            <div className="bg-amber-100 p-3 rounded-full text-amber-600 mb-2">
              <Key size={24} />
            </div>
            <h4 className="font-semibold text-gray-900 text-center">{selectedUser?.name}</h4>
            <p className="text-xs text-gray-500 text-center mt-1">Set a new 4-digit code to access this account.</p>
          </div>

          <Input 
            label="Enter New 4-Digit PIN" 
            type="password" 
            maxLength={4}
            value={newPin} 
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
            placeholder="e.g. 9988" 
            required 
            className="text-center font-bold text-lg tracking-widest"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowPinModal(false)}>Cancel</Button>
            <Button 
              onClick={handleChangePin} 
              disabled={newPin.length !== 4}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Update PIN
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title={`Delete Account: ${userToDelete?.name}?`}
        message={`Are you sure you want to permanently delete this employee account? This will wipe their profile from the database. Note: It is safer to simply 'Deactivate' the account instead, so their historic shifts remain fully preserved.`}
        confirmLabel="Yes, Delete Account"
        variant="danger"
      />

    </AppShell>
  );
}
