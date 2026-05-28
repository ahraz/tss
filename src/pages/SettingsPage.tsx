import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Database, ShieldAlert, Building, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function SettingsPage() {
  const { state, dispatch, currentUser } = useApp();
  
  const [settings, setSettings] = useState(state.settings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!currentUser || currentUser.role !== 'owner') return null;

  const handleSave = () => {
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
        
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building size={20}/> Business Profile</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Business Name" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} />
              <Input label="Owner Name" value={settings.ownerName} onChange={e => setSettings({...settings, ownerName: e.target.value})} />
            </div>
          </div>
        </Card>

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
          <Button onClick={handleSave} icon={Save} size="lg">Save Settings</Button>
        </div>

        <div className="border-t border-gray-200 my-4" />

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
