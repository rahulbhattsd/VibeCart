// src/components/PriceRangeSlider.jsx
import React, { useCallback } from 'react';
import './PriceRangeSlider.css';

const PriceRangeSlider = ({
  min = 0,
  max = 10000,
  value = [0, 10000],
  onChange,
  step = 50,
  disabled = false,
}) => {
  const [minVal, maxVal] = value;
  const range = max - min > 0 ? max - min : 1;

  const minPercent = Math.min(Math.max(((minVal - min) / range) * 100, 0), 100);
  const maxPercent = Math.min(Math.max(((maxVal - min) / range) * 100, 0), 100);

  const handleMinChange = useCallback(
    (e) => {
      const newMin = Math.min(Number(e.target.value), maxVal - step);
      onChange([newMin, maxVal]);
    },
    [maxVal, onChange, step]
  );

  const handleMaxChange = useCallback(
    (e) => {
      const newMax = Math.max(Number(e.target.value), minVal + step);
      onChange([minVal, newMax]);
    },
    [minVal, onChange, step]
  );

  return (
    <div className="price-range-slider">
      <div className="price-slider-header">
        <span className="slider-label">Price Range</span>
        <span className="slider-values-badge">
          ₹{Math.round(minVal).toLocaleString('en-IN')} – ₹{Math.round(maxVal).toLocaleString('en-IN')}
        </span>
      </div>

      <div className="price-slider-track-wrap">
        <div className="slider-track-bg" />
        <div
          className="slider-track-highlight"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(maxPercent - minPercent, 0)}%`,
          }}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={handleMinChange}
          disabled={disabled || min >= max}
          className="range-input range-input-min"
          aria-label="Minimum price"
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={handleMaxChange}
          disabled={disabled || min >= max}
          className="range-input range-input-max"
          aria-label="Maximum price"
        />
      </div>

      <div className="price-bounds-hints">
        <span>Min: ₹{min.toLocaleString('en-IN')}</span>
        <span>Max: ₹{max.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};

export default PriceRangeSlider;
