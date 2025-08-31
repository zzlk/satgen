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
    tilesY: number,
    existingTileIds?: Set<string>
  ) {
    this.dataUrl = dataUrl;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.id = this.generateId(x, y);
    this.borders = this.calculateBorders(tilesX, tilesY, existingTileIds);
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
   * @param existingTileIds - Set of tile IDs that actually exist (not pure black tiles)
   * @returns Object with bordering tile IDs
   */
  private calculateBorders(
    tilesX: number,
    tilesY: number,
    existingTileIds?: Set<string>
  ): TileBorders {
    const borders: TileBorders = {
      north: new Set(),
      east: new Set(),
      south: new Set(),
      west: new Set(),
    };

    // North border
    if (this.y > 0) {
      const northTileId = `tile_${this.x}_${this.y - 1}`;
      if (!existingTileIds || existingTileIds.has(northTileId)) {
        borders.north.add(northTileId);
      }
    }

    // East border
    if (this.x < tilesX - 1) {
      const eastTileId = `tile_${this.x + 1}_${this.y}`;
      if (!existingTileIds || existingTileIds.has(eastTileId)) {
        borders.east.add(eastTileId);
      }
    }

    // South border
    if (this.y < tilesY - 1) {
      const southTileId = `tile_${this.x}_${this.y + 1}`;
      if (!existingTileIds || existingTileIds.has(southTileId)) {
        borders.south.add(southTileId);
      }
    }

    // West border
    if (this.x > 0) {
      const westTileId = `tile_${this.x - 1}_${this.y}`;
      if (!existingTileIds || existingTileIds.has(westTileId)) {
        borders.west.add(westTileId);
      }
    }

    return borders;
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
   * Generates a hash value of the image content
   * @returns Promise that resolves with the hash string
   */
  async getContentHash(): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(""); // Return empty string if canvas context is not available
          return;
        }

        canvas.width = this.width;
        canvas.height = this.height;

        // Draw the tile image to canvas
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;

        // Simple hash function for image data
        let hash = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Use RGB values for hashing (skip alpha channel for performance)
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Simple hash combination
          hash = ((hash << 5) - hash + r + g + b) & 0xffffffff;
        }

        // Convert to hex string
        const hashString = Math.abs(hash).toString(16).padStart(8, "0");
        resolve(hashString);
      };

      img.onerror = () => {
        resolve(""); // Return empty string on error
      };

      img.src = this.dataUrl;
    });
  }

  /**
   * Generates a simple hash based on the data URL
   * This is faster than getContentHash but less accurate
   * @returns Hash string
   */
  getDataUrlHash(): string {
    let hash = 0;
    const str = this.dataUrl;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }

    return Math.abs(hash).toString(16).padStart(8, "0");
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
   * @param existingTileIds - Optional set of tile IDs that actually exist (not pure black tiles)
   * @returns New Tile instance
   */
  static create(
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
    tilesX: number,
    tilesY: number,
    existingTileIds?: Set<string>
  ): Tile {
    return new Tile(
      dataUrl,
      x,
      y,
      width,
      height,
      tilesX,
      tilesY,
      existingTileIds
    );
  }
}
