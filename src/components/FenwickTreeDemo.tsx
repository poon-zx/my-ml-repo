"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_VALUES = [3, 2, 5, 1, 7, 4, 6, 2];
const DEFAULT_QUERY_INDEX = 6;
const DEFAULT_UPDATE_INDEX = 3;
const DEFAULT_DELTA = 2;

type QueryStep = {
  index: number;
  add: number;
  sum: number;
};

type LastAction =
  | {
      type: "query";
      index: number;
      sum: number;
      steps: QueryStep[];
    }
  | {
      type: "update";
      index: number;
      delta: number;
      path: number[];
    };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2);

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFenwick(values: number[]) {
  const n = values.length;
  const tree = Array.from({ length: n + 1 }, () => 0);
  for (let i = 1; i <= n; i += 1) {
    tree[i] += values[i - 1];
    const parent = i + (i & -i);
    if (parent <= n) {
      tree[parent] += tree[i];
    }
  }
  return tree;
}

function prefixTrace(index: number, tree: number[]) {
  let i = index;
  let sum = 0;
  const steps: QueryStep[] = [];
  while (i > 0) {
    const add = tree[i];
    sum += add;
    steps.push({ index: i, add, sum });
    i -= i & -i;
  }
  return { sum, steps };
}

function updatePath(index: number, n: number) {
  const path: number[] = [];
  let i = index;
  while (i <= n) {
    path.push(i);
    i += i & -i;
  }
  return path;
}

export default function FenwickTreeDemo() {
  const [values, setValues] = useState<number[]>(DEFAULT_VALUES);
  const [queryIndex, setQueryIndex] = useState(DEFAULT_QUERY_INDEX);
  const [updateIndex, setUpdateIndex] = useState(DEFAULT_UPDATE_INDEX);
  const [delta, setDelta] = useState(DEFAULT_DELTA);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  const n = values.length;
  const tree = useMemo(() => buildFenwick(values), [values]);

  useEffect(() => {
    setQueryIndex((current) => clamp(current, 1, n));
    setUpdateIndex((current) => clamp(current, 1, n));
  }, [n]);

  const highlighted = useMemo(() => {
    if (!lastAction) {
      return new Set<number>();
    }
    if (lastAction.type === "query") {
      return new Set(lastAction.steps.map((step) => step.index));
    }
    return new Set(lastAction.path);
  }, [lastAction]);

  const handleValueChange = (index: number, nextValue: string) => {
    const next = [...values];
    next[index] = parseNumber(nextValue);
    setValues(next);
    setLastAction(null);
  };

  const handleQuery = () => {
    const index = clamp(queryIndex, 1, n);
    const result = prefixTrace(index, tree);
    setLastAction({ type: "query", index, sum: result.sum, steps: result.steps });
  };

  const handleUpdate = () => {
    const index = clamp(updateIndex, 1, n);
    const next = [...values];
    next[index - 1] = next[index - 1] + delta;
    setValues(next);
    setLastAction({
      type: "update",
      index,
      delta,
      path: updatePath(index, n),
    });
  };

  const handleReset = () => {
    setValues(DEFAULT_VALUES);
    setQueryIndex(Math.min(DEFAULT_QUERY_INDEX, DEFAULT_VALUES.length));
    setUpdateIndex(Math.min(DEFAULT_UPDATE_INDEX, DEFAULT_VALUES.length));
    setDelta(DEFAULT_DELTA);
    setLastAction(null);
  };

  return (
    <section className="attention-demo fenwick-demo">
      <header>
        <h3>Fenwick tree playground</h3>
        <p>
          Edit the array, run prefix queries, and apply updates to see which tree
          indices get touched by the bit trick.
        </p>
      </header>

      <div className="fenwick-demo-meta">
        <span>Array size: {n}</span>
        <button type="button" className="fenwick-demo-button is-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="fenwick-demo-controls">
        <div className="fenwick-demo-control">
          <h4>Prefix sum query</h4>
          <label className="attention-control">
            <span>Index i: {queryIndex}</span>
            <input
              type="range"
              min={1}
              max={n}
              step={1}
              value={queryIndex}
              onChange={(event) => setQueryIndex(Number(event.target.value))}
            />
          </label>
          <div className="fenwick-demo-actions">
            <button type="button" className="fenwick-demo-button" onClick={handleQuery}>
              Run prefix query
            </button>
          </div>
          {lastAction?.type === "query" ? (
            <div className="fenwick-demo-result">
              <div>
                prefix({lastAction.index}) = {formatNumber(lastAction.sum)}
              </div>
              <ul className="fenwick-demo-steps">
                {lastAction.steps.map((step) => (
                  <li key={step.index} className="fenwick-demo-step">
                    i={step.index}: add tree[{step.index}] = {formatNumber(step.add)} → sum{" "}
                    {formatNumber(step.sum)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="fenwick-demo-hint">Run a query to reveal the traversal path.</p>
          )}
        </div>

        <div className="fenwick-demo-control">
          <h4>Point update</h4>
          <label className="attention-control">
            <span>Index i: {updateIndex}</span>
            <input
              type="range"
              min={1}
              max={n}
              step={1}
              value={updateIndex}
              onChange={(event) => setUpdateIndex(Number(event.target.value))}
            />
          </label>
          <label className="attention-control">
            <span>Delta: {delta}</span>
            <input
              className="fenwick-demo-input"
              type="number"
              step={1}
              value={delta}
              onChange={(event) => setDelta(parseNumber(event.target.value))}
            />
          </label>
          <div className="fenwick-demo-actions">
            <button type="button" className="fenwick-demo-button" onClick={handleUpdate}>
              Apply update
            </button>
          </div>
          {lastAction?.type === "update" ? (
            <div className="fenwick-demo-result">
              <div>
                update({lastAction.index},{" "}
                {lastAction.delta >= 0 ? `+${lastAction.delta}` : lastAction.delta}) touches{" "}
                {lastAction.path.join(" → ")}
              </div>
            </div>
          ) : (
            <p className="fenwick-demo-hint">Apply an update to highlight affected nodes.</p>
          )}
        </div>
      </div>

      <div className="fenwick-demo-grid">
        <div className="fenwick-demo-panel">
          <h4>Array (1-indexed)</h4>
          <div className="fenwick-demo-cells">
            {values.map((value, index) => {
              const labelIndex = index + 1;
              const isHighlighted = highlighted.has(labelIndex);
              return (
                <label
                  key={`array-${labelIndex}`}
                  className={[
                    "fenwick-demo-cell",
                    isHighlighted ? "is-highlight" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="fenwick-demo-index">i={labelIndex}</span>
                  <input
                    className="fenwick-demo-input"
                    type="number"
                    step={1}
                    value={value}
                    onChange={(event) => handleValueChange(index, event.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="fenwick-demo-panel">
          <h4>Fenwick tree (tree[i])</h4>
          <div className="fenwick-demo-cells">
            {tree.slice(1).map((value, index) => {
              const labelIndex = index + 1;
              const isHighlighted = highlighted.has(labelIndex);
              return (
                <div
                  key={`tree-${labelIndex}`}
                  className={[
                    "fenwick-demo-cell",
                    isHighlighted ? "is-highlight" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="fenwick-demo-index">i={labelIndex}</span>
                  <span className="fenwick-demo-value">{formatNumber(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="fenwick-demo-hint">
        Highlighted cells show the indices touched by the most recent query or update.
      </p>
    </section>
  );
}
