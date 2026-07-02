import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useResults } from '../../../store/ResultsContext';
import { useDialog } from '../../../components/ui/DialogProvider';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { calculateShrinkage, calculateAverage, calculateRange, groupSimilarRolls, RollStats, GroupedRoll } from '../../../utils/calculations';
import { GROUP_THRESHOLD, RECOMMENDATION_THRESHOLD, groupColorClasses, groupColors } from '../../../utils/constants';
import { Roll, RollGroup } from '../../../types';

interface RollManagerProps {
  unit: string;
  onTransferToMain: (avgL: number, avgW: number) => void;
}

interface RollRow {
  order: number;
  id: string;
  bL: string;
  bW: string;
  aL: string;
  aW: string;
  sL: string;
  sW: string;
  group: string;
}

const defaultRows: RollRow[] = [
  { order: 1, id: 'R1', bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-', group: '' },
  { order: 2, id: 'R2', bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-', group: '' },
  { order: 3, id: 'R3', bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-', group: '' },
  { order: 4, id: 'R4', bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-', group: '' },
  { order: 5, id: 'R5', bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-', group: '' },
];

export function RollManager({ unit, onTransferToMain }: RollManagerProps) {
  const { addResult } = useResults();
  const { showAlert, showConfirm } = useDialog();
  const nextOrderRef = useRef(6);
  const lastClearTokenRef = useRef<string | null>(null);
  const [rows, setRows] = useLocalStorage<RollRow[]>('rollManagerRows_v3', defaultRows);
  const [fillDownVisible, setFillDownVisible] = useState<{ bL: boolean; bW: boolean }>({ bL: false, bW: false });
  const [stats, setStats] = useState<RollStats>({ avgL: 0, avgW: 0, rangeL: 0, rangeW: 0 });
  const [groupedRolls, setGroupedRolls] = useLocalStorage<GroupedRoll[]>('rollManagerGroupedRolls', []);
  const [recommendation, setRecommendation] = useState({ text: 'Enter measurements to analyze.', type: 'normal' });
  const [samplingTotal, setSamplingTotal] = useLocalStorage('rollManagerSamplingTotal', '50');
  const [samplingLots, setSamplingLots] = useLocalStorage('rollManagerSamplingLots', '3');
  const [samplingStd, setSamplingStd] = useLocalStorage<'10pct' | 'sqrt' | '100pct'>('rollManagerSamplingStd', '10pct');
  const [deletedStack, setDeletedStack] = useState<Array<{ row: RollRow }>>([]);
  // Tabbed interface: 'measurements' | 'analytics'
  const [rollTab, setRollTab] = useState<'measurements' | 'analytics'>('measurements');
  const [samplingCollapsed, setSamplingCollapsed] = useState(false);


  // Save modal states
  const [saveGroupModalOpen, setSaveGroupModalOpen] = useState(false);
  const [saveShipmentModalOpen, setSaveShipmentModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [shipmentName, setShipmentName] = useState('');

  // Sync nextOrderRef with persisted rows on mount
  useEffect(() => {
    if (rows.length > 0) {
      const maxOrder = Math.max(...rows.map(r => r.order));
      nextOrderRef.current = maxOrder + 1;
    }
  }, []); // Run once on mount

  // ── Row mutations ────────────────────────────────────────────────────────────
  // Part 1 fix: handleRowChange ONLY updates the exact cell that changed.
  // Cascade removed — other rows are untouched until Fill Down is clicked.
  const handleRowChange = (rowIndex: number, field: keyof RollRow, value: string) => {
    setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, [field]: value } : row));
    // Show fill-down pill when row 0 Before field is non-empty
    if (rowIndex === 0 && (field === 'bL' || field === 'bW')) {
      setFillDownVisible(prev => ({ ...prev, [field]: value.trim() !== '' }));
    }
  };

  // Part 2: explicitly fill top value down to every row below
  const handleFillDown = (field: 'bL' | 'bW') => {
    const topValue = rows[0]?.[field];
    if (!topValue) return;
    setRows(prev => prev.map((row, i) => i === 0 ? row : { ...row, [field]: topValue }));
    setFillDownVisible(prev => ({ ...prev, [field]: false }));
  };

  // Part 3: Arrow-key grid navigation.
  // Column order: 0=id, 1=bL, 2=bW, 3=aL, 4=aW
  // Cell IDs use format: roll-{rowIdx}-{colIdx}
  const ROLL_COL_COUNT = 5;
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;
    switch (e.key) {
      case 'ArrowDown':  e.preventDefault(); nextRow = Math.min(rowIdx + 1, rows.length - 1); break;
      case 'ArrowUp':    e.preventDefault(); nextRow = Math.max(rowIdx - 1, 0); break;
      case 'ArrowRight': e.preventDefault(); nextCol = Math.min(colIdx + 1, ROLL_COL_COUNT - 1); break;
      case 'ArrowLeft':  e.preventDefault(); nextCol = Math.max(colIdx - 1, 0); break;
      case 'Tab':        return; // let Tab navigate naturally
      default:           return;
    }
    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const target = document.getElementById(`roll-${nextRow}-${nextCol}`) as HTMLInputElement | null;
      target?.focus();
      target?.select();
    }
  };

  const handleAddRow = () => {
    const nextOrder = nextOrderRef.current++;
    setRows(prev => {
      const newRow: RollRow = {
        order: nextOrder, id: '',
        bL: '', bW: '', aL: '', aW: '',
        sL: '-', sW: '-', group: ''
      };
      const newRows = [...prev, newRow];
      const sorted = newRows.sort((a, b) => a.order - b.order);
      return sorted.map((row, idx) => ({ ...row, id: row.id || `R${idx + 1}` }));
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    setRows(prev => {
      if (prev.length <= 1) return prev;
      const deletedRow = prev[rowIndex];
      if (deletedRow) setDeletedStack(stack => [...stack, { row: deletedRow }]);
      const newRows = prev.filter((_, idx) => idx !== rowIndex);
      const sorted = newRows.sort((a, b) => a.order - b.order);
      return sorted.map((row, idx) => ({ ...row, id: `R${idx + 1}` }));
    });
  };

  const handleRestoreLast = () => {
    if (deletedStack.length === 0) return;
    const lastDeleted = deletedStack[deletedStack.length - 1];
    setRows(prev => {
      const existingOrders = new Set(prev.map(row => row.order));
      if (existingOrders.has(lastDeleted.row.order)) return prev;
      const merged = [...prev, lastDeleted.row];
      const sorted = merged.sort((a, b) => a.order - b.order);
      return sorted.map((row, idx) => ({ ...row, id: `R${idx + 1}` }));
    });
    setDeletedStack(prev => prev.slice(0, -1));
  };

  // ── Main Calculation + Auto-Grouping ─────────────────────────────────────────
  useEffect(() => {
    // Step 1: Recalculate shrinkage for each row
    const recalculatedRows = rows.map(row => {
      const bL = parseFloat(row.bL);
      const aL = parseFloat(row.aL);
      const bW = parseFloat(row.bW);
      const aW = parseFloat(row.aW);

      let sL = '-';
      let sW = '-';

      if (!isNaN(bL) && !isNaN(aL) && bL !== 0) {
        sL = calculateShrinkage(bL, aL).toFixed(1) + '%';
      }
      if (!isNaN(bW) && !isNaN(aW) && bW !== 0) {
        sW = calculateShrinkage(bW, aW).toFixed(1) + '%';
      }

      return { ...row, sL, sW };
    });

    const hasChanges = recalculatedRows.some(
      (row, idx) => row.sL !== rows[idx]?.sL || row.sW !== rows[idx]?.sW
    );
    if (hasChanges) setRows(recalculatedRows);

    // Step 2: Calculate stats
    const sLValues: number[] = [];
    const sWValues: number[] = [];
    recalculatedRows.forEach(row => {
      if (row.sL !== '-') { const v = parseFloat(row.sL); if (!isNaN(v)) sLValues.push(v); }
      if (row.sW !== '-') { const v = parseFloat(row.sW); if (!isNaN(v)) sWValues.push(v); }
    });

    const nextStats = {
      avgL: calculateAverage(sLValues),
      avgW: calculateAverage(sWValues),
      rangeL: calculateRange(sLValues),
      rangeW: calculateRange(sWValues)
    };
    setStats(nextStats);

    // Step 3: Recommendation
    if (sLValues.length === 0 && sWValues.length === 0) {
      setRecommendation({ text: 'Enter measurements to analyze rolls.', type: 'normal' });
    } else {
      const highVar = nextStats.rangeL > RECOMMENDATION_THRESHOLD || nextStats.rangeW > RECOMMENDATION_THRESHOLD;
      if (highVar) {
        setRecommendation({ text: '⚠️ High Variation — Rolls are grouped by similarity. Use each group\'s average for cutting.', type: 'warning' });
      } else {
        setRecommendation({ text: '✅ Low Variation — All rolls are similar. Safe to use one average for cutting.', type: 'success' });
      }
    }

    // Step 4: Auto-group whenever ≥2 complete rows exist
    const rollData = recalculatedRows.map((row, idx) => ({
      id: row.id || `R${idx + 1}`,
      bL: row.bL ? parseFloat(row.bL) : undefined,
      bW: row.bW ? parseFloat(row.bW) : undefined,
      aL: row.aL ? parseFloat(row.aL) : undefined,
      aW: row.aW ? parseFloat(row.aW) : undefined,
      sL: row.sL !== '-' ? parseFloat(row.sL.replace('%', '')) : null,
      sW: row.sW !== '-' ? parseFloat(row.sW.replace('%', '')) : null,
    }));

    const completeRows = rollData.filter(r => r.sL !== null && r.sW !== null);

    if (completeRows.length >= 2) {
      const groups = groupSimilarRolls(rollData, GROUP_THRESHOLD);
      setGroupedRolls(groups);
    } else {
      setGroupedRolls([]);
    }
  }, [rows]);

  // ── Sampling Calculator ───────────────────────────────────────────────────────
  const sampling = useMemo(() => {
    const parsePositiveInt = (value: string, fallback: number) => {
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 0) return fallback;
      return parsed;
    };

    const totalRaw = samplingTotal.trim();
    const lotsRaw = samplingLots.trim();
    const totalValid = totalRaw !== '' && parsePositiveInt(totalRaw, -1) >= 0;
    const lotsValid = parsePositiveInt(lotsRaw, -1) >= 1;

    const total = parsePositiveInt(totalRaw, 0);
    const dyeLots = Math.max(parsePositiveInt(lotsRaw, 1), 1);

    let base = 0;
    let baseDesc = '';
    if (total <= 0) {
      base = 0;
      baseDesc = totalRaw === '' ? 'enter total rolls' : 'no rolls to test';
    } else if (samplingStd === '10pct') {
      const raw = total * 0.1;
      base = Math.ceil(raw);
      baseDesc = `10% of ${total} = ${raw.toFixed(2)} → rounded up to ${base}`;
    } else if (samplingStd === 'sqrt') {
      const raw = Math.sqrt(total) + 1;
      base = Math.ceil(raw);
      baseDesc = `√${total} + 1 = ${raw.toFixed(2)} → rounded up to ${base}`;
    } else {
      base = total;
      baseDesc = `100% testing = ${total}`;
    }

    let recommended = base;
    let warning = '';
    let breakdownExtra = '';

    if (total > 0) {
      if (dyeLots > total) {
        recommended = total;
        warning = `Dye lots (${dyeLots}) exceed total rolls (${total}). Testing all rolls.`;
        breakdownExtra = ` → cap at total (${total})`;
      } else if (dyeLots > base) {
        recommended = dyeLots;
        warning = `Dye lot count (${dyeLots}) exceeds calculated value (${base}).`;
        breakdownExtra = ` → dye lot override to ${recommended}`;
      } else if (base > total) {
        recommended = total;
        warning = 'Requested test count exceeds total rolls – testing all.';
        breakdownExtra = ` → cap at total (${total})`;
      }
    } else if (totalRaw === '') {
      warning = 'Please enter total rolls.';
    } else if (total === 0) {
      warning = 'Total rolls is zero.';
    }

    return {
      totalValid,
      lotsValid,
      recommended,
      breakdown: total <= 0 ? baseDesc : `${baseDesc}${breakdownExtra}`,
      warning
    };
  }, [samplingTotal, samplingLots, samplingStd]);

  const handleApplySampling = useCallback(() => {
    const count = sampling.recommended;
    if (count <= 0) return;
    setSamplingCollapsed(true);
    // Preserve the current Before L / Before W so user doesn't have to retype
    setRows(prev => {
      const inheritBL = prev[0]?.bL ?? '';
      const inheritBW = prev[0]?.bW ?? '';
      const newRows: RollRow[] = [];
      for (let i = 1; i <= count; i++) {
        newRows.push({ order: i, id: `R${i}`, bL: inheritBL, bW: inheritBW, aL: '', aW: '', sL: '-', sW: '-', group: '' });
      }
      return newRows;
    });
    nextOrderRef.current = count + 1;
    setDeletedStack([]);
    setGroupedRolls([]);
    setStats({ avgL: 0, avgW: 0, rangeL: 0, rangeW: 0 });
    setRecommendation({ text: 'Enter measurements to analyze rolls.', type: 'normal' });
  }, [sampling.recommended]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setRows(defaultRows);
    nextOrderRef.current = 6;
    setStats({ avgL: 0, avgW: 0, rangeL: 0, rangeW: 0 });
    setGroupedRolls([]);
    setRecommendation({ text: 'Enter measurements to analyze rolls.', type: 'normal' });
    setSamplingTotal('50');
    setSamplingLots('3');
    setSamplingStd('10pct');
    setSaveGroupModalOpen(false);
    setSaveShipmentModalOpen(false);
    setGroupName('');
    setShipmentName('');
    setDeletedStack([]);
  }, []);

  const handleClearAll = () => {
    showConfirm('Are you sure you want to clear all roll data?').then(ok => {
      if (ok) {
        setRows(defaultRows);
        setGroupedRolls([]);
        setSamplingTotal('50');
        setSamplingLots('3');
        setSamplingStd('10pct');
        setDeletedStack([]);
        nextOrderRef.current = 6;
      }
    });
  };

  useEffect(() => {
    const onClear = () => handleReset();
    window.addEventListener('clear-all', onClear as EventListener);
    return () => window.removeEventListener('clear-all', onClear as EventListener);
  }, [handleReset]);

  useEffect(() => {
    try {
      const token = localStorage.getItem('clear-all-token');
      if (token && token !== lastClearTokenRef.current) {
        lastClearTokenRef.current = token;
        handleReset();
      }
    } catch { /* Ignore storage errors */ }
  }, [handleReset]);

  // ── Save Group ───────────────────────────────────────────────────────────────
  const openSaveGroupModal = () => {
    const completeRolls = rows.filter(r => r.id && r.bL && r.bW && r.aL && r.aW);
    if (completeRolls.length === 0) {
      showAlert('No complete roll data to save.');
      return;
    }
    setSaveGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    if (!groupName) { showAlert('Please enter a group name.'); return; }
    const rolls: Roll[] = rows
      .filter(r => r.id && r.bL && r.bW && r.aL && r.aW)
      .map(r => ({
        id: r.id,
        bL: parseFloat(r.bL), bW: parseFloat(r.bW),
        aL: parseFloat(r.aL), aW: parseFloat(r.aW),
        sL: r.sL !== '-' ? parseFloat(r.sL.replace('%', '')) : null,
        sW: r.sW !== '-' ? parseFloat(r.sW.replace('%', '')) : null
      }));
    const group: RollGroup = {
      id: Date.now(), recordType: 'group', name: groupName,
      rolls, avgL: stats.avgL, avgW: stats.avgW,
      date: new Date().toLocaleDateString()
    };
    addResult(group);
    setSaveGroupModalOpen(false);
    setGroupName('');
  };

  // ── Save Shipment ────────────────────────────────────────────────────────────
  const openSaveShipmentModal = () => {
    if (groupedRolls.length === 0) {
      showAlert('No groups found yet. Enter measurements for at least 2 rolls first.');
      return;
    }
    setSaveShipmentModalOpen(true);
  };

  const handleSaveShipment = () => {
    if (!shipmentName) { showAlert('Please enter a shipment name.'); return; }
    const shipment = {
      id: Date.now(), recordType: 'shipment' as const, name: shipmentName,
      groups: groupedRolls.map(g => ({ letter: g.letter, rolls: g.rolls, avgL: g.avgL, avgW: g.avgW })),
      date: new Date().toLocaleDateString()
    };
    addResult(shipment);
    setSaveShipmentModalOpen(false);
    setShipmentName('');
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatStat = (val: number) => val.toFixed(1) + '%';

  const shrinkColor = (val: number) =>
    val > 0 ? 'var(--danger)' : val < 0 ? '#16a34a' : 'var(--text-main)';

  const rangeTrafficLight = (rangeL: number, rangeW: number) => {
    const max = Math.max(rangeL, rangeW);
    if (max === 0) return null;
    if (max < 1.5) return { level: 'low', icon: '🟢', label: 'Low Variation', color: '#16a34a', bg: '#f0fdf4' };
    if (max < 3.0) return { level: 'moderate', icon: '🟡', label: 'Moderate Variation', color: '#92400e', bg: '#fffbeb' };
    return { level: 'high', icon: '🔴', label: 'High Variation — Group rolls before cutting', color: '#991b1b', bg: '#fef2f2' };
  };

  const getGroupColor = (groupIndex: number): string => {
    const colors = [
      '#c8e6c9', '#fff9c4', '#ffccbc', '#e1f5fe',
      '#f3e5f5', '#ffeb3b', '#b2dfdb', '#ffe0b2', '#d7ccc8', '#cfd8dc'
    ];
    return colors[groupIndex % colors.length];
  };

  const getGroupLabel = (rowIdx: number): { letter: string; groupIdx: number } | null => {
    for (let gi = 0; gi < groupedRolls.length; gi++) {
      if (groupedRolls[gi].rows.includes(rowIdx + 1)) {
        return { letter: groupedRolls[gi].letter, groupIdx: gi };
      }
    }
    return null;
  };

  const unitLabel = unit === 'cm' ? 'cm' : 'in';
  const trafficLight = rangeTrafficLight(stats.rangeL, stats.rangeW);
  const hasGroups = groupedRolls.length > 0;
  const completeRowCount = rows.filter(r => r.sL !== '-' && r.sW !== '-').length;

  return (
    <div className="card">
      <h2 style={{ marginBottom: '10px', color: 'var(--primary)' }}>Multi-Roll Shipment Manager</h2>

      {/* ── Tab Navigation (Measurements | Roll Groups & Stats) ── */}
      <div className="rm-tab-bar">
        <button
          type="button"
          className={`rm-tab-btn${rollTab === 'measurements' ? ' active' : ''}`}
          onClick={() => setRollTab('measurements')}
        >
          <i className="fas fa-table"></i> Measurements
        </button>
        <button
          type="button"
          className={`rm-tab-btn${rollTab === 'analytics' ? ' active' : ''}`}
          onClick={() => setRollTab('analytics')}
        >
          <i className="fas fa-chart-bar"></i> Roll Groups &amp; Stats
          {(stats.rangeL > RECOMMENDATION_THRESHOLD || stats.rangeW > RECOMMENDATION_THRESHOLD) && completeRowCount > 0 && (
            <span className="rm-tab-badge">!</span>
          )}
        </button>
      </div>

      {/* ── PART 1: Raw Measurements (Sampling + Table + Actions) ── */}
      <div className={`rm-tab-panel${rollTab === 'measurements' ? ' rm-tab-active' : ''}`}>
      {/* ── Sampling Calculator (collapsible) ─────────────────────────────── */}
      <div className="sampling-card">
        {/* Collapsed summary header — always visible */}
        <button
          type="button"
          className="sampling-collapse-btn"
          onClick={() => setSamplingCollapsed(v => !v)}
          aria-expanded={!samplingCollapsed}
        >
          <div className="sampling-collapse-left">
            <i className="fas fa-calculator" style={{ color: 'var(--primary)', fontSize: 14 }}></i>
            {samplingCollapsed ? (
              <span className="sampling-collapse-summary">
                Sampling: <strong>{sampling.recommended} Rolls</strong>
                <span className="sampling-collapse-std">
                  {samplingStd === '10pct' ? 'Industry 10%' : samplingStd === 'sqrt' ? 'Strict QC' : '100% Testing'}
                </span>
              </span>
            ) : (
              <span className="sampling-collapse-title">Sampling Calculator</span>
            )}
          </div>
          <i className={`fas fa-chevron-${samplingCollapsed ? 'down' : 'up'} sampling-collapse-icon`}></i>
        </button>

        {/* Expanded body */}
        {!samplingCollapsed && (
          <>
        <div className="sampling-header" style={{ marginTop: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-light)' }}>Determine how many rolls to test based on total rolls, dye lots, and your QC standard.</p>
          </div>
          <span className="sampling-badge">Enhanced</span>
        </div>

        <div className="sampling-grid">
          <div className="sampling-field">
            <label>Total Rolls</label>
            <input
              type="number" min="0" step="1" value={samplingTotal}
              onChange={(e) => setSamplingTotal(e.target.value)}
              className={!sampling.totalValid ? 'invalid' : ''}
              placeholder="e.g. 50"
            />
          </div>
          <div className="sampling-field">
            <label>Dye Lots</label>
            <input
              type="number" min="1" step="1" value={samplingLots}
              onChange={(e) => setSamplingLots(e.target.value)}
              className={!sampling.lotsValid ? 'invalid' : ''}
              placeholder="≥ 1"
            />
          </div>
          <div className="sampling-field sampling-field-wide">
            <label>Sampling Standard</label>
            <select value={samplingStd} onChange={(e) => setSamplingStd(e.target.value as '10pct' | 'sqrt' | '100pct')}>
              <option value="10pct">Industry Standard (10%)</option>
              <option value="sqrt">Strict QC (Square Root Rule)</option>
              <option value="100pct">100% Testing (High Variance)</option>
            </select>
          </div>
        </div>

        <div className="sampling-output">
          <span>Rolls to test</span>
          <strong>{sampling.recommended}</strong>
          <Button
            variant="primary"
            style={{ marginLeft: '12px', padding: '6px 12px', fontSize: '13px' }}
            onClick={handleApplySampling}
            disabled={sampling.recommended <= 0}
          >
            <i className="fas fa-arrow-down" style={{ marginRight: '6px' }}></i>
            Apply to Table
          </Button>
        </div>

        <div className="sampling-breakdown">
          <span className="label">Calculation:</span>
          <span>{sampling.breakdown}</span>
        </div>

        {sampling.warning && (
          <div className="sampling-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{sampling.warning}</span>
          </div>
        )}

        <div className="sampling-footnote">
          <span className="pill">Rounded up</span>
          <span>Result is at least the number of dye lots. Caps at total rolls.</span>
        </div>
          </>
        )}
      </div>

      {/* ── Roll Measurements Table ─────────────────────────────────────────── */}
      <h3>Roll Measurements</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '15px' }}>
        Enter measurements for each roll.{' '}
        <strong>Shrinkage auto-calculates</strong> as you type.
        {completeRowCount >= 2
          ? <span style={{ color: '#16a34a' }}> Rolls auto-grouped by similarity.</span>
          : <span style={{ color: 'var(--text-light)' }}> Enter 2+ complete rows to see groups.</span>
        }
      </p>

      <div className="roll-table-container">
        <table className="roll-table" id="roll-table">
          <thead>
            <tr>
              <th>Roll ID</th>
              <th>Before L</th>
              <th>Before W</th>
              <th>After L</th>
              <th>After W</th>
              <th>Shrink L%</th>
              <th>Shrink W%</th>
              <th>Group</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const groupInfo = getGroupLabel(idx);
              const rowBg = groupInfo ? getGroupColor(groupInfo.groupIdx) : undefined;

              return (
                <tr
                  key={row.order}
                  id={`roll-row-${idx + 1}`}
                  style={rowBg ? { background: rowBg } : undefined}
                >
                  <td>
                    {/* col 0 = Roll ID (text, still arrow-navigable) */}
                    <input
                      id={`roll-${idx}-0`}
                      type="text"
                      placeholder={`R${idx + 1}`}
                      style={{ width: '60px' }}
                      value={row.id}
                      onChange={(e) => handleRowChange(idx, 'id', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 0)}
                    />
                  </td>
                  {/* col 1 = bL */}
                  <td className={idx === 0 ? 'fill-down-cell' : ''}>
                    <input
                      id={`roll-${idx}-1`}
                      type="number" step="any" value={row.bL}
                      onChange={(e) => handleRowChange(idx, 'bL', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 1)}
                    />
                    {idx === 0 && fillDownVisible.bL && (
                      <button
                        className="fill-down-pill"
                        onMouseDown={(e) => { e.preventDefault(); handleFillDown('bL'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFillDown('bL'); } }}
                        title="Copy to all rows (Enter)"
                      >
                        <i className="fas fa-arrow-down"></i> Fill Down
                      </button>
                    )}
                  </td>
                  {/* col 2 = bW */}
                  <td className={idx === 0 ? 'fill-down-cell' : ''}>
                    <input
                      id={`roll-${idx}-2`}
                      type="number" step="any" value={row.bW}
                      onChange={(e) => handleRowChange(idx, 'bW', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 2)}
                    />
                    {idx === 0 && fillDownVisible.bW && (
                      <button
                        className="fill-down-pill"
                        onMouseDown={(e) => { e.preventDefault(); handleFillDown('bW'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFillDown('bW'); } }}
                        title="Copy to all rows (Enter)"
                      >
                        <i className="fas fa-arrow-down"></i> Fill Down
                      </button>
                    )}
                  </td>
                  {/* col 3 = aL */}
                  <td>
                    <input
                      id={`roll-${idx}-3`}
                      type="number" step="any" value={row.aL}
                      onChange={(e) => handleRowChange(idx, 'aL', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 3)}
                    />
                  </td>
                  {/* col 4 = aW */}
                  <td>
                    <input
                      id={`roll-${idx}-4`}
                      type="number" step="any" value={row.aW}
                      onChange={(e) => handleRowChange(idx, 'aW', e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, 4)}
                    />
                  </td>
                  {/* Shrink L% — color coded */}
                  <td style={{
                    fontWeight: 'bold',
                    color: row.sL === '-' ? 'var(--text-light)'
                      : parseFloat(row.sL) > 0 ? 'var(--danger)'
                      : parseFloat(row.sL) < 0 ? '#16a34a'
                      : 'var(--text-main)'
                  }}>
                    {row.sL}
                  </td>
                  {/* Shrink W% — color coded */}
                  <td style={{
                    fontWeight: 'bold',
                    color: row.sW === '-' ? 'var(--text-light)'
                      : parseFloat(row.sW) > 0 ? 'var(--danger)'
                      : parseFloat(row.sW) < 0 ? '#16a34a'
                      : 'var(--text-main)'
                  }}>
                    {row.sW}
                  </td>
                  {/* Group badge */}
                  <td>
                    {groupInfo ? (
                      <span
                        className="rm-group-badge"
                        style={{ background: getGroupColor(groupInfo.groupIdx) }}
                      >
                        Group {groupInfo.letter}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="roll-delete-btn"
                      onClick={() => handleDeleteRow(idx)}
                      disabled={rows.length <= 1}
                      aria-label="Delete roll"
                      title="Delete roll"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────────────── */}
      <div className="roll-group-actions">
        <div className="roll-action-row">
          <Button variant="danger" className="clear-all-btn" icon={<i className="fas fa-trash-alt"></i>} onClick={handleClearAll}>Clear All</Button>
          <Button variant="success" className="save-group-btn" icon={<i className="fas fa-save"></i>} onClick={openSaveGroupModal}>Group to Library</Button>
        </div>
        <div className="roll-action-row">
          <Button variant="success" className="save-shipment-btn" icon={<i className="fas fa-save"></i>} onClick={openSaveShipmentModal}>Shipment Lot</Button>
          <Button variant="outline" icon={<i className="fas fa-undo"></i>} onClick={handleRestoreLast} disabled={deletedStack.length === 0}>Restore Last</Button>
        </div>
        <Button variant="primary" className="roll-add-btn" icon={<i className="fas fa-plus"></i>} onClick={handleAddRow}>+ Add Roll</Button>
      </div>
      </div>{/* end rm-tab-panel measurements */}

      {/* ── PART 2: Roll Analytics (Stats + Groups) ── */}
      <div className={`rm-tab-panel${rollTab === 'analytics' ? ' rm-tab-active' : ''}`}>
      {/* ── Roll Statistics Card ────────────────────────────────────────────── */}
      <div className="rm-stats-card">
        <div className="rm-stats-header">
          ROLL STATISTICS
          {completeRowCount > 0 && (
            <span className="rm-stats-badge">{completeRowCount} roll{completeRowCount !== 1 ? 's' : ''} measured</span>
          )}
        </div>

        <div className="rm-stats-grid">
          <div className="rm-stat-item">
            <span className="rm-stat-label">Avg Length Shrinkage</span>
            <span className="rm-stat-val" style={{ color: completeRowCount > 0 ? shrinkColor(stats.avgL) : 'var(--text-light)' }}>
              {completeRowCount > 0 ? formatStat(stats.avgL) : '—'}
            </span>
          </div>
          <div className="rm-stat-divider"></div>
          <div className="rm-stat-item">
            <span className="rm-stat-label">Avg Width Shrinkage</span>
            <span className="rm-stat-val" style={{ color: completeRowCount > 0 ? shrinkColor(stats.avgW) : 'var(--text-light)' }}>
              {completeRowCount > 0 ? formatStat(stats.avgW) : '—'}
            </span>
          </div>
          <div className="rm-stat-divider"></div>
          <div className="rm-stat-item">
            <span className="rm-stat-label">Length Range</span>
            <span className="rm-stat-val" style={{ color: 'var(--text-main)' }}>
              {completeRowCount > 0 ? formatStat(stats.rangeL) : '—'}
            </span>
          </div>
          <div className="rm-stat-divider"></div>
          <div className="rm-stat-item">
            <span className="rm-stat-label">Width Range</span>
            <span className="rm-stat-val" style={{ color: 'var(--text-main)' }}>
              {completeRowCount > 0 ? formatStat(stats.rangeW) : '—'}
            </span>
          </div>
        </div>

        {trafficLight && (
          <div className="rm-traffic-light" style={{ background: trafficLight.bg, borderColor: trafficLight.color + '55' }}>
            <span style={{ fontSize: '16px' }}>{trafficLight.icon}</span>
            <span style={{ color: trafficLight.color, fontWeight: '700', fontSize: '13px' }}>{trafficLight.label}</span>
            <span style={{ color: trafficLight.color, fontSize: '12px', opacity: 0.8 }}>
              {trafficLight.level === 'low' && '— Safe to use one cutting average for all rolls'}
              {trafficLight.level === 'moderate' && '— Consider using group averages for precision'}
              {trafficLight.level === 'high' && '— Cuts must be separated by group'}
            </span>
          </div>
        )}

        {!trafficLight && (
          <div className="rm-traffic-light" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <span style={{ color: 'var(--text-light)', fontWeight: '600', fontSize: '13px' }}>
              Enter measurements to analyze rolls
            </span>
          </div>
        )}
      </div>

      {/* ── Auto-Generated Group Cards ──────────────────────────────────────── */}
      {hasGroups && (
        <div className="rm-groups-section">
          <div className="rm-groups-header">
            <div className="rm-groups-title">
              <i className="fas fa-layer-group"></i>
              Roll Groups — {groupedRolls.length} group{groupedRolls.length !== 1 ? 's' : ''} detected
            </div>
            <span className="rm-groups-subtitle">Groups update automatically as you enter measurements</span>
          </div>

          <div className="rm-groups-list">
            {groupedRolls.map((group, gi) => {
              const bg = getGroupColor(gi);
              const rollLabels = group.rows.map(r => {
                const row = rows[r - 1];
                return row?.id || `R${r}`;
              }).join(', ');
              const isSolo = group.rolls.length === 1;

              return (
                <div key={gi} className="rm-group-card" style={{ borderLeftColor: '#00000022', background: bg }}>
                  <div className="rm-group-card-header">
                    <span className="rm-group-card-letter" style={{ background: '#000000' + '18' }}>
                      Group {group.letter}
                    </span>
                    <span className="rm-group-card-rolls">
                      {group.rolls.length} roll{group.rolls.length !== 1 ? 's' : ''}: {rollLabels}
                    </span>
                  </div>

                  <div className="rm-group-card-stats">
                    <div className="rm-group-stat">
                      <span className="rm-group-stat-label">Avg Length Shrinkage</span>
                      <span className="rm-group-stat-val" style={{ color: shrinkColor(group.avgL) }}>
                        {formatStat(group.avgL)}
                      </span>
                    </div>
                    <div className="rm-group-stat">
                      <span className="rm-group-stat-label">Avg Width Shrinkage</span>
                      <span className="rm-group-stat-val" style={{ color: shrinkColor(group.avgW) }}>
                        {formatStat(group.avgW)}
                      </span>
                    </div>
                  </div>

                  <div className="rm-group-card-cut-tag">
                    <i className="fas fa-scissors"></i>
                    {isSolo ? 'Cut separately' : `One pattern · ${group.rolls.length} rolls`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>{/* end rm-tab-panel analytics */}

      {/* ── Save Group Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={saveGroupModalOpen} onClose={() => setSaveGroupModalOpen(false)} title="Save Roll Group">
        <div className="input-group">
          <label>Group Name / Identifier</label>
          <input type="text" placeholder="e.g. Denim Shipment A" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </div>
        <div style={{ background: 'var(--secondary)', padding: '15px', borderRadius: '8px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '5px' }}>Rolls included:</div>
          <ul>
            {rows.filter(r => r.id && r.bL && r.bW && r.aL && r.aW).map((r, idx) => (
              <li key={idx}>{r.id}: L {r.sL}, W {r.sW}</li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setSaveGroupModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveGroup}>Save Group</Button>
        </div>
      </Modal>

      {/* ── Save Shipment Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={saveShipmentModalOpen} onClose={() => setSaveShipmentModalOpen(false)} title="Save Shipment Lot">
        <div className="input-group">
          <label>Shipment Name / Identifier</label>
          <input type="text" placeholder="e.g. Denim Import March 2025" value={shipmentName} onChange={(e) => setShipmentName(e.target.value)} />
        </div>
        <div style={{ background: 'var(--secondary)', padding: '15px', borderRadius: '8px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '5px' }}>Groups included:</div>
          <ul>
            {groupedRolls.map((g, idx) => (
              <li key={idx}>Group {g.letter}: {g.rolls.length} rolls (Avg L: {formatStat(g.avgL)}, Avg W: {formatStat(g.avgW)})</li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setSaveShipmentModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveShipment}>Save Shipment</Button>
        </div>
      </Modal>
    </div>
  );
}
