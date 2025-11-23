import { useState, useEffect } from 'react'
import { Loader2, Image as ImageIcon, Folder, AlertCircle, RefreshCw } from 'lucide-react'

interface Photo {
  id: string
  name: string
  mimeType: string
  thumbnailUrl: string
  imageUrl: string
  webViewLink?: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  width?: number
  height?: number
}

interface Folder {
  id: string
  name: string
  webViewLink?: string
}

export default function GoogleDrivePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  // Check for stored access token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('google_drive_access_token')
    if (storedToken) {
      setAccessToken(storedToken)
      fetchFolders(storedToken)
      fetchPhotos(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  // Listen for auth success message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'drive_auth_success') {
        const token = event.data.accessToken
        if (token) {
          localStorage.setItem('google_drive_access_token', token)
          if (event.data.refreshToken) {
            localStorage.setItem('google_drive_refresh_token', event.data.refreshToken)
          }
          setAccessToken(token)
          setAuthenticating(false)
          fetchFolders(token)
          fetchPhotos(token)
        }
      } else if (event.data.type === 'drive_auth_error') {
        setError(event.data.error || 'Authentication failed')
        setAuthenticating(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const authenticate = async () => {
    setAuthenticating(true)
    setError(null)

    try {
      const response = await fetch('/api/drive/auth')
      const data = await response.json()

      if (data.authUrl) {
        // Open auth window
        const authWindow = window.open(
          data.authUrl,
          'Google Drive Auth',
          'width=500,height=600,scrollbars=yes'
        )

        // Check if window was blocked
        if (!authWindow || authWindow.closed) {
          setError('Popup blocked. Please allow popups and try again.')
          setAuthenticating(false)
          return
        }

        // Monitor window closure
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed)
            setAuthenticating(false)
          }
        }, 1000)
      } else {
        throw new Error(data.error || 'Failed to get auth URL')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
      setAuthenticating(false)
    }
  }

  const fetchFolders = async (token: string) => {
    try {
      const response = await fetch(`/api/drive/folders?token=${encodeURIComponent(token)}`)
      const data = await response.json()

      if (data.error && data.needsAuth) {
        // Token expired, need to re-authenticate
        localStorage.removeItem('google_drive_access_token')
        setAccessToken(null)
        setError('Session expired. Please authenticate again.')
        return
      }

      if (data.folders) {
        setFolders(data.folders)
      }
    } catch (err: any) {
      console.error('Error fetching folders:', err)
    }
  }

  const fetchPhotos = async (token: string, pageToken?: string, append = false) => {
    if (!append) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      let url = `/api/drive/photos?token=${encodeURIComponent(token)}`
      if (selectedFolder) {
        url += `&folderId=${encodeURIComponent(selectedFolder)}`
      }
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.error && data.needsAuth) {
        localStorage.removeItem('google_drive_access_token')
        setAccessToken(null)
        setError('Session expired. Please authenticate again.')
        return
      }

      if (data.photos) {
        if (append) {
          setPhotos(prev => [...prev, ...data.photos])
        } else {
          setPhotos(data.photos)
        }
        setNextPageToken(data.nextPageToken)
      } else {
        throw new Error(data.error || 'Failed to fetch photos')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch photos')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (nextPageToken && accessToken && !loadingMore) {
      fetchPhotos(accessToken, nextPageToken, true)
    }
  }

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId)
    if (accessToken) {
      fetchPhotos(accessToken)
    }
  }

  const signOut = () => {
    localStorage.removeItem('google_drive_access_token')
    localStorage.removeItem('google_drive_refresh_token')
    setAccessToken(null)
    setPhotos([])
    setFolders([])
    setSelectedFolder(null)
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <ImageIcon className="w-16 h-16 mx-auto text-white/60" />
          <h1 className="text-3xl font-bold">Google Drive Photos</h1>
          <p className="text-white/60">
            Connect your Google Drive to view and browse your photos
          </p>
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <button
            onClick={authenticate}
            disabled={authenticating}
            className="w-full bg-white text-black px-6 py-3 rounded font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {authenticating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Connect Google Drive'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Google Drive Photos</h1>
            {selectedFolder && (
              <button
                onClick={() => handleFolderSelect(null)}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                ← All Photos
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchPhotos(accessToken)}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Folder Navigation */}
        {folders.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => handleFolderSelect(null)}
                className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                  !selectedFolder
                    ? 'bg-white text-black'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                All Photos
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder.id)}
                  className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedFolder === folder.id
                      ? 'bg-white text-black'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-900/30 border border-red-500/50 rounded p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <p className="text-white/60">No photos found</p>
            {selectedFolder && (
              <button
                onClick={() => handleFolderSelect(null)}
                className="mt-4 text-sm text-white/80 hover:text-white underline"
              >
                View all photos
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square bg-white/5 rounded overflow-hidden cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {nextPageToken && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-5xl w-full max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="self-end mb-4 text-white/60 hover:text-white text-sm"
            >
              ✕ Close
            </button>
            <div className="flex-1 flex items-center justify-center">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold mb-2">{selectedPhoto.name}</h3>
              {selectedPhoto.width && selectedPhoto.height && (
                <p className="text-sm text-white/60">
                  {selectedPhoto.width} × {selectedPhoto.height}
                </p>
              )}
              {selectedPhoto.webViewLink && (
                <a
                  href={selectedPhoto.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/80 hover:text-white underline mt-2 inline-block"
                >
                  Open in Google Drive
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
