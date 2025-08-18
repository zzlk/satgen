// Simple Wave Function Collapse Algorithm
// This is a naive implementation focused on correctness and clarity, not performance

export interface TileData {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  borders: {
    north: string[];
    east: string[];
    south: string[];
    west: string[];
  };
}

/**
 * Wave Function Collapse Algorithm Implementation
 *
 * This implementation is deterministic - given the same tiles, dimensions, and seed,
 * it will always produce the same result. The algorithm removes randomness by:
 * 1. Using a deterministic hash function based on position, seed, and iteration
 * 2. Sorting possibilities before selection to ensure consistent ordering
 * 3. Using the hash to select tiles in a reproducible manner
 *
 * The algorithm also performs initial constraint propagation during initialization
 * to ensure that all cells start with possibilities that are compatible with their
 * neighbors, which can improve generation success rates and reduce contradictions.
 */
export class WaveFunctionCollapse {
  private tiles: TileData[];
  private width: number;
  private height: number;
  private grid: (string | null)[][];
  private possibilities: Set<string>[][];
  private seed: number;

  constructor(
    tiles: TileData[],
    width: number,
    height: number,
    seed: number = 0
  ) {
    this.tiles = tiles;
    this.width = width;
    this.height = height;
    this.grid = [];
    this.possibilities = [];
    this.seed = seed;

    // Initialize grid and possibilities
    for (let y = 0; y < height; y++) {
      this.grid[y] = [];
      this.possibilities[y] = [];
      for (let x = 0; x < width; x++) {
        this.grid[y][x] = null;
        this.possibilities[y][x] = new Set(tiles.map((tile) => tile.id));
      }
    }

    // Perform initial constraint propagation only if there are tiles
    if (this.tiles.length > 0 && this.width > 0 && this.height > 0) {
      this.performInitialPropagation();
    }
  }

  /**
   * Main function to generate the tile arrangement
   * Returns a 2D array of tile IDs, or null if generation fails
   */
  public generate(): string[][] | null {
    console.log(
      `Starting wave function collapse for ${this.width}x${this.height} grid`
    );
    console.log(`Available tiles: ${this.tiles.map((t) => t.id).join(", ")}`);

    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts}/${maxAttempts}`);

      // Reset the grid
      this.resetGrid();

      try {
        const result = this.runGeneration();
        if (result) {
          console.log(
            `Successfully generated arrangement on attempt ${attempts}`
          );
          return result;
        }
      } catch (error) {
        console.log(`Attempt ${attempts} failed: ${error}`);
      }
    }

    console.log(`Failed to generate arrangement after ${maxAttempts} attempts`);
    return null;
  }

  private resetGrid(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = null;
        this.possibilities[y][x] = new Set(this.tiles.map((tile) => tile.id));
      }
    }

    // Perform initial constraint propagation after reset only if there are tiles
    if (this.tiles.length > 0 && this.width > 0 && this.height > 0) {
      this.performInitialPropagation();
    }
  }

  /**
   * Perform initial constraint propagation to ensure all cells start with
   * possibilities that are compatible with their neighbors
   */
  private performInitialPropagation(): void {
    // Create a queue of all cells that need to be checked
    const queue: Array<{ x: number; y: number }> = [];

    // Add all cells to the queue
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        queue.push({ x, y });
      }
    }

    // Process the queue until no more changes occur
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // Check all four directions for this cell
      const directions = [
        {
          dx: 0,
          dy: -1,
          name: "north",
          currentBorder: "north",
          neighborBorder: "south",
        },
        {
          dx: 1,
          dy: 0,
          name: "east",
          currentBorder: "east",
          neighborBorder: "west",
        },
        {
          dx: 0,
          dy: 1,
          name: "south",
          currentBorder: "south",
          neighborBorder: "north",
        },
        {
          dx: -1,
          dy: 0,
          name: "west",
          currentBorder: "west",
          neighborBorder: "east",
        },
      ];

      for (const {
        dx,
        dy,
        name,
        currentBorder,
        neighborBorder,
      } of directions) {
        const nx = x + dx;
        const ny = y + dy;

        // Check bounds
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
          continue;
        }

        // Get the current cell's possibilities
        const currentPossibilities = this.possibilities[y][x];
        const neighborPossibilities = this.possibilities[ny][nx];

        // Find tiles that are compatible between these two cells
        const compatibleTiles = new Set<string>();

        for (const currentTile of Array.from(currentPossibilities)) {
          const currentTileData = this.tiles.find((t) => t.id === currentTile);
          if (!currentTileData) continue;

          const allowedNeighbors =
            currentTileData.borders[
              currentBorder as keyof typeof currentTileData.borders
            ];

          for (const neighborTile of Array.from(neighborPossibilities)) {
            const neighborTileData = this.tiles.find(
              (t) => t.id === neighborTile
            );
            if (!neighborTileData) continue;

            const neighborBorderTiles =
              neighborTileData.borders[
                neighborBorder as keyof typeof neighborTileData.borders
              ];

            // Check compatibility
            const isCompatible =
              allowedNeighbors.includes(neighborTile) ||
              neighborBorderTiles.includes(currentTile);

            if (isCompatible) {
              compatibleTiles.add(currentTile);
              break; // Found a compatible neighbor for this tile
            }
          }
        }

        // If we found incompatible tiles, remove them and add neighbors to queue
        if (compatibleTiles.size < currentPossibilities.size) {
          const tilesToRemove = Array.from(currentPossibilities).filter(
            (tile) => !compatibleTiles.has(tile)
          );

          for (const tileToRemove of tilesToRemove) {
            currentPossibilities.delete(tileToRemove);
          }

          // Add neighboring cells to queue for further propagation
          for (const { dx: ndx, dy: ndy } of directions) {
            const nbx = x + ndx;
            const nby = y + ndy;
            if (nbx >= 0 && nbx < this.width && nby >= 0 && nby < this.height) {
              queue.push({ x: nbx, y: nby });
            }
          }
        }
      }

      // Check for contradiction
      if (this.possibilities[y][x].size === 0) {
        throw new Error(
          `Initial propagation contradiction: cell (${x}, ${y}) has no possibilities`
        );
      }
    }
  }

  private runGeneration(): string[][] | null {
    let iterations = 0;
    const maxIterations = this.width * this.height * 10;

    while (iterations < maxIterations) {
      iterations++;

      // Find the cell with the fewest possibilities (lowest entropy)
      const cell = this.findLowestEntropyCell();
      if (!cell) {
        // All cells are collapsed, we're done!
        return this.getResult();
      }

      // Collapse the cell by choosing a deterministic tile from its possibilities
      const success = this.collapseCell(cell.x, cell.y, iterations);
      if (!success) {
        // Contradiction detected, this attempt failed
        throw new Error(`Contradiction at (${cell.x}, ${cell.y})`);
      }

      // Propagate the changes to neighboring cells
      this.propagate(cell.x, cell.y);
    }

    throw new Error(`Max iterations reached`);
  }

  private findLowestEntropyCell(): {
    x: number;
    y: number;
    entropy: number;
  } | null {
    let minEntropy = Infinity;
    let minCell: { x: number; y: number; entropy: number } | null = null;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== null) {
          continue; // Already collapsed
        }

        const entropy = this.possibilities[y][x].size;
        if (entropy === 0) {
          // Contradiction: cell has no possibilities
          throw new Error(`Cell (${x}, ${y}) has no possibilities`);
        }

        if (entropy < minEntropy) {
          minEntropy = entropy;
          minCell = { x, y, entropy };
        }
      }
    }

    return minCell;
  }

  private collapseCell(x: number, y: number, iteration: number): boolean {
    const possibilities = Array.from(this.possibilities[y][x]);

    if (possibilities.length === 0) {
      return false; // No possibilities to choose from
    }

    // Sort possibilities for deterministic selection
    possibilities.sort();

    // Use a deterministic selection based on position, seed, and iteration
    // This creates a pseudo-random but reproducible selection
    const hash = this.hashPosition(x, y, iteration);
    const index = hash % possibilities.length;
    const chosenTile = possibilities[index];

    // Collapse the cell to the chosen tile
    this.grid[y][x] = chosenTile;
    this.possibilities[y][x].clear();
    this.possibilities[y][x].add(chosenTile);

    console.log(`Collapsed cell (${x}, ${y}) to tile: ${chosenTile}`);
    return true;
  }

  /**
   * Generate a deterministic hash for a position based on coordinates, seed, and iteration
   */
  private hashPosition(x: number, y: number, iteration: number): number {
    // Simple hash function that combines position, seed, and iteration
    let hash = this.seed;
    hash = (hash << 5) - hash + x;
    hash = (hash << 5) - hash + y;
    hash = (hash << 5) - hash + iteration;
    hash = hash & hash; // Convert to 32-bit integer
    return Math.abs(hash);
  }

  private propagate(startX: number, startY: number): void {
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const currentTile = this.grid[y][x];
      if (!currentTile) {
        continue; // Cell not collapsed yet
      }

      // Check all four directions
      const directions = [
        {
          dx: 0,
          dy: -1,
          name: "north",
          currentBorder: "north",
          neighborBorder: "south",
        },
        {
          dx: 1,
          dy: 0,
          name: "east",
          currentBorder: "east",
          neighborBorder: "west",
        },
        {
          dx: 0,
          dy: 1,
          name: "south",
          currentBorder: "south",
          neighborBorder: "north",
        },
        {
          dx: -1,
          dy: 0,
          name: "west",
          currentBorder: "west",
          neighborBorder: "east",
        },
      ];

      for (const {
        dx,
        dy,
        name,
        currentBorder,
        neighborBorder,
      } of directions) {
        const nx = x + dx;
        const ny = y + dy;

        // Check bounds
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
          continue;
        }

        // Skip if neighbor is already collapsed
        if (this.grid[ny][nx] !== null) {
          continue;
        }

        // Get the current tile's border constraints
        const currentTileData = this.tiles.find((t) => t.id === currentTile);
        if (!currentTileData) {
          continue;
        }

        const allowedNeighbors =
          currentTileData.borders[
            currentBorder as keyof typeof currentTileData.borders
          ];

        // Remove incompatible tiles from neighbor's possibilities
        const neighborPossibilities = this.possibilities[ny][nx];
        const tilesToRemove: string[] = [];

        for (const neighborTile of Array.from(neighborPossibilities)) {
          const neighborTileData = this.tiles.find(
            (t) => t.id === neighborTile
          );
          if (!neighborTileData) {
            tilesToRemove.push(neighborTile);
            continue;
          }

          // Check if the neighbor tile's border is compatible with the current tile
          const neighborBorderTiles =
            neighborTileData.borders[
              neighborBorder as keyof typeof neighborTileData.borders
            ];

          // A tile is compatible if:
          // 1. The current tile allows this neighbor in its border, OR
          // 2. The neighbor tile allows the current tile in its border
          const isCompatible =
            allowedNeighbors.includes(neighborTile) ||
            neighborBorderTiles.includes(currentTile);

          if (!isCompatible) {
            tilesToRemove.push(neighborTile);
          }
        }

        // Remove incompatible tiles
        for (const tileToRemove of tilesToRemove) {
          neighborPossibilities.delete(tileToRemove);
        }

        // If we removed any tiles, add this neighbor to the queue for further propagation
        if (tilesToRemove.length > 0) {
          console.log(
            `Removed ${tilesToRemove.length} incompatible tiles from (${nx}, ${ny}) due to ${name} neighbor`
          );
          queue.push({ x: nx, y: ny });
        }

        // Check for contradiction
        if (neighborPossibilities.size === 0) {
          throw new Error(
            `Contradiction: cell (${nx}, ${ny}) has no possibilities after propagation`
          );
        }
      }
    }
  }

  private getResult(): string[][] {
    const result: string[][] = [];

    for (let y = 0; y < this.height; y++) {
      result[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        if (!tile) {
          throw new Error(`Cell (${x}, ${y}) is not collapsed in final result`);
        }
        result[y][x] = tile;
      }
    }

    return result;
  }

  /**
   * Get the current seed used for deterministic generation
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Validate the final arrangement to ensure all tiles are compatible
   */
  public validateArrangement(arrangement: string[][]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileId = arrangement[y][x];
        const tile = this.tiles.find((t) => t.id === tileId);

        if (!tile) {
          errors.push(`Invalid tile ID at (${x}, ${y}): ${tileId}`);
          continue;
        }

        // Check compatibility with neighbors
        const directions = [
          {
            dx: 0,
            dy: -1,
            name: "north",
            currentBorder: "north",
            neighborBorder: "south",
          },
          {
            dx: 1,
            dy: 0,
            name: "east",
            currentBorder: "east",
            neighborBorder: "west",
          },
          {
            dx: 0,
            dy: 1,
            name: "south",
            currentBorder: "south",
            neighborBorder: "north",
          },
          {
            dx: -1,
            dy: 0,
            name: "west",
            currentBorder: "west",
            neighborBorder: "east",
          },
        ];

        for (const {
          dx,
          dy,
          name,
          currentBorder,
          neighborBorder,
        } of directions) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
            continue;
          }

          const neighborId = arrangement[ny][nx];
          const neighbor = this.tiles.find((t) => t.id === neighborId);

          if (!neighbor) {
            errors.push(
              `Invalid neighbor tile ID at (${nx}, ${ny}): ${neighborId}`
            );
            continue;
          }

          // Check compatibility
          const currentBorderTiles =
            tile.borders[currentBorder as keyof typeof tile.borders];
          const neighborBorderTiles =
            neighbor.borders[neighborBorder as keyof typeof neighbor.borders];

          const isCompatible =
            currentBorderTiles.includes(neighborId) ||
            neighborBorderTiles.includes(tileId);

          if (!isCompatible) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${nx}, ${ny}): ${tileId} and ${neighborId} are not compatible in ${name} direction`
            );
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Convenience function to generate a tile arrangement using wave function collapse
 *
 * This function is deterministic - given the same parameters, it will always
 * return the same result. Use different seed values to generate different arrangements.
 */
export function generateTileArrangement(
  tiles: TileData[],
  width: number,
  height: number,
  seed: number = 0
): string[][] | null {
  const wfc = new WaveFunctionCollapse(tiles, width, height, seed);
  return wfc.generate();
}
