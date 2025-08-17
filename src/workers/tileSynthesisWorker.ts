// Web Worker for Tile Synthesis using Wave Function Collapse
// This runs the synthesis algorithm in a background thread

interface TileData {
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

interface SynthesisMessage {
  type: "synthesize";
  tiles: TileData[];
  targetWidth: number;
  targetHeight: number;
  tileWidth: number;
  tileHeight: number;
}

interface ProgressMessage {
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

interface AttemptStartMessage {
  type: "attempt_start";
  attemptNumber: number;
  maxAttempts: number;
}

interface ResultMessage {
  type: "result";
  success: boolean;
  arrangement?: string[][]; // Array of tile IDs
  error?: string;
  compatibilityScore?: number;
  isPartial?: boolean; // Indicates if this is a partial result from a failed attempt
  attemptNumber?: number; // Which attempt this result came from
}

type WorkerMessage = SynthesisMessage;
type WorkerResponse = ProgressMessage | ResultMessage;

class TileSynthesisWorker {
  private tiles: TileData[];
  private tileWidth: number;
  private tileHeight: number;

  constructor(tiles: TileData[], tileWidth: number, tileHeight: number) {
    this.tiles = tiles;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  async synthesize(targetWidth: number, targetHeight: number): Promise<void> {
    const gridWidth = targetWidth / this.tileWidth;
    const gridHeight = targetHeight / this.tileHeight;
    const maxAttempts = 1000; // Maximum number of restart attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Starting synthesis attempt ${attempt}/${maxAttempts}`);

      // Send attempt start message
      this.sendAttemptStart(attempt, maxAttempts);

      try {
        const result = await this.runSingleAttempt(
          gridWidth,
          gridHeight,
          attempt
        );
        if (result.success) {
          // Success! Send the final result
          this.sendResult(
            true,
            result.arrangement,
            undefined,
            result.compatibilityScore
          );
          return;
        }
        // If we get here, we hit max iterations - send partial result and continue
        if (result.arrangement) {
          this.sendPartialResult(
            result.arrangement,
            attempt,
            result.compatibilityScore || 0
          );
        }
      } catch (error) {
        // Contradiction found - send partial result if we have one, then continue
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
        console.log(
          `Attempt ${attempt} failed with contradiction, restarting...`
        );
      }
    }

    // All attempts failed
    this.sendResult(
      false,
      undefined,
      `Failed to find a solution after ${maxAttempts} attempts`
    );
  }

  private async runSingleAttempt(
    gridWidth: number,
    gridHeight: number,
    attemptNumber: number
  ): Promise<{
    success: boolean;
    arrangement?: (string | null)[][];
    compatibilityScore?: number;
  }> {
    // Initialize the wave function: each cell contains a set of all possible tile IDs
    const waveFunction: Set<string>[][] = Array(gridHeight)
      .fill(null)
      .map(() =>
        Array(gridWidth)
          .fill(null)
          .map(() => new Set(this.tiles.map((t) => t.id)))
      );

    // Final arrangement (will be filled as tiles are collapsed)
    const arrangement: (string | null)[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(null));

    let iteration = 0;
    const maxIterations = gridWidth * gridHeight * 10; // Safety limit

    while (iteration < maxIterations) {
      iteration++;

      // Send progress update with attempt number
      this.sendProgress(
        iteration,
        arrangement,
        gridWidth,
        gridHeight,
        attemptNumber
      );

      // Step 1: Propagate constraints
      const propagationResult = this.propagateConstraints(
        waveFunction,
        arrangement
      );
      if (!propagationResult.success) {
        // Contradiction found - throw error to trigger restart
        throw new Error("Contradiction found during propagation");
      }

      // Step 2: Collapse the most constrained cell
      const collapseResult = this.collapseSmallest(waveFunction, arrangement);
      if (!collapseResult.success) {
        // All cells collapsed - synthesis complete
        const finalScore = this.calculateCompatibilityScore(arrangement);
        return { success: true, arrangement, compatibilityScore: finalScore };
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

      if (totalCollapsed === gridWidth * gridHeight) {
        const finalScore = this.calculateCompatibilityScore(arrangement);
        return { success: true, arrangement, compatibilityScore: finalScore };
      }
    }

    // Reached max iterations for this attempt
    return { success: false };
  }

  private propagateConstraints(
    waveFunction: Set<string>[][],
    arrangement: (string | null)[][]
  ): { success: boolean; changesMade: boolean } {
    const gridHeight = waveFunction.length;
    const gridWidth = waveFunction[0].length;
    let changesMade = false;
    let passCount = 0;
    const maxPasses = gridWidth * gridHeight * 2; // Safety limit

    let passChanges: boolean;
    do {
      passCount++;
      passChanges = false;
      const propagationChanges: {
        x: number;
        y: number;
        fromCount: number;
        toCount: number;
      }[] = [];

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
          const tilesToRemove: string[] = [];
          for (const tileId of currentPossibilities) {
            if (!compatibleTiles.has(tileId)) {
              tilesToRemove.push(tileId);
            }
          }

          for (const tileId of tilesToRemove) {
            currentPossibilities.delete(tileId);
          }

          if (currentPossibilities.size !== originalSize) {
            passChanges = true;
            propagationChanges.push({
              x,
              y,
              fromCount: originalSize,
              toCount: currentPossibilities.size,
            });
          }

          // If no possibilities remain, propagation failed
          if (currentPossibilities.size === 0) {
            // Create a custom error with partial arrangement
            const error = new Error(
              "Contradiction found during propagation"
            ) as any;
            error.partialArrangement = arrangement;
            error.compatibilityScore =
              this.calculateCompatibilityScore(arrangement);
            throw error;
          }
        }
      }

      changesMade = changesMade || passChanges;

      // Send propagation changes if any occurred
      if (propagationChanges.length > 0) {
        this.sendProgress(
          0,
          arrangement,
          gridWidth,
          gridHeight,
          0, // attemptNumber - we'll get this from the calling context
          undefined,
          propagationChanges
        );
      }
    } while (passChanges && passCount < maxPasses);

    return { success: true, changesMade: changesMade };
  }

  private collapseSmallest(
    waveFunction: Set<string>[][],
    arrangement: (string | null)[][]
  ): { success: boolean; x?: number; y?: number; tileId?: string } {
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
      return { success: false };
    }

    // Randomly select a tile from the possibilities
    const possibilities = Array.from(waveFunction[collapseY][collapseX]);
    const selectedTileId =
      possibilities[Math.floor(Math.random() * possibilities.length)];

    // Collapse the cell
    arrangement[collapseY][collapseX] = selectedTileId;
    waveFunction[collapseY][collapseX].clear();
    waveFunction[collapseY][collapseX].add(selectedTileId);

    // Send collapse update
    this.sendProgress(0, arrangement, gridWidth, gridHeight, 0, {
      x: collapseX,
      y: collapseY,
      tileId: selectedTileId,
      possibilities: minPossibilities,
    });

    return {
      success: true,
      x: collapseX,
      y: collapseY,
      tileId: selectedTileId,
    };
  }

  private getCompatibleTilesForPosition(
    x: number,
    y: number,
    waveFunction: Set<string>[][],
    arrangement: (string | null)[][]
  ): Set<string> {
    const gridHeight = waveFunction.length;
    const gridWidth = waveFunction[0].length;
    const compatibleTiles = new Set<string>();

    // Start with all tiles
    for (const tile of this.tiles) {
      compatibleTiles.add(tile.id);
    }

    // Check north neighbor
    if (y > 0 && arrangement[y - 1][x]) {
      const northTileId = arrangement[y - 1][x]!;
      const northTile = this.tiles.find((t) => t.id === northTileId);
      if (northTile) {
        const northCompatible = new Set<string>();
        for (const tileId of compatibleTiles) {
          const tile = this.tiles.find((t) => t.id === tileId);
          if (
            tile &&
            (northTile.borders.south.includes(tileId) ||
              tile.borders.north.includes(northTileId))
          ) {
            northCompatible.add(tileId);
          }
        }
        compatibleTiles.clear();
        for (const tileId of northCompatible) {
          compatibleTiles.add(tileId);
        }
      }
    }

    // Check south neighbor
    if (y < gridHeight - 1 && arrangement[y + 1][x]) {
      const southTileId = arrangement[y + 1][x]!;
      const southTile = this.tiles.find((t) => t.id === southTileId);
      if (southTile) {
        const southCompatible = new Set<string>();
        for (const tileId of compatibleTiles) {
          const tile = this.tiles.find((t) => t.id === tileId);
          if (
            tile &&
            (southTile.borders.north.includes(tileId) ||
              tile.borders.south.includes(southTileId))
          ) {
            southCompatible.add(tileId);
          }
        }
        compatibleTiles.clear();
        for (const tileId of southCompatible) {
          compatibleTiles.add(tileId);
        }
      }
    }

    // Check west neighbor
    if (x > 0 && arrangement[y][x - 1]) {
      const westTileId = arrangement[y][x - 1]!;
      const westTile = this.tiles.find((t) => t.id === westTileId);
      if (westTile) {
        const westCompatible = new Set<string>();
        for (const tileId of compatibleTiles) {
          const tile = this.tiles.find((t) => t.id === tileId);
          if (
            tile &&
            (westTile.borders.east.includes(tileId) ||
              tile.borders.west.includes(westTileId))
          ) {
            westCompatible.add(tileId);
          }
        }
        compatibleTiles.clear();
        for (const tileId of westCompatible) {
          compatibleTiles.add(tileId);
        }
      }
    }

    // Check east neighbor
    if (x < gridWidth - 1 && arrangement[y][x + 1]) {
      const eastTileId = arrangement[y][x + 1]!;
      const eastTile = this.tiles.find((t) => t.id === eastTileId);
      if (eastTile) {
        const eastCompatible = new Set<string>();
        for (const tileId of compatibleTiles) {
          const tile = this.tiles.find((t) => t.id === tileId);
          if (
            tile &&
            (eastTile.borders.west.includes(tileId) ||
              tile.borders.east.includes(eastTileId))
          ) {
            eastCompatible.add(tileId);
          }
        }
        compatibleTiles.clear();
        for (const tileId of eastCompatible) {
          compatibleTiles.add(tileId);
        }
      }
    }

    return compatibleTiles;
  }

  private calculateCompatibilityScore(
    arrangement: (string | null)[][]
  ): number {
    let score = 0;
    const gridHeight = arrangement.length;
    const gridWidth = arrangement[0].length;

    for (let gridY = 0; gridY < gridHeight; gridY++) {
      for (let gridX = 0; gridX < gridWidth; gridX++) {
        const tileId = arrangement[gridY][gridX];
        if (!tileId) continue;

        const tile = this.tiles.find((t) => t.id === tileId);
        if (!tile) continue;

        // Check compatibility with neighbors
        if (gridY > 0 && arrangement[gridY - 1][gridX]) {
          const northTileId = arrangement[gridY - 1][gridX]!;
          if (
            tile.borders.north.includes(northTileId) ||
            this.tiles
              .find((t) => t.id === northTileId)
              ?.borders.south.includes(tileId)
          ) {
            score++;
          }
        }

        if (gridX > 0 && arrangement[gridY][gridX - 1]) {
          const westTileId = arrangement[gridY][gridX - 1]!;
          if (
            tile.borders.west.includes(westTileId) ||
            this.tiles
              .find((t) => t.id === westTileId)
              ?.borders.east.includes(tileId)
          ) {
            score++;
          }
        }

        if (gridY < gridHeight - 1 && arrangement[gridY + 1][gridX]) {
          const southTileId = arrangement[gridY + 1][gridX]!;
          if (
            tile.borders.south.includes(southTileId) ||
            this.tiles
              .find((t) => t.id === southTileId)
              ?.borders.north.includes(tileId)
          ) {
            score++;
          }
        }

        if (gridX < gridWidth - 1 && arrangement[gridY][gridX + 1]) {
          const eastTileId = arrangement[gridY][gridX + 1]!;
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
    const message: AttemptStartMessage = {
      type: "attempt_start",
      attemptNumber,
      maxAttempts,
    };

    self.postMessage(message);
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

    const message: ProgressMessage = {
      type: "progress",
      iteration,
      totalCollapsed,
      totalCells: gridWidth * gridHeight,
      attemptNumber,
      collapsedCell,
      propagationChanges,
    };

    self.postMessage(message);
  }

  private sendPartialResult(
    arrangement: (string | null)[][],
    attemptNumber: number,
    compatibilityScore: number
  ) {
    const message: ResultMessage = {
      type: "result",
      success: false,
      arrangement: arrangement.map((row) => row.map((cell) => cell || "")),
      error: `Partial result from attempt ${attemptNumber}`,
      compatibilityScore,
      isPartial: true,
      attemptNumber,
    };

    self.postMessage(message);
  }

  private sendResult(
    success: boolean,
    arrangement?: (string | null)[][],
    error?: string,
    compatibilityScore?: number
  ) {
    const message: ResultMessage = {
      type: "result",
      success,
      arrangement: arrangement?.map((row) => row.map((cell) => cell || "")),
      error,
      compatibilityScore,
    };

    self.postMessage(message);
  }
}

// Web Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "synthesize") {
    const worker = new TileSynthesisWorker(
      message.tiles,
      message.tileWidth,
      message.tileHeight
    );
    await worker.synthesize(message.targetWidth, message.targetHeight);
  }
};
