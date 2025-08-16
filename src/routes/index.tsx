import { useState, useCallback } from "react";
import "../styles/ImageTileCutter.css";
import FilePicker from "../components/FilePicker";

export default function () {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tileWidth, setTileWidth] = useState<number>(64);
  const [tileHeight, setTileHeight] = useState<number>(64);
  const [tiles, setTiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setTiles([]); // Clear previous tiles when new image is selected
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setTiles([]);
  }, [previewUrl]);

  const cutImageIntoTiles = () => {
    if (!previewUrl) return;

    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      const imageWidth = img.width;
      const imageHeight = img.height;

      const tilesX = Math.ceil(imageWidth / tileWidth);
      const tilesY = Math.ceil(imageHeight / tileHeight);

      const newTiles: string[] = [];

      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          canvas.width = tileWidth;
          canvas.height = tileHeight;

          // Clear canvas
          ctx.clearRect(0, 0, tileWidth, tileHeight);

          // Calculate source coordinates
          const sourceX = x * tileWidth;
          const sourceY = y * tileHeight;

          // Calculate actual tile dimensions (handle edge cases)
          const actualTileWidth = Math.min(tileWidth, imageWidth - sourceX);
          const actualTileHeight = Math.min(tileHeight, imageHeight - sourceY);

          // Draw the tile
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            actualTileWidth,
            actualTileHeight,
            0,
            0,
            actualTileWidth,
            actualTileHeight
          );

          // Convert to data URL
          const tileDataUrl = canvas.toDataURL("image/png");
          newTiles.push(tileDataUrl);
        }
      }

      setTiles(newTiles);
      setIsProcessing(false);
    };

    img.onerror = () => {
      setIsProcessing(false);
      alert("Error loading image");
    };

    img.src = previewUrl;
  };

  return (
    <div className="image-tile-cutter-container">
      <h1 className="image-tile-cutter-title">Image Tile Cutter</h1>

      <FilePicker
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
      />

      {selectedFile && (
        <>
          <div className="success-message">
            <h4 className="success-title">File Selected Successfully! ✅</h4>
            <p className="success-text">
              Your image is ready for processing. Configure tile dimensions
              below.
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
                onClick={cutImageIntoTiles}
                disabled={isProcessing}
                className="cut-button"
              >
                {isProcessing ? "Processing..." : "Cut Image into Tiles"}
              </button>
            </div>
          </div>
        </>
      )}

      {tiles.length > 0 && (
        <div className="tiles-section">
          <h3 className="tiles-title">
            Generated Tiles ({tiles.length} total)
          </h3>

          <div className="tiles-grid">
            {tiles.map((tile, index) => (
              <div key={index} className="tile-item">
                <img
                  src={tile}
                  alt={`Tile ${index + 1}`}
                  className="tile-image"
                />
                <p className="tile-label">Tile {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
