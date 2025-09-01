import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import styles from "./index.module.css";
import FilePicker from "../components/FilePicker";
import TileDisplay from "../components/TileDisplay";
import SynthesisConfig from "../components/SynthesisConfig";
import TileConfig from "../components/TileConfig";
import { processImageIntoTiles } from "../utils/imageProcessor";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";
import { gen } from "../sat/wave2";
import { convertTilesToWave2Format } from "../utils/tileUtils";

export default function () {
  console.log("reender");
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
  const [resetRadius, setResetRadius] = useState<number>(5);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const shouldStopSynthesisRef = useRef(false);

  // Canvas-based approach
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileImageCache = useRef<Map<string, ImageBitmap>>(new Map());

  // Preload tiles as ImageBitmaps for better performance
  const preloadTiles = useCallback(async () => {
    const promises: Promise<void>[] = [];

    for (const tile of enhancedTiles) {
      if (!tileImageCache.current.has(tile.id)) {
        const promise = fetch(tile.dataUrl)
          .then((response) => response.blob())
          .then((blob) => createImageBitmap(blob))
          .then((imageBitmap) => {
            tileImageCache.current.set(tile.id, imageBitmap);
          })
          .catch((error) => {
            console.error(`Error preloading tile ${tile.id}:`, error);
          });
        promises.push(promise);
      }
    }

    await Promise.all(promises);
  }, [enhancedTiles]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    // Clear the tile cache when clearing canvas
    tileImageCache.current.clear();
  }, []);

  // Function to draw tiles to canvas
  const drawTileToCanvas = useCallback(
    (x: number, y: number, tileId: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixelX = x * tileWidth;
      const pixelY = canvas.height - (y + 1) * tileHeight;

      if (tileId === null) {
        // Draw pure red for null tiles
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(pixelX, pixelY, tileWidth, tileHeight);
      } else {
        // Use cached ImageBitmap for better performance
        const imageBitmap = tileImageCache.current.get(tileId);
        if (imageBitmap) {
          ctx.drawImage(imageBitmap, pixelX, pixelY, tileWidth, tileHeight);
        }
      }
    },
    [tileWidth, tileHeight, synthesizeHeight]
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

  // Clear tile cache when enhanced tiles change
  useEffect(() => {
    tileImageCache.current.clear();
  }, [enhancedTiles]);

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
      // Load the image and get its data
      const img = new Image();
      img.crossOrigin = "anonymous";

      const imageData = await new Promise<{
        data: Uint8ClampedArray;
        width: number;
        height: number;
      }>((resolve, reject) => {
        img.onload = () => {
          // Create a temporary canvas to extract image data
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw the image to the canvas
          ctx.drawImage(img, 0, 0);

          // Extract the image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          resolve({
            data: imageData.data,
            width: canvas.width,
            height: canvas.height,
          });
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = previewUrl;
      });

      // Process the image into tiles
      const result = await processImageIntoTiles(
        imageData.data,
        imageData.width,
        imageData.height,
        tileWidth,
        tileHeight
      );

      setTileCollection(result);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopSynthesis = useCallback(() => {
    shouldStopSynthesisRef.current = true;
  }, []);

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
    shouldStopSynthesisRef.current = false;

    // Initialize canvas for the new synthesis
    initializeCanvas(finalWidth, finalHeight);

    // Preload tiles as ImageBitmaps for better performance
    await preloadTiles();

    try {
      const targetWidth = finalWidth;
      const targetHeight = finalHeight;

      // Convert tiles to wave2 format
      const tileMap = convertTilesToWave2Format(enhancedTiles);

      // Use the gen function from wave2.ts
      const generator = gen(
        tileMap,
        targetWidth,
        targetHeight,
        synthesisSeed,
        resetRadius
      );

      let iteration = 0;

      // Process the generator
      while (true) {
        // Check if synthesis should be stopped
        if (shouldStopSynthesisRef.current) {
          console.log("Synthesis stopped by user");
          break;
        }

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

        // Update canvas with the new tile
        drawTileToCanvas(tileUpdate.x, tileUpdate.y, tileUpdate.tile);

        if (iteration % 2000 == 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
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
            onTilesChange={setEnhancedTiles}
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
                resetRadius={resetRadius}
                setResetRadius={setResetRadius}
                isSynthesizing={isSynthesizing}
                onSynthesize={handleSynthesize}
                onStopSynthesis={handleStopSynthesis}
                onClearState={clearCanvas}
              />

              {/* Progress Display */}
              <div className={styles.synthesisProgress}>
                {isSynthesizing && (
                  <>
                    <h4 className={styles.progressTitle}>Synthesis Progress</h4>
                    <div className={styles.progressInfo}>
                      <p>Generating image algorithm...</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.canvasContainer}>
          <h3 className={styles.canvasTitle}>
            {isSynthesizing ? "Synthesis in Progress" : "Ready for Synthesis"}
          </h3>
          <canvas
            ref={canvasRef}
            style={{
              border: "1px solid #ccc",
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </div>
      </div>
    </div>
  );
}
