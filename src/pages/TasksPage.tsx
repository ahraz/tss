import React, { useState, useMemo } from 'react';
import { Plus, Calendar, CheckSquare, MessageSquare, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { format } from 'date-fns';
import { generateId } from '../utils/storage';
import type { Task, TaskStatus, TaskPriority } from '../types';

// ─── Helpers ─────────────────────────────────────────────

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'inprogress',
  inprogress: 'done',
  done: 'todo',
};

const STATUS_ICON: Record<TaskStatus, string> = {
  todo: '○',
  inprogress: '◐',
  done: '●',
};

export function TasksPage() {
  const { state, currentUser, dispatch } = useApp();
  
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSite, setFilterSite] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', assignedUserId: '', siteId: '', priority: 'medium', dueDate: '',
  });

  const isOwnerOrPartner = currentUser?.role === 'owner' || currentUser?.role === 'partner';

  const filteredTasks = useMemo(() => {
    return state.tasks.filter(t => {
      if (!isOwnerOrPartner && t.assignedUserId !== currentUser?.id) return false;
      if (filterAssignee && t.assignedUserId !== filterAssignee) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterSite && t.siteId !== filterSite) return false;
      return true;
    });
  }, [state.tasks, isOwnerOrPartner, currentUser, filterAssignee, filterPriority, filterSite]);

  if (!currentUser) return null;

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { id: 'done', title: 'Done', color: 'bg-green-100 text-green-700' },
  ];

  /** Cycle status: todo → inprogress → done → todo */
  const handleQuickStatusToggle = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = NEXT_STATUS[task.status];
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
    const completedNote = newStatus === 'done' && completionNote ? completionNote : undefined;
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, status: newStatus, completedAt, completedNote }
    });
    if (newStatus !== 'done') setCompletionNote('');
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
    const completedNote = newStatus === 'done' && completionNote ? completionNote : undefined;
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, status: newStatus, completedAt, completedNote }
    });
    if (newStatus !== 'done') setCompletionNote('');
  };

  const handleAddTask = () => {
    if (!formData.title) return;
    const newTask: Task = {
      ...formData as Task,
      id: generateId(),
      status: 'todo',
      isRecurring: false,
      recurringFrequency: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setShowAddModal(false);
    setFormData({ title: '', description: '', assignedUserId: '', siteId: '', priority: 'medium', dueDate: '' });
  };

  const renderTaskCard = (task: Task) => {
    const assignee = state.users.find(u => u.id === task.assignedUserId);
    const site = state.sites.find(s => s.id === task.siteId);
    
    const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
    
    const borderColors = { urgent: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-green-500' };
    const statusColors = { todo: 'text-gray-400 hover:text-blue-500', inprogress: 'text-blue-500 hover:text-green-500', done: 'text-green-500 hover:text-gray-400' };

    return (
      <div 
        key={task.id}
        onClick={() => { setSelectedTask(task); setCompletionNote(task.completedNote || ''); }}
        className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 ${borderColors[task.priority]} cursor-pointer hover:shadow-md transition-shadow group`}
      >
        <div className="flex justify-between items-start mb-2">
          <Badge label={task.priority} variant={task.priority === 'urgent' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'} />
          {/* Quick-toggle status button — always visible */}
          <button
            onClick={(e) => handleQuickStatusToggle(e, task)}
            className={`text-lg font-bold leading-none transition-colors ${statusColors[task.status]}`}
            title={`Click to mark as ${NEXT_STATUS[task.status]}`}
          >
            {STATUS_ICON[task.status]}
          </button>
        </div>
        
        <h4 className={`font-medium mb-1 ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</h4>
        {site && <p className="text-xs text-gray-500 mb-1 truncate">{site.name}</p>}
        {task.description && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {assignee ? (
              <UserAvatar user={assignee} size="sm" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <CheckSquare size={12} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.completedNote && (
              <span className="text-xs text-gray-400 flex items-center gap-1" title={task.completedNote}>
                <MessageSquare size={11} />
              </span>
            )}
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                <Calendar size={12} />
                {format(new Date(task.dueDate), 'MMM d')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell pageTitle="Tasks">
      <div className="page-container h-full flex flex-col gap-6">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center flex-shrink-0">
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            {isOwnerOrPartner && (
              <Select 
                options={state.users.map(u => ({value: u.id, label: u.name}))}
                value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                placeholder="All Assignees"
              />
            )}
            <Select 
              options={[{value:'urgent',label:'Urgent'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}]}
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              placeholder="All Priorities"
            />
            <Select
              options={state.sites.map(s => ({value: s.id, label: s.name}))}
              value={filterSite} onChange={e => setFilterSite(e.target.value)}
              placeholder="All Sites"
            />
          </div>
          <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Task</Button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 flex gap-6 overflow-x-auto pb-4">
          {columns.map(col => {
            const tasksInCol = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[280px] max-w-sm flex flex-col bg-gray-50/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-semibold text-gray-900">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.color}`}>{tasksInCol.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {tasksInCol.map(renderTaskCard)}
                  {tasksInCol.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm font-medium">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Add Task Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Task" size="md">
        <div className="space-y-4">
          <Input label="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Buy supplies" />
          <Textarea label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Assign To" options={state.users.filter(u=>u.isActive).map(u=>({value:u.id, label:u.name}))} value={formData.assignedUserId || ''} onChange={e => setFormData({...formData, assignedUserId: e.target.value})} placeholder="Unassigned" />
            <Select label="Priority" options={[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'urgent',label:'Urgent'}]} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})} />
          </div>
          
          <Select label="Linked Site (Optional)" options={state.sites.map(s=>({value:s.id, label:s.name}))} value={formData.siteId || ''} onChange={e => setFormData({...formData, siteId: e.target.value})} placeholder="None" />
          
          <Input label="Due Date" type="date" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={formData.isRecurring || false} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Recurring task
          </label>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!formData.title}>Create Task</Button>
          </div>
        </div>
      </Modal>

      {/* Task Detail Modal */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task Details" size="md">
        {selectedTask && (() => {
          const assignee = state.users.find(u => u.id === selectedTask.assignedUserId);
          const site = state.sites.find(s => s.id === selectedTask.siteId);
          const isOverdue = selectedTask.dueDate && selectedTask.status !== 'done' && new Date(selectedTask.dueDate) < new Date();
          return (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
                  {site && <p className="text-sm text-gray-500 mt-1">{site.name}</p>}
                </div>
                <Badge label={selectedTask.priority} variant={selectedTask.priority === 'urgent' ? 'danger' : selectedTask.priority === 'medium' ? 'warning' : 'success'} />
              </div>

              {selectedTask.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Status</p>
                  <div className="flex gap-1">
                    {(['todo', 'inprogress', 'done'] as TaskStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selectedTask, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTask.status === s
                            ? s === 'done' ? 'bg-green-600 text-white'
                              : s === 'inprogress' ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {s === 'todo' ? 'To Do' : s === 'inprogress' ? 'In Progress' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Assignee</p>
                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <><UserAvatar user={assignee} size="sm" /><span className="text-sm font-medium text-gray-900">{assignee.name}</span></>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedTask.dueDate && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Due Date</p>
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {format(new Date(selectedTask.dueDate), 'MMM d, yyyy')}
                      {isOverdue && ' ⚠️ Overdue'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Created</p>
                  <p className="text-sm text-gray-900">{format(new Date(selectedTask.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {selectedTask.completedAt && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium uppercase mb-1">Completed</p>
                  <p className="text-sm text-green-800">{format(new Date(selectedTask.completedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}

              {/* Completion note */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase mb-1.5">Completion Note</p>
                <div className="flex gap-2">
                  <Textarea
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    placeholder="Add a note about how this task was completed..."
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      dispatch({
                        type: 'UPDATE_TASK',
                        payload: { ...selectedTask, completedNote: completionNote || undefined }
                      });
                    }}
                    disabled={completionNote === (selectedTask.completedNote || '')}
                    className="self-end"
                  >
                    Save
                  </Button>
                </div>
              </div>

              {selectedTask.isRecurring && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
                  <RotateCcw size={14} />
                  Recurring task {selectedTask.recurringFrequency ? `(${selectedTask.recurringFrequency})` : '(auto-renews)'}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </AppShell>
  );
}
