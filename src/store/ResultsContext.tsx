import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SavedResult, FabricResult, RollGroup, Shipment, SampleTest, Unit, Folder, Tag } from '../types';
import { STORAGE_KEY } from '../utils/constants';

const FOLDERS_KEY = 'shrinkage_folders';
const TAGS_KEY = 'shrinkage_tags';

// State interface
interface ResultsState {
  results: SavedResult[];
  editingId: number | null;
  unit: Unit;
  folders: Folder[];
  tags: Tag[];
  selectedIds: Set<number>;
}

// Action types
type ResultsAction =
  | { type: 'SET_RESULTS'; payload: SavedResult[] }
  | { type: 'ADD_RESULT'; payload: SavedResult }
  | { type: 'UPDATE_RESULT'; payload: SavedResult }
  | { type: 'DELETE_RESULT'; payload: number }
  | { type: 'DELETE_ALL' }
  | { type: 'SET_EDITING_ID'; payload: number | null }
  | { type: 'SET_UNIT'; payload: Unit }
  | { type: 'IMPORT_RESULTS'; payload: SavedResult[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'TOGGLE_SELECT'; payload: number }
  | { type: 'SELECT_ALL'; payload: number[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'ASSIGN_RESULT_TAG'; payload: { resultId: number; tagId: string } }
  | { type: 'REMOVE_RESULT_TAG'; payload: { resultId: number; tagId: string } }
  | { type: 'ASSIGN_RESULT_FOLDER'; payload: { resultId: number; folderId: string | undefined } }
  | { type: 'RENAME_FOLDER'; payload: { id: string; name: string } }
  | { type: 'RENAME_TAG'; payload: { id: string; label: string } };

// Initial state with default data
const initialState: ResultsState = {
  results: [],
  editingId: null,
  unit: 'inches',
  folders: [],
  tags: [],
  selectedIds: new Set()
};

// Load initial results from localStorage
const loadInitialResults = (): SavedResult[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all records have recordType
      return parsed.map((r: SavedResult) => ({
        ...r,
        recordType: r.recordType || 'single'
      }));
    }
  } catch (e) {
    console.error('Error loading results from localStorage:', e);
  }
  // Return default sample data
  return [{
    id: 1,
    type: "Denim",
    name: "14oz Raw Selvedge",
    wash: "Raw Wash",
    temp: "Cold",
    duration: "30m",
    bwL: 20,
    awL: 19.4,
    bwW: 20,
    awW: 19.5,
    wShrink: 2.5,
    lShrink: 3.0,
    date: "10/24/2023",
    unit: "inches",
    recordType: "single"
  }];
};

// Reducer
function resultsReducer(state: ResultsState, action: ResultsAction): ResultsState {
  let newResults: SavedResult[];
  
  switch (action.type) {
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
      
    case 'ADD_RESULT':
      newResults = [...state.results, action.payload];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
      
    case 'UPDATE_RESULT':
      newResults = state.results.map(r => 
        r.id === action.payload.id ? action.payload : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
      
    case 'DELETE_RESULT':
      newResults = state.results.filter(r => r.id !== action.payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
      
    case 'DELETE_ALL':
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return { ...state, results: [] };
      
    case 'SET_EDITING_ID':
      return { ...state, editingId: action.payload };
      
    case 'SET_UNIT':
      return { ...state, unit: action.payload };
      
    case 'IMPORT_RESULTS':
      localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
      return { ...state, results: action.payload };

    case 'ADD_FOLDER': {
      const newFolders = [...state.folders, action.payload];
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
      return { ...state, folders: newFolders };
    }
    case 'DELETE_FOLDER': {
      const newFolders = state.folders.filter(f => f.id !== action.payload);
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
      const newResults = state.results.map(r =>
        r.folderId === action.payload ? { ...r, folderId: undefined } : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, folders: newFolders, results: newResults };
    }
    case 'ADD_TAG': {
      const newTags = [...state.tags, action.payload];
      localStorage.setItem(TAGS_KEY, JSON.stringify(newTags));
      return { ...state, tags: newTags };
    }
    case 'DELETE_TAG': {
      const newTags = state.tags.filter(t => t.id !== action.payload);
      localStorage.setItem(TAGS_KEY, JSON.stringify(newTags));
      const newResults = state.results.map(r => ({
        ...r,
        tags: (r.tags || []).filter((tid: string) => tid !== action.payload)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, tags: newTags, results: newResults };
    }
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedIds: next };
    }
    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(action.payload) };
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: new Set() };
    case 'ASSIGN_RESULT_TAG': {
      const newResults = state.results.map(r => {
        if (r.id !== action.payload.resultId) return r;
        const existing = r.tags || [];
        if (existing.includes(action.payload.tagId)) return r;
        return { ...r, tags: [...existing, action.payload.tagId] };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
    }
    case 'REMOVE_RESULT_TAG': {
      const newResults = state.results.map(r => {
        if (r.id !== action.payload.resultId) return r;
        return { ...r, tags: (r.tags || []).filter((t: string) => t !== action.payload.tagId) };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
    }
    case 'ASSIGN_RESULT_FOLDER': {
      const newResults = state.results.map(r =>
        r.id === action.payload.resultId ? { ...r, folderId: action.payload.folderId } : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
      return { ...state, results: newResults };
    }
    case 'RENAME_FOLDER': {
      const newFolders = state.folders.map(f =>
        f.id === action.payload.id ? { ...f, name: action.payload.name } : f
      );
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
      return { ...state, folders: newFolders };
    }
    case 'RENAME_TAG': {
      const newTags = state.tags.map(t =>
        t.id === action.payload.id ? { ...t, label: action.payload.label } : t
      );
      localStorage.setItem(TAGS_KEY, JSON.stringify(newTags));
      return { ...state, tags: newTags };
    }

    default:
      return state;
  }
}

// Context interface
interface ResultsContextType {
  state: ResultsState;
  dispatch: React.Dispatch<ResultsAction>;
  // Helper functions
  addResult: (result: SavedResult) => void;
  updateResult: (result: SavedResult) => void;
  deleteResult: (id: number) => void;
  deleteAll: () => void;
  importResults: (results: SavedResult[]) => void;
  exportResults: () => string;
  setEditingId: (id: number | null) => void;
  setUnit: (unit: Unit) => void;
  // Folder & Tag helpers
  addFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  addTag: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  assignResultTag: (resultId: number, tagId: string) => void;
  removeResultTag: (resultId: number, tagId: string) => void;
  assignResultFolder: (resultId: number, folderId: string | undefined) => void;
  renameFolder: (id: string, name: string) => void;
  renameTag: (id: string, label: string) => void;
  // Selection helpers
  toggleSelect: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  bulkDelete: () => void;
  bulkExport: (ids: number[]) => string;
  // Type guards
  isFabricResult: (result: SavedResult) => result is FabricResult;
  isRollGroup: (result: SavedResult) => result is RollGroup;
  isShipment: (result: SavedResult) => result is Shipment;
  isSampleTest: (result: SavedResult) => result is SampleTest;
}

// Create context
const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

// Provider component
interface ResultsProviderProps {
  children: ReactNode;
}

export function ResultsProvider({ children }: ResultsProviderProps) {
  const [state, dispatch] = useReducer(resultsReducer, {
    ...initialState,
    results: loadInitialResults(),
    folders: (() => {
      try { const s = localStorage.getItem(FOLDERS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
    })(),
    tags: (() => {
      try { const s = localStorage.getItem(TAGS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
    })(),
  });

  // Helper functions
  const addResult = (result: SavedResult) => {
    dispatch({ type: 'ADD_RESULT', payload: result });
  };

  const updateResult = (result: SavedResult) => {
    dispatch({ type: 'UPDATE_RESULT', payload: result });
  };

  const deleteResult = (id: number) => {
    dispatch({ type: 'DELETE_RESULT', payload: id });
  };

  const deleteAll = () => {
    if (confirm('Delete all saved results? This cannot be undone.')) {
      dispatch({ type: 'DELETE_ALL' });
    }
  };

  const importResults = (results: SavedResult[]) => {
    if (confirm('Replace current library with imported data? Click OK to replace, Cancel to keep existing.')) {
      dispatch({ type: 'IMPORT_RESULTS', payload: results });
    }
  };

  const exportResults = (): string => {
    return JSON.stringify(state.results, null, 2);
  };

  const setEditingId = (id: number | null) => {
    dispatch({ type: 'SET_EDITING_ID', payload: id });
  };

  const setUnit = (unit: Unit) => {
    dispatch({ type: 'SET_UNIT', payload: unit });
  };

  // Folder & Tag helpers
  const addFolder = (folder: Folder) => dispatch({ type: 'ADD_FOLDER', payload: folder });
  const deleteFolder = (id: string) => dispatch({ type: 'DELETE_FOLDER', payload: id });
  const addTag = (tag: Tag) => dispatch({ type: 'ADD_TAG', payload: tag });
  const deleteTag = (id: string) => dispatch({ type: 'DELETE_TAG', payload: id });
  const assignResultTag = (resultId: number, tagId: string) => dispatch({ type: 'ASSIGN_RESULT_TAG', payload: { resultId, tagId } });
  const removeResultTag = (resultId: number, tagId: string) => dispatch({ type: 'REMOVE_RESULT_TAG', payload: { resultId, tagId } });
  const assignResultFolder = (resultId: number, folderId: string | undefined) => dispatch({ type: 'ASSIGN_RESULT_FOLDER', payload: { resultId, folderId } });
  const renameFolder = (id: string, name: string) => dispatch({ type: 'RENAME_FOLDER', payload: { id, name } });
  const renameTag = (id: string, label: string) => dispatch({ type: 'RENAME_TAG', payload: { id, label } });

  // Selection helpers
  const toggleSelect = (id: number) => dispatch({ type: 'TOGGLE_SELECT', payload: id });
  const selectAll = (ids: number[]) => dispatch({ type: 'SELECT_ALL', payload: ids });
  const clearSelection = () => dispatch({ type: 'CLEAR_SELECTION' });
  const bulkDelete = () => {
    if (state.selectedIds.size === 0) return;
    if (confirm(`Delete ${state.selectedIds.size} selected result(s)? This cannot be undone.`)) {
      state.selectedIds.forEach(id => dispatch({ type: 'DELETE_RESULT', payload: id }));
      dispatch({ type: 'CLEAR_SELECTION' });
    }
  };
  const bulkExport = (ids: number[]): string => {
    const selected = state.results.filter(r => ids.includes(r.id));
    return JSON.stringify(selected, null, 2);
  };

  // Type guards
  const isFabricResult = (result: SavedResult): result is FabricResult => {
    return result.recordType === 'single';
  };

  const isRollGroup = (result: SavedResult): result is RollGroup => {
    return result.recordType === 'group';
  };

  const isShipment = (result: SavedResult): result is Shipment => {
    return result.recordType === 'shipment';
  };

  const isSampleTest = (result: SavedResult): result is SampleTest => {
    return result.recordType === 'sample';
  };

  const value: ResultsContextType = {
    state,
    dispatch,
    addResult,
    updateResult,
    deleteResult,
    deleteAll,
    importResults,
    exportResults,
    setEditingId,
    setUnit,
    addFolder,
    deleteFolder,
    addTag,
    deleteTag,
    assignResultTag,
    removeResultTag,
    assignResultFolder,
    renameFolder,
    renameTag,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkDelete,
    bulkExport,
    isFabricResult,
    isRollGroup,
    isShipment,
    isSampleTest
  };

  return (
    <ResultsContext.Provider value={value}>
      {children}
    </ResultsContext.Provider>
  );
}

// Hook to use the context
export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
}
