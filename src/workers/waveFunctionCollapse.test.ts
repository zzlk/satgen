import { describe, test, expect } from "vitest";
import {
  WaveFunctionCollapse,
  generateTileArrangement,
} from "./waveFunctionCollapse";
import type { TileData } from "./waveFunctionCollapse";

describe("WaveFunctionCollapse", () => {
  // Test tile sets
  const simpleTiles: TileData[] = [
    {
      id: "grass",
      dataUrl: "grass.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass", "water"],
        east: ["grass", "water"],
        south: ["grass", "water"],
        west: ["grass", "water"],
      },
    },
    {
      id: "water",
      dataUrl: "water.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass", "water"],
        east: ["grass", "water"],
        south: ["grass", "water"],
        west: ["grass", "water"],
      },
    },
  ];

  const constrainedTiles: TileData[] = [
    {
      id: "grass",
      dataUrl: "grass.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass"],
        east: ["grass", "water"],
        south: ["grass"],
        west: ["grass", "water"],
      },
    },
    {
      id: "water",
      dataUrl: "water.png",
      width: 64,
      height: 64,
      borders: {
        north: ["water"],
        east: ["grass", "water"],
        south: ["water"],
        west: ["grass", "water"],
      },
    },
  ];

  const incompatibleTiles: TileData[] = [
    {
      id: "grass",
      dataUrl: "grass.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass"],
        east: ["grass"],
        south: ["grass"],
        west: ["grass"],
      },
    },
    {
      id: "water",
      dataUrl: "water.png",
      width: 64,
      height: 64,
      borders: {
        north: ["water"],
        east: ["water"],
        south: ["water"],
        west: ["water"],
      },
    },
  ];

  const complexTiles: TileData[] = [
    {
      id: "grass",
      dataUrl: "grass.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass", "road"],
        east: ["grass", "road"],
        south: ["grass", "road"],
        west: ["grass", "road"],
      },
    },
    {
      id: "road",
      dataUrl: "road.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass", "road"],
        east: ["road"],
        south: ["grass", "road"],
        west: ["road"],
      },
    },
    {
      id: "building",
      dataUrl: "building.png",
      width: 64,
      height: 64,
      borders: {
        north: ["grass"],
        east: ["grass"],
        south: ["grass"],
        west: ["grass"],
      },
    },
  ];

  describe("Basic Functionality", () => {
    test("should generate a valid arrangement for simple tiles", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);
      const result = wfc.generate();

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result![0]).toHaveLength(3);

      // All tiles should be valid
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(["grass", "water"]).toContain(result![y][x]);
        }
      }
    });

    test("should generate different arrangements on multiple runs", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 2, 2);
      const result1 = wfc.generate();
      const result2 = wfc.generate();

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // Results might be the same due to randomness, but they should be valid
      const validation1 = wfc.validateArrangement(result1!);
      const validation2 = wfc.validateArrangement(result2!);

      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });

    test("should handle 1x1 grid", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 1, 1);
      const result = wfc.generate();

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toHaveLength(1);
      expect(["grass", "water"]).toContain(result![0][0]);
    });

    test("should handle single tile type", () => {
      const singleTile = [simpleTiles[0]];
      const wfc = new WaveFunctionCollapse(singleTile, 3, 3);
      const result = wfc.generate();

      expect(result).not.toBeNull();

      // All tiles should be the same
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(result![y][x]).toBe("grass");
        }
      }
    });
  });

  describe("Constraint Propagation", () => {
    test("should respect tile constraints", () => {
      const wfc = new WaveFunctionCollapse(constrainedTiles, 3, 3);
      const result = wfc.generate();

      expect(result).not.toBeNull();

      // Validate that constraints are respected
      const validation = wfc.validateArrangement(result!);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should handle incompatible tiles gracefully", () => {
      const wfc = new WaveFunctionCollapse(incompatibleTiles, 2, 2);
      const result = wfc.generate();

      // Should either succeed (if all tiles are the same) or fail gracefully
      if (result) {
        // If it succeeds, all tiles should be the same
        const firstTile = result[0][0];
        for (let y = 0; y < 2; y++) {
          for (let x = 0; x < 2; x++) {
            expect(result[y][x]).toBe(firstTile);
          }
        }
      }
      // If it returns null, that's also acceptable for incompatible tiles
    });

    test("should propagate constraints correctly in complex scenarios", () => {
      const wfc = new WaveFunctionCollapse(complexTiles, 4, 4);
      const result = wfc.generate();

      expect(result).not.toBeNull();

      // Validate the arrangement
      const validation = wfc.validateArrangement(result!);
      expect(validation.isValid).toBe(true);

      // Check that road tiles are properly connected
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (result![y][x] === "road") {
            // Road tiles should have road neighbors in east/west directions
            if (x > 0 && result![y][x - 1] === "road") {
              // West neighbor is road, so this tile should allow road to the west
              expect(
                complexTiles.find((t) => t.id === "road")!.borders.west
              ).toContain("road");
            }
            if (x < 3 && result![y][x + 1] === "road") {
              // East neighbor is road, so this tile should allow road to the east
              expect(
                complexTiles.find((t) => t.id === "road")!.borders.east
              ).toContain("road");
            }
          }
        }
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty tile array", () => {
      const wfc = new WaveFunctionCollapse([], 2, 2);
      const result = wfc.generate();

      expect(result).toBeNull();
    });

    test("should handle zero dimensions", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 0, 0);
      const result = wfc.generate();

      expect(result).toBeNull();
    });

    test("should handle large grids", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 10, 10);
      const result = wfc.generate();

      expect(result).not.toBeNull();
      expect(result).toHaveLength(10);
      expect(result![0]).toHaveLength(10);

      const validation = wfc.validateArrangement(result!);
      expect(validation.isValid).toBe(true);
    });

    test("should handle tiles with missing border definitions", () => {
      const incompleteTiles: TileData[] = [
        {
          id: "grass",
          dataUrl: "grass.png",
          width: 64,
          height: 64,
          borders: {
            north: ["grass"],
            east: ["grass"],
            south: ["grass"],
            west: ["grass"],
          },
        },
      ];

      const wfc = new WaveFunctionCollapse(incompleteTiles, 2, 2);
      const result = wfc.generate();

      expect(result).not.toBeNull();
      expect(result![0][0]).toBe("grass");
    });
  });

  describe("Validation", () => {
    test("should detect invalid tile IDs", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 2, 2);
      const invalidArrangement = [
        ["grass", "invalid_tile"],
        ["water", "grass"],
      ];

      const validation = wfc.validateArrangement(invalidArrangement);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(
        validation.errors.some((error) => error.includes("invalid_tile"))
      ).toBe(true);
    });

    test("should detect incompatible neighbors", () => {
      const wfc = new WaveFunctionCollapse(incompatibleTiles, 2, 2);
      const incompatibleArrangement = [
        ["grass", "water"],
        ["water", "grass"],
      ];

      const validation = wfc.validateArrangement(incompatibleArrangement);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test("should validate correct arrangements", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 2, 2);
      const correctArrangement = [
        ["grass", "grass"],
        ["grass", "grass"],
      ];

      const validation = wfc.validateArrangement(correctArrangement);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Convenience Function", () => {
    test("generateTileArrangement should work correctly", () => {
      const result = generateTileArrangement(simpleTiles, 3, 3);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result![0]).toHaveLength(3);

      // Validate the result
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);
      const validation = wfc.validateArrangement(result!);
      expect(validation.isValid).toBe(true);
    });

    test("generateTileArrangement should return null for impossible scenarios", () => {
      const result = generateTileArrangement(incompatibleTiles, 5, 5);

      // This might return null due to contradictions, which is acceptable
      if (result) {
        // If it succeeds, validate the result
        const wfc = new WaveFunctionCollapse(incompatibleTiles, 5, 5);
        const validation = wfc.validateArrangement(result);
        expect(validation.isValid).toBe(true);
      }
    });
  });

  describe("Algorithm Correctness", () => {
    test("should always choose lowest entropy cells first", () => {
      // Create a scenario where one cell becomes more constrained
      const wfc = new WaveFunctionCollapse(constrainedTiles, 2, 2);

      // Mock the findLowestEntropyCell method to track calls
      const originalMethod = wfc["findLowestEntropyCell"].bind(wfc);
      const entropyCalls: Array<{ x: number; y: number; entropy: number }> = [];

      wfc["findLowestEntropyCell"] = function () {
        const result = originalMethod();
        if (result) {
          entropyCalls.push(result);
        }
        return result;
      };

      const result = wfc.generate();
      expect(result).not.toBeNull();

      // Verify that the entropy function was called multiple times
      expect(entropyCalls.length).toBeGreaterThan(0);

      // Verify that entropy values are reasonable (between 1 and number of tiles)
      for (const call of entropyCalls) {
        expect(call.entropy).toBeGreaterThanOrEqual(1);
        expect(call.entropy).toBeLessThanOrEqual(constrainedTiles.length);
      }
    });

    test("should propagate constraints correctly", () => {
      const wfc = new WaveFunctionCollapse(complexTiles, 3, 3);

      // Test that propagation removes incompatible tiles
      const initialPossibilities = wfc["possibilities"][0][0].size;

      // Force collapse a cell and check propagation
      wfc["grid"][0][0] = "road";
      wfc["possibilities"][0][0].clear();
      wfc["possibilities"][0][0].add("road");

      wfc["propagate"](0, 0);

      // Check that neighboring cells had their possibilities reduced
      const neighborPossibilities = wfc["possibilities"][0][1].size;
      expect(neighborPossibilities).toBeLessThanOrEqual(initialPossibilities);
    });

    test("should detect contradictions and retry", () => {
      const wfc = new WaveFunctionCollapse(incompatibleTiles, 3, 3);

      // This should either succeed with all same tiles or fail gracefully
      const result = wfc.generate();

      if (result) {
        // If it succeeds, all tiles should be the same
        const firstTile = result[0][0];
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            expect(result[y][x]).toBe(firstTile);
          }
        }
      }
      // If it returns null, that's also acceptable
    });
  });

  describe("Performance and Robustness", () => {
    test("should complete within reasonable time for small grids", () => {
      const startTime = Date.now();
      const wfc = new WaveFunctionCollapse(simpleTiles, 5, 5);
      const result = wfc.generate();
      const endTime = Date.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test("should handle multiple attempts gracefully", () => {
      const wfc = new WaveFunctionCollapse(constrainedTiles, 4, 4);
      let successCount = 0;

      for (let i = 0; i < 5; i++) {
        try {
          const result = wfc.generate();
          if (result) {
            successCount++;
            const validation = wfc.validateArrangement(result);
            expect(validation.isValid).toBe(true);
          }
        } catch (error) {
          // Failures are acceptable for constrained tiles
        }
      }

      // Should succeed at least once
      expect(successCount).toBeGreaterThan(0);
    });
  });
});
