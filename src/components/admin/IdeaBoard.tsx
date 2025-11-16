/**
 * Idea Board Component
 * Capture, organize, and prioritize ideas
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Lightbulb, Plus, Edit, Trash2, Save, X, Star, Tag, Filter } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'considering' | 'planned' | 'in_progress' | 'completed' | 'archived';
  tags: string[];
  related_journal_entry_id?: string;
  related_task_id?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  backlog: 'bg-gray-500/20 text-gray-400',
  considering: 'bg-blue-500/20 text-blue-400',
  planned: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  completed: 'bg-green-500/20 text-green-400',
  archived: 'bg-white/5 text-white/40',
};

const priorityColors = {
  low: 'bg-blue-400/10 text-blue-400',
  medium: 'bg-yellow-400/10 text-yellow-400',
  high: 'bg-orange-400/10 text-orange-400',
  critical: 'bg-red-400/10 text-red-400',
};

export default function IdeaBoard() {
  const { success, error: showError } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as Idea['priority'],
    status: 'backlog' as Idea['status'],
    tags: [] as string[],
    related_journal_entry_id: '',
    related_task_id: '',
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error: any) {
      console.error('Error loading ideas:', error);
      showError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
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
      const ideaData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editingIdea) {
        const { error } = await supabase
          .from('ideas')
          .update(ideaData)
          .eq('id', editingIdea.id);

        if (error) throw error;
        success('Idea updated successfully');
      } else {
        const { error } = await supabase
          .from('ideas')
          .insert([{ ...ideaData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        success('Idea created successfully');
      }

      resetForm();
      loadIdeas();
    } catch (error: any) {
      console.error('Error saving idea:', error);
      showError(error.message || 'Failed to save idea');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return;

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Idea deleted successfully');
      loadIdeas();
    } catch (error: any) {
      console.error('Error deleting idea:', error);
      showError('Failed to delete idea');
    }
  };

  const handleEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description,
      category: idea.category,
      priority: idea.priority,
      status: idea.status,
      tags: idea.tags || [],
      related_journal_entry_id: idea.related_journal_entry_id || '',
      related_task_id: idea.related_task_id || '',
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingIdea(null);
    setIsCreating(false);
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      status: 'backlog',
      tags: [],
      related_journal_entry_id: '',
      related_task_id: '',
    });
    setTagInput('');
  };

  const categories = Array.from(new Set(ideas.map(i => i.category).filter(Boolean)));
  const filteredIdeas = ideas.filter(idea => {
    const matchesStatus = !filterStatus || idea.status === filterStatus;
    const matchesCategory = !filterCategory || idea.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const ideasByStatus = Object.keys(statusColors).map(status => ({
    status: status as Idea['status'],
    ideas: filteredIdeas.filter(i => i.status === status),
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
          <Lightbulb className="w-6 h-6" />
          Idea Board
        </h2>
        <div className="flex gap-2">
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          >
            <option value="">All Statuses</option>
            {Object.keys(statusColors).map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          {categories.length > 0 && (
            <select
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value || null)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
          >
            <Plus className="w-4 h-4" />
            New Idea
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingIdea ? 'Edit Idea' : 'Capture New Idea'}
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
                placeholder="Idea title"
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                rows={6}
                placeholder="Describe your idea in detail..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="e.g., Feature, Improvement"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Idea['priority'] })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-white/80 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Idea['status'] })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                >
                  {Object.keys(statusColors).map(status => (
                    <option key={status} value={status}>{status.replace('_', ' ')}</option>
                  ))}
                </select>
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
                {editingIdea ? 'Update Idea' : 'Save Idea'}
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

      {/* Ideas Grid by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {ideasByStatus.map(({ status, ideas: statusIdeas }) => (
          <div key={status} className="space-y-4">
            <div className={`${statusColors[status]} rounded-lg p-3`}>
              <h3 className="font-bold text-white capitalize">{status.replace('_', ' ')}</h3>
              <span className="text-white/60 text-sm">{statusIdeas.length} ideas</span>
            </div>
            <div className="space-y-3">
              {statusIdeas.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">No ideas</div>
              ) : (
                statusIdeas.map(idea => (
                  <div
                    key={idea.id}
                    className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/30 transition cursor-pointer"
                    onClick={() => handleEdit(idea)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white flex-1">{idea.title}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(idea);
                          }}
                          className="p-1 text-white/60 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(idea.id);
                          }}
                          className="p-1 text-white/60 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {idea.description && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-3">{idea.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.category && (
                        <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                          {idea.category}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[idea.priority]}`}>
                        {idea.priority}
                      </span>
                    </div>

                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {idea.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-white/5 text-white/60 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
