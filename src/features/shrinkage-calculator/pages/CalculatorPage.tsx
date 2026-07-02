import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { useResults } from '../../../store/ResultsContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { fabricData, washProcessOptions, washTips, BASE_SIZE, STORAGE_KEY } from '../../../utils/constants';
import { calculateShrinkage, validateMeasurements, calculateCutSize, calculateAverage } from '../../../utils/calculations';
import { CalcMode, Unit, FabricResult, AdvancedRow } from '../../../types';
import { Preview } from '../components/Preview';
import { QuickMath } from '../components/QuickMath';
import { AdvancedTest } from '../components/AdvancedTest';
import { RollManager } from '../components/RollManager';
import { ResultsPage } from '../../results/pages/ResultsPage';
import { triggerSmartPrint } from '../../../utils/printReport';

export function CalculatorPage() {
  const navigate = useNavigate();
  const { state, addResult, updateResult, setEditingId } = useResults();
  const [calcMode, setCalcMode] = useState<CalcMode>('shrinkage');
  const [unit, setUnit] = useState<Unit>('inches');
  const [editingId, setEditingIdLocal] = useState<number | null>(null);
  const [sidebarPortalTarget, setSidebarPortalTarget] = useState<HTMLElement | null>(null);
  const [mobileNavPortalTarget, setMobileNavPortalTarget] = useState<HTMLElement | null>(null);

  // Set portal targets after mount
  useEffect(() => {
    setSidebarPortalTarget(document.getElementById('sidebar-nav-portal'));
    setMobileNavPortalTarget(document.getElementById('mobile-nav-portal'));
  }, []);

  // Form state for shrinkage calculator
  const [wash, setWash] = useState('');
  const [washCustom, setWashCustom] = useState('');
  const [temp, setTemp] = useState('');
  const [duration, setDuration] = useState('');
  // Track whether temp/duration were auto-filled from wash process standard
  const [tempIsStandard, setTempIsStandard] = useState(false);
  const [durationIsStandard, setDurationIsStandard] = useState(false);
  const [bwL, setBwL] = useState('');
  const [bwW, setBwW] = useState('');
  const [awL, setAwL] = useState('');
  const [awW, setAwW] = useState('');
  const [userHasTyped, setUserHasTyped] = useState(false);
  const [widthShrink, setWidthShrink] = useState(0);
  const [lengthShrink, setLengthShrink] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileStage, setMobileStage] = useState<'input' | 'results'>('input');
  // Accordion: 'shrinkage' expanded by default, 'wash' collapsed
  const [activeAccordion, setActiveAccordion] = useState<'shrinkage' | 'wash' | null>('shrinkage');

  // Save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [fabricType, setFabricType] = useState('Denim');
  const [fabricTypeCustom, setFabricTypeCustom] = useState('');
  const [fabricName, setFabricName] = useState('');

  // Smart wash tip
  const [showTip, setShowTip] = useState(false);
  const [tipText, setTipText] = useState('');

  // Handle wash selection — also auto-fills Temperature & Duration from standard values
  const handleWashChange = (value: string) => {
    setWash(value);
    if (value === 'Other' || !value) {
      setShowTip(false);
      // Clear auto-filled standard values when user picks blank/Other
      if (!value || value === 'Other') {
        setTemp('');
        setDuration('');
        setTempIsStandard(false);
        setDurationIsStandard(false);
      }
      return;
    }
    // Auto-fill temperature & duration from the selected wash option's standard values
    const selectedOpt = washProcessOptions.find(opt => opt.value === value);
    if (selectedOpt) {
      if (selectedOpt.temp) {
        setTemp(selectedOpt.temp);
        setTempIsStandard(true);
      }
      if (selectedOpt.duration) {
        setDuration(selectedOpt.duration);
        setDurationIsStandard(true);
      }
    }
    // Check for matching smart tip
    for (const [key, tip] of Object.entries(washTips)) {
      if (value.includes(key)) {
        setTipText(tip);
        setShowTip(true);
        return;
      }
    }
    setShowTip(false);
  };

  // Calculate shrinkage (silent mode for slider use, no validation alert)
  const recalculate = useCallback((bwWVal: string, awWVal: string, bwLVal: string, awLVal: string) => {
    const bwWNum = parseFloat(bwWVal);
    const awWNum = parseFloat(awWVal);
    const bwLNum = parseFloat(bwLVal);
    const awLNum = parseFloat(awLVal);

    let wShrink = 0;
    let lShrink = 0;

    if (!isNaN(bwWNum) && !isNaN(awWNum) && bwWNum !== 0) {
      wShrink = calculateShrinkage(bwWNum, awWNum);
    }
    if (!isNaN(bwLNum) && !isNaN(awLNum) && bwLNum !== 0) {
      lShrink = calculateShrinkage(bwLNum, awLNum);
    }

    setWidthShrink(wShrink);
    setLengthShrink(lShrink);
  }, []);

  // Calculate shrinkage (button click with validation)
  const handleCalculate = useCallback(() => {
    const validation = validateMeasurements(bwW, awW, bwL, awL);
    if (!validation.valid) {
      alert(`⚠️ ${validation.message}`);
      return;
    }
    recalculate(bwW, awW, bwL, awL);
    setShowResults(true);
    setMobileStage('results');
  }, [bwW, awW, bwL, awL, recalculate]);

  // Slider callbacks — update the washed value and recalculate instantly
  // Use default originals when user hasn't entered values yet so the preview responds
  const handleSliderLengthChange = useCallback((val: number) => {
    const defaultSize = unit === 'cm' ? '50' : '20';
    if (!bwL) setBwL(defaultSize);
    if (!bwW) setBwW(defaultSize);
    const newAwL = String(val);
    setAwL(newAwL);
    recalculate(bwW || defaultSize, awW, bwL || defaultSize, newAwL);
  }, [bwW, awW, bwL, unit, recalculate]);

  const handleSliderWidthChange = useCallback((val: number) => {
    const defaultSize = unit === 'cm' ? '50' : '20';
    if (!bwL) setBwL(defaultSize);
    if (!bwW) setBwW(defaultSize);
    const newAwW = String(val);
    setAwW(newAwW);
    recalculate(bwW || defaultSize, newAwW, bwL || defaultSize, awL);
  }, [bwW, bwL, awL, unit, recalculate]);

  // Open save modal
  const openSaveModal = () => {
    if (!bwW && !awW && !bwL && !awL) {
      alert("⚠️ Please enter measurements and click 'Calculate Shrinkage' before saving.");
      return;
    }
    handleCalculate();
    setSaveModalOpen(true);
  };

  // Save result
  const handleSave = () => {
    if (!fabricName) {
      alert("Please enter a Specific Fabric Name to save.");
      return;
    }

    const finalWash = wash === 'Other' ? (washCustom || 'Custom Wash') : (wash || 'Not specified');
    const finalType = fabricType === 'Other' ? (fabricTypeCustom || 'Custom Category') : fabricType;

    const result: FabricResult = {
      id: editingId || Date.now(),
      type: finalType,
      name: fabricName,
      wash: finalWash,
      temp: temp || undefined,
      duration: duration || undefined,
      bwL: bwL ? parseFloat(bwL) : null,
      awL: awL ? parseFloat(awL) : null,
      bwW: bwW ? parseFloat(bwW) : null,
      awW: awW ? parseFloat(awW) : null,
      wShrink: widthShrink,
      lShrink: lengthShrink,
      unit,
      date: new Date().toLocaleDateString(),
      recordType: 'single'
    };

    if (editingId) {
      updateResult(result);
    } else {
      addResult(result);
    }

    setSaveModalOpen(false);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setWash('');
    setWashCustom('');
    setTemp('');
    setDuration('');
    setTempIsStandard(false);
    setDurationIsStandard(false);
    setBwL('');
    setBwW('');
    setAwL('');
    setAwW('');
    setWidthShrink(0);
    setLengthShrink(0);
    setFabricType('Denim');
    setFabricTypeCustom('');
    setFabricName('');
    setEditingIdLocal(null);
    setEditingId(null);
    setUserHasTyped(false);
    setShowResults(false);
    setMobileStage('input');
  };

  // Cancel edit
  const cancelEdit = () => {
    resetForm();
  };

  // Listen for header actions (dispatched from MainLayout)
  useEffect(() => {
    const onClear = () => {
      resetForm();
      try {
        localStorage.setItem('clear-all-token', String(Date.now()));
      } catch {
        // Ignore storage errors
      }
    };
    const onOpenSave = () => openSaveModal();
    window.addEventListener('clear-all', onClear as EventListener);
    window.addEventListener('open-save-modal', onOpenSave as EventListener);
    return () => {
      window.removeEventListener('clear-all', onClear as EventListener);
      window.removeEventListener('open-save-modal', onOpenSave as EventListener);
    };
  }, [resetForm, openSaveModal]);

  // Track current view mode for smart print
  useEffect(() => {
    document.body.dataset.currentView = calcMode === 'results' ? 'results' : 'calculator';
    return () => { document.body.dataset.currentView = 'calculator'; };
  }, [calcMode]);

  // Sync React state to localStorage before printing (custom event is synchronous)
  useEffect(() => {
    const syncStorage = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.results));
    };
    window.addEventListener('sync-storage', syncStorage);
    return () => window.removeEventListener('sync-storage', syncStorage);
  }, [state.results]);

  // Listen for result edit/duplicate/load events from ResultsPage
  useEffect(() => {
    const loadResultData = (res: FabricResult, isEditing: boolean) => {
      setBwL(res.bwL?.toString() || '');
      setBwW(res.bwW?.toString() || '');
      setAwL(res.awL?.toString() || '');
      setAwW(res.awW?.toString() || '');
      setTemp(res.temp || '');
      setDuration(res.duration || '');
      // When loading a saved result, treat existing temp/duration as user-set (not standard auto-fill)
      setTempIsStandard(false);
      setDurationIsStandard(false);

      if (fabricData.hasOwnProperty(res.type)) {
        setFabricType(res.type);
      } else {
        setFabricType('Other');
        setFabricTypeCustom(res.type || '');
      }
      setFabricName(res.name || '');

      const washExists = washProcessOptions.some(opt => opt.value === res.wash);
      if (washExists && res.wash !== 'Other') {
        handleWashChange(res.wash);
      } else {
        setWash('Other');
        setWashCustom(res.wash === 'Not specified' ? '' : (res.wash || ''));
        setShowTip(false);
      }

      if (res.unit) {
        setUnit(res.unit);
      }

      if (isEditing) {
        setEditingIdLocal(res.id);
        setEditingId(res.id);
      } else {
        setEditingIdLocal(null);
        setEditingId(null);
      }

      setWidthShrink(res.wShrink || 0);
      setLengthShrink(res.lShrink || 0);
      setCalcMode('shrinkage');
      setShowResults(false);
    };

    const onEditResult = (e: Event) => {
      loadResultData((e as CustomEvent).detail as FabricResult, true);
    };

    const onDuplicateResult = (e: Event) => {
      loadResultData((e as CustomEvent).detail as FabricResult, false);
    };

    const onLoadAverage = (e: Event) => {
      const { avgL, avgW } = (e as CustomEvent).detail;
      if (avgL !== 0) {
        setBwL('100');
        setAwL((100 * (1 - avgL / 100)).toFixed(1));
      }
      if (avgW !== 0) {
        setBwW('100');
        setAwW((100 * (1 - avgW / 100)).toFixed(1));
      }
      setWidthShrink(avgW || 0);
      setLengthShrink(avgL || 0);
      setCalcMode('shrinkage');
    };

    window.addEventListener('edit-result', onEditResult);
    window.addEventListener('duplicate-result', onDuplicateResult);
    window.addEventListener('load-average', onLoadAverage);
    return () => {
      window.removeEventListener('edit-result', onEditResult);
      window.removeEventListener('duplicate-result', onDuplicateResult);
      window.removeEventListener('load-average', onLoadAverage);
    };
  }, [handleWashChange, setEditingId]);

  // Auto-fill wash parameters from the selected wash process standard values
  const handleAutoFillWashParams = () => {
    if (!wash || wash === 'Other') {
      alert('Please select a wash process first.');
      return;
    }
    const opt = washProcessOptions.find(o => o.value === wash);
    if (opt) {
      if (opt.temp) { setTemp(opt.temp); setTempIsStandard(true); }
      if (opt.duration) { setDuration(opt.duration); setDurationIsStandard(true); }
    }
  };

  // Toggle accordion panels — mutually exclusive
  const toggleAccordion = (panel: 'shrinkage' | 'wash') => {
    setActiveAccordion(prev => prev === panel ? null : panel);
  };

  // Get shrinkage display values
  const getShrinkageDisplay = (value: number) => {
    if (value === 0) return { text: '0.0%', color: 'var(--text-main)', status: 'NO CHANGE' };
    if (value > 0) return { text: `-${value.toFixed(1)}%`, color: 'var(--danger)', status: 'SHRINKAGE' };
    return { text: `+${Math.abs(value).toFixed(1)}%`, color: 'var(--success)', status: 'STRETCH/GROWTH' };
  };

  const wDisplay = getShrinkageDisplay(widthShrink);
  const lDisplay = getShrinkageDisplay(lengthShrink);

  return (
    <div className="view-section active">
      <div className="page-header">
        <h1 id="dashboard-title">
          {editingId ? `Editing Result` : ''}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {editingId && (
            <Button variant="outline" onClick={cancelEdit}>Cancel Edit</Button>
          )}
        </div>
      </div>

      {/* Desktop vertical sidebar — portaled into #sidebar-nav-portal in MainLayout */}
      {sidebarPortalTarget && createPortal(
        <nav className="sidebar-items">
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'shrinkage' ? 'active' : ''}`}
            onClick={() => setCalcMode('shrinkage')}
            title="Shrinkage"
          >
            <i className="fas fa-ruler-combined"></i>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'wash' ? 'active' : ''}`}
            onClick={() => setCalcMode('wash')}
            title="Wash Process"
          >
            <i className="fas fa-tshirt"></i>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'quickmath' ? 'active' : ''}`}
            onClick={() => setCalcMode('quickmath')}
            title="Quick Math"
          >
            <i className="fas fa-calculator"></i>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'advanced' ? 'active' : ''}`}
            onClick={() => setCalcMode('advanced')}
            title="Advanced"
          >
            <i className="fas fa-flask"></i>
          </button>
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'rollmgr' ? 'active' : ''}`}
            onClick={() => setCalcMode('rollmgr')}
            title="Rolls"
          >
            <i className="fas fa-layer-group"></i>
          </button>
          <div className="sidebar-divider"></div>
          <button
            type="button"
            className={`sidebar-btn ${calcMode === 'results' ? 'active' : ''}`}
            onClick={() => setCalcMode('results')}
            title="Results"
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            type="button"
            className="sidebar-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('sync-storage'));
              triggerSmartPrint();
            }}
            title="Print"
            style={{ marginTop: 'auto' }}
          >
            <i className="fas fa-print"></i>
          </button>
          <button
            type="button"
            className="sidebar-btn"
            onClick={() => navigate('/settings')}
            title="Settings"
          >
            <i className="fas fa-cog"></i>
          </button>
        </nav>,
        sidebarPortalTarget
      )}

      {/* Mobile bottom nav — portaled into #mobile-nav-portal in MainLayout (fixed at bottom) */}
      {mobileNavPortalTarget && createPortal(
        <>
          {/* Overlay + slide-up drawer for overflow items */}
          {moreOpen && (
            <>
              <div className="more-drawer-overlay" onClick={() => setMoreOpen(false)} />
              <div className="more-drawer">
                <div className="more-drawer-title">More</div>
                <button
                  type="button"
                  className={`more-drawer-btn ${calcMode === 'wash' ? 'active' : ''}`}
                  onClick={() => { setCalcMode('wash'); setMoreOpen(false); }}
                >
                  <i className="fas fa-tshirt"></i>
                  <span>Wash Process</span>
                </button>
                <button
                  type="button"
                  className={`more-drawer-btn ${calcMode === 'results' ? 'active' : ''}`}
                  onClick={() => { setCalcMode('results'); setMoreOpen(false); }}
                >
                  <i className="fas fa-list"></i>
                  <span>Results Library</span>
                </button>
                <button
                  type="button"
                  className="more-drawer-btn"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('sync-storage'));
                    triggerSmartPrint();
                    setMoreOpen(false);
                  }}
                >
                  <i className="fas fa-print"></i>
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  className="more-drawer-btn"
                  onClick={() => { navigate('/settings'); setMoreOpen(false); }}
                >
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </button>
              </div>
            </>
          )}
          {/* 4 primary items + More button */}
          <div className="mobile-nav-items">
            <button
              type="button"
              className={`mobile-nav-btn ${calcMode === 'shrinkage' ? 'active' : ''}`}
              onClick={() => { setCalcMode('shrinkage'); setMoreOpen(false); }}
            >
              <i className="fas fa-ruler-combined"></i>
              <span>Shrinkage</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${calcMode === 'quickmath' ? 'active' : ''}`}
              onClick={() => { setCalcMode('quickmath'); setMoreOpen(false); }}
            >
              <i className="fas fa-calculator"></i>
              <span>Quick</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${calcMode === 'advanced' ? 'active' : ''}`}
              onClick={() => { setCalcMode('advanced'); setMoreOpen(false); }}
            >
              <i className="fas fa-flask"></i>
              <span>Advanced</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${calcMode === 'rollmgr' ? 'active' : ''}`}
              onClick={() => { setCalcMode('rollmgr'); setMoreOpen(false); }}
            >
              <i className="fas fa-layer-group"></i>
              <span>Rolls</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${moreOpen || calcMode === 'results' ? 'active' : ''}`}
              onClick={() => setMoreOpen(prev => !prev)}
            >
              <i className={`fas ${moreOpen ? 'fa-times' : 'fa-ellipsis-h'}`}></i>
              <span>More</span>
            </button>
          </div>
        </>,
        mobileNavPortalTarget
      )}

      {/* Measurement Shrinkage Tab */}
      {calcMode === 'shrinkage' && (
        <div id="calc-mode-shrinkage" className="calc-mode active">
          <div className="calc-grid">
            {/* ── PART 1: Input Stage (hidden on mobile when results shown) ── */}
            <div className={`shrinkage-part-input${mobileStage === 'results' ? ' mobile-part-hidden' : ''}`}>
            <div className="card">
              <div className="card-title">
                <span>1. Measurement Data</span>
                <select
                  value={unit}
                  onChange={(e) => {
                    const newUnit = e.target.value as Unit;
                    if (newUnit !== unit) {
                      const factor = newUnit === 'cm' ? 2.54 : 1 / 2.54;
                      const conv = (v: string) => {
                        const n = parseFloat(v);
                        return (!v || isNaN(n)) ? v : (n * factor).toFixed(2);
                      };
                      setBwL(conv(bwL));
                      setBwW(conv(bwW));
                      setAwL(conv(awL));
                      setAwW(conv(awW));
                    }
                    setUnit(newUnit);
                  }}
                  style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: 'var(--primary)', outline: 'none' }}
                >
                  <option value="inches">inches</option>
                  <option value="cm">cm</option>
                </select>
              </div>

              {/* ── ACCORDION PANEL 1: Fabric Shrinkage (Before/After inputs) ── */}
              <div className="accordion-item">
                <button
                  type="button"
                  className={`accordion-header-btn ${activeAccordion === 'shrinkage' ? 'open' : ''}`}
                  onClick={() => toggleAccordion('shrinkage')}
                >
                  <span><i className="fas fa-ruler-combined" style={{ color: 'var(--primary)' }}></i> Fabric Shrinkage</span>
                  <i className={`fas fa-chevron-${activeAccordion === 'shrinkage' ? 'up' : 'down'} accordion-chevron`}></i>
                </button>
                {activeAccordion === 'shrinkage' && (
                  <div className="accordion-body">
                    <h4 style={{ margin: '0 0 12px', color: 'var(--primary)', borderBottom: '2px solid var(--info-light)', paddingBottom: '8px' }}>
                      <i className="fas fa-ruler-combined"></i> Step 1: Before Wash (Original)
                    </h4>
                    <div className="input-row split">
                      <Input
                        label={<span style={{ color: 'var(--primary)', fontWeight: 700 }}>Original Length [{unit}]</span>}
                        type="number"
                        placeholder="e.g. 20"
                        value={bwL}
                        onChange={(e) => { setBwL(e.target.value); setUserHasTyped(true); }}
                        style={{ borderColor: '#bbdefb', backgroundColor: '#f8fbff' }}
                      />
                      <Input
                        label={<span style={{ color: 'var(--primary)', fontWeight: 700 }}>Original Width [{unit}]</span>}
                        type="number"
                        placeholder="e.g. 20"
                        value={bwW}
                        onChange={(e) => { setBwW(e.target.value); setUserHasTyped(true); }}
                        style={{ borderColor: '#bbdefb', backgroundColor: '#f8fbff' }}
                      />
                    </div>

                    <h4 style={{ margin: '12px 0', color: 'var(--danger)', borderBottom: '2px solid var(--danger-light)', paddingBottom: '8px' }}>
                      <i className="fas fa-tint"></i> Step 2: After Wash (Result)
                    </h4>
                    <div className="input-row split">
                      <Input
                        label={<span style={{ color: 'var(--danger)', fontWeight: 700 }}>Washed Length [{unit}]</span>}
                        type="number"
                        placeholder="e.g. 18"
                        value={awL}
                        onChange={(e) => { setAwL(e.target.value); setUserHasTyped(true); }}
                        style={{ borderColor: '#ffcdd2', backgroundColor: '#fffafb' }}
                      />
                      <Input
                        label={<span style={{ color: 'var(--danger)', fontWeight: 700 }}>Washed Width [{unit}]</span>}
                        type="number"
                        placeholder="e.g. 22"
                        value={awW}
                        onChange={(e) => { setAwW(e.target.value); setUserHasTyped(true); }}
                        style={{ borderColor: '#ffcdd2', backgroundColor: '#fffafb' }}
                      />
                    </div>
                  </div>
                )}
              </div>



              {/* Results — shown between accordion and action buttons */}
              {showResults && (
                <div className="results-box" style={{ marginTop: '10px' }}>
                  <h4><i className="fas fa-percentage"></i> Calculated Results</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '700', marginBottom: '5px' }}>LENGTH (Horizontal)</div>
                      <div id="lengthDisplay" style={{ fontSize: '28px', fontWeight: '900', color: lDisplay.color }}>{lDisplay.text}</div>
                      <div id="lengthStatus" style={{ fontSize: '13px', fontWeight: 'bold', color: lDisplay.color }}>{lDisplay.status}</div>
                    </div>
                    <div style={{ width: '2px', height: '50px', background: '#ffcdd2' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '700', marginBottom: '5px' }}>WIDTH (Vertical)</div>
                      <div id="widthDisplay" style={{ fontSize: '28px', fontWeight: '900', color: wDisplay.color }}>{wDisplay.text}</div>
                      <div id="widthStatus" style={{ fontSize: '13px', fontWeight: 'bold', color: wDisplay.color }}>{wDisplay.status}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons — always visible at the bottom of the card */}
              <div className="calc-btn-container" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button
                  variant="primary"
                  style={{ width: '100%', padding: '15px', fontSize: '16px' }}
                  onClick={handleCalculate}
                  icon={<i className="fas fa-cog"></i>}
                >
                  {showResults ? 'Recalculate' : 'Calculate Shrinkage'}
                </Button>
                <Button
                  variant="danger"
                  style={{ width: '100%', padding: '15px', fontSize: '16px' }}
                  onClick={resetForm}
                  icon={<i className="fas fa-trash-alt"></i>}
                >
                  Clear
                </Button>
                {showResults && (
                  <Button
                    variant="success"
                    style={{ width: '100%', padding: '15px', fontSize: '16px' }}
                    onClick={openSaveModal}
                    icon={<i className="fas fa-save"></i>}
                  >
                    Save Result
                  </Button>
                )}
              </div>
            </div>{/* end card */}
            </div>{/* end shrinkage-part-input */}

            {/* ── PART 2: Results + Visual (hidden on mobile until Calculate clicked) ── */}
            <div className={`shrinkage-part-results${mobileStage === 'input' ? ' mobile-part-hidden' : ''}`}>
              {/* Back to Edit button — mobile only */}
              <button
                type="button"
                className="mobile-back-edit-btn"
                onClick={() => setMobileStage('input')}
              >
                <i className="fas fa-arrow-left"></i> Back to Edit
              </button>

              {/* Results panel — shown inside Part 2 on mobile */}
              {showResults && (
                <div className="results-box mobile-results-box" style={{ marginBottom: '12px' }}>
                  <h4><i className="fas fa-percentage"></i> Calculated Results</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '700', marginBottom: '5px' }}>LENGTH (Horizontal)</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: lDisplay.color }}>{lDisplay.text}</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: lDisplay.color }}>{lDisplay.status}</div>
                    </div>
                    <div style={{ width: '2px', height: '50px', background: '#ffcdd2' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '700', marginBottom: '5px' }}>WIDTH (Vertical)</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: wDisplay.color }}>{wDisplay.text}</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: wDisplay.color }}>{wDisplay.status}</div>
                    </div>
                  </div>
                </div>
              )}

            <Preview
              widthShrink={widthShrink}
              lengthShrink={lengthShrink}
              wDisplay={wDisplay}
              lDisplay={lDisplay}
              unit={unit}
              originalLength={parseFloat(bwL) || 0}
              originalWidth={parseFloat(bwW) || 0}
              washedLength={parseFloat(awL) || 0}
              washedWidth={parseFloat(awW) || 0}
              onWashedLengthChange={handleSliderLengthChange}
              onWashedWidthChange={handleSliderWidthChange}
              hideSliders={userHasTyped}
            />
            </div>{/* end shrinkage-part-results */}
          </div>
        </div>
      )}

      {/* Wash Process Tab */}
      {calcMode === 'wash' && (
        <div id="calc-mode-wash" className="calc-mode active">
          <div className="calc-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="card">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-tshirt" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
                <span>Wash Process Settings</span>
                <button
                  type="button"
                  className="wash-autofill-btn"
                  onClick={handleAutoFillWashParams}
                  title="Auto-fill standard temperature & duration for selected wash process"
                  style={{ marginLeft: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'var(--secondary)', color: 'var(--text-light)' }}
                >
                  <i className="fas fa-magic"></i> Auto-Fill Standards
                </button>
              </div>

              <div className="input-row" style={{ marginBottom: '16px' }}>
                <div className="input-group">
                  <label><i className="fas fa-water" style={{ color: 'var(--primary)' }}></i> Wash Process</label>
                  <select
                    value={wash}
                    onChange={(e) => handleWashChange(e.target.value)}
                    style={{ borderColor: 'var(--primary)', fontWeight: '500' }}
                  >
                    {Array.from(new Set(washProcessOptions.map(opt => opt.group))).filter(Boolean).map((group) => (
                      <optgroup key={group} label={group}>
                        {washProcessOptions
                          .filter((opt, i, arr) => opt.group === group && arr.findIndex(o => o.value === opt.value && o.group === group) === i)
                          .map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  {wash === 'Other' && (
                    <input
                      type="text"
                      placeholder="Type your custom wash/dye here..."
                      value={washCustom}
                      onChange={(e) => setWashCustom(e.target.value)}
                      style={{ display: 'block', marginTop: '10px', borderColor: 'var(--success)' }}
                    />
                  )}
                  {showTip && (
                    <div id="smart-wash-tip" style={{ display: 'block', marginTop: '10px' }}>
                      <i className="fas fa-lightbulb"></i> <span>{tipText}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="input-row split">
                <Input
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Temperature
                      {tempIsStandard && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                          color: '#fff', padding: '1px 6px', borderRadius: '10px',
                          letterSpacing: '0.3px', whiteSpace: 'nowrap',
                        }}>⚡ Standard</span>
                      )}
                    </span>
                  }
                  placeholder="e.g. 40°C or Cold"
                  value={temp}
                  onChange={(e) => { setTemp(e.target.value); setTempIsStandard(false); }}
                  style={tempIsStandard ? { borderColor: '#1976d2', backgroundColor: '#f0f7ff' } : {}}
                />
                <Input
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Duration
                      {durationIsStandard && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                          color: '#fff', padding: '1px 6px', borderRadius: '10px',
                          letterSpacing: '0.3px', whiteSpace: 'nowrap',
                        }}>⚡ Standard</span>
                      )}
                    </span>
                  }
                  placeholder="e.g. 45 mins"
                  value={duration}
                  onChange={(e) => { setDuration(e.target.value); setDurationIsStandard(false); }}
                  style={durationIsStandard ? { borderColor: '#1976d2', backgroundColor: '#f0f7ff' } : {}}
                />
              </div>

              {wash && wash !== '' && (
                <div style={{ marginTop: '20px', padding: '14px', background: 'var(--info-light)', borderRadius: '10px', border: '1px solid #bbdefb' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fas fa-info-circle"></i> Current Selection
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {wash === 'Other' ? (washCustom || 'Custom Wash') : (wash || 'None selected')}
                  </div>
                  {(temp || duration) && (
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {temp && <div style={{ fontSize: '13px', color: 'var(--text-light)' }}><i className="fas fa-thermometer-half" style={{ color: 'var(--primary)' }}></i> {temp}</div>}
                      {duration && <div style={{ fontSize: '13px', color: 'var(--text-light)' }}><i className="fas fa-clock" style={{ color: 'var(--primary)' }}></i> {duration}</div>}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                <Button
                  variant="primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                  onClick={() => setCalcMode('shrinkage')}
                  icon={<i className="fas fa-arrow-left"></i>}
                >
                  Back to Shrinkage
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Math Tab */}
      {calcMode === 'quickmath' && (
        <div id="calc-mode-quickmath" className="calc-mode active">
          <QuickMath />
        </div>
      )}

      {/* Advanced Tab */}
      {calcMode === 'advanced' && (
        <div id="calc-mode-advanced" className="calc-mode active">
          <AdvancedTest
            unit={unit}
            onTransferToMain={(avgL, avgW) => {
              setBwL('100');
              setBwW('100');
              setAwL((100 * (1 - avgL / 100)).toFixed(1));
              setAwW((100 * (1 - avgW / 100)).toFixed(1));
              setCalcMode('shrinkage');
              setTimeout(handleCalculate, 100);
            }}
          />
        </div>
      )}

      {/* Roll Manager Tab */}
      {calcMode === 'rollmgr' && (
        <div id="calc-mode-rollmgr" className="calc-mode active">
          <RollManager
            unit={unit}
            onTransferToMain={(avgL, avgW) => {
              if (avgL !== 0) {
                setBwL('100');
                setAwL((100 * (1 - avgL / 100)).toFixed(1));
              }
              if (avgW !== 0) {
                setBwW('100');
                setAwW((100 * (1 - avgW / 100)).toFixed(1));
              }
              setCalcMode('shrinkage');
              setTimeout(handleCalculate, 100);
            }}
          />
        </div>
      )}

      {/* Results Tab (inline) */}
      {calcMode === 'results' && (
        <div id="calc-mode-results" className="calc-mode active">
          <ResultsPage />
        </div>
      )}

      {/* Save Modal */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={editingId ? "Update Shrinkage Result" : "Save Shrinkage Result"}
      >
        <div className="input-group">
          <label>Fabric Category (Type)</label>
          <select value={fabricType} onChange={(e) => setFabricType(e.target.value)}>
            {Object.keys(fabricData).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {fabricType === 'Other' && (
            <input
              type="text"
              placeholder="Type your custom category..."
              value={fabricTypeCustom}
              onChange={(e) => setFabricTypeCustom(e.target.value)}
              style={{ display: 'block', marginTop: '10px', borderColor: 'var(--primary)' }}
            />
          )}
        </div>

        <div className="input-group">
          <label>Specific Fabric Name</label>
          <input
            type="text"
            list="popularFabrics"
            placeholder="e.g. 14oz Japanese Selvedge or choose from list"
            value={fabricName}
            onChange={(e) => setFabricName(e.target.value)}
          />
          <datalist id="popularFabrics">
            {(fabricData[fabricType] || []).map(fab => (
              <option key={fab} value={fab} />
            ))}
          </datalist>
        </div>

        <div style={{ background: 'var(--secondary)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '5px' }}>Calculation verified:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
            <span>Length (L): <span style={{ color: 'var(--primary)' }}>{lDisplay.text}</span></span>
            <span>Width (W): <span style={{ color: 'var(--primary)' }}>{wDisplay.text}</span></span>
          </div>
        </div>

        <div className="modal-actions">
          <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {editingId ? 'Update Library' : 'Save to Library'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
