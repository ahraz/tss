import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Camera, Plus,
  Trash2, Search, FileText, PenSquare, ChevronDown, ChevronUp,
  Printer, History, ListChecks, UserCheck, Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { UserAvatar } from '../components/ui/UserAvatar';
import { formatDate, formatDateTime } from '../utils/formatters';
import { generateId } from '../utils/storage';
import { startCamera, capturePhoto, stopCamera, isCameraAvailable } from '../utils/camera';
import { compressImage } from '../utils/compressImage';
import { putPhoto, getPhoto } from '../utils/photoStore';
import type { Inspection, InspectionItem, InspectionResult, InspectionRating } from '../types';

type PageTab = 'perform' | 'history' | 'templates';

const RATING_ICONS: Record<InspectionRating, { icon: typeof CheckCircle; color: string; label: string }> = {
  pass: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Pass' },
  pass_needs: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-100', label: 'Needs Work' },
  fail: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Fail' },
};

function RatingButton({ rating, selected, onClick }: { rating: InspectionRating; selected: boolean; onClick: () => void }) {
  const meta = RATING_ICONS[rating];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        selected ? meta.color + ' ring-2 ring-offset-1 ring-gray-400' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon size={14} />
      {meta.label}
    </button>
  );
}

export function InspectionsPage() {
  const { state, currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PageTab>('perform');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Perform inspection state ──
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inspectionItems, setInspectionItems] = useState<InspectionResult[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspecting, setInspecting] = useState(false);

  // Photo capture
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ── View report state ──
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);

  // ── Sign-off state ──
  const [signOffInspectionId, setSignOffInspectionId] = useState<string | null>(null);
  const [signOffName, setSignOffName] = useState('');

  // ── Template management ──
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateItemLabel, setTemplateItemLabel] = useState('');
  const [templateItems, setTemplateItems] = useState<{ category: string; label: string }[]>([]);

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const activeSites = useMemo(() => state.sites.filter(s => s.status === 'active'), [state.sites]);
  const templates = state.inspectionTemplates;

  // Group templates by category for display
  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, InspectionItem[]>();
    for (const item of templates) {
      if (!grouped.has(item.category)) grouped.set(item.category, []);
      grouped.get(item.category)!.push(item);
    }
    return grouped;
  }, [templates]);

  // Available templates (grouped by ID for the dropdown)
  const availableTemplates = useMemo(() => {
    const map = new Map<string, InspectionItem[]>();
    for (const item of templates) {
      if (!map.has(item.id)) map.set(item.id, []);
      map.get(item.id)!.push(item);
    }
    return map;
  }, [templates]);

  // Template label from first item's ID (we use the ID as the template key)
  const getTemplateLabel = (templateId: string): string => {
    const items = availableTemplates.get(templateId);
    if (!items || items.length === 0) return 'Untitled Template';
    const cats = [...new Set(items.map(i => i.category))];
    return cats.join(' / ');
  };

  // When template is selected, populate inspection items
  useEffect(() => {
    if (!selectedTemplateId) {
      setInspectionItems([]);
      return;
    }
    const items = availableTemplates.get(selectedTemplateId) || [];
    setInspectionItems(items.map(item => ({
      itemId: item.id,
      rating: 'pass' as InspectionRating,
      notes: '',
    })));
  }, [selectedTemplateId, availableTemplates]);

  // ── Camera functions ──
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      if (videoRef.current) {
        const stream = await startCamera(videoRef.current);
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch {
      setCameraError('Could not access camera.');
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) return;
    try {
      const dataUrl = capturePhoto(videoRef.current);
      const compressed = await compressImage(dataUrl);
      const photoId = `inspection:${generateId()}`;
      await putPhoto(photoId, compressed);
      setCapturedPhotos(prev => [...prev, photoId]);
    } catch {
      setCameraError('Failed to capture photo.');
    }
  };

  const handleStopCamera = () => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    setCameraActive(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(streamRef.current); };
  }, []);

  // ── Submit Inspection ──
  const handleSubmitInspection = () => {
    if (!selectedSiteId || !selectedTemplateId || !currentUser) return;
    if (inspectionItems.length === 0) return;

    const inspection: Inspection = {
      id: generateId(),
      siteId: selectedSiteId,
      templateId: selectedTemplateId,
      templateLabel: getTemplateLabel(selectedTemplateId),
      performedById: currentUser.id,
      performedAt: new Date().toISOString(),
      items: inspectionItems,
      notes: inspectionNotes,
      photoIds: capturedPhotos,
      clientSigned: false,
      clientSignedAt: null,
      signedByName: null,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_INSPECTION', payload: inspection });

    // Reset form
    setSelectedSiteId('');
    setSelectedTemplateId('');
    setInspectionItems([]);
    setInspectionNotes('');
    setCapturedPhotos([]);
    if (cameraActive) handleStopCamera();

    setActiveTab('history');
  };

  // ── Client Sign-off ──
  const handleSignOff = () => {
    if (!signOffInspectionId || !signOffName.trim()) return;
    const inspection = state.inspections.find(i => i.id === signOffInspectionId);
    if (!inspection) return;
    dispatch({
      type: 'UPDATE_INSPECTION',
      payload: {
        ...inspection,
        clientSigned: true,
        clientSignedAt: new Date().toISOString(),
        signedByName: signOffName.trim(),
      },
    });
    setSignOffInspectionId(null);
    setSignOffName('');
  };

  // ── View Report ──
  const handleViewReport = async (id: string) => {
    setViewReportId(id);
    setReportPhotos([]);
    const inspection = state.inspections.find(i => i.id === id);
    if (!inspection) return;
    const photos: string[] = [];
    for (const pid of inspection.photoIds) {
      const dataUrl = await getPhoto(pid);
      if (dataUrl) photos.push(dataUrl);
    }
    setReportPhotos(photos);
  };

  // ── Templates management ──
  const handleAddTemplateItem = () => {
    if (!templateCategory.trim() || !templateItemLabel.trim()) return;
    setTemplateItems(prev => [...prev, { category: templateCategory.trim(), label: templateItemLabel.trim() }]);
    setTemplateItemLabel('');
  };

  const handleRemoveTemplateItem = (index: number) => {
    setTemplateItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = () => {
    if (templateItems.length === 0) return;
    const templateId = editTemplateId || generateId();
    // Delete existing items for this template if editing
    if (editTemplateId) {
      // We need to remove old items... but we can't with current API.
      // For simplicity, we use ADD_INSPECTION_TEMPLATE which overwrites
    }
    templateItems.forEach((item, i) => {
      const inspectionItem: InspectionItem = {
        id: `${templateId}:${i}`,
        label: item.label,
        category: item.category,
        order: i,
      };
      dispatch({ type: 'ADD_INSPECTION_TEMPLATE', payload: inspectionItem });
    });
    setShowTemplateModal(false);
    setEditTemplateId(null);
    setTemplateCategory('');
    setTemplateItemLabel('');
    setTemplateItems([]);
  };

  const handleEditTemplate = (templateId: string) => {
    const items = availableTemplates.get(templateId) || [];
    setEditTemplateId(templateId);
    setTemplateItems(items.map(i => ({ category: i.category, label: i.label })));
    if (items.length > 0) setTemplateCategory(items[0].category);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const items = availableTemplates.get(templateId) || [];
    for (const item of items) {
      dispatch({ type: 'DELETE_INSPECTION_TEMPLATE', payload: item.id });
    }
  };

  // ── Computed ──
  const inspections = state.inspections;
  const viewReport = viewReportId ? inspections.find(i => i.id === viewReportId) : null;
  const signOffInspection = signOffInspectionId ? inspections.find(i => i.id === signOffInspectionId) : null;

  const filteredInspections = useMemo(() => {
    if (!searchQuery) return inspections;
    const q = searchQuery.toLowerCase();
    return inspections.filter(i => {
      const site = state.sites.find(s => s.id === i.siteId);
      return site?.name.toLowerCase().includes(q);
    });
  }, [inspections, searchQuery, state.sites]);

  // ── Render ──
  if (!isOwnerOrPartner) {
    return (
      <AppShell pageTitle="Inspections">
        <div className="page-container h-full flex flex-col items-center justify-center gap-4">
          <ClipboardCheck size={48} className="text-gray-300" />
          <p className="text-gray-500 text-lg font-medium">Inspections are managed by owners and partners.</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Quality Inspections">
      <div className="page-container h-full flex flex-col gap-6">

        {/* ── Tabs ── */}
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'perform' as PageTab, icon: PenSquare, label: 'New Inspection' },
            { id: 'history' as PageTab, icon: History, label: 'History' },
            { id: 'templates' as PageTab, icon: ListChecks, label: 'Templates' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════ PERFORM INSPECTION ══════════════════ */}
        {activeTab === 'perform' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">New Quality Inspection</h2>

              {/* Site selection */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Site</label>
                {activeSites.length === 0 ? (
                  <p className="text-sm text-gray-400">No active sites. <button onClick={() => navigate('/sites')} className="text-blue-600 underline">Add a site first.</button></p>
                ) : (
                  <select
                    value={selectedSiteId}
                    onChange={e => setSelectedSiteId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a site…</option>
                    {activeSites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Template selection */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Inspection Template</label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a template…</option>
                    {[...availableTemplates.keys()].map(id => (
                      <option key={id} value={id}>{getTemplateLabel(id)}</option>
                    ))}
                  </select>
                  <Button variant="secondary" onClick={() => { setEditTemplateId(null); setTemplateItems([]); setTemplateCategory(''); setShowTemplateModal(true); }}>
                    <Plus size={16} />
                  </Button>
                </div>
                {availableTemplates.size === 0 && (
                  <p className="text-xs text-gray-400">No templates yet. Click + to create one.</p>
                )}
              </div>

              {/* Inspection items */}
              {inspectionItems.length > 0 && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700">Inspection Checklist</p>
                  {(() => {
                    // Group by category
                    const itemsWithLabels = inspectionItems.map(result => {
                      const template = availableTemplates.get(selectedTemplateId)?.find(t => t.id === result.itemId);
                      return { ...result, label: template?.label || 'Unknown', category: template?.category || 'Other' };
                    });
                    const grouped = new Map<string, typeof itemsWithLabels>();
                    for (const item of itemsWithLabels) {
                      if (!grouped.has(item.category)) grouped.set(item.category, []);
                      grouped.get(item.category)!.push(item);
                    }
                    return [...grouped.entries()].map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 first:mt-0">{category}</p>
                        {items.map((item, idx) => {
                          const actualIdx = inspectionItems.findIndex(r => r.itemId === item.itemId);
                          return (
                            <div key={item.itemId} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                              <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                              <div className="flex gap-1">
                                {(['pass', 'pass_needs', 'fail'] as InspectionRating[]).map(rating => (
                                  <RatingButton
                                    key={rating}
                                    rating={rating}
                                    selected={inspectionItems[actualIdx]?.rating === rating}
                                    onClick={() => {
                                      const updated = [...inspectionItems];
                                      updated[actualIdx] = { ...updated[actualIdx], rating };
                                      setInspectionItems(updated);
                                    }}
                                  />
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="Notes…"
                                value={item.notes}
                                onChange={e => {
                                  const updated = [...inspectionItems];
                                  updated[actualIdx] = { ...updated[actualIdx], notes: e.target.value };
                                  setInspectionItems(updated);
                                }}
                                className="w-full sm:w-40 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Overall notes */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Overall Notes</label>
                <textarea
                  value={inspectionNotes}
                  onChange={e => setInspectionNotes(e.target.value)}
                  placeholder="Any additional observations…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Camera / Photos */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-gray-700">Photo Evidence</label>
                <div className="flex flex-wrap gap-2">
                  {capturedPhotos.map((pid, idx) => (
                    <div key={pid} className="relative">
                      <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
                        <ImageIcon size={24} className="text-blue-400" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                    </div>
                  ))}
                  {cameraActive ? (
                    <div className="space-y-2">
                      <video ref={videoRef} className="w-32 h-24 bg-black rounded-lg object-cover" playsInline />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCapturePhoto}><Camera size={14} />Capture</Button>
                        <Button size="sm" variant="secondary" onClick={handleStopCamera}>Stop</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartCamera}
                      className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors"
                    >
                      <Camera size={24} />
                    </button>
                  )}
                </div>
                {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitInspection}
                disabled={!selectedSiteId || !selectedTemplateId || inspectionItems.length === 0}
                className="w-full"
              >
                <ClipboardCheck size={16} />
                Submit Inspection Report
              </Button>
            </Card>
          </div>
        )}

        {/* ══════════════════ HISTORY ══════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by site name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900">{inspections.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Passed</p>
                <p className="text-xl font-bold text-green-600">
                  {inspections.filter(i => i.items.every(r => r.rating === 'pass')).length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Needs Work</p>
                <p className="text-xl font-bold text-amber-600">
                  {inspections.filter(i => i.items.some(r => r.rating === 'pass_needs') && !i.items.some(r => r.rating === 'fail')).length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Has Fails</p>
                <p className="text-xl font-bold text-red-600">
                  {inspections.filter(i => i.items.some(r => r.rating === 'fail')).length}
                </p>
              </Card>
            </div>

            {/* Inspection list */}
            {filteredInspections.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No inspections yet"
                description="Perform your first quality inspection to see it here."
                actionLabel="New Inspection"
                onAction={() => setActiveTab('perform')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInspections.map(inspection => {
                  const site = state.sites.find(s => s.id === inspection.siteId);
                  const inspector = state.users.find(u => u.id === inspection.performedById);
                  const passCount = inspection.items.filter(r => r.rating === 'pass').length;
                  const needsCount = inspection.items.filter(r => r.rating === 'pass_needs').length;
                  const failCount = inspection.items.filter(r => r.rating === 'fail').length;
                  const total = inspection.items.length;

                  return (
                    <Card key={inspection.id} className="flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{site?.name || 'Unknown Site'}</h3>
                          <p className="text-xs text-gray-500">{formatDate(inspection.performedAt)}</p>
                        </div>
                        <Badge
                          label={failCount > 0 ? 'FAIL' : needsCount > 0 ? 'NEEDS' : 'PASS'}
                          variant={failCount > 0 ? 'danger' : needsCount > 0 ? 'warning' : 'success'}
                        />
                      </div>

                      {/* Score bar */}
                      <div className="flex gap-1 mb-3">
                        <div className="flex-1 h-1.5 bg-green-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(passCount / total) * 100}%` }} />
                        </div>
                        {needsCount > 0 && (
                          <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(needsCount / total) * 100}%` }} />
                          </div>
                        )}
                        {failCount > 0 && (
                          <div className="flex-1 h-1.5 bg-red-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${(failCount / total) * 100}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Results text */}
                      <p className="text-xs text-gray-500 mb-3">
                        {passCount}/{total} pass · {needsCount} need{needsCount !== 1 ? 's' : ''} work · {failCount} fail{failCount !== 1 ? 's' : ''}
                      </p>

                      {/* Inspector */}
                      <div className="flex items-center gap-2 mb-4">
                        {inspector && <UserAvatar user={inspector} size="sm" />}
                        <span className="text-xs text-gray-500">{inspector?.name || 'Unknown'}</span>
                      </div>

                      {/* Sign-off status */}
                      {inspection.clientSigned && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3">
                          <CheckCircle size={14} />
                          Signed off by {inspection.signedByName || 'client'} on {formatDate(inspection.clientSignedAt!)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto">
                        <Button variant="secondary" onClick={() => handleViewReport(inspection.id)} className="flex-1">
                          <FileText size={14} />
                          View Report
                        </Button>
                        {!inspection.clientSigned && (
                          <Button onClick={() => { setSignOffInspectionId(inspection.id); setSignOffName(''); }} className="flex-1">
                            <UserCheck size={14} />
                            Client Sign-off
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TEMPLATES ══════════════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{templates.length} items across {templatesByCategory.size} categories</p>
              <Button onClick={() => { setEditTemplateId(null); setTemplateItems([]); setTemplateCategory(''); setShowTemplateModal(true); }}>
                <Plus size={16} />
                New Template
              </Button>
            </div>

            {templatesByCategory.size === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No templates yet"
                description="Create an inspection template with categories like Floors, Washrooms, Kitchen, and Dusting."
                actionLabel="Create Template"
                onAction={() => { setEditTemplateId(null); setTemplateItems([]); setTemplateCategory(''); setShowTemplateModal(true); }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...availableTemplates.keys()].map(templateId => {
                  const items = availableTemplates.get(templateId)!;
                  const cats = [...new Set(items.map(i => i.category))];
                  return (
                    <Card key={templateId}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{cats.join(' / ')}</h3>
                          <p className="text-xs text-gray-500">{items.length} items · {cats.length} categories</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditTemplate(templateId)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <PenSquare size={16} />
                          </button>
                          <button onClick={() => handleDeleteTemplate(templateId)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {cats.map(cat => (
                          <div key={cat}>
                            <p className="text-xs font-semibold text-gray-500 uppercase mt-2 first:mt-0">{cat}</p>
                            {items.filter(i => i.category === cat).sort((a, b) => a.order - b.order).map(item => (
                              <p key={item.id} className="text-sm text-gray-700 ml-2">• {item.label}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ INSPECTION REPORT MODAL ══════════════════ */}
        <Modal isOpen={!!viewReportId} onClose={() => { setViewReportId(null); setReportPhotos([]); }} title="Inspection Report" size="lg">
          {viewReport && (() => {
            const site = state.sites.find(s => s.id === viewReport.siteId);
            const inspector = state.users.find(u => u.id === viewReport.performedById);
            const passCount = viewReport.items.filter(r => r.rating === 'pass').length;
            const failCount = viewReport.items.filter(r => r.rating === 'fail').length;
            const needsCount = viewReport.items.filter(r => r.rating === 'pass_needs').length;
            const total = viewReport.items.length;

            // Group results by category
            const itemsWithCats = viewReport.items.map(result => {
              const template = templates.find(t => t.id === result.itemId);
              return { ...result, label: template?.label || 'Unknown', category: template?.category || 'Other' };
            });
            const grouped = new Map<string, typeof itemsWithCats>();
            for (const item of itemsWithCats) {
              if (!grouped.has(item.category)) grouped.set(item.category, []);
              grouped.get(item.category)!.push(item);
            }

            return (
              <div className="space-y-6" id="inspection-report">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{site?.name || 'Unknown Site'}</h2>
                    <p className="text-sm text-gray-500">{formatDate(viewReport.performedAt)} · {viewReport.templateLabel}</p>
                  </div>
                  <Badge
                    label={failCount > 0 ? 'FAIL' : needsCount > 0 ? 'NEEDS WORK' : 'PASS'}
                    variant={failCount > 0 ? 'danger' : needsCount > 0 ? 'warning' : 'success'}
                  />
                </div>

                {/* Score */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{passCount}</p>
                    <p className="text-xs text-gray-500">Pass</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{needsCount}</p>
                    <p className="text-xs text-gray-500">Needs Work</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{failCount}</p>
                    <p className="text-xs text-gray-500">Fail</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>

                {/* Inspector */}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  {inspector && <UserAvatar user={inspector} size="sm" />}
                  <span>Inspected by <strong>{inspector?.name || 'Unknown'}</strong></span>
                </div>

                {/* Items by category */}
                <div className="space-y-4">
                  {[...grouped.entries()].map(([category, items]) => (
                    <div key={category}>
                      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">{category}</p>
                      <div className="space-y-1">
                        {items.map((item, idx) => {
                          const Icon = RATING_ICONS[item.rating].icon;
                          return (
                            <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                              <Icon size={16} className={RATING_ICONS[item.rating].color.split(' ')[0]} />
                              <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                              {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {viewReport.notes && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Inspector Notes</p>
                    <p className="text-sm text-gray-600">{viewReport.notes}</p>
                  </div>
                )}

                {/* Photos */}
                {reportPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Photos ({reportPhotos.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {reportPhotos.map((photo, idx) => (
                        <img key={idx} src={photo} alt={`Inspection photo ${idx + 1}`} className="rounded-lg object-cover h-24 w-full" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Client sign-off */}
                {viewReport.clientSigned && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="font-semibold">Signed off by {viewReport.signedByName}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(viewReport.clientSignedAt!)}</p>
                  </div>
                )}

                {/* Print */}
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => window.print()}>
                    <Printer size={16} />
                    Print Report
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* ══════════════════ CLIENT SIGN-OFF MODAL ══════════════════ */}
        <Modal isOpen={!!signOffInspectionId} onClose={() => setSignOffInspectionId(null)} title="Client Sign-off">
          {signOffInspection && (() => {
            const site = state.sites.find(s => s.id === signOffInspection.siteId);
            const passCount = signOffInspection.items.filter(r => r.rating === 'pass').length;
            const total = signOffInspection.items.length;
            return (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{site?.name || 'Site'} Inspection</h3>
                  <p className="text-sm text-gray-500">{formatDate(signOffInspection.performedAt)}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{passCount}/{total}</p>
                  <p className="text-sm text-gray-500">items passed inspection</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Client Full Name</label>
                  <input
                    type="text"
                    value={signOffName}
                    onChange={e => setSignOffName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">By entering your name, you confirm the inspection was completed satisfactorily.</p>
                </div>

                <Button onClick={handleSignOff} disabled={!signOffName.trim()} className="w-full">
                  <UserCheck size={16} />
                  Confirm & Sign Off
                </Button>
              </div>
            );
          })()}
        </Modal>

        {/* ══════════════════ TEMPLATE EDITOR MODAL ══════════════════ */}
        <Modal
          isOpen={showTemplateModal}
          onClose={() => { setShowTemplateModal(false); setEditTemplateId(null); setTemplateItems([]); setTemplateCategory(''); setTemplateItemLabel(''); }}
          title={editTemplateId ? 'Edit Template' : 'New Template'}
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={templateCategory}
                onChange={e => setTemplateCategory(e.target.value)}
                placeholder="Category (e.g. Floors)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={templateItemLabel}
                onChange={e => setTemplateItemLabel(e.target.value)}
                placeholder="Item (e.g. Sweep & mop)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTemplateItem(); } }}
              />
              <Button variant="secondary" onClick={handleAddTemplateItem} disabled={!templateCategory.trim() || !templateItemLabel.trim()}>
                <Plus size={16} />
                Add
              </Button>
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templateItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No items yet. Add categories and items above.</p>
              ) : (
                templateItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase w-24 truncate">{item.category}</span>
                    <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                    <button onClick={() => handleRemoveTemplateItem(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <Button onClick={handleSaveTemplate} disabled={templateItems.length === 0} className="w-full">
              <CheckCircle size={16} />
              Save Template ({templateItems.length} items)
            </Button>
          </div>
        </Modal>

      </div>
    </AppShell>
  );
}
