import { SavedResult, FabricResult, RollGroup, Shipment, SampleTest } from '../types';

function esc(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtShrink(v: number): string {
  if (v === 0) return '0.0%';
  return v > 0 ? `-${v.toFixed(2)}%` : `+${Math.abs(v).toFixed(2)}%`;
}

export function exportToCSV(results: SavedResult[]): string {
  const rows: string[][] = [];

  // Header
  rows.push([
    'Type', 'Name', 'Wash Process', 'Temp', 'Duration',
    'Before L', 'Before W', 'After L', 'After W', 'Unit',
    'Shrink L%', 'Shrink W%', 'Cut L', 'Cut W',
    'Rolls / Groups', 'Date', 'Folder ID', 'Tags'
  ]);

  for (const r of results) {
    const folder = (r as any).folderId ?? '';
    const tags = ((r as any).tags ?? []).join('; ');

    if (r.recordType === 'single') {
      const f = r as FabricResult;
      rows.push([
        'Basic Test', f.name, f.wash, f.temp ?? '', f.duration ?? '',
        String(f.bwL ?? ''), String(f.bwW ?? ''), String(f.awL ?? ''), String(f.awW ?? ''), f.unit,
        fmtShrink(f.lShrink), fmtShrink(f.wShrink), '', '',
        '', f.date, folder, tags
      ]);

    } else if (r.recordType === 'sample') {
      const s = r as SampleTest;
      rows.push([
        'Avg Test', s.name, '', '', '',
        '', '', '', '', '',
        fmtShrink(s.avgL), fmtShrink(s.avgW),
        s.cutL != null ? s.cutL.toFixed(2) + '"' : '',
        s.cutW != null ? s.cutW.toFixed(2) + '"' : '',
        String(s.samples?.length ?? 0) + ' samples', s.date, folder, tags
      ]);
      // Sub-rows for each sample
      (s.samples || []).forEach((sm, i) => {
        rows.push([
          '', `  Sample ${i + 1}`, '', '', '',
          String(sm.bL), String(sm.bW), String(sm.aL), String(sm.aW), '',
          sm.sL, sm.sW, '', '', '', '', '', ''
        ]);
      });

    } else if (r.recordType === 'group') {
      const g = r as RollGroup;
      rows.push([
        'Roll QC', g.name, '', '', '',
        '', '', '', '', '',
        fmtShrink(g.avgL), fmtShrink(g.avgW), '', '',
        String(g.rolls.length) + ' rolls', g.date, folder, tags
      ]);
      g.rolls.forEach(roll => {
        rows.push([
          '', `  Roll ${roll.id}`, '', '', '',
          String(roll.bL ?? ''), String(roll.bW ?? ''), String(roll.aL ?? ''), String(roll.aW ?? ''), '',
          roll.sL != null ? roll.sL.toFixed(2) + '%' : '',
          roll.sW != null ? roll.sW.toFixed(2) + '%' : '',
          '', '', '', '', '', ''
        ]);
      });

    } else if (r.recordType === 'shipment') {
      const sh = r as Shipment;
      rows.push([
        'Shipment Lot', sh.name, '', '', '',
        '', '', '', '', '',
        '', '', '', '',
        String(sh.groups.length) + ' groups', sh.date, folder, tags
      ]);
      sh.groups.forEach(grp => {
        rows.push([
          '', `  Group ${grp.letter}`, '', '', '',
          '', '', '', '', '',
          fmtShrink(grp.avgL), fmtShrink(grp.avgW), '', '',
          String(grp.rolls.length) + ' rolls', '', '', ''
        ]);
        grp.rolls.forEach(roll => {
          rows.push([
            '', `    Roll ${roll.id}`, '', '', '',
            String(roll.bL ?? ''), String(roll.bW ?? ''), String(roll.aL ?? ''), String(roll.aW ?? ''), '',
            roll.sL != null ? roll.sL.toFixed(2) + '%' : '',
            roll.sW != null ? roll.sW.toFixed(2) + '%' : '',
            '', '', '', '', '', ''
          ]);
        });
      });
    }
  }

  return rows.map(row => row.map(esc).join(',')).join('\r\n');
}
