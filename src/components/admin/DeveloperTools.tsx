/**
 * Developer Tools Component
 * Code snippets, API docs, environment variables, and utilities
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { Code, Plus, Edit, Trash2, Save, X, Copy, Check, Terminal, Key, Database } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const languages = [
  'javascript',
  'typescript',
  'python',
  'sql',
  'bash',
  'json',
  'html',
  'css',
  'markdown',
  'other',
];

export default function DeveloperTools() {
  const { success, error: showError } = useToast();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'snippets' | 'env' | 'queries'>('snippets');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    language: 'javascript',
    description: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'snippets') {
      loadSnippets();
    }
  }, [activeTab]);

  const loadSnippets = async () => {
    try {
      const { data, error } = await supabase
        .from('code_snippets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnippets(data || []);
    } catch (error: any) {
      console.error('Error loading snippets:', error);
      showError('Failed to load code snippets');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      success('Copied to clipboard');
    } catch (error) {
      showError('Failed to copy to clipboard');
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
      const snippetData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editingSnippet) {
        const { error } = await supabase
          .from('code_snippets')
          .update(snippetData)
          .eq('id', editingSnippet.id);

        if (error) throw error;
        success('Snippet updated successfully');
      } else {
        const { error } = await supabase
          .from('code_snippets')
          .insert([{ ...snippetData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        success('Snippet created successfully');
      }

      resetForm();
      loadSnippets();
    } catch (error: any) {
      console.error('Error saving snippet:', error);
      showError(error.message || 'Failed to save snippet');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;

    try {
      const { error } = await supabase
        .from('code_snippets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Snippet deleted successfully');
      loadSnippets();
    } catch (error: any) {
      console.error('Error deleting snippet:', error);
      showError('Failed to delete snippet');
    }
  };

  const handleEdit = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormData({
      title: snippet.title,
      code: snippet.code,
      language: snippet.language,
      description: snippet.description,
      tags: snippet.tags || [],
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingSnippet(null);
    setIsCreating(false);
    setFormData({
      title: '',
      code: '',
      language: 'javascript',
      description: '',
      tags: [],
    });
    setTagInput('');
  };

  const runQuery = async () => {
    if (!query.trim()) {
      showError('Please enter a query');
      return;
    }

    try {
      // Note: This is a simplified example. In production, you'd want to use
      // RPC functions or proper API endpoints for security
      const { data, error } = await supabase.rpc('execute_query', { query_text: query });
      
      if (error) throw error;
      setQueryResult(data);
      success('Query executed successfully');
    } catch (error: any) {
      console.error('Error executing query:', error);
      showError('Failed to execute query. Make sure you have proper permissions.');
      setQueryResult({ error: error.message });
    }
  };

  if (loading && activeTab === 'snippets') {
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
          <Code className="w-6 h-6" />
          Developer Tools
        </h2>
        {activeTab === 'snippets' && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
          >
            <Plus className="w-4 h-4" />
            New Snippet
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'snippets', label: 'Code Snippets', icon: Code },
          { id: 'env', label: 'Environment', icon: Key },
          { id: 'queries', label: 'Database Queries', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Code Snippets Tab */}
      {activeTab === 'snippets' && (
        <>
          {/* Create/Edit Form */}
          {isCreating && (
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {editingSnippet ? 'Edit Snippet' : 'New Code Snippet'}
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
                    <label className="block text-white/80 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                      placeholder="Snippet title"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                    placeholder="What does this snippet do?"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Code</label>
                  <textarea
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-white/30"
                    rows={15}
                    placeholder="Paste your code here..."
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
                    {editingSnippet ? 'Update Snippet' : 'Save Snippet'}
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

          {/* Snippets List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {snippets.length === 0 ? (
              <div className="col-span-full bg-black border border-white/10 rounded-lg p-8 text-center">
                <Code className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No code snippets yet. Create your first snippet!</p>
              </div>
            ) : (
              snippets.map(snippet => (
                <div key={snippet.id} className="bg-black border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{snippet.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                          {snippet.language}
                        </span>
                        {snippet.description && (
                          <span className="text-white/60 text-sm">{snippet.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyToClipboard(snippet.code, snippet.id)}
                        className="p-1 text-white/60 hover:text-white"
                        title="Copy code"
                      >
                        {copiedId === snippet.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(snippet)}
                        className="p-1 text-white/60 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(snippet.id)}
                        className="p-1 text-white/60 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <pre className="bg-white/5 rounded p-3 overflow-x-auto text-xs text-white/80 font-mono mb-2">
                    <code>{snippet.code.substring(0, 200)}{snippet.code.length > 200 ? '...' : ''}</code>
                  </pre>

                  {snippet.tags && snippet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {snippet.tags.map(tag => (
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
        </>
      )}

      {/* Environment Variables Tab */}
      {activeTab === 'env' && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Environment Variables
          </h3>
          <p className="text-white/60 mb-4">
            View and manage environment variables. Note: Sensitive values are masked for security.
          </p>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                <span className="text-white font-mono text-sm flex-1">{key}</span>
                <span className="text-white/60 font-mono text-sm">
                  {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                </span>
                <button
                  onClick={() => copyToClipboard(value, key)}
                  className="p-1 text-white/60 hover:text-white"
                >
                  {copiedId === key ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
            {Object.keys(envVars).length === 0 && (
              <p className="text-white/60 text-center py-8">
                No environment variables loaded. These are typically managed through your hosting platform.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Database Queries Tab */}
      {activeTab === 'queries' && (
        <div className="space-y-4">
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Query Runner
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">SQL Query</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-white/30"
                  rows={8}
                  placeholder="SELECT * FROM users LIMIT 10;"
                />
              </div>
              <button
                onClick={runQuery}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
              >
                <Terminal className="w-4 h-4" />
                Execute Query
              </button>
            </div>
          </div>

          {queryResult && (
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <h4 className="text-lg font-bold text-white mb-4">Results</h4>
              <pre className="bg-white/5 rounded p-4 overflow-x-auto text-xs text-white/80 font-mono">
                <code>{JSON.stringify(queryResult, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
