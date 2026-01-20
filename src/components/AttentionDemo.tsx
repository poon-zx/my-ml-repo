"use client";

import { useMemo, useState } from "react";

const TOKENS = ["The", "cat", "sat", "on", "the", "mat"];

function normalize(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => (total === 0 ? 0 : value / total));
}

export default function AttentionDemo() {
  const [focus, setFocus] = useState(2);

  const weights = useMemo(() => {
    const raw = TOKENS.map((_, index) => {
      const distance = Math.abs(index - focus);
      return Math.exp(-(distance ** 2) / 2);
    });
    return normalize(raw);
  }, [focus]);

  return (
    <section className="attention-demo">
      <header>
        <h3>Mini attention toy</h3>
        <p>
          Move the focus index to see how attention spreads across nearby
          tokens.
        </p>
      </header>

      <label className="attention-slider">
        Focus position: {focus}
        <input
          type="range"
          min={0}
          max={TOKENS.length - 1}
          step={1}
          value={focus}
          onChange={(event) => setFocus(Number(event.target.value))}
        />
      </label>

      <div className="attention-tokens">
        {TOKENS.map((token, index) => {
          const intensity = Math.round(weights[index] * 100);
          return (
            <span
              key={`${token}-${index}`}
              className="attention-token"
              style={{ background: `rgba(151, 115, 75, ${weights[index]})` }}
              aria-label={`${token} attention ${intensity}%`}
              title={`${intensity}% attention`}
            >
              {token}
            </span>
          );
        })}
      </div>
    </section>
  );
}
