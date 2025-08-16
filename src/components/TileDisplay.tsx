interface TileDisplayProps {
  tiles: string[];
}

export default function TileDisplay({ tiles }: TileDisplayProps) {
  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className="tiles-section">
      <h3 className="tiles-title">Generated Tiles ({tiles.length} total)</h3>

      <div className="tiles-grid">
        {tiles.map((tile, index) => (
          <div key={index} className="tile-item">
            <img src={tile} alt={`Tile ${index + 1}`} className="tile-image" />
            <p className="tile-label">Tile {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
