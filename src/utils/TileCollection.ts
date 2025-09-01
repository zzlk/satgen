import { Tile } from "./Tile";

export class TileCollection {
  public tiles: Tile[];
  public totalTiles: number;
  public tileWidth: number;
  public tileHeight: number;

  constructor(
    tiles: Tile[],
    totalTiles: number,
    imageWidth: number,
    imageHeight: number
  ) {
    this.tiles = tiles;
    this.totalTiles = totalTiles;
    this.tileWidth = imageWidth;
    this.tileHeight = imageHeight;
  }

  // Static method to create TileCollection from tiles
  static fromTiles(
    tiles: Tile[],
    totalTiles: number,
    imageWidth: number,
    imageHeight: number,
    tilesX: number,
    tilesY: number
  ): TileCollection {
    return new TileCollection(tiles, totalTiles, imageWidth, imageHeight);
  }

  mergeInAnotherCollection(other: TileCollection): void {
    // Process each tile from the other collection
    other.tiles.forEach((otherTile) => {
      const existingTileIndex = this.tiles.findIndex(
        (t) => t.id === otherTile.id
      );

      if (existingTileIndex !== -1) {
        // Tile ID conflict - merge border data
        const existingTile = this.tiles[existingTileIndex];
        const mergedBorders: [
          Set<string>,
          Set<string>,
          Set<string>,
          Set<string>
        ] = [
          new Set([...existingTile.borders[0], ...otherTile.borders[0]]), // north
          new Set([...existingTile.borders[1], ...otherTile.borders[1]]), // east
          new Set([...existingTile.borders[2], ...otherTile.borders[2]]), // south
          new Set([...existingTile.borders[3], ...otherTile.borders[3]]), // west
        ];

        // Replace the existing tile with merged border data
        this.tiles[existingTileIndex] = new Tile(
          existingTile.id,
          existingTile.imageData,
          existingTile.width,
          existingTile.height,
          mergedBorders,
          existingTile.x,
          existingTile.y
        );
      } else {
        // New tile - add it to the current collection
        this.tiles.push(otherTile);
      }
    });

    // Update total tile count
    this.totalTiles = this.tiles.length;
  }
}
