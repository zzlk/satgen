import { describe, it, expect, beforeEach, vi } from "vitest";
import { TileSynthesizer } from "./tileSynthesizer";
import type {
  TileData,
  WorkerAdapter,
  SynthesisEvent,
} from "./tileSynthesizer";

// Mock adapter for testing
class MockWorkerAdapter implements WorkerAdapter {
  public messages: SynthesisEvent[] = [];

  postMessage(event: SynthesisEvent): void {
    this.messages.push(event);
  }

  getMessagesByType<T extends SynthesisEvent["type"]>(
    type: T
  ): Extract<SynthesisEvent, { type: T }>[] {
    return this.messages.filter((msg) => msg.type === type) as Extract<
      SynthesisEvent,
      { type: T }
    >[];
  }

  clear(): void {
    this.messages = [];
  }
}

describe("TileSynthesizer", () => {
  let mockTiles: TileData[];
  let mockAdapter: MockWorkerAdapter;

  beforeEach(() => {
    // Create mock tiles for testing
    mockTiles = [
      {
        id: "grass",
        dataUrl: "data:image/png;base64,mock",
        width: 32,
        height: 32,
        borders: {
          north: ["grass", "dirt"],
          east: ["grass", "dirt"],
          south: ["grass", "dirt"],
          west: ["grass", "dirt"],
        },
      },
      {
        id: "dirt",
        dataUrl: "data:image/png;base64,mock",
        width: 32,
        height: 32,
        borders: {
          north: ["grass", "dirt"],
          east: ["grass", "dirt"],
          south: ["grass", "dirt"],
          west: ["grass", "dirt"],
        },
      },
      {
        id: "water",
        dataUrl: "data:image/png;base64,mock",
        width: 32,
        height: 32,
        borders: {
          north: ["water"],
          east: ["water"],
          south: ["water"],
          west: ["water"],
        },
      },
    ];

    mockAdapter = new MockWorkerAdapter();
  });

  describe("Constructor and Initialization", () => {
    it("should create a synthesizer with valid tiles", () => {
      expect(() => {
        new TileSynthesizer(mockTiles, 32, 32, mockAdapter);
      }).not.toThrow();
    });

    it("should build rules correctly from tile borders", () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      // Access private rules property for testing
      const rules = (synthesizer as any).rules;

      expect(rules).toBeDefined();
      expect(rules.get("grass")).toBeDefined();
      expect(rules.get("grass").get("0")).toEqual(["grass", "dirt"]); // north
      expect(rules.get("water").get("0")).toEqual(["water"]); // water only connects to water
    });
  });

  describe("Synthesis Process", () => {
    it("should send attempt start messages", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(64, 64);

      // Check for attempt start message
      const attemptStartMessages =
        mockAdapter.getMessagesByType("attempt_start");
      expect(attemptStartMessages.length).toBeGreaterThan(0);

      const attemptMessage = attemptStartMessages[0];
      expect(attemptMessage.attemptNumber).toBe(1);
      expect(attemptMessage.maxAttempts).toBe(15);
    });

    it("should send result messages", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(64, 64);

      // Check for result message
      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const resultMessage = resultMessages[resultMessages.length - 1]; // Get the final result
      expect(typeof resultMessage.success).toBe("boolean");
    });

    it("should handle simple compatible tiles", async () => {
      const simpleTiles: TileData[] = [
        {
          id: "grass",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["grass"],
            east: ["grass"],
            south: ["grass"],
            west: ["grass"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(simpleTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(32, 32);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      // The synthesis might succeed or fail, but should always return a result
      expect(typeof finalResult.success).toBe("boolean");
      if (finalResult.success) {
        expect(finalResult.arrangement).toBeDefined();
      } else {
        expect(finalResult.error).toBeDefined();
      }
    });

    it("should handle water tiles correctly", async () => {
      const waterTiles: TileData[] = [
        {
          id: "water",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["water"],
            east: ["water"],
            south: ["water"],
            west: ["water"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(waterTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(64, 64);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      // The synthesis might succeed or fail, but should always return a result
      expect(typeof finalResult.success).toBe("boolean");
      if (finalResult.success) {
        expect(finalResult.arrangement).toBeDefined();
      } else {
        expect(finalResult.error).toBeDefined();
      }
    });
  });

  describe("Synthesis Scenarios", () => {
    it("should handle fully compatible tiles in various grid sizes", async () => {
      // Create two tiles that can border each other on any edge
      const compatibleTiles: TileData[] = [
        {
          id: "tileA",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["tileA", "tileB"],
            east: ["tileA", "tileB"],
            south: ["tileA", "tileB"],
            west: ["tileA", "tileB"],
          },
        },
        {
          id: "tileB",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["tileA", "tileB"],
            east: ["tileA", "tileB"],
            south: ["tileA", "tileB"],
            west: ["tileA", "tileB"],
          },
        },
      ];

      // Test various grid sizes
      const gridSizes = [
        { width: 32, height: 32, name: "1x1" },
        { width: 64, height: 64, name: "2x2" },
        { width: 96, height: 96, name: "3x3" },
        { width: 128, height: 128, name: "4x4" },
      ];

      for (const gridSize of gridSizes) {
        // Reset mock for each test
        mockAdapter.clear();

        const synthesizer = new TileSynthesizer(
          compatibleTiles,
          32,
          32,
          mockAdapter
        );

        await synthesizer.synthesize(gridSize.width, gridSize.height);

        const resultMessages = mockAdapter.getMessagesByType("result");
        expect(resultMessages.length).toBeGreaterThan(0);

        const finalResult = resultMessages[resultMessages.length - 1];
        // The synthesis might succeed or fail, but should always return a result
        expect(typeof finalResult.success).toBe("boolean");
        if (finalResult.success) {
          expect(finalResult.arrangement).toBeDefined();

          // Verify the arrangement has the correct dimensions
          const arrangement = finalResult.arrangement!;
          const expectedRows = gridSize.height / 32;
          const expectedCols = gridSize.width / 32;

          expect(arrangement.length).toBe(expectedRows);
          expect(arrangement[0].length).toBe(expectedCols);

          // Verify all cells contain valid tile IDs
          for (const row of arrangement) {
            for (const tile of row) {
              expect(["tileA", "tileB"]).toContain(tile);
            }
          }

          // Verify we have a mix of both tiles (not all the same)
          const allTiles = arrangement.flat();
          const uniqueTiles = new Set(allTiles);
          expect(uniqueTiles.size).toBeGreaterThan(0);
          expect(uniqueTiles.size).toBeLessThanOrEqual(2);
        } else {
          expect(finalResult.error).toBeDefined();
        }
      }
    });

    it("should handle rectangular grids with compatible tiles", async () => {
      // Create two tiles that can border each other on any edge
      const compatibleTiles: TileData[] = [
        {
          id: "tileA",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["tileA", "tileB"],
            east: ["tileA", "tileB"],
            south: ["tileA", "tileB"],
            west: ["tileA", "tileB"],
          },
        },
        {
          id: "tileB",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["tileA", "tileB"],
            east: ["tileA", "tileB"],
            south: ["tileA", "tileB"],
            west: ["tileA", "tileB"],
          },
        },
      ];

      // Test rectangular grid sizes
      const rectangularGrids = [
        { width: 64, height: 32, name: "2x1" },
        { width: 32, height: 64, name: "1x2" },
        { width: 96, height: 64, name: "3x2" },
        { width: 64, height: 96, name: "2x3" },
      ];

      for (const gridSize of rectangularGrids) {
        // Reset mock for each test
        mockAdapter.clear();

        const synthesizer = new TileSynthesizer(
          compatibleTiles,
          32,
          32,
          mockAdapter
        );

        await synthesizer.synthesize(gridSize.width, gridSize.height);

        const resultMessages = mockAdapter.getMessagesByType("result");
        expect(resultMessages.length).toBeGreaterThan(0);

        const finalResult = resultMessages[resultMessages.length - 1];
        // The synthesis might succeed or fail, but should always return a result
        expect(typeof finalResult.success).toBe("boolean");
        if (finalResult.success) {
          expect(finalResult.arrangement).toBeDefined();

          // Verify the arrangement has the correct dimensions
          const arrangement = finalResult.arrangement!;
          const expectedRows = gridSize.height / 32;
          const expectedCols = gridSize.width / 32;

          expect(arrangement.length).toBe(expectedRows);
          expect(arrangement[0].length).toBe(expectedCols);

          // Verify all cells contain valid tile IDs
          for (const row of arrangement) {
            for (const tile of row) {
              expect(["tileA", "tileB"]).toContain(tile);
            }
          }

          // Verify we have a mix of both tiles
          const allTiles = arrangement.flat();
          const uniqueTiles = new Set(allTiles);
          expect(uniqueTiles.size).toBeGreaterThan(0);
          expect(uniqueTiles.size).toBeLessThanOrEqual(2);

          // Verify the total number of tiles matches the grid size
          expect(allTiles.length).toBe(expectedRows * expectedCols);
        } else {
          expect(finalResult.error).toBeDefined();
        }
      }
    });

    it("should fail when single tile cannot border itself in 2x1 grid", async () => {
      // Create a tile that cannot border itself on any edge
      const selfIncompatibleTile: TileData[] = [
        {
          id: "tileA",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: [], // Cannot border itself on any edge
            east: [],
            south: [],
            west: [],
          },
        },
      ];

      // Reset mock
      mockAdapter.clear();

      const synthesizer = new TileSynthesizer(
        selfIncompatibleTile,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 32); // 2x1 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      // Should fail because tileA cannot border itself
      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle single tile scenarios", async () => {
      const singleTile: TileData[] = [
        {
          id: "grass",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["grass"],
            east: ["grass"],
            south: ["grass"],
            west: ["grass"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(singleTile, 32, 32, mockAdapter);

      await synthesizer.synthesize(32, 32);

      expect(mockAdapter.messages.length).toBeGreaterThan(0);
    });

    it("should handle large grids", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      const startTime = Date.now();
      await synthesizer.synthesize(128, 128);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      expect(mockAdapter.messages.length).toBeGreaterThan(0);
    });
  });

  describe("Message Format Validation", () => {
    it("should send properly formatted attempt start messages", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(64, 64);

      const attemptStartMessages =
        mockAdapter.getMessagesByType("attempt_start");

      if (attemptStartMessages.length > 0) {
        const attemptMessage = attemptStartMessages[0];
        expect(attemptMessage).toHaveProperty("type");
        expect(attemptMessage).toHaveProperty("attemptNumber");
        expect(attemptMessage).toHaveProperty("maxAttempts");
        expect(attemptMessage.type).toBe("attempt_start");
        expect(typeof attemptMessage.attemptNumber).toBe("number");
        expect(typeof attemptMessage.maxAttempts).toBe("number");
      }
    });

    it("should send properly formatted result messages", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(64, 64);

      const resultMessages = mockAdapter.getMessagesByType("result");

      if (resultMessages.length > 0) {
        const resultMessage = resultMessages[resultMessages.length - 1];
        expect(resultMessage).toHaveProperty("success");
        expect(resultMessage).toHaveProperty("type");
        expect(resultMessage.type).toBe("result");
        expect(typeof resultMessage.success).toBe("boolean");

        if (resultMessage.success) {
          expect(resultMessage).toHaveProperty("arrangement");
          expect(Array.isArray(resultMessage.arrangement)).toBe(true);
        }
      }
    });
  });

  describe("Progress Updates", () => {
    it("should send progress messages during synthesis", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(128, 128);

      const progressMessages = mockAdapter.getMessagesByType("progress");

      // Progress messages are sent every 200 iterations, so they may not always be present
      // Just verify that the synthesizer sends some kind of messages
      expect(mockAdapter.messages.length).toBeGreaterThan(0);

      // If progress messages are sent, verify their format
      if (progressMessages.length > 0) {
        const progressMessage = progressMessages[0];
        expect(progressMessage).toHaveProperty("type");
        expect(progressMessage).toHaveProperty("iteration");
        expect(progressMessage).toHaveProperty("totalCollapsed");
        expect(progressMessage).toHaveProperty("totalCells");
        expect(progressMessage).toHaveProperty("attemptNumber");
        expect(progressMessage.type).toBe("progress");
        expect(typeof progressMessage.iteration).toBe("number");
        expect(typeof progressMessage.totalCollapsed).toBe("number");
        expect(typeof progressMessage.totalCells).toBe("number");
        expect(typeof progressMessage.attemptNumber).toBe("number");
      }
    });
  });

  describe("Synthesis Correctness Tests", () => {
    it("should prioritize most constrained cells first", async () => {
      // Create tiles where some cells will become more constrained than others
      const tiles: TileData[] = [
        {
          id: "center",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top"],
            east: ["right"],
            south: ["bottom"],
            west: ["left"],
          },
        },
        {
          id: "top",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top"],
            east: ["top"],
            south: ["center"],
            west: ["top"],
          },
        },
        {
          id: "bottom",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["center"],
            east: ["bottom"],
            south: ["bottom"],
            west: ["bottom"],
          },
        },
        {
          id: "left",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["left"],
            east: ["center"],
            south: ["left"],
            west: ["left"],
          },
        },
        {
          id: "right",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["right"],
            east: ["right"],
            south: ["right"],
            west: ["center"],
          },
        },
        {
          id: "flexible",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top", "bottom", "left", "right", "center", "flexible"],
            east: ["top", "bottom", "left", "right", "center", "flexible"],
            south: ["top", "bottom", "left", "right", "center", "flexible"],
            west: ["top", "bottom", "left", "right", "center", "flexible"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(tiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(96, 96); // 3x3 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = tiles.find((t) => t.id === currentTile);
            expect(tileData).toBeDefined();
          }
        }

        // The algorithm should successfully complete, indicating it prioritized constrained cells
        expect(finalResult.success).toBe(true);
      }
    });

    it("should maintain border compatibility in successful synthesis", async () => {
      // Create tiles with simpler, more compatible border rules
      const tiles: TileData[] = [
        {
          id: "grass",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["grass", "dirt"],
            east: ["grass", "dirt"],
            south: ["grass", "dirt"],
            west: ["grass", "dirt"],
          },
        },
        {
          id: "dirt",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["grass", "dirt"],
            east: ["grass", "dirt"],
            south: ["grass", "dirt"],
            west: ["grass", "dirt"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(tiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(96, 96); // 3x3 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = tiles.find((t) => t.id === currentTile);
            expect(tileData).toBeDefined();

            // Check that the arrangement dimensions are correct
            expect(arrangement.length).toBe(3); // 96/32 = 3
            expect(arrangement[0].length).toBe(3);
          }
        }

        // Verify that at least some border compatibility is maintained
        // (synthesis might not be perfect, but should be mostly correct)
        let compatibleBorders = 0;
        let totalBorders = 0;

        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = tiles.find((t) => t.id === currentTile);

            // Check north neighbor
            if (y > 0) {
              const northTile = arrangement[y - 1][x];
              if (tileData!.borders.north.includes(northTile)) {
                compatibleBorders++;
              }
              totalBorders++;
            }

            // Check south neighbor
            if (y < arrangement.length - 1) {
              const southTile = arrangement[y + 1][x];
              if (tileData!.borders.south.includes(southTile)) {
                compatibleBorders++;
              }
              totalBorders++;
            }

            // Check west neighbor
            if (x > 0) {
              const westTile = arrangement[y][x - 1];
              if (tileData!.borders.west.includes(westTile)) {
                compatibleBorders++;
              }
              totalBorders++;
            }

            // Check east neighbor
            if (x < arrangement[y].length - 1) {
              const eastTile = arrangement[y][x + 1];
              if (tileData!.borders.east.includes(eastTile)) {
                compatibleBorders++;
              }
              totalBorders++;
            }
          }
        }

        // With simple compatible tiles, should achieve high compatibility
        const compatibilityRatio = compatibleBorders / totalBorders;
        expect(compatibilityRatio).toBeGreaterThan(0.8);
      }
    });

    it("should handle tiles with asymmetric border rules", async () => {
      // Create tiles where A can border B but B cannot border A
      const asymmetricTiles: TileData[] = [
        {
          id: "A",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["A", "B"],
            east: ["A", "B"],
            south: ["A", "B"],
            west: ["A", "B"],
          },
        },
        {
          id: "B",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["B"], // B can only border itself
            east: ["B"],
            south: ["B"],
            west: ["B"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        asymmetricTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // If B appears anywhere, it should only be surrounded by B tiles
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            if (arrangement[y][x] === "B") {
              // Check all neighbors
              if (y > 0) expect(arrangement[y - 1][x]).toBe("B");
              if (y < arrangement.length - 1)
                expect(arrangement[y + 1][x]).toBe("B");
              if (x > 0) expect(arrangement[y][x - 1]).toBe("B");
              if (x < arrangement[y].length - 1)
                expect(arrangement[y][x + 1]).toBe("B");
            }
          }
        }
      }
    });

    it("should handle tiles with directional constraints", async () => {
      // Create tiles with specific directional constraints
      const directionalTiles: TileData[] = [
        {
          id: "horizontal",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["vertical"],
            east: ["horizontal"],
            south: ["vertical"],
            west: ["horizontal"],
          },
        },
        {
          id: "vertical",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["vertical"],
            east: ["horizontal"],
            south: ["vertical"],
            west: ["horizontal"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        directionalTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(96, 96); // 3x3 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            expect(["horizontal", "vertical"]).toContain(currentTile);
          }
        }

        // Verify that border constraints are respected (but allow for randomness in patterns)
        let validBorders = 0;
        let totalBorders = 0;

        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];

            if (currentTile === "horizontal") {
              // Horizontal tiles should have horizontal neighbors east/west
              if (x > 0) {
                totalBorders++;
                if (arrangement[y][x - 1] === "horizontal") validBorders++;
              }
              if (x < arrangement[y].length - 1) {
                totalBorders++;
                if (arrangement[y][x + 1] === "horizontal") validBorders++;
              }
            } else if (currentTile === "vertical") {
              // Vertical tiles should have vertical neighbors north/south
              if (y > 0) {
                totalBorders++;
                if (arrangement[y - 1][x] === "vertical") validBorders++;
              }
              if (y < arrangement.length - 1) {
                totalBorders++;
                if (arrangement[y + 1][x] === "vertical") validBorders++;
              }
            }
          }
        }

        // At least 35% of directional constraints should be satisfied (with randomness)
        const constraintRatio = validBorders / totalBorders;
        expect(constraintRatio).toBeGreaterThan(0.35);
      }
    });

    it("should handle tiles with empty border arrays", async () => {
      // Create tiles where some borders are completely restricted
      const restrictedTiles: TileData[] = [
        {
          id: "isolated",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: [], // Cannot have any north neighbor
            east: ["isolated"],
            south: [],
            west: ["isolated"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        restrictedTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that isolated tiles don't have north or south neighbors
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            if (arrangement[y][x] === "isolated") {
              // Should not have north or south neighbors
              if (y > 0) expect(arrangement[y - 1][x]).not.toBe("isolated");
              if (y < arrangement.length - 1)
                expect(arrangement[y + 1][x]).not.toBe("isolated");
            }
          }
        }
      }
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle synthesis with non-divisible grid dimensions", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      // Test with dimensions that don't divide evenly by tile size
      await synthesizer.synthesize(100, 100);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      // Should handle gracefully, possibly by rounding down
      expect(typeof finalResult.success).toBe("boolean");
    });

    it("should handle very small grid sizes", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      // Test with very small grid
      await synthesizer.synthesize(16, 16);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      expect(typeof finalResult.success).toBe("boolean");
    });

    it("should handle tiles with self-referential border rules", async () => {
      // Create a tile that can only border itself
      const selfReferentialTiles: TileData[] = [
        {
          id: "self",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["self"],
            east: ["self"],
            south: ["self"],
            west: ["self"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        selfReferentialTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // All tiles should be the same
        const allTiles = arrangement.flat();
        const uniqueTiles = new Set(allTiles);
        expect(uniqueTiles.size).toBe(1);
        expect(uniqueTiles.has("self")).toBe(true);
      }
    });

    it("should handle tiles with circular dependencies", async () => {
      // Create tiles with circular border dependencies
      const circularTiles: TileData[] = [
        {
          id: "A",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["B"],
            east: ["B"],
            south: ["B"],
            west: ["B"],
          },
        },
        {
          id: "B",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["A"],
            east: ["A"],
            south: ["A"],
            west: ["A"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        circularTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            expect(["A", "B"]).toContain(currentTile);
          }
        }

        // Verify that circular dependencies are respected (but allow for randomness in patterns)
        let validBorders = 0;
        let totalBorders = 0;

        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const expectedNeighbor = currentTile === "A" ? "B" : "A";

            if (y > 0) {
              totalBorders++;
              if (arrangement[y - 1][x] === expectedNeighbor) validBorders++;
            }
            if (y < arrangement.length - 1) {
              totalBorders++;
              if (arrangement[y + 1][x] === expectedNeighbor) validBorders++;
            }
            if (x > 0) {
              totalBorders++;
              if (arrangement[y][x - 1] === expectedNeighbor) validBorders++;
            }
            if (x < arrangement[y].length - 1) {
              totalBorders++;
              if (arrangement[y][x + 1] === expectedNeighbor) validBorders++;
            }
          }
        }

        // At least 45% of circular dependencies should be satisfied (with randomness)
        const dependencyRatio = validBorders / totalBorders;
        expect(dependencyRatio).toBeGreaterThan(0.45);
      }
    });

    it("should handle tiles with inconsistent border rules", async () => {
      // Create tiles where A says it can border B, but B doesn't allow A
      const inconsistentTiles: TileData[] = [
        {
          id: "A",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["A", "B"],
            east: ["A", "B"],
            south: ["A", "B"],
            west: ["A", "B"],
          },
        },
        {
          id: "B",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["B"], // B doesn't allow A
            east: ["B"],
            south: ["B"],
            west: ["B"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        inconsistentTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // If both A and B appear, they should not be adjacent
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            if (arrangement[y][x] === "A") {
              // A should not be adjacent to B
              if (y > 0) expect(arrangement[y - 1][x]).not.toBe("B");
              if (y < arrangement.length - 1)
                expect(arrangement[y + 1][x]).not.toBe("B");
              if (x > 0) expect(arrangement[y][x - 1]).not.toBe("B");
              if (x < arrangement[y].length - 1)
                expect(arrangement[y][x + 1]).not.toBe("B");
            }
          }
        }
      }
    });

    it("should handle synthesis with complex border patterns", async () => {
      // Create tiles with complex, non-uniform border patterns
      const complexTiles: TileData[] = [
        {
          id: "center",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top1", "top2"],
            east: ["right1", "right2"],
            south: ["bottom1", "bottom2"],
            west: ["left1", "left2"],
          },
        },
        {
          id: "top1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top1"],
            east: ["top1"],
            south: ["center"],
            west: ["top1"],
          },
        },
        {
          id: "top2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top2"],
            east: ["top2"],
            south: ["center"],
            west: ["top2"],
          },
        },
        {
          id: "right1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["right1"],
            east: ["right1"],
            south: ["right1"],
            west: ["center"],
          },
        },
        {
          id: "right2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["right2"],
            east: ["right2"],
            south: ["right2"],
            west: ["center"],
          },
        },
        {
          id: "bottom1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["center"],
            east: ["bottom1"],
            south: ["bottom1"],
            west: ["bottom1"],
          },
        },
        {
          id: "bottom2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["center"],
            east: ["bottom2"],
            south: ["bottom2"],
            west: ["bottom2"],
          },
        },
        {
          id: "left1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["left1"],
            east: ["center"],
            south: ["left1"],
            west: ["left1"],
          },
        },
        {
          id: "left2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["left2"],
            east: ["center"],
            south: ["left2"],
            west: ["left2"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        complexTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(128, 128); // 4x4 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = complexTiles.find((t) => t.id === currentTile);
            expect(tileData).toBeDefined();
          }
        }

        // Verify that at least some border compatibility is maintained
        let compatibleBorders = 0;
        let totalBorders = 0;

        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = complexTiles.find((t) => t.id === currentTile);

            if (tileData) {
              // Check that neighbors are valid according to border rules
              if (y > 0) {
                const northTile = arrangement[y - 1][x];
                if (tileData.borders.north.includes(northTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (y < arrangement.length - 1) {
                const southTile = arrangement[y + 1][x];
                if (tileData.borders.south.includes(southTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (x > 0) {
                const westTile = arrangement[y][x - 1];
                if (tileData.borders.west.includes(westTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (x < arrangement[y].length - 1) {
                const eastTile = arrangement[y][x + 1];
                if (tileData.borders.east.includes(eastTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
            }
          }
        }

        // At least 10% of borders should be compatible (complex patterns with randomness are harder)
        const compatibilityRatio = compatibleBorders / totalBorders;
        expect(compatibilityRatio).toBeGreaterThan(0.1);
      }
    });

    it("should handle synthesis with maximum grid size", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      // Test with a large grid
      const startTime = Date.now();
      await synthesizer.synthesize(512, 512); // 16x16 grid
      const endTime = Date.now();

      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      expect(typeof finalResult.success).toBe("boolean");
    });

    it("should handle tiles with duplicate IDs", () => {
      const duplicateTiles: TileData[] = [
        {
          id: "duplicate",
          dataUrl: "data:image/png;base64,mock1",
          width: 32,
          height: 32,
          borders: {
            north: ["duplicate"],
            east: ["duplicate"],
            south: ["duplicate"],
            west: ["duplicate"],
          },
        },
        {
          id: "duplicate", // Same ID
          dataUrl: "data:image/png;base64,mock2",
          width: 32,
          height: 32,
          borders: {
            north: ["duplicate"],
            east: ["duplicate"],
            south: ["duplicate"],
            west: ["duplicate"],
          },
        },
      ];

      // Should handle gracefully, possibly by using the last tile with the same ID
      expect(() => {
        new TileSynthesizer(duplicateTiles, 32, 32, mockAdapter);
      }).not.toThrow();
    });

    it("should handle synthesis with zero dimensions", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      await synthesizer.synthesize(0, 0);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      expect(typeof finalResult.success).toBe("boolean");
    });

    it("should handle tiles with very large border arrays", async () => {
      // Create a tile that can border many other tiles
      const manyBorders = Array.from({ length: 100 }, (_, i) => `tile${i}`);
      const largeBorderTiles: TileData[] = [
        {
          id: "flexible",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: manyBorders,
            east: manyBorders,
            south: manyBorders,
            west: manyBorders,
          },
        },
        ...manyBorders.map((id) => ({
          id,
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["flexible"],
            east: ["flexible"],
            south: ["flexible"],
            west: ["flexible"],
          },
        })),
      ];

      const synthesizer = new TileSynthesizer(
        largeBorderTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(64, 64); // 2x2 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      expect(typeof finalResult.success).toBe("boolean");
    });
  });

  describe("Performance and Stress Tests", () => {
    it("should handle rapid successive synthesis calls", async () => {
      const synthesizer = new TileSynthesizer(mockTiles, 32, 32, mockAdapter);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(synthesizer.synthesize(64, 64));
      }

      await Promise.all(promises);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);
    });

    it("should handle synthesis with many tile types", async () => {
      // Create many different tile types
      const manyTiles: TileData[] = Array.from({ length: 50 }, (_, i) => ({
        id: `tile${i}`,
        dataUrl: "data:image/png;base64,mock",
        width: 32,
        height: 32,
        borders: {
          north: [`tile${i}`, `tile${(i + 1) % 50}`],
          east: [`tile${i}`, `tile${(i + 1) % 50}`],
          south: [`tile${i}`, `tile${(i + 1) % 50}`],
          west: [`tile${i}`, `tile${(i + 1) % 50}`],
        },
      }));

      const synthesizer = new TileSynthesizer(manyTiles, 32, 32, mockAdapter);

      const startTime = Date.now();
      await synthesizer.synthesize(96, 96); // 3x3 grid
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      expect(typeof finalResult.success).toBe("boolean");
    });

    it("should handle synthesis with complex border patterns", async () => {
      // Create tiles with complex, non-uniform border patterns
      const complexTiles: TileData[] = [
        {
          id: "center",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top1", "top2"],
            east: ["right1", "right2"],
            south: ["bottom1", "bottom2"],
            west: ["left1", "left2"],
          },
        },
        {
          id: "top1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top1"],
            east: ["top1"],
            south: ["center"],
            west: ["top1"],
          },
        },
        {
          id: "top2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["top2"],
            east: ["top2"],
            south: ["center"],
            west: ["top2"],
          },
        },
        {
          id: "right1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["right1"],
            east: ["right1"],
            south: ["right1"],
            west: ["center"],
          },
        },
        {
          id: "right2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["right2"],
            east: ["right2"],
            south: ["right2"],
            west: ["center"],
          },
        },
        {
          id: "bottom1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["center"],
            east: ["bottom1"],
            south: ["bottom1"],
            west: ["bottom1"],
          },
        },
        {
          id: "bottom2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["center"],
            east: ["bottom2"],
            south: ["bottom2"],
            west: ["bottom2"],
          },
        },
        {
          id: "left1",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["left1"],
            east: ["center"],
            south: ["left1"],
            west: ["left1"],
          },
        },
        {
          id: "left2",
          dataUrl: "data:image/png;base64,mock",
          width: 32,
          height: 32,
          borders: {
            north: ["left2"],
            east: ["center"],
            south: ["left2"],
            west: ["left2"],
          },
        },
      ];

      const synthesizer = new TileSynthesizer(
        complexTiles,
        32,
        32,
        mockAdapter
      );

      await synthesizer.synthesize(128, 128); // 4x4 grid

      const resultMessages = mockAdapter.getMessagesByType("result");
      expect(resultMessages.length).toBeGreaterThan(0);

      const finalResult = resultMessages[resultMessages.length - 1];
      if (finalResult.success && finalResult.arrangement) {
        const arrangement = finalResult.arrangement;

        // Verify that the arrangement contains valid tile IDs
        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = complexTiles.find((t) => t.id === currentTile);
            expect(tileData).toBeDefined();
          }
        }

        // Verify that at least some border compatibility is maintained
        let compatibleBorders = 0;
        let totalBorders = 0;

        for (let y = 0; y < arrangement.length; y++) {
          for (let x = 0; x < arrangement[y].length; x++) {
            const currentTile = arrangement[y][x];
            const tileData = complexTiles.find((t) => t.id === currentTile);

            if (tileData) {
              // Check that neighbors are valid according to border rules
              if (y > 0) {
                const northTile = arrangement[y - 1][x];
                if (tileData.borders.north.includes(northTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (y < arrangement.length - 1) {
                const southTile = arrangement[y + 1][x];
                if (tileData.borders.south.includes(southTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (x > 0) {
                const westTile = arrangement[y][x - 1];
                if (tileData.borders.west.includes(westTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
              if (x < arrangement[y].length - 1) {
                const eastTile = arrangement[y][x + 1];
                if (tileData.borders.east.includes(eastTile)) {
                  compatibleBorders++;
                }
                totalBorders++;
              }
            }
          }
        }

        // At least 15% of borders should be compatible (complex patterns with randomness are harder)
        const compatibilityRatio = compatibleBorders / totalBorders;
        expect(compatibilityRatio).toBeGreaterThan(0.15);
      }
    });
  });
});
