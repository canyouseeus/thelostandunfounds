/**
 * User Profile Page
 * View and edit user account information
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { User, Mail, Calendar, Shield, Key, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { formatDate } from '../utils/helpers';
import { SubscriptionTier } from '../types/index';
import { isAdmin } from '../utils/admin';
import { supabase } from '../lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  published_at: string | null;
  subdomain: string | null;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user, tier, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState<string>('');
  const [blogTitleDisplay, setBlogTitleDisplay] = useState<string>('');
  const [isEditingBlogTitle, setIsEditingBlogTitle] = useState(false);
  const [savingBlogTitle, setSavingBlogTitle] = useState(false);
  
  // Function to normalize blog title (remove symbols, convert + to AND)
  const normalizeBlogTitle = (styledTitle: string): string => {
    if (!styledTitle) return '';
    return styledTitle
      .replace(/\+/g, ' AND ')
      .replace(/[^a-zA-Z0-9\s&]/g, '') // Remove all symbols except letters, numbers, spaces, and &
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  };
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (user?.email) {
      // Use author_name from user_metadata if available, otherwise extract from email
      const authorName = user.user_metadata?.author_name;
      const emailName = user.email.split('@')[0];
      setDisplayName(authorName || emailName);
    }
  }, [user]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const admin = await isAdmin();
        setUserIsAdmin(admin);
        // Don't redirect - allow admins to view their profile
      }
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserSubdomain();
      loadUserPosts();
    }
  }, [user]);

  // Redirect to correct URL after subdomain is loaded
  useEffect(() => {
    if (user && userSubdomain) {
      if (username && username !== userSubdomain) {
        // If URL has wrong username, redirect to correct one
        navigate(`/${userSubdomain}/bookclubprofile`, { replace: true });
      } else if (!username) {
        // If no username in URL but we have subdomain, redirect to include it
        navigate(`/${userSubdomain}/bookclubprofile`, { replace: true });
      }
    }
  }, [user, username, userSubdomain, navigate]);

  const loadUserSubdomain = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_subdomains')
        .select('subdomain, blog_title, blog_title_display, author_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        if (data.subdomain) {
          setUserSubdomain(data.subdomain);
        }
        // Use display version if available, otherwise use normalized version
        if (data.blog_title_display) {
          setBlogTitleDisplay(data.blog_title_display);
          setBlogTitle(data.blog_title || normalizeBlogTitle(data.blog_title_display));
        } else if (data.blog_title) {
          setBlogTitle(data.blog_title);
          setBlogTitleDisplay(data.blog_title);
        }
        // Update author_name in user_subdomains if it's not set but we have it in metadata
        if (!data.author_name && user.user_metadata?.author_name) {
          await supabase
            .from('user_subdomains')
            .update({ author_name: user.user_metadata.author_name })
            .eq('user_id', user.id);
        }
      }
    } catch (err) {
      console.warn('Error loading subdomain:', err);
    }
  };

  const handleSaveBlogTitle = async () => {
    if (!user || !userSubdomain) return;

    setSavingBlogTitle(true);
    try {
      // Normalize the styled title for database storage
      const normalizedTitle = normalizeBlogTitle(blogTitleDisplay);
      
      const { error } = await supabase
        .from('user_subdomains')
        .update({ 
          blog_title: normalizedTitle || null,
          blog_title_display: blogTitleDisplay.trim() || null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state with normalized version
      setBlogTitle(normalizedTitle);
      
      success('Blog title updated successfully');
      setIsEditingBlogTitle(false);
    } catch (err: any) {
      console.error('Error saving blog title:', err);
      showError(err.message || 'Failed to update blog title');
    } finally {
      setSavingBlogTitle(false);
    }
  };

  const loadUserPosts = async () => {
    if (!user) return;
    
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, published, published_at, subdomain')
        .or(`author_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading posts:', error);
      } else {
        setUserPosts(data || []);
      }
    } catch (err) {
      console.error('Error loading user posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // TODO: Update user profile in database
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      showError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showError(error.message || 'Failed to update password');
        return;
      }

      success('Password updated successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-white/70">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  const tierColors: Record<SubscriptionTier, string> = {
    free: 'text-white/60 bg-white/5 border-white/10',
    premium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    pro: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  };

  const tierLabels: Record<SubscriptionTier, string> = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">PROFILE</h1>
        <p className="text-white/70">Manage your account information and view your articles</p>
      </div>

      <div className="space-y-6">
        {/* Book Club Info Section */}
        {userSubdomain && (
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your Book Club Blog
              </h2>
              <Link
                to={`/blog/${userSubdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-sm font-medium transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Blog
              </Link>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Your Blog URL</label>
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none">
                  <p className="text-white font-mono text-sm">
                    {userSubdomain}.thelostandunfounds.com
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Subdomain</label>
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none">
                  <p className="text-white font-mono text-sm">{userSubdomain}</p>
                </div>
                <p className="text-white/50 text-xs mt-1">Set during registration - cannot be changed</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white/80">Blog Title</label>
                  {!isEditingBlogTitle ? (
                    <button
                      onClick={() => setIsEditingBlogTitle(true)}
                      className="text-sm text-white/60 hover:text-white transition"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                      onClick={() => {
                        setIsEditingBlogTitle(false);
                        // Reset to saved value
                        const resetData = async () => {
                          const { data } = await supabase
                            .from('user_subdomains')
                            .select('blog_title, blog_title_display')
                            .eq('user_id', user.id)
                            .maybeSingle();
                          if (data) {
                            if (data.blog_title_display) {
                              setBlogTitleDisplay(data.blog_title_display);
                              setBlogTitle(data.blog_title || normalizeBlogTitle(data.blog_title_display));
                            } else if (data.blog_title) {
                              setBlogTitle(data.blog_title);
                              setBlogTitleDisplay(data.blog_title);
                            }
                          }
                        };
                        resetData();
                      }}
                        className="text-sm text-white/60 hover:text-white transition"
                        disabled={savingBlogTitle}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBlogTitle}
                        className="text-sm text-white hover:text-white/80 transition px-3 py-1 bg-white/10 hover:bg-white/20 rounded"
                        disabled={savingBlogTitle}
                      >
                        {savingBlogTitle ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
                {isEditingBlogTitle ? (
                  <input
                    type="text"
                    value={blogTitleDisplay}
                    onChange={(e) => setBlogTitleDisplay(e.target.value)}
                    placeholder="Enter your blog title (e.g., THE LOST+UNFOUNDS)"
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white focus:border-white/30 focus:outline-none"
                    disabled={savingBlogTitle}
                  />
                ) : (
                  <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none">
                    <p className="text-white text-sm">
                      {blogTitleDisplay || blogTitle || <span className="text-white/50 italic">No title set</span>}
                    </p>
                  </div>
                )}
                <p className="text-white/50 text-xs mt-1">
                  This title will be displayed as "[BLOG TITLE] BOOK CLUB" on your blog page
                </p>
              </div>
            </div>
          </div>
        )}

        {/* My Articles Section */}
        {userPosts.length > 0 && (
          <div className="bg-black/50 border border-white/10 rounded-none p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Articles
              </h2>
              <Link
                to="/submit-article"
                className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Submit New Article
              </Link>
            </div>
            <div className="space-y-3">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-black/30 border border-white/10 rounded-none p-4 hover:border-white/20 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-bold mb-2">{post.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {post.published_at ? formatDate(post.published_at) : 'Draft'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          post.published
                            ? 'bg-green-400/20 text-green-400 border border-green-400/20'
                            : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/20'
                        }`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                        {post.subdomain && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-400/20 text-blue-400 border border-blue-400/20">
                            Book Club
                          </span>
                        )}
                      </div>
                    </div>
                    {post.published && (
                      <Link
                        to={post.subdomain ? `/blog/${post.subdomain}/${post.slug}` : `/thelostarchives/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded transition"
                        title="View post"
                      >
                        <ExternalLink className="w-4 h-4 text-white/60" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Article CTA if no posts */}
        {userPosts.length === 0 && (
          <div className="bg-black/50 border border-white/10 rounded-none p-6 text-center">
            <BookOpen className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Start Your Book Club Journey</h3>
            <p className="text-white/60 mb-4">Submit your first article with four book recommendations.</p>
            <Link
              to="/submit-article"
              className="inline-block px-6 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
            >
              Submit Your First Article
            </Link>
          </div>
        )}
        {/* Account Information */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </h2>
              {userIsAdmin && (
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white">
                  ADMIN
                </div>
              )}
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition text-sm"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-white/10 rounded-none">
                <Mail className="w-4 h-4 text-white/60" />
                <span className="text-white">{user.email}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Author Name (Username)
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                    placeholder="Your author name"
                    disabled={!!user.user_metadata?.author_name}
                  />
                  {user.user_metadata?.author_name && (
                    <p className="text-xs text-yellow-400 mt-1">Author name cannot be changed after registration</p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white">
                  {displayName || 'Not set'}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && <LoadingSpinner size="sm" />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.email?.split('@')[0] || '');
                  }}
                  className="px-4 py-2 bg-black/50 border border-white/10 text-white font-semibold rounded-none hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </h2>
            {!showPasswordChange && (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition text-sm"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordChange ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Enter new password (min. 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading && <LoadingSpinner size="sm" />}
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 bg-black/50 border border-white/10 text-white font-semibold rounded-none hover:border-white/30 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-white/60 text-sm">Click "Change Password" to update your password</p>
          )}
        </div>

        {/* Subscription Information */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Subscription
          </h2>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-none border ${tierColors[tier]}`}>
            <span className="font-semibold">{tierLabels[tier]} Tier</span>
          </div>

          {tier === 'free' && (
            <div className="mt-4">
              <a
                href="/tools"
                className="text-white/80 hover:text-white text-sm underline"
              >
                Upgrade to unlock more features →
              </a>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Account Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">User ID</span>
              <span className="text-white font-mono text-xs">{user.id}</span>
            </div>
            {user.created_at && (
              <div className="flex justify-between">
                <span className="text-white/60">Member since</span>
                <span className="text-white">{formatDate(user.created_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

