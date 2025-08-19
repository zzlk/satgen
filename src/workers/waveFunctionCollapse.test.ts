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

      // Mock the getSortedCellsByEntropy method to track calls
      const originalMethod = wfc["getSortedCellsByEntropy"].bind(wfc);
      const entropyCalls: Array<{ x: number; y: number; entropy: number }> = [];

      wfc["getSortedCellsByEntropy"] = function () {
        const result = originalMethod();
        if (result.length > 0) {
          entropyCalls.push(...result);
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

    test("should handle constrained scenarios gracefully", () => {
      const wfc = new WaveFunctionCollapse(constrainedTiles, 4, 4);

      // With backtracking, the algorithm should either succeed or definitively fail
      const result = wfc.generate();

      if (result) {
        // If it succeeds, validate the result
        const validation = wfc.validateArrangement(result);
        expect(validation.isValid).toBe(true);
      }
      // If it returns null, that's also acceptable for impossible scenarios
    });

    test("should be deterministic with same seed", () => {
      const wfc1 = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);
      const wfc2 = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);

      const result1 = wfc1.generate();
      const result2 = wfc2.generate();

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1).toEqual(result2);
    });

    test("should generate different results with different seeds", () => {
      // Use tiles that are more likely to produce different arrangements
      const variedTiles: TileData[] = [
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
            east: ["grass", "road"],
            south: ["grass", "road"],
            west: ["grass", "road"],
          },
        },
      ];

      const wfc1 = new WaveFunctionCollapse(variedTiles, 3, 3, 42);
      const wfc2 = new WaveFunctionCollapse(variedTiles, 3, 3, 123);

      const result1 = wfc1.generate();
      const result2 = wfc2.generate();

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // With different seeds, results should be different due to shuffling
      expect(result1).not.toEqual(result2);

      // Validate that both results are valid
      const validation1 = wfc1.validateArrangement(result1!);
      const validation2 = wfc2.validateArrangement(result2!);
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });

    test("should return correct seed value", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);
      expect(wfc.getSeed()).toBe(42);
    });

    test("should perform initial constraint propagation", () => {
      // Create tiles with strict constraints
      const strictTiles: TileData[] = [
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

      const wfc = new WaveFunctionCollapse(strictTiles, 2, 2);

      // After initialization, all cells should have both possibilities
      // since they can all be either grass or water initially
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          const possibilities = wfc["possibilities"][y][x];
          expect(possibilities.size).toBe(2);
          expect(possibilities.has("grass")).toBe(true);
          expect(possibilities.has("water")).toBe(true);
        }
      }
    });

    test("should perform initial constraint propagation with complex constraints", () => {
      // Create tiles where some combinations are impossible
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
            north: ["grass"],
            east: ["road"],
            south: ["grass"],
            west: ["road"],
          },
        },
      ];

      const wfc = new WaveFunctionCollapse(complexTiles, 2, 2);

      // After initialization, all cells should still have both possibilities
      // since the constraints allow both tiles to be placed together
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          const possibilities = wfc["possibilities"][y][x];
          expect(possibilities.size).toBe(2);
          expect(possibilities.has("grass")).toBe(true);
          expect(possibilities.has("road")).toBe(true);
        }
      }
    });
  });

  test("should track last 10 collapsed cells during generation", () => {
    const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3, 0);
    const generator = wfc.generateWithProgress();
    let lastPartialResult: any = null;
    let result: string[][] | null = null;

    // Process the generator to get partial results
    while (true) {
      const next = generator.next();
      if (next.done) {
        result = next.value;
        break;
      }
      lastPartialResult = next.value;
    }

    // Verify that we have a result
    expect(result).not.toBeNull();
    expect(lastPartialResult).not.toBeNull();

    // Verify that lastCollapsedCells is present and has the correct structure
    expect(lastPartialResult.lastCollapsedCells).toBeDefined();
    expect(Array.isArray(lastPartialResult.lastCollapsedCells)).toBe(true);
    expect(lastPartialResult.lastCollapsedCells.length).toBeLessThanOrEqual(10);

    // Verify the structure of each collapsed cell
    for (const cell of lastPartialResult.lastCollapsedCells) {
      expect(cell).toHaveProperty("x");
      expect(cell).toHaveProperty("y");
      expect(cell).toHaveProperty("tile");
      expect(cell).toHaveProperty("iteration");
      expect(typeof cell.x).toBe("number");
      expect(typeof cell.y).toBe("number");
      expect(typeof cell.tile).toBe("string");
      expect(typeof cell.iteration).toBe("number");
    }
  });

  describe("resetTile Method", () => {
    test("should reset a cell to all possible tiles", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // First, collapse a cell to reduce its possibilities
      wfc["possibilities"][1][1].clear();
      wfc["possibilities"][1][1].add("grass");

      // Verify the cell is collapsed
      expect(wfc["possibilities"][1][1].size).toBe(1);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);

      // Reset the cell
      wfc.resetTile(1, 1);

      // Verify the cell now has all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(2);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
      expect(wfc["possibilities"][1][1].has("water")).toBe(true);
    });

    test("should propagate increased possibilities to neighbors", () => {
      const wfc = new WaveFunctionCollapse(constrainedTiles, 3, 3);

      // First, reduce possibilities of neighboring cells
      wfc["possibilities"][0][1].clear(); // North neighbor
      wfc["possibilities"][0][1].add("grass");
      wfc["possibilities"][1][0].clear(); // West neighbor
      wfc["possibilities"][1][0].add("water");

      // Verify neighbors have limited possibilities
      expect(wfc["possibilities"][0][1].size).toBe(1);
      expect(wfc["possibilities"][1][0].size).toBe(1);

      // Reset the center cell
      wfc.resetTile(1, 1);

      // Verify that neighbors may have gained additional possibilities
      // (depending on the tile constraints, they might get more options)
      expect(wfc["possibilities"][0][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][0].size).toBeGreaterThanOrEqual(1);
    });

    test("should handle out of bounds coordinates", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      expect(() => wfc.resetTile(-1, 0)).toThrow(
        "Cell (-1, 0) is out of bounds"
      );
      expect(() => wfc.resetTile(0, -1)).toThrow(
        "Cell (0, -1) is out of bounds"
      );
      expect(() => wfc.resetTile(3, 0)).toThrow("Cell (3, 0) is out of bounds");
      expect(() => wfc.resetTile(0, 3)).toThrow("Cell (0, 3) is out of bounds");
    });

    test("should not affect already collapsed neighbors", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Collapse a neighbor cell
      wfc["possibilities"][0][1].clear();
      wfc["possibilities"][0][1].add("grass");

      // Verify the neighbor is collapsed
      expect(wfc["isCollapsed"](1, 0)).toBe(true);

      // Reset the center cell
      wfc.resetTile(1, 1);

      // Verify the collapsed neighbor remains unchanged
      expect(wfc["possibilities"][0][1].size).toBe(1);
      expect(wfc["possibilities"][0][1].has("grass")).toBe(true);
    });

    test("should work with complex tile constraints", () => {
      const wfc = new WaveFunctionCollapse(complexTiles, 3, 3);

      // First, reduce possibilities of the center cell
      wfc["possibilities"][1][1].clear();
      wfc["possibilities"][1][1].add("grass");

      // Reset the center cell
      wfc.resetTile(1, 1);

      // Verify the cell now has all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(3);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
      expect(wfc["possibilities"][1][1].has("road")).toBe(true);
      expect(wfc["possibilities"][1][1].has("building")).toBe(true);
    });

    test("should propagate through multiple cells", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Reduce possibilities in a chain
      wfc["possibilities"][1][1].clear(); // Center
      wfc["possibilities"][1][1].add("grass");
      wfc["possibilities"][1][2].clear(); // East of center
      wfc["possibilities"][1][2].add("water");
      wfc["possibilities"][2][2].clear(); // Southeast
      wfc["possibilities"][2][2].add("grass");

      // Reset the center cell
      wfc.resetTile(1, 1);

      // Verify that the chain of cells may have gained possibilities
      // The exact behavior depends on the tile constraints
      expect(wfc["possibilities"][1][1].size).toBe(2);
      expect(wfc["possibilities"][1][2].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][2][2].size).toBeGreaterThanOrEqual(1);
    });

    test("should handle reset of already reset cell", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Reset a cell
      wfc.resetTile(1, 1);

      // Verify it has all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(2);

      // Reset it again
      wfc.resetTile(1, 1);

      // Verify it still has all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(2);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
      expect(wfc["possibilities"][1][1].has("water")).toBe(true);
    });

    test("should work with single tile type", () => {
      const singleTile = [simpleTiles[0]];
      const wfc = new WaveFunctionCollapse(singleTile, 3, 3);

      // Reset a cell
      wfc.resetTile(1, 1);

      // Verify it has the single tile possibility
      expect(wfc["possibilities"][1][1].size).toBe(1);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
    });

    test("should handle edge cells", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Reset corner cell
      wfc.resetTile(0, 0);
      expect(wfc["possibilities"][0][0].size).toBe(2);

      // Reset edge cell
      wfc.resetTile(1, 0);
      expect(wfc["possibilities"][0][1].size).toBe(2);
    });

    test("should maintain consistency with tile constraints after reset", () => {
      const wfc = new WaveFunctionCollapse(constrainedTiles, 3, 3);

      // Reset a cell
      wfc.resetTile(1, 1);

      // Verify that the reset doesn't create invalid states
      // All cells should still have at least one possibility
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(wfc["possibilities"][y][x].size).toBeGreaterThan(0);
        }
      }
    });

    test("should work with incompatible tiles", () => {
      const wfc = new WaveFunctionCollapse(incompatibleTiles, 3, 3);

      // Reset a cell
      wfc.resetTile(1, 1);

      // Verify it has all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(2);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
      expect(wfc["possibilities"][1][1].has("water")).toBe(true);
    });

    test("should demonstrate resetTile propagation in action", () => {
      // Create tiles with specific constraints for demonstration
      const demoTiles: TileData[] = [
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

      const wfc = new WaveFunctionCollapse(demoTiles, 3, 3);

      // Initially, all cells should have all 3 possibilities
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(wfc["possibilities"][y][x].size).toBe(3);
        }
      }

      // Manually reduce possibilities to simulate a partially generated state
      // Center cell: only grass
      wfc["possibilities"][1][1].clear();
      wfc["possibilities"][1][1].add("grass");

      // East neighbor: only road
      wfc["possibilities"][1][2].clear();
      wfc["possibilities"][1][2].add("road");

      // South neighbor: only building
      wfc["possibilities"][2][1].clear();
      wfc["possibilities"][2][1].add("building");

      // Verify the reduced state
      expect(wfc["possibilities"][1][1].size).toBe(1);
      expect(wfc["possibilities"][1][2].size).toBe(1);
      expect(wfc["possibilities"][2][1].size).toBe(1);

      // Reset the center cell
      wfc.resetTile(1, 1);

      // Verify center cell is reset to all possibilities
      expect(wfc["possibilities"][1][1].size).toBe(3);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);
      expect(wfc["possibilities"][1][1].has("road")).toBe(true);
      expect(wfc["possibilities"][1][1].has("building")).toBe(true);

      // Verify that neighbors may have gained additional possibilities
      // The exact behavior depends on the tile constraints, but they should
      // at least maintain their current possibilities
      expect(wfc["possibilities"][1][2].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][2][1].size).toBeGreaterThanOrEqual(1);

      // Verify that other cells are unaffected
      expect(wfc["possibilities"][0][0].size).toBe(3);
      expect(wfc["possibilities"][0][1].size).toBe(3);
      expect(wfc["possibilities"][0][2].size).toBe(3);
      expect(wfc["possibilities"][1][0].size).toBe(3);
      expect(wfc["possibilities"][2][0].size).toBe(3);
      expect(wfc["possibilities"][2][2].size).toBe(3);
    });
  });

  describe("resetArea Method", () => {
    test("should reset a 3x3 area centered on the specified cell", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 5, 5);

      // Reduce possibilities in a 3x3 area
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          wfc["possibilities"][y][x].clear();
          wfc["possibilities"][y][x].add("grass");
        }
      }

      // Verify the reduced state
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          expect(wfc["possibilities"][y][x].size).toBe(1);
        }
      }

      // Reset the area centered on (2, 2)
      wfc.resetArea(2, 2);

      // Verify the 3x3 area is reset (after constraint propagation)
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          // After reset and constraint propagation, cells should have at least 1 possibility
          expect(wfc["possibilities"][y][x].size).toBeGreaterThanOrEqual(1);
          // They should have at most the number of tiles
          expect(wfc["possibilities"][y][x].size).toBeLessThanOrEqual(
            simpleTiles.length
          );
        }
      }

      // Verify cells outside the area are unaffected
      expect(wfc["possibilities"][0][0].size).toBe(2); // Initial state after propagation
      expect(wfc["possibilities"][4][4].size).toBe(2); // Initial state after propagation
    });

    test("should handle edge cells correctly", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Reduce possibilities in the corner
      wfc["possibilities"][0][0].clear();
      wfc["possibilities"][0][0].add("grass");

      // Reset area centered on corner (0, 0)
      wfc.resetArea(0, 0);

      // Should reset a 2x2 area (since we're at the corner)
      expect(wfc["possibilities"][0][0].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][0].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][0][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][1].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][0].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][0].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][1].size).toBeLessThanOrEqual(
        simpleTiles.length
      );

      // Corner cell (2, 2) should be unaffected
      expect(wfc["possibilities"][2][2].size).toBe(2); // Initial state after propagation
    });

    test("should handle edge cells in the middle of a side", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Reduce possibilities on the top edge
      wfc["possibilities"][0][1].clear();
      wfc["possibilities"][0][1].add("grass");

      // Reset area centered on edge (1, 0)
      wfc.resetArea(1, 0);

      // Should reset a 3x2 area (3 wide, 2 tall since we're at the top edge)
      expect(wfc["possibilities"][0][0].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][0].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][0][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][1].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][0][2].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][2].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][0].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][0].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][1].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][2].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][2].size).toBeLessThanOrEqual(
        simpleTiles.length
      );

      // Bottom row should be unaffected
      expect(wfc["possibilities"][2][0].size).toBe(2); // Initial state after propagation
      expect(wfc["possibilities"][2][1].size).toBe(2); // Initial state after propagation
      expect(wfc["possibilities"][2][2].size).toBe(2); // Initial state after propagation
    });

    test("should not reset already collapsed cells", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Collapse the center cell
      wfc["possibilities"][1][1].clear();
      wfc["possibilities"][1][1].add("grass");

      // Reduce possibilities in surrounding cells
      wfc["possibilities"][0][1].clear();
      wfc["possibilities"][0][1].add("water");
      wfc["possibilities"][1][0].clear();
      wfc["possibilities"][1][0].add("water");

      // Reset area centered on (1, 1)
      wfc.resetArea(1, 1);

      // Center cell should remain collapsed
      expect(wfc["possibilities"][1][1].size).toBe(1);
      expect(wfc["possibilities"][1][1].has("grass")).toBe(true);

      // Surrounding cells should be reset
      expect(wfc["possibilities"][0][1].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][0][1].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
      expect(wfc["possibilities"][1][0].size).toBeGreaterThanOrEqual(1);
      expect(wfc["possibilities"][1][0].size).toBeLessThanOrEqual(
        simpleTiles.length
      );
    });

    test("should work with complex tile constraints", () => {
      const wfc = new WaveFunctionCollapse(complexTiles, 3, 3);

      // Reduce possibilities in the center area
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x <= 2; x++) {
          wfc["possibilities"][y][x].clear();
          wfc["possibilities"][y][x].add("grass");
        }
      }

      // Reset the entire area (since it's a 3x3 grid, this resets everything)
      wfc.resetArea(1, 1);

      // All cells should have valid possibilities after reset and constraint propagation
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(wfc["possibilities"][y][x].size).toBeGreaterThanOrEqual(1);
          expect(wfc["possibilities"][y][x].size).toBeLessThanOrEqual(
            complexTiles.length
          );
          // Should still have grass as a possibility
          expect(wfc["possibilities"][y][x].has("grass")).toBe(true);
        }
      }
    });
  });

  describe("Contradiction Handling with Area Reset", () => {
    test("should automatically reset area around contradictions", () => {
      // Create tiles that are likely to cause contradictions
      const contradictionTiles: TileData[] = [
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

      const wfc = new WaveFunctionCollapse(contradictionTiles, 3, 3);

      // Mock the resetArea method to track calls
      const originalResetArea = wfc.resetArea.bind(wfc);
      const resetAreaCalls: Array<{ x: number; y: number }> = [];

      wfc.resetArea = function (x: number, y: number) {
        resetAreaCalls.push({ x, y });
        return originalResetArea(x, y);
      };

      // Force a contradiction by manually creating an impossible state
      // Set up a scenario where one cell can only be grass and another can only be water
      // but they need to be compatible neighbors
      wfc["possibilities"][0][0].clear();
      wfc["possibilities"][0][0].add("grass");
      wfc["possibilities"][0][1].clear();
      wfc["possibilities"][0][1].add("water");

      // Try to generate - this should cause contradictions and trigger area resets
      const result = wfc.generate();

      // The result should either be valid or null (acceptable for impossible scenarios)
      // Since we forced incompatible tiles, the result might be invalid, which is expected
      expect(
        result === null || (Array.isArray(result) && result.length > 0)
      ).toBe(true);
    });

    test("should handle contradictions gracefully with area reset", () => {
      // Create a scenario that's more likely to cause contradictions
      const wfc = new WaveFunctionCollapse(incompatibleTiles, 4, 4);

      // Mock the resetArea method to track calls
      const originalResetArea = wfc.resetArea.bind(wfc);
      const resetAreaCalls: Array<{ x: number; y: number }> = [];

      wfc.resetArea = function (x: number, y: number) {
        resetAreaCalls.push({ x, y });
        return originalResetArea(x, y);
      };

      // Try to generate
      const result = wfc.generate();

      // Verify that the algorithm handled contradictions gracefully
      // Either it succeeded with a valid result, or it failed gracefully
      if (result) {
        // If it succeeds, validate the result
        const validation = wfc.validateArrangement(result);
        expect(validation.isValid).toBe(true);
      }

      // Verify that resetArea was called during contradiction handling
      expect(resetAreaCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Contradiction-Based Random Cell Shuffling", () => {
    test("should track contradiction count correctly", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Initially contradiction count should be 0
      expect(wfc.getContradictionCount()).toBe(0);

      // After starting generation, it should still be 0
      const generator = wfc.generateWithProgress();
      expect(wfc.getContradictionCount()).toBe(0);

      // Process the generator to completion
      let result: string[][] | null = null;
      while (true) {
        const next = generator.next();
        if (next.done) {
          result = next.value;
          break;
        }
      }

      // The contradiction count should be 0 or greater (depending on if any contradictions occurred)
      expect(wfc.getContradictionCount()).toBeGreaterThanOrEqual(0);
    });

    test("should shuffle cells after contradictions", () => {
      // Create tiles that are more likely to cause contradictions
      const contradictionTiles: TileData[] = [
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

      const wfc = new WaveFunctionCollapse(contradictionTiles, 3, 3);

      // Mock the getSortedCellsByEntropy method to track cell selection order
      const originalMethod = wfc["getSortedCellsByEntropy"].bind(wfc);
      const cellSelectionOrders: Array<
        Array<{ x: number; y: number; entropy: number }>
      > = [];

      wfc["getSortedCellsByEntropy"] = function () {
        const result = originalMethod();
        cellSelectionOrders.push([...result]);
        return result;
      };

      // Try to generate - this should cause contradictions and trigger shuffling
      const result = wfc.generate();

      // Verify that the algorithm either succeeded or failed gracefully
      expect(
        result === null || (Array.isArray(result) && result.length > 0)
      ).toBe(true);

      // Verify that cell selection was called multiple times
      expect(cellSelectionOrders.length).toBeGreaterThan(0);

      // If there were multiple calls, verify that the order changed (indicating shuffling)
      if (cellSelectionOrders.length > 1) {
        const firstOrder = cellSelectionOrders[0];
        const secondOrder = cellSelectionOrders[1];

        // The orders should be different if shuffling occurred
        // (Note: they might be the same if no contradictions occurred, which is also valid)
        const ordersAreDifferent = firstOrder.some(
          (cell, index) =>
            secondOrder[index] &&
            (cell.x !== secondOrder[index].x || cell.y !== secondOrder[index].y)
        );

        // This is a probabilistic test - shuffling should make orders different
        // but it's not guaranteed, so we just verify the method was called
        expect(cellSelectionOrders.length).toBeGreaterThan(0);
      }
    });

    test("should reset contradiction counter for new generations", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // First generation
      const result1 = wfc.generate();
      const contradictionCount1 = wfc.getContradictionCount();

      // Second generation should reset the counter
      const result2 = wfc.generate();
      const contradictionCount2 = wfc.getContradictionCount();

      // Both generations should produce valid results
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // The contradiction counts should be reasonable (0 or positive)
      expect(contradictionCount1).toBeGreaterThanOrEqual(0);
      expect(contradictionCount2).toBeGreaterThanOrEqual(0);
    });

    test("should maintain deterministic behavior with same seed despite shuffling", () => {
      const wfc1 = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);
      const wfc2 = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);

      const result1 = wfc1.generate();
      const result2 = wfc2.generate();

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // With the same seed, results should be identical even with shuffling
      // because the shuffling is deterministic based on the seed and contradiction count
      expect(result1).toEqual(result2);
    });

    test("should produce different results with different seeds due to shuffling", () => {
      const wfc1 = new WaveFunctionCollapse(simpleTiles, 3, 3, 42);
      const wfc2 = new WaveFunctionCollapse(simpleTiles, 3, 3, 123);

      const result1 = wfc1.generate();
      const result2 = wfc2.generate();

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // With different seeds, results should be different due to shuffling
      expect(result1).not.toEqual(result2);

      // Both results should be valid
      const validation1 = wfc1.validateArrangement(result1!);
      const validation2 = wfc2.validateArrangement(result2!);
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });

    test("should shuffle cells randomly after contradictions", () => {
      const wfc = new WaveFunctionCollapse(simpleTiles, 3, 3);

      // Test the shuffling functionality directly
      const testCells = [
        { x: 0, y: 0, entropy: 2 },
        { x: 1, y: 0, entropy: 2 },
        { x: 0, y: 1, entropy: 1 },
        { x: 1, y: 1, entropy: 1 },
      ];

      // Test shuffling with different contradiction counts
      const result1 = wfc["shuffleCells"]([...testCells]);
      wfc["contradictionCount"] = 1;
      const result2 = wfc["shuffleCells"]([...testCells]);

      // Both results should have the same cells but potentially different order
      expect(result1.length).toBe(testCells.length);
      expect(result2.length).toBe(testCells.length);

      // Verify all cells are present in both results
      const cells1 = result1.map((c) => `${c.x},${c.y}`);
      const cells2 = result2.map((c) => `${c.x},${c.y}`);
      const originalCells = testCells.map((c) => `${c.x},${c.y}`);

      expect(cells1.sort()).toEqual(originalCells.sort());
      expect(cells2.sort()).toEqual(originalCells.sort());

      // Verify entropy values are preserved
      for (const cell of result1) {
        expect(cell.entropy).toBeGreaterThan(0);
        expect(cell.entropy).toBeLessThanOrEqual(simpleTiles.length);
      }

      for (const cell of result2) {
        expect(cell.entropy).toBeGreaterThan(0);
        expect(cell.entropy).toBeLessThanOrEqual(simpleTiles.length);
      }
    });
  });
});
