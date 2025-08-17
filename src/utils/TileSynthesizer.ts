import { Tile } from "./Tile";

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

export class TileSynthesizer {
  private tiles: Tile[];
  private tileWidth: number;
  private tileHeight: number;
  private worker: Worker | null = null;

  constructor(tiles: Tile[]) {
    if (tiles.length === 0) {
      throw new Error("No tiles available for synthesis");
    }
    this.tiles = tiles;
    this.tileWidth = tiles[0].width;
    this.tileHeight = tiles[0].height;
  }

  /**
   * Synthesizes a new image using the Wave Function Collapse algorithm in a web worker
   * @param targetWidth - Desired width in pixels (must be multiple of tile width)
   * @param targetHeight - Desired height in pixels (must be multiple of tile height)
   * @param onProgress - Optional callback for progress updates
   * @param onAttemptStart - Optional callback for attempt start updates
   * @param onPartialResult - Optional callback for partial results from failed attempts
   * @returns Promise that resolves with the synthesis result
   */
  async synthesize(
    targetWidth: number,
    targetHeight: number,
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

    try {
      // Create and start the web worker
      this.worker = new Worker(
        new URL("../workers/tileSynthesisWorker.ts", import.meta.url),
        { type: "module" }
      );

      // Set up message handling
      const result = await this.runWorkerSynthesis(
        targetWidth,
        targetHeight,
        onProgress,
        onAttemptStart,
        onPartialResult
      );

      // Clean up worker
      this.worker.terminate();
      this.worker = null;

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
          const tileId = result.arrangement[gridY][gridX];
          if (tileId) {
            const tile = this.tiles.find((t) => t.id === tileId);
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
      }

      const dataUrl = canvas.toDataURL("image/png");

      console.log(
        `Synthesis completed successfully! Compatibility score: ${result.compatibilityScore}`
      );

      // Convert tile IDs back to Tile objects for the result
      const tileArrangement: (Tile | null)[][] = result.arrangement.map((row) =>
        row.map((tileId) =>
          tileId ? this.tiles.find((t) => t.id === tileId) || null : null
        )
      );

      return {
        arrangement: tileArrangement,
        compatibilityScore: result.compatibilityScore,
        dataUrl: dataUrl,
      };
    } catch (error) {
      // Clean up worker on error
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      console.error("Wave Function Collapse failed:", error);
      throw error;
    }
  }

  /**
   * Runs the synthesis in the web worker and handles communication
   * @param targetWidth - Target width in pixels
   * @param targetHeight - Target height in pixels
   * @param onProgress - Optional progress callback
   * @param onAttemptStart - Optional callback for attempt start
   * @param onPartialResult - Optional callback for partial results
   * @returns Promise that resolves with the worker result
   */
  private runWorkerSynthesis(
    targetWidth: number,
    targetHeight: number,
    onProgress?: (progress: SynthesisProgress) => void,
    onAttemptStart?: (attemptStart: SynthesisAttemptStart) => void,
    onPartialResult?: (result: SynthesisResult) => void
  ): Promise<{ arrangement: string[][]; compatibilityScore: number }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }

      // Prepare tile data for the worker
      const tileData = this.tiles.map((tile) => ({
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

      // Set up message handler
      this.worker.onmessage = (event) => {
        const message = event.data;

        if (message.type === "attempt_start") {
          // Forward attempt start updates to the callback
          if (onAttemptStart) {
            onAttemptStart(message);
          }
          console.log(
            `Starting attempt ${message.attemptNumber}/${message.maxAttempts}`
          );
        } else if (message.type === "progress") {
          // Forward progress updates to the callback
          if (onProgress) {
            onProgress(message);
          }

          // Log progress to console
          if (message.collapsedCell) {
            console.log(
              `Attempt ${message.attemptNumber}: Collapsed cell (${message.collapsedCell.x},${message.collapsedCell.y}) with ${message.collapsedCell.possibilities} possibilities to tile: ${message.collapsedCell.tileId}`
            );
          }

          if (
            message.propagationChanges &&
            message.propagationChanges.length > 0
          ) {
            console.log(
              `Attempt ${message.attemptNumber}: Propagation: ${message.propagationChanges.length} cells updated`
            );
          }

          console.log(
            `Attempt ${message.attemptNumber}: Progress: ${message.totalCollapsed}/${message.totalCells} cells collapsed`
          );
        } else if (message.type === "result") {
          if (message.isPartial && message.arrangement && onPartialResult) {
            // Handle partial result from failed attempt
            const partialResult = this.createPartialResult(
              message.arrangement,
              message.compatibilityScore || 0,
              message.attemptNumber || 0
            );
            onPartialResult(partialResult);
          } else if (
            message.success &&
            message.arrangement &&
            message.compatibilityScore !== undefined
          ) {
            // Final successful result
            resolve({
              arrangement: message.arrangement,
              compatibilityScore: message.compatibilityScore,
            });
          } else {
            reject(new Error(message.error || "Synthesis failed"));
          }
        }
      };

      // Set up error handler
      this.worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send synthesis message to worker
      this.worker.postMessage({
        type: "synthesize",
        tiles: tileData,
        targetWidth,
        targetHeight,
        tileWidth: this.tileWidth,
        tileHeight: this.tileHeight,
      });
    });
  }

  /**
   * Creates a partial result from a failed attempt
   * @param arrangement - The partial arrangement from the worker
   * @param compatibilityScore - The compatibility score
   * @param attemptNumber - The attempt number
   * @returns Partial synthesis result
   */
  private createPartialResult(
    arrangement: string[][],
    compatibilityScore: number,
    attemptNumber: number
  ): SynthesisResult {
    // Convert tile IDs back to Tile objects for the result
    const tileArrangement: (Tile | null)[][] = arrangement.map((row) =>
      row.map((tileId) =>
        tileId ? this.tiles.find((t) => t.id === tileId) || null : null
      )
    );

    return {
      arrangement: tileArrangement,
      compatibilityScore: compatibilityScore,
      dataUrl: "", // Will be generated when needed
      isPartial: true,
      attemptNumber: attemptNumber,
    };
  }
}
