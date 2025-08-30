import { useState, useCallback, useMemo } from "react";
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

  // Clear synthesis state when dimensions change
  const clearSynthesisState = useCallback(() => {
    setCurrentSynthesisState(null);
    setCurrentIteration(0);
  }, []);

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

  const handleSynthesize = async () => {
    if (enhancedTiles.length === 0) {
      alert("Please process an image into tiles first.");
      return;
    }

    setIsSynthesizing(true);
    setCurrentSynthesisState(null);
    setCurrentIteration(0);

    try {
      const targetWidth = synthesizeWidth;
      const targetHeight = synthesizeHeight;

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
          <div
            className={styles.synthesisProgress}
            style={{
              minHeight: currentSynthesisState ? "400px" : "auto",
            }}
          >
            {isSynthesizing && (
              <>
                <h4 className={styles.progressTitle}>Synthesis Progress</h4>
                <div className={styles.progressInfo}>
                  <p>
                    Generating image using Wave Function Collapse algorithm...
                  </p>
                </div>
              </>
            )}

            {currentSynthesisState && (
              <div className={styles.partialResult}>
                <h5>{isSynthesizing ? "Current State" : "Final Result"}</h5>
                <div className={styles.partialImageContainer}>
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
                <p className={styles.partialInfo}>
                  <strong>Legend:</strong>
                  <br />•{" "}
                  <span style={{ color: "#8B5CF6" }}>Purple/Blue tiles</span>
                  : Uncertain cells with multiple possibilities
                  <br />•{" "}
                  <span style={{ color: "#000000" }}>
                    Black tiles with red X
                  </span>
                  : Contradictions (no valid tiles)
                  <br />• <span style={{ color: "#000000" }}>Normal tiles</span>
                  : Collapsed cells with single tile
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
