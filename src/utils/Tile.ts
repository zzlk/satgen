export class Tile {
  public readonly id: string;
  public readonly imageData: Uint8ClampedArray;
  public readonly width: number;
  public readonly height: number;
  public readonly borders: [Set<string>, Set<string>, Set<string>, Set<string>];
  public readonly x: number;
  public readonly y: number;

  constructor(
    tileId: string,
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    borders: [Set<string>, Set<string>, Set<string>, Set<string>],
    x: number = 0,
    y: number = 0
  ) {
    this.id = tileId;
    this.imageData = imageData;
    this.width = width;
    this.height = height;
    this.borders = borders;
    this.x = x;
    this.y = y;
  }

  // Convert image data to data URL for display
  get dataUrl(): string {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imageData = new ImageData(
        new Uint8ClampedArray(this.imageData),
        this.width,
        this.height
      );
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    }
    return "";
  }

  // Get a label for the tile
  getLabel(): string {
    return `Tile ${this.id.substring(0, 8)}`;
  }

  // Get hash of the data URL
  getDataUrlHash(): string {
    return this.id.substring(0, 16);
  }

  // Get border IDs for a specific direction
  getBorderIds(direction: "north" | "east" | "south" | "west"): string[] {
    const directionMap = { north: 0, east: 1, south: 2, west: 3 };
    const index = directionMap[direction];
    return Array.from(this.borders[index]);
  }

  // Get total border count
  getBorderCount(): number {
    return this.borders.reduce((total, border) => total + border.size, 0);
  }
}
