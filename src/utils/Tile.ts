export interface TileBorders {
  north: string | null;
  east: string | null;
  south: string | null;
  west: string | null;
}

export class Tile {
  public readonly id: string;
  public readonly dataUrl: string;
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;
  public readonly borders: TileBorders;

  constructor(
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
    tilesX: number,
    tilesY: number
  ) {
    this.dataUrl = dataUrl;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.id = this.generateId(x, y);
    this.borders = this.calculateBorders(tilesX, tilesY);
  }

  /**
   * Generates a unique ID for the tile based on its coordinates
   * @param x - X coordinate of the tile
   * @param y - Y coordinate of the tile
   * @returns Unique tile ID string
   */
  private generateId(x: number, y: number): string {
    return `tile_${x}_${y}`;
  }

  /**
   * Calculates the IDs of bordering tiles
   * @param tilesX - Total number of tiles in X direction
   * @param tilesY - Total number of tiles in Y direction
   * @returns Object with bordering tile IDs
   */
  private calculateBorders(tilesX: number, tilesY: number): TileBorders {
    return {
      north: this.y > 0 ? `tile_${this.x}_${this.y - 1}` : null,
      east: this.x < tilesX - 1 ? `tile_${this.x + 1}_${this.y}` : null,
      south: this.y < tilesY - 1 ? `tile_${this.x}_${this.y + 1}` : null,
      west: this.x > 0 ? `tile_${this.x - 1}_${this.y}` : null,
    };
  }

  /**
   * Gets the tile number (1-based index) based on position in grid
   * @param tilesX - Number of tiles in X direction
   * @returns Tile number
   */
  getTileNumber(tilesX: number): number {
    return this.y * tilesX + this.x + 1;
  }

  /**
   * Gets a human-readable label for the tile
   * @param tilesX - Number of tiles in X direction
   * @returns Tile label string
   */
  getLabel(tilesX: number): string {
    return `Tile ${this.getTileNumber(tilesX)}`;
  }

  /**
   * Gets the number of bordering tiles
   * @returns Number of bordering tiles (0-4)
   */
  getBorderCount(): number {
    return [
      this.borders.north,
      this.borders.east,
      this.borders.south,
      this.borders.west,
    ].filter((border) => border !== null).length;
  }

  /**
   * Checks if the tile has a border in the specified direction
   * @param direction - Direction to check ('north', 'east', 'south', 'west')
   * @returns True if the tile has a border in that direction
   */
  hasBorder(direction: keyof TileBorders): boolean {
    return this.borders[direction] !== null;
  }

  /**
   * Gets the ID of the bordering tile in the specified direction
   * @param direction - Direction to get border from ('north', 'east', 'south', 'west')
   * @returns Border tile ID or null if no border exists
   */
  getBorderId(direction: keyof TileBorders): string | null {
    return this.borders[direction];
  }

  /**
   * Gets all bordering tile IDs as an array
   * @returns Array of bordering tile IDs (excluding null values)
   */
  getAllBorderIds(): string[] {
    return [
      this.borders.north,
      this.borders.east,
      this.borders.south,
      this.borders.west,
    ].filter((id): id is string => id !== null);
  }

  /**
   * Creates a Tile instance from coordinates and image data
   * @param dataUrl - Image data URL
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Tile width
   * @param height - Tile height
   * @param tilesX - Total number of tiles in X direction
   * @param tilesY - Total number of tiles in Y direction
   * @returns New Tile instance
   */
  static create(
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
    tilesX: number,
    tilesY: number
  ): Tile {
    return new Tile(dataUrl, x, y, width, height, tilesX, tilesY);
  }
}
