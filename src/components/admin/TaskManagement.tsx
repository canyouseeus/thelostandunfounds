/**
 * Task Management Component
 * Atlassian-style kanban board with tasks, projects, and checklists
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { CheckSquare, Plus, Edit, Trash2, Save, X, Calendar, User, Tag, Filter } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  project?: string;
  due_date?: string;
  tags: string[];
  checklist: { id: string; text: string; completed: boolean }[];
  created_at: string;
  updated_at: string;
}

const statusColumns = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-500/20' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500/20' },
  { id: 'review', label: 'Review', color: 'bg-yellow-500/20' },
  { id: 'done', label: 'Done', color: 'bg-green-500/20' },
];

const priorityColors = {
  low: 'bg-blue-400/10 text-blue-400',
  medium: 'bg-yellow-400/10 text-yellow-400',
  high: 'bg-orange-400/10 text-orange-400',
  critical: 'bg-red-400/10 text-red-400',
};

export default function TaskManagement() {
  const { success, error: showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    assignee_id: '',
    project: '',
    due_date: '',
    tags: [] as string[],
    checklist: [] as { id: string; text: string; completed: boolean }[],
  });
  const [tagInput, setTagInput] = useState('');
  const [checklistItem, setChecklistItem] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      showError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const addChecklistItem = () => {
    if (checklistItem.trim()) {
      setFormData({
        ...formData,
        checklist: [
          ...formData.checklist,
          { id: Date.now().toString(), text: checklistItem.trim(), completed: false },
        ],
      });
      setChecklistItem('');
    }
  };

  const toggleChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const removeChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter(item => item.id !== id),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const handleSave = async () => {
    try {
      const taskData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{ ...taskData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        success('Task created successfully');
      }

      resetForm();
      loadTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      showError(error.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Task deleted successfully');
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showError('Failed to delete task');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id || '',
      project: task.project || '',
      due_date: task.due_date || '',
      tags: task.tags || [],
      checklist: task.checklist || [],
    });
    setIsCreating(true);
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      showError('Failed to update task status');
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setIsCreating(false);
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: '',
      project: '',
      due_date: '',
      tags: [],
      checklist: [],
    });
    setTagInput('');
    setChecklistItem('');
  };

  const projects = Array.from(new Set(tasks.map(t => t.project).filter(Boolean)));
  const filteredTasks = selectedProject
    ? tasks.filter(t => t.project === selectedProject)
    : tasks;

  const tasksByStatus = statusColumns.map(col => ({
    ...col,
    tasks: filteredTasks.filter(t => t.status === col.id),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6" />
          Task Management
        </h2>
        <div className="flex gap-2">
          {projects.length > 0 && (
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <button
              onClick={resetForm}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                placeholder="Task title"
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                rows={4}
                placeholder="Task description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                >
                  {statusColumns.map(col => (
                    <option key={col.id} value={col.id}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-white/80 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Project</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Assignee ID</label>
                <input
                  type="text"
                  value={formData.assignee_id}
                  onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="User ID"
                />
              </div>
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-white/80 mb-2">Checklist</label>
              <div className="space-y-2 mb-2">
                {formData.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          checklist: formData.checklist.map(i =>
                            i.id === item.id ? { ...i, text: e.target.value } : i
                          ),
                        });
                      }}
                      className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    />
                    <button
                      onClick={() => removeChecklistItem(item.id)}
                      className="p-1 text-white/60 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistItem}
                  onChange={(e) => setChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="Add checklist item"
                />
                <button
                  onClick={addChecklistItem}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-white/80 mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="Add tag and press Enter"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-white/10 text-white rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
              >
                <Save className="w-4 h-4" />
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4 overflow-x-auto">
        {tasksByStatus.map(column => (
          <div key={column.id} className="flex-shrink-0">
            <div className={`${column.color} rounded-lg p-4 mb-2`}>
              <h3 className="font-bold text-white mb-1">{column.label}</h3>
              <span className="text-white/60 text-sm">{column.tasks.length} tasks</span>
            </div>
            <div className="space-y-3 min-h-[500px]">
              {column.tasks.map(task => {
                const completedCount = task.checklist?.filter(c => c.completed).length || 0;
                const totalCount = task.checklist?.length || 0;
                return (
                  <div
                    key={task.id}
                    className="bg-black border border-white/10 rounded-lg p-4 cursor-pointer hover:border-white/30 transition"
                    onClick={() => handleEdit(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white flex-1">{task.title}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(task);
                          }}
                          className="p-1 text-white/60 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="p-1 text-white/60 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-white/60 text-sm mb-2 line-clamp-2">{task.description}</p>
                    )}

                    {totalCount > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <CheckSquare className="w-3 h-3" />
                          <span>{completedCount}/{totalCount}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mt-1">
                          <div
                            className="bg-green-400 h-1 rounded-full transition-all"
                            style={{ width: `${totalCount > 0 ? (completedCount / totalCount * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.project && (
                        <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                          {task.project}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-white/60">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-white/5 text-white/60 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick status change */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none"
                      >
                        {statusColumns.map(col => (
                          <option key={col.id} value={col.id}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
