/**
 * SAGE MODE Overlay - Annotation tools and control panel
 */

import { useState, useRef, useEffect } from 'react';
import { useSageMode, SageModeAnnotation } from '../contexts/SageModeContext';
import { 
  Pen, 
  Circle, 
  Square, 
  Type, 
  MousePointer2, 
  Trash2,
  Save
} from 'lucide-react';

type ToolType = 'pen' | 'circle' | 'rectangle' | 'text' | 'selector' | null;

export default function SageModeOverlay() {
  const { state, addAnnotation } = useSageMode();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [localAnnotations, setLocalAnnotations] = useState<SageModeAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  if (!state.enabled) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeTool) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'selector') {
      const target = e.target as HTMLElement;
      // Find the actual page element, not the overlay
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const pageElement = elements.find(el => 
        el !== overlayRef.current && 
        !overlayRef.current?.contains(el) &&
        el !== document.body &&
        el !== document.documentElement
      ) as HTMLElement;
      
      if (pageElement && selectedElement !== pageElement) {
        // Remove previous selection
        if (selectedElement) {
          selectedElement.style.outline = '';
          selectedElement.style.outlineOffset = '';
        }
        // Highlight new selection
        setSelectedElement(pageElement);
        pageElement.style.outline = '2px solid #FFD700';
        pageElement.style.outlineOffset = '2px';
        
        // Create annotation for selected element
        const annotation: SageModeAnnotation = {
          id: Date.now().toString(),
          type: 'selector',
          data: {
            elementTag: pageElement.tagName,
            elementId: pageElement.id,
            elementClass: pageElement.className,
            elementText: pageElement.textContent?.substring(0, 100),
            position: {
              x: pageElement.getBoundingClientRect().left,
              y: pageElement.getBoundingClientRect().top,
              width: pageElement.getBoundingClientRect().width,
              height: pageElement.getBoundingClientRect().height,
            },
          },
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
        };
        addAnnotation(annotation);
      }
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (activeTool === 'circle' || activeTool === 'rectangle') {
      setIsDrawing(true);
      setStartPos({ x, y });
      setEndPos({ x, y });
    } else if (activeTool === 'text') {
      setTextPosition({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !activeTool) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }]);
    } else if (activeTool === 'circle' || activeTool === 'rectangle') {
      setEndPos({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !activeTool) return;

    if (activeTool === 'pen' && currentPath.length > 0) {
      const annotation: SageModeAnnotation = {
        id: Date.now().toString(),
        type: 'pen',
        data: { path: currentPath },
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
      };
      setLocalAnnotations(prev => [...prev, annotation]);
      setCurrentPath([]);
    } else if ((activeTool === 'circle' || activeTool === 'rectangle') && startPos && endPos) {
      const annotation: SageModeAnnotation = {
        id: Date.now().toString(),
        type: activeTool,
        data: {
          x: Math.min(startPos.x, endPos.x),
          y: Math.min(startPos.y, endPos.y),
          width: Math.abs(endPos.x - startPos.x),
          height: Math.abs(endPos.y - startPos.y),
        },
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
      };
      setLocalAnnotations(prev => [...prev, annotation]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setEndPos(null);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return;

    const annotation: SageModeAnnotation = {
      id: Date.now().toString(),
      type: 'text',
      data: { text: textInput, x: textPosition.x, y: textPosition.y },
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };
    setLocalAnnotations(prev => [...prev, annotation]);
    addAnnotation(annotation);
    setTextInput('');
    setTextPosition(null);
  };

  const clearAnnotations = () => {
    setLocalAnnotations([]);
    if (selectedElement) {
      selectedElement.style.outline = '';
      selectedElement.style.outlineOffset = '';
      setSelectedElement(null);
    }
  };

  const saveAnnotations = () => {
    // Save all local annotations to SAGE MODE context
    localAnnotations.forEach(ann => {
      addAnnotation(ann);
    });
    // Clear local annotations after saving
    setLocalAnnotations([]);
  };

  return (
    <>
      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-[99999] bg-black/95 border border-yellow-400/50 rounded-none p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-yellow-400 font-bold text-sm">SAGE MODE ACTIVE</span>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => setActiveTool(activeTool === 'pen' ? null : 'pen')}
            className={`p-2 border rounded-none transition ${
              activeTool === 'pen'
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title="Pen Tool"
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'circle' ? null : 'circle')}
            className={`p-2 border rounded-none transition ${
              activeTool === 'circle'
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title="Circle Tool"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'rectangle' ? null : 'rectangle')}
            className={`p-2 border rounded-none transition ${
              activeTool === 'rectangle'
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title="Rectangle Tool"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
            className={`p-2 border rounded-none transition ${
              activeTool === 'text'
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title="Text Tool"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'selector' ? null : 'selector')}
            className={`p-2 border rounded-none transition ${
              activeTool === 'selector'
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title="Selector Tool"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveAnnotations}
            className="flex-1 px-3 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/50 rounded-none text-yellow-400 text-xs font-medium transition flex items-center justify-center gap-1"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={clearAnnotations}
            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-none text-red-400 text-xs font-medium transition"
            title="Clear Annotations"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {activeTool && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/60 text-xs">
              Active: {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Tool
            </p>
          </div>
        )}
      </div>
    </>
  );
}
