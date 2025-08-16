import { Tile } from "../utils/Tile";
import { TileCollection } from "../utils/TileCollection";

interface TileDisplayProps {
  tiles: Tile[];
}

export default function TileDisplay({ tiles }: TileDisplayProps) {
  if (tiles.length === 0) {
    return null;
  }

  // Create a TileCollection and merge duplicates
  const tileCollection = TileCollection.fromTiles(
    tiles,
    tiles.length,
    0, // imageWidth - not needed for display
    0, // imageHeight - not needed for display
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.x)) + 1 : 0, // tilesX
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.y)) + 1 : 0 // tilesY
  );

  const mergedTiles = tileCollection.mergeDuplicateTiles().tiles;

  // Calculate tilesX for proper tile numbering
  const tilesX =
    mergedTiles.length > 0
      ? Math.max(...mergedTiles.map((t: Tile) => t.x)) + 1
      : 0;

  return (
    <div className="tiles-section">
      <h3 className="tiles-title">
        Generated Tiles ({mergedTiles.length} unique, {tiles.length} total)
      </h3>
      {mergedTiles.length < tiles.length && (
        <p className="merge-info">
          Merged {tiles.length - mergedTiles.length} duplicate tiles
        </p>
      )}

      <div className="tiles-grid">
        {mergedTiles.map((tile) => (
          <div key={tile.id} className="tile-item">
            <img
              src={tile.dataUrl}
              alt={tile.getLabel()}
              className="tile-image"
            />
            <p className="tile-label">{tile.getLabel()}</p>
            <p className="tile-hash">Hash: {tile.getDataUrlHash()}</p>
            <p className="tile-borders">
              Borders: {tile.getBorderCount()} (
              {tile.getAllBorderIds().join(", ")})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
