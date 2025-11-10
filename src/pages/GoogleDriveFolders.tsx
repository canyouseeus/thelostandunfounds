import { useState, useEffect } from 'react'
import { Folder, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useTool, getAvailableTools } from '../services/mcp-registry'

interface DriveFolder {
  id: string
  name: string
  createdTime?: string
  modifiedTime?: string
  parents?: string[]
  webViewLink?: string
  webContentLink?: string
}

export default function GoogleDriveFolders() {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mcpAvailable, setMcpAvailable] = useState(false)

  useEffect(() => {
    checkMCPAndLoadFolders()
  }, [])

  const checkMCPAndLoadFolders = async () => {
    try {
      // Check if MCP Google Drive tools are available
      const availableTools = await getAvailableTools('googledrive')
      if (availableTools && availableTools.length > 0) {
        setMcpAvailable(true)
        await loadFoldersWithMCP()
      } else {
        // Fallback: try alternative namespaces
        const altTools = await getAvailableTools('google-drive')
        if (altTools && altTools.length > 0) {
          setMcpAvailable(true)
          await loadFoldersWithMCP()
        } else {
          setLoading(false)
          setError('MCP Google Drive tools not found. Please ensure Google Drive MCP Server is configured in Cursor.')
        }
      }
    } catch (err: any) {
      console.error('MCP check failed:', err)
      setLoading(false)
      setError('Failed to access MCP tools. Please ensure MCP is properly configured.')
    }
  }

  const loadFoldersWithMCP = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try different possible MCP tool names for listing folders
      const possibleToolNames = [
        'listFolders',
        'list_folders',
        'getFolders',
        'get_folders',
        'listFiles',
        'list_files'
      ]
      
      let result = null
      let toolUsed = null
      
      for (const toolName of possibleToolNames) {
        try {
          // Try googledrive namespace first
          result = await useTool('googledrive', toolName, {})
          toolUsed = `googledrive.${toolName}`
          break
        } catch (e) {
          // Try google-drive namespace
          try {
            result = await useTool('google-drive', toolName, {})
            toolUsed = `google-drive.${toolName}`
            break
          } catch (e2) {
            continue
          }
        }
      }
      
      if (!result) {
        throw new Error('Could not find a suitable MCP tool to list folders')
      }
      
      console.log(`✅ Used MCP tool: ${toolUsed}`)
      
      // Handle different response formats
      if (Array.isArray(result)) {
        setFolders(result)
      } else if (result.folders) {
        setFolders(result.folders)
      } else if (result.files) {
        // Filter to only folders if files are returned
        const folderFiles = result.files.filter((file: any) => 
          file.mimeType === 'application/vnd.google-apps.folder' || 
          file.kind === 'drive#folder'
        )
        setFolders(folderFiles)
      } else if (result.data && Array.isArray(result.data)) {
        setFolders(result.data)
      } else {
        setFolders([])
      }
    } catch (err: any) {
      console.error('Failed to load folders via MCP:', err)
      setError(err.message || 'Failed to load folders using MCP tools')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    checkMCPAndLoadFolders()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const getFolderUrl = (folder: DriveFolder) => {
    // Use webViewLink if available, otherwise construct URL from folder ID
    if (folder.webViewLink) {
      return folder.webViewLink
    }
    return `https://drive.google.com/drive/folders/${folder.id}`
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

      {!mcpAvailable && error ? (
        <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-4">{error}</p>
          <p className="text-white/50 text-sm mb-6">
            MCP tools are configured in Cursor IDE settings. Ensure Google Drive MCP Server is enabled.
          </p>
          <button
            onClick={handleRetry}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            Retry
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
              onClick={loadFoldersWithMCP}
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
                <a
                  key={folder.id}
                  href={getFolderUrl(folder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center text-white flex-shrink-0 mt-1 group-hover:border-white/40 transition-colors">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-2 truncate group-hover:text-white/90 transition-colors">
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
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
