export class Tile {
  public readonly id: string;
  public readonly imageData: ImageData;
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;
  public readonly borders: [Set<string>, Set<string>, Set<string>, Set<string>];

  constructor(
    tileId: string,
    dataUrl: ImageData,
    x: number,
    y: number,
    width: number,
    height: number,
    borders: [Set<string>, Set<string>, Set<string>, Set<string>]
  ) {
    this.id = tileId;
    this.imageData = dataUrl;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.borders = borders;
  }
}
