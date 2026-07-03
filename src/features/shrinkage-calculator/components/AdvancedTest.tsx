import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useResults } from '../../../store/ResultsContext';
import { useDialog } from '../../../components/ui/DialogProvider';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { calculateShrinkage, calculateAverage, calculateCutSize } from '../../../utils/calculations';

interface AdvancedTestProps {
  unit: string;
  onTransferToMain: (avgL: number, avgW: number) => void;
}

interface RowData {
  bL: string;
  bW: string;
  aL: string;
  aW: string;
  sL: string;
  sW: string;
}

const makeBlankRow = (): RowData => ({ bL: '', bW: '', aL: '', aW: '', sL: '-', sW: '-' });

const defaultRows: RowData[] = [
  makeBlankRow(),
  makeBlankRow(),
  makeBlankRow(),
];

export function AdvancedTest({ unit, onTransferToMain }: AdvancedTestProps) {
  const { addResult } = useResults();
  const { showAlert, showConfirm } = useDialog();
  const [rows, setRows] = useLocalStorage<RowData[]>('advancedTestRows_v3', defaultRows);
  // Undo stack: stores deleted rows so the last one can be restored
  const [deletedStack, setDeletedStack] = useState<RowData[]>([]);
  // "Set Defaults" bar — values entered above the table to bulk-fill Before columns
  const [defaultBL, setDefaultBL] = useState('');
  const [defaultBW, setDefaultBW] = useState('');
  const [avgL, setAvgL] = useState(0);
  const [avgW, setAvgW] = useState(0);
  const [validSampleCount, setValidSampleCount] = useState(0);
  const [desiredL, setDesiredL] = useLocalStorage('advancedTestDesiredL', '');
  const [desiredW, setDesiredW] = useLocalStorage('advancedTestDesiredW', '');
  const [cutL, setCutL] = useState('-');
  const [cutW, setCutW] = useState('-');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [sampleName, setSampleName] = useState('');
  const [patternApplied, setPatternApplied] = useState(false);
  // Two-part accordion: 'data' (table) expanded by default, 'insights' collapsed
  const [advPart, setAdvPart] = useState<'data' | 'insights'>('data');

  // ── Cascading auto-fill handled in handleRowChange (see below) ─────────────

  // ── Calculate all shrinkage values & averages ────────────────────────────────
  useEffect(() => {
    const newRows = rows.map(row => {
      const bL = parseFloat(row.bL);
      const aL = parseFloat(row.aL);
      const bW = parseFloat(row.bW);
      const aW = parseFloat(row.aW);

      let sL = '-';
      let sW = '-';

      if (!isNaN(bL) && !isNaN(aL) && bL !== 0) {
        const s = calculateShrinkage(bL, aL);
        sL = s > 0 ? `-${s.toFixed(1)}%` : s < 0 ? `+${Math.abs(s).toFixed(1)}%` : '0%';
      }
      if (!isNaN(bW) && !isNaN(aW) && bW !== 0) {
        const s = calculateShrinkage(bW, aW);
        sW = s > 0 ? `-${s.toFixed(1)}%` : s < 0 ? `+${Math.abs(s).toFixed(1)}%` : '0%';
      }

      return { ...row, sL, sW };
    });

    setRows(newRows);

    // Raw numeric shrinkage for averaging
    const sLValues: number[] = [];
    const sWValues: number[] = [];

    newRows.forEach(row => {
      const bL = parseFloat(row.bL);
      const aL = parseFloat(row.aL);
      const bW = parseFloat(row.bW);
      const aW = parseFloat(row.aW);
      if (!isNaN(bL) && !isNaN(aL) && bL !== 0) sLValues.push(calculateShrinkage(bL, aL));
      if (!isNaN(bW) && !isNaN(aW) && bW !== 0) sWValues.push(calculateShrinkage(bW, aW));
    });

    const newAvgL = sLValues.length > 0 ? sLValues.reduce((s, v) => s + v, 0) / sLValues.length : 0;
    const newAvgW = sWValues.length > 0 ? sWValues.reduce((s, v) => s + v, 0) / sWValues.length : 0;
    setAvgL(newAvgL);
    setAvgW(newAvgW);
    setValidSampleCount(Math.max(sLValues.length, sWValues.length));

    // Pattern cut sizes
    if (desiredL) {
      const dL = parseFloat(desiredL);
      if (!isNaN(dL) && newAvgL !== 0) setCutL(calculateCutSize(dL, newAvgL).toFixed(2));
      else setCutL('-');
    } else {
      setCutL('-');
    }

    if (desiredW) {
      const dW = parseFloat(desiredW);
      if (!isNaN(dW) && newAvgW !== 0) setCutW(calculateCutSize(dW, newAvgW).toFixed(2));
      else setCutW('-');
    } else {
      setCutW('-');
    }

    // Reset inline result card if data changes
    setPatternApplied(false);
  }, [
    // Spread-free stable dep: stringify the relevant values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    rows.map(r => `${r.bL}|${r.bW}|${r.aL}|${r.aW}`).join(','),
    desiredL,
    desiredW,
  ]);

  // ── Row mutations ────────────────────────────────────────────────────────────
  // Part 1 fix: handleRowChange ONLY updates the changed cell — no cascade.
  const handleRowChange = (rowIndex: number, field: keyof RowData, value: string) => {
    setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, [field]: value } : row));
  };

  // Apply default Before values to ALL rows (overwrites every row, empty or not).
  // Triggered by Enter key or clicking the Apply button in the Set Defaults bar.
  const applyDefault = (field: 'bL' | 'bW', value: string) => {
    if (!value.trim()) return;
    setRows(prev => prev.map(row => ({ ...row, [field]: value })));
  };

  // Part 3: Arrow-key grid navigation.
  // Column order: 0=bL, 1=bW, 2=aL, 3=aW
  // Cell IDs use format: adv-{rowIdx}-{colIdx}
  const ADV_COLS: (keyof RowData)[] = ['bL', 'bW', 'aL', 'aW'];
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
      case 'ArrowRight': e.preventDefault(); nextCol = Math.min(colIdx + 1, ADV_COLS.length - 1); break;
      case 'ArrowLeft':  e.preventDefault(); nextCol = Math.max(colIdx - 1, 0); break;
      case 'Tab':        // Let Tab flow naturally; handled by the browser
        return;
      default:           return;
    }
    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const target = document.getElementById(`adv-${nextRow}-${nextCol}`) as HTMLInputElement | null;
      target?.focus();
      target?.select();
    }
  };

  const handleAddRow = () => {
    setRows(prev => {
      const newRow = makeBlankRow();
      // Inherit Before values from row 0 (cascading default); After stays empty
      if (prev.length > 0) {
        newRow.bL = prev[0].bL;
        newRow.bW = prev[0].bW;
      }
      return [...prev, newRow];
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    setRows(prev => {
      if (prev.length <= 2) return prev; // minimum 2 rows
      const deleted = prev[rowIndex];
      if (deleted) setDeletedStack(stack => [...stack, deleted]);
      return prev.filter((_, i) => i !== rowIndex);
    });
  };

  const handleRestoreLast = () => {
    if (deletedStack.length === 0) return;
    const last = deletedStack[deletedStack.length - 1];
    setRows(prev => [...prev, last]);
    setDeletedStack(prev => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    showConfirm('Are you sure you want to clear all sample data?').then(ok => {
      if (ok) {
        setRows(defaultRows);
        setDesiredL('');
        setDesiredW('');
        setPatternApplied(false);
      }
    });
  };

  // ── Apply Average to Pattern Block ───────────────────────────────────────────
  const handleApplyToPattern = () => {
    if (avgL === 0 && avgW === 0) {
      showAlert('Please enter at least one complete sample (before & after measurements) first.');
      return;
    }
    if (!desiredL && !desiredW) {
      showAlert('Please enter your desired finished length and/or width in the Pattern Cutting Adjustment section above.');
      return;
    }
    setPatternApplied(true);
    // Scroll to result card
    setTimeout(() => {
      const el = document.getElementById('adv-pattern-result');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // ── Save to Library ──────────────────────────────────────────────────────────
  const openSaveModal = () => {
    if (avgL === 0 && avgW === 0) {
      showAlert('Please enter sample data before saving.');
      return;
    }
    setSaveModalOpen(true);
  };

  const handleSave = () => {
    if (!sampleName) {
      showAlert('Please enter a sample name.');
      return;
    }

    const validSamples = rows
      .filter(r => r.sL !== '-' || r.sW !== '-')
      .map((r, i) => ({
        sample: i + 1,
        bL: parseFloat(r.bL) || 0,
        bW: parseFloat(r.bW) || 0,
        aL: parseFloat(r.aL) || 0,
        aW: parseFloat(r.aW) || 0,
        sL: r.sL,
        sW: r.sW,
      }));

    addResult({
      id: Date.now(),
      recordType: 'sample' as const,
      name: sampleName,
      samples: validSamples,
      avgL,
      avgW,
      cutL: cutL !== '-' ? parseFloat(cutL) : null,
      cutW: cutW !== '-' ? parseFloat(cutW) : null,
      desiredL: desiredL ? parseFloat(desiredL) : null,
      desiredW: desiredW ? parseFloat(desiredW) : null,
      date: new Date().toLocaleDateString(),
    });

    setSaveModalOpen(false);
    setSampleName('');
  };

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatAvg = (val: number) => {
    if (val === 0) return '0.0%';
    return val > 0 ? `-${val.toFixed(1)}%` : `+${Math.abs(val).toFixed(1)}%`;
  };

  const shrinkColor = (val: number) =>
    val > 0 ? 'var(--danger)' : val < 0 ? '#16a34a' : 'var(--text-main)';

  const canShowResult = patternApplied && (cutL !== '-' || cutW !== '-');
  const bothCuts = cutL !== '-' && cutW !== '-';
  const unitLabel = unit === 'cm' ? 'cm' : 'in';

  return (
    <div className="card">
      <h2 style={{ marginBottom: '10px', color: 'var(--primary)', fontSize: '20px' }}>
        Advanced Multi-Sample Average Test
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '16px' }}>
        Enter samples to calculate true average shrinkage.{' '}
        <em>Use the defaults bar below to fill Before columns across all rows at once.</em>
      </p>

      {/* ── PART 1: Data Collection — Table (expanded by default) ── */}
      <div className={`adv-two-part${advPart === 'data' ? ' adv-part-active' : ''}`}>

      {/* ── Set Defaults Bar ─────────────────────────────────────────────────── */}
      {/* Enter a value and press Enter (or click Apply) to fill that column.    */}
      <div className="set-defaults-bar">
        <span className="set-defaults-label">
          <i className="fas fa-magic"></i> Set All Before:
        </span>
        <div className="set-defaults-field">
          <label htmlFor="adv-default-bL">Length</label>
          <input
            id="adv-default-bL"
            type="number"
            placeholder="e.g. 20"
            value={defaultBL}
            onChange={e => setDefaultBL(e.target.value)}
            // Enter key: fill all Before Length cells immediately
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyDefault('bL', defaultBL); } }}
            className="set-defaults-input"
          />
          <button
            className="set-defaults-apply"
            onClick={() => applyDefault('bL', defaultBL)}
            title="Fill all Before Length cells (Enter)"
          >↓ Apply</button>
        </div>
        <div className="set-defaults-field">
          <label htmlFor="adv-default-bW">Width</label>
          <input
            id="adv-default-bW"
            type="number"
            placeholder="e.g. 20"
            value={defaultBW}
            onChange={e => setDefaultBW(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyDefault('bW', defaultBW); } }}
            className="set-defaults-input"
          />
          <button
            className="set-defaults-apply"
            onClick={() => applyDefault('bW', defaultBW)}
            title="Fill all Before Width cells (Enter)"
          >↓ Apply</button>
        </div>
      </div>

      {/* ── Sample Table ─────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table className="advanced-test-table">
          <thead>
            <tr>
              <th>Sample</th>
              <th>Before Length</th>
              <th>Before Width</th>
              <th>After Length</th>
              <th>After Width</th>
              <th>Shrink L%</th>
              <th>Shrink W%</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td><strong>#{idx + 1}</strong></td>
                {/* col 0 = bL */}
                <td>
                  <input
                    id={`adv-${idx}-0`}
                    type="number"
                    value={row.bL}
                    onChange={(e) => handleRowChange(idx, 'bL', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 0)}
                    placeholder="0"
                  />
                </td>
                {/* col 1 = bW */}
                <td>
                  <input
                    id={`adv-${idx}-1`}
                    type="number"
                    value={row.bW}
                    onChange={(e) => handleRowChange(idx, 'bW', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 1)}
                    placeholder="0"
                  />
                </td>
                {/* col 2 = aL */}
                <td>
                  <input
                    id={`adv-${idx}-2`}
                    type="number"
                    value={row.aL}
                    onChange={(e) => handleRowChange(idx, 'aL', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 2)}
                    placeholder="0"
                  />
                </td>
                {/* col 3 = aW */}
                <td>
                  <input
                    id={`adv-${idx}-3`}
                    type="number"
                    value={row.aW}
                    onChange={(e) => handleRowChange(idx, 'aW', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 3)}
                    placeholder="0"
                  />
                </td>
                <td style={{
                  fontWeight: 'bold',
                  color: row.sL === '-' ? 'var(--text-light)' :
                    row.sL.startsWith('-') ? 'var(--danger)' : '#16a34a'
                }}>
                  {row.sL}
                </td>
                <td style={{
                  fontWeight: 'bold',
                  color: row.sW === '-' ? 'var(--text-light)' :
                    row.sW.startsWith('-') ? 'var(--danger)' : '#16a34a'
                }}>
                  {row.sW}
                </td>
                <td>
                  <button
                    type="button"
                    className="roll-delete-btn"
                    onClick={() => handleDeleteRow(idx)}
                    disabled={rows.length <= 2}
                    aria-label={`Delete Sample #${idx + 1}`}
                    title={`Delete Sample #${idx + 1}`}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Table action buttons — 2 rows matching Roll Manager layout ──────────── */}
      <div className="roll-group-actions">
        {/* Row 1: destructive + undo */}
        <div className="roll-action-row">
          <Button variant="danger" className="clear-all-btn" icon={<i className="fas fa-trash-alt"></i>} onClick={handleClearAll}>Clear All</Button>
          <Button variant="outline" icon={<i className="fas fa-undo"></i>} onClick={handleRestoreLast} disabled={deletedStack.length === 0}>Restore Last</Button>
        </div>
        {/* Row 2: add + navigate */}
        <div className="roll-action-row">
          <button className="adv-add-row-btn" style={{ margin: 0, flex: 1 }} onClick={handleAddRow}>
            <i className="fas fa-plus"></i> Add Sample
          </button>
          <button
            className="adv-next-part-btn"
            style={{ flex: 1, margin: 0 }}
            onClick={() => setAdvPart('insights')}
          >
            <i className="fas fa-arrow-right"></i> Apply to Pattern
          </button>
        </div>
      </div>
      </div>{/* end adv-two-part data */}

      {/* ── PART 2: Pattern Application / Insights (collapsed by default) ── */}
      <div className={`adv-two-part${advPart === 'insights' ? ' adv-part-active' : ''}`}>
      {/* Back to data */}
      <button
        className="adv-back-part-btn"
        onClick={() => setAdvPart('data')}
      >
        <i className="fas fa-arrow-left"></i> Back to Data Table
      </button>

      {/* ── Average Shrinkage Card ────────────────────────────────────────────── */}
      <div className="adv-avg-card">
        <div className="adv-avg-label">
          AVERAGE SHRINKAGE
          {validSampleCount > 0 && (
            <span className="adv-sample-badge">Based on {validSampleCount} sample{validSampleCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="adv-avg-values">
          <div className="adv-avg-item">
            <span className="adv-avg-axis">Length</span>
            <span className="adv-avg-pct" style={{ color: shrinkColor(avgL) }}>{formatAvg(avgL)}</span>
          </div>
          <div className="adv-avg-divider"></div>
          <div className="adv-avg-item">
            <span className="adv-avg-axis">Width</span>
            <span className="adv-avg-pct" style={{ color: shrinkColor(avgW) }}>{formatAvg(avgW)}</span>
          </div>
        </div>
      </div>

      {/* ── Pattern Cutting Adjustment ────────────────────────────────────────── */}
      <div className="adv-pattern-section">
        <h4 style={{ marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-cut" style={{ color: 'var(--primary)' }}></i>
          Pattern Cutting Adjustment
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px' }}>
          Enter your <strong>desired finished dimensions</strong> and we'll tell you how large to cut your pattern piece before washing.
        </p>

        <div className="input-row split">
          <div className="input-group">
            <label>Desired Finished Length ({unitLabel})</label>
            <input
              type="number"
              placeholder="e.g. 32"
              value={desiredL}
              onChange={(e) => { setDesiredL(e.target.value); setPatternApplied(false); }}
              style={{ width: '100%' }}
            />
            {cutL !== '-' && (
              <div className="adv-cut-result">
                <span className="adv-cut-label">Pre-wash Cut Length</span>
                <span className="adv-cut-value">{cutL} <em>{unitLabel}</em></span>
              </div>
            )}
          </div>
          <div className="input-group">
            <label>Desired Finished Width ({unitLabel})</label>
            <input
              type="number"
              placeholder="e.g. 20"
              value={desiredW}
              onChange={(e) => { setDesiredW(e.target.value); setPatternApplied(false); }}
              style={{ width: '100%' }}
            />
            {cutW !== '-' && (
              <div className="adv-cut-result">
                <span className="adv-cut-label">Pre-wash Cut Width</span>
                <span className="adv-cut-value">{cutW} <em>{unitLabel}</em></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────────────────────── */}
      <div className="roll-group-actions" style={{ marginBottom: '15px' }}>
        <Button variant="success" icon={<i className="fas fa-save"></i>} onClick={openSaveModal}>
          Save to Library
        </Button>
        <Button variant="danger" icon={<i className="fas fa-trash-alt"></i>} onClick={handleClearAll}>
          Clear All
        </Button>
      </div>

      {/* ── Apply Average to Pattern Block Button ─────────────────────────────── */}
      <button className="adv-apply-btn" onClick={handleApplyToPattern}>
        <i className="fas fa-ruler-combined"></i>
        Apply Average Shrinkage to Your Pattern Block
      </button>

      {/* ── Inline Pattern Block Result Card ─────────────────────────────────── */}
      {canShowResult && (
        <div id="adv-pattern-result" className="adv-result-card">
          <div className="adv-result-header">
            <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: '18px' }}></i>
            <span>Your Pattern Block Results</span>
          </div>

          <div className="adv-result-shrink-row">
            <div className="adv-result-shrink-item">
              <span className="adv-result-shrink-label">Avg. Length Shrinkage</span>
              <span className="adv-result-shrink-val" style={{ color: shrinkColor(avgL) }}>{formatAvg(avgL)}</span>
            </div>
            <div className="adv-result-shrink-item">
              <span className="adv-result-shrink-label">Avg. Width Shrinkage</span>
              <span className="adv-result-shrink-val" style={{ color: shrinkColor(avgW) }}>{formatAvg(avgW)}</span>
            </div>
          </div>

          <div className="adv-result-dims">
            {desiredL && cutL !== '-' && (
              <div className="adv-result-dim-row">
                <div className="adv-result-dim-box adv-dim-desired">
                  <span className="adv-dim-label">Desired Finished Length</span>
                  <span className="adv-dim-val">{desiredL} <em>{unitLabel}</em></span>
                </div>
                <div className="adv-dim-arrow"><i className="fas fa-arrow-right"></i></div>
                <div className="adv-result-dim-box adv-dim-cut">
                  <span className="adv-dim-label">Cut Pattern Length</span>
                  <span className="adv-dim-val">{cutL} <em>{unitLabel}</em></span>
                </div>
              </div>
            )}
            {desiredW && cutW !== '-' && (
              <div className="adv-result-dim-row">
                <div className="adv-result-dim-box adv-dim-desired">
                  <span className="adv-dim-label">Desired Finished Width</span>
                  <span className="adv-dim-val">{desiredW} <em>{unitLabel}</em></span>
                </div>
                <div className="adv-dim-arrow"><i className="fas fa-arrow-right"></i></div>
                <div className="adv-result-dim-box adv-dim-cut">
                  <span className="adv-dim-label">Cut Pattern Width</span>
                  <span className="adv-dim-val">{cutW} <em>{unitLabel}</em></span>
                </div>
              </div>
            )}
          </div>

          {bothCuts && desiredL && desiredW && (
            <div className="adv-result-summary">
              <i className="fas fa-scissors"></i>
              Cut your pattern piece to{' '}
              <strong>{cutL} × {cutW} {unitLabel}</strong>{' '}
              before washing to achieve a finished size of{' '}
              <strong>{desiredL} × {desiredW} {unitLabel}</strong>.
            </div>
          )}

          {(!desiredL || !desiredW) && (cutL !== '-' || cutW !== '-') && (
            <div className="adv-result-summary" style={{ background: '#fef9c3', borderColor: '#fde047', color: '#854d0e' }}>
              <i className="fas fa-info-circle"></i>
              {!desiredL && !desiredW
                ? 'Enter your desired finished dimensions above to see your cut pattern size.'
                : `Enter your desired finished ${!desiredL ? 'length' : 'width'} above to complete your pattern calculation.`}
            </div>
          )}

          <button
            className="adv-result-close"
            onClick={() => setPatternApplied(false)}
          >
            <i className="fas fa-times"></i> Dismiss
          </button>
        </div>
      )}
      </div>{/* end adv-two-part insights */}

      {/* ── Save Modal ────────────────────────────────────────────────────────── */}
      <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save Sample Test">
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sample Name</label>
          <input
            type="text"
            placeholder="e.g. Cotton Batch A"
            value={sampleName}
            onChange={(e) => setSampleName(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ background: 'var(--info-light)', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            <strong>Average Shrinkage:</strong> L: {formatAvg(avgL)}, W: {formatAvg(avgW)}
          </div>
          {cutL !== '-' && cutW !== '-' && (
            <div style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '5px' }}>
              <strong>Cut Dimensions:</strong> L: {cutL} {unitLabel}, W: {cutW} {unitLabel}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Sample</Button>
        </div>
      </Modal>
    </div>
  );
}
