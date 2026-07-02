import React, { useState, useEffect } from 'react';
import { calculatePercentageOf, calculatePercentageValue } from '../../../utils/calculations';
import { Button } from '../../../components/ui/Button';

export function QuickMath() {
  const [qm2X, setQm2X] = useState('');
  const [qm2Y, setQm2Y] = useState('');
  const [qm2Ans, setQm2Ans] = useState('0%');
  const [qm2Bar, setQm2Bar] = useState('0%');

  const [qm3X, setQm3X] = useState('');
  const [qm3Y, setQm3Y] = useState('');
  const [qm3Ans, setQm3Ans] = useState('0');
  const [qm3Bar, setQm3Bar] = useState('0%');

  useEffect(() => {
    // Calculate QM2: X is what % of Y
    const x = parseFloat(qm2X);
    const y = parseFloat(qm2Y);

    if (!isNaN(x) && !isNaN(y) && y !== 0) {
      const perc = calculatePercentageOf(x, y);
      setQm2Ans(perc.toFixed(1) + '%');
      setQm2Bar(Math.min(Math.abs(perc), 100) + '%');
    } else {
      setQm2Ans('0%');
      setQm2Bar('0%');
    }
  }, [qm2X, qm2Y]);

  useEffect(() => {
    // Calculate QM3: What is X% of Y
    const x = parseFloat(qm3X);
    const y = parseFloat(qm3Y);

    if (!isNaN(x) && !isNaN(y)) {
      const val = calculatePercentageValue(x, y);
      setQm3Ans(val.toFixed(2));
      setQm3Bar(Math.min(Math.abs(x), 100) + '%');
    } else {
      setQm3Ans('0');
      setQm3Bar('0%');
    }
  }, [qm3X, qm3Y]);

  return (
    <div className="quick-math-grid">
      <div className="card">
        <div className="card-title"><i className="fas fa-balance-scale"></i> X is what percentage of Y?</div>
        <div className="qm-input-row">
          <input
            type="number"
            placeholder="X"
            value={qm2X}
            onChange={(e) => setQm2X(e.target.value)}
            className="pm-input qm-input-field"
          />
          <span className="qm-label">is what % of</span>
          <input
            type="number"
            placeholder="Y"
            value={qm2Y}
            onChange={(e) => setQm2Y(e.target.value)}
            className="pm-input qm-input-field qm-input-accent"
          />
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', letterSpacing: '1px' }}>ANSWER</div>
          <div style={{ fontSize: '52px', fontWeight: '900', color: 'var(--danger)', marginTop: '5px' }}>{qm2Ans}</div>
        </div>
        <div className="qm-visualizer-container">
          <div className="qm-visualizer-bar" style={{ width: qm2Bar }}>
            {parseFloat(qm2Bar) > 15 && <span>{qm2Ans}</span>}
          </div>
        </div>
        <div style={{ marginTop: '15px' }}>
          <Button
            variant="outline"
            style={{ width: '100%' }}
            onClick={() => { setQm2X(''); setQm2Y(''); }}
            icon={<i className="fas fa-redo"></i>}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><i className="fas fa-percentage"></i> What is X percentage of Y?</div>
        <div className="qm-input-row">
          <span className="qm-label">What is</span>
          <input
            type="number"
            placeholder="X (%)"
            value={qm3X}
            onChange={(e) => setQm3X(e.target.value)}
            className="pm-input qm-input-field"
          />
          <span className="qm-label">% of</span>
          <input
            type="number"
            placeholder="Y"
            value={qm3Y}
            onChange={(e) => setQm3Y(e.target.value)}
            className="pm-input qm-input-field qm-input-accent"
          />
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', letterSpacing: '1px' }}>ANSWER</div>
          <div style={{ fontSize: '52px', fontWeight: '900', color: 'var(--danger)', marginTop: '5px' }}>{qm3Ans}</div>
        </div>
        <div className="qm-visualizer-container">
          <div className="qm-visualizer-bar" style={{ width: qm3Bar }}>
            {parseFloat(qm3Bar) > 15 && <span>{qm3X}%</span>}
          </div>
        </div>
        <div style={{ marginTop: '15px' }}>
          <Button
            variant="outline"
            style={{ width: '100%' }}
            onClick={() => { setQm3X(''); setQm3Y(''); }}
            icon={<i className="fas fa-redo"></i>}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
