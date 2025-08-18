import { Tile } from "./Tile";
import {
  generateTileArrangement,
  type TileData,
} from "../workers/waveFunctionCollapse";

export interface SynthesisResult {
  arrangement: (Tile | null)[][];
  compatibilityScore: number;
  dataUrl: string;
  isPartial?: boolean;
  attemptNumber?: number;
}

export interface SynthesisProgress {
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

export interface SynthesisAttemptStart {
  attemptNumber: number;
  maxAttempts: number;
}

export class WaveFunctionCollapseSynthesizer {
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
   * Converts Tile objects to TileData format for the wave function collapse algorithm
   */
  private convertTilesToTileData(): TileData[] {
    return this.tiles.map((tile) => ({
      id: tile.id,
      dataUrl: tile.dataUrl,
      width: tile.width,
      height: tile.height,
      borders: {
        north: Array.from(tile.borders.north),
        east: Array.from(tile.borders.east),
        south: Array.from(tile.borders.south),
        west: Array.from(tile.borders.west),
      },
    }));
  }

  /**
   * Creates a map from tile ID to Tile object for easy lookup
   */
  private createTileMap(): Map<string, Tile> {
    const tileMap = new Map<string, Tile>();
    for (const tile of this.tiles) {
      tileMap.set(tile.id, tile);
    }
    return tileMap;
  }

  /**
   * Renders the arrangement to a canvas and returns the data URL
   */
  private async renderArrangementToCanvas(
    arrangement: string[][],
    targetWidth: number,
    targetHeight: number
  ): Promise<string> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const tileMap = this.createTileMap();

    // Render the arrangement
    for (let gridY = 0; gridY < arrangement.length; gridY++) {
      for (let gridX = 0; gridX < arrangement[gridY].length; gridX++) {
        const tileId = arrangement[gridY][gridX];
        const tile = tileMap.get(tileId);

        if (tile) {
          const targetX = gridX * this.tileWidth;
          const targetY = gridY * this.tileHeight;

          // Create a temporary canvas for the tile
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
                reject(new Error(`Failed to load tile image: ${tileId}`));
              };

              tileImg.src = tile.dataUrl;
            });
          }
        }
      }
    }

    return canvas.toDataURL();
  }

  /**
   * Converts the string arrangement back to Tile objects
   */
  private convertArrangementToTiles(
    arrangement: string[][]
  ): (Tile | null)[][] {
    const tileMap = this.createTileMap();

    return arrangement.map((row) =>
      row.map((tileId) => tileMap.get(tileId) || null)
    );
  }

  /**
   * Calculates a compatibility score based on the arrangement
   */
  private calculateCompatibilityScore(arrangement: string[][]): number {
    let compatibleEdges = 0;
    let totalEdges = 0;
    const tileMap = this.createTileMap();

    for (let y = 0; y < arrangement.length; y++) {
      for (let x = 0; x < arrangement[y].length; x++) {
        const currentTileId = arrangement[y][x];
        const currentTile = tileMap.get(currentTileId);

        if (!currentTile) continue;

        // Check all four directions
        const directions = [
          { dx: 0, dy: -1, border: "north" as const },
          { dx: 1, dy: 0, border: "east" as const },
          { dx: 0, dy: 1, border: "south" as const },
          { dx: -1, dy: 0, border: "west" as const },
        ];

        for (const { dx, dy, border } of directions) {
          const nx = x + dx;
          const ny = y + dy;

          if (
            nx >= 0 &&
            nx < arrangement[y].length &&
            ny >= 0 &&
            ny < arrangement.length
          ) {
            const neighborTileId = arrangement[ny][nx];
            const neighborTile = tileMap.get(neighborTileId);

            if (neighborTile) {
              totalEdges++;

              // Check if the tiles are compatible
              const currentBorderIds = Array.from(currentTile.borders[border]);
              const neighborBorderIds = Array.from(
                neighborTile.borders[
                  border === "north"
                    ? "south"
                    : border === "east"
                    ? "west"
                    : border === "south"
                    ? "north"
                    : "east"
                ]
              );

              if (
                currentBorderIds.includes(neighborTileId) ||
                neighborBorderIds.includes(currentTileId)
              ) {
                compatibleEdges++;
              }
            }
          }
        }
      }
    }

    return totalEdges > 0 ? (compatibleEdges / totalEdges) * 100 : 100;
  }

  /**
   * Synthesizes a new image using the Wave Function Collapse algorithm
   * @param targetWidth - Desired width in pixels (must be multiple of tile width)
   * @param targetHeight - Desired height in pixels (must be multiple of tile height)
   * @param seed - Seed for deterministic generation (default: 0)
   * @param onProgress - Optional callback for progress updates (not used in this implementation)
   * @param onAttemptStart - Optional callback for attempt start updates (not used in this implementation)
   * @param onPartialResult - Optional callback for partial results (not used in this implementation)
   * @returns Promise that resolves with the synthesis result
   */
  async synthesize(
    targetWidth: number,
    targetHeight: number,
    seed: number = 0,
    onProgress?: (progress: SynthesisProgress) => void,
    onAttemptStart?: (attemptStart: SynthesisAttemptStart) => void,
    onPartialResult?: (result: SynthesisResult) => void
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

    // Convert tiles to the format expected by the wave function collapse algorithm
    const tileData = this.convertTilesToTileData();

    // Generate the arrangement using wave function collapse
    const arrangement = generateTileArrangement(
      tileData,
      gridWidth,
      gridHeight,
      seed
    );

    if (!arrangement) {
      throw new Error(
        "Failed to generate arrangement using wave function collapse"
      );
    }

    // Calculate compatibility score
    const compatibilityScore = this.calculateCompatibilityScore(arrangement);

    // Convert arrangement to Tile objects
    const tileArrangement = this.convertArrangementToTiles(arrangement);

    // Render to canvas and get data URL
    const dataUrl = await this.renderArrangementToCanvas(
      arrangement,
      targetWidth,
      targetHeight
    );

    return {
      arrangement: tileArrangement,
      compatibilityScore,
      dataUrl,
      isPartial: false,
      attemptNumber: 1,
    };
  }
}
