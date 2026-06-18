import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, PenSquare, History, ListChecks
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { useInspections } from '../hooks/useInspections';
import { InspectionForm } from '../components/inspections/InspectionForm';
import { InspectionHistory } from '../components/inspections/InspectionHistory';
import { TemplateManager } from '../components/inspections/TemplateManager';
import { InspectionReportModal } from '../components/inspections/InspectionReportModal';
import { SignOffModal } from '../components/inspections/SignOffModal';
import { TemplateModal } from '../components/inspections/TemplateModal';

type PageTab = 'perform' | 'history' | 'templates';

export function InspectionsPage() {
  const { state, currentUser } = useApp();
  const navigate = useNavigate();
  const hook = useInspections();
  const {
    activeTab, setActiveTab, searchQuery, setSearchQuery,
    isOwnerOrPartner, activeSites, templates, templatesByCategory,
    availableTemplates, getTemplateLabel,
    selectedSiteId, setSelectedSiteId,
    selectedTemplateId, setSelectedTemplateId,
    inspectionItems, setInspectionItems,
    inspectionNotes, setInspectionNotes,
    videoRef, cameraActive, cameraError, capturedPhotos,
    handleStartCamera, handleCapturePhoto, handleStopCamera,
    handleSubmitInspection,
    signOffInspectionId, setSignOffInspectionId,
    signOffName, setSignOffName,
    handleSignOff, signOffInspection,
    viewReportId, setViewReportId,
    reportPhotos, setReportPhotos,
    handleViewReport, viewReport,
    showTemplateModal, setShowTemplateModal,
    editTemplateId, setEditTemplateId,
    templateCategory, setTemplateCategory,
    templateItemLabel, setTemplateItemLabel,
    templateItems, setTemplateItems,
    handleAddTemplateItem, handleRemoveTemplateItem,
    handleSaveTemplate, handleEditTemplate, handleDeleteTemplate,
    inspections, filteredInspections,
  } = hook;

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

  const openNewTemplate = () => {
    setEditTemplateId(null);
    setTemplateItems([]);
    setTemplateCategory('');
    setShowTemplateModal(true);
  };

  return (
    <AppShell pageTitle="Quality Inspections">
      <div className="page-container h-full flex flex-col gap-6">

        {/* Tabs */}
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

        {/* Perform */}
        {activeTab === 'perform' && (
          <InspectionForm
            activeSites={activeSites}
            availableTemplates={availableTemplates}
            getTemplateLabel={getTemplateLabel}
            selectedSiteId={selectedSiteId}
            onSiteChange={setSelectedSiteId}
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={setSelectedTemplateId}
            inspectionItems={inspectionItems}
            onItemRatingChange={(itemId, rating) => {
              setInspectionItems(prev => prev.map(r => r.itemId === itemId ? { ...r, rating } : r));
            }}
            onItemNotesChange={(itemId, notes) => {
              setInspectionItems(prev => prev.map(r => r.itemId === itemId ? { ...r, notes } : r));
            }}
            inspectionNotes={inspectionNotes}
            onNotesChange={setInspectionNotes}
            cameraActive={cameraActive}
            cameraError={cameraError}
            capturedPhotos={capturedPhotos}
            videoRef={videoRef}
            onStartCamera={handleStartCamera}
            onCapturePhoto={handleCapturePhoto}
            onStopCamera={handleStopCamera}
            onSubmit={handleSubmitInspection}
            onNewTemplate={openNewTemplate}
          />
        )}

        {/* History */}
        {activeTab === 'history' && (
          <InspectionHistory
            inspections={inspections}
            filteredInspections={filteredInspections}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sites={state.sites}
            users={state.users}
            onViewReport={handleViewReport}
            onSignOff={id => { setSignOffInspectionId(id); setSignOffName(''); }}
            onNewInspection={() => setActiveTab('perform')}
          />
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <TemplateManager
            templatesByCategory={templatesByCategory}
            availableTemplates={availableTemplates}
            templates={templates}
            onNewTemplate={openNewTemplate}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {/* Modals */}
        <InspectionReportModal
          isOpen={!!viewReportId}
          viewReport={viewReport}
          reportPhotos={reportPhotos}
          sites={state.sites}
          users={state.users}
          templates={templates}
          onClose={() => { setViewReportId(null); setReportPhotos([]); }}
        />

        <SignOffModal
          isOpen={!!signOffInspectionId}
          inspection={signOffInspection}
          signOffName={signOffName}
          onNameChange={setSignOffName}
          onSignOff={handleSignOff}
          onClose={() => { setSignOffInspectionId(null); setSignOffName(''); }}
        />

        <TemplateModal
          isOpen={showTemplateModal}
          editTemplateId={editTemplateId}
          templateCategory={templateCategory}
          templateItemLabel={templateItemLabel}
          templateItems={templateItems}
          onCategoryChange={setTemplateCategory}
          onItemLabelChange={setTemplateItemLabel}
          onAddItem={handleAddTemplateItem}
          onRemoveItem={handleRemoveTemplateItem}
          onSave={handleSaveTemplate}
          onClose={() => { setShowTemplateModal(false); setEditTemplateId(null); setTemplateItems([]); setTemplateCategory(''); setTemplateItemLabel(''); }}
        />
      </div>
    </AppShell>
  );
}
