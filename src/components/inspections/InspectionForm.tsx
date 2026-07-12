import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Camera, Plus, Image as ImageIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RatingButton } from './RatingButton';
import type { InspectionRating } from '../../types';

interface Props {
  activeSites: { id: string; name: string }[];
  availableTemplates: Map<string, { id: string; label: string; category: string }[]>;
  getTemplateLabel: (id: string) => string;
  selectedSiteId: string;
  onSiteChange: (id: string) => void;
  selectedTemplateId: string;
  onTemplateChange: (id: string) => void;
  inspectionItems: { itemId: string; rating: InspectionRating; notes: string }[];
  onItemRatingChange: (itemId: string, rating: InspectionRating) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
  inspectionNotes: string;
  onNotesChange: (v: string) => void;
  cameraActive: boolean;
  cameraError: string | null;
  capturedPhotos: string[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStartCamera: () => void;
  onCapturePhoto: () => void;
  onStopCamera: () => void;
  onSubmit: () => void;
  onNewTemplate: () => void;
}

export function InspectionForm({
  activeSites, availableTemplates, getTemplateLabel,
  selectedSiteId, onSiteChange,
  selectedTemplateId, onTemplateChange,
  inspectionItems, onItemRatingChange, onItemNotesChange,
  inspectionNotes, onNotesChange,
  cameraActive, cameraError, capturedPhotos,
  videoRef, onStartCamera, onCapturePhoto, onStopCamera,
  onSubmit, onNewTemplate,
}: Props) {
  const navigate = useNavigate();

  // Group items by category for display
  const itemsWithLabels = inspectionItems.map(result => {
    const template = selectedTemplateId ? availableTemplates.get(selectedTemplateId)?.find(t => t.id === result.itemId) : undefined;
    return { ...result, label: template?.label || 'Unknown', category: template?.category || 'Other' };
  });
  const grouped = new Map<string, typeof itemsWithLabels>();
  for (const item of itemsWithLabels) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Quality Inspection</h2>

        {/* Site selection */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Site</label>
          {activeSites.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active sites. <button onClick={() => navigate('/sites')} className="text-blue-600 underline">Add a site first.</button>
            </p>
          ) : (
            <select
              value={selectedSiteId}
              onChange={e => onSiteChange(e.target.value)}
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
              onChange={e => onTemplateChange(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template…</option>
              {[...availableTemplates.keys()].map(id => (
                <option key={id} value={id}>{getTemplateLabel(id)}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={onNewTemplate}>
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
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 first:mt-0">{category}</p>
                {items.map(item => (
                  <div key={item.itemId} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                    <div className="flex gap-1">
                      {(['pass', 'pass_needs', 'fail'] as InspectionRating[]).map(rating => (
                        <RatingButton
                          key={rating}
                          rating={rating}
                          selected={item.rating === rating}
                          onClick={() => onItemRatingChange(item.itemId, rating)}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Notes…"
                      value={item.notes}
                      onChange={e => onItemNotesChange(item.itemId, e.target.value)}
                      className="w-full sm:w-40 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Overall notes */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Overall Notes</label>
          <textarea
            value={inspectionNotes}
            onChange={e => onNotesChange(e.target.value)}
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
                  <Button size="sm" onClick={onCapturePhoto}><Camera size={14} />Capture</Button>
                  <Button size="sm" variant="secondary" onClick={onStopCamera}>Stop</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={onStartCamera}
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
          onClick={onSubmit}
          disabled={!selectedSiteId || !selectedTemplateId || inspectionItems.length === 0}
          className="w-full"
        >
          <ClipboardCheck size={16} />
          Submit Inspection Report
        </Button>
      </Card>
    </div>
  );
}
