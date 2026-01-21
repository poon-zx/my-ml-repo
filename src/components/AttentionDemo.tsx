"use client";

import { useEffect, useMemo, useState } from "react";

const PRESETS = [
  {
    key: "cat",
    label: "Cat on the mat",
    text: "The cat sat on the mat",
  },
  {
    key: "coref",
    label: "Coreference",
    text: "Alice said she would help Bob today",
  },
  {
    key: "translate",
    label: "Translation",
    text: "We like building attention based models",
  },
];

const MAX_TOKENS = 12;
const EMBEDDING_DIM = 6;
const HEAD_DIM = 4;

type ProjectionKind = "q" | "k" | "v";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function tokenize(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { raw: [], tokens: [] as string[] };
  }
  const raw = trimmed.split(/\s+/);
  return { raw, tokens: raw.slice(0, MAX_TOKENS) };
}

function tokenEmbedding(token: string) {
  const base = Array.from(token).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 1),
    0
  );
  return Array.from({ length: EMBEDDING_DIM }, (_, dim) => {
    const angle = (base + 1) * (dim + 1);
    return Math.sin(angle * 0.17) + Math.cos(angle * 0.11);
  });
}

function projectEmbedding(embedding: number[], head: number, kind: ProjectionKind) {
  const offset = kind === "q" ? 0.37 : kind === "k" ? 1.21 : 2.03;
  return Array.from({ length: HEAD_DIM }, (_, dim) => {
    let sum = 0;
    for (let index = 0; index < embedding.length; index += 1) {
      const weight =
        Math.sin((head + 1) * (dim + 2) * (index + 1) * 0.21 + offset) +
        Math.cos((head + 2) * (index + 2) * (dim + 1) * 0.17 + offset);
      sum += embedding[index] * weight;
    }
    return sum;
  });
}

function dot(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function softmax(values: number[], temperature: number) {
  const safeTemp = Math.max(temperature, 0.05);
  const scaled = values.map((value) =>
    Number.isFinite(value) ? value / safeTemp : value
  );
  const finite = scaled.filter((value) => Number.isFinite(value));
  const max = finite.length ? Math.max(...finite) : 0;
  const exp = scaled.map((value) =>
    Number.isFinite(value) ? Math.exp(value - max) : 0
  );
  const total = exp.reduce((sum, value) => sum + value, 0);
  return total === 0 ? exp.map(() => 0) : exp.map((value) => value / total);
}

export default function AttentionDemo() {
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [sequence, setSequence] = useState(PRESETS[0].text);
  const [queryIndex, setQueryIndex] = useState(0);
  const [numHeads, setNumHeads] = useState(2);
  const [headIndex, setHeadIndex] = useState(0);
  const [temperature, setTemperature] = useState(1);
  const [useScale, setUseScale] = useState(true);
  const [causalMask, setCausalMask] = useState(false);

  const { raw, tokens } = useMemo(() => tokenize(sequence), [sequence]);
  const isTrimmed = raw.length > tokens.length;
  const queryToken = tokens[queryIndex] ?? "—";

  useEffect(() => {
    if (tokens.length === 0) {
      setQueryIndex(0);
      return;
    }
    setQueryIndex((current) => clamp(current, 0, tokens.length - 1));
  }, [tokens.length]);

  useEffect(() => {
    setHeadIndex((current) => clamp(current, 0, numHeads - 1));
  }, [numHeads]);

  const attentionData = useMemo(() => {
    if (tokens.length === 0) {
      return null;
    }

    const embeddings = tokens.map((token) => tokenEmbedding(token));
    const queries = embeddings.map((embedding) =>
      projectEmbedding(embedding, headIndex, "q")
    );
    const keys = embeddings.map((embedding) =>
      projectEmbedding(embedding, headIndex, "k")
    );
    const values = embeddings.map((embedding) =>
      projectEmbedding(embedding, headIndex, "v")
    );
    const scale = useScale ? 1 / Math.sqrt(HEAD_DIM) : 1;

    const scores = queries.map((query, row) =>
      keys.map((key, col) => {
        const rawScore = dot(query, key) * scale;
        if (causalMask && col > row) {
          return Number.NEGATIVE_INFINITY;
        }
        return rawScore;
      })
    );

    const weights = scores.map((row) => softmax(row, temperature));
    const row = weights[queryIndex] ?? [];
    const context = Array.from({ length: HEAD_DIM }, (_, dim) =>
      row.reduce((sum, weight, index) => sum + weight * values[index][dim], 0)
    );

    return { weights, context };
  }, [tokens, headIndex, queryIndex, causalMask, temperature, useScale]);

  const weightsRow = attentionData?.weights[queryIndex] ?? [];
  const topTokens = useMemo(() => {
    return weightsRow
      .map((weight, index) => ({ token: tokens[index], weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
  }, [tokens, weightsRow]);

  const contextValues = attentionData?.context ?? [];
  const contextMax = contextValues.length
    ? Math.max(...contextValues.map((value) => Math.abs(value)))
    : 1;

  return (
    <section className="attention-demo">
      <header>
        <h3>Self-attention playground</h3>
        <p>
          Pick a query token, toggle masking, and see how the attention weights
          and context vector change for a single head.
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
                setSequence(preset.text);
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
          <span>Token sequence (space separated)</span>
          <textarea
            className="attention-input"
            rows={2}
            value={sequence}
            onChange={(event) => {
              setSequence(event.target.value);
              if (presetKey !== "custom") {
                setPresetKey("custom");
              }
            }}
          />
        </label>
      </div>

      <div className="attention-meta">
        <span>{tokens.length} tokens</span>
        <span>{numHeads} heads (viewing head {headIndex + 1})</span>
        <span>head size d_k = {HEAD_DIM}</span>
      </div>
      {isTrimmed && (
        <div className="attention-warning">
          Showing the first {MAX_TOKENS} tokens.
        </div>
      )}

      <label className="attention-slider">
        Query token: {queryToken}
        <input
          type="range"
          min={0}
          max={Math.max(tokens.length - 1, 0)}
          step={1}
          value={queryIndex}
          disabled={tokens.length === 0}
          onChange={(event) => setQueryIndex(Number(event.target.value))}
        />
      </label>

      <label className="attention-slider">
        Head count: {numHeads}
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={numHeads}
          onChange={(event) => setNumHeads(Number(event.target.value))}
        />
      </label>

      <label className="attention-slider">
        Head: {headIndex + 1}
        <input
          type="range"
          min={1}
          max={Math.max(numHeads, 1)}
          step={1}
          value={headIndex + 1}
          onChange={(event) => setHeadIndex(Number(event.target.value) - 1)}
        />
      </label>

      <label className="attention-slider">
        Temperature: {temperature.toFixed(2)}
        <input
          type="range"
          min={0.4}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(event) => setTemperature(Number(event.target.value))}
        />
      </label>

      <div className="attention-toggles">
        <label className="attention-toggle">
          <input
            type="checkbox"
            checked={useScale}
            onChange={(event) => setUseScale(event.target.checked)}
          />
          Scale by sqrt(d_k)
        </label>
        <label className="attention-toggle">
          <input
            type="checkbox"
            checked={causalMask}
            onChange={(event) => setCausalMask(event.target.checked)}
          />
          Causal mask (decoder)
        </label>
      </div>

      {tokens.length === 0 ? (
        <p className="empty-state">Enter a few tokens to see attention.</p>
      ) : (
        <>
          <div className="attention-token-row">
            {tokens.map((token, index) => (
              <button
                key={`${token}-${index}`}
                type="button"
                className={
                  index === queryIndex
                    ? "attention-token-button is-active"
                    : "attention-token-button"
                }
                onClick={() => setQueryIndex(index)}
              >
                {token}
              </button>
            ))}
          </div>

          <div className="attention-weights">
            {weightsRow.map((weight, index) => (
              <div key={`${tokens[index]}-${index}`} className="attention-weight-row">
                <span className="attention-weight-label">{tokens[index]}</span>
                <span className="attention-weight-track">
                  <span
                    className="attention-weight-fill"
                    style={{ width: `${Math.round(weight * 100)}%` }}
                  />
                </span>
                <span className="attention-weight-value">
                  {(weight * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <div className="attention-summary">
            {topTokens.map((item) => (
              <span key={item.token}>
                {item.token}: {(item.weight * 100).toFixed(1)}%
              </span>
            ))}
          </div>

          <div className="attention-output">
            <div className="attention-output-title">
              Context vector (head {headIndex + 1})
            </div>
            <div className="attention-output-bars">
              {attentionData?.context.map((value, dim) => (
                <div key={`${value}-${dim}`} className="attention-output-row">
                  <span className="attention-output-label">d{dim + 1}</span>
                  <span className="attention-output-track">
                    <span
                      className="attention-output-fill"
                      style={{
                        width: `${Math.round(
                          (Math.abs(value) / contextMax) * 100
                        )}%`,
                      }}
                    />
                  </span>
                  <span className="attention-output-value">
                    {value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
