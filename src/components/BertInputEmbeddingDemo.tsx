"use client";

import { useEffect, useMemo, useState } from "react";

const PRESETS = [
  {
    key: "qa",
    label: "Question + answer",
    sentenceA: "Where do penguins live",
    sentenceB: "They live in the Southern Hemisphere",
  },
  {
    key: "news",
    label: "Headline + detail",
    sentenceA: "Researchers release a new language model",
    sentenceB: "It handles long documents with fewer parameters",
  },
  {
    key: "product",
    label: "Product + review",
    sentenceA: "The headphones blocked most of the city noise",
    sentenceB: "Battery life lasted through the entire flight",
  },
];

const MAX_TOKENS_PER = 8;
const EMBEDDING_DIM = 4;

const SEGMENT_EMBEDDINGS: Record<number, number[]> = {
  0: [0.12, -0.08, 0.05, -0.04],
  1: [-0.06, 0.1, -0.03, 0.08],
};

function tokenize(text: string, limit: number) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { raw: [] as string[], tokens: [] as string[] };
  }
  const raw = trimmed.split(/\s+/);
  return { raw, tokens: raw.slice(0, limit) };
}

function tokenEmbedding(token: string) {
  const base = Array.from(token).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 1),
    0
  );
  return Array.from({ length: EMBEDDING_DIM }, (_, dim) => {
    const angle = (base + 1) * (dim + 1);
    return Number((Math.sin(angle * 0.17) + Math.cos(angle * 0.11)).toFixed(2));
  });
}

function positionEmbedding(position: number) {
  return Array.from({ length: EMBEDDING_DIM }, (_, dim) => {
    const angle = (position + 1) * (dim + 2);
    return Number((Math.sin(angle * 0.19) + Math.cos(angle * 0.13)).toFixed(2));
  });
}

function sumVectors(a: number[], b: number[], c: number[]) {
  return a.map((value, index) => Number((value + b[index] + c[index]).toFixed(2)));
}

export default function BertInputEmbeddingDemo() {
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [sentenceA, setSentenceA] = useState(PRESETS[0].sentenceA);
  const [sentenceB, setSentenceB] = useState(PRESETS[0].sentenceB);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tokensA = useMemo(() => tokenize(sentenceA, MAX_TOKENS_PER), [sentenceA]);
  const tokensB = useMemo(() => tokenize(sentenceB, MAX_TOKENS_PER), [sentenceB]);

  const isTrimmed = tokensA.raw.length > tokensA.tokens.length || tokensB.raw.length > tokensB.tokens.length;

  const tokenData = useMemo(() => {
    const tokens = ["[CLS]", ...tokensA.tokens, "[SEP]", ...tokensB.tokens, "[SEP]"];
    const splitIndex = tokensA.tokens.length + 1;
    return tokens.map((token, index) => {
      const segmentId = index <= splitIndex ? 0 : 1;
      const tokenVec = tokenEmbedding(token);
      const segmentVec = SEGMENT_EMBEDDINGS[segmentId];
      const positionVec = positionEmbedding(index);
      const sumVec = sumVectors(tokenVec, segmentVec, positionVec);
      return {
        token,
        index,
        segmentId,
        position: index,
        tokenVec,
        segmentVec,
        positionVec,
        sumVec,
      };
    });
  }, [tokensA.tokens, tokensB.tokens]);

  useEffect(() => {
    if (tokenData.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= tokenData.length) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, tokenData.length]);

  const selected = tokenData[selectedIndex];
  const sumMax = selected
    ? Math.max(...selected.sumVec.map((value) => Math.abs(value)), 1)
    : 1;

  const embeddingRows = selected
    ? [
        { label: "Token", values: selected.tokenVec },
        { label: "Segment", values: selected.segmentVec },
        { label: "Position", values: selected.positionVec },
        { label: "Sum", values: selected.sumVec },
      ]
    : [];

  return (
    <section className="attention-demo bert-demo">
      <header>
        <h3>Input representation playground</h3>
        <p>
          Inspect how token, segment, and position embeddings combine for a
          selected token.
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
                setSentenceA(preset.sentenceA);
                setSentenceB(preset.sentenceB);
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
          <span>Sentence A</span>
          <textarea
            className="attention-input"
            rows={2}
            value={sentenceA}
            onChange={(event) => {
              setSentenceA(event.target.value);
              if (presetKey !== "custom") {
                setPresetKey("custom");
              }
            }}
          />
        </label>

        <label className="attention-control">
          <span>Sentence B</span>
          <textarea
            className="attention-input"
            rows={2}
            value={sentenceB}
            onChange={(event) => {
              setSentenceB(event.target.value);
              if (presetKey !== "custom") {
                setPresetKey("custom");
              }
            }}
          />
        </label>
      </div>

      <div className="bert-demo-meta">
        <span>Total tokens: {tokenData.length}</span>
        <span>Embedding dim: {EMBEDDING_DIM}</span>
      </div>

      {isTrimmed && (
        <div className="attention-warning">
          Showing the first {MAX_TOKENS_PER} tokens per sentence.
        </div>
      )}

      <div className="bert-demo-token-row">
        {tokenData.map((entry) => {
          const isSpecial = entry.token === "[CLS]" || entry.token === "[SEP]";
          const segmentClass = entry.segmentId === 0 ? "is-seg-a" : "is-seg-b";
          const isActive = entry.index === selectedIndex;
          return (
            <button
              key={`${entry.token}-${entry.index}`}
              type="button"
              className={[
                "bert-demo-token",
                segmentClass,
                isSpecial ? "is-special" : "",
                isActive ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSelectedIndex(entry.index)}
            >
              {entry.token}
            </button>
          );
        })}
      </div>

      <table className="bert-demo-table bert-demo-index-table">
        <thead>
          <tr>
            <th>Index</th>
            <th>Token</th>
            <th>Segment</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {tokenData.map((entry) => (
            <tr
              key={`${entry.token}-${entry.index}`}
              className={entry.index === selectedIndex ? "is-selected" : ""}
            >
              <td>{entry.index}</td>
              <td>{entry.token}</td>
              <td>{entry.segmentId}</td>
              <td>{entry.position}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <div className="bert-demo-embed">
          <div className="bert-demo-meta">
            <span>Selected token: {selected.token}</span>
            <span>Segment: {selected.segmentId}</span>
            <span>Position: {selected.position}</span>
          </div>

          <div className="bert-demo-embed-grid">
            <div className="bert-demo-embed-header">Component</div>
            {selected.sumVec.map((_, dim) => (
              <div key={`head-${dim}`} className="bert-demo-embed-header">
                d{dim + 1}
              </div>
            ))}
            {embeddingRows.map((row) => (
              <div className="bert-demo-embed-row" key={row.label}>
                <div className="bert-demo-embed-label">{row.label}</div>
                {row.values.map((value, dim) => (
                  <div className="bert-demo-embed-cell" key={`${row.label}-${dim}`}>
                    {value.toFixed(2)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="bert-demo-embed-bars">
            {selected.sumVec.map((value, dim) => (
              <div key={`sum-${dim}`} className="bert-demo-embed-bar">
                <span className="bert-demo-embed-label">d{dim + 1}</span>
                <span className="attention-output-track">
                  <span
                    className="attention-output-fill"
                    style={{
                      width: `${Math.round((Math.abs(value) / sumMax) * 100)}%`,
                    }}
                  />
                </span>
                <span className="bert-demo-embed-value">{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
