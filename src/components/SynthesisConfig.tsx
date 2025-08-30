import { useState, useEffect } from "react";
import styles from "./SynthesisConfig.module.css";

interface SynthesisConfigProps {
  synthesizeWidth: number;
  setSynthesizeWidth: (width: number) => void;
  synthesizeHeight: number;
  setSynthesizeHeight: (height: number) => void;
  synthesisSeed: number;
  setSynthesisSeed: (seed: number) => void;
  isSynthesizing: boolean;
  onSynthesize: (targetWidth?: number, targetHeight?: number) => void;
  onClearState: () => void;
}

export default function SynthesisConfig({
  synthesizeWidth,
  setSynthesizeWidth,
  synthesizeHeight,
  setSynthesizeHeight,
  synthesisSeed,
  setSynthesisSeed,
  isSynthesizing,
  onSynthesize,
  onClearState,
}: SynthesisConfigProps) {
  // Local state for width and height inputs
  const [localWidth, setLocalWidth] = useState(synthesizeWidth);
  const [localHeight, setLocalHeight] = useState(synthesizeHeight);

  // Update local state when parent state changes (e.g., when synthesis starts)
  useEffect(() => {
    setLocalWidth(synthesizeWidth);
    setLocalHeight(synthesizeHeight);
  }, [synthesizeWidth, synthesizeHeight]);

  // Handle synthesis start - pass local values directly to synthesis function
  const handleSynthesize = () => {
    setSynthesizeWidth(localWidth);
    setSynthesizeHeight(localHeight);
    onSynthesize(localWidth, localHeight);
  };

  // Clear state when dimensions change
  const handleWidthChange = (value: number) => {
    setLocalWidth(value);
    onClearState();
  };

  const handleHeightChange = (value: number) => {
    setLocalHeight(value);
    onClearState();
  };
  return (
    <div className={styles.synthesisSection}>
      <h3 className={styles.synthesisTitle}>Image Synthesis</h3>
      <p className={styles.synthesisDescription}>
        Create a new image using the Wave Function Collapse algorithm. The
        generation is deterministic - using the same seed will always produce
        the same result. Enter dimensions in tile units.
      </p>

      <div className={styles.synthesisInputs}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Width (tiles)</label>
          <input
            type="number"
            value={localWidth}
            onChange={(e) =>
              handleWidthChange(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            className={styles.dimensionInput}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Height (tiles)</label>
          <input
            type="number"
            value={localHeight}
            onChange={(e) =>
              handleHeightChange(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            className={styles.dimensionInput}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Seed</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="number"
              value={synthesisSeed}
              onChange={(e) => setSynthesisSeed(parseInt(e.target.value) || 0)}
              className={styles.dimensionInput}
              title="Seed for deterministic generation. Same seed produces same result."
            />
            <button
              type="button"
              onClick={() =>
                setSynthesisSeed(Math.floor(Math.random() * 10000))
              }
              style={{
                padding: "8px 12px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
              title="Generate random seed"
            >
              🎲
            </button>
          </div>
        </div>

        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing}
          className={styles.synthesizeButton}
        >
          {isSynthesizing ? "Synthesizing..." : "Synthesize Image"}
        </button>
      </div>
    </div>
  );
}
