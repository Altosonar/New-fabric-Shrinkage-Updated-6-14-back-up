// Unit type
export type Unit = 'inches' | 'cm';

// Record types
export type RecordType = 'single' | 'group' | 'shipment' | 'sample';

// ── Enterprise DB: Folder & Tag ──────────────────────────────────────────────
export interface Folder {
  id: string;
  name: string;
  color: string; // hex or CSS color
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

// ── Base mixin added to every SavedResult ────────────────────────────────────
export interface SavedResultMeta {
  tags?: string[];       // array of Tag ids
  folderId?: string;     // Folder id
  notes?: string;
}

// Single shrinkage result
export interface FabricResult extends SavedResultMeta {
  id: number;
  type: string;
  name: string;
  wash: string;
  temp?: string;
  duration?: string;
  bwL?: number | null;
  awL?: number | null;
  bwW?: number | null;
  awW?: number | null;
  wShrink: number;
  lShrink: number;
  unit: Unit;
  date: string;
  recordType: RecordType;
}

// Roll data for multi-roll manager
export interface Roll {
  id: string;
  bL?: number;
  bW?: number;
  aL?: number;
  aW?: number;
  sL?: number | null;
  sW?: number | null;
}

// Group of rolls
export interface RollGroup extends SavedResultMeta {
  id: number;
  recordType: 'group';
  name: string;
  rolls: Roll[];
  avgL: number;
  avgW: number;
  date: string;
  // Fabric & wash context (set when saving from Roll Manager)
  fabricType?: string;
  fabricName?: string;
  wash?: string;
  temp?: string;
  duration?: string;
  drying?: string;
}

// Shipment containing multiple groups
export interface ShipmentGroup {
  letter: string;
  rolls: Roll[];
  avgL: number;
  avgW: number;
}

export interface Shipment extends SavedResultMeta {
  id: number;
  recordType: 'shipment';
  name: string;
  groups: ShipmentGroup[];
  date: string;
  fabricType?: string;
  fabricName?: string;
  wash?: string;
  temp?: string;
  duration?: string;
  drying?: string;
}

// Sample test result
export interface SampleTest extends SavedResultMeta {
  id: number;
  recordType: 'sample';
  name: string;
  samples: Array<{
    sample: number;
    bL: number;
    bW: number;
    aL: number;
    aW: number;
    sL: string;
    sW: string;
  }>;
  avgL: number;
  avgW: number;
  cutL: number | null;
  cutW: number | null;
  desiredL: number | null;
  desiredW: number | null;
  date: string;
  fabricType?: string;
  fabricName?: string;
  wash?: string;
  temp?: string;
  duration?: string;
  drying?: string;
}

// Union type for all saved results
export type SavedResult = FabricResult | RollGroup | Shipment | SampleTest;

// Advanced test row
export interface AdvancedRow {
  id: number;
  bL?: string;
  bW?: string;
  aL?: string;
  aW?: string;
  sL?: string;
  sW?: string;
}

// Calculator mode
export type CalcMode = 'shrinkage' | 'wash' | 'quickmath' | 'advanced' | 'rollmgr' | 'results';

// View type
export type ViewType = 'calculator' | 'results';

// Sort options
export type SortOption = 'dateDesc' | 'dateAsc' | 'nameAsc' | 'shrinkDesc';

// ── Settings ─────────────────────────────────────────────────────────────────
export interface WashProfile {
  id: string;
  name: string;
  defaultTemp: string;
  defaultDuration: string;
  isCustom: true;
}

export interface AppSettings {
  measurementUnit: 'inches' | 'cm';
  temperatureScale: 'fahrenheit' | 'celsius';
  decimalPrecision: 1 | 2 | 3;
  samplingPercent: number;
  rollGroupSensitivity: number;
  warningThreshold: number;
  exportFormat: 'json' | 'csv';
}
