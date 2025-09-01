import { useEffect, useMemo, memo, useRef } from "react";
import { Tile } from "../utils/Tile";
import styles from "./TileDisplay.module.css";

interface TileDisplayProps {
  tiles: Tile[];
  onTilesChange?: (tiles: Tile[]) => void;
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
  onTilesChange,
}: TileDisplayProps) {
  const prevTilesRef = useRef<Tile[]>([]);

  // Call the callback when tiles change
  useEffect(() => {
    // Only call the callback if the tiles have actually changed
    const prevTiles = prevTilesRef.current;
    const tilesChanged =
      prevTiles.length !== tiles.length ||
      prevTiles.some(
        (prevTile: Tile, index: number) => prevTile.id !== tiles[index]?.id
      );

    if (onTilesChange && tilesChanged) {
      prevTilesRef.current = tiles;
      onTilesChange(tiles);
    }
  }, [tiles, onTilesChange]);

  // Memoize the tiles grid to prevent unnecessary re-renders
  const tilesGrid = useMemo(
    () => (
      <div className={styles.tilesGrid}>
        {tiles.map((tile: Tile) => (
          <TileItem key={tile.id} tile={tile} />
        ))}
      </div>
    ),
    [tiles]
  );

  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className={styles.tilesSection}>
      <h3 className={styles.tilesTitle}>
        Generated Tiles ({tiles.length} total)
      </h3>

      {tilesGrid}
    </div>
  );
}
