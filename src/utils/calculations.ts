// Calculate shrinkage percentage
export function calculateShrinkage(before: number, after: number): number {
  if (before === 0) return 0;
  return ((before - after) / before) * 100;
}

// Format shrinkage value with sign
export function formatShrinkage(value: number): string {
  if (value === 0) return '0%';
  return value > 0 ? `-${value.toFixed(1)}%` : `+${Math.abs(value).toFixed(1)}%`;
}

// Get color for shrinkage value
export function getShrinkageColor(value: number): 'danger' | 'success' | 'default' {
  if (value > 0) return 'danger';
  if (value < 0) return 'success';
  return 'default';
}

// Calculate average shrinkage from array
export function calculateAverage(values: number[]): number {
  const validValues = values.filter(v => !isNaN(v) && v !== 0);
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

// Calculate range (max - min) from array
export function calculateRange(values: number[]): number {
  const validValues = values.filter(v => !isNaN(v) && v !== 0);
  if (validValues.length < 2) return 0;
  return Math.max(...validValues) - Math.min(...validValues);
}

// Quick Math: X is what % of Y
export function calculatePercentageOf(x: number, y: number): number {
  if (y === 0) return 0;
  return (x / y) * 100;
}

// Quick Math: What is X% of Y
export function calculatePercentageValue(x: number, y: number): number {
  return (x / 100) * y;
}

// Calculate pattern cut size from desired finished size and shrinkage
export function calculateCutSize(desired: number, shrinkagePercent: number): number {
  if (shrinkagePercent >= 100) return 0;
  const factor = 1 - (shrinkagePercent / 100);
  return desired / factor;
}

// Roll statistics
export interface RollStats {
  avgL: number;
  avgW: number;
  rangeL: number;
  rangeW: number;
}

export interface RollData {
  bL?: number;
  bW?: number;
  aL?: number;
  aW?: number;
  sL?: number | null;
  sW?: number | null;
}

export function calculateRollStats(rolls: RollData[]): RollStats {
  const sLValues: number[] = [];
  const sWValues: number[] = [];

  rolls.forEach(roll => {
    if (roll.sL !== undefined && roll.sL !== null && !isNaN(roll.sL)) {
      sLValues.push(roll.sL);
    }
    if (roll.sW !== undefined && roll.sW !== null && !isNaN(roll.sW)) {
      sWValues.push(roll.sW);
    }
  });

  return {
    avgL: calculateAverage(sLValues),
    avgW: calculateAverage(sWValues),
    rangeL: calculateRange(sLValues),
    rangeW: calculateRange(sWValues)
  };
}

// Group similar rolls based on threshold
export interface GroupedRoll {
  letter: string;
  rows: number[];
  rolls: Array<{
    id: string;
    bL?: number;
    bW?: number;
    aL?: number;
    aW?: number;
    sL: number | null | undefined;
    sW: number | null | undefined;
  }>;
  avgL: number;
  avgW: number;
}

export function groupSimilarRolls(
  rolls: RollData[],
  threshold: number = 1.0
): GroupedRoll[] {
  const assigned: boolean[] = new Array(rolls.length).fill(false);
  const groups: GroupedRoll[] = [];
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  for (let i = 0; i < rolls.length; i++) {
    if (assigned[i]) continue;
    if (rolls[i].sL === null || rolls[i].sL === undefined || 
        rolls[i].sW === null || rolls[i].sW === undefined) continue;

    const newGroup: number[] = [i];
    assigned[i] = true;

    for (let j = i + 1; j < rolls.length; j++) {
      if (assigned[j]) continue;
      if (rolls[j].sL === null || rolls[j].sL === undefined || 
          rolls[j].sW === null || rolls[j].sW === undefined) continue;

      const lDiff = Math.abs(rolls[i].sL! - rolls[j].sL!);
      const wDiff = Math.abs(rolls[i].sW! - rolls[j].sW!);

      if (lDiff <= threshold && wDiff <= threshold) {
        newGroup.push(j);
        assigned[j] = true;
      }
    }

    const groupRolls = newGroup.map(idx => ({
      id: `R${idx + 1}`,
      bL: rolls[idx].bL,
      bW: rolls[idx].bW,
      aL: rolls[idx].aL,
      aW: rolls[idx].aW,
      sL: rolls[idx].sL,
      sW: rolls[idx].sW
    }));

    const sLValues = groupRolls.map(r => r.sL).filter(v => v !== null) as number[];
    const sWValues = groupRolls.map(r => r.sW).filter(v => v !== null) as number[];

    groups.push({
      letter: groupLetters[groups.length % groupLetters.length],
      rows: newGroup.map(i => i + 1),
      rolls: groupRolls,
      avgL: calculateAverage(sLValues),
      avgW: calculateAverage(sWValues)
    });
  }

  return groups;
}

// Validate measurement inputs
export function validateMeasurements(
  bwW?: string | number,
  awW?: string | number,
  bwL?: string | number,
  awL?: string | number
): { valid: boolean; message?: string } {
  const bwWNum = parseFloat(String(bwW));
  const awWNum = parseFloat(String(awW));
  const bwLNum = parseFloat(String(bwL));
  const awLNum = parseFloat(String(awL));

  if ((bwWNum && !awWNum) || (!bwWNum && awWNum)) {
    return { valid: false, message: "Please fill in both Before and After measurements for the Width to calculate it." };
  }
  if ((bwLNum && !awLNum) || (!bwLNum && awLNum)) {
    return { valid: false, message: "Please fill in both Before and After measurements for the Length to calculate it." };
  }
  if (!bwWNum && !awWNum && !bwLNum && !awLNum) {
    return { valid: false, message: "Please enter at least one set of measurements (Length or Width) to calculate." };
  }

  return { valid: true };
}
