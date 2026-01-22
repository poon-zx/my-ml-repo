"use client";

import { useEffect, useMemo, useState } from "react";

const NUM_STATES = 5;
const ACTIONS = ["Left", "Right"] as const;
const START_STATE = 2;
const TERMINAL_LEFT = 0;
const TERMINAL_RIGHT = NUM_STATES - 1;

type Action = (typeof ACTIONS)[number];

type Transition = {
  state: number;
  action: number;
  reward: number;
  nextState: number;
  done: boolean;
};

type LastUpdate = {
  state: number;
  action: number;
  reward: number;
  nextState: number;
  done: boolean;
  decision: "explore" | "exploit";
  target: number;
  oldQ: number;
  newQ: number;
  batchCount: number;
};

const createQTable = () =>
  Array.from({ length: NUM_STATES }, () => Array.from({ length: ACTIONS.length }, () => 0));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number) => value.toFixed(2);

function chooseAction(qRow: number[], epsilon: number) {
  if (Math.random() < epsilon) {
    return { action: Math.floor(Math.random() * qRow.length), decision: "explore" as const };
  }
  const maxQ = Math.max(...qRow);
  const best = qRow
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value === maxQ)
    .map((entry) => entry.index);
  const action = best[Math.floor(Math.random() * best.length)];
  return { action, decision: "exploit" as const };
}

function environmentStep(state: number, action: number) {
  const nextState =
    action === 0 ? Math.max(TERMINAL_LEFT, state - 1) : Math.min(TERMINAL_RIGHT, state + 1);
  const done = nextState === TERMINAL_LEFT || nextState === TERMINAL_RIGHT;
  const reward = nextState === TERMINAL_RIGHT ? 1 : nextState === TERMINAL_LEFT ? -1 : 0;
  return { nextState, reward, done };
}

function sampleBatch(buffer: Transition[], batchSize: number) {
  if (buffer.length === 0) {
    return [];
  }
  const count = Math.min(batchSize, buffer.length);
  const indices = Array.from({ length: buffer.length }, (_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((index) => buffer[index]);
}

export default function DqnReplayDemo() {
  const [epsilon, setEpsilon] = useState(0.2);
  const [gamma, setGamma] = useState(0.9);
  const [alpha, setAlpha] = useState(0.3);
  const [batchSize, setBatchSize] = useState(4);
  const [capacity, setCapacity] = useState(20);
  const [qTable, setQTable] = useState<number[][]>(() => createQTable());
  const [buffer, setBuffer] = useState<Transition[]>([]);
  const [state, setState] = useState(START_STATE);
  const [lastUpdate, setLastUpdate] = useState<LastUpdate | null>(null);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    setBuffer((prev) => prev.slice(-capacity));
  }, [capacity]);

  const stateLabels = useMemo(() => Array.from({ length: NUM_STATES }, (_, i) => i), []);

  const runStep = (count: number) => {
    let nextState = state;
    let nextBuffer = [...buffer];
    let nextQTable = qTable.map((row) => [...row]);
    let nextSteps = steps;
    let latestUpdate: LastUpdate | null = null;

    for (let iter = 0; iter < count; iter += 1) {
      const { action, decision } = chooseAction(nextQTable[nextState], epsilon);
      const { nextState: envNext, reward, done } = environmentStep(nextState, action);
      const transition: Transition = {
        state: nextState,
        action,
        reward,
        nextState: envNext,
        done,
      };
      nextBuffer = [...nextBuffer, transition].slice(-capacity);

      const batch = sampleBatch(nextBuffer, batchSize);
      let updateRecord: LastUpdate | null = null;
      batch.forEach((sample) => {
        const maxNext = sample.done ? 0 : Math.max(...nextQTable[sample.nextState]);
        const target = sample.reward + gamma * maxNext;
        const oldQ = nextQTable[sample.state][sample.action];
        const newQ = oldQ + alpha * (target - oldQ);
        nextQTable[sample.state][sample.action] = newQ;
        updateRecord = {
          state: sample.state,
          action: sample.action,
          reward: sample.reward,
          nextState: sample.nextState,
          done: sample.done,
          decision,
          target,
          oldQ,
          newQ,
          batchCount: batch.length,
        };
      });

      latestUpdate = updateRecord;
      nextSteps += 1;
      nextState = done ? START_STATE : envNext;
    }

    setQTable(nextQTable);
    setBuffer(nextBuffer);
    setState(nextState);
    setSteps(nextSteps);
    setLastUpdate(latestUpdate);
  };

  const handleReset = () => {
    setQTable(createQTable());
    setBuffer([]);
    setState(START_STATE);
    setLastUpdate(null);
    setSteps(0);
  };

  return (
    <section className="attention-demo dqn-demo">
      <header>
        <h3>DQN replay playground</h3>
        <p>
          A tiny 1D world shows epsilon-greedy action choice, experience replay,
          and Bellman targets updating a small Q-table.
        </p>
      </header>

      <div className="dqn-demo-meta">
        <span>States: {NUM_STATES}</span>
        <span>Actions: {ACTIONS.join(" / ")}</span>
        <span>Step: {steps}</span>
      </div>

      <div className="dqn-demo-controls">
        <label className="attention-control">
          <span>Epsilon (explore): {epsilon.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={epsilon}
            onChange={(event) => setEpsilon(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Gamma (discount): {gamma.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={gamma}
            onChange={(event) => setGamma(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Alpha (learning rate): {alpha.toFixed(2)}</span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Replay batch size: {batchSize}</span>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={batchSize}
            onChange={(event) => setBatchSize(Number(event.target.value))}
          />
        </label>
        <label className="attention-control">
          <span>Replay capacity: {capacity}</span>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="dqn-demo-actions">
        <button type="button" className="dqn-demo-button" onClick={() => runStep(1)}>
          Step once
        </button>
        <button type="button" className="dqn-demo-button" onClick={() => runStep(5)}>
          Step ×5
        </button>
        <button type="button" className="dqn-demo-button is-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="dqn-demo-world" aria-label="Line world states">
        {stateLabels.map((label) => {
          const isAgent = label === state;
          const isTerminal = label === TERMINAL_LEFT || label === TERMINAL_RIGHT;
          const terminalLabel =
            label === TERMINAL_LEFT ? "Lose" : label === TERMINAL_RIGHT ? "Win" : "";
          return (
            <div
              key={label}
              className={[
                "dqn-demo-cell",
                isAgent ? "is-agent" : "",
                isTerminal ? "is-terminal" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>S{label}</span>
              {terminalLabel ? <span className="dqn-demo-terminal">{terminalLabel}</span> : null}
              {isAgent ? <span className="dqn-demo-agent">Agent</span> : null}
            </div>
          );
        })}
      </div>

      <div className="dqn-demo-panels">
        <div className="dqn-demo-panel">
          <h4>Replay buffer</h4>
          {buffer.length === 0 ? (
            <p className="dqn-demo-empty">No transitions yet. Take a step.</p>
          ) : (
            <ul className="dqn-demo-list">
              {buffer.slice(-6).map((item, index) => (
                <li key={`${item.state}-${item.action}-${index}`}>
                  s{item.state} → a{item.action} → r{item.reward} → s{item.nextState}
                  {item.done ? " (done)" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dqn-demo-panel">
          <h4>Q-table</h4>
          <div className="dqn-demo-qtable">
            <div className="dqn-demo-qheader">
              <span>State</span>
              {ACTIONS.map((action) => (
                <span key={action}>{action}</span>
              ))}
            </div>
            {qTable.map((row, rowIndex) => (
              <div
                key={`state-${rowIndex}`}
                className={[
                  "dqn-demo-qrow",
                  rowIndex === state ? "is-current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>s{rowIndex}</span>
                {row.map((value, actionIndex) => (
                  <span key={`${rowIndex}-${actionIndex}`}>{formatNumber(value)}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dqn-demo-update">
        <h4>Latest Bellman update</h4>
        {lastUpdate ? (
          <p>
            {lastUpdate.decision === "explore" ? "Explore" : "Exploit"} on s
            {lastUpdate.state} → a{lastUpdate.action}, reward {lastUpdate.reward},{" "}
            target {formatNumber(lastUpdate.target)} (batch {lastUpdate.batchCount}). Q
            becomes {formatNumber(lastUpdate.newQ)}.
          </p>
        ) : (
          <p className="dqn-demo-empty">No update yet.</p>
        )}
      </div>
    </section>
  );
}
