"use client";

import { useMemo, useState } from "react";

const PRESETS = [
  {
    key: "morning",
    label: "Morning routine",
    sentenceA: "I brewed coffee and reviewed the agenda.",
    sentenceB: "Then I walked to the office for the standup.",
  },
  {
    key: "science",
    label: "Science note",
    sentenceA: "Researchers trained a model on millions of documents.",
    sentenceB: "The resulting encoder improved question answering.",
  },
  {
    key: "travel",
    label: "Travel",
    sentenceA: "We arrived in Tokyo just after sunrise.",
    sentenceB: "The first stop was a quiet shrine near the river.",
  },
];

const EXTRA_NEGATIVES = [
  "The workshop closed early due to rain.",
  "A small cat chased a laser pointer around the room.",
  "The bakery ran out of bread before lunch.",
  "A meteor shower lit up the night sky.",
];

const MAX_TOKENS = 12;

function tokenize(text: string, limit: number) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { raw: [] as string[], tokens: [] as string[] };
  }
  const raw = trimmed.split(/\s+/);
  return { raw, tokens: raw.slice(0, limit) };
}

function nextRand(seed: number) {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: next, value: next / 2 ** 32 };
}

function pickNegative(seed: number, pool: string[], current: string) {
  if (pool.length === 0) {
    return { seed, sentence: current };
  }
  const roll = nextRand(seed);
  let index = Math.floor(roll.value * pool.length);
  if (pool.length > 1 && pool[index] === current) {
    index = (index + 1) % pool.length;
  }
  return { seed: roll.seed, sentence: pool[index] };
}

export default function BertNspDemo() {
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [sentenceA, setSentenceA] = useState(PRESETS[0].sentenceA);
  const [sentenceB, setSentenceB] = useState(PRESETS[0].sentenceB);
  const [label, setLabel] = useState<"isNext" | "notNext">("isNext");
  const seed = 7;

  const negativePool = useMemo(() => {
    const pool = PRESETS.map((item) => item.sentenceB).concat(EXTRA_NEGATIVES);
    return Array.from(new Set(pool));
  }, []);

  const negativeSentence = useMemo(
    () => pickNegative(seed, negativePool, sentenceB).sentence,
    [seed, negativePool, sentenceB]
  );

  const finalSentenceB = label === "isNext" ? sentenceB : negativeSentence;

  const tokensA = useMemo(() => tokenize(sentenceA, MAX_TOKENS), [sentenceA]);
  const tokensB = useMemo(() => tokenize(finalSentenceB, MAX_TOKENS), [finalSentenceB]);
  const isTrimmed = tokensA.raw.length > tokensA.tokens.length || tokensB.raw.length > tokensB.tokens.length;

  const combined = useMemo(() => {
    const tokens = ["[CLS]", ...tokensA.tokens, "[SEP]", ...tokensB.tokens, "[SEP]"];
    const splitIndex = tokensA.tokens.length + 1;
    const segments = tokens.map((_, index) => (index <= splitIndex ? 0 : 1));
    return { tokens, segments };
  }, [tokensA.tokens, tokensB.tokens]);

  return (
    <section className="attention-demo bert-demo">
      <header>
        <h3>Next sentence prediction playground</h3>
        <p>
          Toggle between IsNext and NotNext to see how sentence pairs and labels
          are constructed.
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
          <span>Sentence B (IsNext)</span>
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

      <div className="bert-demo-actions">
        <label className="bert-demo-toggle">
          <input
            type="radio"
            name="nsp-label"
            value="isNext"
            checked={label === "isNext"}
            onChange={() => setLabel("isNext")}
          />
          IsNext
        </label>
        <label className="bert-demo-toggle">
          <input
            type="radio"
            name="nsp-label"
            value="notNext"
            checked={label === "notNext"}
            onChange={() => setLabel("notNext")}
          />
          NotNext
        </label>
      </div>

      <div className="bert-demo-meta">
        <span>Label: {label === "isNext" ? "IsNext" : "NotNext"}</span>
        <span>
          Tokens: {tokensA.tokens.length + tokensB.tokens.length + 3}
        </span>
      </div>

      {isTrimmed && (
        <div className="attention-warning">
          Showing the first {MAX_TOKENS} tokens per sentence.
        </div>
      )}

      <div className="bert-demo-token-row">
        {combined.tokens.map((token, index) => {
          const isSpecial = token === "[CLS]" || token === "[SEP]";
          const segmentClass = combined.segments[index] === 0 ? "is-seg-a" : "is-seg-b";
          return (
            <span
              key={`${token}-${index}`}
              className={[
                "bert-demo-token",
                segmentClass,
                isSpecial ? "is-special" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {token}
            </span>
          );
        })}
      </div>
      <div className="bert-demo-meta">
        <span>Segment 0: [CLS] + sentence A + [SEP]</span>
        <span>Segment 1: sentence B + [SEP]</span>
      </div>
    </section>
  );
}
