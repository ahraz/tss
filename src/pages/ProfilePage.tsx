import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Save, Upload, X, AlertTriangle, Star, FileText, Plus, User, Award, Calendar, Shirt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserAvatar } from '../components/ui/UserAvatar';
import { putPhoto, getPhoto, deletePhoto } from '../utils/photoStore';
import { compressImage } from '../utils/compressImage';
import { getInitials } from '../utils/formatters';
import type { DayOfWeek } from '../types';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-slate-500', 'bg-gray-500'
];

const SKILL_OPTIONS = [
  'High Dusting', 'Carpet Cleaning', 'Floor Buffing', 'Window Cleaning',
  'Pressure Washing', 'Tile & Grout', 'WHMIS Certified', 'First Aid',
  'Biohazard Cleaning', 'Construction Cleanup', 'Deep Cleaning', 'Floor Waxing'
];

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const SHIFT_SLOTS = ['morning', 'afternoon', 'evening'] as const;

export function ProfilePage() {
  const { state, currentUser, dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [docLabel, setDocLabel] = useState('');

  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    jobTitle: '',
    hireDate: '',
    employeeId: '',
    sin: '',
    bankingInfo: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    tshirtSize: '',
    equipmentIssued: '',
    notes: '',
    performanceRating: 0,
    avatarInitials: '',
    avatarColor: '',
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, string>>({});

  // Load user data into form
  useEffect(() => {
    if (!currentUser) return;
    setForm({
      name: currentUser.name,
      phone: currentUser.phone || '',
      email: currentUser.email || '',
      address: currentUser.address || '',
      jobTitle: currentUser.jobTitle || '',
      hireDate: currentUser.hireDate || '',
      employeeId: currentUser.employeeId || '',
      sin: currentUser.sin || '',
      bankingInfo: currentUser.bankingInfo || '',
      emergencyName: currentUser.emergencyName || '',
      emergencyPhone: currentUser.emergencyPhone || '',
      emergencyRelation: currentUser.emergencyRelation || '',
      tshirtSize: currentUser.tshirtSize || '',
      equipmentIssued: currentUser.equipmentIssued || '',
      notes: currentUser.notes || '',
      performanceRating: currentUser.performanceRating || 0,
      avatarInitials: currentUser.avatarInitials,
      avatarColor: currentUser.avatarColor,
    });
    setSkills(currentUser.skills || []);
    setAvailability(
      DAYS.reduce((acc, d) => {
        acc[d.key] = currentUser.availability?.[d.key] || 'unavailable';
        return acc;
      }, {} as Record<string, string>)
    );
    setDocuments(currentUser.documents || {});
  }, [currentUser]);

  // Load profile photo from IndexedDB
  useEffect(() => {
    if (!currentUser?.photoId) {
      setPhotoLoading(false);
      return;
    }
    getPhoto(currentUser.photoId).then((url) => {
      if (url) setProfilePhoto(url);
      setPhotoLoading(false);
    });
  }, [currentUser?.photoId]);

  const handlePhotoUpload = useCallback(async (dataUrl: string) => {
    if (!currentUser) return;
    const compressed = await compressImage(dataUrl, 600, 0.8).catch(() => dataUrl);
    const photoId = `profile:${currentUser.id}`;
    await putPhoto(photoId, compressed);
    setProfilePhoto(compressed);

    // Delete old photo if photoId changed
    if (currentUser.photoId && currentUser.photoId !== photoId) {
      await deletePhoto(currentUser.photoId).catch(() => {});
    }

    dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, photoId } });
    toast.success('Profile photo updated');
  }, [currentUser, dispatch]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handlePhotoUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    if (!currentUser?.photoId) return;
    await deletePhoto(currentUser.photoId).catch(() => {});
    setProfilePhoto(null);
    dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, photoId: undefined } });
    toast.success('Photo removed');
  };

  const handleDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !docLabel.trim()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const label = docLabel.trim();
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 1200, 0.7).catch(() => reader.result as string);
      const photoId = `doc:${currentUser.id}:${label}`;
      await putPhoto(photoId, compressed);
      const updated = { ...documents, [label]: photoId };
      setDocuments(updated);
      setDocLabel('');
      dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, documents: updated } });
      toast.success(`Document "${label}" saved`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [currentUser, documents, dispatch, docLabel]);

  const handleRemoveDoc = async (label: string) => {
    if (!currentUser) return;
    const photoId = documents[label];
    if (photoId) await deletePhoto(photoId).catch(() => {});
    const updated = { ...documents };
    delete updated[label];
    setDocuments(updated);
    dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, documents: updated } });
    toast.success(`Document "${label}" removed`);
  };

  const toggleSkill = (skill: string) => {
    const updated = skills.includes(skill)
      ? skills.filter(s => s !== skill)
      : [...skills, skill];
    setSkills(updated);
  };

  const handleSave = () => {
    if (!currentUser) return;
    if (!form.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    const avatarInitials = form.avatarInitials.length === 2
      ? form.avatarInitials
      : getInitials(form.name);

    const availabilityRecord: Partial<Record<DayOfWeek, 'morning' | 'afternoon' | 'evening' | 'unavailable'>> = {};
    DAYS.forEach(d => {
      const val = availability[d.key];
      if (val && val !== 'unavailable') {
        availabilityRecord[d.key] = val as any;
      }
    });

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...currentUser,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        hireDate: form.hireDate || undefined,
        employeeId: form.employeeId.trim() || undefined,
        sin: form.sin.trim() || undefined,
        bankingInfo: form.bankingInfo.trim() || undefined,
        emergencyName: form.emergencyName.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
        emergencyRelation: form.emergencyRelation.trim() || undefined,
        tshirtSize: form.tshirtSize || undefined,
        equipmentIssued: form.equipmentIssued.trim() || undefined,
        notes: form.notes.trim() || undefined,
        performanceRating: form.performanceRating || undefined,
        avatarInitials,
        avatarColor: form.avatarColor,
        skills: skills.length > 0 ? skills : undefined,
        availability: Object.keys(availabilityRecord).length > 0 ? availabilityRecord : undefined,
        documents: Object.keys(documents).length > 0 ? documents : undefined,
      }
    });
    toast.success('Profile saved');
  };

  if (!currentUser) return null;

  return (
    <AppShell pageTitle="My Profile">
      <div className="page-container max-w-3xl flex flex-col gap-6 pb-8">

        {/* Profile Photo */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Camera size={20} /> Profile Photo</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {profilePhoto ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-gray-100">
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <UserAvatar user={currentUser} size="xl" />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-lg cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={14} className="text-white" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                {profilePhoto ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
          </div>
        </Card>

        {/* Personal Information */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={20} /> Personal Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input label="Job Title" value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="Lead Cleaner, Supervisor…" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" />
              <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <Input label="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St, City, Province" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Employee ID" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} />
              <Input label="Hire Date" type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
                <div className="px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 text-sm capitalize">{currentUser.role}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Avatar Customization */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={20} /> Avatar Style</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <UserAvatar user={{ ...currentUser, avatarInitials: form.avatarInitials, avatarColor: form.avatarColor }} size="xl" />
            <div className="flex-1 space-y-3 w-full">
              <Input label="Initials (2 letters)" maxLength={2} value={form.avatarInitials} onChange={e => setForm({...form, avatarInitials: e.target.value.toUpperCase()})} placeholder="AR" />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button key={color} onClick={() => setForm({...form, avatarColor: color})}
                      className={`w-8 h-8 rounded-lg ${color} transition-transform ${form.avatarColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500" /> Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Contact Name" value={form.emergencyName} onChange={e => setForm({...form, emergencyName: e.target.value})} placeholder="Jane Doe" />
            <Input label="Phone" type="tel" value={form.emergencyPhone} onChange={e => setForm({...form, emergencyPhone: e.target.value})} placeholder="905-555-0123" />
            <Input label="Relationship" value={form.emergencyRelation} onChange={e => setForm({...form, emergencyRelation: e.target.value})} placeholder="Spouse, Parent…" />
          </div>
        </Card>

        {/* Skills & Certifications */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Award size={20} className="text-purple-500" /> Skills & Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  skills.includes(skill)
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {skills.includes(skill) ? '✓ ' : ''}{skill}
              </button>
            ))}
          </div>
        </Card>

        {/* Availability */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={20} className="text-green-500" /> Availability</h3>
          <div className="space-y-2">
            {DAYS.map(d => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium text-gray-700">{d.label}</span>
                <div className="flex gap-1 flex-1">
                  {SHIFT_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setAvailability(prev => ({ ...prev, [d.key]: prev[d.key] === slot ? 'unavailable' : slot }))}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                        availability[d.key] === slot
                          ? slot === 'morning' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : slot === 'afternoon' ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-gray-50 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Uniform & Equipment */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shirt size={20} className="text-teal-500" /> Uniform & Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">T-Shirt Size</label>
              <select
                value={form.tshirtSize}
                onChange={e => setForm({...form, tshirtSize: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select size…</option>
                {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Equipment Issued" value={form.equipmentIssued} onChange={e => setForm({...form, equipmentIssued: e.target.value})} placeholder="Uniform x2, Safety vest…" />
          </div>
        </Card>

        {/* Payroll Info (owner only) */}
        {isOwner && (
          <Card className="border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={20} className="text-amber-500" /> Payroll Information</h3>
            <p className="text-xs text-gray-500 mb-4">Sensitive information. Stored locally on your device only.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="SIN / Tax ID" value={form.sin} onChange={e => setForm({...form, sin: e.target.value})} placeholder="XXX-XXX-XXX" type="password" />
              <Input label="Banking Details (Direct Deposit)" value={form.bankingInfo} onChange={e => setForm({...form, bankingInfo: e.target.value})} placeholder="Bank, Account#, Transit…" />
            </div>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={20} /> Documents</h3>
          {Object.keys(documents).length > 0 && (
            <div className="space-y-2 mb-4">
              {Object.entries(documents).map(([label, photoId]) => (
                <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <button onClick={() => handleRemoveDoc(label)} className="text-red-400 hover:text-red-600 transition-colors"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={docLabel}
              onChange={e => setDocLabel(e.target.value)}
              placeholder="Document name (e.g. Contract, Cert...)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => docInputRef.current?.click()} disabled={!docLabel.trim()}>
              Add
            </Button>
            <input ref={docInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
          </div>
        </Card>

        {/* Management Notes (owner only) */}
        {isOwner && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Star size={20} className="text-yellow-500" /> Management</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Performance Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setForm({...form, performanceRating: r === form.performanceRating ? 0 : r})}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        r <= form.performanceRating ? 'bg-yellow-100 text-yellow-600 border border-yellow-300' : 'bg-gray-50 text-gray-300 border border-gray-200'
                      }`}
                    >
                      <Star size={18} fill={r <= form.performanceRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Performance notes, comments, reminders…"
                />
              </div>
            </div>
          </Card>
        )}

        <Button onClick={handleSave} icon={Save} size="lg" className="w-full">Save Profile</Button>
      </div>
    </AppShell>
  );
}
