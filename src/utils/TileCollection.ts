import type { Tile } from "./Tile";

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
}
