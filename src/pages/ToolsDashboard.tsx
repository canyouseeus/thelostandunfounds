import { Link } from 'react-router-dom'
import { Download, ArrowRight } from 'lucide-react'

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  path: string
}

const tools: Tool[] = [
  {
    id: 'tiktok-downloader',
    name: 'TikTok Downloader',
    description: 'Download TikTok videos without watermarks',
    icon: <Download className="w-5 h-5" />,
    path: '/tools/tiktok-downloader',
  },
  // Add more tools here as you create them
]

export default function ToolsDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="text-center mb-4">
        <h1 className="text-5xl font-bold text-white mb-4">
          Tool Box
        </h1>
        <p className="text-xl text-white/80">
          Try one of these custom tools!
        </p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group relative bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center text-white group-hover:border-white/40 transition-colors flex-shrink-0">
                {tool.icon}
              </div>
              <div className="flex flex-col justify-center min-h-[40px]">
                <h2 className="text-lg font-bold text-white leading-none">{tool.name}</h2>
                <p className="text-sm text-white/70 leading-tight mt-1.5">{tool.description}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-20">
          <Download className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <p className="text-white/70 text-lg">No tools available yet. Add your first tool!</p>
        </div>
      )}
    </div>
  )
}

