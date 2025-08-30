import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import styles from "./index.module.css";
import FilePicker from "../components/FilePicker";
import TileDisplay from "../components/TileDisplay";
import TileGrid from "../components/TileGrid";
import SynthesisConfig from "../components/SynthesisConfig";
import TileConfig from "../components/TileConfig";
import { processImageIntoTiles } from "../utils/imageProcessor";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";
import { gen } from "../sat/wave2";
import {
  convertTilesToWave2Format,
  createInitialSynthesisState,
  updateSynthesisState,
} from "../utils/tileUtils";

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
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [sleepTime, setSleepTime] = useState<number>(500);

  const [currentSynthesisState, setCurrentSynthesisState] = useState<Array<
    Set<string>
  > | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [currentSynthesisWidth, setCurrentSynthesisWidth] =
    useState<number>(synthesizeWidth);
  const [currentSynthesisHeight, setCurrentSynthesisHeight] =
    useState<number>(synthesizeHeight);

  // Canvas-based approach
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clear synthesis state when dimensions change
  const clearSynthesisState = useCallback(() => {
    setCurrentSynthesisState(null);
    setCurrentIteration(0);
    setCurrentSynthesisWidth(synthesizeWidth);
    setCurrentSynthesisHeight(synthesizeHeight);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [synthesizeWidth, synthesizeHeight]);

  // Function to draw tiles to canvas
  const drawTileToCanvas = useCallback(
    (x: number, y: number, tileId: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixelX = x * tileWidth;
      const pixelY = y * tileHeight;

      if (tileId === null) {
        // Draw pure red for null tiles
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
      } else {
        // Find the tile image and draw it
        const tile = enhancedTiles.find((t) => t.id === tileId);
        if (tile && tile.dataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, pixelX, pixelY, tileWidth, tileHeight);
          };
          img.src = tile.dataUrl;
        }
      }
    },
    [tileWidth, tileHeight, enhancedTiles]
  );

  // Function to initialize canvas
  const initializeCanvas = useCallback(
    (width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = width * tileWidth;
      canvas.height = height * tileHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fill canvas with magenta initially
        ctx.fillStyle = "#FF00FF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
    [tileWidth, tileHeight]
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

  const handleSynthesize = async (
    targetWidth?: number,
    targetHeight?: number
  ) => {
    if (enhancedTiles.length === 0) {
      alert("Please process an image into tiles first.");
      return;
    }

    // Use provided dimensions or fall back to current state
    const finalWidth = targetWidth ?? synthesizeWidth;
    const finalHeight = targetHeight ?? synthesizeHeight;

    setIsSynthesizing(true);
    setCurrentSynthesisState(null);
    setCurrentIteration(0);
    setCurrentSynthesisWidth(finalWidth);
    setCurrentSynthesisHeight(finalHeight);

    // Initialize canvas for the new synthesis
    initializeCanvas(finalWidth, finalHeight);

    try {
      const targetWidth = finalWidth;
      const targetHeight = finalHeight;

      // Convert tiles to wave2 format
      const tileMap = convertTilesToWave2Format(enhancedTiles);

      // Use the gen function from wave2.ts
      const generator = gen(tileMap, targetWidth, targetHeight, synthesisSeed);

      let iteration = 0;

      // Initialize the synthesis state with all tiles as possibilities
      const initialState = createInitialSynthesisState(
        targetWidth,
        targetHeight,
        enhancedTiles
      );
      setCurrentSynthesisState(initialState);

      // Process the generator
      while (true) {
        const next = generator.next();

        if (next.done) {
          // Generator completed successfully
          break;
        }

        // Handle individual tile updates
        const tileUpdate = next.value as {
          x: number;
          y: number;
          tile: string | null;
        };

        // Update the current state based on the tile update
        setCurrentSynthesisState((prevState) =>
          updateSynthesisState(
            prevState,
            tileUpdate,
            targetWidth,
            enhancedTiles
          )
        );

        // Update canvas with the new tile
        drawTileToCanvas(tileUpdate.x, tileUpdate.y, tileUpdate.tile);

        setCurrentIteration(iteration);

        if (iteration % 300 === 0) {
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        }

        iteration++;
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

  return (
    <div className={styles.mainContainer}>
      <div className={styles.leftPanel}>
        <div className={styles.imageTileCutterContainer}>
          <h1 className={styles.imageTileCutterTitle}>Image Tile Cutter</h1>

          <FilePicker
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            previewUrl={previewUrl}
          />

          {selectedFile && (
            <TileConfig
              tileWidth={tileWidth}
              setTileWidth={setTileWidth}
              tileHeight={tileHeight}
              setTileHeight={setTileHeight}
              isProcessing={isProcessing}
              onCutImage={cutImageIntoTiles}
            />
          )}

          <TileDisplay
            tiles={tileCollection?.tiles || []}
            onEnhancedTilesChange={setEnhancedTiles}
          />

          {tileCollection && (
            <>
              <SynthesisConfig
                synthesizeWidth={synthesizeWidth}
                setSynthesizeWidth={setSynthesizeWidth}
                synthesizeHeight={synthesizeHeight}
                setSynthesizeHeight={setSynthesizeHeight}
                synthesisSeed={synthesisSeed}
                setSynthesisSeed={setSynthesisSeed}
                sleepTime={sleepTime}
                setSleepTime={setSleepTime}
                isSynthesizing={isSynthesizing}
                onSynthesize={handleSynthesize}
                onClearState={clearSynthesisState}
              />

              {/* Progress Display */}
              <div className={styles.synthesisProgress}>
                {isSynthesizing && (
                  <>
                    <h4 className={styles.progressTitle}>Synthesis Progress</h4>
                    <div className={styles.progressInfo}>
                      <p>
                        Generating image using Wave Function Collapse
                        algorithm...
                      </p>
                    </div>
                  </>
                )}

                {currentSynthesisState && (
                  <div className={styles.partialResult}>
                    <h5>{isSynthesizing ? "Current State" : "Final Result"}</h5>
                    <p className={styles.partialInfo}>
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
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.canvasContainer}>
          <h3 className={styles.canvasTitle}>
            {currentSynthesisState ? "Synthesis Canvas" : "Ready for Synthesis"}
          </h3>
          {currentSynthesisState ? (
            <TileGrid
              state={currentSynthesisState}
              width={currentSynthesisWidth}
              height={currentSynthesisHeight}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              enhancedTiles={enhancedTiles}
              iteration={currentIteration}
            />
          ) : (
            <div className={styles.emptyCanvas}>
              <p>No synthesis in progress</p>
              <p>Process an image and start synthesis to see results here</p>
            </div>
          )}
        </div>

        {/* Canvas-based approach */}
        <div className={styles.canvasContainer}>
          <h3 className={styles.canvasTitle}>
            {currentSynthesisState ? "Canvas Synthesis" : "Canvas Ready"}
          </h3>
          <canvas
            ref={canvasRef}
            style={{
              border: "1px solid #ccc",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          {!currentSynthesisState && (
            <div className={styles.emptyCanvas}>
              <p>Canvas ready for synthesis</p>
              <p>Start synthesis to see canvas updates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
