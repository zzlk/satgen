import { Tile } from "../utils/Tile";

interface TileDisplayProps {
  tiles: Tile[];
}

export default function TileDisplay({ tiles }: TileDisplayProps) {
  if (tiles.length === 0) {
    return null;
  }

  // Calculate tilesX for proper tile numbering
  const tilesX = tiles.length > 0 ? Math.max(...tiles.map((t) => t.x)) + 1 : 0;

  return (
    <div className="tiles-section">
      <h3 className="tiles-title">Generated Tiles ({tiles.length} total)</h3>

      <div className="tiles-grid">
        {tiles.map((tile) => (
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
