import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { startCamera, capturePhoto, stopCamera } from '../utils/camera';
import { compressImage } from '../utils/compressImage';
import { putPhoto, getPhoto } from '../utils/photoStore';
import { generateId } from '../utils/storage';
import type { Inspection, InspectionItem, InspectionResult, InspectionRating } from '../types';

type PageTab = 'perform' | 'history' | 'templates';

export function useInspections() {
  const { state, currentUser, dispatch } = useApp();

  const [activeTab, setActiveTab] = useState<PageTab>('perform');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Perform inspection state ──
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedTemplateId, _setSelectedTemplateId] = useState('');
  const [inspectionItems, setInspectionItems] = useState<InspectionResult[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');

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

  const getTemplateLabel = (templateId: string): string => {
    const items = availableTemplates.get(templateId);
    if (!items || items.length === 0) return 'Untitled Template';
    const cats = [...new Set(items.map(i => i.category))];
    return cats.join(' / ');
  };

  // Populate inspection items when template is selected
  const setSelectedTemplateId = useCallback((id: string) => {
    _setSelectedTemplateId(id);
    if (id) {
      const items = availableTemplates.get(id) || [];
      setInspectionItems(items.map(item => ({
        itemId: item.id,
        rating: 'pass' as InspectionRating,
        notes: '',
      })));
    } else {
      setInspectionItems([]);
    }
  }, [availableTemplates]);

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
  const viewReport = viewReportId ? inspections.find(i => i.id === viewReportId) ?? null : null;
  const signOffInspection = signOffInspectionId ? inspections.find(i => i.id === signOffInspectionId) ?? null : null;

  const filteredInspections = useMemo(() => {
    if (!searchQuery) return inspections;
    const q = searchQuery.toLowerCase();
    return inspections.filter(i => {
      const site = state.sites.find(s => s.id === i.siteId);
      return site?.name.toLowerCase().includes(q);
    });
  }, [inspections, searchQuery, state.sites]);

  return {
    // State
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    isOwnerOrPartner,
    activeSites,
    templates, templatesByCategory, availableTemplates,
    getTemplateLabel,
    // Inspection form
    selectedSiteId, setSelectedSiteId,
    selectedTemplateId, setSelectedTemplateId,
    inspectionItems, setInspectionItems,
    inspectionNotes, setInspectionNotes,
    // Camera
    videoRef, streamRef,
    cameraActive, setCameraActive,
    capturedPhotos, setCapturedPhotos,
    cameraError, setCameraError,
    handleStartCamera, handleCapturePhoto, handleStopCamera,
    handleSubmitInspection,
    // Sign-off
    signOffInspectionId, setSignOffInspectionId,
    signOffName, setSignOffName,
    handleSignOff, signOffInspection,
    // View report
    viewReportId, setViewReportId,
    reportPhotos, setReportPhotos,
    handleViewReport, viewReport,
    // Templates
    showTemplateModal, setShowTemplateModal,
    editTemplateId, setEditTemplateId,
    templateCategory, setTemplateCategory,
    templateItemLabel, setTemplateItemLabel,
    templateItems, setTemplateItems,
    handleAddTemplateItem, handleRemoveTemplateItem,
    handleSaveTemplate, handleEditTemplate, handleDeleteTemplate,
    // Computed
    inspections, filteredInspections,
  };
}
