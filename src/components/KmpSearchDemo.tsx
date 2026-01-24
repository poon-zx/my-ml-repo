"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_TEXT = "ABABDABABCABAB";
const DEFAULT_PATTERN = "ABABC";
const MAX_TEXT = 24;
const MAX_PATTERN = 12;

type SearchEvent = {
  type: "init" | "compare" | "fallback" | "advance" | "found";
  textIndex: number;
  patternIndex: number;
  prevPatternIndex?: number;
  match?: boolean;
  matchIndex?: number;
  matches: number[];
  note: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const displayChar = (char: string) => (char === " " ? "[space]" : char);

function sanitizeInput(value: string, maxLength: number) {
  return value.replace(/[\r\n\t]/g, " ").slice(0, maxLength);
}

function buildFailureTable(pattern: string) {
  const chars = Array.from(pattern);
  const m = chars.length;
  const b = Array.from({ length: m + 1 }, () => 0);
  let i = 0;
  let j = -1;
  b[0] = -1;
  while (i < m) {
    while (j >= 0 && chars[i] !== chars[j]) {
      j = b[j];
    }
    i += 1;
    j += 1;
    b[i] = j;
  }
  return b;
}

function buildSearchEvents(text: string, pattern: string) {
  const textChars = Array.from(text);
  const patternChars = Array.from(pattern);
  const n = textChars.length;
  const m = patternChars.length;
  const b = buildFailureTable(pattern);
  const events: SearchEvent[] = [];
  const matches: number[] = [];
  let i = 0;
  let j = 0;

  events.push({
    type: "init",
    textIndex: 0,
    patternIndex: 0,
    matches: [],
    note: "Start at i=0, j=0.",
  });

  if (n === 0 || m === 0) {
    return { events, b };
  }

  while (i < n) {
    while (j >= 0 && textChars[i] !== patternChars[j]) {
      events.push({
        type: "compare",
        textIndex: i,
        patternIndex: j,
        match: false,
        matches: [...matches],
        note: `Compare text[${i}]=${displayChar(textChars[i])} and pattern[${j}]=${displayChar(
          patternChars[j]
        )}: mismatch.`,
      });
      const nextJ = b[j];
      events.push({
        type: "fallback",
        textIndex: i,
        patternIndex: nextJ,
        prevPatternIndex: j,
        matches: [...matches],
        note: `Fallback j from ${j} to b[${j}] = ${nextJ}.`,
      });
      j = nextJ;
    }

    if (j >= 0) {
      events.push({
        type: "compare",
        textIndex: i,
        patternIndex: j,
        match: true,
        matches: [...matches],
        note: `Compare text[${i}]=${displayChar(textChars[i])} and pattern[${j}]=${displayChar(
          patternChars[j]
        )}: match.`,
      });
    }

    i += 1;
    j += 1;
    events.push({
      type: "advance",
      textIndex: i,
      patternIndex: j,
      matches: [...matches],
      note: `Advance to i=${i}, j=${j}.`,
    });

    if (j === m) {
      const matchIndex = i - j;
      matches.push(matchIndex);
      events.push({
        type: "found",
        textIndex: i,
        patternIndex: j,
        matchIndex,
        matches: [...matches],
        note: `Found match starting at index ${matchIndex}.`,
      });
      const nextJ = b[j];
      events.push({
        type: "fallback",
        textIndex: i,
        patternIndex: nextJ,
        prevPatternIndex: j,
        matches: [...matches],
        note: `Continue with j = b[${j}] = ${nextJ}.`,
      });
      j = nextJ;
    }
  }

  return { events, b };
}

function buildFoundIndexSet(matches: number[], patternLength: number, textLength: number) {
  const found = new Set<number>();
  if (patternLength === 0) {
    return found;
  }
  matches.forEach((start) => {
    for (let offset = 0; offset < patternLength; offset += 1) {
      const index = start + offset;
      if (index < textLength) {
        found.add(index);
      }
    }
  });
  return found;
}

export default function KmpSearchDemo() {
  const [textInput, setTextInput] = useState(DEFAULT_TEXT);
  const [patternInput, setPatternInput] = useState(DEFAULT_PATTERN);
  const [stepIndex, setStepIndex] = useState(0);

  const sanitizedText = sanitizeInput(textInput, MAX_TEXT);
  const sanitizedPattern = sanitizeInput(patternInput, MAX_PATTERN);

  const { events, b } = useMemo(
    () => buildSearchEvents(sanitizedText, sanitizedPattern),
    [sanitizedText, sanitizedPattern]
  );

  const active = events[stepIndex];
  const displayI = active?.textIndex ?? -1;
  const displayJ = active?.patternIndex ?? -1;
  const textChars = Array.from(sanitizedText);
  const patternChars = Array.from(sanitizedPattern);
  const bLength = patternChars.length + 1;

  useEffect(() => {
    setStepIndex((current) => clamp(current, 0, Math.max(events.length - 1, 0)));
  }, [events.length]);

  const alignment =
    active && active.patternIndex >= 0
      ? active.textIndex - active.patternIndex
      : active?.textIndex ?? 0;
  const matchedLength =
    active && active.patternIndex > 0
      ? Math.min(active.patternIndex, patternChars.length)
      : 0;
  const matchedStart = Math.max(alignment, 0);
  const matchedEnd = matchedStart + matchedLength - 1;

  const foundIndices = buildFoundIndexSet(
    active?.matches ?? [],
    patternChars.length,
    textChars.length
  );

  const handleReset = () => {
    setTextInput(DEFAULT_TEXT);
    setPatternInput(DEFAULT_PATTERN);
    setStepIndex(0);
  };

  return (
    <section className="attention-demo kmp-demo">
      <header>
        <h3>KMP search walkthrough</h3>
        <p>
          Walk through the matching phase and watch how the failure table shifts the
          pattern on mismatches.
        </p>
      </header>

      <div className="kmp-demo-controls">
        <label className="attention-control">
          <span>Text (max {MAX_TEXT} chars)</span>
          <input
            className="attention-input"
            type="text"
            value={textInput}
            maxLength={MAX_TEXT}
            onChange={(event) => {
              setTextInput(sanitizeInput(event.target.value, MAX_TEXT));
              setStepIndex(0);
            }}
          />
        </label>
        <label className="attention-control">
          <span>Pattern (max {MAX_PATTERN} chars)</span>
          <input
            className="attention-input"
            type="text"
            value={patternInput}
            maxLength={MAX_PATTERN}
            onChange={(event) => {
              setPatternInput(sanitizeInput(event.target.value, MAX_PATTERN));
              setStepIndex(0);
            }}
          />
        </label>
      </div>

      <div className="kmp-demo-meta">
        <span>Text length: {textChars.length}</span>
        <span>Pattern length: {patternChars.length}</span>
        <span>Matches: {active?.matches.length ?? 0}</span>
        <span>
          i={displayI >= 0 ? displayI : "—"}, j={displayJ >= 0 ? displayJ : "—"}
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

      {textChars.length === 0 || patternChars.length === 0 ? (
        <p className="empty-state">Enter both a text and a pattern to begin.</p>
      ) : (
        <>
          <p className="kmp-demo-step">{active?.note}</p>

          <div className="kmp-demo-row">
            <div className="kmp-demo-row-label">Failure table</div>
            <div
              className="kmp-demo-grid"
              style={{
                gridTemplateColumns: `repeat(${bLength}, minmax(56px, 1fr))`,
              }}
            >
              {Array.from({ length: bLength }, (_, index) => {
                const value = b[index];
                const isPointer = active?.patternIndex === index;
                const isFallbackFrom =
                  active?.type === "fallback" && active.prevPatternIndex === index;
                const isFallbackTo =
                  active?.type === "fallback" && active.patternIndex === index;
                const className = [
                  "kmp-demo-cell",
                  isPointer ? "is-pointer" : "",
                  isFallbackFrom ? "is-fallback-from" : "",
                  isFallbackTo ? "is-fallback-to" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={`b-${index}`} className={className}>
                    <span className="kmp-demo-index">i={index}</span>
                    <span className="kmp-demo-char">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="kmp-demo-row">
            <div className="kmp-demo-row-label">Text</div>
            <div
              className="kmp-demo-grid"
              style={{
                gridTemplateColumns: `repeat(${textChars.length}, minmax(56px, 1fr))`,
              }}
            >
              {textChars.map((char, index) => {
                const isCurrent = active?.type === "compare" && index === active.textIndex;
                const isMatch = isCurrent && active.match === true;
                const isMismatch = isCurrent && active.match === false;
                const isMatched =
                  matchedLength > 0 && index >= matchedStart && index <= matchedEnd;
                const isFound = foundIndices.has(index);
                const className = [
                  "kmp-demo-cell",
                  isFound ? "is-found" : "",
                  isMatched ? "is-matched" : "",
                  isCurrent ? "is-current" : "",
                  isMatch ? "is-match" : "",
                  isMismatch ? "is-mismatch" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={`text-${index}`} className={className}>
                    <span className="kmp-demo-index">i={index}</span>
                    <span className="kmp-demo-char">{displayChar(char)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="kmp-demo-row">
            <div className="kmp-demo-row-label">Pattern</div>
            <div
              className="kmp-demo-grid"
              style={{
                gridTemplateColumns: `repeat(${textChars.length}, minmax(56px, 1fr))`,
              }}
            >
              {textChars.map((_, textIndex) => {
                const patternIndex = textIndex - alignment;
                const hasChar =
                  patternIndex >= 0 && patternIndex < patternChars.length;
                const isCurrent =
                  active?.type === "compare" && patternIndex === active.patternIndex;
                const isMatch = isCurrent && active.match === true;
                const isMismatch = isCurrent && active.match === false;
                const isMatched =
                  matchedLength > 0 &&
                  patternIndex >= 0 &&
                  patternIndex < matchedLength;
                const className = [
                  "kmp-demo-cell",
                  hasChar ? "" : "is-empty",
                  isMatched ? "is-matched" : "",
                  isCurrent ? "is-current" : "",
                  isMatch ? "is-match" : "",
                  isMismatch ? "is-mismatch" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div key={`pattern-${textIndex}`} className={className}>
                    <span className="kmp-demo-index">
                      {hasChar ? `i=${patternIndex}` : ""}
                    </span>
                    <span className="kmp-demo-char">
                      {hasChar ? displayChar(patternChars[patternIndex]) : ""}
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
