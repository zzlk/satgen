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
}
