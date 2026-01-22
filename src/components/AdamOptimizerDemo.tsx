"use client";

import { useMemo, useState } from "react";

const RANGE_MIN = -6;
const RANGE_MAX = 6;
const DEFAULT_START_X = 4.5;
const DEFAULT_ADAM_LR = 0.2;
const DEFAULT_SGD_LR = 0.1;
const DEFAULT_BETA1 = 0.9;
const DEFAULT_BETA2 = 0.999;
const DEFAULT_NOISE = 0.1;
const DEFAULT_SEED = 1337;
const EPS = 1e-8;
const FUNCTION_LABEL = "f(x) = 0.2x^2 + 0.6 sin(1.5x)";

type AdamState = {
  x: number;
  m: number;
  v: number;
  t: number;
  lastGrad: number | null;
  lastStep: number | null;
  lastNoise: number | null;
};

type SgdState = {
  x: number;
  lastGrad: number | null;
  lastStep: number | null;
  lastNoise: number | null;
};

const createAdamState = (x: number): AdamState => ({
  x,
  m: 0,
  v: 0,
  t: 0,
  lastGrad: null,
  lastStep: null,
  lastNoise: null,
});

const createSgdState = (x: number): SgdState => ({
  x,
  lastGrad: null,
  lastStep: null,
  lastNoise: null,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number, digits = 3) => value.toFixed(digits);

const formatMaybe = (value: number | null, digits = 3) =>
  value === null ? "—" : value.toFixed(digits);

function loss(x: number) {
  return 0.2 * x * x + 0.6 * Math.sin(1.5 * x);
}

function gradient(x: number) {
  return 0.4 * x + 0.9 * Math.cos(1.5 * x);
}

function nextRand(seed: number) {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: next, value: next / 2 ** 32 };
}

function sampleNormal(seed: number) {
  const first = nextRand(seed);
  const second = nextRand(first.seed);
  const u1 = clamp(first.value, 1e-6, 1);
  const u2 = second.value;
  const radius = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;
  return { seed: second.seed, value: radius * Math.cos(angle) };
}

export default function AdamOptimizerDemo() {
  const [startX, setStartX] = useState(DEFAULT_START_X);
  const [adamLr, setAdamLr] = useState(DEFAULT_ADAM_LR);
  const [sgdLr, setSgdLr] = useState(DEFAULT_SGD_LR);
  const [beta1, setBeta1] = useState(DEFAULT_BETA1);
  const [beta2, setBeta2] = useState(DEFAULT_BETA2);
  const [noiseScale, setNoiseScale] = useState(DEFAULT_NOISE);
  const [biasCorrection, setBiasCorrection] = useState(true);
  const [adam, setAdam] = useState<AdamState>(() => createAdamState(DEFAULT_START_X));
  const [sgd, setSgd] = useState<SgdState>(() => createSgdState(DEFAULT_START_X));
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [steps, setSteps] = useState(0);

  const targetMin = useMemo(() => {
    const samples = 240;
    let bestX = RANGE_MIN;
    let bestValue = loss(bestX);
    for (let i = 1; i <= samples; i += 1) {
      const x = RANGE_MIN + ((RANGE_MAX - RANGE_MIN) * i) / samples;
      const value = loss(x);
      if (value < bestValue) {
        bestValue = value;
        bestX = x;
      }
    }
    return { x: bestX, value: bestValue };
  }, []);

  const toPercent = (value: number) => {
    const clamped = clamp(value, RANGE_MIN, RANGE_MAX);
    return ((clamped - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * 100;
  };

  const runSteps = (count: number) => {
    let nextAdam = { ...adam };
    let nextSgd = { ...sgd };
    let nextSeed = seed;
    let nextSteps = steps;

    for (let step = 0; step < count; step += 1) {
      const noiseSample = sampleNormal(nextSeed);
      nextSeed = noiseSample.seed;
      const noise = noiseSample.value * noiseScale;

      const gradAdam = gradient(nextAdam.x) + noise;
      const gradSgd = gradient(nextSgd.x) + noise;

      const t = nextAdam.t + 1;
      const m = beta1 * nextAdam.m + (1 - beta1) * gradAdam;
      const v = beta2 * nextAdam.v + (1 - beta2) * gradAdam * gradAdam;
      const mHat = biasCorrection ? m / (1 - Math.pow(beta1, t)) : m;
      const vHat = biasCorrection ? v / (1 - Math.pow(beta2, t)) : v;
      const stepSize = adamLr * (mHat / (Math.sqrt(vHat) + EPS));

      nextAdam = {
        x: nextAdam.x - stepSize,
        m,
        v,
        t,
        lastGrad: gradAdam,
        lastStep: stepSize,
        lastNoise: noise,
      };

      const sgdStep = sgdLr * gradSgd;
      nextSgd = {
        x: nextSgd.x - sgdStep,
        lastGrad: gradSgd,
        lastStep: sgdStep,
        lastNoise: noise,
      };

      nextSteps += 1;
    }

    setAdam(nextAdam);
    setSgd(nextSgd);
    setSeed(nextSeed);
    setSteps(nextSteps);
  };

  const handleReset = () => {
    setAdam(createAdamState(startX));
    setSgd(createSgdState(startX));
    setSeed(DEFAULT_SEED);
    setSteps(0);
  };

  const adamMHat =
    adam.t === 0
      ? 0
      : biasCorrection
        ? adam.m / (1 - Math.pow(beta1, adam.t))
        : adam.m;
  const adamVHat =
    adam.t === 0
      ? 0
      : biasCorrection
        ? adam.v / (1 - Math.pow(beta2, adam.t))
        : adam.v;

  return (
    <section className="attention-demo adam-demo">
      <header>
        <h3>Adam optimizer playground</h3>
        <p>
          Step through a 1D optimization task and compare Adam to vanilla SGD on
          the same noisy gradients. Toggle bias correction to see how the step
          sizes change early in training.
        </p>
      </header>

      <div className="adam-demo-meta">
        <span>Steps: {steps}</span>
        <span>Function: {FUNCTION_LABEL}</span>
        <span>Approx min x: {formatNumber(targetMin.x)}</span>
      </div>

      <div className="adam-demo-controls">
        <label className="attention-control">
          <span>Start position (reset): {formatNumber(startX, 2)}</span>
          <input
            type="range"
            min={RANGE_MIN}
            max={RANGE_MAX}
            step={0.1}
            value={startX}
            onChange={(event) => setStartX(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Adam learning rate: {formatNumber(adamLr, 2)}</span>
          <input
            type="range"
            min={0.02}
            max={0.5}
            step={0.01}
            value={adamLr}
            onChange={(event) => setAdamLr(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>SGD learning rate: {formatNumber(sgdLr, 2)}</span>
          <input
            type="range"
            min={0.02}
            max={0.5}
            step={0.01}
            value={sgdLr}
            onChange={(event) => setSgdLr(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Beta1: {formatNumber(beta1, 2)}</span>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={beta1}
            onChange={(event) => setBeta1(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Beta2: {formatNumber(beta2, 3)}</span>
          <input
            type="range"
            min={0.8}
            max={0.999}
            step={0.001}
            value={beta2}
            onChange={(event) => setBeta2(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Gradient noise: {formatNumber(noiseScale, 2)}</span>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.02}
            value={noiseScale}
            onChange={(event) => setNoiseScale(Number(event.target.value))}
          />
        </label>
        <label className="attention-control adam-demo-toggle">
          <span>Bias correction</span>
          <input
            type="checkbox"
            checked={biasCorrection}
            onChange={(event) => setBiasCorrection(event.target.checked)}
          />
        </label>
      </div>

      <div className="adam-demo-actions">
        <button type="button" className="adam-demo-button" onClick={() => runSteps(1)}>
          Step once
        </button>
        <button type="button" className="adam-demo-button" onClick={() => runSteps(10)}>
          Step ×10
        </button>
        <button type="button" className="adam-demo-button is-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="adam-demo-track" aria-label="Optimizer positions">
        <span
          className="adam-demo-marker"
          style={{ left: `${toPercent(targetMin.x)}%` }}
          title="Approximate minimum"
        />
        <span
          className="adam-demo-dot is-adam"
          style={{ left: `${toPercent(adam.x)}%` }}
          title="Adam position"
        />
        <span
          className="adam-demo-dot is-sgd"
          style={{ left: `${toPercent(sgd.x)}%` }}
          title="SGD position"
        />
      </div>

      <div className="adam-demo-legend">
        <span className="adam-demo-legend-item">
          <span className="adam-demo-legend-dot is-adam" /> Adam
        </span>
        <span className="adam-demo-legend-item">
          <span className="adam-demo-legend-dot is-sgd" /> SGD
        </span>
        <span className="adam-demo-legend-item">
          <span className="adam-demo-legend-dot is-target" /> Approx min
        </span>
      </div>

      <div className="adam-demo-panels">
        <div className="adam-demo-panel">
          <h4>Adam</h4>
          <div className="adam-demo-metric">
            <span>x</span>
            <span>{formatNumber(adam.x)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>f(x)</span>
            <span>{formatNumber(loss(adam.x))}</span>
          </div>
          <div className="adam-demo-metric">
            <span>grad</span>
            <span>{formatMaybe(adam.lastGrad)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>step</span>
            <span>{formatMaybe(adam.lastStep)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>m</span>
            <span>{formatNumber(adam.m)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>v</span>
            <span>{formatNumber(adam.v)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>mHat</span>
            <span>{formatNumber(adamMHat)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>vHat</span>
            <span>{formatNumber(adamVHat)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>t</span>
            <span>{adam.t}</span>
          </div>
          <div className="adam-demo-metric">
            <span>noise</span>
            <span>{formatMaybe(adam.lastNoise)}</span>
          </div>
        </div>

        <div className="adam-demo-panel">
          <h4>SGD</h4>
          <div className="adam-demo-metric">
            <span>x</span>
            <span>{formatNumber(sgd.x)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>f(x)</span>
            <span>{formatNumber(loss(sgd.x))}</span>
          </div>
          <div className="adam-demo-metric">
            <span>grad</span>
            <span>{formatMaybe(sgd.lastGrad)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>step</span>
            <span>{formatMaybe(sgd.lastStep)}</span>
          </div>
          <div className="adam-demo-metric">
            <span>noise</span>
            <span>{formatMaybe(sgd.lastNoise)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
