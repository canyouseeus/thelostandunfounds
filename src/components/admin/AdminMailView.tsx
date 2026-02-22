/**
 * AdminMailView - Full Webmail Interface for Admin
 * Features: Inbox, Sent, Drafts, Compose, Search, Attachments
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Mail,
  Send,
  FileText,
  Trash2,
  Inbox,
  Search,
  RefreshCw,
  Paperclip,
  Star,
  StarOff,
  Reply,
  Forward,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Loader,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import DOMPurify from 'dompurify';

// Types
interface MailFolder {
  folderId: string;
  folderName: string;
  folderPath: string;
  unreadCount: number;
  messageCount: number;
  folderType: string;
}

interface MailMessage {
  messageId: string;
  folderId: string;
  from: string;
  fromAddress: string;
  to: string;
  toAddress: string;
  cc?: string;
  bcc?: string;
  subject: string;
  receivedTime: number;
  sentDateInGMT?: number;
  hasAttachment: boolean;
  isRead: boolean;
  isStarred: boolean;
  summary?: string;
  size?: number;
}

interface MailMessageFull extends MailMessage {
  content: string;
  htmlContent?: string;
  attachments?: MailAttachment[];
}

interface MailAttachment {
  attachmentId: string;
  attachmentName: string;
  attachmentSize: number;
  contentType: string;
}

interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  content: string;
  inReplyTo?: string;
  isReply?: boolean;
  isForward?: boolean;
}

interface AdminMailViewProps {
  onBack: () => void;
}

// Cache for folders (5 minutes)
let foldersCache: { data: MailFolder[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

export default function AdminMailView({ onBack }: AdminMailViewProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  // State
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MailFolder | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessageFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState<ComposeData>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    content: ''
  });
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const PAGE_SIZE = 25;
  const contentRef = useRef<HTMLDivElement>(null);

  // API helper
  const mailApi = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Admin-Email': user?.email || ''
    };

    const response = await fetch(`/api/mail/${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `API error: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response;
  }, [user?.email]);

  // Load folders
  const loadFolders = useCallback(async (force = false) => {
    // Check cache
    if (!force && foldersCache && Date.now() - foldersCache.timestamp < CACHE_DURATION) {
      setFolders(foldersCache.data);
      if (!selectedFolder && foldersCache.data.length > 0) {
        const inbox = foldersCache.data.find(f =>
          f.folderType === 'Inbox' || f.folderName.toLowerCase() === 'inbox'
        );
        setSelectedFolder(inbox || foldersCache.data[0]);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await mailApi('folders');
      const foldersList = data.folders || [];

      // Update cache
      foldersCache = { data: foldersList, timestamp: Date.now() };

      setFolders(foldersList);

      // Auto-select inbox
      if (!selectedFolder && foldersList.length > 0) {
        const inbox = foldersList.find((f: MailFolder) =>
          f.folderType === 'Inbox' || f.folderName.toLowerCase() === 'inbox'
        );
        setSelectedFolder(inbox || foldersList[0]);
      }
    } catch (err: any) {
      console.error('Failed to load folders:', err);
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [mailApi, selectedFolder]);

  // Load messages
  const loadMessages = useCallback(async (folderId: string, pageNum = 0, append = false) => {
    try {
      setLoadingMessages(true);
      setError(null);

      const start = pageNum * PAGE_SIZE;
      const data = await mailApi(`messages?folderId=${folderId}&limit=${PAGE_SIZE}&start=${start}`);

      const newMessages = data.messages || [];
      setMessages(prev => append ? [...prev, ...newMessages] : newMessages);
      setHasMore(newMessages.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [mailApi]);

  // Load single message
  const loadMessage = useCallback(async (messageId: string) => {
    try {
      setLoadingMessage(true);
      setError(null);

      const data = await mailApi(`message/${messageId}`);
      setSelectedMessage(data.message);

      // Mark as read
      if (!data.message.isRead) {
        mailApi('read', {
          method: 'PUT',
          body: JSON.stringify({ messageId, isRead: true })
        }).catch(console.error);

        // Update local state
        setMessages(prev => prev.map(m =>
          m.messageId === messageId ? { ...m, isRead: true } : m
        ));
      }
    } catch (err: any) {
      console.error('Failed to load message:', err);
      setError(err.message || 'Failed to load message');
    } finally {
      setLoadingMessage(false);
    }
  }, [mailApi]);

  // Search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      if (selectedFolder) {
        loadMessages(selectedFolder.folderId);
      }
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const params = new URLSearchParams({ q: searchQuery });
      if (selectedFolder) {
        params.append('folderId', selectedFolder.folderId);
      }

      const data = await mailApi(`search?${params.toString()}`);
      setMessages(data.messages || []);
      setHasMore(false);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedFolder, mailApi, loadMessages]);

  // Send email
  const handleSend = useCallback(async () => {
    if (!composeData.to.trim() || !composeData.subject.trim()) {
      showError('To and Subject are required');
      return;
    }

    try {
      setSending(true);

      await mailApi('send', {
        method: 'POST',
        body: JSON.stringify({
          to: composeData.to,
          cc: composeData.cc || undefined,
          bcc: composeData.bcc || undefined,
          subject: composeData.subject,
          content: composeData.content,
          isHtml: true,
          inReplyTo: composeData.inReplyTo
        })
      });

      success('Email sent successfully');
      setShowCompose(false);
      setComposeData({ to: '', cc: '', bcc: '', subject: '', content: '' });

      // Refresh sent folder if viewing it
      const sentFolder = folders.find(f =>
        f.folderType === 'Sent' || f.folderName.toLowerCase() === 'sent'
      );
      if (selectedFolder && selectedFolder.folderId === sentFolder?.folderId) {
        loadMessages(selectedFolder.folderId);
      }
    } catch (err: any) {
      console.error('Failed to send:', err);
      showError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }, [composeData, mailApi, success, showError, folders, selectedFolder, loadMessages]);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    try {
      await mailApi('draft', {
        method: 'POST',
        body: JSON.stringify({
          to: composeData.to,
          cc: composeData.cc || undefined,
          bcc: composeData.bcc || undefined,
          subject: composeData.subject,
          content: composeData.content,
          isHtml: true
        })
      });

      success('Draft saved');
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      showError(err.message || 'Failed to save draft');
    }
  }, [composeData, mailApi, success, showError]);

  // Delete message
  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await mailApi(`message/${messageId}`, { method: 'DELETE' });
      success('Message deleted');

      // Remove from list
      setMessages(prev => prev.filter(m => m.messageId !== messageId));
      if (selectedMessage?.messageId === messageId) {
        setSelectedMessage(null);
      }
    } catch (err: any) {
      console.error('Failed to delete:', err);
      showError(err.message || 'Failed to delete message');
    }
  }, [mailApi, success, showError, selectedMessage]);

  // Move message
  const handleMove = useCallback(async (messageId: string, folderId: string) => {
    try {
      await mailApi('move', {
        method: 'PUT',
        body: JSON.stringify({ messageId, folderId })
      });
      success('Message moved');

      // Remove from current list
      setMessages(prev => prev.filter(m => m.messageId !== messageId));
      if (selectedMessage?.messageId === messageId) {
        setSelectedMessage(null);
      }
      setShowMoveMenu(false);
    } catch (err: any) {
      console.error('Failed to move:', err);
      showError(err.message || 'Failed to move message');
    }
  }, [mailApi, success, showError, selectedMessage]);

  // Toggle star
  const handleToggleStar = useCallback(async (messageId: string, currentState: boolean) => {
    try {
      await mailApi('star', {
        method: 'PUT',
        body: JSON.stringify({ messageId, isStarred: !currentState })
      });

      setMessages(prev => prev.map(m =>
        m.messageId === messageId ? { ...m, isStarred: !currentState } : m
      ));

      if (selectedMessage?.messageId === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, isStarred: !currentState } : null);
      }
    } catch (err: any) {
      console.error('Failed to toggle star:', err);
    }
  }, [mailApi, selectedMessage]);

  // Reply
  const handleReply = useCallback(() => {
    if (!selectedMessage) return;

    setComposeData({
      to: selectedMessage.fromAddress,
      cc: '',
      bcc: '',
      subject: `Re: ${selectedMessage.subject.replace(/^Re:\s*/i, '')}`,
      content: `\n\n---\nOn ${new Date(selectedMessage.receivedTime).toLocaleString()}, ${selectedMessage.from} wrote:\n> ${(selectedMessage.content || '').replace(/\n/g, '\n> ')}`,
      inReplyTo: selectedMessage.messageId,
      isReply: true
    });
    setShowCompose(true);
  }, [selectedMessage]);

  // Forward
  const handleForward = useCallback(() => {
    if (!selectedMessage) return;

    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: `Fwd: ${selectedMessage.subject.replace(/^Fwd:\s*/i, '')}`,
      content: `\n\n---\nForwarded message:\nFrom: ${selectedMessage.from}\nDate: ${new Date(selectedMessage.receivedTime).toLocaleString()}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.content || ''}`,
      isForward: true
    });
    setShowCompose(true);
  }, [selectedMessage]);

  // Download attachment
  const handleDownloadAttachment = useCallback(async (messageId: string, attachment: MailAttachment) => {
    try {
      const response = await fetch(`/api/mail/attachment/${messageId}/${attachment.attachmentId}`, {
        headers: { 'X-Admin-Email': user?.email || '' }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.attachmentName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
      showError('Failed to download attachment');
    }
  }, [user?.email, showError]);

  // Effects
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (selectedFolder) {
      setSelectedMessage(null);
      setSearchQuery('');
      loadMessages(selectedFolder.folderId);
    }
  }, [selectedFolder, loadMessages]);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get folder icon
  const getFolderIcon = (folder: MailFolder) => {
    const name = folder.folderName.toLowerCase();
    const type = folder.folderType.toLowerCase();

    if (type === 'inbox' || name === 'inbox') return <Inbox className="w-4 h-4" />;
    if (type === 'sent' || name === 'sent') return <Send className="w-4 h-4" />;
    if (type === 'drafts' || name === 'drafts') return <FileText className="w-4 h-4" />;
    if (type === 'trash' || name === 'trash') return <Trash2 className="w-4 h-4" />;
    if (type === 'archive' || name === 'archive') return <Archive className="w-4 h-4" />;
    return <FolderOpen className="w-4 h-4" />;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="bg-black/50 border border-white/10 rounded-none p-12 flex items-center justify-center">
          <Loader className="w-6 h-6 animate-spin text-white/60" />
          <span className="ml-3 text-white/60">Loading mail...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <button
          onClick={() => {
            setComposeData({ to: '', cc: '', bcc: '', subject: '', content: '' });
            setShowCompose(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition rounded-none"
        >
          <Plus className="w-4 h-4" />
          Compose
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="bg-black/50 border border-white/10 rounded-none min-h-[600px] flex">
        {/* Folder sidebar */}
        <div className="w-48 border-r border-white/10 p-3 space-y-1">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3 px-2">Folders</div>
          {folders.map(folder => (
            <button
              key={folder.folderId}
              onClick={() => setSelectedFolder(folder)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition ${selectedFolder?.folderId === folder.folderId
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
            >
              {getFolderIcon(folder)}
              <span className="flex-1 truncate">{folder.folderName}</span>
              {folder.unreadCount > 0 && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {folder.unreadCount}
                </span>
              )}
            </button>
          ))}

          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              onClick={() => loadFolders(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          {/* Search bar */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search messages..."
                className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto">
            {loadingMessages ? (
              <div className="p-8 text-center">
                <Loader className="w-5 h-5 animate-spin text-white/40 mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No messages
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <button
                    key={msg.messageId}
                    onClick={() => loadMessage(msg.messageId)}
                    className={`w-full p-3 text-left border-b border-white/5 transition ${selectedMessage?.messageId === msg.messageId
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                      } ${!msg.isRead ? 'bg-white/[0.02]' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(msg.messageId, msg.isStarred);
                        }}
                        className="mt-0.5"
                      >
                        {msg.isStarred ? (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <StarOff className="w-4 h-4 text-white/20 hover:text-white/40" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!msg.isRead ? 'font-semibold text-white' : 'text-white/80'}`}>
                            {msg.from || msg.fromAddress}
                          </span>
                          <span className="text-xs text-white/40 shrink-0">
                            {formatDate(msg.receivedTime)}
                          </span>
                        </div>
                        <div className={`text-sm truncate ${!msg.isRead ? 'font-medium text-white/90' : 'text-white/60'}`}>
                          {msg.subject}
                        </div>
                        {msg.summary && (
                          <div className="text-xs text-white/40 truncate mt-1">
                            {msg.summary}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {msg.hasAttachment && (
                            <Paperclip className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Pagination */}
                {(hasMore || page > 0) && (
                  <div className="p-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => selectedFolder && loadMessages(selectedFolder.folderId, page - 1)}
                      disabled={page === 0}
                      className="p-2 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-white/40">Page {page + 1}</span>
                    <button
                      onClick={() => selectedFolder && loadMessages(selectedFolder.folderId, page + 1)}
                      disabled={!hasMore}
                      className="p-2 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 flex flex-col">
          {loadingMessage ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : selectedMessage ? (
            <>
              {/* Message header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white truncate">
                      {selectedMessage.subject}
                    </h2>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/40 w-12">From:</span>
                        <span className="text-white">{selectedMessage.from || selectedMessage.fromAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/40 w-12">To:</span>
                        <span className="text-white/70">{selectedMessage.to || selectedMessage.toAddress}</span>
                      </div>
                      {selectedMessage.cc && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white/40 w-12">CC:</span>
                          <span className="text-white/70">{selectedMessage.cc}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/40 w-12">Date:</span>
                        <span className="text-white/70">
                          {new Date(selectedMessage.receivedTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReply}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Reply"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleForward}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Forward"
                    >
                      <Forward className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStar(selectedMessage.messageId, selectedMessage.isStarred)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title={selectedMessage.isStarred ? 'Unstar' : 'Star'}
                    >
                      {selectedMessage.isStarred ? (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowMoveMenu(!showMoveMenu)}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                        title="Move to folder"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      {showMoveMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-black border border-white/20 shadow-xl z-50 min-w-[150px]">
                          {folders.filter(f => f.folderId !== selectedFolder?.folderId).map(folder => (
                            <button
                              key={folder.folderId}
                              onClick={() => handleMove(selectedMessage.messageId, folder.folderId)}
                              className="w-full px-3 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2"
                            >
                              {getFolderIcon(folder)}
                              {folder.folderName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Delete this message?')) {
                          handleDelete(selectedMessage.messageId);
                        }
                      }}
                      className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/40 mb-2">Attachments</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMessage.attachments.map(att => (
                      <button
                        key={att.attachmentId}
                        onClick={() => handleDownloadAttachment(selectedMessage.messageId, att)}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                      >
                        <Paperclip className="w-4 h-4 text-white/40" />
                        <span className="text-white/80">{att.attachmentName}</span>
                        <span className="text-white/40 text-xs">
                          ({formatSize(att.attachmentSize)})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message body */}
              <div
                ref={contentRef}
                className="flex-1 overflow-auto p-4"
              >
                {selectedMessage.htmlContent ? (
                  <div
                    className="prose prose-invert max-w-none text-white/80"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(selectedMessage.htmlContent, {
                        ADD_TAGS: ['style'],
                        ADD_ATTR: ['target']
                      })
                    }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-white/80 font-sans">
                    {selectedMessage.content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-black border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="font-semibold text-white">
                {composeData.isReply ? 'Reply' : composeData.isForward ? 'Forward' : 'New Message'}
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">To *</label>
                <input
                  type="text"
                  value={composeData.to}
                  onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">CC</label>
                  <input
                    type="text"
                    value={composeData.cc}
                    onChange={(e) => setComposeData(prev => ({ ...prev, cc: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">BCC</label>
                  <input
                    type="text"
                    value={composeData.bcc}
                    onChange={(e) => setComposeData(prev => ({ ...prev, bcc: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Subject *</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Message</label>
                <textarea
                  value={composeData.content}
                  onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 text-sm text-white/60 hover:text-white transition"
              >
                Save Draft
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50"
                >
                  {sending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
