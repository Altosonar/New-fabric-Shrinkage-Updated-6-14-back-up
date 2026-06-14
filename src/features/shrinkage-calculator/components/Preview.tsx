import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BASE_SIZE } from '../../../utils/constants';

interface PreviewProps {
  widthShrink: number;
  lengthShrink: number;
  wDisplay: { text: string; color: string; status: string };
  lDisplay: { text: string; color: string; status: string };
  unit: string;
  originalLength: number;
  originalWidth: number;
  washedLength: number;
  washedWidth: number;
  onWashedLengthChange?: (val: number) => void;
  onWashedWidthChange?: (val: number) => void;
  /** When true, user has manually entered values — hide sliders to reduce distraction */
  hideSliders?: boolean;
}

export function Preview({ widthShrink, lengthShrink, wDisplay, lDisplay, unit, originalLength, originalWidth, washedLength, washedWidth, onWashedLengthChange, onWashedWidthChange, hideSliders = false }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState(BASE_SIZE);

  // Watch the preview-box actual rendered size
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setBoxSize(w);
      }
    });
    ro.observe(el);
    // Initial measurement
    const w = el.clientWidth;
    if (w > 0) setBoxSize(w);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    updateVisualPreview();
  }, [widthShrink, lengthShrink, boxSize, unit, originalLength, originalWidth, washedLength, washedWidth]);

  const updateVisualPreview = () => {
    const S = boxSize; // actual rendered size of the square box

    // Original dimensions (before wash) are S x S
    // NOTE: pixel-based sizes, named differently to avoid shadowing props
    let pxWashedW = S * (1 - lengthShrink / 100);
    let pxWashedH = S * (1 - widthShrink / 100);

    // Find the maximum dimension among original and washed
    let maxDim = Math.max(S, pxWashedW, pxWashedH);
    let normFactor = S / maxDim;

    // Normalized sizes
    let origNorm = S * normFactor;
    let washedNormWidth = pxWashedW * normFactor;
    let washedNormHeight = pxWashedH * normFactor;

    // Determine if fabric is growing or shrinking
    const isGrowing = pxWashedW > S || pxWashedH > S;

    // Blue fabric = WASHED size (the result that changes)
    const scaledPreview = document.getElementById('scaledPreview');
    if (scaledPreview) {
      const fabricInset = Math.max(1, Math.round(S * 0.008));
      scaledPreview.style.width = washedNormWidth + 'px';
      scaledPreview.style.height = washedNormHeight + 'px';
      scaledPreview.style.left = fabricInset + 'px';
      scaledPreview.style.bottom = fabricInset + 'px';
    }

    const outlineInset = Math.max(2, Math.round(S * 0.008));

    // Dashed outline = ORIGINAL size (constant reference)
    const originalOutline = document.getElementById('originalOutline');
    if (originalOutline) {
      const outlineSize = Math.max(0, origNorm - outlineInset * 2);
      originalOutline.style.width = outlineSize + 'px';
      originalOutline.style.height = outlineSize + 'px';
      originalOutline.style.left = outlineInset + 'px';
      originalOutline.style.bottom = outlineInset + 'px';
      originalOutline.style.border = '3px dashed rgba(0,0,0,0.5)';
    }

    // Update percentage labels
    const lengthLabel = document.getElementById('lengthLabel');
    const widthLabel = document.getElementById('widthLabel');

    const lengthText = lengthShrink > 0 ? `-${lengthShrink.toFixed(1)}%` : (lengthShrink < 0 ? `+${Math.abs(lengthShrink).toFixed(1)}%` : `0%`);
    const widthText = widthShrink > 0 ? `-${widthShrink.toFixed(1)}%` : (widthShrink < 0 ? `+${Math.abs(widthShrink).toFixed(1)}%` : `0%`);

    // Build distance suffix for labels (only when original values exist)
    const dUnit = unit === 'cm' ? 'cm' : 'in';
    const lengthDiff = Math.abs(washedLength - originalLength);
    const widthDiff = Math.abs(washedWidth - originalWidth);
    const hasLDist = Math.abs(lengthShrink) > 0.05 && originalLength > 0;
    const hasWDist = Math.abs(widthShrink) > 0.05 && originalWidth > 0;
    const lSign = washedLength > originalLength ? '+' : '-';
    const wSign = washedWidth > originalWidth ? '+' : '-';
    const lDistHtml = hasLDist ? ` (${lSign}${lengthDiff.toFixed(1)}${dUnit})` : '';
    const wDistHtml = hasWDist ? ` (${wSign}${widthDiff.toFixed(1)}${dUnit})` : '';

    if (lengthLabel) {
      lengthLabel.textContent = `L= ${lengthText}${lDistHtml}`;
      lengthLabel.style.color = lengthShrink > 0 ? 'var(--danger)' : (lengthShrink < 0 ? 'var(--success)' : '#666');
      lengthLabel.style.borderColor = lengthShrink > 0 ? 'var(--danger)' : (lengthShrink < 0 ? 'var(--success)' : '#ccc');
    }
    if (widthLabel) {
      widthLabel.textContent = `W= ${widthText}${wDistHtml}`;
      widthLabel.style.color = widthShrink > 0 ? 'var(--danger)' : (widthShrink < 0 ? 'var(--success)' : '#666');
      widthLabel.style.borderColor = widthShrink > 0 ? 'var(--danger)' : (widthShrink < 0 ? 'var(--success)' : '#ccc');
    }

    // SMART label placement — each axis handled independently.
    // L= (horizontal) → length shrinkage along X.
    // W= (vertical)   → width shrinkage along Y.
    // Labels are always clamped inside the preview box.
    const fabricTopEdge = S - washedNormHeight;

    const widthTooSmall = washedNormHeight < S * 0.25;
    const lengthTooSmall = washedNormWidth < S * 0.25;

    // --- Length label (L=) — horizontal, bottom edge ---
    // Measure label width to clamp so it stays fully inside the box
    const lLabelW = lengthLabel ? lengthLabel.offsetWidth : 80;

    if (lengthLabel) {
      if (lengthTooSmall) {
        // Fabric is narrow: place label to the right of the fabric, at bottom
        const leftPos = Math.min(washedNormWidth + 6, S - lLabelW - 4);
        lengthLabel.style.left = Math.max(4, leftPos) + 'px';
        lengthLabel.style.top = '';
        lengthLabel.style.bottom = '0px';
        lengthLabel.style.transform = 'none';
      } else {
        // Fabric is wide enough: place label inside, centered horizontally at bottom
        // Clamp so the label never exceeds the box edges
        const halfLabel = lLabelW / 2;
        const centerX = washedNormWidth / 2;
        const clampedX = Math.max(halfLabel + 4, Math.min(centerX, S - halfLabel - 4));
        lengthLabel.style.left = clampedX + 'px';
        lengthLabel.style.top = '';
        lengthLabel.style.bottom = '4px';
        lengthLabel.style.transform = 'translateX(-50%)';
      }
      lengthLabel.style.transformOrigin = '';
    }

    // Measure L= label height for W= placement when stacked
    const lLabelH = lengthLabel ? lengthLabel.offsetHeight : 32;

    // --- Width label (W=) — vertical, left edge ---
    // The vertical label's physical width is roughly 35–40px.
    // Clamp its left so it never overflows the right edge of the box.
    const wLabelPhysicalW = 40;
    const maxLeftForW = S - wLabelPhysicalW;

    if (widthLabel) {
      // Measure the vertical label's rendered height (text length in vertical-rl mode)
      const wLabelH = widthLabel.offsetHeight || 100;
      const halfWLabelH = wLabelH / 2;

      if (widthTooSmall) {
        if (lengthTooSmall) {
          // Both small: stack vertically to the right of fabric
          const leftPos = Math.min(washedNormWidth + 6, maxLeftForW);
          // Clamp bottom so the label doesn't overflow the top of the box
          const maxBottom = S - wLabelH - 4;
          const desiredBottom = lLabelH + 6;
          widthLabel.style.left = Math.max(4, leftPos) + 'px';
          widthLabel.style.top = '';
          widthLabel.style.bottom = Math.min(desiredBottom, Math.max(0, maxBottom)) + 'px';
          widthLabel.style.transform = 'rotate(180deg)';
        } else {
          // Width small but length large (wide thin strip):
          // Place W= label centered horizontally, above the L= label, clamped inside box
          const centerPos = Math.min(washedNormWidth / 2, maxLeftForW);
          const maxBottom = S - wLabelH - 4;
          const desiredBottom = lLabelH + 6;
          widthLabel.style.left = Math.max(4, centerPos) + 'px';
          widthLabel.style.top = '';
          widthLabel.style.bottom = Math.min(desiredBottom, Math.max(0, maxBottom)) + 'px';
          widthLabel.style.transform = 'rotate(180deg)';
        }
      } else {
        // Fabric tall enough: place inside, near left edge, vertically centered
        // Clamp so the label's top and bottom both stay within [0, S]
        const idealCenterY = fabricTopEdge + washedNormHeight / 2;
        const clampedY = Math.max(halfWLabelH + 4, Math.min(idealCenterY, S - halfWLabelH - 4));
        widthLabel.style.left = Math.min(14, maxLeftForW) + 'px';
        widthLabel.style.top = clampedY + 'px';
        widthLabel.style.bottom = '';
        widthLabel.style.transform = 'translateY(-50%) rotate(180deg)';
      }
      widthLabel.style.transformOrigin = '';
    }

    // --- Direction arrows ---
    // Horizontal arrow: runs along bottom edge showing length change
    // Vertical arrow: runs along left edge showing width change
    // All endpoints clamped to [0, S] so arrows never exceed the box.
    const hArrow = document.getElementById('hArrow');
    const vArrow = document.getElementById('vArrow');

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const arrowInset = Math.max(4, Math.round(S * 0.015));
    const arrowHeadClearance = Math.max(8, Math.round(S * 0.025));
    const outlineSize = Math.max(0, origNorm - outlineInset * 2);
    const outlineRight = outlineInset + outlineSize;
    const outlineTop = S - outlineInset - outlineSize;

    if (hArrow) {
      const hasLengthChange = Math.abs(lengthShrink) > 0.05;
      if (hasLengthChange) {
        hArrow.style.display = '';
        const arrowY = S - arrowInset;
        const washedX = washedNormWidth;
        const origX = outlineRight;
        // Arrow always points from original edge to washed edge
        // Shrinking: washedX < origX, arrow points left (inward)
        // Stretching: washedX > origX, arrow points right (outward)
        const fromX = clamp(origX, arrowHeadClearance, S - arrowHeadClearance);
        const toX = clamp(washedX, arrowHeadClearance, S - arrowHeadClearance);
        // Only show if there's visible distance
        if (Math.abs(fromX - toX) > 5) {
          hArrow.setAttribute('x1', String(fromX));
          hArrow.setAttribute('y1', String(arrowY));
          hArrow.setAttribute('x2', String(toX));
          hArrow.setAttribute('y2', String(arrowY));
          hArrow.setAttribute('stroke', '#d32f2f');
          hArrow.setAttribute('stroke-width', '3');
          hArrow.removeAttribute('marker-start');
          hArrow.setAttribute('marker-end', 'url(#arrowEnd)');
        } else {
          hArrow.style.display = 'none';
        }
      } else {
        hArrow.style.display = 'none';
      }
    }

    if (vArrow) {
      const hasWidthChange = Math.abs(widthShrink) > 0.05;
      if (hasWidthChange) {
        vArrow.style.display = '';
        const arrowX = arrowInset;
        const washedY = S - washedNormHeight;
        const origY = outlineTop;
        // Arrow always points from original edge to washed edge
        // Shrinking: washedY > origY (fabric moved down), arrow points down (inward)
        // Stretching: washedY < origY (fabric moved up), arrow points up (outward)
        const fromY = clamp(origY, arrowHeadClearance, S - arrowHeadClearance);
        const toY = clamp(washedY, arrowHeadClearance, S - arrowHeadClearance);
        // Only show if there's visible distance
        if (Math.abs(fromY - toY) > 5) {
          vArrow.setAttribute('x1', String(arrowX));
          vArrow.setAttribute('y1', String(fromY));
          vArrow.setAttribute('x2', String(arrowX));
          vArrow.setAttribute('y2', String(toY));
          vArrow.setAttribute('stroke', '#d32f2f');
          vArrow.setAttribute('stroke-width', '3');
          vArrow.removeAttribute('marker-start');
          vArrow.setAttribute('marker-end', 'url(#arrowEnd)');
        } else {
          vArrow.style.display = 'none';
        }
      } else {
        vArrow.style.display = 'none';
      }
    }

    // Distance info is now merged into the L= / W= percentage labels above,
    // so no standalone SVG distance labels are needed.

    // Update scale indicator
    const avgChange = (widthShrink + lengthShrink) / 2;
    const scaleInd = document.getElementById('scaleIndicator');
    if (scaleInd) {
      if (avgChange > 0) {
        scaleInd.textContent = `Avg Shrink: -${avgChange.toFixed(1)}%`;
        scaleInd.style.background = 'var(--danger-light)';
        scaleInd.style.color = 'var(--danger)';
      } else if (avgChange < 0) {
        scaleInd.textContent = `Avg Stretch: +${Math.abs(avgChange).toFixed(1)}%`;
        scaleInd.style.background = '#E8F5E9';
        scaleInd.style.color = '#2E7D32';
      } else {
        scaleInd.textContent = '0%';
        scaleInd.style.background = '#F5F5F5';
        scaleInd.style.color = '#666';
      }
    }

    // Update displays
    const wDisplayEl = document.getElementById('widthDisplay');
    const lDisplayEl = document.getElementById('lengthDisplay');
    const wStatusEl = document.getElementById('widthStatus');
    const lStatusEl = document.getElementById('lengthStatus');

    if (wDisplayEl) {
      wDisplayEl.textContent = wDisplay.text;
      wDisplayEl.style.color = wDisplay.color;
    }
    if (lDisplayEl) {
      lDisplayEl.textContent = lDisplay.text;
      lDisplayEl.style.color = lDisplay.color;
    }
    if (wStatusEl) {
      wStatusEl.textContent = wDisplay.status;
      wStatusEl.style.color = wDisplay.color;
    }
    if (lStatusEl) {
      lStatusEl.textContent = lDisplay.status;
      lStatusEl.style.color = lDisplay.color;
    }
  };

  // Slider defaults: use 20 as default when no original value entered
  const defaultSize = unit === 'cm' ? 50 : 20;
  const sliderOrigL = originalLength > 0 ? originalLength : defaultSize;
  const sliderOrigW = originalWidth > 0 ? originalWidth : defaultSize;
  const lengthSliderMax = sliderOrigL * 2;
  const widthSliderMax = sliderOrigW * 2;
  const lengthSliderVal = washedLength > 0 ? washedLength : sliderOrigL;
  const widthSliderVal = washedWidth > 0 ? washedWidth : sliderOrigW;

  const displayUnit = unit === 'cm' ? 'cm' : 'in';

  return (
    <div className="card">
      <div className="card-title">2. Pattern Shrinkage Control</div>
      
      <div className="shrinkage-preview">
        {/* Length slider — above the box (hidden when user has entered values) */}
        {!hideSliders && (
          <div style={{ width: '100%', marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>Length (Horizontal)</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: lengthShrink > 0 ? 'var(--danger)' : lengthShrink < 0 ? 'var(--success)' : '#555' }}>
                {lengthSliderVal.toFixed(1)} {displayUnit}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max={lengthSliderMax}
              step="0.1"
              value={lengthSliderVal}
              onChange={(e) => onWashedLengthChange?.(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: lengthShrink > 0 ? '#d32f2f' : lengthShrink < 0 ? '#2E7D32' : '#1976D2' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
          {/* Preview box */}
          <div style={{ flex: 1 }}>
            <div className="visualizer-wrapper">
              <div className="preview-box" id="previewBox" ref={previewRef}>
                <div id="scaledPreview" style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(25, 118, 210, 0.7)', border: 'none', borderRadius: '4px', transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', width: '100%', height: '100%', zIndex: 1 }}></div>
                <div className="original-outline" id="originalOutline"></div>
                {/* Direction arrows */}
                <svg id="arrowsSvg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4, overflow: 'visible' }}>
                  <defs>
                    <marker id="arrowEnd" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L10,4 L0,8 Z" fill="#d32f2f" />
                    </marker>
                    <marker id="arrowStart" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M10,0 L0,4 L10,8 Z" fill="#d32f2f" />
                    </marker>
                    <marker id="arrowEndGreen" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L10,4 L0,8 Z" fill="#2E7D32" />
                    </marker>
                    <marker id="arrowStartGreen" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M10,0 L0,4 L10,8 Z" fill="#2E7D32" />
                    </marker>
                  </defs>
                  {/* Horizontal arrow (length) */}
                  <line id="hArrow" x1="0" y1="0" x2="0" y2="0" stroke="#d32f2f" strokeWidth="3" markerEnd="url(#arrowEnd)" />

                  {/* Vertical arrow (width) */}
                  <line id="vArrow" x1="0" y1="0" x2="0" y2="0" stroke="#d32f2f" strokeWidth="3" markerEnd="url(#arrowEnd)" />

                </svg>
                <div id="lengthLabel" className="shrink-label" style={{ color: '#666', borderColor: '#ccc' }}>L= 0%</div>
                <div id="widthLabel" className="shrink-label" style={{ color: '#666', borderColor: '#ccc' }}>W= 0%</div>
              </div>
            </div>
          </div>

          {/* Width slider — vertical, right of the box (desktop only) */}
          {!hideSliders && (
            <div className="width-slider-vertical" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', marginLeft: '8px', minWidth: '44px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#555', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginBottom: '4px' }}>Width (Vertical)</span>
              <input
                type="range"
                min="0.1"
                max={widthSliderMax}
                step="0.1"
                value={widthSliderVal}
                onChange={(e) => onWashedWidthChange?.(parseFloat(e.target.value))}
                orient="vertical"
                style={{
                  writingMode: 'vertical-lr' as any,
                  direction: 'rtl',
                  WebkitAppearance: 'slider-vertical' as any,
                  width: '20px',
                  flex: 1,
                  accentColor: widthShrink > 0 ? '#d32f2f' : widthShrink < 0 ? '#2E7D32' : '#1976D2',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 800, color: widthShrink > 0 ? 'var(--danger)' : widthShrink < 0 ? 'var(--success)' : '#555', marginTop: '4px' }}>
                {widthSliderVal.toFixed(1)} {displayUnit}
              </span>
            </div>
          )}
        </div>

        {/* Width slider — horizontal, below box (mobile only) */}
        {!hideSliders && (
          <div className="width-slider-horizontal" style={{ width: '100%', marginTop: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>Width (Vertical)</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: widthShrink > 0 ? 'var(--danger)' : widthShrink < 0 ? 'var(--success)' : '#555' }}>
                {widthSliderVal.toFixed(1)} {displayUnit}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max={widthSliderMax}
              step="0.1"
              value={widthSliderVal}
              onChange={(e) => onWashedWidthChange?.(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: widthShrink > 0 ? '#d32f2f' : widthShrink < 0 ? '#2E7D32' : '#1976D2' }}
            />
          </div>
        )}
        
        <div className="preview-label-footer">
          <span style={{ textDecoration: 'line-through' }}>Original Size</span> vs <strong>After Wash Size</strong> 
          <span id="scaleIndicator" className="shrinkage-indicator" style={{ background: '#F5F5F5' }}>0%</span>
        </div>
      </div>

    </div>
  );
}
