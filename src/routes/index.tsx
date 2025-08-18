import { useState, useCallback } from "react";
import "../styles/ImageTileCutter.css";
import FilePicker from "../components/FilePicker";
import TileDisplay from "../components/TileDisplay";
import { processImageIntoTiles } from "../utils/imageProcessor";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";
import type {
  SynthesisProgress,
  SynthesisAttemptStart,
  SynthesisResult,
} from "../utils/WaveFunctionCollapseSynthesizer";

export default function () {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tileWidth, setTileWidth] = useState<number>(64);
  const [tileHeight, setTileHeight] = useState<number>(64);
  const [tileCollection, setTileCollection] = useState<TileCollection | null>(
    null
  );
  const [enhancedTiles, setEnhancedTiles] = useState<Tile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [synthesizeWidth, setSynthesizeWidth] = useState<number>(10);
  const [synthesizeHeight, setSynthesizeHeight] = useState<number>(10);
  const [synthesisSeed, setSynthesisSeed] = useState<number>(0);
  const [synthesizedImage, setSynthesizedImage] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] =
    useState<SynthesisProgress | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<{
    number: number;
    max: number;
  } | null>(null);
  const [partialResult, setPartialResult] = useState<SynthesisResult | null>(
    null
  );
  const [partialResultImage, setPartialResultImage] = useState<string | null>(
    null
  );

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setTileCollection(null); // Clear previous tiles when new image is selected
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setTileCollection(null);
  }, [previewUrl]);

  const cutImageIntoTiles = async () => {
    if (!previewUrl) return;

    setIsProcessing(true);

    try {
      const result = await processImageIntoTiles({
        imageUrl: previewUrl,
        tileWidth,
        tileHeight,
      });

      setTileCollection(result.tiles);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProgressUpdate = useCallback((progress: SynthesisProgress) => {
    setSynthesisProgress(progress);
    console.log(
      `Progress: ${progress.totalCollapsed}/${progress.totalCells} cells collapsed (Attempt ${progress.attemptNumber})`
    );
  }, []);

  const handleAttemptStart = useCallback(
    (attemptStart: SynthesisAttemptStart) => {
      setCurrentAttempt({
        number: attemptStart.attemptNumber,
        max: attemptStart.maxAttempts,
      });
      console.log(
        `Starting attempt ${attemptStart.attemptNumber}/${attemptStart.maxAttempts}`
      );
    },
    []
  );

  const handlePartialResult = useCallback(
    (partialResult: SynthesisResult) => {
      setPartialResult(partialResult);
      console.log(
        `Partial result from attempt ${partialResult.attemptNumber}: ${partialResult.compatibilityScore} compatibility`
      );
      // Render partial result as image
      renderPartialResultImage(partialResult);
    },
    [synthesizeWidth, synthesizeHeight, tileWidth, tileHeight]
  );

  const handleSynthesize = async () => {
    if (enhancedTiles.length === 0) {
      alert("Please process an image into tiles first.");
      return;
    }

    setIsSynthesizing(true);
    setSynthesizedImage(null);
    setSynthesisProgress(null);
    setCurrentAttempt(null);
    setPartialResult(null);
    setPartialResultImage(null);

    try {
      const targetWidth = synthesizeWidth * tileWidth;
      const targetHeight = synthesizeHeight * tileHeight;

      // Create a TileCollection from enhanced tiles for synthesis
      const synthesisCollection = TileCollection.fromTiles(
        enhancedTiles,
        enhancedTiles.length,
        targetWidth,
        targetHeight,
        Math.max(...enhancedTiles.map((t) => t.x)) + 1,
        Math.max(...enhancedTiles.map((t) => t.y)) + 1
      );

      // Use the generator function for real-time progress updates
      const generator = synthesisCollection.synthesizeWithProgress(
        targetWidth,
        targetHeight,
        synthesisSeed
      );

      let result: string[][] | null = null;
      let partialResult: any = null;

      // Process the generator
      while (true) {
        const next = generator.next();

        if (next.done) {
          result = next.value;
          break;
        }

        partialResult = next.value;

        // Update progress
        setSynthesisProgress({
          totalCollapsed: partialResult.collapsedCells,
          totalCells: partialResult.totalCells,
          iteration: partialResult.iteration,
          attemptNumber: 1, // Single attempt with generator
          collapsedCell: partialResult.lastCollapsedCell
            ? {
                x: partialResult.lastCollapsedCell.x,
                y: partialResult.lastCollapsedCell.y,
                tileId: partialResult.lastCollapsedCell.tile,
                possibilities: 1, // We know it's collapsed, so only 1 possibility
              }
            : undefined,
        });

        // Render partial result
        if (partialResult.arrangement && partialResult.arrangement.length > 0) {
          await renderPartialResultFromArrangement(partialResult.arrangement);
        }

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (result) {
        // Render final result
        const finalImage = await renderArrangementToImage(result);
        setSynthesizedImage(finalImage);
      }
    } catch (error) {
      console.error("Error synthesizing image:", error);
      alert(
        `Error synthesizing image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSynthesizing(false);
      setSynthesisProgress(null);
      setCurrentAttempt(null);
    }
  };

  const renderPartialResultImage = useCallback(
    async (result: SynthesisResult) => {
      if (!result.arrangement || result.arrangement.length === 0) return;

      const targetWidth = synthesizeWidth * tileWidth;
      const targetHeight = synthesizeHeight * tileHeight;

      // Create canvas for the partial result
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // Render the partial arrangement
      for (let gridY = 0; gridY < result.arrangement.length; gridY++) {
        for (let gridX = 0; gridX < result.arrangement[gridY].length; gridX++) {
          const tile = result.arrangement[gridY][gridX];
          if (tile) {
            const targetX = gridX * tileWidth;
            const targetY = gridY * tileHeight;

            const tileCanvas = document.createElement("canvas");
            const tileCtx = tileCanvas.getContext("2d");

            if (tileCtx) {
              const tileImg = new Image();

              await new Promise<void>((resolve, reject) => {
                tileImg.onload = () => {
                  tileCanvas.width = tileWidth;
                  tileCanvas.height = tileHeight;
                  tileCtx.drawImage(tileImg, 0, 0, tileWidth, tileHeight);
                  ctx.drawImage(tileCanvas, targetX, targetY);
                  resolve();
                };

                tileImg.onerror = () => {
                  reject(new Error(`Failed to load tile image: ${tile.id}`));
                };

                tileImg.src = tile.dataUrl;
              });
            }
          }
        }
      }

      const dataUrl = canvas.toDataURL("image/png");
      setPartialResultImage(dataUrl);
    },
    [synthesizeWidth, synthesizeHeight, tileWidth, tileHeight]
  );

  const renderPartialResultFromArrangement = useCallback(
    async (arrangement: string[][]) => {
      if (!arrangement || arrangement.length === 0) return;

      const targetWidth = synthesizeWidth * tileWidth;
      const targetHeight = synthesizeHeight * tileHeight;

      // Create canvas for the partial result
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // Render the partial arrangement
      for (let gridY = 0; gridY < arrangement.length; gridY++) {
        for (let gridX = 0; gridX < arrangement[gridY].length; gridX++) {
          const tileId = arrangement[gridY][gridX];
          if (tileId) {
            const tile = enhancedTiles.find((t) => t.id === tileId);
            if (tile) {
              const targetX = gridX * tileWidth;
              const targetY = gridY * tileHeight;

              const tileCanvas = document.createElement("canvas");
              const tileCtx = tileCanvas.getContext("2d");

              if (tileCtx) {
                const tileImg = new Image();

                await new Promise<void>((resolve, reject) => {
                  tileImg.onload = () => {
                    tileCanvas.width = tileWidth;
                    tileCanvas.height = tileHeight;
                    tileCtx.drawImage(tileImg, 0, 0, tileWidth, tileHeight);
                    ctx.drawImage(tileCanvas, targetX, targetY);
                    resolve();
                  };

                  tileImg.onerror = () => {
                    reject(new Error(`Failed to load tile image: ${tileId}`));
                  };

                  tileImg.src = tile.dataUrl;
                });
              }
            }
          }
        }
      }

      const dataUrl = canvas.toDataURL("image/png");
      setPartialResultImage(dataUrl);
    },
    [synthesizeWidth, synthesizeHeight, tileWidth, tileHeight, enhancedTiles]
  );

  const renderArrangementToImage = useCallback(
    async (arrangement: string[][]): Promise<string> => {
      if (!arrangement || arrangement.length === 0) {
        throw new Error("No arrangement to render");
      }

      const targetWidth = synthesizeWidth * tileWidth;
      const targetHeight = synthesizeHeight * tileHeight;

      // Create canvas for the final result
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // Render the arrangement
      for (let gridY = 0; gridY < arrangement.length; gridY++) {
        for (let gridX = 0; gridX < arrangement[gridY].length; gridX++) {
          const tileId = arrangement[gridY][gridX];
          if (tileId) {
            const tile = enhancedTiles.find((t) => t.id === tileId);
            if (tile) {
              const targetX = gridX * tileWidth;
              const targetY = gridY * tileHeight;

              const tileCanvas = document.createElement("canvas");
              const tileCtx = tileCanvas.getContext("2d");

              if (tileCtx) {
                const tileImg = new Image();

                await new Promise<void>((resolve, reject) => {
                  tileImg.onload = () => {
                    tileCanvas.width = tileWidth;
                    tileCanvas.height = tileHeight;
                    tileCtx.drawImage(tileImg, 0, 0, tileWidth, tileHeight);
                    ctx.drawImage(tileCanvas, targetX, targetY);
                    resolve();
                  };

                  tileImg.onerror = () => {
                    reject(new Error(`Failed to load tile image: ${tileId}`));
                  };

                  tileImg.src = tile.dataUrl;
                });
              }
            }
          }
        }
      }

      return canvas.toDataURL("image/png");
    },
    [synthesizeWidth, synthesizeHeight, tileWidth, tileHeight, enhancedTiles]
  );

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

      <TileDisplay
        tiles={tileCollection?.tiles || []}
        onEnhancedTilesChange={setEnhancedTiles}
      />

      {tileCollection && (
        <div className="synthesis-section">
          <h3 className="synthesis-title">Image Synthesis</h3>
          <p className="synthesis-description">
            Create a new image using the Wave Function Collapse algorithm. The
            generation is deterministic - using the same seed will always
            produce the same result. Enter dimensions in tile units.
          </p>

          <div className="synthesis-inputs">
            <div className="input-group">
              <label className="input-label">Width (tiles)</label>
              <input
                type="number"
                value={synthesizeWidth}
                onChange={(e) =>
                  setSynthesizeWidth(Math.max(1, parseInt(e.target.value) || 1))
                }
                min="1"
                className="dimension-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Height (tiles)</label>
              <input
                type="number"
                value={synthesizeHeight}
                onChange={(e) =>
                  setSynthesizeHeight(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                min="1"
                className="dimension-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Seed</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  value={synthesisSeed}
                  onChange={(e) =>
                    setSynthesisSeed(parseInt(e.target.value) || 0)
                  }
                  className="dimension-input"
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
              className="synthesize-button"
            >
              {isSynthesizing ? "Synthesizing..." : "Synthesize Image"}
            </button>
          </div>

          {/* Progress Display */}
          <div
            className="synthesis-progress"
            style={{
              minHeight: isSynthesizing ? "300px" : "auto",
              transition: "min-height 0.3s ease-in-out",
            }}
          >
            {isSynthesizing && (
              <>
                <h4 className="progress-title">Synthesis Progress</h4>

                {currentAttempt && (
                  <div className="attempt-info">
                    <p>
                      Attempt {currentAttempt.number} of {currentAttempt.max}
                    </p>
                  </div>
                )}

                {synthesisProgress && (
                  <div className="progress-info">
                    <p>
                      Cells collapsed: {synthesisProgress.totalCollapsed}/
                      {synthesisProgress.totalCells}
                    </p>
                    <p>Iteration: {synthesisProgress.iteration}</p>

                    {synthesisProgress.collapsedCell && (
                      <p>
                        Last collapsed: ({synthesisProgress.collapsedCell.x},{" "}
                        {synthesisProgress.collapsedCell.y}) with{" "}
                        {synthesisProgress.collapsedCell.possibilities}{" "}
                        possibilities
                      </p>
                    )}
                  </div>
                )}

                {partialResultImage && (
                  <div className="partial-result">
                    <h5>Partial Result</h5>
                    <div className="partial-image-container">
                      <img
                        src={partialResultImage}
                        alt="Partial Result"
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {synthesizedImage && (
            <div className="synthesized-result">
              <h4 className="result-title">Synthesized Image</h4>
              <p className="result-info">
                Size: {synthesizeWidth * tileWidth} ×{" "}
                {synthesizeHeight * tileHeight} pixels
              </p>
              <div className="synthesized-image-container">
                <img
                  src={synthesizedImage}
                  alt="Synthesized Image"
                  className="synthesized-image"
                />
              </div>
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.download = "synthesized-image.png";
                  link.href = synthesizedImage;
                  link.click();
                }}
                className="download-button"
              >
                Download Image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
