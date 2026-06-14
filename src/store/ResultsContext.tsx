import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SavedResult, FabricResult, RollGroup, Shipment, SampleTest, Unit } from '../types';
import { STORAGE_KEY } from '../utils/constants';

// State interface
interface ResultsState {
  results: SavedResult[];
  editingId: number | null;
  unit: Unit;
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
  | { type: 'IMPORT_RESULTS'; payload: SavedResult[] };

// Initial state with default data
const initialState: ResultsState = {
  results: [],
  editingId: null,
  unit: 'inches'
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
    results: loadInitialResults()
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
