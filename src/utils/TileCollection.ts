import { Tile } from "./Tile";

export class TileCollection {
  public readonly tiles: Tile[];
  public readonly totalTiles: number;
  public readonly imageWidth: number;
  public readonly imageHeight: number;
  public readonly tilesX: number;
  public readonly tilesY: number;

  constructor(
    tiles: Tile[],
    totalTiles: number,
    imageWidth: number,
    imageHeight: number,
    tilesX: number,
    tilesY: number
  ) {
    this.tiles = tiles;
    this.totalTiles = totalTiles;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.tilesX = tilesX;
    this.tilesY = tilesY;
  }

  /**
   * Gets the number of tiles in the collection
   * @returns Number of tiles
   */
  getCount(): number {
    return this.tiles.length;
  }

  /**
   * Gets a tile by its ID
   * @param id - Tile ID to find
   * @returns Tile instance or undefined if not found
   */
  getTileById(id: string): Tile | undefined {
    return this.tiles.find((tile) => tile.id === id);
  }

  /**
   * Gets a tile by its coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Tile instance or undefined if not found
   */
  getTileByCoordinates(x: number, y: number): Tile | undefined {
    return this.tiles.find((tile) => tile.x === x && tile.y === y);
  }

  /**
   * Gets all tiles in a specific row
   * @param y - Y coordinate (row)
   * @returns Array of tiles in the specified row
   */
  getTilesInRow(y: number): Tile[] {
    return this.tiles.filter((tile) => tile.y === y).sort((a, b) => a.x - b.x);
  }

  /**
   * Gets all tiles in a specific column
   * @param x - X coordinate (column)
   * @returns Array of tiles in the specified column
   */
  getTilesInColumn(x: number): Tile[] {
    return this.tiles.filter((tile) => tile.x === x).sort((a, b) => a.y - b.y);
  }

  /**
   * Creates a TileCollection from an array of tiles and metadata
   * @param tiles - Array of tiles
   * @param totalTiles - Total number of tiles
   * @param imageWidth - Original image width
   * @param imageHeight - Original image height
   * @param tilesX - Number of tiles in X direction
   * @param tilesY - Number of tiles in Y direction
   * @returns New TileCollection instance
   */
  static fromTiles(
    tiles: Tile[],
    totalTiles: number,
    imageWidth: number,
    imageHeight: number,
    tilesX: number,
    tilesY: number
  ): TileCollection {
    return new TileCollection(
      tiles,
      totalTiles,
      imageWidth,
      imageHeight,
      tilesX,
      tilesY
    );
  }

  /**
   * Merges duplicate tiles by hash, keeping the one closest to origin
   * @returns New TileCollection with merged duplicates
   */
  mergeDuplicateTiles(): TileCollection {
    // Group tiles by their hash
    const hashGroups = new Map<string, Tile[]>();

    for (const tile of this.tiles) {
      const hash = tile.getDataUrlHash();
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, []);
      }
      hashGroups.get(hash)!.push(tile);
    }

    // Process each group of duplicates
    const mergedTiles: Tile[] = [];
    const processedHashes = new Set<string>();

    for (const [hash, tiles] of hashGroups) {
      if (tiles.length === 1) {
        // No duplicates, keep the tile as is
        mergedTiles.push(tiles[0]);
      } else {
        // Find the tile closest to origin (0,0)
        const closestTile = tiles.reduce((closest, current) => {
          const closestDistance = Math.sqrt(
            closest.x * closest.x + closest.y * closest.y
          );
          const currentDistance = Math.sqrt(
            current.x * current.x + current.y * current.y
          );
          return currentDistance < closestDistance ? current : closest;
        });

        // Merge border information from all duplicate tiles
        const mergedBorders = {
          north: new Set<string>(),
          east: new Set<string>(),
          south: new Set<string>(),
          west: new Set<string>(),
        };

        // Collect all border information from duplicate tiles
        for (const tile of tiles) {
          tile.borders.north.forEach((id) => mergedBorders.north.add(id));
          tile.borders.east.forEach((id) => mergedBorders.east.add(id));
          tile.borders.south.forEach((id) => mergedBorders.south.add(id));
          tile.borders.west.forEach((id) => mergedBorders.west.add(id));
        }

        // Remove references to the duplicate tiles from the merged borders
        for (const tile of tiles) {
          mergedBorders.north.delete(tile.id);
          mergedBorders.east.delete(tile.id);
          mergedBorders.south.delete(tile.id);
          mergedBorders.west.delete(tile.id);
        }

        // Create a new tile with merged borders
        const mergedTile = new Tile(
          closestTile.dataUrl,
          closestTile.x,
          closestTile.y,
          closestTile.width,
          closestTile.height,
          this.tilesX,
          this.tilesY
        );

        // Replace the borders with merged borders
        (mergedTile as any).borders = mergedBorders;

        mergedTiles.push(mergedTile);
        processedHashes.add(hash);
      }
    }

    // Update border references to point to the kept tiles
    for (const tile of mergedTiles) {
      const updatedBorders = {
        north: new Set<string>(),
        east: new Set<string>(),
        south: new Set<string>(),
        west: new Set<string>(),
      };

      // For each border direction, find the corresponding kept tile
      for (const direction of ["north", "east", "south", "west"] as const) {
        for (const borderId of tile.borders[direction]) {
          const borderTile = this.getTileById(borderId);
          if (borderTile) {
            const borderHash = borderTile.getDataUrlHash();
            const keptTile = mergedTiles.find(
              (t) => t.getDataUrlHash() === borderHash
            );
            if (keptTile) {
              updatedBorders[direction].add(keptTile.id);
            }
          }
        }
      }

      (tile as any).borders = updatedBorders;
    }

    // Create new collection with merged tiles
    return new TileCollection(
      mergedTiles,
      mergedTiles.length,
      this.imageWidth,
      this.imageHeight,
      this.tilesX,
      this.tilesY
    );
  }
}
