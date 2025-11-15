/**
 * Daily Journal Component
 * Track daily accomplishments, conversations, and ideas
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { BookOpen, Plus, Edit, Trash2, Save, X, Calendar, Tag, Search } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  accomplishments: string[];
  conversations: string[];
  ideas: string[];
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function DailyJournal() {
  const { success, error: showError } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    accomplishments: [''],
    conversations: [''],
    ideas: [''],
    notes: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error loading entries:', error);
      showError('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const addArrayItem = (field: 'accomplishments' | 'conversations' | 'ideas') => {
    setFormData({
      ...formData,
      [field]: [...formData[field], ''],
    });
  };

  const updateArrayItem = (
    field: 'accomplishments' | 'conversations' | 'ideas',
    index: number,
    value: string
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const removeArrayItem = (field: 'accomplishments' | 'conversations' | 'ideas', index: number) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index),
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
      const entryData = {
        ...formData,
        accomplishments: formData.accomplishments.filter(a => a.trim()),
        conversations: formData.conversations.filter(c => c.trim()),
        ideas: formData.ideas.filter(i => i.trim()),
        updated_at: new Date().toISOString(),
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('journal_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        success('Journal entry updated successfully');
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .insert([{ ...entryData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        success('Journal entry created successfully');
      }

      resetForm();
      loadEntries();
    } catch (error: any) {
      console.error('Error saving entry:', error);
      showError(error.message || 'Failed to save journal entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Journal entry deleted successfully');
      loadEntries();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      showError('Failed to delete journal entry');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      title: entry.title,
      accomplishments: entry.accomplishments.length > 0 ? entry.accomplishments : [''],
      conversations: entry.conversations.length > 0 ? entry.conversations : [''],
      ideas: entry.ideas.length > 0 ? entry.ideas : [''],
      notes: entry.notes,
      tags: entry.tags || [],
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingEntry(null);
    setIsCreating(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: '',
      accomplishments: [''],
      conversations: [''],
      ideas: [''],
      notes: '',
      tags: [],
    });
    setTagInput('');
  };

  const allTags = Array.from(new Set(entries.flatMap(e => e.tags || [])));
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.accomplishments.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.conversations.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.ideas.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTag = !selectedTag || (entry.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

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
          <BookOpen className="w-6 h-6" />
          Daily Journal
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-sm transition ${
                selectedTag === tag
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
            </h3>
            <button
              onClick={resetForm}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-white/80 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                  placeholder="e.g., Day 1 - Project Kickoff"
                />
              </div>
            </div>

            {/* Accomplishments */}
            <div>
              <label className="block text-white/80 mb-2">Accomplishments</label>
              {formData.accomplishments.map((acc, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={acc}
                    onChange={(e) => updateArrayItem('accomplishments', index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    placeholder="What did you accomplish today?"
                  />
                  {formData.accomplishments.length > 1 && (
                    <button
                      onClick={() => removeArrayItem('accomplishments', index)}
                      className="p-2 text-white/60 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem('accomplishments')}
                className="mt-2 text-sm text-white/60 hover:text-white"
              >
                + Add Accomplishment
              </button>
            </div>

            {/* Conversations */}
            <div>
              <label className="block text-white/80 mb-2">Conversations & Ideas</label>
              {formData.conversations.map((conv, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={conv}
                    onChange={(e) => updateArrayItem('conversations', index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    rows={2}
                    placeholder="Key points from conversations..."
                  />
                  {formData.conversations.length > 1 && (
                    <button
                      onClick={() => removeArrayItem('conversations', index)}
                      className="p-2 text-white/60 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem('conversations')}
                className="mt-2 text-sm text-white/60 hover:text-white"
              >
                + Add Conversation Note
              </button>
            </div>

            {/* Ideas */}
            <div>
              <label className="block text-white/80 mb-2">Ideas & Future Plans</label>
              {formData.ideas.map((idea, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => updateArrayItem('ideas', index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    placeholder="New idea or future plan..."
                  />
                  {formData.ideas.length > 1 && (
                    <button
                      onClick={() => removeArrayItem('ideas', index)}
                      className="p-2 text-white/60 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem('ideas')}
                className="mt-2 text-sm text-white/60 hover:text-white"
              >
                + Add Idea
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-white/80 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                rows={4}
                placeholder="Any additional notes or thoughts..."
              />
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
                {editingEntry ? 'Update Entry' : 'Create Entry'}
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

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No journal entries found. Create your first entry!</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-white/60" />
                    <span className="text-white/60">{new Date(entry.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{entry.title || 'Untitled Entry'}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {entry.accomplishments.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Accomplishments</h4>
                  <ul className="list-disc list-inside space-y-1 text-white/80">
                    {entry.accomplishments.map((acc, i) => (
                      <li key={i}>{acc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.conversations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Conversations</h4>
                  <ul className="list-disc list-inside space-y-1 text-white/80">
                    {entry.conversations.map((conv, i) => (
                      <li key={i}>{conv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.ideas.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Ideas</h4>
                  <ul className="list-disc list-inside space-y-1 text-white/80">
                    {entry.ideas.map((idea, i) => (
                      <li key={i}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.notes && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Notes</h4>
                  <p className="text-white/80 whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs"
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
  );
}
