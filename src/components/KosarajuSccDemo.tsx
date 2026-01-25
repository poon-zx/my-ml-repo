"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useMemo, useState } from "react";

type GraphPreset = {
  id: string;
  name: string;
  description: string;
  nodes: string[];
  edges: Array<[number, number]>;
};

type Frame = {
  phase: "pass1" | "reverse" | "pass2" | "done";
  note: string;
  activeNode: number | null;
  activeEdge: [number, number] | null;
  stack: number[];
  visited1: boolean[];
  finishOrder: number[];
  visited2: boolean[];
  sccs: number[][];
  currentComponent: number[];
  order: number[];
  orderIndex: number;
};

const PRESETS: GraphPreset[] = [
  {
    id: "bridge",
    name: "Two SCCs with a bridge",
    description: "Two cycles connected by a one-way bridge.",
    nodes: ["A", "B", "C", "D", "E", "F"],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 3],
    ],
  },
  {
    id: "triple",
    name: "Three SCCs in a chain",
    description: "Three SCCs linked by one-way edges.",
    nodes: ["A", "B", "C", "D", "E", "F", "G"],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 3],
      [4, 5],
      [5, 6],
      [6, 5],
    ],
  },
];

const COMPONENT_STYLES = [
  { fill: "rgba(138, 106, 70, 0.22)", stroke: "rgba(138, 106, 70, 0.7)" },
  { fill: "rgba(115, 133, 89, 0.22)", stroke: "rgba(115, 133, 89, 0.7)" },
  { fill: "rgba(90, 115, 150, 0.22)", stroke: "rgba(90, 115, 150, 0.7)" },
  { fill: "rgba(150, 90, 120, 0.22)", stroke: "rgba(150, 90, 120, 0.7)" },
  { fill: "rgba(120, 110, 70, 0.22)", stroke: "rgba(120, 110, 70, 0.7)" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function buildAdjacency(n: number, edges: Array<[number, number]>) {
  const adj = Array.from({ length: n }, () => [] as number[]);
  edges.forEach(([from, to]) => {
    adj[from].push(to);
  });
  return adj;
}

function reverseEdges(edges: Array<[number, number]>) {
  return edges.map(([from, to]) => [to, from] as [number, number]);
}

function buildFrames(preset: GraphPreset) {
  const n = preset.nodes.length;
  const adj = buildAdjacency(n, preset.edges);
  const reversedEdges = reverseEdges(preset.edges);
  const radj = buildAdjacency(n, reversedEdges);

  const visited1 = Array.from({ length: n }, () => false);
  const visited2 = Array.from({ length: n }, () => false);
  const finishOrder: number[] = [];
  const sccs: number[][] = [];
  let currentComponent: number[] = [];
  let stack: number[] = [];
  let phase: Frame["phase"] = "pass1";
  let activeNode: number | null = null;
  let activeEdge: [number, number] | null = null;
  let order: number[] = [];
  let orderIndex = -1;

  const frames: Frame[] = [];

  const pushFrame = (note: string) => {
    frames.push({
      phase,
      note,
      activeNode,
      activeEdge,
      stack: [...stack],
      visited1: [...visited1],
      finishOrder: [...finishOrder],
      visited2: [...visited2],
      sccs: sccs.map((component) => [...component]),
      currentComponent: [...currentComponent],
      order: [...order],
      orderIndex,
    });
  };

  const label = (index: number) => preset.nodes[index] ?? `${index}`;

  const dfs1 = (node: number) => {
    visited1[node] = true;
    stack.push(node);
    activeNode = node;
    activeEdge = null;
    pushFrame(`Pass 1: visit ${label(node)}.`);

    adj[node].forEach((next) => {
      activeEdge = [node, next];
      activeNode = node;
      pushFrame(`Pass 1: follow edge ${label(node)} -> ${label(next)}.`);
      if (!visited1[next]) {
        dfs1(next);
      }
    });

    stack.pop();
    finishOrder.push(node);
    activeNode = node;
    activeEdge = null;
    pushFrame(`Pass 1: finish ${label(node)} and push to order.`);
  };

  for (let i = 0; i < n; i += 1) {
    if (!visited1[i]) {
      activeNode = i;
      activeEdge = null;
      pushFrame(`Pass 1: start DFS from ${label(i)}.`);
      dfs1(i);
    }
  }

  phase = "reverse";
  order = [...finishOrder].reverse();
  stack = [];
  activeNode = null;
  activeEdge = null;
  orderIndex = -1;
  pushFrame(`Reverse graph and process nodes by finish order: ${order.map(label).join(", ")}.`);

  phase = "pass2";
  order.forEach((node, index) => {
    orderIndex = index;
    if (visited2[node]) {
      activeNode = node;
      activeEdge = null;
      pushFrame(`Pass 2: ${label(node)} already assigned, skip.`);
      return;
    }

    currentComponent = [];
    stack = [];
    activeNode = node;
    activeEdge = null;
    pushFrame(`Pass 2: start new SCC from ${label(node)}.`);

    const dfs2 = (start: number) => {
      visited2[start] = true;
      currentComponent.push(start);
      stack.push(start);
      activeNode = start;
      activeEdge = null;
      pushFrame(`Pass 2: add ${label(start)} to current SCC.`);

      radj[start].forEach((next) => {
        activeEdge = [start, next];
        activeNode = start;
        pushFrame(`Pass 2: follow reversed edge ${label(start)} -> ${label(next)}.`);
        if (!visited2[next]) {
          dfs2(next);
        }
      });

      stack.pop();
      activeNode = start;
      activeEdge = null;
      pushFrame(`Pass 2: finish ${label(start)} in this SCC.`);
    };

    dfs2(node);
    sccs.push([...currentComponent]);
    stack = [];
    activeNode = node;
    activeEdge = null;
    pushFrame(
      `Pass 2: complete SCC #${sccs.length}: ${currentComponent.map(label).join(", ")}.`
    );
  });

  phase = "done";
  activeNode = null;
  activeEdge = null;
  stack = [];
  orderIndex = order.length - 1;
  pushFrame(`All SCCs discovered. Total: ${sccs.length}.`);

  return { frames, reversedEdges };
}

function buildCircularLayout(count: number) {
  const centerX = 160;
  const centerY = 120;
  const radius = 78;
  return Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

export default function KosarajuSccDemo() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const markerId = useId();

  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0];
  const { frames, reversedEdges } = useMemo(() => buildFrames(preset), [preset]);
  const frame = frames[stepIndex] ?? frames[0];

  useEffect(() => {
    setStepIndex(0);
  }, [presetId]);

  useEffect(() => {
    setStepIndex((current) => clamp(current, 0, Math.max(frames.length - 1, 0)));
  }, [frames.length]);

  const nodes = preset.nodes;
  const layout = useMemo(() => buildCircularLayout(nodes.length), [nodes.length]);
  const displayEdges =
    frame?.phase === "pass1" ? preset.edges : reversedEdges ?? preset.edges;

  const originalAdj = useMemo(
    () => buildAdjacency(nodes.length, preset.edges),
    [nodes.length, preset.edges]
  );
  const reversedAdj = useMemo(
    () => buildAdjacency(nodes.length, reversedEdges ?? reverseEdges(preset.edges)),
    [nodes.length, preset.edges, reversedEdges]
  );

  const componentIndexByNode = useMemo(() => {
    const map = new Map<number, number>();
    frame?.sccs.forEach((component, index) => {
      component.forEach((node) => map.set(node, index));
    });
    if (frame?.currentComponent.length) {
      const currentIndex = frame.sccs.length;
      frame.currentComponent.forEach((node) => {
        if (!map.has(node)) {
          map.set(node, currentIndex);
        }
      });
    }
    return map;
  }, [frame]);

  const label = (index: number) => nodes[index] ?? `${index}`;

  const renderAdjacency = (adj: number[][]) => (
    <div className="kosaraju-demo-adj-list">
      {adj.map((neighbors, nodeIndex) => {
        const isActive = frame?.activeNode === nodeIndex;
        const rowClass = [
          "kosaraju-demo-adj-row",
          isActive ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={`adj-${nodeIndex}`} className={rowClass}>
            <span className="kosaraju-demo-adj-node">{label(nodeIndex)}</span>
            <span className="kosaraju-demo-adj-arrow">-&gt;</span>
            <div className="kosaraju-demo-adj-neighbors">
              {neighbors.length === 0 ? (
                <span className="kosaraju-demo-adj-empty">none</span>
              ) : (
                neighbors.map((neighbor) => {
                  const isEdgeActive =
                    frame?.activeEdge?.[0] === nodeIndex &&
                    frame?.activeEdge?.[1] === neighbor;
                  return (
                    <span
                      key={`adj-${nodeIndex}-${neighbor}`}
                      className={[
                        "kosaraju-demo-chip",
                        isEdgeActive ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {label(neighbor)}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const phaseLabel =
    frame?.phase === "pass1"
      ? "Pass 1 (finish order)"
      : frame?.phase === "reverse"
        ? "Graph reversal"
        : frame?.phase === "pass2"
          ? "Pass 2 (collect SCCs)"
          : "Done";

  const graphLabel =
    frame?.phase === "pass1" ? "Original graph" : "Reversed graph";

  return (
    <section className="attention-demo kosaraju-demo">
      <header>
        <h3>Kosaraju walkthrough</h3>
        <p>
          Step through both DFS passes, watch the finish order stack form, and see
          how SCCs appear in the reversed graph.
        </p>
      </header>

      <div className="kosaraju-demo-controls">
        <label className="attention-control">
          <span>Graph preset</span>
          <select
            className="attention-select"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
          >
            {PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <div className="kosaraju-demo-description">
          <span>{preset.description}</span>
        </div>
      </div>

      <div className="kosaraju-demo-meta">
        <span>Phase: {phaseLabel}</span>
        <span>View: {graphLabel}</span>
        <span>
          Step: {Math.min(stepIndex + 1, frames.length)} / {frames.length}
        </span>
        <span>Finish stack size: {frame?.finishOrder.length ?? 0}</span>
        <span>SCCs found: {frame?.sccs.length ?? 0}</span>
      </div>

      <div className="kosaraju-demo-actions">
        <button
          type="button"
          className="kmp-demo-button"
          onClick={() => setStepIndex((value) => clamp(value - 1, 0, frames.length - 1))}
          disabled={stepIndex === 0}
        >
          Prev
        </button>
        <button
          type="button"
          className="kmp-demo-button"
          onClick={() => setStepIndex((value) => clamp(value + 1, 0, frames.length - 1))}
          disabled={stepIndex >= frames.length - 1}
        >
          Next
        </button>
        <button
          type="button"
          className="kmp-demo-button is-ghost"
          onClick={() => setStepIndex(0)}
        >
          Reset
        </button>
      </div>

      <label className="attention-slider">
        Step: {Math.min(stepIndex + 1, frames.length)}
        <input
          type="range"
          min={0}
          max={Math.max(frames.length - 1, 0)}
          step={1}
          value={stepIndex}
          onChange={(event) => setStepIndex(Number(event.target.value))}
          disabled={frames.length === 0}
        />
      </label>

      <p className="kosaraju-demo-step">{frame?.note}</p>

      <div className="kosaraju-demo-panels">
        <div className="kosaraju-demo-panel">
          <h4>{graphLabel}</h4>
          <svg className="kosaraju-demo-graph" viewBox="0 0 320 240">
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {displayEdges.map(([from, to], index) => {
              const start = layout[from];
              const end = layout[to];
              if (!start || !end) {
                return null;
              }
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const unitX = dx / length;
              const unitY = dy / length;
              const radius = 16;
              const offsetX = unitX * radius;
              const offsetY = unitY * radius;
              const x1 = start.x + offsetX;
              const y1 = start.y + offsetY;
              const x2 = end.x - offsetX;
              const y2 = end.y - offsetY;
              const isActive =
                frame?.activeEdge?.[0] === from && frame?.activeEdge?.[1] === to;
              const edgeClass = [
                "kosaraju-demo-edge",
                isActive ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <line
                  key={`edge-${from}-${to}-${index}`}
                  className={edgeClass}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}

            {layout.map((position, index) => {
              const isActive = frame?.activeNode === index;
              const isInStack = frame?.stack.includes(index) ?? false;
              const isVisited = frame?.visited1[index] ?? false;
              const componentIndex = componentIndexByNode.get(index);
              const componentStyle =
                componentIndex !== undefined
                  ? COMPONENT_STYLES[componentIndex % COMPONENT_STYLES.length]
                  : null;
              const circleClass = [
                "kosaraju-demo-node",
                isVisited ? "is-visited" : "",
                isInStack ? "is-stack" : "",
                isActive ? "is-active" : "",
                componentIndex !== undefined ? "is-assigned" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g key={`node-${index}`}>
                  <circle
                    className={circleClass}
                    cx={position.x}
                    cy={position.y}
                    r={16}
                    style={
                      componentStyle
                        ? ({
                            "--component-fill": componentStyle.fill,
                            "--component-stroke": componentStyle.stroke,
                          } as CSSProperties)
                        : undefined
                    }
                  />
                  <text
                    className="kosaraju-demo-node-text"
                    x={position.x}
                    y={position.y + 4}
                    textAnchor="middle"
                  >
                    {label(index)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="kosaraju-demo-legend">
            <span className="kosaraju-demo-legend-item">
              <span className="kosaraju-demo-legend-dot is-visited" /> visited
            </span>
            <span className="kosaraju-demo-legend-item">
              <span className="kosaraju-demo-legend-dot is-stack" /> DFS stack
            </span>
            <span className="kosaraju-demo-legend-item">
              <span className="kosaraju-demo-legend-dot is-active" /> active
            </span>
            <span className="kosaraju-demo-legend-item">
              <span className="kosaraju-demo-legend-dot is-scc" /> SCC assigned
            </span>
          </div>
        </div>

        <div className="kosaraju-demo-panel">
          <h4>Adjacency lists</h4>
          <div className="kosaraju-demo-adj-columns">
            <div>
              <h5>Original</h5>
              {renderAdjacency(originalAdj)}
            </div>
            <div>
              <h5>Reversed</h5>
              {renderAdjacency(reversedAdj)}
            </div>
          </div>
        </div>
      </div>

      <div className="kosaraju-demo-panels">
        <div className="kosaraju-demo-panel">
          <h4>Finish order (bottom to top)</h4>
          <div className="kosaraju-demo-chips">
            {(frame?.finishOrder.length ?? 0) === 0 ? (
              <span className="empty-state">Finish order is empty.</span>
            ) : (
              frame?.finishOrder.map((node) => (
                <span key={`finish-${node}`} className="kosaraju-demo-chip">
                  {label(node)}
                </span>
              ))
            )}
          </div>
          <h4>Processing order (top to bottom)</h4>
          <div className="kosaraju-demo-chips">
            {(frame?.order.length ?? 0) === 0 ? (
              <span className="empty-state">Finish order not ready yet.</span>
            ) : (
              frame?.order.map((node, index) => (
                <span
                  key={`order-${node}-${index}`}
                  className={[
                    "kosaraju-demo-chip",
                    frame?.orderIndex === index ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {label(node)}
                </span>
              ))
            )}
          </div>
          <h4>DFS stack</h4>
          <div className="kosaraju-demo-chips">
            {(frame?.stack.length ?? 0) === 0 ? (
              <span className="empty-state">Stack is empty.</span>
            ) : (
              frame?.stack.map((node) => (
                <span key={`stack-${node}`} className="kosaraju-demo-chip is-stack">
                  {label(node)}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="kosaraju-demo-panel">
          <h4>Strongly connected components</h4>
          <div className="kosaraju-demo-components">
            {(frame?.sccs.length ?? 0) === 0 ? (
              <span className="empty-state">No SCCs finalized yet.</span>
            ) : (
              frame?.sccs.map((component, index) => (
                <div key={`scc-${index}`} className="kosaraju-demo-component">
                  <span className="kosaraju-demo-component-title">
                    SCC #{index + 1}
                  </span>
                  <div className="kosaraju-demo-chips">
                    {component.map((node) => (
                      <span key={`scc-${index}-${node}`} className="kosaraju-demo-chip">
                        {label(node)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            {frame?.currentComponent.length ? (
              <div className="kosaraju-demo-component is-current">
                <span className="kosaraju-demo-component-title">
                  SCC #{(frame?.sccs.length ?? 0) + 1} (in progress)
                </span>
                <div className="kosaraju-demo-chips">
                  {frame.currentComponent.map((node) => (
                    <span key={`current-${node}`} className="kosaraju-demo-chip is-stack">
                      {label(node)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
