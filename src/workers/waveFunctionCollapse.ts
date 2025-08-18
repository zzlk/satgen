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

export class WaveFunctionCollapse {
  private tiles: TileData[];
  private width: number;
  private height: number;
  private grid: (string | null)[][];
  private possibilities: Set<string>[][];

  constructor(tiles: TileData[], width: number, height: number) {
    this.tiles = tiles;
    this.width = width;
    this.height = height;
    this.grid = [];
    this.possibilities = [];

    // Initialize grid and possibilities
    for (let y = 0; y < height; y++) {
      this.grid[y] = [];
      this.possibilities[y] = [];
      for (let x = 0; x < width; x++) {
        this.grid[y][x] = null;
        this.possibilities[y][x] = new Set(tiles.map((tile) => tile.id));
      }
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

      // Collapse the cell by choosing a random tile from its possibilities
      const success = this.collapseCell(cell.x, cell.y);
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

  private collapseCell(x: number, y: number): boolean {
    const possibilities = Array.from(this.possibilities[y][x]);

    if (possibilities.length === 0) {
      return false; // No possibilities to choose from
    }

    // Choose a random tile from the possibilities
    const randomIndex = Math.floor(Math.random() * possibilities.length);
    const chosenTile = possibilities[randomIndex];

    // Collapse the cell to the chosen tile
    this.grid[y][x] = chosenTile;
    this.possibilities[y][x].clear();
    this.possibilities[y][x].add(chosenTile);

    console.log(`Collapsed cell (${x}, ${y}) to tile: ${chosenTile}`);
    return true;
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
 */
export function generateTileArrangement(
  tiles: TileData[],
  width: number,
  height: number
): string[][] | null {
  const wfc = new WaveFunctionCollapse(tiles, width, height);
  return wfc.generate();
}
