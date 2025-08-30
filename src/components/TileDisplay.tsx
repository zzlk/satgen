import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";
import styles from "./TileDisplay.module.css";

interface TileDisplayProps {
  tiles: Tile[];
  onEnhancedTilesChange?: (enhancedTiles: Tile[]) => void;
}

// Memoized individual tile component to prevent unnecessary re-renders
const TileItem = memo(({ tile }: { tile: Tile }) => (
  <div className={styles.tileItem}>
    <img
      src={tile.dataUrl}
      alt={tile.getLabel()}
      className={styles.tileImage}
    />
    <p className={styles.tileLabel}>{tile.getLabel()}</p>
    <p className={styles.tileHash}>Hash: {tile.getDataUrlHash()}</p>
    <div className={styles.tileBordersDetailed}>
      <div className={styles.borderDirection}>
        <span className={styles.borderLabel}>N:</span>
        <span className={styles.borderIds}>
          {tile.getBorderIds("north").length > 0
            ? tile.getBorderIds("north").join(", ")
            : "none"}
        </span>
      </div>
      <div className={styles.borderDirection}>
        <span className={styles.borderLabel}>E:</span>
        <span className={styles.borderIds}>
          {tile.getBorderIds("east").length > 0
            ? tile.getBorderIds("east").join(", ")
            : "none"}
        </span>
      </div>
      <div className={styles.borderDirection}>
        <span className={styles.borderLabel}>S:</span>
        <span className={styles.borderIds}>
          {tile.getBorderIds("south").length > 0
            ? tile.getBorderIds("south").join(", ")
            : "none"}
        </span>
      </div>
      <div className={styles.borderDirection}>
        <span className={styles.borderLabel}>W:</span>
        <span className={styles.borderIds}>
          {tile.getBorderIds("west").length > 0
            ? tile.getBorderIds("west").join(", ")
            : "none"}
        </span>
      </div>
    </div>
  </div>
));

TileItem.displayName = "TileItem";

export default function TileDisplay({
  tiles,
  onEnhancedTilesChange,
}: TileDisplayProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [borderEnhancementStats, setBorderEnhancementStats] = useState<{
    originalBorderCount: number;
    enhancedBorderCount: number;
    addedBorders: number;
  } | null>(null);
  const prevEnhancedTilesRef = useRef<Tile[]>([]);

  // Memoize the tile collection creation to avoid recreating it on every render
  const tileCollection = useMemo(() => {
    if (tiles.length === 0) return null;

    return TileCollection.fromTiles(
      tiles,
      tiles.length,
      0, // imageWidth - not needed for display
      0, // imageHeight - not needed for display
      tiles.length > 0 ? Math.max(...tiles.map((t) => t.x)) + 1 : 0, // tilesX
      tiles.length > 0 ? Math.max(...tiles.map((t) => t.y)) + 1 : 0 // tilesY
    );
  }, [tiles]);

  // Memoize the merged tiles to avoid recalculating on every render
  const enhancedTiles = useMemo(() => {
    if (!tileCollection) return [];

    try {
      const mergedCollection = tileCollection.mergeDuplicateTiles();
      return mergedCollection.tiles;
    } catch (error) {
      console.error("Error merging tiles:", error);
      return []; // Return empty array instead of tiles to avoid dependency
    }
  }, [tileCollection]);

  // Memoize the tilesX calculation
  const tilesX = useMemo(() => {
    return enhancedTiles.length > 0
      ? Math.max(...enhancedTiles.map((t: Tile) => t.x)) + 1
      : 0;
  }, [enhancedTiles]);

  // Memoize the border enhancement stats calculation
  const currentBorderStats = useMemo(() => {
    if (enhancedTiles.length === 0) return null;

    const originalBorderCount = enhancedTiles.reduce(
      (total: number, tile: Tile) => total + tile.getBorderCount(),
      0
    );

    return {
      originalBorderCount,
      enhancedBorderCount: originalBorderCount, // Currently no enhancement
      addedBorders: 0,
    };
  }, [enhancedTiles]);

  // Call the callback when enhanced tiles change
  useEffect(() => {
    // Only call the callback if the enhanced tiles have actually changed
    const prevTiles = prevEnhancedTilesRef.current;
    const tilesChanged =
      prevTiles.length !== enhancedTiles.length ||
      prevTiles.some(
        (prevTile, index) => prevTile.id !== enhancedTiles[index]?.id
      );

    if (onEnhancedTilesChange && tilesChanged) {
      prevEnhancedTilesRef.current = enhancedTiles;
      onEnhancedTilesChange(enhancedTiles);
    }
  }, [enhancedTiles]); // Remove onEnhancedTilesChange from dependencies to prevent infinite loop

  // Memoize the tiles grid to prevent unnecessary re-renders
  const tilesGrid = useMemo(
    () => (
      <div className={styles.tilesGrid}>
        {enhancedTiles.map((tile: Tile) => (
          <TileItem key={tile.id} tile={tile} />
        ))}
      </div>
    ),
    [enhancedTiles]
  );

  if (tiles.length === 0) {
    return null;
  }

  if (isEnhancing) {
    return (
      <div className={styles.tilesSection}>
        <h3 className={styles.tilesTitle}>Processing Tiles...</h3>
        <p>Merging duplicates and analyzing pixel borders...</p>
      </div>
    );
  }

  return (
    <div className={styles.tilesSection}>
      <h3 className={styles.tilesTitle}>
        Generated Tiles ({enhancedTiles.length} unique, {tiles.length} total)
      </h3>
      {enhancedTiles.length < tiles.length && (
        <p className={styles.mergeInfo}>
          Merged {tiles.length - enhancedTiles.length} duplicate tiles
        </p>
      )}

      {borderEnhancementStats && borderEnhancementStats.addedBorders > 0 && (
        <p className={styles.enhancementInfo}>
          Added {borderEnhancementStats.addedBorders} border relationships
          through pixel analysis (from{" "}
          {borderEnhancementStats.originalBorderCount} to{" "}
          {borderEnhancementStats.enhancedBorderCount} total)
        </p>
      )}

      {tilesGrid}
    </div>
  );
}
