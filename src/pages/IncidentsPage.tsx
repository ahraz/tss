import React, { useState } from 'react';
import { AlertTriangle, Plus, Building2, User, Calendar, Search, ChevronDown, Flag, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { generateId } from '../utils/storage';
import { putPhoto, getPhoto } from '../utils/photoStore';
import { compressImage } from '../utils/compressImage';
import type { IncidentReport, IncidentSeverity } from '../types';

const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

export function IncidentsPage() {
  const { state, dispatch, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    siteId: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    severity: 'moderate' as IncidentSeverity,
    description: '',
    actionTaken: '',
    witnessName: '',
    witnessPhone: '',
    witnessStatement: '',
    medicalAttention: false,
    medicalDetails: '',
    propertyDamage: false,
    propertyDamageDetails: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);

  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'partner';
  if (!isOwner) return null;

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 1200, 0.7).catch(() => reader.result as string);
      setPhotos(prev => [...prev, compressed]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!form.siteId || !form.description.trim()) {
      toast.error('Site and description are required');
      return;
    }

    const reportId = generateId();
    const photoIds: string[] = [];

    // Save photos to IndexedDB
    photos.forEach((dataUrl, i) => {
      const photoId = `incident:${reportId}:${i}`;
      putPhoto(photoId, dataUrl);
      photoIds.push(photoId);
    });

    const report: IncidentReport = {
      id: reportId,
      siteId: form.siteId,
      reportedById: currentUser!.id,
      occurredAt: new Date(form.occurredAt).toISOString(),
      severity: form.severity,
      description: form.description.trim(),
      actionTaken: form.actionTaken.trim(),
      witnessName: form.witnessName.trim() || undefined,
      witnessPhone: form.witnessPhone.trim() || undefined,
      witnessStatement: form.witnessStatement.trim() || undefined,
      photoIds,
      medicalAttention: form.medicalAttention,
      medicalDetails: form.medicalDetails.trim() || undefined,
      propertyDamage: form.propertyDamage,
      propertyDamageDetails: form.propertyDamageDetails.trim() || undefined,
      status: 'open',
      resolvedAt: null,
      resolvedById: null,
      resolutionNotes: null,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_INCIDENT_REPORT', payload: report });
    toast.success('Incident report filed');
    setShowForm(false);
    setForm({
      siteId: '', occurredAt: new Date().toISOString().slice(0, 16),
      severity: 'moderate', description: '', actionTaken: '',
      witnessName: '', witnessPhone: '', witnessStatement: '',
      medicalAttention: false, medicalDetails: '',
      propertyDamage: false, propertyDamageDetails: '',
    });
    setPhotos([]);
  };

  const severityColor = (s: IncidentSeverity) => {
    switch (s) {
      case 'minor': return 'success';
      case 'moderate': return 'warning';
      case 'major': return 'danger';
      case 'critical': return 'danger';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'danger';
      case 'investigating': return 'warning';
      case 'resolved': return 'success';
      default: return 'neutral';
    }
  };

  const sortedReports = [...state.incidentReports].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AppShell pageTitle="Incident Reports">
      <div className="page-container max-w-4xl flex flex-col gap-6 pb-8">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{state.incidentReports.length} report{state.incidentReports.length !== 1 ? 's' : ''}</p>
          <Button icon={Plus} onClick={() => setShowForm(true)}>File Report</Button>
        </div>

        {sortedReports.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No incident reports</p>
              <p className="text-xs mt-1">File a report when something happens at a site.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedReports.map(report => {
              const site = state.sites.find(s => s.id === report.siteId);
              const reporter = state.users.find(u => u.id === report.reportedById);
              const isExpanded = expandedId === report.id;

              return (
                <Card key={report.id}
                  className={`border-l-4 cursor-pointer transition-colors ${
                    report.status === 'resolved' ? 'border-l-green-500 opacity-70'
                    : report.severity === 'critical' || report.severity === 'major' ? 'border-l-red-500'
                    : 'border-l-amber-500'
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-sm">{site?.name || 'Unknown Site'}</h4>
                        <Badge label={report.severity} variant={severityColor(report.severity)} className="text-[10px]" />
                        <Badge label={report.status} variant={statusColor(report.status)} className="text-[10px]" />
                      </div>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={12} />{format(new Date(report.occurredAt), 'MMM d, yyyy h:mm a')}</span>
                        {reporter && <span className="flex items-center gap-1"><User size={12} />{reporter.name}</span>}
                        {report.photoIds.length > 0 && <span>{report.photoIds.length} photo{report.photoIds.length !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-gray-400 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {report.actionTaken && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Action Taken</p>
                          <p className="text-sm text-gray-700 mt-1">{report.actionTaken}</p>
                        </div>
                      )}
                      {report.witnessName && (
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-blue-700">Witness: {report.witnessName}</p>
                          {report.witnessPhone && <p className="text-xs text-blue-600 mt-0.5">{report.witnessPhone}</p>}
                          {report.witnessStatement && <p className="text-xs text-blue-700 mt-1 italic">"{report.witnessStatement}"</p>}
                        </div>
                      )}
                      {report.medicalAttention && (
                        <div className="bg-red-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700">Medical Attention Required</p>
                          {report.medicalDetails && <p className="text-xs text-red-600 mt-1">{report.medicalDetails}</p>}
                        </div>
                      )}
                      {report.propertyDamage && (
                        <div className="bg-amber-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-700">Property Damage</p>
                          {report.propertyDamageDetails && <p className="text-xs text-amber-600 mt-1">{report.propertyDamageDetails}</p>}
                        </div>
                      )}
                      {report.resolutionNotes && (
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-green-700">Resolution</p>
                          <p className="text-xs text-green-600 mt-1">{report.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Report Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="File Incident Report" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Select
            label="Site"
            options={state.sites.map(s => ({ value: s.id, label: s.name }))}
            value={form.siteId}
            onChange={e => setForm({...form, siteId: e.target.value})}
            placeholder="Where did it happen?"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date & Time" type="datetime-local" value={form.occurredAt} onChange={e => setForm({...form, occurredAt: e.target.value})} required />
            <Select label="Severity" options={SEVERITIES} value={form.severity} onChange={e => setForm({...form, severity: e.target.value as IncidentSeverity})} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description of Incident *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="What happened? Include details…"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Immediate Action Taken</label>
            <textarea value={form.actionTaken} onChange={e => setForm({...form, actionTaken: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[60px]"
              placeholder="What did you do immediately after?"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Witness</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Name" value={form.witnessName} onChange={e => setForm({...form, witnessName: e.target.value})} />
              <Input label="Phone" value={form.witnessPhone} onChange={e => setForm({...form, witnessPhone: e.target.value})} />
              <Input label="Statement" value={form.witnessStatement} onChange={e => setForm({...form, witnessStatement: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.medicalAttention} onChange={e => setForm({...form, medicalAttention: e.target.checked})} className="rounded text-blue-600" />
              <span className="text-sm text-gray-700">Medical attention required?</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.propertyDamage} onChange={e => setForm({...form, propertyDamage: e.target.checked})} className="rounded text-blue-600" />
              <span className="text-sm text-gray-700">Property damaged?</span>
            </label>
          </div>

          {(form.medicalAttention) && (
            <Input label="Medical Details" value={form.medicalDetails} onChange={e => setForm({...form, medicalDetails: e.target.value})} />
          )}
          {(form.propertyDamage) && (
            <Input label="Property Damage Details" value={form.propertyDamageDetails} onChange={e => setForm({...form, propertyDamageDetails: e.target.value})} />
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Photos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photos.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                  >×</button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400">
                <Plus size={20} className="text-gray-400" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>File Report</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
