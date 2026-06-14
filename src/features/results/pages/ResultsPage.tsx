import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResults } from '../../../store/ResultsContext';
import { Button } from '../../../components/ui/Button';
import { SavedResult, FabricResult, RollGroup, Shipment, ShipmentGroup, SampleTest, SortOption } from '../../../types';
import { groupColorClasses } from '../../../utils/constants';

export function ResultsPage() {
  const navigate = useNavigate();
  const { state, addResult, deleteResult, deleteAll, importResults, exportResults, isFabricResult, isRollGroup, isShipment, isSampleTest } = useResults();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateDesc');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedShipments, setExpandedShipments] = useState<Set<number>>(new Set());
  const [expandedSamples, setExpandedSamples] = useState<Set<number>>(new Set());

  // Track current view for smart print
  useEffect(() => {
    document.body.dataset.currentView = 'results';
    return () => { document.body.dataset.currentView = 'calculator'; };
  }, []);

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let results = [...state.results];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => {
        if (isFabricResult(r)) {
          return r.name?.toLowerCase().includes(term) || 
                 r.type?.toLowerCase().includes(term) ||
                 r.wash?.toLowerCase().includes(term);
        }
        if (isRollGroup(r) || isShipment(r) || isSampleTest(r)) {
          return r.name?.toLowerCase().includes(term);
        }
        return false;
      });
    }

    // Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case 'dateDesc':
          return b.id - a.id;
        case 'dateAsc':
          return a.id - b.id;
        case 'nameAsc':
          if (isFabricResult(a) && isFabricResult(b)) {
            return (a.name || '').localeCompare(b.name || '');
          }
          return 0;
        case 'shrinkDesc':
          if (isFabricResult(a) && isFabricResult(b)) {
            const aMax = Math.max(a.wShrink || 0, a.lShrink || 0);
            const bMax = Math.max(b.wShrink || 0, b.lShrink || 0);
            return bMax - aMax;
          }
          return 0;
        default:
          return 0;
      }
    });

    return results;
  }, [state.results, searchTerm, sortBy]);

  // Separate by type
  const singles = filteredResults.filter(r => isFabricResult(r)) as FabricResult[];
  const groups = filteredResults.filter(r => isRollGroup(r)) as RollGroup[];
  const shipments = filteredResults.filter(r => isShipment(r)) as Shipment[];
  const samples = filteredResults.filter(r => isSampleTest(r)) as SampleTest[];

  // Group singles by type
  const groupedSingles = useMemo(() => {
    const grouped: Record<string, FabricResult[]> = {};
    singles.forEach(r => {
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push(r);
    });
    return grouped;
  }, [singles]);

  // Export data
  const handleExport = () => {
    const dataStr = exportResults();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shrinkage_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const typedImport = imported.map((r: any) => ({
            ...r,
            recordType: r.recordType || 'single'
          }));
          importResults(typedImport);
        } else {
          alert('Invalid file format: expected an array of results.');
        }
      } catch (err) {
        alert('Error parsing JSON file.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Toggle group expansion
  const toggleGroup = (id: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGroups(newExpanded);
  };

  // Toggle shipment expansion
  const toggleShipment = (id: number) => {
    const newExpanded = new Set(expandedShipments);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedShipments(newExpanded);
  };

  // Toggle sample expansion
  const toggleSample = (id: number) => {
    const newExpanded = new Set(expandedSamples);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSamples(newExpanded);
  };

  // Load group average to calculator
  const loadGroupAverage = (group: RollGroup) => {
    window.dispatchEvent(new CustomEvent('load-average', { detail: { avgL: group.avgL, avgW: group.avgW } }));
  };

  // Duplicate a single result (load into calculator form as new copy)
  const handleDuplicateResult = (res: FabricResult) => {
    window.dispatchEvent(new CustomEvent('duplicate-result', { detail: res }));
  };

  // Duplicate a group directly
  const handleDuplicateGroup = (group: RollGroup) => {
    const newGroup: RollGroup = {
      ...group,
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      name: group.name + ' (copy)'
    };
    addResult(newGroup);
  };

  // Load group from shipment to calculator
  const loadGroupFromShipment = (group: ShipmentGroup) => {
    window.dispatchEvent(new CustomEvent('load-average', { detail: { avgL: group.avgL, avgW: group.avgW } }));
  };

  // Duplicate a group extracted from a shipment
  const duplicateGroupFromShipment = (shipment: Shipment, group: ShipmentGroup) => {
    const newGroup: RollGroup = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      recordType: 'group',
      name: shipment.name + ' - Group ' + group.letter,
      rolls: group.rolls.map(r => ({ ...r })),
      avgL: group.avgL,
      avgW: group.avgW,
      date: new Date().toLocaleDateString()
    };
    addResult(newGroup);
  };

  // Get shrinkage color
  const getShrinkColor = (value: number) => {
    if (value > 0) return 'var(--danger)';
    if (value < 0) return 'var(--success)';
    return 'var(--text-main)';
  };

  // Format shrinkage text
  const formatShrink = (value: number) => {
    if (value === 0) return '0%';
    return value > 0 ? `-${value.toFixed(1)}%` : `+${Math.abs(value).toFixed(1)}%`;
  };

  return (
    <div className="view-section active">
      <div className="page-header">
        <h1>Fabric Shrinkage Results</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={<i className="fas fa-download"></i>} onClick={handleExport}>Export JSON</Button>
          <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
            <i className="fas fa-upload"></i> Import JSON
            <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <Button variant="danger" icon={<i className="fas fa-trash"></i>} onClick={deleteAll}>Delete All</Button>
        </div>
      </div>

      <div className="toolbar-container">
        <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
          <input
            type="text"
            placeholder="Search fabrics or wash types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="input-group" style={{ marginBottom: 0, width: '220px' }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="dateDesc">Sort: Newest First</option>
            <option value="dateAsc">Sort: Oldest First</option>
            <option value="nameAsc">Sort: Name (A-Z)</option>
            <option value="shrinkDesc">Sort: Highest Shrinkage</option>
          </select>
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>No matching shrinkage results found.</p>
      ) : (
        <>
          {/* Singles by category */}
          {Object.entries(groupedSingles).map(([type, results]) => (
            <div key={type} className="results-group">
              <div className="group-title">{type}</div>
              <div className="library-grid">
                {results.map(res => {
                  const wColor = getShrinkColor(res.wShrink);
                  const lColor = getShrinkColor(res.lShrink);
                  
                  return (
                    <div key={res.id} className="result-card">
                      <i className="fas fa-trash delete-icon" onClick={() => deleteResult(res.id)} title="Delete"></i>
                      <div style={{ flex: 1 }}>
                        <div className="swatch-title">{res.name}</div>
                        <div className="swatch-type">
                          <i className="fas fa-tint"></i> {res.wash || 'Standard Wash'}
                          {res.temp && ` | ${res.temp}`}
                          {res.duration && ` | ${res.duration}`}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '5px', marginTop: '10px' }}>
                          <i className="fas fa-ruler-combined"></i> 
                          <strong>BW:</strong> {res.bwL || '-'}L x {res.bwW || '-'}W | <strong>AW:</strong> {res.awL || '-'}L x {res.awW || '-'}W ({res.unit})
                        </div>

                        <div className="shrink-data-row">
                          <span>L: <span style={{ color: lColor }}>{formatShrink(res.lShrink)}</span></span>
                          <span>W: <span style={{ color: wColor }}>{formatShrink(res.wShrink)}</span></span>
                        </div>
                        <div className="date-stamp">Saved on {res.date}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                        <Button
                          variant="outline"
                          style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                          onClick={() => window.dispatchEvent(new CustomEvent('edit-result', { detail: res }))}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </Button>
                        <Button
                          variant="outline"
                          style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                          onClick={() => handleDuplicateResult(res)}
                        >
                          <i className="fas fa-copy"></i> Duplicate
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Groups */}
          {groups.map(group => {
            const avgL = group.avgL || 0;
            const avgW = group.avgW || 0;
            const lColor = getShrinkColor(avgL);
            const wColor = getShrinkColor(avgW);
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="results-group">
                <div className="group-title">Roll Group: {group.name}</div>
                <div className="library-grid">
                  <div className="result-card group-card">
                    <i className="fas fa-trash delete-icon" onClick={() => deleteResult(group.id)} title="Delete Group"></i>
                    <div style={{ flex: 1 }}>
                      <div className="swatch-title">{group.name} ({group.rolls.length} rolls)</div>
                      <div className="swatch-type"><i className="fas fa-calendar"></i> Saved on {group.date}</div>
                      
                      <div className="shrink-data-row" style={{ marginTop: '10px' }}>
                        <span style={{ color: lColor }}>L: {formatShrink(avgL)}</span>
                        <span style={{ color: wColor }}>W: {formatShrink(avgW)}</span>
                      </div>
                      
                      <div className="expand-group" onClick={() => toggleGroup(group.id)}>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i> {isExpanded ? 'Hide' : 'Show'} Rolls
                      </div>
                      {isExpanded && (
                        <table className="group-rolls-table show">
                          <thead>
                            <tr>
                              <th>Roll</th>
                              <th>Before L</th>
                              <th>Before W</th>
                              <th>After L</th>
                              <th>After W</th>
                              <th>Shrink L%</th>
                              <th>Shrink W%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rolls.map((roll, idx) => (
                              <tr key={idx}>
                                <td>{roll.id}</td>
                                <td>{roll.bL?.toFixed(1) || '-'}</td>
                                <td>{roll.bW?.toFixed(1) || '-'}</td>
                                <td>{roll.aL?.toFixed(1) || '-'}</td>
                                <td>{roll.aW?.toFixed(1) || '-'}</td>
                                <td>{roll.sL?.toFixed(1) || '-'}%</td>
                                <td>{roll.sW?.toFixed(1) || '-'}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                      <Button
                        variant="outline"
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                        onClick={() => loadGroupAverage(group)}
                      >
                        <i className="fas fa-edit"></i> Load Avg
                      </Button>
                      <Button
                        variant="outline"
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                        onClick={() => handleDuplicateGroup(group)}
                      >
                        <i className="fas fa-copy"></i> Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Shipments */}
          {shipments.map(shipment => {
            const isExpanded = expandedShipments.has(shipment.id);

            return (
              <div key={shipment.id} className="results-group">
                <div className="group-title">Shipment Lot: {shipment.name}</div>
                <div className="library-grid">
                  <div className="result-card shipment-card">
                    <i className="fas fa-trash delete-icon" onClick={() => deleteResult(shipment.id)} title="Delete Shipment"></i>
                    <div style={{ flex: 1 }}>
                      <div className="swatch-title">{shipment.name} ({shipment.groups.length} groups)</div>
                      <div className="swatch-type"><i className="fas fa-calendar"></i> Saved on {shipment.date}</div>
                      
                      <div className="expand-group" onClick={() => toggleShipment(shipment.id)}>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i> {isExpanded ? 'Hide' : 'Show'} Groups
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: '15px' }}>
                          {shipment.groups.map((group, idx) => (
                            <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', marginBottom: '10px', background: 'var(--secondary)' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Group {group.letter}</div>
                              <div className="shrink-data-row" style={{ marginBottom: '10px' }}>
                                <span style={{ color: getShrinkColor(group.avgL) }}>L: {formatShrink(group.avgL)}</span>
                                <span style={{ color: getShrinkColor(group.avgW) }}>W: {formatShrink(group.avgW)}</span>
                              </div>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr><th>Roll</th><th>Before L</th><th>Before W</th><th>After L</th><th>After W</th><th>Shrink L%</th><th>Shrink W%</th></tr>
                                </thead>
                                <tbody>
                                  {group.rolls.map((roll, rIdx) => (
                                    <tr key={rIdx}>
                                      <td>{roll.id}</td>
                                      <td>{roll.bL?.toFixed(1) ?? '-'}</td>
                                      <td>{roll.bW?.toFixed(1) ?? '-'}</td>
                                      <td>{roll.aL?.toFixed(1) ?? '-'}</td>
                                      <td>{roll.aW?.toFixed(1) ?? '-'}</td>
                                      <td>{roll.sL ? roll.sL.toFixed(1) + '%' : '-'}</td>
                                      <td>{roll.sW ? roll.sW.toFixed(1) + '%' : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                <Button variant="outline" style={{ flex: 1, padding: '4px', fontSize: '11px' }} onClick={() => loadGroupFromShipment(group)}>
                                  Load Group Avg
                                </Button>
                                <Button variant="outline" style={{ flex: 1, padding: '4px', fontSize: '11px' }} onClick={() => duplicateGroupFromShipment(shipment, group)}>
                                  Duplicate Group
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Sample Tests */}
          {samples.map(sample => {
            const isExpanded = expandedSamples.has(sample.id);
            const sampleList = sample.samples || [];

            return (
              <div key={sample.id} className="results-group">
                <div className="group-title">Sample Test: {sample.name}</div>
                <div className="library-grid">
                  <div className="result-card sample-card">
                    <i className="fas fa-trash delete-icon" onClick={() => deleteResult(sample.id)} title="Delete Sample"></i>
                    <div style={{ flex: 1 }}>
                      <div className="swatch-title">{sample.name} ({sampleList.length} samples)</div>
                      <div className="swatch-type"><i className="fas fa-calendar"></i> Saved on {sample.date}</div>
                      
                      <div className="shrink-data-row" style={{ marginTop: '10px' }}>
                        <span style={{ color: getShrinkColor(sample.avgL) }}>Avg L: {formatShrink(sample.avgL)}</span>
                        <span style={{ color: getShrinkColor(sample.avgW) }}>Avg W: {formatShrink(sample.avgW)}</span>
                      </div>
                      <div className="shrink-data-row" style={{ marginTop: '5px' }}>
                        <span>Cut L: {sample.cutL?.toFixed(2) || '-'}"</span>
                        <span>Cut W: {sample.cutW?.toFixed(2) || '-'}"</span>
                      </div>
                      <div className="shrink-data-row" style={{ marginTop: '5px', opacity: 0.7, fontSize: '11px' }}>
                        <span>Desired L: {sample.desiredL?.toFixed(2) || '-'}"</span>
                        <span>Desired W: {sample.desiredW?.toFixed(2) || '-'}"</span>
                      </div>
                      
                      <div className="expand-group" onClick={() => toggleSample(sample.id)}>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i> {isExpanded ? 'Hide' : 'Show'} Samples
                      </div>
                      {isExpanded && (
                        <table className="group-rolls-table show">
                          <thead>
                            <tr>
                              <th>Sample</th>
                              <th>Before L</th>
                              <th>Before W</th>
                              <th>After L</th>
                              <th>After W</th>
                              <th>Shrink L%</th>
                              <th>Shrink W%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sampleList.map((s, idx) => {
                              const shrinkL = typeof s.sL === 'number' ? s.sL : parseFloat(s.sL) || 0;
                              const shrinkW = typeof s.sW === 'number' ? s.sW : parseFloat(s.sW) || 0;
                              return (
                                <tr key={idx}>
                                  <td>{idx + 1}</td>
                                  <td>{s.bL?.toFixed(1) || '-'}</td>
                                  <td>{s.bW?.toFixed(1) || '-'}</td>
                                  <td>{s.aL?.toFixed(1) || '-'}</td>
                                  <td>{s.aW?.toFixed(1) || '-'}</td>
                                  <td style={{ color: getShrinkColor(shrinkL) }}>{s.sL !== '-' ? s.sL + '%' : '-'}</td>
                                  <td style={{ color: getShrinkColor(shrinkW) }}>{s.sW !== '-' ? s.sW + '%' : '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
