import styles from "./TileConfig.module.css";

interface TileConfigProps {
  tileWidth: number;
  setTileWidth: (width: number) => void;
  tileHeight: number;
  setTileHeight: (height: number) => void;
  isProcessing: boolean;
  onCutImage: () => void;
  imageCount?: number;
}

export default function TileConfig({
  tileWidth,
  setTileWidth,
  setTileHeight,
  tileHeight,
  isProcessing,
  onCutImage,
  imageCount = 1,
}: TileConfigProps) {
  return (
    <>
      <div className={styles.successMessage}>
        <h4 className={styles.successTitle}>
          {imageCount === 1
            ? "File Selected Successfully! ✅"
            : `${imageCount} Images Selected Successfully! ✅`}
        </h4>
        <p className={styles.successText}>
          {imageCount === 1
            ? "Your image is ready for processing. Configure tile dimensions below."
            : `Your ${imageCount} images are ready for processing. They will be processed individually and merged into a single tile collection. Configure tile dimensions below.`}
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
            {isProcessing
              ? `Processing ${imageCount} image${imageCount > 1 ? "s" : ""}...`
              : `Cut ${imageCount === 1 ? "Image" : "Images"} into Tiles`}
          </button>
        </div>
      </div>
    </>
  );
}
