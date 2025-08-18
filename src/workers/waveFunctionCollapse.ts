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
 *
 * The code has been refactored to reduce duplication by:
 * - Using shared direction definitions
 * - Extracting common utility methods for constraint checking
 * - Centralizing bounds checking and tile compatibility logic
 */
export class WaveFunctionCollapse {
  private tiles: TileData[];
  private width: number;
  private height: number;
  private possibilities: Set<string>[][];
  private seed: number;

  // Shared direction definitions
  private static readonly DIRECTIONS = [
    {
      dx: 0,
      dy: -1,
      name: "north",
      currentBorder: "north" as const,
      neighborBorder: "south" as const,
    },
    {
      dx: 1,
      dy: 0,
      name: "east",
      currentBorder: "east" as const,
      neighborBorder: "west" as const,
    },
    {
      dx: 0,
      dy: 1,
      name: "south",
      currentBorder: "south" as const,
      neighborBorder: "north" as const,
    },
    {
      dx: -1,
      dy: 0,
      name: "west",
      currentBorder: "west" as const,
      neighborBorder: "east" as const,
    },
  ];

  constructor(
    tiles: TileData[],
    width: number,
    height: number,
    seed: number = 0
  ) {
    this.tiles = tiles;
    this.width = width;
    this.height = height;
    this.possibilities = [];
    this.seed = seed;

    // Initialize possibilities
    for (let y = 0; y < height; y++) {
      this.possibilities[y] = [];
      for (let x = 0; x < width; x++) {
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
        this.possibilities[y][x] = new Set(this.tiles.map((tile) => tile.id));
      }
    }

    // Perform initial constraint propagation after reset only if there are tiles
    if (this.tiles.length > 0 && this.width > 0 && this.height > 0) {
      this.performInitialPropagation();
    }
  }

  /**
   * Check if coordinates are within grid bounds
   */
  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Check if a cell is collapsed (has exactly one possibility)
   */
  private isCollapsed(x: number, y: number): boolean {
    return this.possibilities[y][x].size === 1;
  }

  /**
   * Get the tile ID from a collapsed cell
   * @throws Error if the cell is not collapsed
   */
  private getCollapsedTile(x: number, y: number): string {
    if (!this.isCollapsed(x, y)) {
      throw new Error(`Cell (${x}, ${y}) is not collapsed`);
    }
    return Array.from(this.possibilities[y][x])[0];
  }

  /**
   * Create a deep copy of the current possibilities state
   */
  private copyPossibilities(): Set<string>[][] {
    const copy: Set<string>[][] = [];
    for (let y = 0; y < this.height; y++) {
      copy[y] = [];
      for (let x = 0; x < this.width; x++) {
        copy[y][x] = new Set(this.possibilities[y][x]);
      }
    }
    return copy;
  }

  /**
   * Restore the possibilities state from a copy
   */
  private restorePossibilities(copy: Set<string>[][]): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.possibilities[y][x].clear();
        for (const tile of Array.from(copy[y][x])) {
          this.possibilities[y][x].add(tile);
        }
      }
    }
  }

  /**
   * Check if two tiles are compatible based on their border constraints
   */
  private areTilesCompatible(
    tile1: TileData,
    tile2: TileData,
    tile1Border: keyof TileData["borders"],
    tile2Border: keyof TileData["borders"]
  ): boolean {
    const tile1Allowed = tile1.borders[tile1Border];
    const tile2Allowed = tile2.borders[tile2Border];

    return tile1Allowed.includes(tile2.id) || tile2Allowed.includes(tile1.id);
  }

  /**
   * Get compatible tiles for a given tile and direction
   */
  private getCompatibleTiles(
    currentTile: string,
    neighborPossibilities: Set<string>,
    currentBorder: keyof TileData["borders"],
    neighborBorder: keyof TileData["borders"]
  ): Set<string> {
    const currentTileData = this.tiles.find((t) => t.id === currentTile);
    if (!currentTileData) return new Set();

    const compatibleTiles = new Set<string>();

    for (const neighborTile of Array.from(neighborPossibilities)) {
      const neighborTileData = this.tiles.find((t) => t.id === neighborTile);
      if (!neighborTileData) continue;

      if (
        this.areTilesCompatible(
          currentTileData,
          neighborTileData,
          currentBorder,
          neighborBorder
        )
      ) {
        compatibleTiles.add(currentTile);
        break; // Found a compatible neighbor for this tile
      }
    }

    return compatibleTiles;
  }

  /**
   * Remove incompatible tiles from a cell's possibilities
   */
  private removeIncompatibleTiles(
    x: number,
    y: number,
    currentTile: string,
    direction: (typeof WaveFunctionCollapse.DIRECTIONS)[0]
  ): boolean {
    const nx = x + direction.dx;
    const ny = y + direction.dy;

    // Check bounds
    if (!this.isInBounds(nx, ny)) {
      return false;
    }

    // Skip if neighbor is already collapsed
    if (this.isCollapsed(nx, ny)) {
      return false;
    }

    const neighborPossibilities = this.possibilities[ny][nx];
    const tilesToRemove: string[] = [];

    for (const neighborTile of Array.from(neighborPossibilities)) {
      const neighborTileData = this.tiles.find((t) => t.id === neighborTile);
      if (!neighborTileData) {
        tilesToRemove.push(neighborTile);
        continue;
      }

      if (
        !this.areTilesCompatible(
          this.tiles.find((t) => t.id === currentTile)!,
          neighborTileData,
          direction.currentBorder,
          direction.neighborBorder
        )
      ) {
        tilesToRemove.push(neighborTile);
      }
    }

    // Remove incompatible tiles
    for (const tileToRemove of tilesToRemove) {
      neighborPossibilities.delete(tileToRemove);
    }

    // Check for contradiction
    if (neighborPossibilities.size === 0) {
      throw new Error(
        `Contradiction: cell (${nx}, ${ny}) has no possibilities after propagation`
      );
    }

    return tilesToRemove.length > 0;
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
      for (const direction of WaveFunctionCollapse.DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;

        // Check bounds
        if (!this.isInBounds(nx, ny)) {
          continue;
        }

        // Get the current cell's possibilities
        const currentPossibilities = this.possibilities[y][x];
        const neighborPossibilities = this.possibilities[ny][nx];

        // Find tiles that are compatible between these two cells
        const compatibleTiles = new Set<string>();

        for (const currentTile of Array.from(currentPossibilities)) {
          const compatibleTilesForDirection = this.getCompatibleTiles(
            currentTile,
            neighborPossibilities,
            direction.currentBorder,
            direction.neighborBorder
          );

          if (compatibleTilesForDirection.size > 0) {
            compatibleTiles.add(currentTile);
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
          for (const dir of WaveFunctionCollapse.DIRECTIONS) {
            const nbx = x + dir.dx;
            const nby = y + dir.dy;
            if (this.isInBounds(nbx, nby)) {
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

    // Stack to store state snapshots for backtracking
    const stateStack: Array<{
      possibilities: Set<string>[][];
      triedPossibilities: Map<string, Set<string>>;
    }> = [];

    while (iterations < maxIterations) {
      iterations++;

      // Find the cell with the fewest possibilities (lowest entropy)
      const cell = this.findLowestEntropyCell();
      if (!cell) {
        // All cells are collapsed, we're done!
        return this.getResult();
      }

      const cellKey = `${cell.x},${cell.y}`;
      const availablePossibilities = Array.from(
        this.possibilities[cell.y][cell.x]
      );

      // Get the current tried possibilities from the top of the stack, or create new
      let currentTriedPossibilities: Map<string, Set<string>>;
      if (stateStack.length > 0) {
        currentTriedPossibilities = new Map(
          stateStack[stateStack.length - 1].triedPossibilities
        );
      } else {
        currentTriedPossibilities = new Map();
      }

      // Get or create the set of tried possibilities for this cell
      if (!currentTriedPossibilities.has(cellKey)) {
        currentTriedPossibilities.set(cellKey, new Set());
      }
      const triedForCell = currentTriedPossibilities.get(cellKey)!;

      // Find a possibility that hasn't been tried yet
      const untriedPossibilities = availablePossibilities.filter(
        (tile) => !triedForCell.has(tile)
      );

      if (untriedPossibilities.length === 0) {
        // All possibilities for this cell have been tried, need to backtrack
        console.log(
          `All possibilities tried for cell (${cell.x}, ${cell.y}), backtracking`
        );

        if (stateStack.length === 0) {
          throw new Error(`No valid arrangement possible`);
        }

        // Pop the previous state and restore it
        const previousState = stateStack.pop()!;
        this.restorePossibilities(previousState.possibilities);
        currentTriedPossibilities = previousState.triedPossibilities;
        continue;
      }

      // Use deterministic selection based on seed and iteration
      const hash = this.hashPosition(cell.x, cell.y, iterations);
      const index = hash % untriedPossibilities.length;
      const tileToTry = untriedPossibilities[index];
      triedForCell.add(tileToTry);

      // Store the current state before attempting collapse
      const stateBeforeCollapse = this.copyPossibilities();

      try {
        // Manually collapse the cell to the chosen tile
        this.possibilities[cell.y][cell.x].clear();
        this.possibilities[cell.y][cell.x].add(tileToTry);

        console.log(`Trying tile ${tileToTry} at cell (${cell.x}, ${cell.y})`);

        // Propagate the changes to neighboring cells
        this.propagate(cell.x, cell.y);

        // If we reach here, the collapse was successful
        console.log(
          `Successfully collapsed cell (${cell.x}, ${cell.y}) to tile: ${tileToTry}`
        );

        // Push the current state onto the stack for potential backtracking
        stateStack.push({
          possibilities: stateBeforeCollapse,
          triedPossibilities: currentTriedPossibilities,
        });
      } catch (error) {
        // Contradiction detected, restore the previous state
        console.log(
          `Contradiction detected, restoring state and trying next possibility`
        );
        this.restorePossibilities(stateBeforeCollapse);
        continue; // Try the next iteration with the restored state
      }
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
        if (this.isCollapsed(x, y)) {
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

      const currentTile = this.isCollapsed(x, y)
        ? this.getCollapsedTile(x, y)
        : null;
      if (!currentTile) {
        continue; // Cell not collapsed yet
      }

      // Check all four directions
      for (const direction of WaveFunctionCollapse.DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;

        // Check bounds
        if (!this.isInBounds(nx, ny)) {
          continue;
        }

        // Skip if neighbor is already collapsed
        if (this.isCollapsed(nx, ny)) {
          continue;
        }

        // Remove incompatible tiles and check if any were removed
        const tilesRemoved = this.removeIncompatibleTiles(
          x,
          y,
          currentTile,
          direction
        );

        if (tilesRemoved) {
          console.log(
            `Removed incompatible tiles from (${nx}, ${ny}) due to ${direction.name} neighbor`
          );
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  private getResult(): string[][] {
    const result: string[][] = [];

    for (let y = 0; y < this.height; y++) {
      result[y] = [];
      for (let x = 0; x < this.width; x++) {
        if (!this.isCollapsed(x, y)) {
          throw new Error(`Cell (${x}, ${y}) is not collapsed in final result`);
        }
        result[y][x] = this.getCollapsedTile(x, y);
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
        for (const direction of WaveFunctionCollapse.DIRECTIONS) {
          const nx = x + direction.dx;
          const ny = y + direction.dy;

          if (!this.isInBounds(nx, ny)) {
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

          // Check compatibility using the utility method
          if (
            !this.areTilesCompatible(
              tile,
              neighbor,
              direction.currentBorder,
              direction.neighborBorder
            )
          ) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${nx}, ${ny}): ${tileId} and ${neighborId} are not compatible in ${direction.name} direction`
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
