"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_GROUP_SIZE = 6;
const DEFAULT_REWARD_MEAN = 0.2;
const DEFAULT_REWARD_STD = 0.6;
const DEFAULT_RATIO_DRIFT = 0.15;
const DEFAULT_EPSILON = 0.2;
const DEFAULT_BETA = 0.02;
const DEFAULT_SEED = 11;
const EPS = 1e-6;
const RATIO_MIN = 0.2;
const RATIO_MAX = 2.5;

type NoiseSample = {
  id: string;
  rewardNoise: number;
  ratioNoise: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number, digits = 3) => value.toFixed(digits);

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

function buildNoiseSamples(count: number, seed: number) {
  let nextSeed = seed;
  const samples = Array.from({ length: count }, (_, index) => {
    const rewardSample = sampleNormal(nextSeed);
    const ratioSample = sampleNormal(rewardSample.seed);
    nextSeed = ratioSample.seed;
    return {
      id: `o${index + 1}`,
      rewardNoise: rewardSample.value,
      ratioNoise: ratioSample.value,
    };
  });
  return samples;
}

export default function GrpoPlaygroundDemo() {
  const [groupSize, setGroupSize] = useState(DEFAULT_GROUP_SIZE);
  const [rewardMean, setRewardMean] = useState(DEFAULT_REWARD_MEAN);
  const [rewardStd, setRewardStd] = useState(DEFAULT_REWARD_STD);
  const [ratioDrift, setRatioDrift] = useState(DEFAULT_RATIO_DRIFT);
  const [epsilon, setEpsilon] = useState(DEFAULT_EPSILON);
  const [beta, setBeta] = useState(DEFAULT_BETA);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [noiseSamples, setNoiseSamples] = useState<NoiseSample[]>(() =>
    buildNoiseSamples(DEFAULT_GROUP_SIZE, DEFAULT_SEED),
  );

  useEffect(() => {
    setNoiseSamples(buildNoiseSamples(groupSize, seed));
  }, [groupSize, seed]);

  const derived = useMemo(() => {
    const rewards = noiseSamples.map((sample) => rewardMean + rewardStd * sample.rewardNoise);
    const mean = rewards.reduce((acc, value) => acc + value, 0) / rewards.length;
    const variance =
      rewards.reduce((acc, value) => acc + (value - mean) ** 2, 0) / rewards.length;
    const std = Math.sqrt(variance);
    const lower = 1 - epsilon;
    const upper = 1 + epsilon;

    const rows = noiseSamples.map((sample, index) => {
      const reward = rewards[index];
      const ratio = clamp(1 + ratioDrift * sample.ratioNoise, RATIO_MIN, RATIO_MAX);
      const advantage = std < EPS ? 0 : (reward - mean) / std;
      const clippedRatio = clamp(ratio, lower, upper);
      const unclipped = ratio * advantage;
      const clipped = clippedRatio * advantage;
      const surrogate = Math.min(unclipped, clipped);
      const kl = ratio - Math.log(ratio) - 1;
      const contribution = surrogate - beta * kl;
      const isClipped = Math.abs(ratio - clippedRatio) > EPS;

      return {
        id: sample.id,
        reward,
        advantage,
        ratio,
        clippedRatio,
        contribution,
        kl,
        isClipped,
      };
    });

    const objectiveMean =
      rows.reduce((acc, row) => acc + row.contribution, 0) / rows.length;
    const clippedCount = rows.filter((row) => row.isClipped).length;

    return {
      mean,
      std,
      lower,
      upper,
      rows,
      objectiveMean,
      clippedCount,
      hasZeroStd: std < EPS,
    };
  }, [noiseSamples, rewardMean, rewardStd, ratioDrift, epsilon, beta]);

  const handleResample = () => {
    setSeed((prev) => prev + 1);
  };

  const handleReset = () => {
    setGroupSize(DEFAULT_GROUP_SIZE);
    setRewardMean(DEFAULT_REWARD_MEAN);
    setRewardStd(DEFAULT_REWARD_STD);
    setRatioDrift(DEFAULT_RATIO_DRIFT);
    setEpsilon(DEFAULT_EPSILON);
    setBeta(DEFAULT_BETA);
    setSeed(DEFAULT_SEED);
  };

  return (
    <section className="attention-demo grpo-demo">
      <header>
        <h3>GRPO update playground</h3>
        <p>
          Sample a group of completions, normalize rewards into advantages, and
          see how clipping and the KL penalty change the update direction.
        </p>
      </header>

      <div className="grpo-demo-meta">
        <span>Group mean reward: {formatNumber(derived.mean)}</span>
        <span>Group std reward: {formatNumber(derived.std)}</span>
        <span>
          Clip range: [{formatNumber(derived.lower, 2)}, {formatNumber(derived.upper, 2)}]
        </span>
        <span>Clipped outputs: {derived.clippedCount}</span>
        <span>Objective mean: {formatNumber(derived.objectiveMean)}</span>
      </div>

      <div className="grpo-demo-controls">
        <label className="attention-control">
          <span>Group size G: {groupSize}</span>
          <input
            type="range"
            min={3}
            max={12}
            step={1}
            value={groupSize}
            onChange={(event) => setGroupSize(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Reward mean: {formatNumber(rewardMean, 2)}</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={rewardMean}
            onChange={(event) => setRewardMean(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Reward std: {formatNumber(rewardStd, 2)}</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={rewardStd}
            onChange={(event) => setRewardStd(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Ratio drift: {formatNumber(ratioDrift, 2)}</span>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={ratioDrift}
            onChange={(event) => setRatioDrift(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Epsilon: {formatNumber(epsilon, 2)}</span>
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={epsilon}
            onChange={(event) => setEpsilon(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>KL beta: {formatNumber(beta, 2)}</span>
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={beta}
            onChange={(event) => setBeta(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="grpo-demo-actions">
        <button type="button" className="grpo-demo-button" onClick={handleResample}>
          Resample group
        </button>
        <button type="button" className="grpo-demo-button is-ghost" onClick={handleReset}>
          Reset defaults
        </button>
        <span className="grpo-demo-seed">Seed: {seed}</span>
      </div>

      {derived.hasZeroStd ? (
        <p className="grpo-demo-hint">
          Reward std is zero, so advantages collapse to 0 and the update becomes
          purely KL-driven.
        </p>
      ) : null}

      <div className="grpo-demo-table">
        <div className="grpo-demo-row grpo-demo-header">
          <span>Output</span>
          <span>Reward</span>
          <span>Advantage</span>
          <span>Ratio</span>
          <span>Clipped ratio</span>
          <span>KL</span>
          <span>Contribution</span>
          <span>Clipped?</span>
        </div>
        {derived.rows.map((row) => (
          <div
            key={row.id}
            className={`grpo-demo-row${row.isClipped ? " is-clipped" : ""}`}
          >
            <span>{row.id}</span>
            <span>{formatNumber(row.reward)}</span>
            <span>{formatNumber(row.advantage)}</span>
            <span>{formatNumber(row.ratio)}</span>
            <span>{formatNumber(row.clippedRatio)}</span>
            <span>{formatNumber(row.kl)}</span>
            <span>{formatNumber(row.contribution)}</span>
            <span className={`grpo-demo-badge${row.isClipped ? " is-on" : ""}`}>
              {row.isClipped ? "Yes" : "No"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
