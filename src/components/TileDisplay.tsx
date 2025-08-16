import { useState, useEffect } from "react";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";

interface TileDisplayProps {
  tiles: Tile[];
  onEnhancedTilesChange?: (enhancedTiles: Tile[]) => void;
}

export default function TileDisplay({
  tiles,
  onEnhancedTilesChange,
}: TileDisplayProps) {
  const [enhancedTiles, setEnhancedTiles] = useState<Tile[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [borderEnhancementStats, setBorderEnhancementStats] = useState<{
    originalBorderCount: number;
    enhancedBorderCount: number;
    addedBorders: number;
  } | null>(null);

  useEffect(() => {
    if (tiles.length === 0) {
      setEnhancedTiles([]);
      return;
    }

    const enhanceTiles = async () => {
      setIsEnhancing(true);

      try {
        // Create a TileCollection and merge duplicates
        const tileCollection = TileCollection.fromTiles(
          tiles,
          tiles.length,
          0, // imageWidth - not needed for display
          0, // imageHeight - not needed for display
          tiles.length > 0 ? Math.max(...tiles.map((t) => t.x)) + 1 : 0, // tilesX
          tiles.length > 0 ? Math.max(...tiles.map((t) => t.y)) + 1 : 0 // tilesY
        );

        const mergedCollection = tileCollection.mergeDuplicateTiles();

        // Calculate original border count
        const originalBorderCount = mergedCollection.tiles.reduce(
          (total, tile) => total + tile.getBorderCount(),
          0
        );

        // Add compatible borders based on pixel content
        const enhancedCollection =
          await mergedCollection.addCompatibleBorders();

        // Calculate enhanced border count
        const enhancedBorderCount = enhancedCollection.tiles.reduce(
          (total, tile) => total + tile.getBorderCount(),
          0
        );

        setEnhancedTiles(enhancedCollection.tiles);
        setBorderEnhancementStats({
          originalBorderCount,
          enhancedBorderCount,
          addedBorders: enhancedBorderCount - originalBorderCount,
        });
        onEnhancedTilesChange?.(enhancedCollection.tiles);
      } catch (error) {
        console.error("Error enhancing tiles:", error);
        // Fallback to merged tiles without enhanced borders
        const tileCollection = TileCollection.fromTiles(
          tiles,
          tiles.length,
          0,
          0,
          tiles.length > 0 ? Math.max(...tiles.map((t) => t.x)) + 1 : 0,
          tiles.length > 0 ? Math.max(...tiles.map((t) => t.y)) + 1 : 0
        );
        const mergedCollection = tileCollection.mergeDuplicateTiles();
        setEnhancedTiles(mergedCollection.tiles);
        setBorderEnhancementStats(null); // No enhancement stats in fallback
        onEnhancedTilesChange?.(mergedCollection.tiles);
      } finally {
        setIsEnhancing(false);
      }
    };

    enhanceTiles();
  }, [tiles]);

  if (tiles.length === 0) {
    return null;
  }

  if (isEnhancing) {
    return (
      <div className="tiles-section">
        <h3 className="tiles-title">Processing Tiles...</h3>
        <p>Merging duplicates and analyzing pixel borders...</p>
      </div>
    );
  }

  // Calculate tilesX for proper tile numbering
  const tilesX =
    enhancedTiles.length > 0
      ? Math.max(...enhancedTiles.map((t: Tile) => t.x)) + 1
      : 0;

  return (
    <div className="tiles-section">
      <h3 className="tiles-title">
        Generated Tiles ({enhancedTiles.length} unique, {tiles.length} total)
      </h3>
      {enhancedTiles.length < tiles.length && (
        <p className="merge-info">
          Merged {tiles.length - enhancedTiles.length} duplicate tiles
        </p>
      )}

      {borderEnhancementStats && borderEnhancementStats.addedBorders > 0 && (
        <p className="enhancement-info">
          Added {borderEnhancementStats.addedBorders} border relationships
          through pixel analysis (from{" "}
          {borderEnhancementStats.originalBorderCount} to{" "}
          {borderEnhancementStats.enhancedBorderCount} total)
        </p>
      )}

      <div className="tiles-grid">
        {enhancedTiles.map((tile: Tile) => (
          <div key={tile.id} className="tile-item">
            <img
              src={tile.dataUrl}
              alt={tile.getLabel()}
              className="tile-image"
            />
            <p className="tile-label">{tile.getLabel()}</p>
            <p className="tile-hash">Hash: {tile.getDataUrlHash()}</p>
            <div className="tile-borders-detailed">
              <div className="border-direction">
                <span className="border-label">N:</span>
                <span className="border-ids">
                  {tile.getBorderIds("north").length > 0
                    ? tile.getBorderIds("north").join(", ")
                    : "none"}
                </span>
              </div>
              <div className="border-direction">
                <span className="border-label">E:</span>
                <span className="border-ids">
                  {tile.getBorderIds("east").length > 0
                    ? tile.getBorderIds("east").join(", ")
                    : "none"}
                </span>
              </div>
              <div className="border-direction">
                <span className="border-label">S:</span>
                <span className="border-ids">
                  {tile.getBorderIds("south").length > 0
                    ? tile.getBorderIds("south").join(", ")
                    : "none"}
                </span>
              </div>
              <div className="border-direction">
                <span className="border-label">W:</span>
                <span className="border-ids">
                  {tile.getBorderIds("west").length > 0
                    ? tile.getBorderIds("west").join(", ")
                    : "none"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
