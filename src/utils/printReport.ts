import { STORAGE_KEY } from './constants';

/**
 * Smart Print: context-aware printing.
 * - Calculator view  → prints the calculator UI (CSS hides header/tabs)
 * - Results view     → builds a formatted table report and prints it
 *
 * Forces identical desktop-style layout on all devices by temporarily
 * removing mobile visibility classes before window.print().
 */
export function triggerSmartPrint(): void {
  const currentView = document.body.dataset.currentView || 'calculator';

  if (currentView === 'results') {
    document.body.classList.add('print-report-mode');
    buildPrintReport();
  } else {
    document.body.classList.remove('print-report-mode');
  }
  window.print();
}

// Clean up print-report-mode class after the print dialog closes (all modes)
if (typeof window !== 'undefined') {
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-report-mode');
  });
}

function buildPrintReport(): void {
  const printContainer = document.getElementById('print-report-container');
  if (!printContainer) return;

  let savedResults: any[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      savedResults = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading results for print:', e);
  }

  if (savedResults.length === 0) {
    printContainer.innerHTML = '<h2 style="text-align:center;">No Data to Print</h2>';
    return;
  }

  let html = `
    <div class="print-header">
      <h1>Fabric Shrinkage Database</h1>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
    <table class="print-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Fabric Name</th>
          <th>Process Details</th>
          <th>Before Wash (LxW)</th>
          <th>After Wash (LxW)</th>
          <th>Length Shrink %</th>
          <th>Width Shrink %</th>
        </tr>
      </thead>
      <tbody>
  `;

  const sortedForPrint = [...savedResults].sort((a: any, b: any) =>
    (a.type || '').localeCompare(b.type || '')
  );

  sortedForPrint.forEach((res: any) => {
    if (res.recordType === 'group') {
      html += `<tr><td colspan="7"><strong>Group: ${res.name}</strong> (${res.rolls?.length || 0} rolls) Avg L: ${res.avgL?.toFixed(1) || '0.0'}% Avg W: ${res.avgW?.toFixed(1) || '0.0'}%</td></tr>`;
    } else if (res.recordType === 'shipment') {
      html += `<tr><td colspan="7"><strong>Shipment: ${res.name}</strong> (${res.groups?.length || 0} groups)</td></tr>`;
    } else {
      const lColorClass = res.lShrink > 0 ? 'print-danger' : (res.lShrink < 0 ? 'print-success' : '');
      const wColorClass = res.wShrink > 0 ? 'print-danger' : (res.wShrink < 0 ? 'print-success' : '');

      const lText = res.lShrink > 0 ? `-${res.lShrink.toFixed(1)}%` : (res.lShrink < 0 ? `+${Math.abs(res.lShrink).toFixed(1)}%` : '0%');
      const wText = res.wShrink > 0 ? `-${res.wShrink.toFixed(1)}%` : (res.wShrink < 0 ? `+${Math.abs(res.wShrink).toFixed(1)}%` : '0%');

      const bwStr = (res.bwL ?? '-') + ' x ' + (res.bwW ?? '-');
      const awStr = (res.awL ?? '-') + ' x ' + (res.awW ?? '-');

      let processInfo = res.wash || 'N/A';
      if (res.temp) processInfo += ` | ${res.temp}`;
      if (res.duration) processInfo += ` | ${res.duration}`;

      html += `
        <tr>
          <td>${res.type || ''}</td>
          <td><strong>${res.name || ''}</strong></td>
          <td>${processInfo}</td>
          <td>${bwStr} ${res.unit || ''}</td>
          <td>${awStr} ${res.unit || ''}</td>
          <td class="${lColorClass}">${lText}</td>
          <td class="${wColorClass}">${wText}</td>
        </tr>
      `;
    }
  });

  html += '</tbody></table>';
  printContainer.innerHTML = html;
}

// ────────────────────────────────────────────────────────────────────────────
// CONTEXTUAL PRINT FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

function loadResults(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function fmtShrink(v: number): string {
  if (v === 0) return '0.0%';
  return v > 0 ? `-${v.toFixed(1)}%` : `+${Math.abs(v).toFixed(1)}%`;
}

/**
 * PRINT MODE 1 — Pattern Maker Printout
 * For Basic (single) and Average (sample) tests.
 * Emphasises shrinkage percentages and pre-wash cut dimensions.
 */
export function printPatternMaker(ids: number[]): void {
  const all = loadResults();
  const results = all.filter((r: any) => ids.includes(r.id) && (r.recordType === 'single' || r.recordType === 'sample'));
  const printContainer = document.getElementById('print-report-container');
  if (!printContainer) return;

  let html = `
    <div class="print-header">
      <h1>Pattern Maker Report</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>`;

  results.forEach((res: any) => {
    const isSample = res.recordType === 'sample';
    const lShrink = isSample ? res.avgL : res.lShrink;
    const wShrink = isSample ? res.avgW : res.wShrink;
    const lClass = lShrink > 0 ? 'print-danger' : lShrink < 0 ? 'print-success' : '';
    const wClass = wShrink > 0 ? 'print-danger' : wShrink < 0 ? 'print-success' : '';

    html += `
    <div style="border:1px solid #ccc; border-radius:8px; padding:20px; margin-bottom:20px; page-break-inside:avoid;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div>
          <h2 style="margin:0; font-size:18px;">${res.name || '—'}</h2>
          <p style="margin:4px 0 0; color:#666; font-size:13px;">${res.type || ''} · ${res.wash || ''} ${res.temp ? '· ' + res.temp : ''} ${res.duration ? '· ' + res.duration : ''}</p>
        </div>
        <span style="background:#e3f2fd; color:#1565c0; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;">${isSample ? 'AVG TEST' : 'BASIC TEST'}</span>
      </div>
      <table class="print-table" style="margin-bottom:12px;">
        <thead><tr><th>Axis</th><th>Shrinkage %</th><th>Before Wash</th><th>After Wash</th></tr></thead>
        <tbody>
          <tr>
            <td>Length</td>
            <td class="${lClass}" style="font-size:18px; font-weight:900;">${fmtShrink(lShrink)}</td>
            <td>${isSample ? '—' : (res.bwL ?? '—') + ' ' + (res.unit || '')}</td>
            <td>${isSample ? '—' : (res.awL ?? '—') + ' ' + (res.unit || '')}</td>
          </tr>
          <tr>
            <td>Width</td>
            <td class="${wClass}" style="font-size:18px; font-weight:900;">${fmtShrink(wShrink)}</td>
            <td>${isSample ? '—' : (res.bwW ?? '—') + ' ' + (res.unit || '')}</td>
            <td>${isSample ? '—' : (res.awW ?? '—') + ' ' + (res.unit || '')}</td>
          </tr>
        </tbody>
      </table>
      ${(res.cutL || res.cutW) ? `
      <div style="background:#f0fdf4; border:2px solid #16a34a; border-radius:8px; padding:14px; margin-top:10px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#15803d; margin-bottom:6px;">✂ Pre-Wash Pattern Cut Dimensions</div>
        <div style="font-size:22px; font-weight:900; color:#14532d;">
          ${res.cutL ? res.cutL.toFixed(2) + '"' : '—'} L &nbsp;×&nbsp; ${res.cutW ? res.cutW.toFixed(2) + '"' : '—'} W
        </div>
        ${(res.desiredL || res.desiredW) ? `<div style="font-size:12px; color:#166534; margin-top:4px;">Desired finished: ${res.desiredL?.toFixed(2) ?? '—'}" L × ${res.desiredW?.toFixed(2) ?? '—'}" W</div>` : ''}
      </div>` : ''}
      <div style="font-size:11px; color:#999; margin-top:8px;">Saved: ${res.date || ''}</div>
    </div>`;
  });

  if (results.length === 0) html += '<p style="text-align:center;color:#999;">No matching results.</p>';

  document.body.classList.add('print-report-mode');
  printContainer.innerHTML = html;
  window.print();
}

/**
 * PRINT MODE 2 — Factory Cut Sheet
 * For Roll QC (group) and Shipment tests.
 * Shows roll groups with explicit Roll IDs. No pattern dimensions.
 */
export function printFactoryCutSheet(ids: number[]): void {
  const all = loadResults();
  const results = all.filter((r: any) => ids.includes(r.id) && (r.recordType === 'group' || r.recordType === 'shipment'));
  const printContainer = document.getElementById('print-report-container');
  if (!printContainer) return;

  let html = `
    <div class="print-header">
      <h1>Factory Cut Sheet</h1>
      <p>Generated: ${new Date().toLocaleDateString()} — Use these groups when cutting rolls of similar shrinkage.</p>
    </div>`;

  results.forEach((res: any) => {
    html += `<div style="margin-bottom:30px; page-break-inside:avoid;">`;
    html += `<h2 style="font-size:16px; border-bottom:2px solid #333; padding-bottom:6px; margin-bottom:12px;">${res.name}</h2>`;

    const groups: any[] = res.recordType === 'group'
      ? [{ letter: 'A', rolls: res.rolls, avgL: res.avgL, avgW: res.avgW }]
      : (res.groups || []);

    groups.forEach((g: any) => {
      const lClass = g.avgL > 0 ? 'print-danger' : g.avgL < 0 ? 'print-success' : '';
      const wClass = g.avgW > 0 ? 'print-danger' : g.avgW < 0 ? 'print-success' : '';
      const rollIds = (g.rolls || []).map((r: any) => r.id).join(', ');

      html += `
      <div style="border-left:4px solid #1976d2; padding:10px 14px; margin-bottom:12px; background:#f8fbff;">
        <div style="font-weight:700; font-size:14px; margin-bottom:4px;">Group ${g.letter} — Avg L: <span class="${lClass}">${fmtShrink(g.avgL)}</span> | Avg W: <span class="${wClass}">${fmtShrink(g.avgW)}</span></div>
        <div style="font-size:13px; color:#444; margin-bottom:8px;"><strong>Roll IDs:</strong> ${rollIds || '—'}</div>
        <table class="print-table" style="font-size:11px;">
          <thead><tr><th>Roll</th><th>B-L</th><th>B-W</th><th>A-L</th><th>A-W</th><th>Shrink L%</th><th>Shrink W%</th></tr></thead>
          <tbody>
            ${(g.rolls || []).map((r: any) => `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.bL?.toFixed(1) ?? '—'}</td><td>${r.bW?.toFixed(1) ?? '—'}</td>
                <td>${r.aL?.toFixed(1) ?? '—'}</td><td>${r.aW?.toFixed(1) ?? '—'}</td>
                <td>${r.sL != null ? r.sL.toFixed(1) + '%' : '—'}</td>
                <td>${r.sW != null ? r.sW.toFixed(1) + '%' : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    });

    html += `</div>`;
  });

  if (results.length === 0) html += '<p style="text-align:center;color:#999;">No matching results.</p>';

  document.body.classList.add('print-report-mode');
  printContainer.innerHTML = html;
  window.print();
}

/**
 * PRINT MODE 3 — Summary Ledger
 * For batch printing. Spreadsheet-style table of all selected fabrics side-by-side.
 */
export function printSummaryLedger(ids: number[]): void {
  const all = loadResults();
  const results = all.filter((r: any) => ids.includes(r.id));
  const printContainer = document.getElementById('print-report-container');
  if (!printContainer) return;

  let html = `
    <div class="print-header">
      <h1>Shrinkage Summary Ledger</h1>
      <p>Generated: ${new Date().toLocaleDateString()} · ${results.length} items selected</p>
    </div>
    <table class="print-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Type</th>
          <th>Fabric / Name</th>
          <th>Wash Process</th>
          <th>Temp</th>
          <th>Duration</th>
          <th>Length Shrink</th>
          <th>Width Shrink</th>
          <th>Cut L</th>
          <th>Cut W</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>`;

  results.forEach((res: any, i: number) => {
    let typeLabel = 'Basic';
    let lShrink = 0; let wShrink = 0;
    let wash = ''; let temp = ''; let duration = '';
    let cutL = '—'; let cutW = '—';
    let name = res.name || '—';

    if (res.recordType === 'single') {
      typeLabel = 'Basic'; lShrink = res.lShrink; wShrink = res.wShrink;
      wash = res.wash || ''; temp = res.temp || ''; duration = res.duration || '';
    } else if (res.recordType === 'sample') {
      typeLabel = 'Avg Test'; lShrink = res.avgL; wShrink = res.avgW;
      if (res.cutL) cutL = res.cutL.toFixed(2) + '"';
      if (res.cutW) cutW = res.cutW.toFixed(2) + '"';
    } else if (res.recordType === 'group') {
      typeLabel = 'Roll QC'; lShrink = res.avgL; wShrink = res.avgW;
    } else if (res.recordType === 'shipment') {
      typeLabel = 'Shipment';
      const aL = (res.groups || []).map((g: any) => g.avgL);
      const aW = (res.groups || []).map((g: any) => g.avgW);
      lShrink = aL.length ? aL.reduce((a: number, b: number) => a + b, 0) / aL.length : 0;
      wShrink = aW.length ? aW.reduce((a: number, b: number) => a + b, 0) / aW.length : 0;
    }

    const lClass = lShrink > 0 ? 'print-danger' : lShrink < 0 ? 'print-success' : '';
    const wClass = wShrink > 0 ? 'print-danger' : wShrink < 0 ? 'print-success' : '';

    html += `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${typeLabel}</strong></td>
        <td>${name}</td>
        <td>${wash || '—'}</td>
        <td>${temp || '—'}</td>
        <td>${duration || '—'}</td>
        <td class="${lClass}"><strong>${fmtShrink(lShrink)}</strong></td>
        <td class="${wClass}"><strong>${fmtShrink(wShrink)}</strong></td>
        <td>${cutL}</td>
        <td>${cutW}</td>
        <td>${res.date || '—'}</td>
      </tr>`;
  });

  html += '</tbody></table>';
  if (results.length === 0) html = '<p style="text-align:center;color:#999;">No items selected.</p>';

  document.body.classList.add('print-report-mode');
  printContainer.innerHTML = html;
  window.print();
}

