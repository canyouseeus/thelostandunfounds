/**
 * Design System Preview - Shows proposed UI changes with real data
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { useSageMode } from '../contexts/SageModeContext';
import { Eye, ArrowLeft, ExternalLink } from 'lucide-react';
import {
  Expandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableContent,
  ExpandableTrigger,
} from '../components/ui/expandable';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  created_at: string;
}

export default function DesignSystemPreview() {
  const { state } = useSageMode();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, published_at, created_at')
        .is('subdomain', null)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPosts(data || []);
      if (data && data.length > 0) {
        setSelectedPost(data[0]);
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Apply custom CSS if provided
  useEffect(() => {
    if (state.customCode) {
      const styleId = 'sage-mode-custom-css';
      let styleElement = document.getElementById(styleId);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = state.customCode;
    }
    return () => {
      const styleElement = document.getElementById('sage-mode-custom-css');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [state.customCode]);

  const selectedComponents = state.selections.filter(s => s.selected);
  const blogCardSelected = selectedComponents.some(s => s.id === 'blog-card' || s.id === 'blog-expandable');

  return (
    <>
      <Helmet>
        <title>Design System Preview | SAGE MODE | THE LOST+UNFOUNDS</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-wide flex items-center gap-3">
                <Eye className="w-10 h-10 text-yellow-400" />
                DESIGN PREVIEW
              </h1>
              <p className="text-white/60 text-sm">
                Preview proposed UI changes with real blog post data
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/sagemode"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white font-medium transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to SAGE MODE
              </Link>
            </div>
          </div>

          {selectedComponents.length > 0 && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-none p-4">
              <p className="text-yellow-400 text-sm">
                <strong>Preview Mode:</strong> Showing changes for {selectedComponents.length} selected component(s)
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-white/60">Loading preview data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Post Selector */}
            {posts.length > 0 && (
              <div className="bg-black/50 border border-white/10 rounded-none p-6">
                <h2 className="text-xl font-bold text-white mb-4">Select Blog Post to Preview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`p-4 border rounded-none text-left transition ${
                        selectedPost?.id === post.id
                          ? 'bg-white/20 border-white text-white'
                          : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium mb-1">{post.title}</div>
                      <div className="text-xs text-white/60">
                        {formatDate(post.published_at || post.created_at)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Area */}
            {selectedPost && (
              <div className="space-y-6">
                <div className="bg-black/50 border border-white/10 rounded-none p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Live Preview</h2>
                  <p className="text-white/60 text-sm mb-4">
                    This preview shows how the selected blog post would look with your proposed changes.
                    All interactions work as they would in production.
                  </p>

                  {/* Preview Container */}
                  <div className="bg-black border border-white/20 rounded-none p-6">
                    {blogCardSelected ? (
                      // Show expandable card if selected
                      <div className="max-w-2xl mx-auto">
                        <Link
                          to={`/thelostarchives/${selectedPost.slug}`}
                          className="block"
                          onClick={(e) => {
                            // In preview mode, we might want to prevent navigation
                            // or show a message. For now, let it work normally.
                          }}
                        >
                          <Expandable
                            expandDirection="vertical"
                            expandBehavior="replace"
                            initialDelay={0}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            {({ isExpanded }) => (
                              <ExpandableTrigger>
                                <ExpandableCard
                                  className="bg-white dark:bg-white border-0 rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
                                  collapsedSize={{ height: 200 }}
                                  expandedSize={{ height: undefined }}
                                  hoverToExpand={false}
                                  expandDelay={0}
                                  collapseDelay={0}
                                >
                                  <ExpandableCardHeader className="mb-1 pb-1">
                                    <h2 className="text-base font-black text-black dark:text-black mb-0 tracking-wide transition">
                                      {selectedPost.title}
                                    </h2>
                                  </ExpandableCardHeader>

                                  <ExpandableCardContent className="flex-1 min-h-0">
                                    {selectedPost.excerpt && (
                                      <div className="mb-1">
                                        <p className="text-black/70 dark:text-black/70 text-sm leading-relaxed line-clamp-4 text-left">
                                          {selectedPost.excerpt}
                                        </p>
                                      </div>
                                    )}

                                    <ExpandableContent
                                      preset="fade"
                                      stagger
                                      staggerChildren={0.1}
                                      keepMounted={false}
                                    >
                                      {selectedPost.content && (
                                        <div className="mb-2">
                                          <p className="text-black/60 dark:text-black/60 text-xs leading-relaxed text-left line-clamp-6">
                                            {selectedPost.content.replace(/\n/g, ' ').substring(0, 300)}...
                                          </p>
                                        </div>
                                      )}
                                      <Link
                                        to={`/thelostarchives/${selectedPost.slug}`}
                                        className="inline-block mt-2 text-black/80 dark:text-black/80 hover:text-black dark:hover:text-black text-xs font-semibold transition"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Read Full Article →
                                      </Link>
                                    </ExpandableContent>
                                  </ExpandableCardContent>

                                  <ExpandableCardFooter className="mt-auto p-3 pt-2 pb-3">
                                    <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                                      <time className="text-black/60 dark:text-black/60 text-xs font-medium truncate min-w-0 flex-1">
                                        {formatDate(selectedPost.published_at || selectedPost.created_at)}
                                      </time>
                                      {!isExpanded && (
                                        <span className="text-black/80 dark:text-black/80 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap">
                                          Click to expand →
                                        </span>
                                      )}
                                    </div>
                                  </ExpandableCardFooter>
                                </ExpandableCard>
                              </ExpandableTrigger>
                            )}
                          </Expandable>
                        </Link>
                      </div>
                    ) : (
                      // Default card view
                      <div className="max-w-2xl mx-auto">
                        <div className="bg-white border-0 rounded-none p-6">
                          <h2 className="text-2xl font-black text-black mb-4 tracking-wide">
                            {selectedPost.title}
                          </h2>
                          {selectedPost.excerpt && (
                            <p className="text-black/70 text-base leading-relaxed mb-4">
                              {selectedPost.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <time className="text-black/60 text-sm">
                              {formatDate(selectedPost.published_at || selectedPost.created_at)}
                            </time>
                            <Link
                              to={`/thelostarchives/${selectedPost.slug}`}
                              className="text-black/80 hover:text-black text-sm font-semibold transition flex items-center gap-1"
                            >
                              Read Full Article
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes for this component */}
                {selectedComponents.length > 0 && (
                  <div className="bg-black/50 border border-white/10 rounded-none p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Design Notes</h3>
                    <div className="space-y-3">
                      {state.notes
                        .filter(note => selectedComponents.some(sc => sc.id === note.componentId))
                        .map(note => {
                          const component = state.selections.find(s => s.id === note.componentId);
                          return (
                            <div
                              key={note.id}
                              className="p-4 bg-white/5 border border-white/10 rounded-none"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-white font-medium">{component?.name}</div>
                                <div className="text-white/40 text-xs">
                                  {new Date(note.timestamp).toLocaleString()}
                                </div>
                              </div>
                              {note.code && (
                                <pre className="text-xs text-white/60 bg-black/50 p-3 rounded-none mb-2 overflow-x-auto">
                                  {note.code}
                                </pre>
                              )}
                              <p className="text-white/70 text-sm">{note.notes}</p>
                            </div>
                          );
                        })}
                      {state.notes.filter(note => selectedComponents.some(sc => sc.id === note.componentId)).length === 0 && (
                        <p className="text-white/60 text-sm">No notes for selected components. Add notes in SAGE MODE.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
