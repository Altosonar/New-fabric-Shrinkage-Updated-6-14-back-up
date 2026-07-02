import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useResults } from '../../../store/ResultsContext';
import { useSettings } from '../../../hooks/useSettings';
import { exportToCSV } from '../../../utils/exportUtils';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  SavedResult, FabricResult, RollGroup, Shipment, SampleTest,
  SortOption, Folder, Tag
} from '../../../types';
import {
  printPatternMaker,
  printFactoryCutSheet,
  printSummaryLedger
} from '../../../utils/printReport';

// ── Helpers ──────────────────────────────────────────────────────────────────
const getShrinkColor = (v: number) => v > 0 ? 'var(--danger)' : v < 0 ? 'var(--success)' : 'var(--text-main)';
const fmt = (v: number) => v === 0 ? '0.0%' : v > 0 ? `-${v.toFixed(1)}%` : `+${Math.abs(v).toFixed(1)}%`;

const TAG_PALETTE = ['#e53935','#8e24aa','#1e88e5','#00897b','#f4511e','#fb8c00','#43a047','#5e35b1'];
const FOLDER_PALETTE = ['#1976d2','#388e3c','#f57c00','#7b1fa2','#c62828','#0277bd'];

// ── Type Badge ───────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  single:   { label: 'Basic Test',    icon: 'fa-ruler-combined', cls: 'badge-basic'    },
  sample:   { label: 'Avg Test',      icon: 'fa-flask',          cls: 'badge-sample'   },
  group:    { label: 'Roll QC',       icon: 'fa-layer-group',    cls: 'badge-rollqc'   },
  shipment: { label: 'Shipment Lot',  icon: 'fa-ship',           cls: 'badge-shipment' },
};

function TestTypeBadge({ type }: { type: string }) {
  const cfg = BADGE_CONFIG[type] || BADGE_CONFIG['single'];
  return (
    <span className={`res-badge ${cfg.cls}`}>
      <i className={`fas ${cfg.icon}`}></i> {cfg.label}
    </span>
  );
}

// ── Variation Status Pill ────────────────────────────────────────────────────
function VariationPill({ rangeL, rangeW, groups }: { rangeL?: number; rangeW?: number; groups?: number }) {
  const max = Math.max(rangeL || 0, rangeW || 0);
  if (max === 0) return null;
  if (max < 1.5) return <span className="res-status-pill res-status-pass"><i className="fas fa-check-circle"></i> Pass</span>;
  if (max < 3.0) return <span className="res-status-pill res-status-moderate"><i className="fas fa-exclamation-circle"></i> Moderate Variation</span>;
  return (
    <span className="res-status-pill res-status-high">
      <i className="fas fa-exclamation-triangle"></i> High Variation{groups ? ` — ${groups} Groups` : ''}
    </span>
  );
}

// ── Inline Detail Panel ───────────────────────────────────────────────────────
function InlineDetail({ result }: { result: SavedResult }) {
  const { recordType } = result;

  const handlePrint = () => {
    if (recordType === 'group' || recordType === 'shipment') printFactoryCutSheet([result.id]);
    else printPatternMaker([result.id]);
  };

  return (
    <div className="res-inline-detail">
      {recordType === 'group' && (() => {
        const r = result as RollGroup;
        return (
          <>
            <div className="res-report-meta">
              <span>{r.rolls.length} rolls</span>
              <span>Avg L: <b style={{ color: getShrinkColor(r.avgL) }}>{fmt(r.avgL)}</b></span>
              <span>Avg W: <b style={{ color: getShrinkColor(r.avgW) }}>{fmt(r.avgW)}</b></span>
            </div>
            <div className="res-detail-table-wrap">
              <table className="advanced-test-table res-detail-table">
                <thead><tr><th>Roll ID</th><th>BL</th><th>BW</th><th>AL</th><th>AW</th><th>Shrink L%</th><th>Shrink W%</th></tr></thead>
                <tbody>
                  {r.rolls.map((ro, i) => (
                    <tr key={i}>
                      <td><b>{ro.id}</b></td>
                      <td>{ro.bL?.toFixed(1) ?? '-'}</td><td>{ro.bW?.toFixed(1) ?? '-'}</td>
                      <td>{ro.aL?.toFixed(1) ?? '-'}</td><td>{ro.aW?.toFixed(1) ?? '-'}</td>
                      <td style={{ color: getShrinkColor(ro.sL as number) }}>{ro.sL != null ? ro.sL.toFixed(1) + '%' : '-'}</td>
                      <td style={{ color: getShrinkColor(ro.sW as number) }}>{ro.sW != null ? ro.sW.toFixed(1) + '%' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {recordType === 'shipment' && (() => {
        const r = result as Shipment;
        return (
          <>
            <div className="res-report-meta">
              <span>{r.groups.length} groups</span>
            </div>
            {r.groups.map((g, gi) => (
              <div key={gi} className="res-ship-group">
                <div className="res-ship-group-header">
                  <b>Group {g.letter}</b>
                  <span>Avg L: <span style={{ color: getShrinkColor(g.avgL) }}>{fmt(g.avgL)}</span></span>
                  <span>Avg W: <span style={{ color: getShrinkColor(g.avgW) }}>{fmt(g.avgW)}</span></span>
                  <span className="res-ship-rolls">Rolls: {g.rolls.map(ro => ro.id).join(', ')}</span>
                </div>
                <div className="res-detail-table-wrap">
                  <table className="advanced-test-table res-detail-table">
                    <thead><tr><th>Roll</th><th>BL</th><th>BW</th><th>AL</th><th>AW</th><th>L%</th><th>W%</th></tr></thead>
                    <tbody>
                      {g.rolls.map((ro, ri) => (
                        <tr key={ri}>
                          <td><b>{ro.id}</b></td>
                          <td>{ro.bL?.toFixed(1) ?? '-'}</td><td>{ro.bW?.toFixed(1) ?? '-'}</td>
                          <td>{ro.aL?.toFixed(1) ?? '-'}</td><td>{ro.aW?.toFixed(1) ?? '-'}</td>
                          <td>{ro.sL != null ? ro.sL.toFixed(1) + '%' : '-'}</td>
                          <td>{ro.sW != null ? ro.sW.toFixed(1) + '%' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        );
      })()}

      {recordType === 'sample' && (() => {
        const r = result as SampleTest;
        return (
          <>
            <div className="res-report-meta">
              <span>{r.samples?.length || 0} samples</span>
              <span>Avg L: <b style={{ color: getShrinkColor(r.avgL) }}>{fmt(r.avgL)}</b></span>
              <span>Avg W: <b style={{ color: getShrinkColor(r.avgW) }}>{fmt(r.avgW)}</b></span>
            </div>
            {(r.cutL || r.cutW) && (
              <div className="res-cut-dims" style={{ marginBottom: 8 }}>
                <i className="fas fa-cut"></i> Pre-wash Cut: <b>{r.cutL?.toFixed(2) ?? '-'}"</b> L × <b>{r.cutW?.toFixed(2) ?? '-'}"</b> W
                {(r.desiredL || r.desiredW) && (
                  <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 8 }}>(Desired: {r.desiredL?.toFixed(2) ?? '-'}" × {r.desiredW?.toFixed(2) ?? '-'}")</span>
                )}
              </div>
            )}
            <div className="res-detail-table-wrap">
              <table className="advanced-test-table res-detail-table">
                <thead><tr><th>#</th><th>BL</th><th>BW</th><th>AL</th><th>AW</th><th>Shrink L</th><th>Shrink W</th></tr></thead>
                <tbody>
                  {(r.samples || []).map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.bL?.toFixed(1)}</td><td>{s.bW?.toFixed(1)}</td>
                      <td>{s.aL?.toFixed(1)}</td><td>{s.aW?.toFixed(1)}</td>
                      <td>{s.sL}</td><td>{s.sW}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {recordType === 'single' && (() => {
        const r = result as FabricResult;
        return (
          <div className="res-single-detail">
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-light)', fontSize: 11, display: 'block', marginBottom: 2 }}>BEFORE WASH</span><b>{r.bwL ?? '-'} × {r.bwW ?? '-'} {r.unit}</b></div>
              <div><span style={{ color: 'var(--text-light)', fontSize: 11, display: 'block', marginBottom: 2 }}>AFTER WASH</span><b>{r.awL ?? '-'} × {r.awW ?? '-'} {r.unit}</b></div>
              {r.type && <div><span style={{ color: 'var(--text-light)', fontSize: 11, display: 'block', marginBottom: 2 }}>FABRIC TYPE</span><b>{r.type}</b></div>}
            </div>
          </div>
        );
      })()}

      <button className="res-print-inline-btn" onClick={handlePrint}>
        <i className="fas fa-print"></i> Print Report
      </button>
    </div>
  );
}

// ── Folder Manager Modal ──────────────────────────────────────────────────────
function FolderManagerModal({ open, onClose, folders, addFolder, deleteFolder }: {
  open: boolean; onClose: () => void;
  folders: Folder[]; addFolder: (f: Folder) => void; deleteFolder: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_PALETTE[0]);
  const handleAdd = () => {
    if (!name.trim()) return;
    addFolder({ id: Date.now().toString(), name: name.trim(), color });
    setName('');
  };
  return (
    <Modal isOpen={open} onClose={onClose} title="Manage Folders">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name…"
          style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 14 }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <div style={{ display: 'flex', gap: 4 }}>
          {FOLDER_PALETTE.map(c => (
            <div key={c} onClick={() => setColor(c)}
              style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #000' : '2px solid transparent' }} />
          ))}
        </div>
        <Button variant="primary" onClick={handleAdd}><i className="fas fa-plus"></i> Add</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {folders.length === 0 && <p style={{ color: 'var(--text-light)', textAlign: 'center' }}>No folders yet.</p>}
        {folders.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--secondary)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: f.color }} />
            <span style={{ flex: 1 }}>{f.name}</span>
            <button onClick={() => deleteFolder(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><i className="fas fa-trash"></i></button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Tag Manager Modal ─────────────────────────────────────────────────────────
function TagManagerModal({ open, onClose, tags, addTag, deleteTag }: {
  open: boolean; onClose: () => void;
  tags: Tag[]; addTag: (t: Tag) => void; deleteTag: (id: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(TAG_PALETTE[0]);
  const handleAdd = () => {
    if (!label.trim()) return;
    addTag({ id: Date.now().toString(), label: label.trim().replace(/^#/, ''), color });
    setLabel('');
  };
  return (
    <Modal isOpen={open} onClose={onClose} title="Manage Tags">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Tag label…"
          style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 14 }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <div style={{ display: 'flex', gap: 4 }}>
          {TAG_PALETTE.map(c => (
            <div key={c} onClick={() => setColor(c)}
              style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #000' : '2px solid transparent' }} />
          ))}
        </div>
        <Button variant="primary" onClick={handleAdd}><i className="fas fa-plus"></i></Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.length === 0 && <p style={{ color: 'var(--text-light)' }}>No tags yet.</p>}
        {tags.map(t => (
          <span key={t.id} className="res-tag-chip" style={{ background: t.color + '22', color: t.color, border: `1px solid ${t.color}55` }}>
            #{t.label}
            <button onClick={() => deleteTag(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.color, marginLeft: 4, padding: 0, fontSize: 11 }}>✕</button>
          </span>
        ))}
      </div>
    </Modal>
  );
}

// ── Result Card ───────────────────────────────────────────────────────────────
function ResultCard({
  result, selected, onToggleSelect, onDelete, onEdit, onDuplicate,
  onLoadAvg, onAssignTag, onRemoveTag, onAssignFolder, allTags, allFolders
}: {
  result: SavedResult; selected: boolean;
  onToggleSelect: () => void; onDelete: () => void;
  onEdit?: () => void; onDuplicate?: () => void; onLoadAvg?: () => void;
  onAssignTag: (tagId: string) => void; onRemoveTag: (tagId: string) => void;
  onAssignFolder: (folderId: string | undefined) => void;
  allTags: Tag[]; allFolders: Folder[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) setShowTagMenu(false);
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) setShowFolderMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { recordType } = result;
  const isGroup = recordType === 'group';
  const isShip = recordType === 'shipment';
  const isSingle = recordType === 'single';
  const isSample = recordType === 'sample';

  let name = ''; let dateStr = ''; let washLine = '';
  let shrinkL = 0, shrinkW = 0, rangeL = 0, rangeW = 0, groupCount = 0;
  let cutL: number | null = null, cutW: number | null = null;

  if (isSingle) {
    const r = result as FabricResult;
    name = r.name; dateStr = r.date; washLine = [r.wash, r.temp, r.duration].filter(Boolean).join(' · ');
    shrinkL = r.lShrink; shrinkW = r.wShrink;
  } else if (isSample) {
    const r = result as SampleTest;
    name = r.name; dateStr = r.date; shrinkL = r.avgL; shrinkW = r.avgW;
    cutL = r.cutL; cutW = r.cutW;
  } else if (isGroup) {
    const r = result as RollGroup;
    name = r.name; dateStr = r.date; shrinkL = r.avgL; shrinkW = r.avgW;
    const vL = r.rolls.map(ro => ro.sL as number).filter(v => v != null);
    const vW = r.rolls.map(ro => ro.sW as number).filter(v => v != null);
    rangeL = vL.length > 1 ? Math.max(...vL) - Math.min(...vL) : 0;
    rangeW = vW.length > 1 ? Math.max(...vW) - Math.min(...vW) : 0;
  } else if (isShip) {
    const r = result as Shipment;
    name = r.name; dateStr = r.date; groupCount = r.groups.length;
    const aL = r.groups.map(g => g.avgL); const aW = r.groups.map(g => g.avgW);
    shrinkL = aL.length ? aL.reduce((a, b) => a + b, 0) / aL.length : 0;
    shrinkW = aW.length ? aW.reduce((a, b) => a + b, 0) / aW.length : 0;
    rangeL = aL.length > 1 ? Math.max(...aL) - Math.min(...aL) : 0;
    rangeW = aW.length > 1 ? Math.max(...aW) - Math.min(...aW) : 0;
  }

  const folder = allFolders.find(f => f.id === result.folderId);
  const appliedTags = allTags.filter(t => (result.tags || []).includes(t.id));

  return (
    <div className={`res-card${selected ? ' res-card-selected' : ''}${expanded ? ' res-card-expanded' : ''}`}>
      <div className="res-card-check" onClick={onToggleSelect}>
        <i className={`fas ${selected ? 'fa-check-square' : 'fa-square'}`} style={{ color: selected ? 'var(--primary)' : '#ccc', fontSize: 16 }}></i>
      </div>
      <div className="res-card-top">
        <TestTypeBadge type={recordType} />
        {folder && (
          <span className="res-folder-pill" style={{ background: folder.color + '22', color: folder.color, border: `1px solid ${folder.color}55` }}>
            <i className="fas fa-folder"></i> {folder.name}
          </span>
        )}
        <i className="fas fa-trash res-card-delete" onClick={onDelete} title="Delete"></i>
      </div>
      <div className="res-card-name">{name}</div>
      <div className="res-card-meta">
        {washLine && <span><i className="fas fa-tint"></i> {washLine}</span>}
        <span><i className="fas fa-calendar-alt"></i> {dateStr}</span>
      </div>
      <div className="res-shrink-row">
        <div className="res-shrink-item">
          <span className="res-shrink-label">Length</span>
          <span className="res-shrink-val" style={{ color: getShrinkColor(shrinkL) }}>{fmt(shrinkL)}</span>
        </div>
        <div className="res-shrink-divider" />
        <div className="res-shrink-item">
          <span className="res-shrink-label">Width</span>
          <span className="res-shrink-val" style={{ color: getShrinkColor(shrinkW) }}>{fmt(shrinkW)}</span>
        </div>
      </div>
      {(isSingle || isSample) && cutL != null && (
        <div className="res-cut-dims"><i className="fas fa-cut"></i> Cut: <b>{cutL.toFixed(2)}"</b> × <b>{cutW?.toFixed(2) ?? '-'}"</b></div>
      )}
      {(isGroup || isShip) && (
        <div style={{ marginTop: 8 }}>
          <VariationPill rangeL={rangeL} rangeW={rangeW} groups={groupCount || undefined} />
        </div>
      )}
      {appliedTags.length > 0 && (
        <div className="res-tag-row">
          {appliedTags.map(t => (
            <span key={t.id} className="res-tag-chip" style={{ background: t.color + '22', color: t.color, border: `1px solid ${t.color}55` }}>
              #{t.label}
              <button onClick={() => onRemoveTag(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.color, marginLeft: 3, padding: 0, fontSize: 10 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="res-card-actions">
        <div style={{ position: 'relative' }} ref={tagMenuRef}>
          <button className="res-action-btn" onClick={() => { setShowTagMenu(v => !v); setShowFolderMenu(false); }} title="Tag">
            <i className="fas fa-tag"></i>
          </button>
          {showTagMenu && (
            <div className="res-dropdown">
              {allTags.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-light)' }}>No tags — click Tags to create</div>}
              {allTags.map(t => {
                const assigned = (result.tags || []).includes(t.id);
                return (
                  <div key={t.id} className="res-dropdown-item" onClick={() => assigned ? onRemoveTag(t.id) : onAssignTag(t.id)}>
                    <span className="res-tag-chip" style={{ background: t.color + '22', color: t.color, border: `1px solid ${t.color}55`, pointerEvents: 'none' }}>#{t.label}</span>
                    {assigned && <i className="fas fa-check" style={{ color: 'var(--success)', marginLeft: 'auto' }}></i>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }} ref={folderMenuRef}>
          <button className="res-action-btn" onClick={() => { setShowFolderMenu(v => !v); setShowTagMenu(false); }} title="Folder">
            <i className="fas fa-folder"></i>
          </button>
          {showFolderMenu && (
            <div className="res-dropdown">
              <div className="res-dropdown-item" onClick={() => { onAssignFolder(undefined); setShowFolderMenu(false); }}>
                <i className="fas fa-times" style={{ marginRight: 8 }}></i> No Folder
              </div>
              {allFolders.map(f => (
                <div key={f.id} className="res-dropdown-item" onClick={() => { onAssignFolder(f.id); setShowFolderMenu(false); }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, marginRight: 8 }} />
                  {f.name}
                  {result.folderId === f.id && <i className="fas fa-check" style={{ color: 'var(--success)', marginLeft: 'auto' }}></i>}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className={`res-action-btn${expanded ? ' res-action-btn-active' : ''}`} onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse details' : 'View full details'}>
          <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          <span style={{ fontSize: 11 }}>{expanded ? 'Less' : 'Details'}</span>
        </button>
        {onEdit && <button className="res-action-btn" onClick={onEdit} title="Edit"><i className="fas fa-edit"></i></button>}
        {onLoadAvg && <button className="res-action-btn" onClick={onLoadAvg} title="Load avg"><i className="fas fa-calculator"></i></button>}
        {onDuplicate && <button className="res-action-btn" onClick={onDuplicate} title="Duplicate"><i className="fas fa-copy"></i></button>}
      </div>

      {expanded && <InlineDetail result={result} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function ResultsPage() {
  const {
    state, addResult, deleteResult, deleteAll, importResults, exportResults,
    isFabricResult, isRollGroup, isShipment, isSampleTest,
    addFolder, deleteFolder, addTag, deleteTag,
    assignResultTag, removeResultTag, assignResultFolder,
    toggleSelect, selectAll, clearSelection, bulkDelete, bulkExport
  } = useResults();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateDesc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<string>('all');
  const [showFolderMgr, setShowFolderMgr] = useState(false);
  const [showTagMgr, setShowTagMgr] = useState(false);

  useEffect(() => {
    document.body.dataset.currentView = 'results';
    return () => { document.body.dataset.currentView = 'calculator'; };
  }, []);

  const inDateRange = (result: SavedResult) => {
    if (filterDateRange === 'all') return true;
    const parts = ((result as any).date || '').split('/');
    if (parts.length < 3) return true;
    const saved = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const diffDays = (Date.now() - saved.getTime()) / 86400000;
    return filterDateRange === 'week' ? diffDays <= 7 : diffDays <= 30;
  };

  const filteredResults = useMemo(() => {
    let results = [...state.results];
    const term = searchTerm.toLowerCase();
    if (term) results = results.filter(r => {
      const n = ((r as any).name || '').toLowerCase();
      const w = ((r as any).wash || '').toLowerCase();
      const t = ((r as any).type || '').toLowerCase();
      return n.includes(term) || w.includes(term) || t.includes(term);
    });
    if (filterType !== 'all') results = results.filter(r => r.recordType === filterType);
    if (activeSection !== 'all') results = results.filter(r => r.folderId === activeSection);
    if (filterSeverity !== 'all') {
      const thresh = parseFloat(filterSeverity);
      results = results.filter(r => {
        if (isFabricResult(r)) return Math.max(Math.abs(r.lShrink), Math.abs(r.wShrink)) >= thresh;
        if (isSampleTest(r)) return Math.max(Math.abs(r.avgL), Math.abs(r.avgW)) >= thresh;
        if (isRollGroup(r)) return Math.max(Math.abs(r.avgL), Math.abs(r.avgW)) >= thresh;
        if (isShipment(r)) return r.groups.some(g => Math.max(Math.abs(g.avgL), Math.abs(g.avgW)) >= thresh);
        return true;
      });
    }
    results = results.filter(inDateRange);
    results.sort((a, b) => {
      switch (sortBy) {
        case 'dateDesc': return b.id - a.id;
        case 'dateAsc': return a.id - b.id;
        case 'nameAsc': return ((a as any).name || '').localeCompare((b as any).name || '');
        case 'shrinkDesc': {
          const m = (r: SavedResult) => {
            if (isFabricResult(r)) return Math.max(Math.abs(r.lShrink), Math.abs(r.wShrink));
            if (isSampleTest(r)) return Math.max(Math.abs(r.avgL), Math.abs(r.avgW));
            if (isRollGroup(r)) return Math.max(Math.abs(r.avgL), Math.abs(r.avgW));
            return 0;
          };
          return m(b) - m(a);
        }
        default: return 0;
      }
    });
    return results;
  }, [state.results, searchTerm, sortBy, filterType, filterSeverity, filterDateRange, activeSection]);

  const { settings } = useSettings();

  const handleExport = () => {
    if (settings.exportFormat === 'csv') {
      const csv = exportToCSV(state.results);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `shrinkage_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([exportResults()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `shrinkage_${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    }
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imp = JSON.parse(ev.target?.result as string);
        if (Array.isArray(imp)) importResults(imp.map((r: any) => ({ ...r, recordType: r.recordType || 'single' })));
        else alert('Invalid format.');
      } catch { alert('Error parsing JSON.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const allIds = filteredResults.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => state.selectedIds.has(id));

  return (
    <div className="view-section active">
      <div className="page-header">
        <h1>Fabric Shrinkage Database</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outline" icon={<i className="fas fa-folder"></i>} onClick={() => setShowFolderMgr(true)}>Folders</Button>
          <Button variant="outline" icon={<i className="fas fa-tags"></i>} onClick={() => setShowTagMgr(true)}>Tags</Button>
          <Button variant="outline" icon={<i className="fas fa-download"></i>} onClick={handleExport}>Export</Button>
          <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontWeight: 600, fontSize: 13 }}>
            <i className="fas fa-upload"></i> Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <Button variant="danger" icon={<i className="fas fa-trash"></i>} onClick={deleteAll}>Delete All</Button>
        </div>
      </div>

      <div className="res-layout">
        <aside className="res-sidebar">
          <div className="res-sidebar-title"><i className="fas fa-folder-open"></i> Folders</div>
          <div className={`res-sidebar-item${activeSection === 'all' ? ' active' : ''}`} onClick={() => setActiveSection('all')}>
            <i className="fas fa-th-large"></i> All Results
            <span className="res-sidebar-count">{state.results.length}</span>
          </div>
          {state.folders.map(f => {
            const count = state.results.filter(r => r.folderId === f.id).length;
            return (
              <div key={f.id} className={`res-sidebar-item${activeSection === f.id ? ' active' : ''}`} onClick={() => setActiveSection(f.id)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span className="res-sidebar-count">{count}</span>
              </div>
            );
          })}
        </aside>

        <div className="res-main">
          <div className="res-filter-bar">
            <div className="res-search-wrap">
              <i className="fas fa-search res-search-icon"></i>
              <input className="res-search-input" type="text" placeholder="Search fabrics, wash types…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {searchTerm && <button className="res-search-clear" onClick={() => setSearchTerm('')}><i className="fas fa-times"></i></button>}
            </div>
            <select className="res-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="single">Basic Test</option>
              <option value="sample">Avg Test</option>
              <option value="group">Roll QC</option>
              <option value="shipment">Shipment Lot</option>
            </select>
            <select className="res-filter-select" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="all">Any Shrinkage</option>
              <option value="2">&gt; 2%</option>
              <option value="5">&gt; 5%</option>
              <option value="10">&gt; 10%</option>
            </select>
            <select className="res-filter-select" value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <select className="res-filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              <option value="dateDesc">Newest First</option>
              <option value="dateAsc">Oldest First</option>
              <option value="nameAsc">Name A–Z</option>
              <option value="shrinkDesc">Highest Shrinkage</option>
            </select>
          </div>

          {filteredResults.length > 0 && (
            <div className="res-select-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13 }}>
                <input type="checkbox" checked={allSelected} onChange={() => allSelected ? clearSelection() : selectAll(allIds)} />
                {allSelected ? 'Deselect All' : `Select All (${filteredResults.length})`}
              </label>
              {state.selectedIds.size > 0 && (
                <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{state.selectedIds.size} selected</span>
              )}
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="res-empty">
              <i className="fas fa-database" style={{ fontSize: 48, color: 'var(--border-color)', display: 'block', marginBottom: 16 }}></i>
              <p>No results match your current filters.</p>
            </div>
          ) : (
            <div className="library-grid res-grid">
              {filteredResults.map(result => (
                <ResultCard
                  key={result.id}
                  result={result}
                  selected={state.selectedIds.has(result.id)}
                  onToggleSelect={() => toggleSelect(result.id)}
                  onDelete={() => deleteResult(result.id)}
                  onEdit={isFabricResult(result) ? () => window.dispatchEvent(new CustomEvent('edit-result', { detail: result })) : undefined}
                  onDuplicate={
                    isFabricResult(result)
                      ? () => window.dispatchEvent(new CustomEvent('duplicate-result', { detail: result }))
                      : isRollGroup(result)
                        ? () => addResult({ ...(result as RollGroup), id: Date.now(), date: new Date().toLocaleDateString(), name: (result as RollGroup).name + ' (copy)' })
                        : undefined
                  }
                  onLoadAvg={
                    isRollGroup(result)
                      ? () => window.dispatchEvent(new CustomEvent('load-average', { detail: { avgL: (result as RollGroup).avgL, avgW: (result as RollGroup).avgW } }))
                      : isSampleTest(result)
                        ? () => window.dispatchEvent(new CustomEvent('load-average', { detail: { avgL: (result as SampleTest).avgL, avgW: (result as SampleTest).avgW } }))
                        : undefined
                  }
                  onAssignTag={tagId => assignResultTag(result.id, tagId)}
                  onRemoveTag={tagId => removeResultTag(result.id, tagId)}
                  onAssignFolder={folderId => assignResultFolder(result.id, folderId)}
                  allTags={state.tags}
                  allFolders={state.folders}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {state.selectedIds.size > 0 && (
        <div className="res-batch-bar">
          <span className="res-batch-count"><i className="fas fa-check-circle"></i> {state.selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="res-batch-btn res-batch-danger" onClick={bulkDelete}><i className="fas fa-trash"></i> Delete</button>
            <button className="res-batch-btn" onClick={() => {
              const ids = Array.from(state.selectedIds);
              const blob = new Blob([bulkExport(ids)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `selected_${ids.length}.json`; a.click();
              URL.revokeObjectURL(url);
            }}><i className="fas fa-download"></i> Export JSON</button>
            <button className="res-batch-btn" onClick={() => printSummaryLedger(Array.from(state.selectedIds))}><i className="fas fa-print"></i> Print Summary</button>
            <button className="res-batch-btn res-batch-clear" onClick={clearSelection}><i className="fas fa-times"></i> Clear</button>
          </div>
        </div>
      )}

      <FolderManagerModal open={showFolderMgr} onClose={() => setShowFolderMgr(false)}
        folders={state.folders} addFolder={addFolder} deleteFolder={deleteFolder} />
      <TagManagerModal open={showTagMgr} onClose={() => setShowTagMgr(false)}
        tags={state.tags} addTag={addTag} deleteTag={deleteTag} />
    </div>
  );
}
