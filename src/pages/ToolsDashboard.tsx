import { Link } from 'react-router-dom'
import { Download, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import SubscriptionStatus from '../components/subscription/SubscriptionStatus'

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
    icon: <Download className="w-5 h-5 text-white" />,
    path: '/tools/tiktok-downloader',
  },
  // Add more tools here as you create them
]

export default function ToolsDashboard() {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  
  // Debug: Log when component renders
  console.log('ToolsDashboard rendered, tools count:', tools.length)

  const handleCardClick = (toolId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(toolId)) {
        newSet.delete(toolId)
      } else {
        newSet.add(toolId)
      }
      return newSet
    })
    
    // Navigate after animation completes
    setTimeout(() => {
      const tool = tools.find(t => t.id === toolId)
      if (tool) {
        window.location.href = tool.path
      }
    }, 300)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-white mb-4 uppercase">
          Tool Box
        </h1>
        <p className="text-sm text-white/80">
          Try one of these custom tools!
        </p>
      </div>

      <div className="mb-6">
        <SubscriptionStatus />
      </div>

      <div className="space-y-3">
        {tools.map((tool) => {
          const isFlipped = flippedCards.has(tool.id)
          return (
            <div
              key={tool.id}
              className={`tool-card ${isFlipped ? 'flipped' : ''}`}
            >
              <div className="tool-card-inner">
                <Link
                  to={tool.path}
                  className="tool-card-front group bg-black/50 border border-white rounded-none px-6 py-4 hover:border-white hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] transition-all duration-300 flex items-center gap-4 cursor-pointer w-full no-underline"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCardClick(tool.id, e);
                  }}
                >
                  {/* Icon Container - Fixed width, doesn't shrink */}
                  <div className="w-10 h-10 border border-white flex items-center justify-center group-hover:border-white group-hover:scale-110 transition-all flex-shrink-0">
                    {tool.icon}
                  </div>
                  
                  {/* Text - All on one line, left aligned */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white leading-tight text-left m-0 whitespace-nowrap">{tool.name}</h2>
                    <p className="text-sm text-white/70 leading-tight text-left m-0">{tool.description}</p>
                  </div>
                </Link>
                <div className="tool-card-back bg-black/50 border border-white rounded-none px-6 py-4 flex items-center justify-center cursor-pointer">
                  <div className="text-center">
                    <div className="w-16 h-16 border-2 border-white rounded-none flex items-center justify-center text-white mx-auto mb-4 animate-spin">
                      <ArrowRight className="w-8 h-8" />
                    </div>
                    <p className="text-white/80 text-sm">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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

