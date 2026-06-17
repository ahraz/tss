import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Database, ShieldAlert, Building, DollarSign, User, Lock, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { UserAvatar } from '../components/ui/UserAvatar';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-slate-500', 'bg-gray-500'
];

export function SettingsPage() {
  const { state, dispatch, currentUser } = useApp();
  
  const [settings, setSettings] = useState(state.settings);
  const [userProfile, setUserProfile] = useState(currentUser ? {
    name: currentUser.name,
    phone: currentUser.phone || '',
    avatarInitials: currentUser.avatarInitials,
    avatarColor: currentUser.avatarColor,
  } : null);
  
  const [passwordData, setPasswordData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';

  const handleSaveProfile = () => {
    if (!userProfile) return;
    
    if (!userProfile.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (userProfile.avatarInitials.length !== 2 || !/^[A-Z]+$/.test(userProfile.avatarInitials)) {
      toast.error('Avatar initials must be exactly 2 uppercase letters');
      return;
    }

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...currentUser,
        name: userProfile.name.trim(),
        phone: userProfile.phone.trim(),
        avatarInitials: userProfile.avatarInitials,
        avatarColor: userProfile.avatarColor,
      }
    });
    toast.success('Profile updated successfully');
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPin || !passwordData.newPin || !passwordData.confirmPin) {
      toast.error('All fields are required');
      return;
    }

    if (passwordData.currentPin !== currentUser.pin) {
      toast.error('Current PIN is incorrect');
      return;
    }

    if (passwordData.newPin.length !== 4 || !/^\d{4}$/.test(passwordData.newPin)) {
      toast.error('New PIN must be exactly 4 digits');
      return;
    }

    if (passwordData.newPin !== passwordData.confirmPin) {
      toast.error('New PIN and confirmation do not match');
      return;
    }

    if (passwordData.newPin === currentUser.pin) {
      toast.error('New PIN must be different from current PIN');
      return;
    }

    dispatch({
      type: 'UPDATE_USER',
      payload: { ...currentUser, pin: passwordData.newPin }
    });
    
    setPasswordData({ currentPin: '', newPin: '', confirmPin: '' });
    setShowPasswordConfirm(false);
    toast.success('PIN changed successfully');
  };

  const handleSaveSettings = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    toast.success('Settings saved successfully');
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tss_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        // Basic validation
        if (importedData.settings && importedData.users && importedData.sites) {
          dispatch({ type: 'IMPORT_DATA', payload: importedData });
          toast.success('Data imported successfully');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error('Invalid backup file format');
        }
      } catch (err) {
        toast.error('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    dispatch({ type: 'CLEAR_ALL_DATA' });
    setShowClearConfirm(false);
    toast.success('All data cleared');
    window.location.href = '/'; // Force reload to login
  };

  return (
    <AppShell pageTitle="Settings">
      <div className="page-container max-w-3xl flex flex-col gap-6">
        
        {/* User Profile */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={20}/> My Profile</h3>
          <div className="space-y-6">
            {/* Avatar Preview & Editor */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex-shrink-0">
                <UserAvatar user={currentUser} size="xl" />
              </div>
              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Avatar Initials</label>
                  <input 
                    type="text"
                    maxLength={2}
                    value={userProfile?.avatarInitials || ''}
                    onChange={e => setUserProfile({...userProfile!, avatarInitials: e.target.value.toUpperCase()})}
                    placeholder="E.g., AR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be exactly 2 uppercase letters</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2"><Palette size={16}/> Avatar Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setUserProfile({...userProfile!, avatarColor: color})}
                        className={`w-8 h-8 rounded-lg ${color} transition-transform ${userProfile?.avatarColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Full Name" 
                value={userProfile?.name || ''} 
                onChange={e => setUserProfile({...userProfile!, name: e.target.value})}
                required
              />
              <Input 
                label="Phone Number" 
                type="tel"
                value={userProfile?.phone || ''} 
                onChange={e => setUserProfile({...userProfile!, phone: e.target.value})}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {/* Role & Hourly Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
                <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm capitalize">
                  {currentUser.role}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hourly Rate</label>
                <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm">
                  ${currentUser.hourlyRate.toFixed(2)}/hr
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} icon={Save} className="w-full">Save Profile Changes</Button>
          </div>
        </Card>

        {/* Password/PIN */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Lock size={20}/> Security</h3>
          <p className="text-sm text-gray-600 mb-4">
            Change your PIN used for clocking in and out. Keep it secure and never share it.
          </p>
          
          <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Input 
              label="Current PIN" 
              type="password"
              maxLength={4}
              value={passwordData.currentPin}
              onChange={e => setPasswordData({...passwordData, currentPin: e.target.value.replace(/\D/g, '')})}
              placeholder="Enter your current PIN"
            />
            <Input 
              label="New PIN" 
              type="password"
              maxLength={4}
              value={passwordData.newPin}
              onChange={e => setPasswordData({...passwordData, newPin: e.target.value.replace(/\D/g, '')})}
              placeholder="Enter new 4-digit PIN"
            />
            <Input 
              label="Confirm New PIN" 
              type="password"
              maxLength={4}
              value={passwordData.confirmPin}
              onChange={e => setPasswordData({...passwordData, confirmPin: e.target.value.replace(/\D/g, '')})}
              placeholder="Re-enter new 4-digit PIN"
            />
          </div>
          
          <Button onClick={() => setShowPasswordConfirm(true)} className="w-full mt-4">Change PIN</Button>
        </Card>

        {isOwner && (
          <>
            <div className="border-t border-gray-200" />

            {/* Business Profile */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building size={20}/> Business Profile</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Business Name" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} />
                  <Input label="Owner Name" value={settings.ownerName} onChange={e => setSettings({...settings, ownerName: e.target.value})} />
                </div>
              </div>
            </Card>

            {/* Financial Settings */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={20}/> Financial Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                  label="Currency" 
                  options={[{value: 'CAD', label: 'CAD ($)'}, {value: 'USD', label: 'USD ($)'}]} 
                  value={settings.currency} 
                  onChange={e => setSettings({...settings, currency: e.target.value})} 
                />
                <Select 
                  label="Pay Period" 
                  options={[{value: 'biweekly', label: 'Bi-weekly'}, {value: 'monthly', label: 'Monthly'}]} 
                  value={settings.payPeriod} 
                  onChange={e => setSettings({...settings, payPeriod: e.target.value as 'biweekly'|'monthly'})} 
                />
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button onClick={handleSaveSettings} icon={Save} size="lg">Save Business Settings</Button>
            </div>

            <div className="border-t border-gray-200 my-4" />

            {/* Data Management */}
            <Card className="border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2"><Database size={20}/> Data Management</h3>
              <p className="text-sm text-gray-600 mb-6">
                TSS Cleaners stores all data locally in your browser. It is highly recommended to export your data regularly as a backup.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button variant="secondary" icon={Download} onClick={handleExportData} className="flex-1">
                  Export Backup
                </Button>
                <div className="flex-1 relative">
                  <Button variant="secondary" icon={Upload} className="w-full">
                    Import Backup
                  </Button>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportData}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-red-900 flex items-center gap-2"><ShieldAlert size={18}/> Danger Zone</h4>
                  <p className="text-sm text-red-700 mt-1">Permanently delete all local data, including users, sites, and shifts.</p>
                </div>
                <Button variant="danger" icon={Trash2} onClick={() => setShowClearConfirm(true)}>Clear All Data</Button>
              </div>
            </Card>
          </>
        )}

        {/* Modals */}
        <ConfirmModal
          isOpen={showPasswordConfirm}
          onClose={() => setShowPasswordConfirm(false)}
          onConfirm={handleChangePassword}
          title="Change Your PIN?"
          message="Make sure to remember your new PIN. You'll need it to clock in and out."
          confirmLabel="Change PIN"
        />

        <ConfirmModal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          onConfirm={handleClearData}
          title="Clear All Data?"
          message="This action cannot be undone. All users, sites, shifts, and financial data will be permanently deleted from this browser."
          confirmLabel="Yes, Delete Everything"
          variant="danger"
        />

      </div>
    </AppShell>
  );
}
