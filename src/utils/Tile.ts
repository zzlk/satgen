export interface TileBorders {
  north: Set<string>;
  east: Set<string>;
  south: Set<string>;
  west: Set<string>;
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
      north: this.y > 0 ? new Set([`tile_${this.x}_${this.y - 1}`]) : new Set(),
      east:
        this.x < tilesX - 1
          ? new Set([`tile_${this.x + 1}_${this.y}`])
          : new Set(),
      south:
        this.y < tilesY - 1
          ? new Set([`tile_${this.x}_${this.y + 1}`])
          : new Set(),
      west: this.x > 0 ? new Set([`tile_${this.x - 1}_${this.y}`]) : new Set(),
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
   * Gets the tile ID as the label
   * @returns Tile ID string
   */
  getLabel(): string {
    return this.id;
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
    ].reduce((total, borderSet) => total + borderSet.size, 0);
  }

  /**
   * Checks if the tile has a border in the specified direction
   * @param direction - Direction to check ('north', 'east', 'south', 'west')
   * @returns True if the tile has a border in that direction
   */
  hasBorder(direction: keyof TileBorders): boolean {
    return this.borders[direction].size > 0;
  }

  /**
   * Gets the IDs of bordering tiles in the specified direction
   * @param direction - Direction to get borders from ('north', 'east', 'south', 'west')
   * @returns Array of border tile IDs
   */
  getBorderIds(direction: keyof TileBorders): string[] {
    return Array.from(this.borders[direction]);
  }

  /**
   * Gets all bordering tile IDs as an array
   * @returns Array of all bordering tile IDs
   */
  getAllBorderIds(): string[] {
    const allIds: string[] = [];
    this.borders.north.forEach((id) => allIds.push(id));
    this.borders.east.forEach((id) => allIds.push(id));
    this.borders.south.forEach((id) => allIds.push(id));
    this.borders.west.forEach((id) => allIds.push(id));
    return allIds;
  }

  /**
   * Adds a border tile ID to a specific direction
   * @param direction - Direction to add border to ('north', 'east', 'south', 'west')
   * @param tileId - ID of the tile to add as border
   */
  addBorder(direction: keyof TileBorders, tileId: string): void {
    this.borders[direction].add(tileId);
  }

  /**
   * Removes a border tile ID from a specific direction
   * @param direction - Direction to remove border from ('north', 'east', 'south', 'west')
   * @param tileId - ID of the tile to remove from borders
   */
  removeBorder(direction: keyof TileBorders, tileId: string): void {
    this.borders[direction].delete(tileId);
  }

  /**
   * Gets the total number of unique bordering tiles (no duplicates)
   * @returns Number of unique bordering tiles
   */
  getUniqueBorderCount(): number {
    const allIds = new Set<string>();
    this.borders.north.forEach((id) => allIds.add(id));
    this.borders.east.forEach((id) => allIds.add(id));
    this.borders.south.forEach((id) => allIds.add(id));
    this.borders.west.forEach((id) => allIds.add(id));
    return allIds.size;
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
