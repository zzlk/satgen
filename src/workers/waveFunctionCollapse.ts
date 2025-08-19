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

// todo: keep track of last 10 completed cells, render them with increasingly darker colors.
// extract out propagate and generate recursive to stand alone functions.

export interface PartialResult {
  arrangement: string[][] | null;
  collapsedCells: number;
  totalCells: number;
  iteration: number;
  lastCollapsedCell?: { x: number; y: number; tile: string };
  lastCollapsedCells: Array<{
    x: number;
    y: number;
    tile: string;
    iteration: number;
  }>;
  isComplete: boolean;
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
  private lastCollapsedCells: Array<{
    x: number;
    y: number;
    tile: string;
    iteration: number;
  }> = [];
  private contradictionCount: number = 0; // Track contradictions for shuffling

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
   * Generator function to generate the tile arrangement with partial results
   * Yields partial results during backtracking and when contradictions occur
   */
  public *generateWithProgress(): Generator<
    PartialResult,
    string[][] | null,
    unknown
  > {
    console.log(
      `Starting wave function collapse for ${this.width}x${this.height} grid`
    );
    console.log(`Available tiles: ${this.tiles.map((t) => t.id).join(", ")}`);

    // Reset contradiction counter for new generation
    this.contradictionCount = 0;
    console.log(`[Start] Contradiction counter reset to 0`);

    try {
      const result = yield* this.generateRecursive(0);
      if (result === null) {
        console.log(`[Failure] No valid arrangement possible`);
        return null;
      }
      return result;
    } catch (error) {
      console.log(`Generation failed: ${error}`);
      console.log(
        `Failed to generate arrangement - no valid arrangement possible`
      );
      return null;
    }
  }

  /**
   * Recursive generator function that handles the wave function collapse algorithm
   * @param iteration - Current iteration number
   * @returns Generator that yields partial results and returns the final arrangement
   */
  private *generateRecursive(
    iteration: number
  ): Generator<PartialResult, string[][] | null, unknown> {
    iteration++;

    // Log progress every 100 iterations
    if (iteration % 100 === 0) {
      const totalCells = this.width * this.height;
      const collapsedCells = this.countCollapsedCells();
      console.log(
        `[Progress] Iteration ${iteration}: ${collapsedCells}/${totalCells} cells collapsed (${Math.round(
          (collapsedCells / totalCells) * 100
        )}%)`
      );
    }

    // Get sorted list of cells by entropy (lowest first) with shuffling based on contradiction count
    const cells = this.getSortedCellsByEntropy();
    if (cells.length === 0) {
      // All cells are collapsed, we're done!
      console.log(
        `[Success] All cells collapsed after ${iteration} iterations`
      );
      const result = this.getResult();
      yield {
        arrangement: result,
        collapsedCells: this.width * this.height,
        totalCells: this.width * this.height,
        iteration: iteration,
        lastCollapsedCells: [...this.lastCollapsedCells],
        isComplete: true,
      };
      return result;
    }

    // Log cell selection order if contradiction count is high (showing shuffling effect)
    if (this.contradictionCount > 0) {
      console.log(
        `[Shuffle] Cell selection order after ${
          this.contradictionCount
        } contradictions: ${cells
          .slice(0, 5)
          .map((c) => `(${c.x},${c.y})[${c.entropy}]`)
          .join(" -> ")}${cells.length > 5 ? "..." : ""}`
      );
    }

    // Loop through each cell in order of entropy
    for (const cell of cells) {
      console.log(
        `[Decision] Trying cell (${cell.x}, ${cell.y}) with ${cell.entropy} possibilities`
      );

      const availablePossibilities = Array.from(
        this.possibilities[cell.y][cell.x]
      );

      // Shuffle the possibilities based on seed and cell position
      const shuffledPossibilities = this.shuffleArray(
        availablePossibilities,
        cell.x,
        cell.y
      );

      // Loop through each possibility for this cell
      for (const tileToTry of shuffledPossibilities) {
        console.log(
          `[Try] Attempting tile ${tileToTry} at cell (${cell.x}, ${cell.y})`
        );

        // Store the current state before attempting collapse
        const stateBeforeCollapse = this.copyPossibilities();

        try {
          // Manually collapse the cell to the chosen tile
          this.possibilities[cell.y][cell.x].clear();
          this.possibilities[cell.y][cell.x].add(tileToTry);

          // Propagate the changes to neighboring cells
          this.propagate(cell.x, cell.y);

          // If we reach here, the collapse was successful
          console.log(
            `[Success] Successfully collapsed cell (${cell.x}, ${cell.y}) to tile: ${tileToTry}`
          );

          // Track the collapsed cell
          this.trackCollapsedCell(cell.x, cell.y, tileToTry, iteration);

          // Recursively continue with the next iteration
          const result = yield* this.generateRecursive(iteration);

          if (result !== null) {
            // Success! Return the result
            return result;
          } else {
            // This branch failed, restore state and try next possibility
            console.log(
              `[Backtrack] Branch failed for cell (${cell.x}, ${cell.y}), restoring state and trying next possibility`
            );

            // Increment contradiction counter for shuffling (backtracking is also a form of contradiction)
            this.contradictionCount++;
            console.log(
              `[Backtrack] Contradiction count: ${this.contradictionCount} - cells will be shuffled for next iteration`
            );

            this.restorePossibilities(stateBeforeCollapse);

            // Yield partial result after backtracking
            const partialResult = this.getPartialResult(iteration);
            yield partialResult;
          }
        } catch (error) {
          // Contradiction detected, restore the previous state
          console.log(
            `[Contradiction] Tile ${tileToTry} at (${cell.x}, ${
              cell.y
            }) caused contradiction: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // Increment contradiction counter for shuffling
          this.contradictionCount++;
          console.log(
            `[Contradiction] Contradiction count: ${this.contradictionCount} - cells will be shuffled for next iteration`
          );

          // Restore the previous state first
          this.restorePossibilities(stateBeforeCollapse);

          // Reset a 3x3 area around the contradiction to prevent getting stuck
          try {
            this.resetArea(cell.x, cell.y);
            console.log(
              `[Contradiction] Reset 3x3 area around (${cell.x}, ${cell.y}) to prevent getting stuck`
            );
          } catch (resetError) {
            console.log(
              `[Contradiction] Failed to reset area around (${cell.x}, ${cell.y}): ${resetError}`
            );
            // Continue even if reset fails
          }

          // Yield partial result after contradiction
          const partialResult = this.getPartialResult(iteration);
          yield partialResult;

          // Continue to next possibility in the inner loop
        }
      }
    }

    // If we get here, all cells and all possibilities have been exhausted
    console.log(`[Failure] All possibilities exhausted for all cells`);
    return null;
  }

  /**
   * Get a partial result representing the current state of the generation
   */
  private getPartialResult(iteration: number): PartialResult {
    // Return null arrangement for zero dimensions
    if (this.width === 0 || this.height === 0) {
      return {
        arrangement: null,
        collapsedCells: 0,
        totalCells: 0,
        iteration,
        lastCollapsedCells: [...this.lastCollapsedCells],
        isComplete: true,
      };
    }

    const arrangement: string[][] = [];
    let collapsedCells = 0;
    let lastCollapsedCell: { x: number; y: number; tile: string } | undefined;

    for (let y = 0; y < this.height; y++) {
      arrangement[y] = [];
      for (let x = 0; x < this.width; x++) {
        if (this.isCollapsed(x, y)) {
          const tile = this.getCollapsedTile(x, y);
          arrangement[y][x] = tile;
          collapsedCells++;
          lastCollapsedCell = { x, y, tile };
        } else {
          // For uncollapsed cells, use a special identifier
          const possibilities = Array.from(this.possibilities[y][x]);
          arrangement[y][x] = possibilities.length > 0 ? "UNCERTAIN" : "EMPTY";
        }
      }
    }

    return {
      arrangement,
      collapsedCells,
      totalCells: this.width * this.height,
      iteration,
      lastCollapsedCell,
      lastCollapsedCells: [...this.lastCollapsedCells],
      isComplete: false,
    };
  }

  /**
   * Main function to generate the tile arrangement (legacy method)
   * Returns a 2D array of tile IDs, or null if generation fails
   */
  public generate(): string[][] | null {
    const generator = this.generateWithProgress();
    let result: IteratorResult<PartialResult, string[][] | null>;

    do {
      result = generator.next();
    } while (!result.done);

    return result.value;
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
   * Count the number of collapsed cells
   */
  private countCollapsedCells(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isCollapsed(x, y)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Get all uncollapsed cells sorted by entropy (lowest first) and shuffled within entropy groups
   */
  private getSortedCellsByEntropy(): Array<{
    x: number;
    y: number;
    entropy: number;
  }> {
    const cells: Array<{ x: number; y: number; entropy: number }> = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isCollapsed(x, y)) {
          const entropy = this.possibilities[y][x].size;
          if (entropy === 0) {
            // Contradiction: cell has no possibilities
            throw new Error(`Cell (${x}, ${y}) has no possibilities`);
          }
          cells.push({ x, y, entropy });
        }
      }
    }

    // Sort by entropy (lowest first), then shuffle within entropy groups based on contradiction count
    return this.shuffleCellsByEntropy(cells);
  }

  /**
   * Shuffle cells within entropy groups to add randomness after contradictions
   */
  private shuffleCellsByEntropy(
    cells: Array<{ x: number; y: number; entropy: number }>
  ): Array<{ x: number; y: number; entropy: number }> {
    // First sort by entropy
    cells.sort((a, b) => a.entropy - b.entropy);

    // Group cells by entropy
    const entropyGroups = new Map<
      number,
      Array<{ x: number; y: number; entropy: number }>
    >();

    for (const cell of cells) {
      if (!entropyGroups.has(cell.entropy)) {
        entropyGroups.set(cell.entropy, []);
      }
      entropyGroups.get(cell.entropy)!.push(cell);
    }

    // Shuffle each entropy group and combine
    const result: Array<{ x: number; y: number; entropy: number }> = [];

    for (const [entropy, group] of entropyGroups) {
      // Shuffle the group using the contradiction count for randomness
      const shuffledGroup = this.shuffleCellGroup(group);
      result.push(...shuffledGroup);
    }

    return result;
  }

  /**
   * Shuffle a group of cells using the contradiction count for deterministic randomness
   */
  private shuffleCellGroup(
    cells: Array<{ x: number; y: number; entropy: number }>
  ): Array<{ x: number; y: number; entropy: number }> {
    const shuffled = [...cells];

    // Use Fisher-Yates shuffle with contradiction count for randomness
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Create a hash based on contradiction count and position
      const hash = this.hashPosition(this.contradictionCount, i, 0);
      const j = hash % (i + 1);

      // Swap elements
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
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

    // Log if a cell was collapsed during propagation
    if (tilesToRemove.length > 0 && neighborPossibilities.size === 1) {
      const collapsedTile = Array.from(neighborPossibilities)[0];
      console.log(
        `[Propagate] Cell (${nx}, ${ny}) collapsed to ${collapsedTile} due to constraint propagation`
      );
      // Track the collapsed cell (use current iteration for propagation collapses)
      this.trackCollapsedCell(nx, ny, collapsedTile, 0); // Use 0 for propagation collapses
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

  /**
   * Shuffle an array deterministically based on seed and cell position
   */
  private shuffleArray<T>(array: T[], x: number, y: number): T[] {
    const shuffled = [...array];

    // Use Fisher-Yates shuffle with deterministic random numbers
    for (let i = shuffled.length - 1; i > 0; i--) {
      const hash = this.hashPosition(x, y, i);
      const j = hash % (i + 1);

      // Swap elements
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
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
            `[Propagate] Removed incompatible tiles from (${nx}, ${ny}) due to ${direction.name} neighbor (${currentTile})`
          );
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  /**
   * Reset a 3x3 area centered on the specified cell
   * @param centerX - X coordinate of the center cell
   * @param centerY - Y coordinate of the center cell
   */
  public resetArea(centerX: number, centerY: number): void {
    console.log(
      `[ResetArea] Resetting 3x3 area centered on (${centerX}, ${centerY})`
    );

    // Calculate the bounds of the 3x3 area
    const startX = Math.max(0, centerX - 1);
    const endX = Math.min(this.width - 1, centerX + 1);
    const startY = Math.max(0, centerY - 1);
    const endY = Math.min(this.height - 1, centerY + 1);

    // Reset each cell in the area without propagation
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // Skip if the cell is already collapsed (we don't want to reset collapsed cells)
        if (!this.isCollapsed(x, y)) {
          // Reset the cell to have all possible tiles (without propagation)
          this.possibilities[y][x].clear();
          for (const tile of this.tiles) {
            this.possibilities[y][x].add(tile.id);
          }
        }
      }
    }

    // After resetting, perform constraint propagation on the reset area
    // This ensures the reset cells are compatible with their neighbors
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (!this.isCollapsed(x, y)) {
          // Check all four directions and remove incompatible tiles
          for (const direction of WaveFunctionCollapse.DIRECTIONS) {
            const nx = x + direction.dx;
            const ny = y + direction.dy;

            if (this.isInBounds(nx, ny) && this.isCollapsed(nx, ny)) {
              // Neighbor is collapsed, so we need to ensure compatibility
              const neighborTile = this.getCollapsedTile(nx, ny);
              const neighborTileData = this.tiles.find(
                (t) => t.id === neighborTile
              );

              if (neighborTileData) {
                // Remove tiles that are incompatible with the collapsed neighbor
                const tilesToRemove: string[] = [];
                for (const tileId of Array.from(this.possibilities[y][x])) {
                  const tileData = this.tiles.find((t) => t.id === tileId);
                  if (
                    tileData &&
                    !this.areTilesCompatible(
                      tileData,
                      neighborTileData,
                      direction.currentBorder,
                      direction.neighborBorder
                    )
                  ) {
                    tilesToRemove.push(tileId);
                  }
                }

                for (const tileToRemove of tilesToRemove) {
                  this.possibilities[y][x].delete(tileToRemove);
                }
              }
            }
          }
        }
      }
    }

    console.log(
      `[ResetArea] Successfully reset area from (${startX},${startY}) to (${endX},${endY})`
    );
  }

  /**
   * Reset a specific cell back to having the full set of tiles and propagate
   * that increase in probabilities outward to neighboring cells
   * @param x - X coordinate of the cell to reset
   * @param y - Y coordinate of the cell to reset
   */
  public resetTile(x: number, y: number): void {
    // Check bounds
    if (!this.isInBounds(x, y)) {
      throw new Error(`Cell (${x}, ${y}) is out of bounds`);
    }

    // Store the current state before reset
    const stateBeforeReset = this.copyPossibilities();

    try {
      // Reset the cell to have all possible tiles
      this.possibilities[y][x].clear();
      for (const tile of this.tiles) {
        this.possibilities[y][x].add(tile.id);
      }

      // Propagate the increase in possibilities outward
      this.propagateReset(x, y);

      console.log(
        `[Reset] Successfully reset cell (${x}, ${y}) to all possibilities`
      );
    } catch (error) {
      // If propagation fails, restore the previous state
      console.log(
        `[Reset] Reset failed for cell (${x}, ${y}): ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      this.restorePossibilities(stateBeforeReset);
      throw error;
    }
  }

  /**
   * Propagate the increase in possibilities from a reset cell outward
   * This is the opposite of the normal propagate method - it adds possibilities
   * rather than removing them
   * @param startX - X coordinate of the reset cell
   * @param startY - Y coordinate of the reset cell
   */
  private propagateReset(startX: number, startY: number): void {
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // Get the current cell's possibilities
      const currentPossibilities = this.possibilities[y][x];

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

        // Check if we can add any possibilities to the neighbor
        const tilesAdded = this.addCompatibleTiles(
          x,
          y,
          currentPossibilities,
          direction
        );

        if (tilesAdded) {
          console.log(
            `[ResetPropagate] Added compatible tiles to (${nx}, ${ny}) due to ${direction.name} neighbor`
          );
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  /**
   * Add compatible tiles to a neighboring cell based on the current cell's possibilities
   * @param x - X coordinate of the current cell
   * @param y - Y coordinate of the current cell
   * @param currentPossibilities - Set of possibilities in the current cell
   * @param direction - Direction to the neighbor
   * @returns true if any tiles were added, false otherwise
   */
  private addCompatibleTiles(
    x: number,
    y: number,
    currentPossibilities: Set<string>,
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
    const tilesToAdd: string[] = [];

    // For each tile in the current cell's possibilities
    for (const currentTile of Array.from(currentPossibilities)) {
      const currentTileData = this.tiles.find((t) => t.id === currentTile);
      if (!currentTileData) continue;

      // Find tiles that are compatible with this current tile
      for (const neighborTile of this.tiles) {
        // Skip if the neighbor already has this tile
        if (neighborPossibilities.has(neighborTile.id)) {
          continue;
        }

        // Check if this neighbor tile is compatible with the current tile
        if (
          this.areTilesCompatible(
            currentTileData,
            neighborTile,
            direction.currentBorder,
            direction.neighborBorder
          )
        ) {
          tilesToAdd.push(neighborTile.id);
        }
      }
    }

    // Add the compatible tiles to the neighbor
    for (const tileToAdd of tilesToAdd) {
      neighborPossibilities.add(tileToAdd);
    }

    return tilesToAdd.length > 0;
  }

  private getResult(): string[][] | null {
    // Return null for zero dimensions
    if (this.width === 0 || this.height === 0) {
      return null;
    }

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
   * Track a newly collapsed cell
   */
  private trackCollapsedCell(
    x: number,
    y: number,
    tile: string,
    iteration: number
  ): void {
    this.lastCollapsedCells.push({ x, y, tile, iteration });

    // Keep only the last 10 collapsed cells
    if (this.lastCollapsedCells.length > 4) {
      this.lastCollapsedCells = this.lastCollapsedCells.slice(-4);
    }
  }

  /**
   * Get the current seed used for deterministic generation
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Get the current contradiction count for debugging and monitoring
   */
  public getContradictionCount(): number {
    return this.contradictionCount;
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

/**
 * Generator function to generate a tile arrangement with progress updates
 *
 * This function yields partial results during generation, allowing for real-time
 * visualization of the wave function collapse process. It's deterministic - given
 * the same parameters, it will always produce the same sequence of results.
 */
export function* generateTileArrangementWithProgress(
  tiles: TileData[],
  width: number,
  height: number,
  seed: number = 0
): Generator<PartialResult, string[][] | null, unknown> {
  const wfc = new WaveFunctionCollapse(tiles, width, height, seed);
  const result = yield* wfc.generateWithProgress();
  return result;
}
