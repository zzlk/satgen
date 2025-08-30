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
      <div className="success-message">
        <h4 className="success-title">File Selected Successfully! ✅</h4>
        <p className="success-text">
          Your image is ready for processing. Configure tile dimensions below.
        </p>
      </div>

      <div className="tile-config">
        <h3 className="tile-config-title">Tile Configuration</h3>

        <div className="tile-inputs">
          <div className="input-group">
            <label className="input-label">Tile Width (px)</label>
            <input
              type="number"
              value={tileWidth}
              onChange={(e) =>
                setTileWidth(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              className="dimension-input"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Tile Height (px)</label>
            <input
              type="number"
              value={tileHeight}
              onChange={(e) =>
                setTileHeight(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              className="dimension-input"
            />
          </div>

          <button
            onClick={onCutImage}
            disabled={isProcessing}
            className="cut-button"
          >
            {isProcessing ? "Processing..." : "Cut Image into Tiles"}
          </button>
        </div>
      </div>
    </>
  );
}
