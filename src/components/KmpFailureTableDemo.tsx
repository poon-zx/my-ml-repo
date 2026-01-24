"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PATTERN = "ABABC";
const MAX_PATTERN = 12;

type FailureEvent = {
  type: "init" | "compare" | "fallback" | "set";
  iIndex: number;
  jIndex: number;
  setIndex?: number;
  nextJ?: number;
  match?: boolean;
  filledUntil: number;
  b: number[];
  note: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const displayChar = (char: string) => (char === " " ? "[space]" : char);

function sanitizePattern(value: string) {
  return value.replace(/[\r\n\t]/g, " ").slice(0, MAX_PATTERN);
}

function buildFailureEvents(pattern: string) {
  const chars = Array.from(pattern);
  const m = chars.length;
  const b = Array.from({ length: m + 1 }, () => 0);
  const events: FailureEvent[] = [];
  let i = 0;
  let j = -1;
  let filledUntil = 0;
  b[0] = -1;

  events.push({
    type: "init",
    iIndex: -1,
    jIndex: -1,
    filledUntil,
    b: [...b],
    note: "Set b[0] = -1. Start with i=0, j=-1.",
  });

  while (i < m) {
    while (j >= 0 && chars[i] !== chars[j]) {
      events.push({
        type: "compare",
        iIndex: i,
        jIndex: j,
        match: false,
        filledUntil,
        b: [...b],
        note: `Compare pattern[${i}] and pattern[${j}]: mismatch.`,
      });
      const nextJ = b[j];
      events.push({
        type: "fallback",
        iIndex: i,
        jIndex: j,
        nextJ,
        filledUntil,
        b: [...b],
        note: `Fallback j from ${j} to b[${j}] = ${nextJ}.`,
      });
      j = nextJ;
    }

    if (j >= 0) {
      events.push({
        type: "compare",
        iIndex: i,
        jIndex: j,
        match: true,
        filledUntil,
        b: [...b],
        note: `Compare pattern[${i}] and pattern[${j}]: match.`,
      });
    }

    i += 1;
    j += 1;
    b[i] = j;
    filledUntil = i;
    events.push({
      type: "set",
      iIndex: i,
      jIndex: j,
      setIndex: i,
      filledUntil,
      b: [...b],
      note: `Advance to i=${i}, j=${j}. Set b[${i}] = ${j}.`,
    });
  }

  return { chars, events };
}

export default function KmpFailureTableDemo() {
  const [patternInput, setPatternInput] = useState(DEFAULT_PATTERN);
  const [stepIndex, setStepIndex] = useState(0);

  const { chars, events } = useMemo(
    () => buildFailureEvents(sanitizePattern(patternInput)),
    [patternInput]
  );

  const active = events[stepIndex];
  const displayI = active?.iIndex ?? -1;
  const displayJ = active?.jIndex ?? -1;
  const bLength = chars.length + 1;

  useEffect(() => {
    setStepIndex((current) => clamp(current, 0, Math.max(events.length - 1, 0)));
  }, [events.length]);

  const handleReset = () => {
    setPatternInput(DEFAULT_PATTERN);
    setStepIndex(0);
  };

  return (
    <section className="attention-demo kmp-demo">
      <header>
        <h3>Failure table builder</h3>
        <p>
          Step through how the failure table (b array) is built, including the
          fallback jumps after mismatches.
        </p>
      </header>

      <div className="kmp-demo-controls">
        <label className="attention-control">
          <span>Pattern (max {MAX_PATTERN} chars)</span>
          <input
            className="attention-input"
            type="text"
            value={patternInput}
            maxLength={MAX_PATTERN}
            onChange={(event) => {
              setPatternInput(sanitizePattern(event.target.value));
              setStepIndex(0);
            }}
          />
        </label>
      </div>

      <div className="kmp-demo-meta">
        <span>Length: {chars.length}</span>
        <span>Steps: {events.length}</span>
        <span>
          i={displayI >= 0 ? displayI : "—"}, j={displayJ >= 0 ? displayJ : "—"}
        </span>
        <span>
          Step: {Math.min(stepIndex + 1, events.length)} / {events.length}
        </span>
      </div>

      <div className="kmp-demo-actions">
        <button
          type="button"
          className="kmp-demo-button"
          onClick={() => setStepIndex((value) => clamp(value - 1, 0, events.length - 1))}
          disabled={stepIndex === 0}
        >
          Prev
        </button>
        <button
          type="button"
          className="kmp-demo-button"
          onClick={() => setStepIndex((value) => clamp(value + 1, 0, events.length - 1))}
          disabled={stepIndex >= events.length - 1}
        >
          Next
        </button>
        <button
          type="button"
          className="kmp-demo-button is-ghost"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      <label className="attention-slider">
        Step: {Math.min(stepIndex + 1, events.length)}
        <input
          type="range"
          min={0}
          max={Math.max(events.length - 1, 0)}
          step={1}
          value={stepIndex}
          onChange={(event) => setStepIndex(Number(event.target.value))}
          disabled={events.length === 0}
        />
      </label>

      {chars.length === 0 ? (
        <p className="empty-state">Enter a pattern to see the failure table.</p>
      ) : (
        <>
          <p className="kmp-demo-step">{active?.note}</p>

          <div className="kmp-demo-row">
            <div className="kmp-demo-row-label">Pattern</div>
            <div
              className="kmp-demo-grid"
              style={{
                gridTemplateColumns: `repeat(${chars.length}, minmax(56px, 1fr))`,
              }}
            >
              {chars.map((char, index) => {
                const isI = index === active?.iIndex;
                const isJ = index === active?.jIndex;
                const className = [
                  "kmp-demo-cell",
                  isI ? "is-i" : "",
                  isJ ? "is-j" : "",
                  isI && isJ ? "is-both" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={`pattern-${index}`} className={className}>
                    <span className="kmp-demo-index">i={index}</span>
                    <span className="kmp-demo-char">{displayChar(char)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="kmp-demo-row">
            <div className="kmp-demo-row-label">b[i]</div>
            <div
              className="kmp-demo-grid"
              style={{
                gridTemplateColumns: `repeat(${bLength}, minmax(56px, 1fr))`,
              }}
            >
              {Array.from({ length: bLength }, (_, index) => {
                const value =
                  active && index <= active.filledUntil ? active.b[index] : undefined;
                const className = [
                  "kmp-demo-cell",
                  index === active?.setIndex ? "is-set" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={`b-${index}`} className={className}>
                    <span className="kmp-demo-index">i={index}</span>
                    <span className="kmp-demo-char">
                      {value === undefined ? "—" : value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
