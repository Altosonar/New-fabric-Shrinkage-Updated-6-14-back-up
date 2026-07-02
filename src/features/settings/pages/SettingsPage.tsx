import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../hooks/useSettings';
import { useResults } from '../../../store/ResultsContext';
import { useDialog } from '../../../components/ui/DialogProvider';
import { WashProfile, AppSettings } from '../../../types';
import { WASH_PROFILES_KEY } from '../../../utils/constants';

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadProfiles(): WashProfile[] {
  try {
    const s = localStorage.getItem(WASH_PROFILES_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
function saveProfiles(profiles: WashProfile[]) {
  localStorage.setItem(WASH_PROFILES_KEY, JSON.stringify(profiles));
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, labelLeft, labelRight }: {
  checked: boolean; onChange: (v: boolean) => void;
  labelLeft?: string; labelRight?: string;
}) {
  return (
    <div className="stg-toggle-wrap">
      {labelLeft && <span className={`stg-toggle-label${!checked ? ' stg-toggle-label-active' : ''}`}>{labelLeft}</span>}
      <button
        role="switch"
        aria-checked={checked}
        className={`stg-toggle${checked ? ' stg-toggle-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="stg-toggle-thumb" />
      </button>
      {labelRight && <span className={`stg-toggle-label${checked ? ' stg-toggle-label-active' : ''}`}>{labelRight}</span>}
    </div>
  );
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="stg-section">
      <div className="stg-section-header">
        <i className={`fas ${icon}`}></i>
        <h2 className="stg-section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="stg-row">
      <div className="stg-row-label">
        <span>{label}</span>
        {hint && <span className="stg-row-hint">{hint}</span>}
      </div>
      <div className="stg-row-control">{children}</div>
    </div>
  );
}

// ── TAB 1: Preferences ────────────────────────────────────────────────────────
function PreferencesTab({ settings, updateSetting }: {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  return (
    <>
      <Section title="Measurement & Display" icon="fa-ruler">
        <Row label="Default Unit System" hint="Applied to all new calculations">
          <Toggle
            checked={settings.measurementUnit === 'cm'}
            onChange={v => updateSetting('measurementUnit', v ? 'cm' : 'inches')}
            labelLeft="Inches (in)"
            labelRight="Metric (cm)"
          />
        </Row>
        <Row label="Temperature Scale" hint="Used in wash process displays">
          <Toggle
            checked={settings.temperatureScale === 'celsius'}
            onChange={v => updateSetting('temperatureScale', v ? 'celsius' : 'fahrenheit')}
            labelLeft="Fahrenheit (°F)"
            labelRight="Celsius (°C)"
          />
        </Row>
        <Row label="Decimal Precision" hint="Number of decimal places shown in results">
          <select
            className="stg-select"
            value={settings.decimalPrecision}
            onChange={e => updateSetting('decimalPrecision', parseInt(e.target.value) as 1 | 2 | 3)}
          >
            <option value={1}>1 decimal place (e.g. 3.5%)</option>
            <option value={2}>2 decimal places (e.g. 3.52%)</option>
            <option value={3}>3 decimal places (e.g. 3.524%)</option>
          </select>
        </Row>
      </Section>
      <div className="stg-preview-box">
        <div className="stg-preview-label"><i className="fas fa-eye"></i> Live Preview</div>
        <div className="stg-preview-row">
          <span>Measurement</span>
          <strong>{settings.measurementUnit === 'inches' ? '12.500 in' : '31.75 cm'}</strong>
        </div>
        <div className="stg-preview-row">
          <span>Shrinkage</span>
          <strong style={{ color: '#d32f2f' }}>-{(3.524).toFixed(settings.decimalPrecision)}%</strong>
        </div>
        <div className="stg-preview-row">
          <span>Wash Temp</span>
          <strong>{settings.temperatureScale === 'fahrenheit' ? '104°F' : '40°C'}</strong>
        </div>
      </div>
    </>
  );
}

// ── TAB 2: Wash Library ───────────────────────────────────────────────────────
const BUILTIN_WASH_SAMPLES = [
  'Raw Wash / Rinse', 'Normal Machine Wash', 'Stone Wash', 'Enzyme Wash',
  'Bleach Wash', 'Sand Blast Wash', 'Acid Wash', 'Garment Dye', 'Overdye',
];

function WashLibraryTab() {
  const [profiles, setProfiles] = useState<WashProfile[]>(loadProfiles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', defaultTemp: '', defaultDuration: '' });

  const commit = (updated: WashProfile[]) => {
    setProfiles(updated);
    saveProfiles(updated);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const next = [...profiles, { id: Date.now().toString(), name: form.name.trim(), defaultTemp: form.defaultTemp, defaultDuration: form.defaultDuration, isCustom: true as const }];
    commit(next);
    setForm({ name: '', defaultTemp: '', defaultDuration: '' });
    setShowForm(false);
  };

  const handleSaveEdit = (id: string) => {
    commit(profiles.map(p => p.id === id ? { ...p, name: form.name, defaultTemp: form.defaultTemp, defaultDuration: form.defaultDuration } : p));
    setEditingId(null);
  };

  const startEdit = (p: WashProfile) => {
    setForm({ name: p.name, defaultTemp: p.defaultTemp, defaultDuration: p.defaultDuration });
    setEditingId(p.id);
    setShowForm(false);
  };

  return (
    <>
      <Section title="Custom Wash Profiles" icon="fa-tint">
        <p className="stg-desc">Create factory-specific wash cycles that appear in the wash process dropdown.</p>
        {profiles.length === 0 && !showForm && (
          <div className="stg-empty"><i className="fas fa-tint-slash"></i> No custom profiles yet.</div>
        )}
        <div className="stg-profile-list">
          {profiles.map(p => (
            <div key={p.id} className="stg-profile-item">
              {editingId === p.id ? (
                <div className="stg-inline-form">
                  <input className="stg-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Profile name *" />
                  <input className="stg-input" value={form.defaultTemp} onChange={e => setForm(f => ({ ...f, defaultTemp: e.target.value }))} placeholder="Default temp (e.g. 40°C)" />
                  <input className="stg-input" value={form.defaultDuration} onChange={e => setForm(f => ({ ...f, defaultDuration: e.target.value }))} placeholder="Duration (e.g. 30 min)" />
                  <div className="stg-inline-form-actions">
                    <button className="stg-btn stg-btn-primary" onClick={() => handleSaveEdit(p.id)}>Save</button>
                    <button className="stg-btn stg-btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="stg-profile-info">
                    <span className="stg-profile-name">{p.name}</span>
                    <span className="stg-profile-meta">{[p.defaultTemp, p.defaultDuration].filter(Boolean).join(' · ') || 'No defaults set'}</span>
                  </div>
                  <div className="stg-profile-actions">
                    <button className="stg-icon-btn" onClick={() => startEdit(p)} title="Edit"><i className="fas fa-edit"></i></button>
                    <button className="stg-icon-btn stg-icon-btn-danger" onClick={() => commit(profiles.filter(x => x.id !== p.id))} title="Delete"><i className="fas fa-trash"></i></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {showForm ? (
          <div className="stg-inline-form stg-inline-form-new">
            <input className="stg-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Profile name *" autoFocus />
            <input className="stg-input" value={form.defaultTemp} onChange={e => setForm(f => ({ ...f, defaultTemp: e.target.value }))} placeholder="Default temp (e.g. 60°C)" />
            <input className="stg-input" value={form.defaultDuration} onChange={e => setForm(f => ({ ...f, defaultDuration: e.target.value }))} placeholder="Duration (e.g. 45 min)" />
            <div className="stg-inline-form-actions">
              <button className="stg-btn stg-btn-primary" onClick={handleAdd}>Add Profile</button>
              <button className="stg-btn stg-btn-outline" onClick={() => { setShowForm(false); setForm({ name: '', defaultTemp: '', defaultDuration: '' }); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="stg-btn stg-btn-primary" style={{ marginTop: 12 }} onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', defaultTemp: '', defaultDuration: '' }); }}>
            <i className="fas fa-plus"></i> Create New Profile
          </button>
        )}
      </Section>
      <Section title="Built-in Wash Cycles" icon="fa-book-open">
        <p className="stg-desc">Industry-standard wash cycles (read-only reference).</p>
        <div className="stg-chips">
          {BUILTIN_WASH_SAMPLES.map(w => (
            <span key={w} className="stg-chip"><i className="fas fa-lock" style={{ fontSize: 9, opacity: 0.5 }}></i> {w}</span>
          ))}
          <span className="stg-chip stg-chip-more">+{20 - BUILTIN_WASH_SAMPLES.length} more in app</span>
        </div>
      </Section>
    </>
  );
}

// ── TAB 3: QC & Tolerance ─────────────────────────────────────────────────────
function QCTab({ settings, updateSetting }: {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  return (
    <>
      <Section title="Sampling Standards" icon="fa-flask">
        <Row label="Default Sampling Percentage" hint="Overrides the industry standard 10% sampling rate">
          <div className="stg-number-wrap">
            <input
              type="number" min={1} max={100} step={1}
              className="stg-number-input"
              value={settings.samplingPercent}
              onChange={e => updateSetting('samplingPercent', Math.min(100, Math.max(1, Number(e.target.value))))}
            />
            <span className="stg-number-unit">%</span>
          </div>
        </Row>
      </Section>
      <Section title="Roll Grouping" icon="fa-layer-group">
        <Row label="Group Sensitivity Threshold" hint="Rolls are auto-split into different cutting groups when shrinkage varies by more than this %">
          <div className="stg-number-wrap">
            <input
              type="number" min={0.1} max={10} step={0.1}
              className="stg-number-input"
              value={settings.rollGroupSensitivity}
              onChange={e => updateSetting('rollGroupSensitivity', Math.min(10, Math.max(0.1, parseFloat(e.target.value) || 1)))}
            />
            <span className="stg-number-unit">%</span>
          </div>
        </Row>
        <div className="stg-callout">
          <i className="fas fa-info-circle"></i>
          Current: rolls that differ by more than <strong>{settings.rollGroupSensitivity.toFixed(1)}%</strong> are placed in separate cutting groups.
        </div>
      </Section>
      <Section title="Visual Warning Thresholds" icon="fa-exclamation-triangle">
        <Row label="Red Warning Threshold" hint="Results cards show red shrinkage text when this % is exceeded">
          <div className="stg-number-wrap">
            <input
              type="number" min={0.5} max={25} step={0.5}
              className="stg-number-input"
              value={settings.warningThreshold}
              onChange={e => updateSetting('warningThreshold', Math.min(25, Math.max(0.5, parseFloat(e.target.value) || 3)))}
            />
            <span className="stg-number-unit">%</span>
          </div>
        </Row>
        <div className="stg-threshold-demo">
          <div className="stg-threshold-demo-label">Preview:</div>
          <span className="stg-threshold-pass">&lt; {settings.warningThreshold}%</span>
          <i className="fas fa-arrow-right" style={{ color: '#999', fontSize: 12 }}></i>
          <span style={{ padding: '3px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>Normal</span>
          <span style={{ width: 20 }}></span>
          <span className="stg-threshold-warn">&gt; {settings.warningThreshold}%</span>
          <i className="fas fa-arrow-right" style={{ color: '#999', fontSize: 12 }}></i>
          <span style={{ padding: '3px 10px', borderRadius: 12, background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 700 }}>Warning</span>
        </div>
      </Section>
    </>
  );
}

// ── TAB 4: Data Management ────────────────────────────────────────────────────
function DataTab({ settings, updateSetting }: {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const { state, deleteFolder, deleteTag, renameFolder, renameTag } = useResults();
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [dangerPhase, setDangerPhase] = useState<'idle' | 'confirm1' | 'confirm2'>('idle');
  const [clearInput, setClearInput] = useState('');

  const handleWipeAll = () => {
    if (clearInput !== 'CLEAR') return;
    // Wipe every known key (including versioned storage keys)
    [
      'shrinkStudioResults',
      'shrinkage_folders', 'shrinkage_tags',
      'shrinkage_settings', 'shrinkage_wash_profiles',
      'clear-all-token',
      // versioned keys introduced in v2 defaults update
      'rollManagerRows_v3', 'advancedTestRows_v3',
      'rollManagerRows_v2', 'advancedTestRows_v2',
      // older unversioned keys (in case device has legacy data)
      'rollManagerRows', 'advancedTestRows',
      // sampling state
      'rollManagerSamplingTotal', 'rollManagerSamplingLots', 'rollManagerSamplingStd',
      'rollManagerGroupedRolls',
      // advanced test state
      'advancedTestDesiredL', 'advancedTestDesiredW',
    ].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <>
      <Section title="Taxonomy Manager" icon="fa-sitemap">
        <p className="stg-desc">Rename or delete the folders and tags used in your Results library.</p>
        <div className="stg-taxonomy-grid">
          <div className="stg-taxonomy-col">
            <div className="stg-taxonomy-header"><i className="fas fa-folder"></i> Folders ({state.folders.length})</div>
            {state.folders.length === 0 && <div className="stg-empty">No folders created yet.</div>}
            {state.folders.map(f => (
              <div key={f.id} className="stg-taxonomy-item">
                {renamingFolder === f.id ? (
                  <div className="stg-rename-row">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                    <input
                      className="stg-input stg-input-sm"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && renameVal.trim()) { renameFolder(f.id, renameVal.trim()); setRenamingFolder(null); }
                        if (e.key === 'Escape') setRenamingFolder(null);
                      }}
                    />
                    <button className="stg-icon-btn" onClick={() => { if (renameVal.trim()) { renameFolder(f.id, renameVal.trim()); setRenamingFolder(null); } }}><i className="fas fa-check"></i></button>
                    <button className="stg-icon-btn" onClick={() => setRenamingFolder(null)}><i className="fas fa-times"></i></button>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                    <span className="stg-taxonomy-name">{f.name}</span>
                    <button className="stg-icon-btn" title="Rename" onClick={() => { setRenameVal(f.name); setRenamingFolder(f.id); setRenamingTag(null); }}><i className="fas fa-edit"></i></button>
                    <button className="stg-icon-btn stg-icon-btn-danger" title="Delete" onClick={() => deleteFolder(f.id)}><i className="fas fa-trash"></i></button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="stg-taxonomy-col">
            <div className="stg-taxonomy-header"><i className="fas fa-tags"></i> Tags ({state.tags.length})</div>
            {state.tags.length === 0 && <div className="stg-empty">No tags created yet.</div>}
            {state.tags.map(t => (
              <div key={t.id} className="stg-taxonomy-item">
                {renamingTag === t.id ? (
                  <div className="stg-rename-row">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <input
                      className="stg-input stg-input-sm"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && renameVal.trim()) { renameTag(t.id, renameVal.trim()); setRenamingTag(null); }
                        if (e.key === 'Escape') setRenamingTag(null);
                      }}
                    />
                    <button className="stg-icon-btn" onClick={() => { if (renameVal.trim()) { renameTag(t.id, renameVal.trim()); setRenamingTag(null); } }}><i className="fas fa-check"></i></button>
                    <button className="stg-icon-btn" onClick={() => setRenamingTag(null)}><i className="fas fa-times"></i></button>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span className="stg-taxonomy-name">#{t.label}</span>
                    <button className="stg-icon-btn" title="Rename" onClick={() => { setRenameVal(t.label); setRenamingTag(t.id); setRenamingFolder(null); }}><i className="fas fa-edit"></i></button>
                    <button className="stg-icon-btn stg-icon-btn-danger" title="Delete" onClick={() => deleteTag(t.id)}><i className="fas fa-trash"></i></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Export Preferences" icon="fa-file-export">
        <Row label="Default Export Format" hint="Format used when exporting from the Results page">
          <Toggle
            checked={settings.exportFormat === 'csv'}
            onChange={v => updateSetting('exportFormat', v ? 'csv' : 'json')}
            labelLeft="JSON"
            labelRight="CSV"
          />
        </Row>
        <div className="stg-callout">
          <i className="fas fa-info-circle"></i>
          <span><strong>JSON</strong> preserves full data for re-import. <strong>CSV</strong> opens in Excel/Sheets with all fields as rows.</span>
        </div>
      </Section>

      <Section title="Danger Zone" icon="fa-skull-crossbones">
        <div className="stg-danger-zone">
          <div className="stg-danger-header">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Irreversible actions — proceed with caution</span>
          </div>
          {dangerPhase === 'idle' && (
            <div className="stg-danger-row">
              <div>
                <div className="stg-danger-title">Clear All App Data</div>
                <div className="stg-danger-desc">Permanently wipes all saved results, folders, tags, wash profiles, and settings. The app will reset to factory defaults.</div>
              </div>
              <button className="stg-btn stg-btn-danger" onClick={() => setDangerPhase('confirm1')}>
                <i className="fas fa-trash-alt"></i> Clear All Data
              </button>
            </div>
          )}
          {dangerPhase === 'confirm1' && (
            <div className="stg-danger-confirm">
              <div className="stg-danger-warn-box">
                <i className="fas fa-exclamation-triangle" style={{ fontSize: 20, color: '#dc2626' }}></i>
                <div>
                  <strong>Are you absolutely sure?</strong>
                  <p>This will permanently delete all {(state.results || []).length} saved result{(state.results || []).length !== 1 ? 's' : ''}, {state.folders.length} folder{state.folders.length !== 1 ? 's' : ''}, {state.tags.length} tag{state.tags.length !== 1 ? 's' : ''}, and all custom wash profiles. <strong>This cannot be undone.</strong></p>
                </div>
              </div>
              <div className="stg-danger-btns">
                <button className="stg-btn stg-btn-danger" onClick={() => setDangerPhase('confirm2')}>Yes, I understand — continue</button>
                <button className="stg-btn stg-btn-outline" onClick={() => setDangerPhase('idle')}>Cancel</button>
              </div>
            </div>
          )}
          {dangerPhase === 'confirm2' && (
            <div className="stg-danger-confirm">
              <div className="stg-danger-warn-box stg-danger-warn-box-red">
                <i className="fas fa-skull-crossbones" style={{ fontSize: 20, color: '#dc2626' }}></i>
                <div>
                  <strong>Final confirmation required</strong>
                  <p>Type <code>CLEAR</code> in the box below to permanently wipe all app data.</p>
                </div>
              </div>
              <div className="stg-danger-input-row">
                <input
                  className="stg-input stg-danger-input"
                  placeholder="Type CLEAR to confirm"
                  value={clearInput}
                  onChange={e => setClearInput(e.target.value)}
                  autoFocus
                />
                <button
                  className={`stg-btn stg-btn-danger${clearInput !== 'CLEAR' ? ' stg-btn-disabled' : ''}`}
                  disabled={clearInput !== 'CLEAR'}
                  onClick={handleWipeAll}
                >
                  <i className="fas fa-fire"></i> Wipe Everything
                </button>
                <button className="stg-btn stg-btn-outline" onClick={() => { setDangerPhase('idle'); setClearInput(''); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

// ── Tab Config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'preferences', label: 'Preferences',   icon: 'fa-sliders-h' },
  { id: 'wash',        label: 'Wash Library',   icon: 'fa-tint'      },
  { id: 'qc',          label: 'QC & Tolerance', icon: 'fa-shield-alt'},
  { id: 'data',        label: 'Data & Danger',  icon: 'fa-database'  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('preferences');

  return (
    <div className="view-section active stg-page">
      <div className="page-header">
        <h1><i className="fas fa-cog" style={{ marginRight: 10 }}></i>Settings</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="stg-btn stg-btn-outline" onClick={() => { showConfirm('Reset all settings to factory defaults?').then(ok => { if (ok) resetSettings(); }); }}>
            <i className="fas fa-undo"></i> Reset Defaults
          </button>
          <button className="stg-btn stg-btn-outline" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>

      <div className="stg-layout">
        {/* Vertical tab nav */}
        <nav className="stg-tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`stg-tab-btn${activeTab === t.id ? ' stg-tab-btn-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i className={`fas ${t.icon}`}></i>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="stg-tab-content">
          {activeTab === 'preferences' && <PreferencesTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'wash'        && <WashLibraryTab />}
          {activeTab === 'qc'          && <QCTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === 'data'        && <DataTab settings={settings} updateSetting={updateSetting} />}
        </div>
      </div>
    </div>
  );
}
