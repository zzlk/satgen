import { useState, useCallback, useMemo } from "react";
import "../styles/ImageTileCutter.css";
import FilePicker from "../components/FilePicker";
import TileDisplay from "../components/TileDisplay";
import TileGrid from "../components/TileGrid";
import { processImageIntoTiles } from "../utils/imageProcessor";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";
import { gen } from "../sat/wave2";

export default function () {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tileWidth, setTileWidth] = useState<number>(32);
  const [tileHeight, setTileHeight] = useState<number>(32);
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
  const [sleepTime, setSleepTime] = useState<number>(500);

  const [currentSynthesisState, setCurrentSynthesisState] = useState<Array<
    Set<string>
  > | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [finalArrangement, setFinalArrangement] = useState<string[][] | null>(
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

  // Convert tiles to the format expected by the wave2.ts gen function
  const convertTilesToWave2Format = useCallback((tiles: Tile[]) => {
    const tileMap = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    // Initialize all tiles with empty connection sets
    for (const tile of tiles) {
      tileMap.set(tile.id, [
        new Set<string>(), // north connections
        new Set<string>(), // east connections
        new Set<string>(), // south connections
        new Set<string>(), // west connections
      ]);
    }

    // Populate connections based on tile borders
    for (const tile of tiles) {
      const connections = tileMap.get(tile.id)!;

      // North connections (tile's north border can connect to other tiles' south border)
      for (const northTileId of tile.borders.north) {
        connections[2].add(northTileId);
      }

      // East connections (tile's east border can connect to other tiles' west border)
      for (const eastTileId of tile.borders.east) {
        connections[1].add(eastTileId);
      }

      // South connections (tile's south border can connect to other tiles' north border)
      for (const southTileId of tile.borders.south) {
        connections[0].add(southTileId);
      }

      // West connections (tile's west border can connect to other tiles' east border)
      for (const westTileId of tile.borders.west) {
        connections[3].add(westTileId);
      }
    }

    return tileMap;
  }, []);

  const handleSynthesize = async () => {
    if (enhancedTiles.length === 0) {
      alert("Please process an image into tiles first.");
      return;
    }

    setIsSynthesizing(true);
    setSynthesizedImage(null);
    setCurrentSynthesisState(null);
    setCurrentIteration(0);

    try {
      const targetWidth = synthesizeWidth;
      const targetHeight = synthesizeHeight;

      // Convert tiles to wave2 format
      const tileMap = convertTilesToWave2Format(enhancedTiles);

      // Use the gen function from wave2.ts
      const generator = gen(tileMap, targetWidth, targetHeight, synthesisSeed);

      let result: string[] | null = null;
      let iteration = 0;

      // Initialize the synthesis state with all tiles as possibilities
      const initialState: Array<Set<string>> = [];
      for (let i = 0; i < targetWidth * targetHeight; i++) {
        initialState.push(new Set(enhancedTiles.map((tile) => tile.id)));
      }
      setCurrentSynthesisState(initialState);

      // Process the generator
      while (true) {
        const next = generator.next();

        if (next.done) {
          result = next.value;
          break;
        }

        // Handle individual tile updates
        const tileUpdate = next.value as {
          x: number;
          y: number;
          tile: string | null;
        };

        console.log(
          `Tile update: x=${tileUpdate.x}, y=${tileUpdate.y}, tile=${tileUpdate.tile}`
        );

        // Update the current state based on the tile update
        setCurrentSynthesisState((prevState) => {
          if (!prevState) return prevState;

          const newState = [...prevState];
          const index = tileUpdate.y * targetWidth + tileUpdate.x;

          if (tileUpdate.tile === null) {
            // Reset to all possibilities
            newState[index] = new Set(enhancedTiles.map((tile) => tile.id));
          } else {
            // Set to specific tile
            newState[index] = new Set([tileUpdate.tile]);
          }

          return newState;
        });

        setCurrentIteration(iteration);

        if (iteration % 300 === 0) {
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        }

        iteration++;
      }

      if (result) {
        // Convert the 1D result array to 2D arrangement
        const arrangement: string[][] = [];
        for (let y = 0; y < targetHeight; y++) {
          arrangement[y] = [];
          for (let x = 0; x < targetWidth; x++) {
            const index = y * targetWidth + x;
            arrangement[y][x] = result[index];
          }
        }

        // Render final result
        const finalImage = await renderArrangementToImage(arrangement);
        setSynthesizedImage(finalImage);
        setFinalArrangement(arrangement);
      } else {
        alert("Failed to generate image. No valid arrangement found.");
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
      // Keep the final state visible
    }
  };

  const handleSynthesizedImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (!finalArrangement || !synthesizedImage) return;

      const imgElement = event.currentTarget;
      const rect = imgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Get the actual displayed image dimensions
      const displayedWidth = imgElement.offsetWidth;
      const displayedHeight = imgElement.offsetHeight;

      // Check if click is within the displayed image bounds
      if (x < 0 || x >= displayedWidth || y < 0 || y >= displayedHeight) {
        return; // Click is outside the image
      }

      // Calculate scale factors
      const scaleX = displayedWidth / (synthesizeWidth * tileWidth);
      const scaleY = displayedHeight / (synthesizeHeight * tileHeight);

      // Convert click coordinates to original image coordinates
      const originalX = x / scaleX;
      const originalY = y / scaleY;

      // Calculate which tile was clicked
      const tileX = Math.floor(originalX / tileWidth);
      const tileY = Math.floor(originalY / tileHeight);

      // Double-check bounds in tile coordinates
      if (
        tileX >= 0 &&
        tileX < synthesizeWidth &&
        tileY >= 0 &&
        tileY < synthesizeHeight
      ) {
        const tileId = finalArrangement[tileY][tileX];
        if (tileId) {
          console.log(
            `Clicked tile ID: ${tileId} at position (${tileX}, ${tileY})`
          );
        } else {
          console.log(`Clicked empty position at (${tileX}, ${tileY})`);
        }
      }
    },
    [
      finalArrangement,
      synthesizedImage,
      tileWidth,
      tileHeight,
      synthesizeWidth,
      synthesizeHeight,
    ]
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
          const targetX = gridX * tileWidth;
          const targetY = gridY * tileHeight;

          if (tileId) {
            const tile = enhancedTiles.find((t) => t.id === tileId);
            if (tile) {
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

            <div className="input-group">
              <label className="input-label">
                Animation Speed: {sleepTime}ms
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(parseInt(e.target.value))}
                  className="speed-slider"
                  title="Adjust animation speed during synthesis"
                />
                <span
                  style={{ fontSize: "12px", color: "#666", minWidth: "40px" }}
                >
                  {sleepTime}ms
                </span>
              </div>
              <div
                style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}
              >
                {sleepTime === 0
                  ? "No delay (fastest)"
                  : sleepTime <= 100
                  ? "Very fast"
                  : sleepTime <= 300
                  ? "Fast"
                  : sleepTime <= 700
                  ? "Normal"
                  : sleepTime <= 1000
                  ? "Slow"
                  : "Very slow"}
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
              minHeight: isSynthesizing ? "400px" : "auto",
              transition: "min-height 0.3s ease-in-out",
            }}
          >
            {isSynthesizing && (
              <>
                <h4 className="progress-title">Synthesis Progress</h4>
                <div className="progress-info">
                  <p>
                    Generating image using Wave Function Collapse algorithm...
                  </p>
                </div>

                {currentSynthesisState && (
                  <div className="partial-result">
                    <h5>Current State</h5>
                    <div
                      className="partial-image-container"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <TileGrid
                        state={currentSynthesisState}
                        width={synthesizeWidth}
                        height={synthesizeHeight}
                        tileWidth={tileWidth}
                        tileHeight={tileHeight}
                        enhancedTiles={enhancedTiles}
                        iteration={currentIteration}
                      />
                    </div>
                    <p className="partial-info">
                      <strong>Legend:</strong>
                      <br />•{" "}
                      <span style={{ color: "#8B5CF6" }}>
                        Purple/Blue tiles
                      </span>
                      : Uncertain cells with multiple possibilities
                      <br />•{" "}
                      <span style={{ color: "#000000" }}>
                        Black tiles with red X
                      </span>
                      : Contradictions (no valid tiles)
                      <br />•{" "}
                      <span style={{ color: "#000000" }}>Normal tiles</span>:
                      Collapsed cells with single tile
                    </p>
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
                  onClick={handleSynthesizedImageClick}
                  style={{ cursor: "pointer" }}
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
