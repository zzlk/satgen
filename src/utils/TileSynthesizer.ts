import { Tile } from "./Tile";

export interface SynthesisResult {
  arrangement: (Tile | null)[][];
  compatibilityScore: number;
  dataUrl: string;
}

export class TileSynthesizer {
  private tiles: Tile[];
  private tileWidth: number;
  private tileHeight: number;

  constructor(tiles: Tile[]) {
    if (tiles.length === 0) {
      throw new Error("No tiles available for synthesis");
    }
    this.tiles = tiles;
    this.tileWidth = tiles[0].width;
    this.tileHeight = tiles[0].height;
  }

  /**
   * Synthesizes a new image by placing compatible tiles based on border information
   * @param targetWidth - Desired width in pixels (must be multiple of tile width)
   * @param targetHeight - Desired height in pixels (must be multiple of tile height)
   * @returns Promise that resolves with the synthesis result
   */
  async synthesize(
    targetWidth: number,
    targetHeight: number
  ): Promise<SynthesisResult> {
    // Validate target dimensions are multiples of tile dimensions
    if (targetWidth % this.tileWidth !== 0) {
      throw new Error(
        `Target width ${targetWidth} must be a multiple of tile width ${this.tileWidth}`
      );
    }
    if (targetHeight % this.tileHeight !== 0) {
      throw new Error(
        `Target height ${targetHeight} must be a multiple of tile height ${this.tileHeight}`
      );
    }

    // Calculate grid dimensions
    const gridWidth = targetWidth / this.tileWidth;
    const gridHeight = targetHeight / this.tileHeight;

    // Maximum number of attempts to find a valid arrangement
    const maxAttempts = 50;
    let bestArrangement: (Tile | null)[][] | null = null;
    let bestCompatibilityScore = -1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const arrangement = await this.trySynthesizeArrangement(
          gridWidth,
          gridHeight
        );

        const compatibilityScore =
          this.calculateCompatibilityScore(arrangement);

        // If we found a perfect arrangement (all tiles compatible), use it immediately
        if (compatibilityScore === gridWidth * gridHeight) {
          bestArrangement = arrangement;
          break;
        }

        // Keep track of the best arrangement found so far
        if (compatibilityScore > bestCompatibilityScore) {
          bestCompatibilityScore = compatibilityScore;
          bestArrangement = arrangement;
        }

        // If we have a reasonably good arrangement (90% compatibility), use it
        if (compatibilityScore >= gridWidth * gridHeight * 0.9) {
          break;
        }
      } catch (error) {
        // Continue to next attempt if this one failed
        console.warn(`Synthesis attempt ${attempt + 1} failed:`, error);
      }
    }

    if (!bestArrangement) {
      throw new Error(
        "Failed to create a valid tile arrangement after multiple attempts"
      );
    }

    // Create canvas and render the best arrangement found
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Render the arrangement
    for (let gridY = 0; gridY < gridHeight; gridY++) {
      for (let gridX = 0; gridX < gridWidth; gridX++) {
        const tile = bestArrangement[gridY][gridX];
        if (tile) {
          const targetX = gridX * this.tileWidth;
          const targetY = gridY * this.tileHeight;

          const tileCanvas = document.createElement("canvas");
          const tileCtx = tileCanvas.getContext("2d");

          if (tileCtx) {
            const tileImg = new Image();

            await new Promise<void>((resolve, reject) => {
              tileImg.onload = () => {
                tileCanvas.width = this.tileWidth;
                tileCanvas.height = this.tileHeight;
                tileCtx.drawImage(
                  tileImg,
                  0,
                  0,
                  this.tileWidth,
                  this.tileHeight
                );
                ctx.drawImage(tileCanvas, targetX, targetY);
                resolve();
              };

              tileImg.onerror = () => {
                reject(new Error(`Failed to load tile image: ${tile.id}`));
              };

              tileImg.src = tile.dataUrl;
            });
          }
        }
      }
    }

    const finalScore = this.calculateCompatibilityScore(bestArrangement);
    const dataUrl = canvas.toDataURL("image/png");

    return {
      arrangement: bestArrangement,
      compatibilityScore: finalScore,
      dataUrl: dataUrl,
    };
  }

  /**
   * Attempts to create a valid tile arrangement
   * @param gridWidth - Number of tiles in X direction
   * @param gridHeight - Number of tiles in Y direction
   * @returns Promise that resolves with the tile arrangement
   */
  private async trySynthesizeArrangement(
    gridWidth: number,
    gridHeight: number
  ): Promise<(Tile | null)[][]> {
    // 2D array to store placed tiles
    const placedTiles: (Tile | null)[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(null));

    // Helper function to get compatible tiles for a position
    const getCompatibleTiles = (gridX: number, gridY: number): Tile[] => {
      const compatibleTiles: Tile[] = [];

      for (const tile of this.tiles) {
        let isCompatible = true;
        let compatibilityCount = 0;

        // Check north neighbor (if exists)
        if (gridY > 0 && placedTiles[gridY - 1][gridX]) {
          const northTile = placedTiles[gridY - 1][gridX]!;
          if (
            northTile.borders.south.has(tile.id) ||
            tile.borders.north.has(northTile.id)
          ) {
            compatibilityCount++;
          } else {
            isCompatible = false;
          }
        }

        // Check west neighbor (if exists)
        if (gridX > 0 && placedTiles[gridY][gridX - 1]) {
          const westTile = placedTiles[gridY][gridX - 1]!;
          if (
            westTile.borders.east.has(tile.id) ||
            tile.borders.west.has(westTile.id)
          ) {
            compatibilityCount++;
          } else {
            isCompatible = false;
          }
        }

        // Check south neighbor (if exists)
        if (gridY < gridHeight - 1 && placedTiles[gridY + 1][gridX]) {
          const southTile = placedTiles[gridY + 1][gridX]!;
          if (
            southTile.borders.north.has(tile.id) ||
            tile.borders.south.has(southTile.id)
          ) {
            compatibilityCount++;
          } else {
            isCompatible = false;
          }
        }

        // Check east neighbor (if exists)
        if (gridX < gridWidth - 1 && placedTiles[gridY][gridX + 1]) {
          const eastTile = placedTiles[gridY][gridX + 1]!;
          if (
            eastTile.borders.west.has(tile.id) ||
            tile.borders.east.has(eastTile.id)
          ) {
            compatibilityCount++;
          } else {
            isCompatible = false;
          }
        }

        if (isCompatible) {
          compatibleTiles.push(tile);
        }
      }

      return compatibleTiles;
    };

    // Try different placement strategies
    const strategies = [
      // Strategy 1: Row by row, left to right
      () => {
        for (let gridY = 0; gridY < gridHeight; gridY++) {
          for (let gridX = 0; gridX < gridWidth; gridX++) {
            const compatibleTiles = getCompatibleTiles(gridX, gridY);
            const availableTiles =
              compatibleTiles.length > 0 ? compatibleTiles : this.tiles;
            const randomIndex = Math.floor(
              Math.random() * availableTiles.length
            );
            placedTiles[gridY][gridX] = availableTiles[randomIndex];
          }
        }
      },
      // Strategy 2: Column by column, top to bottom
      () => {
        for (let gridX = 0; gridX < gridWidth; gridX++) {
          for (let gridY = 0; gridY < gridHeight; gridY++) {
            const compatibleTiles = getCompatibleTiles(gridX, gridY);
            const availableTiles =
              compatibleTiles.length > 0 ? compatibleTiles : this.tiles;
            const randomIndex = Math.floor(
              Math.random() * availableTiles.length
            );
            placedTiles[gridY][gridX] = availableTiles[randomIndex];
          }
        }
      },
      // Strategy 3: Spiral from center
      () => {
        const centerX = Math.floor(gridWidth / 2);
        const centerY = Math.floor(gridHeight / 2);
        const visited = new Set<string>();

        const placeTile = (x: number, y: number) => {
          if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return;
          const key = `${x},${y}`;
          if (visited.has(key)) return;
          visited.add(key);

          const compatibleTiles = getCompatibleTiles(x, y);
          const availableTiles =
            compatibleTiles.length > 0 ? compatibleTiles : this.tiles;
          const randomIndex = Math.floor(Math.random() * availableTiles.length);
          placedTiles[y][x] = availableTiles[randomIndex];
        };

        // Place center tile first
        placeTile(centerX, centerY);

        // Spiral outward
        let radius = 1;
        while (visited.size < gridWidth * gridHeight) {
          for (let i = -radius; i <= radius; i++) {
            placeTile(centerX + i, centerY - radius);
            placeTile(centerX + i, centerY + radius);
          }
          for (let i = -radius + 1; i < radius; i++) {
            placeTile(centerX - radius, centerY + i);
            placeTile(centerX + radius, centerY + i);
          }
          radius++;
        }
      },
    ];

    // Use a random strategy for this attempt
    const strategyIndex = Math.floor(Math.random() * strategies.length);
    strategies[strategyIndex]();

    return placedTiles;
  }

  /**
   * Calculates a compatibility score for a tile arrangement
   * @param arrangement - The tile arrangement to score
   * @returns Compatibility score (higher is better)
   */
  private calculateCompatibilityScore(arrangement: (Tile | null)[][]): number {
    let score = 0;
    const gridHeight = arrangement.length;
    const gridWidth = arrangement[0].length;

    for (let gridY = 0; gridY < gridHeight; gridY++) {
      for (let gridX = 0; gridX < gridWidth; gridX++) {
        const tile = arrangement[gridY][gridX];
        if (!tile) continue;

        // Check compatibility with neighbors
        if (gridY > 0 && arrangement[gridY - 1][gridX]) {
          const northTile = arrangement[gridY - 1][gridX]!;
          if (
            northTile.borders.south.has(tile.id) ||
            tile.borders.north.has(northTile.id)
          ) {
            score++;
          }
        }

        if (gridX > 0 && arrangement[gridY][gridX - 1]) {
          const westTile = arrangement[gridY][gridX - 1]!;
          if (
            westTile.borders.east.has(tile.id) ||
            tile.borders.west.has(westTile.id)
          ) {
            score++;
          }
        }

        if (gridY < gridHeight - 1 && arrangement[gridY + 1][gridX]) {
          const southTile = arrangement[gridY + 1][gridX]!;
          if (
            southTile.borders.north.has(tile.id) ||
            tile.borders.south.has(southTile.id)
          ) {
            score++;
          }
        }

        if (gridX < gridWidth - 1 && arrangement[gridY][gridX + 1]) {
          const eastTile = arrangement[gridY][gridX + 1]!;
          if (
            eastTile.borders.west.has(tile.id) ||
            tile.borders.east.has(eastTile.id)
          ) {
            score++;
          }
        }
      }
    }

    return score;
  }
}
