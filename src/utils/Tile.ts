export class Tile {
  public readonly id: string;
  public readonly imageData: Uint8ClampedArray;
  public readonly width: number;
  public readonly height: number;
  public readonly borders: [Set<string>, Set<string>, Set<string>, Set<string>];

  constructor(
    tileId: string,
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    borders: [Set<string>, Set<string>, Set<string>, Set<string>]
  ) {
    this.id = tileId;
    this.imageData = imageData;
    this.width = width;
    this.height = height;
    this.borders = borders;
  }
}
