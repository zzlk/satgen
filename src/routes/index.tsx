import { useState, useCallback, useMemo } from "react";
import "../styles/ImageTileCutter.css";
import FilePicker from "../components/FilePicker";
import TileDisplay from "../components/TileDisplay";
import TileGrid from "../components/TileGrid";
import SynthesisConfig from "../components/SynthesisConfig";
import TileConfig from "../components/TileConfig";
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
      const initialState: Array<Set<string>> = [];
      for (let i = 0; i < targetWidth * targetHeight; i++) {
        initialState.push(new Set(enhancedTiles.map((tile) => tile.id)));
      }
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
    <div className="image-tile-cutter-container">
      <h1 className="image-tile-cutter-title">Image Tile Cutter</h1>

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
            className="synthesis-progress"
            style={{
              minHeight: currentSynthesisState ? "400px" : "auto",
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
              </>
            )}

            {currentSynthesisState && (
              <div className="partial-result">
                <h5>{isSynthesizing ? "Current State" : "Final Result"}</h5>
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
