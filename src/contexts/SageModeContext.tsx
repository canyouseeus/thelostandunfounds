/**
 * SAGE MODE Context - Manages UI design experimentation state
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SageModeSelection {
  id: string;
  name: string;
  category: string;
  selected: boolean;
}

export interface SageModeNote {
  id: string;
  componentId: string;
  code?: string;
  notes: string;
  timestamp: string;
}

export interface SageModeAnnotation {
  id: string;
  type: 'pen' | 'circle' | 'rectangle' | 'text' | 'selector';
  data: any;
  timestamp: string;
  pageUrl?: string;
}

export interface SageModeState {
  enabled: boolean;
  selections: SageModeSelection[];
  notes: SageModeNote[];
  customCode: string;
  annotations: SageModeAnnotation[];
}

interface SageModeContextType {
  state: SageModeState;
  toggleSageMode: () => void;
  updateSelection: (id: string, selected: boolean) => void;
  addNote: (componentId: string, code: string, notes: string) => void;
  updateCustomCode: (code: string) => void;
  addAnnotation: (annotation: SageModeAnnotation) => void;
  exportReport: () => string;
  clearState: () => void;
}

const SageModeContext = createContext<SageModeContextType | undefined>(undefined);

const defaultSelections: SageModeSelection[] = [
  // Blog Components
  { id: 'blog-card', name: 'Blog Post Card', category: 'Blog', selected: false },
  { id: 'blog-expandable', name: 'Expandable Blog Card', category: 'Blog', selected: false },
  { id: 'blog-header', name: 'Blog Header', category: 'Blog', selected: false },
  { id: 'blog-content', name: 'Blog Content', category: 'Blog', selected: false },
  
  // Navigation
  { id: 'nav-menu', name: 'Navigation Menu', category: 'Navigation', selected: false },
  { id: 'nav-dropdown', name: 'Menu Dropdown', category: 'Navigation', selected: false },
  { id: 'nav-links', name: 'Navigation Links', category: 'Navigation', selected: false },
  
  // Buttons
  { id: 'button-primary', name: 'Primary Button', category: 'Buttons', selected: false },
  { id: 'button-secondary', name: 'Secondary Button', category: 'Buttons', selected: false },
  { id: 'button-outline', name: 'Outline Button', category: 'Buttons', selected: false },
  
  // Cards
  { id: 'card-white', name: 'White Card', category: 'Cards', selected: false },
  { id: 'card-black', name: 'Black Card', category: 'Cards', selected: false },
  { id: 'card-bento', name: 'Bento Card', category: 'Cards', selected: false },
  
  // Layout
  { id: 'layout-grid', name: 'Grid Layout', category: 'Layout', selected: false },
  { id: 'layout-container', name: 'Container', category: 'Layout', selected: false },
  { id: 'layout-spacing', name: 'Spacing', category: 'Layout', selected: false },
];

export function SageModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SageModeState>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('sageModeState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to default
      }
    }
    return {
      enabled: false,
      selections: defaultSelections,
      notes: [],
      customCode: '',
      annotations: [],
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('sageModeState', JSON.stringify(state));
  }, [state]);

  const toggleSageMode = () => {
    setState(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const updateSelection = (id: string, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selections: prev.selections.map(sel =>
        sel.id === id ? { ...sel, selected } : sel
      ),
    }));
  };

  const addNote = (componentId: string, code: string, notes: string) => {
    const newNote: SageModeNote = {
      id: Date.now().toString(),
      componentId,
      code,
      notes,
      timestamp: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
  };

  const updateCustomCode = (code: string) => {
    setState(prev => ({ ...prev, customCode: code }));
  };

  const addAnnotation = (annotation: SageModeAnnotation) => {
    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, { ...annotation, pageUrl: window.location.href }],
    }));
  };

  const exportReport = (): string => {
    const selected = state.selections.filter(s => s.selected);
    const report = {
      timestamp: new Date().toISOString(),
      enabled: state.enabled,
      selectedComponents: selected,
      notes: state.notes,
      customCode: state.customCode,
      annotations: state.annotations,
    };
    return JSON.stringify(report, null, 2);
  };

  const clearState = () => {
    setState({
      enabled: false,
      selections: defaultSelections,
      notes: [],
      customCode: '',
      annotations: [],
    });
    localStorage.removeItem('sageModeState');
  };

  return (
    <SageModeContext.Provider
      value={{
        state,
        toggleSageMode,
        updateSelection,
        addNote,
        updateCustomCode,
        addAnnotation,
        exportReport,
        clearState,
      }}
    >
      {children}
    </SageModeContext.Provider>
  );
}

export function useSageMode() {
  const context = useContext(SageModeContext);
  if (context === undefined) {
    throw new Error('useSageMode must be used within a SageModeProvider');
  }
  return context;
}
