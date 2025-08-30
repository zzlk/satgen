import styles from "./TileConfig.module.css";

interface TileConfigProps {
  tileWidth: number;
  setTileWidth: (width: number) => void;
  tileHeight: number;
  setTileHeight: (height: number) => void;
  isProcessing: boolean;
  onCutImage: () => void;
}

export default function TileConfig({
  tileWidth,
  setTileWidth,
  tileHeight,
  setTileHeight,
  isProcessing,
  onCutImage,
}: TileConfigProps) {
  return (
    <>
      <div className={styles.successMessage}>
        <h4 className={styles.successTitle}>File Selected Successfully! ✅</h4>
        <p className={styles.successText}>
          Your image is ready for processing. Configure tile dimensions below.
        </p>
      </div>

      <div className={styles.tileConfig}>
        <h3 className={styles.tileConfigTitle}>Tile Configuration</h3>

        <div className={styles.tileInputs}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Tile Width (px)</label>
            <input
              type="number"
              value={tileWidth}
              onChange={(e) =>
                setTileWidth(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              className={styles.dimensionInput}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Tile Height (px)</label>
            <input
              type="number"
              value={tileHeight}
              onChange={(e) =>
                setTileHeight(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              className={styles.dimensionInput}
            />
          </div>

          <button
            onClick={onCutImage}
            disabled={isProcessing}
            className={styles.cutButton}
          >
            {isProcessing ? "Processing..." : "Cut Image into Tiles"}
          </button>
        </div>
      </div>
    </>
  );
}
