import { useState, useEffect } from 'react'
import { Folder, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

interface DriveFolder {
  id: string
  name: string
  createdTime?: string
  modifiedTime?: string
  parents?: string[]
}

export default function GoogleDriveFolders() {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

  useEffect(() => {
    checkAuthAndLoadFolders()
  }, [])

  const checkAuthAndLoadFolders = async () => {
    try {
      // Check if authenticated
      const statusResponse = await fetch(`${API_BASE_URL}/api/drive/status`)
      const statusData = await statusResponse.json()
      setAuthenticated(statusData.authenticated || false)

      if (statusData.authenticated) {
        await loadFolders()
      } else {
        setLoading(false)
        setError('Not authenticated. Please connect Google Drive first.')
      }
    } catch (err: any) {
      console.error('Auth check failed:', err)
      setLoading(false)
      setError('Failed to check authentication status.')
    }
  }

  const loadFolders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/drive/folders`)
      if (!response.ok) {
        throw new Error('Failed to fetch folders')
      }
      
      const data = await response.json()
      setFolders(data.folders || [])
    } catch (err: any) {
      console.error('Failed to load folders:', err)
      setError(err.message || 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    const authWindow = window.open(
      `${API_BASE_URL}/api/auth/google`,
      'Google Auth',
      'width=500,height=600'
    )
    
    const checkAuth = setInterval(async () => {
      if (authWindow?.closed) {
        clearInterval(checkAuth)
        await checkAuthAndLoadFolders()
      }
    }, 1000)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          <Folder className="w-12 h-12" />
          Google Drive Folders
        </h1>
        <p className="text-xl text-white/80">
          View all folders in your Google Drive
        </p>
      </div>

      {!authenticated ? (
        <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-6">
            Please connect your Google Drive account to view folders.
          </p>
          <button
            onClick={handleConnect}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            Connect Google Drive
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="text-white/70">
              {folders.length > 0 && (
                <span>Found {folders.length} folder{folders.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <button
              onClick={loadFolders}
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>

          {loading && folders.length === 0 ? (
            <div className="text-center py-20">
              <Loader2 className="w-16 h-16 text-white/50 mx-auto mb-4 animate-spin" />
              <p className="text-white/70 text-lg">Loading folders...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-red-500 font-semibold">Error</h3>
              </div>
              <p className="text-white/70">{error}</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-20">
              <Folder className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 text-lg">No folders found in your Google Drive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center text-white flex-shrink-0 mt-1">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-2 truncate">
                          {folder.name}
                        </h3>
                        <div className="space-y-1 text-sm text-white/60">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">ID:</span>
                            <code className="text-xs bg-white/5 px-2 py-1 rounded">
                              {folder.id}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {formatDate(folder.createdTime)}
                          </div>
                          <div>
                            <span className="font-medium">Modified:</span>{' '}
                            {formatDate(folder.modifiedTime)}
                          </div>
                          {folder.parents && folder.parents.length > 0 && (
                            <div>
                              <span className="font-medium">Parent ID:</span>{' '}
                              <code className="text-xs bg-white/5 px-2 py-1 rounded">
                                {folder.parents[0]}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
