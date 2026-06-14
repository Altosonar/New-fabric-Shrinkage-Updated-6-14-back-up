import { STORAGE_KEY } from './constants';

/**
 * Smart Print: context-aware printing.
 * - Calculator view  → prints the calculator UI (CSS hides header/tabs)
 * - Results view     → builds a formatted table report and prints it
 */
export function triggerSmartPrint(): void {
  const currentView = document.body.dataset.currentView || 'calculator';

  if (currentView === 'results') {
    // Database Report mode
    document.body.classList.add('print-report-mode');
    buildPrintReport();
    window.print();
  } else {
    // Calculator UI mode
    document.body.classList.remove('print-report-mode');
    window.print();
  }
}

// Clean up after print dialog closes
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
