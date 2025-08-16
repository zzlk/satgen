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
   * Synthesizes a new image using the Wave Function Collapse algorithm
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

    console.log(
      `Starting Wave Function Collapse synthesis: ${gridWidth}x${gridHeight} grid`
    );

    try {
      const arrangement = await this.waveFunctionCollapse(
        gridWidth,
        gridHeight
      );

      // Create canvas and render the arrangement
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
          const tile = arrangement[gridY][gridX];
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

      const finalScore = this.calculateCompatibilityScore(arrangement);
      const dataUrl = canvas.toDataURL("image/png");

      console.log(
        `Synthesis completed successfully! Compatibility score: ${finalScore}`
      );

      return {
        arrangement: arrangement,
        compatibilityScore: finalScore,
        dataUrl: dataUrl,
      };
    } catch (error) {
      console.error("Wave Function Collapse failed:", error);
      throw error;
    }
  }

  /**
   * Implements the Wave Function Collapse algorithm
   * @param gridWidth - Number of tiles in X direction
   * @param gridHeight - Number of tiles in Y direction
   * @returns Promise that resolves with the tile arrangement
   */
  private async waveFunctionCollapse(
    gridWidth: number,
    gridHeight: number
  ): Promise<(Tile | null)[][]> {
    console.log("Initializing Wave Function Collapse...");

    // Initialize the wave function: each cell contains a set of all possible tiles
    const waveFunction: Set<Tile>[][] = Array(gridHeight)
      .fill(null)
      .map(() =>
        Array(gridWidth)
          .fill(null)
          .map(() => new Set(this.tiles))
      );

    // Final arrangement (will be filled as tiles are collapsed)
    const arrangement: (Tile | null)[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(null));

    let iteration = 0;
    const maxIterations = gridWidth * gridHeight * 10; // Safety limit

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n--- Iteration ${iteration} ---`);

      // Step 1: Propagate constraints
      const propagationResult = this.propagateConstraints(
        waveFunction,
        arrangement
      );
      if (!propagationResult.success) {
        console.error("Propagation failed - no valid arrangement possible");
        throw new Error(
          "Wave Function Collapse failed: conflicting constraints"
        );
      }

      // Step 2: Collapse the most constrained cell
      const collapseResult = this.collapseSmallest(waveFunction, arrangement);
      if (!collapseResult.success) {
        console.log("All cells collapsed - synthesis complete!");
        break;
      }

      // Check if we've completed the entire grid
      let totalCollapsed = 0;
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (arrangement[y][x] !== null) {
            totalCollapsed++;
          }
        }
      }

      console.log(
        `Progress: ${totalCollapsed}/${gridWidth * gridHeight} cells collapsed`
      );

      if (totalCollapsed === gridWidth * gridHeight) {
        console.log("All cells collapsed - synthesis complete!");
        break;
      }
    }

    if (iteration >= maxIterations) {
      console.warn("Reached maximum iterations - synthesis may be incomplete");
    }

    return arrangement;
  }

  /**
   * Propagates constraints throughout the wave function
   * @param waveFunction - The wave function matrix
   * @param arrangement - The current arrangement
   * @returns Success status and whether any changes were made
   */
  private propagateConstraints(
    waveFunction: Set<Tile>[][],
    arrangement: (Tile | null)[][]
  ): { success: boolean; changesMade: boolean } {
    const gridHeight = waveFunction.length;
    const gridWidth = waveFunction[0].length;
    let changesMade = false;
    let passCount = 0;
    const maxPasses = gridWidth * gridHeight * 2; // Safety limit

    console.log("Starting constraint propagation...");

    let passChanges: boolean;
    do {
      passCount++;
      passChanges = false;

      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          // Skip already collapsed cells
          if (arrangement[y][x] !== null) continue;

          const currentPossibilities = waveFunction[y][x];
          const originalSize = currentPossibilities.size;

          // Get compatible tiles based on neighbors
          const compatibleTiles = this.getCompatibleTilesForPosition(
            x,
            y,
            waveFunction,
            arrangement
          );

          // Remove incompatible tiles
          const tilesToRemove: Tile[] = [];
          for (const tile of currentPossibilities) {
            if (!compatibleTiles.has(tile)) {
              tilesToRemove.push(tile);
            }
          }

          for (const tile of tilesToRemove) {
            currentPossibilities.delete(tile);
          }

          if (currentPossibilities.size !== originalSize) {
            passChanges = true;
            console.log(
              `Cell (${x},${y}): reduced from ${originalSize} to ${currentPossibilities.size} possibilities`
            );
          }

          // If no possibilities remain, propagation failed
          if (currentPossibilities.size === 0) {
            console.error(
              `Cell (${x},${y}) has no valid possibilities - propagation failed`
            );
            return { success: false, changesMade: changesMade };
          }
        }
      }

      changesMade = changesMade || passChanges;

      if (passChanges) {
        console.log(
          `Pass ${passCount}: changes made, continuing propagation...`
        );
      } else {
        console.log(`Pass ${passCount}: no changes, propagation complete`);
      }
    } while (passChanges && passCount < maxPasses);

    if (passCount >= maxPasses) {
      console.warn("Reached maximum propagation passes");
    }

    return { success: true, changesMade: changesMade };
  }

  /**
   * Collapses the cell with the fewest possibilities
   * @param waveFunction - The wave function matrix
   * @param arrangement - The current arrangement
   * @returns Success status and collapse information
   */
  private collapseSmallest(
    waveFunction: Set<Tile>[][],
    arrangement: (Tile | null)[][]
  ): { success: boolean; x?: number; y?: number; tile?: Tile } {
    const gridHeight = waveFunction.length;
    const gridWidth = waveFunction[0].length;

    // Find the cell with the fewest possibilities
    let minPossibilities = Infinity;
    let collapseX = -1;
    let collapseY = -1;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (arrangement[y][x] !== null) continue; // Skip already collapsed cells

        const possibilities = waveFunction[y][x].size;
        if (possibilities < minPossibilities) {
          minPossibilities = possibilities;
          collapseX = x;
          collapseY = y;
        }
      }
    }

    if (collapseX === -1 || collapseY === -1) {
      console.log("No cells to collapse - all cells are already collapsed");
      return { success: false };
    }

    // Randomly select a tile from the possibilities
    const possibilities = Array.from(waveFunction[collapseY][collapseX]);
    const selectedTile =
      possibilities[Math.floor(Math.random() * possibilities.length)];

    // Collapse the cell
    arrangement[collapseY][collapseX] = selectedTile;
    waveFunction[collapseY][collapseX].clear();
    waveFunction[collapseY][collapseX].add(selectedTile);

    console.log(
      `Collapsed cell (${collapseX},${collapseY}) with ${minPossibilities} possibilities to tile: ${selectedTile.id}`
    );

    return {
      success: true,
      x: collapseX,
      y: collapseY,
      tile: selectedTile,
    };
  }

  /**
   * Gets compatible tiles for a specific position based on neighbors
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param waveFunction - The wave function matrix
   * @param arrangement - The current arrangement
   * @returns Set of compatible tiles
   */
  private getCompatibleTilesForPosition(
    x: number,
    y: number,
    waveFunction: Set<Tile>[][],
    arrangement: (Tile | null)[][]
  ): Set<Tile> {
    const gridHeight = waveFunction.length;
    const gridWidth = waveFunction[0].length;
    const compatibleTiles = new Set<Tile>();

    // Start with all tiles
    for (const tile of this.tiles) {
      compatibleTiles.add(tile);
    }

    // Check north neighbor
    if (y > 0 && arrangement[y - 1][x]) {
      const northTile = arrangement[y - 1][x]!;
      const northCompatible = new Set<Tile>();
      for (const tile of compatibleTiles) {
        if (
          northTile.borders.south.has(tile.id) ||
          tile.borders.north.has(northTile.id)
        ) {
          northCompatible.add(tile);
        }
      }
      compatibleTiles.clear();
      for (const tile of northCompatible) {
        compatibleTiles.add(tile);
      }
    }

    // Check south neighbor
    if (y < gridHeight - 1 && arrangement[y + 1][x]) {
      const southTile = arrangement[y + 1][x]!;
      const southCompatible = new Set<Tile>();
      for (const tile of compatibleTiles) {
        if (
          southTile.borders.north.has(tile.id) ||
          tile.borders.south.has(southTile.id)
        ) {
          southCompatible.add(tile);
        }
      }
      compatibleTiles.clear();
      for (const tile of southCompatible) {
        compatibleTiles.add(tile);
      }
    }

    // Check west neighbor
    if (x > 0 && arrangement[y][x - 1]) {
      const westTile = arrangement[y][x - 1]!;
      const westCompatible = new Set<Tile>();
      for (const tile of compatibleTiles) {
        if (
          westTile.borders.east.has(tile.id) ||
          tile.borders.west.has(westTile.id)
        ) {
          westCompatible.add(tile);
        }
      }
      compatibleTiles.clear();
      for (const tile of westCompatible) {
        compatibleTiles.add(tile);
      }
    }

    // Check east neighbor
    if (x < gridWidth - 1 && arrangement[y][x + 1]) {
      const eastTile = arrangement[y][x + 1]!;
      const eastCompatible = new Set<Tile>();
      for (const tile of compatibleTiles) {
        if (
          eastTile.borders.west.has(tile.id) ||
          tile.borders.east.has(eastTile.id)
        ) {
          eastCompatible.add(tile);
        }
      }
      compatibleTiles.clear();
      for (const tile of eastCompatible) {
        compatibleTiles.add(tile);
      }
    }

    return compatibleTiles;
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
