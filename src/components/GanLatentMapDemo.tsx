"use client";

import { useMemo, useState } from "react";

const BATCH_SIZE = 16;
const PREVIEW_COUNT = 24;
const XRANGE = 2.5;
const EPS = 1e-6;
const LR_D = 0.12;
const LR_G = 0.08;
const DEFAULT_SEED = 1337;

type Params = {
  w: number;
  b: number;
  a: number;
  c: number;
};

type Metrics = {
  lossD: number;
  lossG: number;
};

type BatchPreview = {
  real: number[];
  fake: number[];
};

const INITIAL_PARAMS: Params = {
  w: 0.6,
  b: 0,
  a: 0.5,
  c: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number) => value.toFixed(3);

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

function sampleReal(seed: number) {
  const mix = nextRand(seed);
  const normal = sampleNormal(mix.seed);
  const mean = mix.value < 0.5 ? -1 : 1;
  const value = mean + 0.2 * normal.value;
  return { seed: normal.seed, value };
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function GanLatentMapDemo() {
  const [params, setParams] = useState<Params>({ ...INITIAL_PARAMS });
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [steps, setSteps] = useState(0);
  const [zInput, setZInput] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lastBatch, setLastBatch] = useState<BatchPreview | null>(null);

  const gAtZ = params.w * zInput + params.b;
  const dAtG = sigmoid(params.a * gAtZ + params.c);

  const preview = useMemo(() => {
    let nextSeed = seed + 19;
    const real: number[] = [];
    const fake: number[] = [];
    for (let i = 0; i < PREVIEW_COUNT; i += 1) {
      const realSample = sampleReal(nextSeed);
      nextSeed = realSample.seed;
      real.push(realSample.value);
      const zSample = sampleNormal(nextSeed);
      nextSeed = zSample.seed;
      fake.push(params.w * zSample.value + params.b);
    }
    return { real, fake };
  }, [seed, params]);

  const runSteps = (count: number) => {
    let nextParams = { ...params };
    let nextSeed = seed;
    let latestMetrics = metrics;
    let latestBatch = lastBatch;

    for (let step = 0; step < count; step += 1) {
      const real: number[] = [];
      const fake: number[] = [];
      const zSamples: number[] = [];

      for (let i = 0; i < BATCH_SIZE; i += 1) {
        const realSample = sampleReal(nextSeed);
        nextSeed = realSample.seed;
        real.push(realSample.value);

        const zSample = sampleNormal(nextSeed);
        nextSeed = zSample.seed;
        zSamples.push(zSample.value);
        fake.push(nextParams.w * zSample.value + nextParams.b);
      }

      const dReal = real.map((value) => sigmoid(nextParams.a * value + nextParams.c));
      const dFake = fake.map((value) => sigmoid(nextParams.a * value + nextParams.c));
      const lossD = -(
        mean(dReal.map((value) => Math.log(value + EPS))) +
        mean(dFake.map((value) => Math.log(1 - value + EPS)))
      );

      const gradA =
        mean(dReal.map((value, index) => (value - 1) * real[index])) +
        mean(dFake.map((value, index) => value * fake[index]));
      const gradC = mean(dReal.map((value) => value - 1)) + mean(dFake);

      const updatedA = clamp(nextParams.a - LR_D * gradA, -3, 3);
      const updatedC = clamp(nextParams.c - LR_D * gradC, -2, 2);
      nextParams = { ...nextParams, a: updatedA, c: updatedC };

      const dFakeAfter = fake.map((value) => sigmoid(nextParams.a * value + nextParams.c));
      const lossG = -mean(dFakeAfter.map((value) => Math.log(value + EPS)));

      const gradW = mean(
        dFakeAfter.map((value, index) => (value - 1) * nextParams.a * zSamples[index])
      );
      const gradB = mean(dFakeAfter.map((value) => (value - 1) * nextParams.a)) / 1;

      const updatedW = clamp(nextParams.w - LR_G * gradW, -3, 3);
      const updatedB = clamp(nextParams.b - LR_G * gradB, -2, 2);
      nextParams = { ...nextParams, w: updatedW, b: updatedB };

      latestMetrics = { lossD, lossG };
      latestBatch = { real, fake };
    }

    setParams(nextParams);
    setSeed(nextSeed);
    setMetrics(latestMetrics);
    setLastBatch(latestBatch);
    setSteps((prev) => prev + count);
  };

  const handleReset = () => {
    setParams({ ...INITIAL_PARAMS });
    setSeed(DEFAULT_SEED);
    setSteps(0);
    setMetrics(null);
    setLastBatch(null);
    setZInput(0);
  };

  const toPercent = (value: number) => {
    const clamped = clamp(value, -XRANGE, XRANGE);
    return ((clamped + XRANGE) / (XRANGE * 2)) * 100;
  };

  return (
    <section className="attention-demo gan-demo">
      <header>
        <h3>GAN latent mapping playground</h3>
        <p>
          A tiny 1D GAN learns a bimodal target distribution at -1 and +1. Slide z
          to see how the generator maps noise into data space and how the
          discriminator scores it.
        </p>
      </header>

      <div className="gan-demo-meta">
        <span>Batch size: {BATCH_SIZE}</span>
        <span>Steps: {steps}</span>
        <span>Learning rates: D {LR_D}, G {LR_G}</span>
      </div>

      <div className="gan-demo-actions">
        <button type="button" className="gan-demo-button" onClick={() => runSteps(1)}>
          Step once
        </button>
        <button type="button" className="gan-demo-button" onClick={() => runSteps(10)}>
          Step ×10
        </button>
        <button type="button" className="gan-demo-button is-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      <label className="attention-slider">
        Latent z: {zInput.toFixed(2)}
        <input
          type="range"
          min={-XRANGE}
          max={XRANGE}
          step={0.05}
          value={zInput}
          onChange={(event) => setZInput(Number(event.target.value))}
        />
      </label>

      <div className="gan-demo-readout">
        <span>G(z) = {formatNumber(gAtZ)}</span>
        <span>D(G(z)) = {formatNumber(dAtG)}</span>
      </div>

      <div className="gan-demo-badges">
        <span className="gan-demo-badge">w = {formatNumber(params.w)}</span>
        <span className="gan-demo-badge">b = {formatNumber(params.b)}</span>
        <span className="gan-demo-badge">a = {formatNumber(params.a)}</span>
        <span className="gan-demo-badge">c = {formatNumber(params.c)}</span>
      </div>

      <div className="gan-demo-metrics">
        <div className="gan-demo-metric">
          <h4>Discriminator loss</h4>
          <span>{metrics ? formatNumber(metrics.lossD) : "No updates yet."}</span>
        </div>
        <div className="gan-demo-metric">
          <h4>Generator loss</h4>
          <span>{metrics ? formatNumber(metrics.lossG) : "No updates yet."}</span>
        </div>
      </div>

      <div className="gan-demo-strip">
        <div className="gan-demo-row">
          <span>Real data</span>
          <div className="gan-demo-track" aria-label="Real samples">
            {(lastBatch?.real ?? preview.real).map((value, index) => (
              <span
                key={`real-${index}`}
                className="gan-demo-dot is-real"
                style={{ left: `${toPercent(value)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="gan-demo-row">
          <span>Generated</span>
          <div className="gan-demo-track" aria-label="Generated samples">
            {(lastBatch?.fake ?? preview.fake).map((value, index) => (
              <span
                key={`fake-${index}`}
                className="gan-demo-dot is-fake"
                style={{ left: `${toPercent(value)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="gan-demo-range">
          Range: -{XRANGE} to +{XRANGE}
        </div>
      </div>
    </section>
  );
}
