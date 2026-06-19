import React from 'react';
import { Camera, Upload, X, FileText, User, Award, Calendar, Shirt, DollarSign, Briefcase, AlertTriangle, Save, Car, Globe } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserAvatar } from '../components/ui/UserAvatar';
import { useProfile } from '../hooks/useProfile';

const SKILL_OPTIONS = [
  'High Dusting', 'Carpet Cleaning', 'Floor Buffing', 'Window Cleaning',
  'Pressure Washing', 'Tile & Grout', 'WHMIS Certified', 'First Aid',
  'Biohazard Cleaning', 'Construction Cleanup', 'Deep Cleaning', 'Floor Waxing'
];

const LANGUAGE_OPTIONS = [
  'English', 'French', 'Spanish', 'Punjabi', 'Hindi', 'Tagalog',
  'Mandarin', 'Arabic', 'Portuguese', 'Urdu', 'Tamil',
];

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

export function ProfilePage() {
  const {
    currentUser, isOwnerOrPartner, fileInputRef, docInputRef,
    form, setForm, profilePhoto, photoLoading, skills, languages, availability, documents,
    docLabel, setDocLabel, setAvailability, setLanguages, DAYS, DEFAULT_SLOT,
    handleFilePick, handleRemovePhoto, handleDocUpload, handleRemoveDoc,
    toggleSkill, handleSave,
  } = useProfile();

  if (!currentUser) return null;

  return (
    <AppShell pageTitle="My Profile">
      <div className="page-container max-w-3xl flex flex-col gap-6 pb-8">

        {/* Profile Photo */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Camera size={20} /> Profile Photo</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {photoLoading ? (
                <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
              ) : profilePhoto ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-gray-100">
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  <button onClick={handleRemovePhoto} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-0.5"><X size={14} /></button>
                </div>
              ) : (
                <UserAvatar user={currentUser} size="lg" />
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFilePick} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Upload Photo</Button>
              <p className="text-xs text-gray-400">Recommended: Square image, max 5MB</p>
            </div>
          </div>
        </Card>

        {/* Personal Information */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={20} /> Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="md:col-span-2" />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <Input label="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="md:col-span-2" />
          </div>
        </Card>

        {/* Job Details */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Briefcase size={20} /> Job Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Job Title" value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="e.g. Lead Cleaner" />
            <Input label="Hire Date" type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} />
            <Input label="Employee ID" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} />
            <Input label="SIN" type="password" value={form.sin} onChange={e => setForm({...form, sin: e.target.value})} />
          </div>
        </Card>

        {/* Banking Info */}
        {isOwnerOrPartner && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={20} /> Banking & Payroll</h3>
            <Input label="Banking Information" value={form.bankingInfo} onChange={e => setForm({...form, bankingInfo: e.target.value})} placeholder="Direct deposit details or void cheque info" />
          </Card>
        )}

        {/* Skills */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Award size={20} /> Skills & Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(skill => {
              const selected = skills.includes(skill);
              return (
                <button key={skill} onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selected ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {skill}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Languages */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Globe size={20} /> Languages</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map(lang => {
              const selected = languages.includes(lang);
              return (
                <button key={lang} onClick={() => setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selected ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {lang}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Driver Info */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Car size={20} /> Driver & Vehicle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Driver's License" value={form.driversLicense} onChange={e => setForm({...form, driversLicense: e.target.value})} placeholder="e.g. G Class - ON" />
            <Input label="Vehicle Info" value={form.vehicleInfo} onChange={e => setForm({...form, vehicleInfo: e.target.value})} placeholder="e.g. 2018 Toyota Corolla - White" />
          </div>
        </Card>

        {/* Availability */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={20} /> Availability</h3>
          <div className="space-y-3">
            {DAYS.map(d => {
              const slot = availability[d.key];
              const isAvail = slot != null;
              return (
                <div key={d.key} className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 w-20 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={isAvail} onChange={() =>
                      setAvailability({...availability, [d.key]: isAvail ? null : { ...DEFAULT_SLOT }})
                    } className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    {d.label}
                  </label>
                  {isAvail && (
                    <>
                      <input type="time" value={slot!.start} onChange={e =>
                        setAvailability({...availability, [d.key]: { ...slot!, start: e.target.value }})
                      } className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-gray-400 text-sm">to</span>
                      <input type="time" value={slot!.end} onChange={e =>
                        setAvailability({...availability, [d.key]: { ...slot!, end: e.target.value }})
                      } className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-1">
                        <input type="checkbox" checked={!!slot!.allDay} onChange={() =>
                          setAvailability({...availability, [d.key]: { ...slot!, allDay: !slot!.allDay }})
                        } className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        All day
                      </label>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle size={20} /> Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Contact Name" value={form.emergencyName} onChange={e => setForm({...form, emergencyName: e.target.value})} />
            <Input label="Phone" type="tel" value={form.emergencyPhone} onChange={e => setForm({...form, emergencyPhone: e.target.value})} />
            <Input label="Relationship" value={form.emergencyRelation} onChange={e => setForm({...form, emergencyRelation: e.target.value})} placeholder="e.g. Spouse, Parent" />
          </div>
        </Card>

        {/* Uniform & Equipment */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shirt size={20} /> Uniform & Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T-Shirt Size</label>
              <select value={form.tshirtSize} onChange={e => setForm({...form, tshirtSize: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select size</option>
                {TSHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Equipment Issued" value={form.equipmentIssued} onChange={e => setForm({...form, equipmentIssued: e.target.value})} placeholder="e.g. Scrubber, safety vest" />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={20} /> Notes</h3>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
            placeholder="Internal notes about this employee..." />
        </Card>

        {/* Documents */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={20} /> Documents</h3>
          <p className="text-sm text-gray-500 mb-3">Upload any document type — contracts, certificates, licenses, IDs, insurance, etc.</p>
          <div className="space-y-3">
            {Object.entries(documents).map(([label, dataUrl]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <button onClick={() => handleRemoveDoc(label)} className="text-red-500 hover:text-red-700 transition-colors"><X size={16} /></button>
                </div>
                {dataUrl.startsWith('data:image/') ? (
                  <img src={dataUrl} alt={label} className="max-w-full rounded border border-gray-200" style={{ maxHeight: 200 }} />
                ) : (
                  <a href={dataUrl} download={label} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <FileText size={14} /> View / Download
                  </a>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <input type="text" value={docLabel} onChange={e => setDocLabel(e.target.value)} placeholder="Document name (e.g. SIN Card, Certificate)..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="file" ref={docInputRef} className="hidden" onChange={handleDocUpload} />
              <Button variant="secondary" onClick={() => docInputRef.current?.click()} disabled={!docLabel.trim()}>
                <Upload size={16} /> Upload
              </Button>
            </div>
          </div>
        </Card>

        {/* Save */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white py-4">
          <Button onClick={handleSave} className="w-full"><Save size={16} /> Save Profile</Button>
        </div>
      </div>
    </AppShell>
  );
}
