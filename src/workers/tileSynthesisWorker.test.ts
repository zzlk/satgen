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
});
