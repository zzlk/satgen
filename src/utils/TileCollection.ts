import { Tile } from "./Tile";
import type { TileBorders } from "./Tile";

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

        // Check if any of the duplicate tiles were adjacent to each other in the source
        // If so, add self-references for those boundaries
        for (let i = 0; i < tiles.length; i++) {
          for (let j = i + 1; j < tiles.length; j++) {
            const tile1 = tiles[i];
            const tile2 = tiles[j];

            // Check if tiles were adjacent in the source image
            const dx = Math.abs(tile1.x - tile2.x);
            const dy = Math.abs(tile1.y - tile2.y);

            if (dx === 1 && dy === 0) {
              // Tiles were horizontally adjacent
              mergedBorders.east.add(closestTile.id);
              mergedBorders.west.add(closestTile.id);
            } else if (dx === 0 && dy === 1) {
              // Tiles were vertically adjacent
              mergedBorders.south.add(closestTile.id);
              mergedBorders.north.add(closestTile.id);
            }
          }
        }

        // Create a new tile with merged borders
        const mergedTile = new Tile(
          closestTile.dataUrl,
          closestTile.x,
          closestTile.y,
          closestTile.width,
          closestTile.height,
          this.tilesX,
          this.tilesY,
          undefined // No existingTileIds needed for merged tiles
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

  /**
   * Merges this TileCollection with another TileCollection
   * @param other - The TileCollection to merge with
   * @returns New TileCollection with merged tiles and rules
   */
  mergeWith(other: TileCollection): TileCollection {
    // Create a map of tiles by hash for efficient lookup
    const thisTilesByHash = new Map<string, Tile>();
    const otherTilesByHash = new Map<string, Tile>();

    for (const tile of this.tiles) {
      const hash = tile.getDataUrlHash();
      thisTilesByHash.set(hash, tile);
    }

    for (const tile of other.tiles) {
      const hash = tile.getDataUrlHash();
      otherTilesByHash.set(hash, tile);
    }

    // Merge tiles, keeping the one closest to origin when duplicates exist
    const mergedTiles: Tile[] = [];
    const processedHashes = new Set<string>();

    // Process all tiles from both collections
    const allTiles = [...this.tiles, ...other.tiles];

    for (const tile of allTiles) {
      const hash = tile.getDataUrlHash();

      if (processedHashes.has(hash)) {
        continue; // Already processed this hash
      }

      const thisTile = thisTilesByHash.get(hash);
      const otherTile = otherTilesByHash.get(hash);

      if (thisTile && otherTile) {
        // Both collections have this tile - merge them
        const mergedTile = this.mergeDuplicateTilesInCollections(
          thisTile,
          otherTile
        );
        mergedTiles.push(mergedTile);
      } else if (thisTile) {
        // Only this collection has this tile
        mergedTiles.push(thisTile);
      } else if (otherTile) {
        // Only other collection has this tile
        mergedTiles.push(otherTile);
      }

      processedHashes.add(hash);
    }

    // Update border references to point to the correct merged tiles
    const mergedTilesByHash = new Map<string, Tile>();
    for (const tile of mergedTiles) {
      const hash = tile.getDataUrlHash();
      mergedTilesByHash.set(hash, tile);
    }

    // Update borders for all merged tiles
    for (const tile of mergedTiles) {
      const updatedBorders = {
        north: new Set<string>(),
        east: new Set<string>(),
        south: new Set<string>(),
        west: new Set<string>(),
      };

      // For each border direction, find the corresponding merged tile
      for (const direction of ["north", "east", "south", "west"] as const) {
        for (const borderId of tile.borders[direction]) {
          // Find the original tile by ID
          const originalTile =
            this.getTileById(borderId) || other.getTileById(borderId);
          if (originalTile) {
            const borderHash = originalTile.getDataUrlHash();
            const mergedBorderTile = mergedTilesByHash.get(borderHash);
            if (mergedBorderTile) {
              updatedBorders[direction].add(mergedBorderTile.id);
            }
          }
        }
      }

      (tile as any).borders = updatedBorders;
    }

    // Ensure commutative rules (if A borders B, then B must border A)
    this.ensureCommutativeRules(mergedTiles);

    // Calculate new dimensions (use the larger of the two collections)
    const newImageWidth = Math.max(this.imageWidth, other.imageWidth);
    const newImageHeight = Math.max(this.imageHeight, other.imageHeight);
    const newTilesX = Math.max(this.tilesX, other.tilesX);
    const newTilesY = Math.max(this.tilesY, other.tilesY);

    return new TileCollection(
      mergedTiles,
      mergedTiles.length,
      newImageWidth,
      newImageHeight,
      newTilesX,
      newTilesY
    );
  }

  /**
   * Merges two tiles with the same hash from different collections
   * @param tile1 - First tile
   * @param tile2 - Second tile
   * @returns Merged tile
   */
  private mergeDuplicateTilesInCollections(tile1: Tile, tile2: Tile): Tile {
    // Keep the tile closest to origin
    const distance1 = Math.sqrt(tile1.x * tile1.x + tile1.y * tile1.y);
    const distance2 = Math.sqrt(tile2.x * tile2.x + tile2.y * tile2.y);
    const keptTile = distance1 <= distance2 ? tile1 : tile2;

    // Merge border information from both tiles
    const mergedBorders = {
      north: new Set<string>(),
      east: new Set<string>(),
      south: new Set<string>(),
      west: new Set<string>(),
    };

    // Collect all border information from both tiles
    tile1.borders.north.forEach((id) => mergedBorders.north.add(id));
    tile1.borders.east.forEach((id) => mergedBorders.east.add(id));
    tile1.borders.south.forEach((id) => mergedBorders.south.add(id));
    tile1.borders.west.forEach((id) => mergedBorders.west.add(id));

    tile2.borders.north.forEach((id) => mergedBorders.north.add(id));
    tile2.borders.east.forEach((id) => mergedBorders.east.add(id));
    tile2.borders.south.forEach((id) => mergedBorders.south.add(id));
    tile2.borders.west.forEach((id) => mergedBorders.west.add(id));

    // Remove references to the duplicate tiles from the merged borders
    mergedBorders.north.delete(tile1.id);
    mergedBorders.east.delete(tile1.id);
    mergedBorders.south.delete(tile1.id);
    mergedBorders.west.delete(tile1.id);

    mergedBorders.north.delete(tile2.id);
    mergedBorders.east.delete(tile2.id);
    mergedBorders.south.delete(tile2.id);
    mergedBorders.west.delete(tile2.id);

    // Check if the original tiles had self-borders and preserve them
    // This handles the case where tiles from different collections can border themselves
    if (
      tile1.borders.north.has(tile1.id) ||
      tile2.borders.north.has(tile2.id)
    ) {
      mergedBorders.north.add(keptTile.id);
    }
    if (tile1.borders.east.has(tile1.id) || tile2.borders.east.has(tile2.id)) {
      mergedBorders.east.add(keptTile.id);
    }
    if (
      tile1.borders.south.has(tile1.id) ||
      tile2.borders.south.has(tile2.id)
    ) {
      mergedBorders.south.add(keptTile.id);
    }
    if (tile1.borders.west.has(tile1.id) || tile2.borders.west.has(tile2.id)) {
      mergedBorders.west.add(keptTile.id);
    }

    // Create a new tile with merged borders
    const mergedTile = new Tile(
      keptTile.dataUrl,
      keptTile.x,
      keptTile.y,
      keptTile.width,
      keptTile.height,
      this.tilesX,
      this.tilesY,
      undefined
    );

    // Replace the borders with merged borders
    (mergedTile as any).borders = mergedBorders;

    return mergedTile;
  }

  /**
   * Ensures that border rules are commutative (if A borders B, then B must border A)
   * @param tiles - Array of tiles to update
   */
  private ensureCommutativeRules(tiles: Tile[]): void {
    // Create a map for quick tile lookup
    const tilesById = new Map<string, Tile>();
    for (const tile of tiles) {
      tilesById.set(tile.id, tile);
    }

    // For each tile, ensure all its borders are commutative
    for (const tile of tiles) {
      for (const direction of ["north", "east", "south", "west"] as const) {
        for (const borderId of tile.borders[direction]) {
          const borderTile = tilesById.get(borderId);
          if (borderTile) {
            // Determine the opposite direction
            const oppositeDirection = this.getOppositeDirection(direction);

            // Ensure the border tile has this tile in its opposite direction
            if (!borderTile.borders[oppositeDirection].has(tile.id)) {
              (borderTile as any).borders[oppositeDirection].add(tile.id);
            }
          }
        }
      }
    }
  }

  /**
   * Gets the opposite direction
   * @param direction - Original direction
   * @returns Opposite direction
   */
  private getOppositeDirection(
    direction: keyof TileBorders
  ): keyof TileBorders {
    switch (direction) {
      case "north":
        return "south";
      case "south":
        return "north";
      case "east":
        return "west";
      case "west":
        return "east";
      default:
        return direction;
    }
  }

  /**
   * Analyzes pixel borders to find compatible tiles and adds them to border sets
   * @returns New TileCollection with enhanced border information
   */
  // INACTIVATED: Pixel border analysis merging temporarily disabled
  /*
  async addCompatibleBorders(): Promise<TileCollection> {
    if (this.tiles.length === 0) {
      return this;
    }

    // Create deep copies of tiles with enhanced borders
    const enhancedTiles: Tile[] = [];

    for (const tile of this.tiles) {
      // Create a new tile with the same properties
      const enhancedTile = new Tile(
        tile.dataUrl,
        tile.x,
        tile.y,
        tile.width,
        tile.height,
        this.tilesX,
        this.tilesY,
        undefined // No existingTileIds needed for enhanced tiles
      );

      // Copy existing borders
      (enhancedTile as any).borders = {
        north: new Set(tile.borders.north),
        east: new Set(tile.borders.east),
        south: new Set(tile.borders.south),
        west: new Set(tile.borders.west),
      };

      enhancedTiles.push(enhancedTile);
    }

    // Analyze pixel borders for each tile
    for (let i = 0; i < enhancedTiles.length; i++) {
      const tile1 = enhancedTiles[i];

      // Get pixel borders for tile1
      const tile1Borders = await this.getPixelBorders(tile1);

      // Check self-compatibility (tile can border itself)
      this.checkAndAddSelfCompatibility(tile1, tile1Borders);

      for (let j = i + 1; j < enhancedTiles.length; j++) {
        const tile2 = enhancedTiles[j];

        // Get pixel borders for tile2
        const tile2Borders = await this.getPixelBorders(tile2);

        // Check compatibility in all directions
        this.checkAndAddCompatibility(tile1, tile2, tile1Borders, tile2Borders);
      }
    }

    return new TileCollection(
      enhancedTiles,
      enhancedTiles.length,
      this.imageWidth,
      this.imageHeight,
      this.tilesX,
      this.tilesY
    );
  }
  */

  /**
   * Gets the pixel borders of a tile
   * @param tile - The tile to analyze
   * @returns Object with pixel border data
   */
  // INACTIVATED: Helper method for pixel border analysis
  /*
  private async getPixelBorders(tile: Tile): Promise<{
    north: Uint8ClampedArray;
    east: Uint8ClampedArray;
    south: Uint8ClampedArray;
    west: Uint8ClampedArray;
  }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({
            north: new Uint8ClampedArray(),
            east: new Uint8ClampedArray(),
            south: new Uint8ClampedArray(),
            west: new Uint8ClampedArray(),
          });
          return;
        }

        canvas.width = tile.width;
        canvas.height = tile.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, tile.width, tile.height);
        const data = imageData.data;

        // Extract border pixels
        const north: Uint8ClampedArray = new Uint8ClampedArray(tile.width * 4);
        const east: Uint8ClampedArray = new Uint8ClampedArray(tile.height * 4);
        const south: Uint8ClampedArray = new Uint8ClampedArray(tile.width * 4);
        const west: Uint8ClampedArray = new Uint8ClampedArray(tile.height * 4);

        // North border (top row)
        for (let x = 0; x < tile.width; x++) {
          const index = (x + 0 * tile.width) * 4;
          north[x * 4] = data[index]; // R
          north[x * 4 + 1] = data[index + 1]; // G
          north[x * 4 + 2] = data[index + 2]; // B
          north[x * 4 + 3] = data[index + 3]; // A
        }

        // East border (right column)
        for (let y = 0; y < tile.height; y++) {
          const index = (tile.width - 1 + y * tile.width) * 4;
          east[y * 4] = data[index]; // R
          east[y * 4 + 1] = data[index + 1]; // G
          east[y * 4 + 2] = data[index + 2]; // B
          east[y * 4 + 3] = data[index + 3]; // A
        }

        // South border (bottom row)
        for (let x = 0; x < tile.width; x++) {
          const index = (x + (tile.height - 1) * tile.width) * 4;
          south[x * 4] = data[index]; // R
          south[x * 4 + 1] = data[index + 1]; // G
          south[x * 4 + 2] = data[index + 2]; // B
          south[x * 4 + 3] = data[index + 3]; // A
        }

        // West border (left column)
        for (let y = 0; y < tile.height; y++) {
          const index = (0 + y * tile.width) * 4;
          west[y * 4] = data[index]; // R
          west[y * 4 + 1] = data[index + 1]; // G
          west[y * 4 + 2] = data[index + 2]; // B
          west[y * 4 + 3] = data[index + 3]; // A
        }

        resolve({ north, east, south, west });
      };

      img.onerror = () => {
        resolve({
          north: new Uint8ClampedArray(),
          east: new Uint8ClampedArray(),
          south: new Uint8ClampedArray(),
          west: new Uint8ClampedArray(),
        });
      };

      img.src = tile.dataUrl;
    });
  }
  */

  /**
   * Checks if two pixel borders are compatible and adds them to border sets
   * @param tile1 - First tile
   * @param tile2 - Second tile
   * @param borders1 - Pixel borders of first tile
   * @param borders2 - Pixel borders of second tile
   */
  // INACTIVATED: Helper method for pixel border analysis
  /*
  private checkAndAddCompatibility(
    tile1: Tile,
    tile2: Tile,
    borders1: {
      north: Uint8ClampedArray;
      east: Uint8ClampedArray;
      south: Uint8ClampedArray;
      west: Uint8ClampedArray;
    },
    borders2: {
      north: Uint8ClampedArray;
      east: Uint8ClampedArray;
      south: Uint8ClampedArray;
      west: Uint8ClampedArray;
    }
  ): void {
    // Check tile1's north with tile2's south
    if (this.areBordersCompatible(borders1.north, borders2.south)) {
      (tile1 as any).borders.north.add(tile2.id);
      (tile2 as any).borders.south.add(tile1.id);
    }

    // Check tile1's east with tile2's west
    if (this.areBordersCompatible(borders1.east, borders2.west)) {
      (tile1 as any).borders.east.add(tile2.id);
      (tile2 as any).borders.west.add(tile1.id);
    }

    // Check tile1's south with tile2's north
    if (this.areBordersCompatible(borders1.south, borders2.north)) {
      (tile1 as any).borders.south.add(tile2.id);
      (tile2 as any).borders.north.add(tile1.id);
    }

    // Check tile1's west with tile2's east
    if (this.areBordersCompatible(borders1.west, borders2.east)) {
      (tile1 as any).borders.west.add(tile2.id);
      (tile2 as any).borders.east.add(tile1.id);
    }
  }
  */

  /**
   * Checks if a tile can border itself and adds self-references to border sets
   * @param tile - The tile to check for self-compatibility
   * @param borders - Pixel borders of the tile
   */
  // INACTIVATED: Helper method for pixel border analysis
  /*
  private checkAndAddSelfCompatibility(
    tile: Tile,
    borders: {
      north: Uint8ClampedArray;
      east: Uint8ClampedArray;
      south: Uint8ClampedArray;
      west: Uint8ClampedArray;
    }
  ): void {
    // Check if north border can connect to south border (tile above itself)
    // This means the tile's north edge can connect to another instance of the same tile's south edge
    if (this.areBordersCompatible(borders.north, borders.south)) {
      (tile as any).borders.north.add(tile.id);
      (tile as any).borders.south.add(tile.id);
    }

    // Check if east border can connect to west border (tile to the right of itself)
    // This means the tile's east edge can connect to another instance of the same tile's west edge
    if (this.areBordersCompatible(borders.east, borders.west)) {
      (tile as any).borders.east.add(tile.id);
      (tile as any).borders.west.add(tile.id);
    }

    // Note: We don't check same-direction borders (north-to-north, east-to-east, etc.)
    // because those would require the tile to be rotated, which we're not supporting
    // in this implementation. Same-direction borders should only be compatible if
    // the tile has uniform borders in that direction.
  }
  */

  /**
   * Checks if two pixel borders are compatible
   * @param border1 - First border pixel data
   * @param border2 - Second border pixel data
   * @returns True if borders are compatible
   */
  // INACTIVATED: Helper method for pixel border analysis
  /*
  private areBordersCompatible(
    border1: Uint8ClampedArray,
    border2: Uint8ClampedArray
  ): boolean {
    if (border1.length !== border2.length) {
      return false;
    }

    // Check if all pixels match (allowing for small tolerance)
    const tolerance = 5; // Allow small color variations

    for (let i = 0; i < border1.length; i += 4) {
      const r1 = border1[i];
      const g1 = border1[i + 1];
      const b1 = border1[i + 2];
      const a1 = border1[i + 3];

      const r2 = border2[i];
      const g2 = border2[i + 1];
      const b2 = border2[i + 2];
      const a2 = border2[i + 3];

      if (
        Math.abs(r1 - r2) > tolerance ||
        Math.abs(g1 - g2) > tolerance ||
        Math.abs(b1 - b2) > tolerance ||
        Math.abs(a1 - a2) > tolerance
      ) {
        return false;
      }
    }

    return true;
  }
  */
}
