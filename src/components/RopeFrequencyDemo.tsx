"use client";

import { useMemo, useState } from "react";

const DIMENSION = 64;
const PLANE_INDICES = [0, 1, 2, 3];
const POSITION_LIMIT = 512;
const VECTOR_RADIUS = 42;
const CENTER = 70;
const VIEWBOX = 140;

const PRESETS = [
  { label: "Nearby (m=5, n=6)", m: 5, n: 6 },
  { label: "Far (m=5, n=500)", m: 5, n: 500 },
  { label: "Mid (m=10, n=50)", m: 10, n: 50 },
];

type PlaneData = {
  index: number;
  theta: number;
  queryAngle: number;
  keyAngle: number;
  deltaAngle: number;
  cosDelta: number;
  cycles: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number, digits = 3) => value.toFixed(digits);

const formatExp = (value: number) => value.toExponential(2);

const toSvgPoint = (angle: number) => ({
  x: CENTER + VECTOR_RADIUS * Math.cos(angle),
  y: CENTER - VECTOR_RADIUS * Math.sin(angle),
});

export default function RopeFrequencyDemo() {
  const [queryPos, setQueryPos] = useState(18);
  const [keyPos, setKeyPos] = useState(6);

  const deltaPos = queryPos - keyPos;

  const planes = useMemo<PlaneData[]>(() => {
    return PLANE_INDICES.map((index) => {
      const theta = Math.pow(10000, (-2 * index) / DIMENSION);
      const queryAngle = queryPos * theta;
      const keyAngle = keyPos * theta;
      const deltaAngle = (queryPos - keyPos) * theta;
      return {
        index,
        theta,
        queryAngle,
        keyAngle,
        deltaAngle,
        cosDelta: Math.cos(deltaAngle),
        cycles: Math.abs(deltaAngle) / (Math.PI * 2),
      };
    });
  }, [queryPos, keyPos]);

  return (
    <section className="attention-demo rope-demo">
      <header>
        <h3>RoPE multi-frequency playground</h3>
        <p>
          Each pair of dimensions rotates at its own frequency. Slide positions m
          and n to see how the relative angle changes across planes.
        </p>
      </header>

      <div className="attention-controls">
        <label className="attention-control">
          <span>Query position m: {queryPos}</span>
          <input
            type="range"
            min={0}
            max={POSITION_LIMIT}
            step={1}
            value={queryPos}
            onChange={(event) =>
              setQueryPos(clamp(Number(event.target.value), 0, POSITION_LIMIT))
            }
          />
        </label>
        <label className="attention-control">
          <span>Key position n: {keyPos}</span>
          <input
            type="range"
            min={0}
            max={POSITION_LIMIT}
            step={1}
            value={keyPos}
            onChange={(event) =>
              setKeyPos(clamp(Number(event.target.value), 0, POSITION_LIMIT))
            }
          />
        </label>
      </div>

      <div className="kmp-demo-actions">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="kmp-demo-button"
            onClick={() => {
              setQueryPos(clamp(preset.m, 0, POSITION_LIMIT));
              setKeyPos(clamp(preset.n, 0, POSITION_LIMIT));
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="rope-demo-hint">
        Look for the tradeoff: high-frequency planes rack up many cycles for large
        gaps (cos(Delta) can repeat), while low-frequency planes change slowly but
        stay distinct over long ranges.
      </p>

      <div className="rope-demo-meta">
        <span>Dimension d = {DIMENSION}</span>
        <span>Planes shown: {PLANE_INDICES.length}</span>
        <span>
          Delta = m - n = {deltaPos >= 0 ? "+" : ""}
          {deltaPos}
        </span>
      </div>

      <div className="rope-demo-grid">
        {planes.map((plane) => {
          const basePoint = toSvgPoint(0);
          const queryPoint = toSvgPoint(plane.queryAngle);
          const keyPoint = toSvgPoint(plane.keyAngle);
          return (
            <div key={plane.index} className="rope-demo-plane">
              <div className="rope-demo-plane-header">
                <div>
                  <div className="rope-demo-plane-title">
                    Plane {plane.index}
                  </div>
                  <div className="rope-demo-plane-subtitle">
                    dims {plane.index * 2}, {plane.index * 2 + 1}
                  </div>
                </div>
                <div className="rope-demo-plane-theta">
                  theta_i = {formatExp(plane.theta)}
                </div>
              </div>
              <svg
                className="rope-demo-plane-svg"
                viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
                role="img"
                aria-label={`RoPE plane ${plane.index}`}
              >
                <circle
                  className="rope-demo-plane-circle"
                  cx={CENTER}
                  cy={CENTER}
                  r={VECTOR_RADIUS}
                />
                <line
                  className="rope-demo-axis"
                  x1={CENTER - VECTOR_RADIUS}
                  y1={CENTER}
                  x2={CENTER + VECTOR_RADIUS}
                  y2={CENTER}
                />
                <line
                  className="rope-demo-axis"
                  x1={CENTER}
                  y1={CENTER - VECTOR_RADIUS}
                  x2={CENTER}
                  y2={CENTER + VECTOR_RADIUS}
                />
                <line
                  className="rope-demo-vector is-base"
                  x1={CENTER}
                  y1={CENTER}
                  x2={basePoint.x}
                  y2={basePoint.y}
                />
                <line
                  className="rope-demo-vector is-query"
                  x1={CENTER}
                  y1={CENTER}
                  x2={queryPoint.x}
                  y2={queryPoint.y}
                />
                <line
                  className="rope-demo-vector is-key"
                  x1={CENTER}
                  y1={CENTER}
                  x2={keyPoint.x}
                  y2={keyPoint.y}
                />
                <circle
                  className="rope-demo-point is-query"
                  cx={queryPoint.x}
                  cy={queryPoint.y}
                  r={3}
                />
                <circle
                  className="rope-demo-point is-key"
                  cx={keyPoint.x}
                  cy={keyPoint.y}
                  r={3}
                />
              </svg>
              <div className="rope-demo-values">
                <span>Delta angle: {formatNumber(plane.deltaAngle)} rad</span>
                <span>cos(Delta): {formatNumber(plane.cosDelta)}</span>
                <span>cycles: {formatNumber(plane.cycles, 2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rope-demo-legend">
        <span className="rope-demo-legend-item">
          <span className="rope-demo-legend-dot is-base" />
          base vector
        </span>
        <span className="rope-demo-legend-item">
          <span className="rope-demo-legend-dot is-query" />
          query (m)
        </span>
        <span className="rope-demo-legend-item">
          <span className="rope-demo-legend-dot is-key" />
          key (n)
        </span>
      </div>
    </section>
  );
}
