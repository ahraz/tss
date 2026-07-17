import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Coffee, AlertTriangle, ShoppingCart, Clock as ClockIcon } from 'lucide-react';

import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { CameraCapture } from '../components/ui/CameraCapture';
import { useClock } from '../hooks/useClock';
import { formatDuration, formatCAD } from '../utils/formatters';

export function ClockPage() {
  const navigate = useNavigate();

  const {
    state, currentUser,
    activeShift,
    selectedSiteId, setSelectedSiteId,
    photo,
    elapsed, checklist, notes, setNotes,
    showSummary, setShowSummary,
    summaryData,
    siteOptions,
    handleCapture, handleRetake, handleFallbackUpload,
    handleClockIn, handleClockOut, toggleChecklist,
    formatElapsed,
    // New superpowers
    onBreak, breakTotalSeconds, formatWorkElapsed, handleStartBreak, handleEndBreak,
    showSupplyModal, setShowSupplyModal,
    supplyDescription, setSupplyDescription,
    handleReportSupplyIssue,
  } = useClock();

  if (!currentUser) return null;

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

              <CameraCapture
                photo={photo}
                onPhotoCapture={handleCapture}
                onRetake={handleRetake}
                onFallbackUpload={handleFallbackUpload}
              />

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
            {/* Clock In Header */}
            <div className={`rounded-xl p-6 text-center shadow-lg ${onBreak ? 'bg-amber-500' : 'bg-blue-600'}`}>
              {onBreak && (
                <p className="text-amber-200 text-sm font-medium uppercase tracking-wider mb-1">ON BREAK</p>
              )}
              <p className={`text-sm font-medium uppercase tracking-wider mb-1 ${onBreak ? 'text-amber-200' : 'text-blue-200'}`}>
                {onBreak ? 'Take your time' : 'Currently Clocked In'}
              </p>
              <h2 className="text-xl font-bold mb-4">{state.sites.find(s => s.id === activeShift.siteId)?.name}</h2>
              <div className="font-mono text-5xl sm:text-6xl font-light tracking-tight">{formatElapsed(elapsed)}</div>
              <p className="text-xs mt-2 text-white/70">Work: {formatWorkElapsed()} · Break: {Math.floor(breakTotalSeconds / 60)}min</p>
              <p className={`text-sm mt-4 ${onBreak ? 'text-amber-200' : 'text-blue-200'}`}>
                Started at {new Date(activeShift.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>

            {/* Break Controls */}
            <Card className={onBreak ? 'border-amber-200 bg-amber-50/30' : ''}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Coffee size={18} /> Break
                </h3>
                {onBreak ? (
                  <Button variant="secondary" size="sm" onClick={handleEndBreak} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200">
                    <ClockIcon size={14} /> End Break
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={handleStartBreak}>
                    <Coffee size={14} /> Start Break
                  </Button>
                )}
              </div>
              {onBreak && (
                <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={14} /> Break in progress — clock is paused
                </p>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckSquare size={18} /> Cleaning Checklist</h3>
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

            {/* Supply / Issue Reporting */}
            <Card className="border-dashed border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Need supplies or reporting an issue?</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowSupplyModal(true)}>
                  <AlertTriangle size={14} /> Report
                </Button>
              </div>
            </Card>

            <Card className="space-y-6 border-amber-200 bg-amber-50/30">
              <h3 className="font-semibold text-gray-900 text-center">Ready to leave?</h3>
              <CameraCapture
                photo={photo}
                onPhotoCapture={handleCapture}
                onRetake={handleRetake}
                onFallbackUpload={handleFallbackUpload}
              />
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
                  <p className="text-xs text-gray-500 uppercase font-medium">Break</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDuration(Math.floor(breakTotalSeconds / 60))}</p>
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

        {/* Supply / Issue Report Modal */}
        <Modal isOpen={showSupplyModal} onClose={() => setShowSupplyModal(false)} title="Report Supply Need or Issue" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Describe what supplies are needed or what issue you're encountering. A task will be created for management.</p>
            <Textarea
              value={supplyDescription}
              onChange={e => setSupplyDescription(e.target.value)}
              placeholder="e.g., Running low on glass cleaner, need new mop head..."
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowSupplyModal(false)}>Cancel</Button>
              <Button onClick={handleReportSupplyIssue} disabled={!supplyDescription.trim()}>
                <AlertTriangle size={14} /> Submit Report
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </AppShell>
  );
}
