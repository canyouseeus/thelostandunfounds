/**
 * Help Center Component
 * Knowledge base, documentation, and help articles
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { HelpCircle, Plus, Edit, Trash2, Save, X, Search, Book, FileText } from 'lucide-react';
import { LoadingSpinner } from '../Loading';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  created_at: string;
  updated_at: string;
}

const categories = [
  'Getting Started',
  'Dashboard',
  'Blog Management',
  'Products',
  'Affiliates',
  'Tasks',
  'Journal',
  'Ideas',
  'Analytics',
  'Settings',
  'API',
  'Troubleshooting',
];

export default function HelpCenter() {
  const { success, error: showError } = useToast();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Error loading articles:', error);
      showError('Failed to load help articles');
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
      const articleData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('help_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        success('Article updated successfully');
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert([{
            ...articleData,
            views: 0,
            helpful: 0,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
        success('Article created successfully');
      }

      resetForm();
      loadArticles();
    } catch (error: any) {
      console.error('Error saving article:', error);
      showError(error.message || 'Failed to save article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      success('Article deleted successfully');
      loadArticles();
    } catch (error: any) {
      console.error('Error deleting article:', error);
      showError('Failed to delete article');
    }
  };

  const handleEdit = (article: HelpArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags || [],
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingArticle(null);
    setIsCreating(false);
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: [],
    });
    setTagInput('');
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const articlesByCategory = categories.map(cat => ({
    category: cat,
    articles: filteredArticles.filter(a => a.category === cat),
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
          <HelpCircle className="w-6 h-6" />
          Help Center
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          New Article
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
            placeholder="Search help articles..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">
              {editingArticle ? 'Edit Article' : 'Create New Article'}
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
                placeholder="Article title"
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                rows={12}
                placeholder="Write your help article content here. You can use markdown formatting..."
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
                {editingArticle ? 'Update Article' : 'Create Article'}
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

      {/* Articles by Category */}
      <div className="space-y-6">
        {articlesByCategory.map(({ category, articles: categoryArticles }) => {
          if (categoryArticles.length === 0 && selectedCategory !== category) return null;
          
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-white/60" />
                <h3 className="text-xl font-bold text-white">{category}</h3>
                <span className="text-white/60 text-sm">({categoryArticles.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryArticles.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-white/40 text-sm">
                    No articles in this category
                  </div>
                ) : (
                  categoryArticles.map(article => (
                    <div
                      key={article.id}
                      className="bg-black border border-white/10 rounded-lg p-4 hover:border-white/30 transition cursor-pointer"
                      onClick={() => handleEdit(article)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white flex-1">{article.title}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(article);
                            }}
                            className="p-1 text-white/60 hover:text-white"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(article.id);
                            }}
                            className="p-1 text-white/60 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-white/60 text-sm mb-3 line-clamp-3">{article.content}</p>

                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{article.views} views</span>
                        <span>{article.helpful} helpful</span>
                      </div>

                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.tags.map(tag => (
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
          );
        })}
      </div>
    </div>
  );
}
