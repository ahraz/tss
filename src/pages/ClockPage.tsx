import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Clock, CheckSquare, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { startCamera, capturePhoto, stopCamera, isCameraAvailable } from '../utils/camera';
import { generateId } from '../utils/storage';
import { putPhoto } from '../utils/photoStore';
import { compressImage } from '../utils/compressImage';
import { formatDuration, formatCAD } from '../utils/formatters';
import { useActiveShift } from '../hooks/useActiveShift';
import type { ChecklistCompletion } from '../types';

export function ClockPage() {
  const { state, dispatch, currentUser } = useApp();
  const navigate = useNavigate();
  const activeShift = useActiveShift();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  
  // No shift state
  const [selectedSiteId, setSelectedSiteId] = useState('');
  
  // Active shift state
  const [elapsed, setElapsed] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistCompletion[]>([]);
  const [notes, setNotes] = useState('');
  
  // Summary modal
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const initCamera = useCallback(async () => {
    if (videoRef.current && isCameraAvailable()) {
      try {
        const s = await startCamera(videoRef.current);
        setStream(s);
        setCameraError(false);
      } catch (e) {
        console.error(e);
        setCameraError(true);
      }
    } else {
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    if (!photo && !showSummary) {
      initCamera();
    }
    return () => {
      stopCamera(stream);
    };
  }, [photo, showSummary, initCamera]);

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

  const handleCapture = async () => {
    if (videoRef.current && stream) {
      const dataUrl = capturePhoto(videoRef.current);
      const compressed = await compressImage(dataUrl).catch(() => dataUrl);
      setPhoto(compressed);
      stopCamera(stream);
      setStream(null);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const handleClockIn = async () => {
    if (!selectedSiteId) {
      toast.error('Please select a site');
      return;
    }
    if (!photo && isCameraAvailable() && !cameraError) {
      toast.error('Please take a photo');
      return;
    }

    const shiftId = generateId();
    // Store photo in IndexedDB instead of localStorage to avoid quota issues
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
    if (!photo && isCameraAvailable() && !cameraError) {
      toast.error('Please take a photo to clock out');
      return;
    }

    const durationMins = Math.floor(elapsed / 60);

    // Store clock-out photo in IndexedDB
    if (photo) {
      await putPhoto(`shift:${activeShift!.id}:out`, photo).catch(() => {});
    }

    const completedShift = {
      ...activeShift!,
      clockOutTime: new Date().toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: durationMins,
      checklistCompletions: checklist,
      notes: notes,
      status: 'completed' as const,
    };

    dispatch({ type: 'UPDATE_SHIFT', payload: completedShift });
    
    setSummaryData({
      siteName: state.sites.find(s => s.id === completedShift.siteId)?.name,
      duration: durationMins,
      earnings: (durationMins / 60) * currentUser!.hourlyRate,
      tasks: checklist.filter(c => c.completed).length,
      totalTasks: checklist.length
    });
    
    setPhoto(null);
    setChecklist([]);
    setNotes('');
    setShowSummary(true);
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleChecklist = (itemId: string) => {
    setChecklist(prev => prev.map(c => c.itemId === itemId ? { ...c, completed: !c.completed } : c));
  };

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

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

  const renderCamera = () => (
    <div className="bg-black rounded-xl overflow-hidden relative aspect-[3/4] max-h-[50vh] w-full flex items-center justify-center border-4 border-gray-900 shadow-inner">
      {photo ? (
        <img src={photo} alt="Captured" className="w-full h-full object-cover" />
      ) : cameraError ? (
        <div className="text-center p-6 bg-gray-900 w-full h-full flex flex-col items-center justify-center">
          <AlertCircle className="text-gray-400 mb-2" size={32} />
          <p className="text-gray-300 text-sm mb-4">Camera not available.</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors">
            Upload Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFallbackUpload} />
          </label>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      )}
      
      {!photo && !cameraError && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button 
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white/20 border-4 border-white backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </button>
        </div>
      )}
    </div>
  );

  if (!currentUser) return null;

  const siteOptions = state.sites
    .filter(s => s.status === 'active')
    .filter(s => currentUser.role === 'employee' ? s.assignedUserIds.includes(currentUser.id) : true)
    .map(s => ({ value: s.id, label: s.name }));

  return (
    <AppShell pageTitle="Clock In / Out">
      <div className="page-container max-w-lg">
        
        {!activeShift ? (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 text-center">Start Your Shift</h1>
            <Card className="space-y-6 p-4 sm:p-6 border-blue-100 shadow-md">
              <Select 
                label="Select Site" 
                options={siteOptions} 
                value={selectedSiteId} 
                onChange={(e) => setSelectedSiteId(e.target.value)} 
                placeholder="-- Choose site --"
              />
              
              {renderCamera()}

              {photo ? (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={handleRetake}>Retake</Button>
                  <Button className="flex-1" onClick={handleClockIn}>Confirm Clock In</Button>
                </div>
              ) : (
                <p className="text-sm text-center text-gray-500 font-medium">Take a photo to verify your location.</p>
              )}
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-600 text-white rounded-xl p-6 text-center shadow-lg">
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Currently Clocked In</p>
              <h2 className="text-xl font-bold mb-4">{state.sites.find(s => s.id === activeShift.siteId)?.name}</h2>
              <div className="font-mono text-5xl sm:text-6xl font-light tracking-tight">{formatElapsed(elapsed)}</div>
              <p className="text-blue-200 text-sm mt-4">Started at {new Date(activeShift.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckSquare size={18}/> Cleaning Checklist</h3>
              <div className="space-y-2">
                {state.sites.find(s => s.id === activeShift.siteId)?.checklist.map(item => {
                  const isChecked = checklist.find(c => c.itemId === item.id)?.completed;
                  return (
                    <label key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleChecklist(item.id)}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Add Notes</h3>
              <Textarea 
                placeholder="Any issues or supplies needed?" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </Card>

            <Card className="space-y-6 border-amber-200 bg-amber-50/30">
              <h3 className="font-semibold text-gray-900 text-center">Ready to leave?</h3>
              {renderCamera()}
              {photo ? (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={handleRetake}>Retake</Button>
                  <Button variant="danger" className="flex-1" onClick={handleClockOut}>Confirm Clock Out</Button>
                </div>
              ) : (
                <p className="text-sm text-center text-gray-500 font-medium">Take a photo to end your shift.</p>
              )}
            </Card>
          </div>
        )}

        <Modal isOpen={showSummary} onClose={() => { setShowSummary(false); navigate('/'); }} title="Shift Completed">
          {summaryData && (
            <div className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Great Job!</h3>
              <p className="text-gray-500 mb-6">{summaryData.siteName}</p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Time</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDuration(summaryData.duration)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Tasks</p>
                  <p className="text-lg font-semibold text-gray-900">{summaryData.tasks} / {summaryData.totalTasks}</p>
                </div>
                {currentUser.role === 'employee' && (
                  <div className="col-span-2 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-medium">Est. Earnings</p>
                    <p className="text-xl font-bold text-green-600">{formatCAD(summaryData.earnings)}</p>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={() => { setShowSummary(false); navigate('/'); }}>Back to Dashboard</Button>
            </div>
          )}
        </Modal>

      </div>
    </AppShell>
  );
}
