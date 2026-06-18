import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useActiveShift } from './useActiveShift';
import { putPhoto } from '../utils/photoStore';
import { compressImage } from '../utils/compressImage';
import { generateId } from '../utils/storage';
import type { ChecklistCompletion } from '../types';

export function useClock() {
  const { state, dispatch, currentUser } = useApp();
  const activeShift = useActiveShift();
  const [photo, setPhoto] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistCompletion[]>([]);
  const [notes, setNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Clock in state
  const [selectedSiteId, setSelectedSiteId] = useState('');

  useEffect(() => {
    if (activeShift) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((new Date().getTime() - new Date(activeShift.clockInTime).getTime()) / 1000));
      }, 1000);

      if (checklist.length === 0) {
        const site = state.sites.find(s => s.id === activeShift.siteId);
        if (site) {
          setChecklist(site.checklist.map(i => ({ itemId: i.id, completed: false })));
        }
      }

      return () => clearInterval(interval);
    }
  }, [activeShift, state.sites]);

  const handleCapture = (dataUrl: string) => {
    setPhoto(dataUrl);
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  const handleFallbackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be under 5 MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string).catch(() => reader.result as string);
      setPhoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleClockIn = async () => {
    if (!selectedSiteId) { toast.error('Please select a site'); return; }
    if (!photo) { toast.error('Please take a photo'); return; }

    const shiftId = generateId();
    if (photo) {
      await putPhoto(`shift:${shiftId}:in`, photo).catch(() => {});
    }

    const newShift = {
      id: shiftId,
      userId: currentUser!.id,
      siteId: selectedSiteId,
      clockInTime: new Date().toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: null,
      clockOutPhotoDataUrl: null,
      durationMinutes: null,
      checklistCompletions: [],
      notes: '',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_SHIFT', payload: newShift });
    toast.success('Clocked in successfully');
    setPhoto(null);
  };

  const handleClockOut = async () => {
    if (!photo) { toast.error('Please take a photo to clock out'); return; }

    const durationMins = Math.floor(elapsed / 60);
    if (photo) {
      await putPhoto(`shift:${activeShift!.id}:out`, photo).catch(() => {});
    }

    const completedShift = {
      ...activeShift!,
      clockOutTime: new Date().toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: durationMins,
      checklistCompletions: checklist,
      notes,
      status: 'completed' as const,
    };

    dispatch({ type: 'UPDATE_SHIFT', payload: completedShift });

    setSummaryData({
      siteName: state.sites.find(s => s.id === completedShift.siteId)?.name,
      duration: durationMins,
      earnings: (durationMins / 60) * currentUser!.hourlyRate,
      tasks: checklist.filter(c => c.completed).length,
      totalTasks: checklist.length,
    });

    setPhoto(null);
    setChecklist([]);
    setNotes('');
    setShowSummary(true);
  };

  const toggleChecklist = (itemId: string) => {
    setChecklist(prev => prev.map(c => c.itemId === itemId ? { ...c, completed: !c.completed } : c));
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const siteOptions = currentUser
    ? state.sites
        .filter(s => s.status === 'active')
        .filter(s => currentUser.role === 'employee' ? s.assignedUserIds.includes(currentUser.id) : true)
        .map(s => ({ value: s.id, label: s.name }))
    : [];

  return {
    state, currentUser, activeShift,
    selectedSiteId, setSelectedSiteId,
    photo, setPhoto,
    elapsed, checklist, notes, setNotes,
    showSummary, setShowSummary,
    summaryData,
    siteOptions,
    handleCapture, handleRetake, handleFallbackUpload,
    handleClockIn, handleClockOut, toggleChecklist,
    formatElapsed,
  };
}
