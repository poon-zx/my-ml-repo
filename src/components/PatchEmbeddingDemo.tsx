"use client";

import { useEffect, useMemo, useState } from "react";

const IMAGE_SIZE = 64;
const PATCH_SIZES = [8, 16, 32];
const EMBEDDING_DIM = 6;

function computeEmbedding(patch: number) {
  return Array.from({ length: EMBEDDING_DIM }, (_, dim) => {
    const raw = Math.sin((patch + 1) * (dim + 2)) + Math.cos((patch + 2) * (dim + 1));
    const normalized = (raw + 2) / 4;
    return Number(normalized.toFixed(2));
  });
}

export default function PatchEmbeddingDemo() {
  const [patchIndex, setPatchIndex] = useState(1);
  const [selectedPatch, setSelectedPatch] = useState(0);
  const patchSize = PATCH_SIZES[patchIndex];
  const patchesPerSide = IMAGE_SIZE / patchSize;
  const patchCount = patchesPerSide * patchesPerSide;

  const cells = useMemo(
    () => Array.from({ length: patchCount }, (_, index) => index),
    [patchCount]
  );

  useEffect(() => {
    if (selectedPatch >= patchCount) {
      setSelectedPatch(0);
    }
  }, [patchCount, selectedPatch]);

  const embedding = useMemo(
    () => computeEmbedding(selectedPatch),
    [selectedPatch]
  );

  return (
    <section className="attention-demo">
      <header>
        <h3>Patch embedding toy</h3>
        <p>
          A tiny {IMAGE_SIZE}×{IMAGE_SIZE} image gets split into square patches,
          which become tokens for the Transformer.
        </p>
      </header>

      <label className="attention-slider">
        Patch size: {patchSize}×{patchSize}
        <input
          type="range"
          min={0}
          max={PATCH_SIZES.length - 1}
          step={1}
          value={patchIndex}
          onChange={(event) => setPatchIndex(Number(event.target.value))}
        />
      </label>

      <div className="patch-demo-stats">
        <span>
          {patchesPerSide}×{patchesPerSide} patches → {patchCount} patch tokens
        </span>
        <span>{patchCount + 1} total tokens with the [class] token</span>
      </div>

      <div className="patch-demo-preview">
        <div
          className="patch-demo-grid"
          style={{ gridTemplateColumns: `repeat(${patchesPerSide}, 1fr)` }}
          aria-label={`${patchCount} patches`}
        >
          {cells.map((index) => (
            <button
              key={index}
              type="button"
              className={
                index === selectedPatch
                  ? "patch-demo-cell is-active"
                  : "patch-demo-cell"
              }
              onClick={() => setSelectedPatch(index)}
              aria-label={`Patch ${index + 1}`}
              title={`Patch ${index + 1}`}
            />
          ))}
        </div>
        <div className="patch-demo-class">[class]</div>
        <div className="patch-demo-embedding">
          <div className="patch-demo-embedding-title">
            Patch {selectedPatch + 1} embedding (D={EMBEDDING_DIM})
          </div>
          <div className="patch-demo-embedding-bars">
            {embedding.map((value, dim) => (
              <div key={`${value}-${dim}`} className="patch-demo-embedding-row">
                <span className="patch-demo-embedding-label">d{dim + 1}</span>
                <span
                  className="patch-demo-embedding-bar"
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
                <span className="patch-demo-embedding-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
