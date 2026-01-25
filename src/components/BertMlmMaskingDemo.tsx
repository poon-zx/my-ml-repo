"use client";

import { useMemo, useState } from "react";

const PRESETS = [
  {
    key: "story",
    label: "Short story",
    text: "The quick brown fox jumps over the lazy dog",
  },
  {
    key: "ml",
    label: "ML summary",
    text: "BERT learns bidirectional representations with masked tokens",
  },
  {
    key: "news",
    label: "News",
    text: "Scientists discover new materials for faster batteries",
  },
];

const DEFAULT_VOCAB = ["the", "a", "model", "token", "data", "learns", "fast", "slow"];
const MAX_TOKENS = 16;
const DEFAULT_MASK_RATE = 0.15;

type MaskedRow = {
  index: number;
  original: string;
  corrupted: string;
  label: string;
  rule: "none" | "mask" | "random" | "keep";
};

function tokenize(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { raw: [] as string[], tokens: [] as string[] };
  }
  const raw = trimmed.split(/\s+/);
  return { raw, tokens: raw.slice(0, MAX_TOKENS) };
}

function nextRand(seed: number) {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: next, value: next / 2 ** 32 };
}

function pickRandomToken(seed: number, vocab: string[], original: string) {
  if (vocab.length === 0) {
    return { seed, token: "[MASK]" };
  }
  const roll = nextRand(seed);
  let index = Math.floor(roll.value * vocab.length);
  if (vocab.length > 1 && vocab[index] === original) {
    index = (index + 1) % vocab.length;
  }
  return { seed: roll.seed, token: vocab[index] };
}

function buildMasking(tokens: string[], maskRate: number, seed: number, vocab: string[]) {
  let nextSeed = seed;
  const rows: MaskedRow[] = [];
  const stats = {
    masked: 0,
    maskToken: 0,
    randomToken: 0,
    kept: 0,
  };

  tokens.forEach((token, index) => {
    const roll = nextRand(nextSeed);
    nextSeed = roll.seed;
    if (roll.value >= maskRate) {
      rows.push({ index, original: token, corrupted: token, label: "—", rule: "none" });
      return;
    }
    stats.masked += 1;
    const corruptionRoll = nextRand(nextSeed);
    nextSeed = corruptionRoll.seed;
    if (corruptionRoll.value < 0.8) {
      stats.maskToken += 1;
      rows.push({ index, original: token, corrupted: "[MASK]", label: token, rule: "mask" });
      return;
    }
    if (corruptionRoll.value < 0.9) {
      stats.randomToken += 1;
      const replacement = pickRandomToken(nextSeed, vocab, token);
      nextSeed = replacement.seed;
      rows.push({
        index,
        original: token,
        corrupted: replacement.token,
        label: token,
        rule: "random",
      });
      return;
    }
    stats.kept += 1;
    rows.push({ index, original: token, corrupted: token, label: token, rule: "keep" });
  });

  return { rows, stats };
}

export default function BertMlmMaskingDemo() {
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [text, setText] = useState(PRESETS[0].text);
  const [maskRate, setMaskRate] = useState(DEFAULT_MASK_RATE);
  const [seed, setSeed] = useState(42);

  const { raw, tokens } = useMemo(() => tokenize(text), [text]);
  const isTrimmed = raw.length > tokens.length;
  const vocab = useMemo(() => {
    const unique = new Set([...DEFAULT_VOCAB, ...tokens]);
    return Array.from(unique);
  }, [tokens]);

  const { rows, stats } = useMemo(
    () => buildMasking(tokens, maskRate, seed, vocab),
    [tokens, maskRate, seed, vocab]
  );

  const maskedPercent = tokens.length
    ? Math.round((stats.masked / tokens.length) * 100)
    : 0;

  return (
    <section className="attention-demo bert-demo">
      <header>
        <h3>MLM masking playground</h3>
        <p>
          Sample which tokens are masked and how the 80/10/10 corruption rule
          changes the input seen by the model.
        </p>
      </header>

      <div className="attention-controls">
        <label className="attention-control">
          <span>Preset</span>
          <select
            className="attention-select"
            value={presetKey}
            onChange={(event) => {
              const nextKey = event.target.value;
              if (nextKey === "custom") {
                setPresetKey("custom");
                return;
              }
              const preset = PRESETS.find((item) => item.key === nextKey);
              if (preset) {
                setPresetKey(preset.key);
                setText(preset.text);
              }
            }}
          >
            {PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="attention-control">
          <span>Input text</span>
          <textarea
            className="attention-input"
            rows={2}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (presetKey !== "custom") {
                setPresetKey("custom");
              }
            }}
          />
        </label>
      </div>

      <div className="bert-demo-meta">
        <span>{tokens.length} tokens</span>
        <span>Mask rate: {(maskRate * 100).toFixed(0)}%</span>
        <span>Masked this pass: {maskedPercent}%</span>
      </div>

      {isTrimmed && (
        <div className="attention-warning">Showing the first {MAX_TOKENS} tokens.</div>
      )}

      <label className="attention-slider">
        Mask rate: {(maskRate * 100).toFixed(0)}%
        <input
          type="range"
          min={0.05}
          max={0.3}
          step={0.01}
          value={maskRate}
          onChange={(event) => setMaskRate(Number(event.target.value))}
        />
      </label>

      <div className="bert-demo-actions">
        <button
          type="button"
          className="bert-demo-button"
          onClick={() => setSeed((value) => value + 1)}
        >
          Reshuffle masks
        </button>
      </div>

      {tokens.length === 0 ? (
        <p className="bert-demo-empty">Enter a sentence to see masked tokens.</p>
      ) : (
        <>
          <table className="bert-demo-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Original</th>
                <th>Corrupted input</th>
                <th>MLM label</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.index}
                  className={row.rule === "none" ? "" : "is-masked"}
                >
                  <td>{row.index + 1}</td>
                  <td>{row.original}</td>
                  <td>{row.corrupted}</td>
                  <td>{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bert-demo-meta">
            <span>[MASK] swaps: {stats.maskToken}</span>
            <span>Random swaps: {stats.randomToken}</span>
            <span>Kept originals: {stats.kept}</span>
          </div>
        </>
      )}
    </section>
  );
}
