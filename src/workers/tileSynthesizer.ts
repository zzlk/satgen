// Core Tile Synthesis logic without web worker dependencies
// This can be used both in web workers and for direct testing

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

export interface SynthesisProgress {
  type: "progress";
  iteration: number;
  totalCollapsed: number;
  totalCells: number;
  attemptNumber: number;
  collapsedCell?: {
    x: number;
    y: number;
    tileId: string;
    possibilities: number;
  };
  propagationChanges?: {
    x: number;
    y: number;
    fromCount: number;
    toCount: number;
  }[];
}

export interface SynthesisResult {
  type: "result";
  success: boolean;
  arrangement?: string[][];
  error?: string;
  compatibilityScore?: number;
  isPartial?: boolean;
  attemptNumber?: number;
}

export interface AttemptStart {
  type: "attempt_start";
  attemptNumber: number;
  maxAttempts: number;
}

export type SynthesisEvent = SynthesisProgress | SynthesisResult | AttemptStart;

export interface WorkerAdapter {
  postMessage(event: SynthesisEvent): void;
}

// Cell class for managing tile possibilities and support
class Cell {
  private possibilities: Set<string>;
  private support: Map<string, number[]>; // [north, east, south, west] support counts

  constructor(tileIds: string[]) {
    this.possibilities = new Set(tileIds);
    this.support = new Map();

    // Initialize support for all tiles
    for (const tileId of tileIds) {
      this.support.set(tileId, [0, 0, 0, 0]); // [north, east, south, west]
    }
  }

  getPossibilities(): Set<string> {
    return new Set(this.possibilities);
  }

  getPossibilityCount(): number {
    return this.possibilities.size;
  }

  hasPossibility(tileId: string): boolean {
    return this.possibilities.has(tileId);
  }

  removePossibility(tileId: string): boolean {
    return this.possibilities.delete(tileId);
  }

  addPossibility(tileId: string): void {
    this.possibilities.add(tileId);
  }

  getSupport(tileId: string, direction: number): number {
    const support = this.support.get(tileId);
    return support ? support[direction] : 0;
  }

  setSupport(tileId: string, direction: number, value: number): void {
    const support = this.support.get(tileId);
    if (support) {
      support[direction] = value;
    }
  }

  incrementSupport(tileId: string, direction: number): boolean {
    const support = this.support.get(tileId);
    if (support) {
      support[direction]++;
      return support[direction] === 1; // Return true if support went from 0 to 1
    }
    return false;
  }

  decrementSupport(tileId: string, direction: number): boolean {
    const support = this.support.get(tileId);
    if (support) {
      support[direction]--;
      return support[direction] === 0; // Return true if support went to 0
    }
    return false;
  }

  getRandomPossibility(): string | null {
    if (this.possibilities.size === 0) return null;
    const possibilities = Array.from(this.possibilities);
    return possibilities[Math.floor(Math.random() * possibilities.length)];
  }

  isCollapsed(): boolean {
    return this.possibilities.size === 1;
  }

  getCollapsedTile(): string | null {
    if (this.possibilities.size === 1) {
      return Array.from(this.possibilities)[0];
    }
    return null;
  }
}

export class TileSynthesizer {
  private tiles: TileData[];
  private tileWidth: number;
  private tileHeight: number;
  private cells: Cell[][] = [];
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private rules: Map<string, Map<string, string[]>>; // tileId -> direction -> allowed neighbors
  private adapter: WorkerAdapter;

  constructor(
    tiles: TileData[],
    tileWidth: number,
    tileHeight: number,
    adapter: WorkerAdapter
  ) {
    this.tiles = tiles;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.adapter = adapter;
    this.rules = this.buildRules();
  }

  private buildRules(): Map<string, Map<string, string[]>> {
    const rules = new Map();

    for (const tile of this.tiles) {
      const tileRules = new Map();

      // North direction (0)
      tileRules.set("0", tile.borders.north);
      // East direction (1)
      tileRules.set("1", tile.borders.east);
      // South direction (2)
      tileRules.set("2", tile.borders.south);
      // West direction (3)
      tileRules.set("3", tile.borders.west);

      rules.set(tile.id, tileRules);
    }

    return rules;
  }

  async synthesize(targetWidth: number, targetHeight: number): Promise<void> {
    this.gridWidth = targetWidth / this.tileWidth;
    this.gridHeight = targetHeight / this.tileHeight;
    const maxAttempts = 15; // Slightly more attempts

    console.log(`🚀 Starting synthesis with ${maxAttempts} max attempts`);
    console.log(
      `📐 Grid size: ${this.gridWidth}x${this.gridHeight} (${
        this.gridWidth * this.gridHeight
      } total cells)`
    );
    console.log(`🧩 Number of tiles: ${this.tiles.length}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(
        `=== Starting synthesis attempt ${attempt}/${maxAttempts} ===`
      );
      this.sendAttemptStart(attempt, maxAttempts);

      try {
        const result = await this.runSingleAttempt(attempt);
        if (result.success) {
          console.log(`🎉 Synthesis succeeded on attempt ${attempt}!`);
          this.sendResult(
            true,
            result.arrangement,
            undefined,
            result.compatibilityScore
          );
          return;
        }
        // Send partial result if we have one
        if (result.arrangement) {
          this.sendPartialResult(
            result.arrangement,
            attempt,
            result.compatibilityScore || 0
          );
        }
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed with error: ${error}`);
        // Send partial result if available
        if (
          error &&
          typeof error === "object" &&
          "partialArrangement" in error
        ) {
          const errorObj = error as any;
          if (errorObj.partialArrangement) {
            this.sendPartialResult(
              errorObj.partialArrangement,
              attempt,
              errorObj.compatibilityScore || 0
            );
          }
        }
      }

      // Add a small delay between attempts to prevent overwhelming the system
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`💀 Failed to find a solution after ${maxAttempts} attempts`);
    this.sendResult(
      false,
      undefined,
      `Failed to find a solution after ${maxAttempts} attempts`
    );
  }

  private async runSingleAttempt(attemptNumber: number): Promise<{
    success: boolean;
    arrangement?: (string | null)[][];
    compatibilityScore?: number;
  }> {
    // Initialize cells
    this.initializeCells();

    // Calculate initial support
    this.calculateInitialSupport();

    // Run logical conclusion algorithm
    return this.logicalConclusion(attemptNumber);
  }

  private initializeCells(): void {
    const tileIds = this.tiles.map((t) => t.id);
    this.cells = [];

    for (let y = 0; y < this.gridHeight; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.cells[y][x] = new Cell(tileIds);
      }
    }
  }

  private calculateInitialSupport(): void {
    console.log(
      `🔧 Calculating initial support for ${this.gridWidth}x${this.gridHeight} grid`
    );

    // Calculate support for all cells
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.calculateSupport(x, y);
      }
    }

    // Log initial support statistics
    let totalSupport = 0;
    let minSupport = Infinity;
    let maxSupport = 0;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.cells[y][x];
        for (const tileId of cell.getPossibilities()) {
          let tileSupport = 0;
          for (let dir = 0; dir < 4; dir++) {
            tileSupport += cell.getSupport(tileId, dir);
          }
          totalSupport += tileSupport;
          minSupport = Math.min(minSupport, tileSupport);
          maxSupport = Math.max(maxSupport, tileSupport);
        }
      }
    }

    const avgSupport =
      totalSupport / (this.gridWidth * this.gridHeight * this.tiles.length);
    console.log(
      `📊 Initial support stats: min=${minSupport}, max=${maxSupport}, avg=${avgSupport.toFixed(
        2
      )}`
    );
  }

  private calculateSupport(x: number, y: number): void {
    const cell = this.cells[y][x];
    const directions = [
      { dx: 0, dy: -1, dir: 0 }, // north
      { dx: 1, dy: 0, dir: 1 }, // east
      { dx: 0, dy: 1, dir: 2 }, // south
      { dx: -1, dy: 0, dir: 3 }, // west
    ];

    // Reset support for all tiles
    for (const tileId of this.tiles.map((t) => t.id)) {
      cell.setSupport(tileId, 0, 0);
      cell.setSupport(tileId, 1, 0);
      cell.setSupport(tileId, 2, 0);
      cell.setSupport(tileId, 3, 0);
    }

    // Calculate support from each direction
    for (const { dx, dy, dir } of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        const neighborCell = this.cells[ny][nx];

        // Only consider tiles that are actually possible in the neighbor cell
        for (const neighborTileId of neighborCell.getPossibilities()) {
          const neighborRules = this.rules.get(neighborTileId);
          if (neighborRules) {
            const allowedTiles = neighborRules.get(dir.toString());
            if (allowedTiles) {
              for (const allowedTileId of allowedTiles) {
                // Only add support if the tile is still possible in the current cell
                if (cell.hasPossibility(allowedTileId)) {
                  const currentSupport = cell.getSupport(allowedTileId, dir);
                  cell.setSupport(allowedTileId, dir, currentSupport + 1);
                }
              }
            }
          }
        }
      }
    }
  }

  private recalculateSupportForAffectedCells(
    affectedCells: Array<{ x: number; y: number }>
  ): void {
    // Recalculate support for all affected cells and their neighbors
    const cellsToUpdate = new Set<string>();

    for (const { x, y } of affectedCells) {
      cellsToUpdate.add(`${x},${y}`);

      // Add neighboring cells
      const directions = [
        { dx: 0, dy: -1 }, // north
        { dx: 1, dy: 0 }, // east
        { dx: 0, dy: 1 }, // south
        { dx: -1, dy: 0 }, // west
      ];

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          cellsToUpdate.add(`${nx},${ny}`);
        }
      }
    }

    // Recalculate support for all affected cells
    for (const cellKey of cellsToUpdate) {
      const [x, y] = cellKey.split(",").map(Number);
      this.calculateSupport(x, y);
    }
  }

  private propagateAdd(
    deactivations: Array<{ x: number; y: number; tileId: string }>
  ): void {
    // Restore tiles that were previously removed
    for (const { x, y, tileId } of deactivations) {
      const cell = this.cells[y][x];
      if (!cell.hasPossibility(tileId)) {
        cell.addPossibility(tileId);
      }
    }

    // Recalculate support for all affected cells
    const affectedCells: Array<{ x: number; y: number }> = [];
    for (const { x, y } of deactivations) {
      affectedCells.push({ x, y });
      // Add neighboring cells that might be affected
      const directions = [
        { dx: 0, dy: -1 }, // north
        { dx: 1, dy: 0 }, // east
        { dx: 0, dy: 1 }, // south
        { dx: -1, dy: 0 }, // west
      ];
      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          affectedCells.push({ x: nx, y: ny });
        }
      }
    }
    this.recalculateSupportForAffectedCells(affectedCells);
  }

  private logicalConclusion(attemptNumber: number): Promise<{
    success: boolean;
    arrangement?: (string | null)[][];
    compatibilityScore?: number;
  }> {
    return new Promise((resolve, reject) => {
      const deactivations: Array<
        Array<{ x: number; y: number; tileId: string }>
      > = [];
      const indices: Array<Array<{ x: number; y: number; entropy: number }>> =
        [];

      let currentIndices = this.getEntropyIndices(3); // Start with fewer indices
      let iteration = 0;
      const maxIterations = this.gridWidth * this.gridHeight * 30; // Slightly more iterations
      let consecutiveContradictions = 0;
      const maxConsecutiveContradictions = 5;

      console.log(
        `🔍 Starting logical conclusion for attempt ${attemptNumber}`
      );
      console.log(
        `📊 Initial state: ${this.getCollapsedCount()}/${
          this.gridWidth * this.gridHeight
        } cells collapsed`
      );
      console.log(`🎯 Max iterations: ${maxIterations}`);
      console.log(
        `📋 Initial entropy indices: ${currentIndices.length} cells to process`
      );

      // Use a loop instead of recursion to prevent stack overflow
      while (iteration <= maxIterations) {
        iteration++;

        // Log progress every 100 iterations
        if (iteration % 100 === 0) {
          const collapsedCount = this.getCollapsedCount();
          const totalCells = this.gridWidth * this.gridHeight;
          console.log(
            `📈 Iteration ${iteration}: ${collapsedCount}/${totalCells} cells collapsed (${Math.round(
              (collapsedCount / totalCells) * 100
            )}%)`
          );
        }

        // Send progress update less frequently
        if (iteration % 200 === 0) {
          this.sendProgress(
            iteration,
            this.getArrangement(),
            this.gridWidth,
            this.gridHeight,
            attemptNumber
          );
        }

        // Send partial result periodically (every 1000 iterations to reduce spam)
        if (iteration % 1000 === 0) {
          const arrangement = this.getArrangement();
          const score = this.calculateCompatibilityScore(arrangement);
          this.sendPartialResult(arrangement, attemptNumber, score);
        }

        const currentIndex = currentIndices.pop();

        if (!currentIndex) {
          // Backtrack
          if (deactivations.length === 0 || indices.length === 0) {
            // No more backtracking possible - this attempt failed
            console.log(
              `🔄 No more backtracking possible - attempt ${attemptNumber} failed`
            );
            const arrangement = this.getArrangement();
            const score = this.calculateCompatibilityScore(arrangement);
            this.sendPartialResult(arrangement, attemptNumber, score);
            resolve({ success: false });
            return;
          }

          console.log(
            `🔄 Backtracking: restoring ${
              deactivations[deactivations.length - 1].length
            } deactivated tiles`
          );

          const deactivated = deactivations.pop()!;
          // Restore tiles that were removed in this propagation
          this.propagateAdd(deactivated);
          currentIndices = indices.pop()!;
          consecutiveContradictions = 0; // Reset contradiction counter
          continue;
        }

        const { x, y } = currentIndex;
        const cell = this.cells[y][x];

        if (cell.getPossibilityCount() <= 1) {
          // If cell has 0 possibilities, it's a contradiction from a previous propagation.
          // This should trigger backtracking logic similar to `if (contradiction)` below.
          // If it has 1 possibility, it's already collapsed, so skip.
          if (cell.getPossibilityCount() === 0) {
            console.log(
              `💥 Contradiction detected at (${x}, ${y}) due to 0 possibilities!`
            );
            // This means the *last choice* led to this. We need to undo the last choice.
            // This logic should ideally be handled by the `if (contradiction)` block below
            // if `propagateRemove` correctly identifies it.
            // For now, if we hit 0 possibilities here, it means a deeper issue or a missed contradiction flag.
            // We'll force a backtrack.
            if (deactivations.length > 0 && indices.length > 0) {
              console.log(
                `🔄 Backtracking due to 0 possibilities: restoring previous state`
              );
              const deactivated = deactivations.pop()!;
              currentIndices = indices.pop()!;
              this.propagateAdd(deactivated);
              // We don't know which specific tile caused this, so we just backtrack a full step.
              consecutiveContradictions++; // Count this as a contradiction
              continue;
            } else {
              console.log(
                `🔄 No more backtracking possible - attempt ${attemptNumber} failed (0 possibilities at ${x},${y})`
              );
              const arrangement = this.getArrangement();
              const score = this.calculateCompatibilityScore(arrangement);
              this.sendPartialResult(arrangement, attemptNumber, score);
              resolve({ success: false });
              return;
            }
          }
          continue; // If possibilityCount is 1, it's collapsed, so skip.
        }

        console.log(
          `🎲 Processing cell (${x}, ${y}) with ${cell.getPossibilityCount()} possibilities`
        );

        // Choose a tile to keep (smart selection based on support)
        const { chosenTile, toRemove } = this.chooseRemovalSet(x, y);
        console.log(
          `🗑️  Removing ${toRemove.size} tiles from cell (${x}, ${y})`
        );

        const { contradiction, deactivated } = this.propagateRemove(
          x,
          y,
          toRemove
        );

        // Send partial result after significant progress (every 20 collapses)
        const arrangement = this.getArrangement();
        const collapsedCount = this.getCollapsedCount();
        if (collapsedCount > 0 && collapsedCount % 20 === 0) {
          const score = this.calculateCompatibilityScore(arrangement);
          this.sendPartialResult(arrangement, attemptNumber, score);
        }

        if (contradiction) {
          consecutiveContradictions++;
          console.log(
            `💥 Contradiction detected! (${consecutiveContradictions}/${maxConsecutiveContradictions}) Restoring ${deactivated.length} tiles`
          );

          // Restore tiles that were removed in this propagation
          this.propagateAdd(deactivated);

          // Now, remove the problematic chosenTile from the possibilities of the current cell (x,y)
          const currentCell = this.cells[y][x]; // Get the restored cell
          if (currentCell.hasPossibility(chosenTile)) {
            currentCell.removePossibility(chosenTile);
            console.log(
              `🚫 Removed problematic tile ${chosenTile} from cell (${x}, ${y})`
            );
            // Re-add this cell to currentIndices to try again with reduced possibilities
            currentIndices.push({
              x,
              y,
              entropy: currentCell.getPossibilityCount(),
            });
            // Re-sort currentIndices to ensure lowest entropy (this cell) is picked next
            currentIndices.sort((a, b) => a.entropy - b.entropy);
          } else {
            // This case should ideally not happen if chosenTile was indeed a possibility.
            // It might mean the contradiction was due to propagation affecting (x,y) itself.
            // If the chosenTile is no longer a possibility, it means the contradiction was deeper.
            // In this case, we need to backtrack further.
            console.log(
              `⚠️ Chosen tile ${chosenTile} not found in possibilities of cell (${x}, ${y}) after restoration. Backtracking further.`
            );
            // Force a full backtrack step if the specific tile removal isn't possible
            if (deactivations.length > 0 && indices.length > 0) {
              const prevDeactivated = deactivations.pop()!;
              currentIndices = indices.pop()!;
              this.propagateAdd(prevDeactivated);
            } else {
              console.log(
                `🔄 No more backtracking possible - attempt ${attemptNumber} failed (deeper contradiction)`
              );
              const arrangement = this.getArrangement();
              const score = this.calculateCompatibilityScore(arrangement);
              this.sendPartialResult(arrangement, attemptNumber, score);
              resolve({ success: false });
              return;
            }
          }

          // If too many consecutive contradictions, try a different approach
          if (consecutiveContradictions >= maxConsecutiveContradictions) {
            console.log(
              `⚠️ Too many consecutive contradictions, trying different entropy calculation`
            );
            currentIndices = this.getEntropyIndices(5); // Get more indices
            consecutiveContradictions = 0;
          }
          continue;
        }

        // Reset contradiction counter on success
        consecutiveContradictions = 0;

        // Check if we're done
        if (this.isDone()) {
          console.log(
            `✅ Synthesis completed successfully in ${iteration} iterations!`
          );
          const arrangement = this.getArrangement();

          // Validate the final arrangement (log warnings but don't fail)
          const validation = this.validateArrangement(arrangement);
          if (!validation.isValid) {
            console.warn(`⚠️ Final arrangement has validation issues:`);
            validation.errors.forEach((error) => console.warn(`  - ${error}`));
          }

          const score = this.calculateCompatibilityScore(arrangement);
          console.log(`🏆 Final compatibility score: ${score}`);
          resolve({ success: true, arrangement, compatibilityScore: score });
          return;
        }

        // Save state for backtracking
        deactivations.push(deactivated);
        indices.push(currentIndices);
        console.log(
          `💾 Saved state for backtracking (${deactivations.length} states saved)`
        );

        // Get new indices for next iteration - adaptive sizing
        const newIndexCount = Math.min(
          3,
          Math.max(1, 5 - deactivations.length)
        );
        currentIndices = this.getEntropyIndices(newIndexCount);
        console.log(
          `📋 Got ${currentIndices.length} new entropy indices (requested ${newIndexCount})`
        );
      }

      // Reached max iterations
      console.log(
        `⏰ Reached max iterations (${maxIterations}) - attempt ${attemptNumber} failed`
      );
      const arrangement = this.getArrangement();
      const score = this.calculateCompatibilityScore(arrangement);
      console.log(
        `📊 Final state: ${this.getCollapsedCount()}/${
          this.gridWidth * this.gridHeight
        } cells collapsed`
      );
      this.sendPartialResult(arrangement, attemptNumber, score);
      resolve({ success: false });
    });
  }

  private getEntropyIndices(
    count: number
  ): Array<{ x: number; y: number; entropy: number }> {
    const entropies: Array<{ x: number; y: number; entropy: number }> = [];

    // Calculate entropy based on possibility count (most constrained first)
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.cells[y][x];
        const possibilityCount = cell.getPossibilityCount();
        if (possibilityCount > 1) {
          // Primary factor: fewer possibilities = lower entropy (higher priority)
          let entropy = possibilityCount;

          // Secondary factor: consider support constraints
          let totalSupport = 0;
          let minSupport = Infinity;
          for (const tileId of cell.getPossibilities()) {
            let tileSupport = 0;
            for (let dir = 0; dir < 4; dir++) {
              tileSupport += cell.getSupport(tileId, dir);
            }
            totalSupport += tileSupport;
            minSupport = Math.min(minSupport, tileSupport);
          }

          // Add small penalty for cells with very low support (more constrained)
          // This is a secondary consideration - possibility count is primary
          const supportPenalty = Math.max(0, (4 - minSupport) * 0.1);
          entropy += supportPenalty;

          entropies.push({ x, y, entropy });
        }
      }
    }

    console.log(
      `📊 Found ${entropies.length} cells with multiple possibilities`
    );

    // Sort by entropy (lowest first) - this prioritizes cells with fewest possibilities
    entropies.sort((a, b) => a.entropy - b.entropy);

    // Add randomness to cell selection: sometimes choose from a pool of most constrained cells
    if (entropies.length > 0) {
      const minEntropy = entropies[0].entropy;
      const entropyThreshold = minEntropy * 1.2; // Tighter threshold for most constrained cells

      // Find cells with entropy close to the minimum (most constrained)
      const mostConstrainedCells = entropies.filter(
        (cell) => cell.entropy <= entropyThreshold
      );

      if (mostConstrainedCells.length > 1) {
        // Randomly shuffle the most constrained cells and take the requested count
        this.shuffleArray(mostConstrainedCells);
        mostConstrainedCells.splice(count);
        return mostConstrainedCells;
      }
    }

    // Fallback to deterministic selection if no suitable pool found
    entropies.splice(count);
    return entropies;
  }

  private chooseRemovalSet(
    x: number,
    y: number
  ): { chosenTile: string; toRemove: Set<string> } {
    const cell = this.cells[y][x];
    const possibilities = Array.from(cell.getPossibilities());

    if (possibilities.length <= 1) {
      return { chosenTile: possibilities[0] || "", toRemove: new Set() }; // Return empty set if no other possibilities
    }

    // Choose a completely random tile from the possible ones
    const chosenTile =
      possibilities[Math.floor(Math.random() * possibilities.length)];

    const toRemove = new Set<string>();
    for (const tileId of possibilities) {
      if (tileId !== chosenTile) {
        toRemove.add(tileId);
      }
    }

    console.log(
      `🎲 Randomly selected tile ${chosenTile} from ${possibilities.length} possibilities (removing ${toRemove.size} others)`
    );
    return { chosenTile, toRemove };
  }

  // Helper method to shuffle an array in place
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Helper method for weighted random choice
  private weightedRandomChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    // Fallback to last item (shouldn't happen with proper weights)
    return items[items.length - 1];
  }

  private propagateRemove(
    x: number,
    y: number,
    toRemove: Set<string>
  ): {
    contradiction: boolean;
    deactivated: Array<{ x: number; y: number; tileId: string }>;
  } {
    const deactivated: Array<{ x: number; y: number; tileId: string }> = [];
    const queue: Array<{ x: number; y: number; removed: string[] }> = [];
    let contradiction = false;

    // Remove tiles from starting cell
    const startCell = this.cells[y][x];
    const removed: string[] = [];
    for (const tileId of toRemove) {
      if (startCell.hasPossibility(tileId)) {
        startCell.removePossibility(tileId);
        deactivated.push({ x, y, tileId });
        removed.push(tileId);
      }
    }

    if (startCell.getPossibilityCount() === 0) {
      contradiction = true;
    }

    queue.push({ x, y, removed });

    // Process queue
    while (queue.length > 0) {
      const current = queue.pop()!;
      const { x: cx, y: cy, removed } = current;

      const directions = [
        { dx: 0, dy: -1, dir: 0 }, // north
        { dx: 1, dy: 0, dir: 1 }, // east
        { dx: 0, dy: 1, dir: 2 }, // south
        { dx: -1, dy: 0, dir: 3 }, // west
      ];

      for (const { dx, dy, dir } of directions) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          const targetCell = this.cells[ny][nx];
          const newlyRemoved: string[] = [];

          // Use a Set to avoid duplicate processing of the same removed tile
          const uniqueRemoved = new Set(removed);

          for (const removedTileId of uniqueRemoved) {
            const rules = this.rules.get(removedTileId);
            if (rules) {
              const allowedTiles = rules.get(dir.toString());
              if (allowedTiles) {
                for (const allowedTileId of allowedTiles) {
                  if (targetCell.hasPossibility(allowedTileId)) {
                    const supportWentToZero = targetCell.decrementSupport(
                      allowedTileId,
                      dir
                    );
                    if (supportWentToZero) {
                      targetCell.removePossibility(allowedTileId);
                      deactivated.push({ x: nx, y: ny, tileId: allowedTileId });
                      newlyRemoved.push(allowedTileId);

                      if (targetCell.getPossibilityCount() === 0) {
                        contradiction = true;
                      }
                    }
                  }
                }
              }
            }
          }

          if (newlyRemoved.length > 0) {
            // Find existing entry or create new one
            let found = false;
            for (const entry of queue) {
              if (entry.x === nx && entry.y === ny) {
                entry.removed.push(...newlyRemoved);
                found = true;
                break;
              }
            }

            if (!found) {
              queue.push({ x: nx, y: ny, removed: newlyRemoved });
            }
          }
        }
      }
    }

    // Recalculate support for all affected cells to ensure consistency
    const affectedCells: Array<{ x: number; y: number }> = [];
    for (const { x: dx, y: dy } of deactivated) {
      affectedCells.push({ x: dx, y: dy });
      // Add neighboring cells that might be affected
      const directions = [
        { dx: 0, dy: -1 }, // north
        { dx: 1, dy: 0 }, // east
        { dx: 0, dy: 1 }, // south
        { dx: -1, dy: 0 }, // west
      ];
      for (const { dx: ndx, dy: ndy } of directions) {
        const nx = dx + ndx;
        const ny = dy + ndy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          affectedCells.push({ x: nx, y: ny });
        }
      }
    }
    this.recalculateSupportForAffectedCells(affectedCells);

    console.log(`🌊 Propagation removed ${deactivated.length} tiles total`);
    return { contradiction, deactivated };
  }

  private isDone(): boolean {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (!this.cells[y][x].isCollapsed()) {
          return false;
        }
      }
    }
    return true;
  }

  private getCollapsedCount(): number {
    let count = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.cells[y][x].isCollapsed()) {
          count++;
        }
      }
    }
    return count;
  }

  private getArrangement(): (string | null)[][] {
    const arrangement: (string | null)[][] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      arrangement[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        arrangement[y][x] = this.cells[y][x].getCollapsedTile();
      }
    }
    return arrangement;
  }

  private validateArrangement(arrangement: (string | null)[][]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const tileId = arrangement[y][x];
        if (!tileId) continue;

        const tile = this.tiles.find((t) => t.id === tileId);
        if (!tile) {
          errors.push(`Invalid tile ID at (${x}, ${y}): ${tileId}`);
          continue;
        }

        // Check compatibility with neighbors
        if (y > 0 && arrangement[y - 1][x]) {
          const northTileId = arrangement[y - 1][x]!;
          const northTile = this.tiles.find((t) => t.id === northTileId);
          if (!northTile) {
            errors.push(
              `Invalid north neighbor tile ID at (${x}, ${
                y - 1
              }): ${northTileId}`
            );
            continue;
          }

          const isCompatible =
            tile.borders.north.includes(northTileId) ||
            northTile.borders.south.includes(tileId);
          if (!isCompatible) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${x}, ${
                y - 1
              }): ${tileId} cannot be north of ${northTileId}`
            );
          }
        }

        if (x > 0 && arrangement[y][x - 1]) {
          const westTileId = arrangement[y][x - 1]!;
          const westTile = this.tiles.find((t) => t.id === westTileId);
          if (!westTile) {
            errors.push(
              `Invalid west neighbor tile ID at (${x - 1}, ${y}): ${westTileId}`
            );
            continue;
          }

          const isCompatible =
            tile.borders.west.includes(westTileId) ||
            westTile.borders.east.includes(tileId);
          if (!isCompatible) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${
                x - 1
              }, ${y}): ${tileId} cannot be east of ${westTileId}`
            );
          }
        }

        if (y < this.gridHeight - 1 && arrangement[y + 1][x]) {
          const southTileId = arrangement[y + 1][x]!;
          const southTile = this.tiles.find((t) => t.id === southTileId);
          if (!southTile) {
            errors.push(
              `Invalid south neighbor tile ID at (${x}, ${
                y + 1
              }): ${southTileId}`
            );
            continue;
          }

          const isCompatible =
            tile.borders.south.includes(southTileId) ||
            southTile.borders.north.includes(tileId);
          if (!isCompatible) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${x}, ${
                y + 1
              }): ${tileId} cannot be south of ${southTileId}`
            );
          }
        }

        if (x < this.gridWidth - 1 && arrangement[y][x + 1]) {
          const eastTileId = arrangement[y][x + 1]!;
          const eastTile = this.tiles.find((t) => t.id === eastTileId);
          if (!eastTile) {
            errors.push(
              `Invalid east neighbor tile ID at (${x + 1}, ${y}): ${eastTileId}`
            );
            continue;
          }

          const isCompatible =
            tile.borders.east.includes(eastTileId) ||
            eastTile.borders.west.includes(tileId);
          if (!isCompatible) {
            errors.push(
              `Incompatible tiles at (${x}, ${y}) and (${
                x + 1
              }, ${y}): ${tileId} cannot be west of ${eastTileId}`
            );
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private calculateCompatibilityScore(
    arrangement: (string | null)[][]
  ): number {
    let score = 0;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const tileId = arrangement[y][x];
        if (!tileId) continue;

        const tile = this.tiles.find((t) => t.id === tileId);
        if (!tile) continue;

        // Check compatibility with neighbors
        if (y > 0 && arrangement[y - 1][x]) {
          const northTileId = arrangement[y - 1][x]!;
          if (
            tile.borders.north.includes(northTileId) ||
            this.tiles
              .find((t) => t.id === northTileId)
              ?.borders.south.includes(tileId)
          ) {
            score++;
          }
        }

        if (x > 0 && arrangement[y][x - 1]) {
          const westTileId = arrangement[y][x - 1]!;
          if (
            tile.borders.west.includes(westTileId) ||
            this.tiles
              .find((t) => t.id === westTileId)
              ?.borders.east.includes(tileId)
          ) {
            score++;
          }
        }

        if (y < this.gridHeight - 1 && arrangement[y + 1][x]) {
          const southTileId = arrangement[y + 1][x]!;
          if (
            tile.borders.south.includes(southTileId) ||
            this.tiles
              .find((t) => t.id === southTileId)
              ?.borders.north.includes(tileId)
          ) {
            score++;
          }
        }

        if (x < this.gridWidth - 1 && arrangement[y][x + 1]) {
          const eastTileId = arrangement[y][x + 1]!;
          if (
            tile.borders.east.includes(eastTileId) ||
            this.tiles
              .find((t) => t.id === eastTileId)
              ?.borders.west.includes(tileId)
          ) {
            score++;
          }
        }
      }
    }

    return score;
  }

  private sendAttemptStart(attemptNumber: number, maxAttempts: number) {
    const message: AttemptStart = {
      type: "attempt_start",
      attemptNumber,
      maxAttempts,
    };
    this.adapter.postMessage(message);
  }

  private sendProgress(
    iteration: number,
    arrangement: (string | null)[][],
    gridWidth: number,
    gridHeight: number,
    attemptNumber: number,
    collapsedCell?: {
      x: number;
      y: number;
      tileId: string;
      possibilities: number;
    },
    propagationChanges?: {
      x: number;
      y: number;
      fromCount: number;
      toCount: number;
    }[]
  ) {
    let totalCollapsed = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (arrangement[y][x] !== null) {
          totalCollapsed++;
        }
      }
    }

    const message: SynthesisProgress = {
      type: "progress",
      iteration,
      totalCollapsed,
      totalCells: gridWidth * gridHeight,
      attemptNumber,
      collapsedCell,
      propagationChanges,
    };

    this.adapter.postMessage(message);
  }

  private sendPartialResult(
    arrangement: (string | null)[][],
    attemptNumber: number,
    compatibilityScore: number
  ) {
    const message: SynthesisResult = {
      type: "result",
      success: false,
      arrangement: arrangement.map((row) => row.map((cell) => cell || "")),
      error: `Partial result from attempt ${attemptNumber}`,
      compatibilityScore,
      isPartial: true,
      attemptNumber,
    };

    this.adapter.postMessage(message);
  }

  private sendResult(
    success: boolean,
    arrangement?: (string | null)[][],
    error?: string,
    compatibilityScore?: number
  ) {
    const message: SynthesisResult = {
      type: "result",
      success,
      arrangement: arrangement?.map((row) => row.map((cell) => cell || "")),
      error,
      compatibilityScore,
    };

    this.adapter.postMessage(message);
  }
}
