import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { fabricData, washProcessOptions, washTips } from '../../utils/constants';

export interface FabricWashSpec {
  fabricType: string;
  fabricTypeCustom: string;
  fabricName: string;
  wash: string;
  washCustom: string;
  temp: string;
  duration: string;
  drying: string;
}

export interface FabricWashSpecsPanelHandle {
  getSpec: () => FabricWashSpec;
}

interface Props {
  /** Unique prefix so each screen has isolated localStorage state */
  storagePrefix: string;
}

const DRYING_OPTIONS = [
  'Tumble Dry High', 'Tumble Dry Low', 'Line Dry',
  'Flat Dry', 'Hang Dry', 'Drip Dry',
];

export const FabricWashSpecsPanel = forwardRef<FabricWashSpecsPanelHandle, Props>(
  ({ storagePrefix }, ref) => {
    const [open, setOpen] = useState(false);

    const [fabricType, setFabricType] = useLocalStorage(`${storagePrefix}_fabricType`, 'Denim');
    const [fabricTypeCustom, setFabricTypeCustom] = useLocalStorage(`${storagePrefix}_fabricTypeCustom`, '');
    const [fabricName, setFabricName] = useLocalStorage(`${storagePrefix}_fabricName`, '');
    const [wash, setWash] = useLocalStorage(`${storagePrefix}_wash`, '');
    const [washCustom, setWashCustom] = useLocalStorage(`${storagePrefix}_washCustom`, '');
    const [temp, setTemp] = useLocalStorage(`${storagePrefix}_temp`, '');
    const [duration, setDuration] = useLocalStorage(`${storagePrefix}_duration`, '');
    const [drying, setDrying] = useLocalStorage(`${storagePrefix}_drying`, '');
    const [tempIsStandard, setTempIsStandard] = useState(false);
    const [durationIsStandard, setDurationIsStandard] = useState(false);
    const [tip, setTip] = useState('');

    // Expose current spec values to parent via ref
    useImperativeHandle(ref, () => ({
      getSpec: () => ({
        fabricType,
        fabricTypeCustom,
        fabricName,
        wash,
        washCustom,
        temp,
        duration,
        drying,
      }),
    }));

    const handleWashChange = (value: string) => {
      setWash(value);
      setTip('');
      if (!value || value === 'Other') { setTemp(''); setDuration(''); return; }
      const opt = washProcessOptions.find(o => o.value === value);
      if (opt?.temp)     { setTemp(opt.temp);         setTempIsStandard(true); }
      if (opt?.duration) { setDuration(opt.duration); setDurationIsStandard(true); }
      // smart tip
      const key = Object.keys(washTips).find(k => value.toLowerCase().includes(k.toLowerCase()));
      if (key) setTip((washTips as Record<string, string>)[key]);
    };

    const handleAutoFill = () => {
      if (!wash || wash === 'Other') return;
      const opt = washProcessOptions.find(o => o.value === wash);
      if (opt?.temp)     { setTemp(opt.temp);         setTempIsStandard(true); }
      if (opt?.duration) { setDuration(opt.duration); setDurationIsStandard(true); }
    };

    const summaryParts = [
      fabricName || (fabricType !== 'Other' ? fabricType : fabricTypeCustom),
      wash === 'Other' ? (washCustom || 'Custom') : wash,
      temp,
      duration,
      drying,
    ].filter(Boolean);

    return (
      <div className="fws-accordion">
        <button
          type="button"
          className="fws-toggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          <span className="fws-toggle-left">
            <i className="fas fa-layer-group fws-icon"></i>
            <span className="fws-title">Fabric &amp; Wash Specifications</span>
          </span>
          {!open && summaryParts.length > 0 && (
            <span className="fws-summary">{summaryParts.join(' · ')}</span>
          )}
          {!open && summaryParts.length === 0 && (
            <span className="fws-summary fws-summary-empty">Click to set fabric &amp; wash context…</span>
          )}
          <i className={`fas fa-chevron-${open ? 'up' : 'down'} fws-chevron`}></i>
        </button>

        {open && (
          <div className="fws-body">
            {/* ── Step 1 ──────────────────────────────────────────────────── */}
            <div className="fws-step">
              <div className="fws-step-label">
                <span className="fws-step-num">1</span> Fabric Identification
              </div>
              <div className="fws-fields fws-fabric-row">
                <div className="input-group">
                  <label>Fabric Category (Type)</label>
                  <select
                    value={fabricType}
                    onChange={e => {
                      setFabricType(e.target.value);
                      setFabricName('');
                      if (e.target.value !== 'Other') setFabricTypeCustom('');
                    }}
                    style={{ borderColor: 'var(--primary)', fontWeight: 600 }}
                  >
                    {Object.keys(fabricData).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {fabricType === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom category…"
                      value={fabricTypeCustom}
                      onChange={e => setFabricTypeCustom(e.target.value)}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>
                <div className="input-group">
                  <label>Specific Fabric Name</label>
                  <input
                    type="text"
                    list={`${storagePrefix}-fws-fabric-names`}
                    placeholder="Select or type a name…"
                    value={fabricName}
                    onChange={e => setFabricName(e.target.value)}
                    style={{ borderColor: '#bbdefb' }}
                  />
                  <datalist id={`${storagePrefix}-fws-fabric-names`}>
                    {(fabricData[fabricType] || []).map(fab => (
                      <option key={fab} value={fab} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* ── Step 2 ──────────────────────────────────────────────────── */}
            <div className="fws-step">
              <div className="fws-step-label">
                <span className="fws-step-num">2</span> Wash House Parameters
                <button
                  type="button"
                  className="wash-autofill-btn fws-autofill"
                  onClick={handleAutoFill}
                  title="Auto-fill standard temperature & duration"
                >
                  <i className="fas fa-magic"></i> Auto-Fill Standards
                </button>
              </div>
              <div className="fws-fields fws-wash-row">
                <div className="input-group fws-wash-process">
                  <label>
                    <i className="fas fa-water" style={{ color: 'var(--primary)', marginRight: 4 }}></i>
                    Wash Process
                  </label>
                  <select
                    value={wash}
                    onChange={e => handleWashChange(e.target.value)}
                    style={{ borderColor: 'var(--primary)', fontWeight: 500 }}
                  >
                    <option value="">-- Select --</option>
                    {Array.from(new Set(washProcessOptions.map(o => o.group)))
                      .filter(Boolean)
                      .map(group => (
                        <optgroup key={group} label={group}>
                          {washProcessOptions
                            .filter((o, i, arr) =>
                              o.group === group &&
                              arr.findIndex(x => x.value === o.value && x.group === group) === i
                            )
                            .map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </optgroup>
                      ))}
                  </select>
                  {wash === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom wash/dye…"
                      value={washCustom}
                      onChange={e => setWashCustom(e.target.value)}
                      style={{ marginTop: 6, borderColor: 'var(--success)' }}
                    />
                  )}
                </div>

                <div className="input-group">
                  <label>
                    Temperature
                    {tempIsStandard && <span className="fws-std-badge">⚡ Standard</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 40°C"
                    value={temp}
                    onChange={e => { setTemp(e.target.value); setTempIsStandard(false); }}
                    style={tempIsStandard ? { borderColor: '#1976d2', backgroundColor: '#f0f7ff' } : {}}
                  />
                </div>

                <div className="input-group">
                  <label>
                    Duration
                    {durationIsStandard && <span className="fws-std-badge">⚡ Standard</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 45 min"
                    value={duration}
                    onChange={e => { setDuration(e.target.value); setDurationIsStandard(false); }}
                    style={durationIsStandard ? { borderColor: '#1976d2', backgroundColor: '#f0f7ff' } : {}}
                  />
                </div>

                <div className="input-group">
                  <label>
                    <i className="fas fa-wind" style={{ color: '#f57c00', marginRight: 4 }}></i>
                    Drying Method
                  </label>
                  <select value={drying} onChange={e => setDrying(e.target.value)}>
                    <option value="">-- Select --</option>
                    {DRYING_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {tip && (
                <div className="fws-tip">
                  <i className="fas fa-lightbulb"></i>
                  <span dangerouslySetInnerHTML={{ __html: tip }} />
                </div>
              )}
            </div>

            <button
              type="button"
              className="fws-collapse-btn"
              onClick={() => setOpen(false)}
            >
              <i className="fas fa-check"></i> Done — Collapse Specifications
            </button>
          </div>
        )}
      </div>
    );
  }
);

FabricWashSpecsPanel.displayName = 'FabricWashSpecsPanel';
