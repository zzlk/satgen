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

  /**
   * Synthesizes a new image by placing compatible tiles based on border information
   * @param targetWidth - Desired width in pixels (must be multiple of tile width)
   * @param targetHeight - Desired height in pixels (must be multiple of tile height)
   * @returns Promise that resolves with the synthesized image as data URL
   */
  async synthesize(targetWidth: number, targetHeight: number): Promise<string> {
    if (this.tiles.length === 0) {
      throw new Error("No tiles available for synthesis");
    }

    // Get tile dimensions from the first tile
    const tileWidth = this.tiles[0].width;
    const tileHeight = this.tiles[0].height;

    // Validate target dimensions are multiples of tile dimensions
    if (targetWidth % tileWidth !== 0) {
      throw new Error(
        `Target width ${targetWidth} must be a multiple of tile width ${tileWidth}`
      );
    }
    if (targetHeight % tileHeight !== 0) {
      throw new Error(
        `Target height ${targetHeight} must be a multiple of tile height ${tileHeight}`
      );
    }

    // Calculate grid dimensions
    const gridWidth = targetWidth / tileWidth;
    const gridHeight = targetHeight / tileHeight;

    // Create canvas for the synthesized image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill with transparent background
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // 2D array to store placed tiles
    const placedTiles: (Tile | null)[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(null));

    // Helper function to get compatible tiles for a position
    const getCompatibleTiles = (gridX: number, gridY: number): Tile[] => {
      const compatibleTiles: Tile[] = [];

      for (const tile of this.tiles) {
        let isCompatible = true;

        // Check north neighbor (if exists)
        if (gridY > 0 && placedTiles[gridY - 1][gridX]) {
          const northTile = placedTiles[gridY - 1][gridX]!;
          if (
            !northTile.borders.south.has(tile.id) &&
            !tile.borders.north.has(northTile.id)
          ) {
            isCompatible = false;
          }
        }

        // Check west neighbor (if exists)
        if (gridX > 0 && placedTiles[gridY][gridX - 1]) {
          const westTile = placedTiles[gridY][gridX - 1]!;
          if (
            !westTile.borders.east.has(tile.id) &&
            !tile.borders.west.has(westTile.id)
          ) {
            isCompatible = false;
          }
        }

        if (isCompatible) {
          compatibleTiles.push(tile);
        }
      }

      return compatibleTiles;
    };

    // Place tiles with border compatibility
    for (let gridY = 0; gridY < gridHeight; gridY++) {
      for (let gridX = 0; gridX < gridWidth; gridX++) {
        // Get compatible tiles for this position
        const compatibleTiles = getCompatibleTiles(gridX, gridY);

        // If no compatible tiles found, use any tile (fallback)
        const availableTiles =
          compatibleTiles.length > 0 ? compatibleTiles : this.tiles;

        // Pick a random tile from compatible ones
        const randomIndex = Math.floor(Math.random() * availableTiles.length);
        const selectedTile = availableTiles[randomIndex];

        // Store the selected tile
        placedTiles[gridY][gridX] = selectedTile;

        // Calculate position in the target image
        const targetX = gridX * tileWidth;
        const targetY = gridY * tileHeight;

        // Create a temporary canvas to load the tile image
        const tileCanvas = document.createElement("canvas");
        const tileCtx = tileCanvas.getContext("2d");

        if (tileCtx) {
          const tileImg = new Image();

          await new Promise<void>((resolve, reject) => {
            tileImg.onload = () => {
              tileCanvas.width = tileWidth;
              tileCanvas.height = tileHeight;

              // Draw the tile to the temporary canvas
              tileCtx.drawImage(tileImg, 0, 0, tileWidth, tileHeight);

              // Draw the tile to the target canvas
              ctx.drawImage(tileCanvas, targetX, targetY);

              resolve();
            };

            tileImg.onerror = () => {
              reject(
                new Error(`Failed to load tile image: ${selectedTile.id}`)
              );
            };

            tileImg.src = selectedTile.dataUrl;
          });
        }
      }
    }

    // Return the synthesized image as data URL
    return canvas.toDataURL("image/png");
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

        // Create a new tile with merged borders
        const mergedTile = new Tile(
          closestTile.dataUrl,
          closestTile.x,
          closestTile.y,
          closestTile.width,
          closestTile.height,
          this.tilesX,
          this.tilesY
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
}
