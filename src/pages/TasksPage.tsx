import React, { useState } from 'react';
import { Plus, GripVertical, Calendar, CheckSquare, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { format } from 'date-fns';
import { generateId } from '../utils/storage';
import type { Task, TaskStatus, TaskPriority } from '../types';

export function TasksPage() {
  const { state, currentUser, dispatch } = useApp();
  
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', assignedUserId: '', siteId: '', priority: 'medium', dueDate: '',
  });

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const filteredTasks = state.tasks.filter(t => {
    if (!isOwnerOrPartner && t.assignedUserId !== currentUser.id) return false;
    if (filterAssignee && t.assignedUserId !== filterAssignee) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { id: 'done', title: 'Done', color: 'bg-green-100 text-green-700' },
  ];

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : null }
    });
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

    return (
      <div 
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 ${borderColors[task.priority]} cursor-pointer hover:shadow-md transition-shadow group`}
      >
        <div className="flex justify-between items-start mb-2">
          <Badge label={task.priority} variant={task.priority === 'urgent' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'} />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <select 
              value={task.status} 
              onChange={e => { e.stopPropagation(); handleStatusChange(task, e.target.value as TaskStatus); }}
              className="text-xs bg-gray-100 border-none rounded p-1"
              onClick={e => e.stopPropagation()}
            >
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
        {site && <p className="text-xs text-gray-500 mb-3 truncate">{site.name}</p>}
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5">
            {assignee ? (
              <UserAvatar user={assignee} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <CheckSquare size={14} />
              </div>
            )}
          </div>
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar size={12} />
              {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppShell pageTitle="Tasks">
      <div className="page-container h-full flex flex-col gap-6">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center flex-shrink-0">
          <div className="flex gap-3 w-full md:w-auto">
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
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!formData.title}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
