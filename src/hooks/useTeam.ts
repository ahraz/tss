import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/storage';
import { getInitials } from '../utils/formatters';
import type { User, UserRole } from '../types';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600',
  'bg-indigo-600', 'bg-pink-600', 'bg-teal-600',
  'bg-orange-600', 'bg-red-600',
];

export function useTeam() {
  const { state, currentUser, dispatch } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [addFormData, setAddFormData] = useState({
    name: '', role: 'employee' as UserRole, hourlyRate: '18.50', pin: '', phone: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '', role: 'employee' as UserRole, hourlyRate: '18.50', phone: '', isActive: true,
  });
  const [newPin, setNewPin] = useState('');

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const resetAddForm = () => {
    setAddFormData({ name: '', role: 'employee', hourlyRate: '18.50', pin: '', phone: '' });
  };

  const handleAddUser = () => {
    if (!addFormData.name.trim() || !addFormData.pin) {
      toast.error('Name and PIN are required');
      return;
    }
    if (addFormData.pin.length !== 4 || !/^\d{4}$/.test(addFormData.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    if (state.users.find(u => u.pin === addFormData.pin)) {
      toast.error('PIN already in use');
      return;
    }
    const colorIdx = state.users.length % AVATAR_COLORS.length;
    const user: User = {
      id: generateId(),
      name: addFormData.name.trim(),
      role: addFormData.role,
      hourlyRate: Number(addFormData.hourlyRate),
      pin: addFormData.pin,
      phone: addFormData.phone.trim(),
      avatarInitials: getInitials(addFormData.name.trim()),
      avatarColor: AVATAR_COLORS[colorIdx],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_USER', payload: user });
    toast.success(`${user.name} added`);
    setShowAddModal(false);
    resetAddForm();
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    if (!editFormData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...selectedUser,
        name: editFormData.name.trim(),
        role: editFormData.role,
        hourlyRate: Number(editFormData.hourlyRate),
        phone: editFormData.phone.trim(),
        isActive: editFormData.isActive,
        avatarInitials: getInitials(editFormData.name.trim()),
      },
    });
    toast.success('Account updated');
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    dispatch({ type: 'DELETE_USER', payload: userToDelete.id });
    toast.success(`${userToDelete.name} deleted`);
    setUserToDelete(null);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name, role: user.role, hourlyRate: String(user.hourlyRate),
      phone: user.phone || '', isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const openPinModal = (user: User) => {
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
    if (state.users.find(u => u.pin === newPin && u.id !== selectedUser.id)) {
      toast.error('PIN already in use');
      return;
    }
    dispatch({ type: 'UPDATE_USER', payload: { ...selectedUser, pin: newPin } });
    toast.success('PIN updated');
    setShowPinModal(false);
    setSelectedUser(null);
  };

  return {
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
  };
}
