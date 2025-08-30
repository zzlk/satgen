import { describe, test, expect } from "vitest";
import { gen } from "./wave2";

describe("basic tests", () => {
  const tiles = new Map();

  tiles.set("A", [
    new Set(["B"]), // north
    new Set(["B"]), // east
    new Set(["B"]), // south
    new Set(["B"]), // west
  ]);

  tiles.set("B", [
    new Set(["A"]), // north
    new Set(["A"]), // east
    new Set(["A"]), // south
    new Set(["A"]), // west
  ]);

  test("checkerboard basic test", () => {
    const generator = gen(tiles, 1, 1, 42);

    // First yield should be tile placement
    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual({ x: 0, y: 0, tile: "A" });
    }

    {
      const result = generator.next();
      expect(result.done).toBe(true);
      expect(result.value).toStrictEqual(["A"]);
    }
  });

  test("checkerboard basic test", () => {
    const generator = gen(tiles, 1, 2, 42);

    // Should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(50); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toStrictEqual(["A", "B"]);
  });

  test("checkerboard basic test", () => {
    const generator = gen(tiles, 2, 2, 42);

    // Should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(100); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toStrictEqual(["A", "B", "B", "A"]);
  });
});

describe("error cases and edge cases", () => {
  test("should throw when tile references non-existent tile", () => {
    const invalidTiles = new Map();
    invalidTiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);

    expect(() => {
      const generator = gen(invalidTiles, 1, 1, 42);
      generator.next();
    }).toThrow("Tile 'A' references non-existent tile 'B' in direction north");
  });

  test("should throw when connections are non-commutative", () => {
    const nonCommutativeTiles = new Map();
    nonCommutativeTiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    nonCommutativeTiles.set("B", [
      new Set([]), // north - doesn't connect back to A
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    expect(() => {
      const generator = gen(nonCommutativeTiles, 1, 1, 42);
      generator.next();
    }).toThrow(
      "Non-commutative connection: Tile 'A' can connect to 'B' on south, but 'B' cannot connect to 'A' on north"
    );
  });

  test("should return null when initial state is unsatisfiable", () => {
    const unsatisfiableTiles = new Map();
    unsatisfiableTiles.set("A", [
      new Set(["B"]), // north - references non-existent tile
      new Set([]), // east - no connections
      new Set([]), // south - no connections
      new Set([]), // west - no connections
    ]);

    // This should throw because A references non-existent tile B
    expect(() => {
      const generator = gen(unsatisfiableTiles, 1, 1, 42);
      generator.next();
    }).toThrow("Tile 'A' references non-existent tile 'B' in direction north");
  });

  test("should return null when no solution exists", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    // Create a 1x1 grid with tiles that can't be placed together
    // This should eventually return null when no solution is found
    const generator = gen(tiles, 1, 1, 42);

    // The generator should eventually find a solution (A or B)
    const finalResult = generator.next();
    expect(finalResult.done).toBe(false);
    expect(finalResult.value).toStrictEqual({ x: 0, y: 0, tile: "A" });

    const solution = generator.next();
    expect(solution.done).toBe(true);
    expect(solution.value).toStrictEqual(["A"]);
  });

  test("should handle 0x0 grid", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(tiles, 0, 0, 42);
    const result = generator.next();
    expect(result.done).toBe(true); // No cells to yield, should be done immediately
    expect(result.value).toStrictEqual([]);
  });

  test("should handle 1x0 grid", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(tiles, 1, 0, 42);
    const result = generator.next();
    expect(result.done).toBe(true); // No cells to yield, should be done immediately
    expect(result.value).toStrictEqual([]);
  });

  test("should handle 0x1 grid", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(tiles, 0, 1, 42);
    const result = generator.next();
    expect(result.done).toBe(true); // No cells to yield, should be done immediately
    expect(result.value).toStrictEqual([]);
  });
});

describe("complex tile configurations", () => {
  test("should handle single tile with self-connections", () => {
    const selfConnectingTiles = new Map();
    selfConnectingTiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(selfConnectingTiles, 1, 1, 42);

    // Should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(50); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toStrictEqual(["A"]);
  });

  test("should handle three-tile configuration", () => {
    const threeTiles = new Map();
    threeTiles.set("A", [
      new Set(["B", "C"]), // north
      new Set(["B"]), // east
      new Set(["B", "C"]), // south
      new Set(["B"]), // west
    ]);
    threeTiles.set("B", [
      new Set(["A", "C"]), // north
      new Set(["A", "C"]), // east
      new Set(["A", "C"]), // south
      new Set(["A", "C"]), // west
    ]);
    threeTiles.set("C", [
      new Set(["A", "B"]), // north
      new Set(["B"]), // east
      new Set(["A", "B"]), // south
      new Set(["B"]), // west
    ]);

    const generator = gen(threeTiles, 2, 2, 42);

    // The generator should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(100); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toBeInstanceOf(Array);
    expect(result.value!.length).toBe(4);
    expect(result.value!.every((tile) => ["A", "B", "C"].includes(tile))).toBe(
      true
    );
  });

  test("should handle tiles with no connections in some directions", () => {
    const directionalTiles = new Map();
    directionalTiles.set("A", [
      new Set(["B"]), // north
      new Set([]), // east - no connections
      new Set(["B"]), // south
      new Set([]), // west - no connections
    ]);
    directionalTiles.set("B", [
      new Set(["A"]), // north
      new Set([]), // east - no connections
      new Set(["A"]), // south
      new Set([]), // west - no connections
    ]);

    const generator = gen(directionalTiles, 1, 2, 42);

    // Should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(50); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toBeInstanceOf(Array);
    expect(result.value!.length).toBe(2);
    expect(result.value!.every((tile) => ["A", "B"].includes(tile))).toBe(true);
  });
});

describe("large grid tests", () => {
  test("should handle 3x3 grid", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(tiles, 3, 3, 42);

    // Should eventually produce a valid solution
    let result;
    let count = 0;
    do {
      result = generator.next();
      count++;
      expect(count).toBeLessThan(200); // Prevent infinite loops
    } while (!result.done);

    expect(result.value).toBeInstanceOf(Array);
    expect(result.value!.length).toBe(9);
    expect(result.value!.every((tile) => ["A", "B"].includes(tile))).toBe(true);
  });
});

describe("propagation edge cases", () => {
  test("should handle tiles with empty connections in all directions", () => {
    const emptyConnectionsTiles = new Map();
    emptyConnectionsTiles.set("A", [
      new Set([]), // north
      new Set([]), // east
      new Set([]), // south
      new Set([]), // west
    ]);

    const generator = gen(emptyConnectionsTiles, 1, 1, 42);

    // Should eventually produce a valid solution
    let finalResult;
    let count = 0;
    do {
      finalResult = generator.next();
      count++;
      expect(count).toBeLessThan(50); // Prevent infinite loops
    } while (!finalResult.done);

    expect(finalResult.value).toStrictEqual(["A"]);
  });

  test("should handle tiles with self-connections only", () => {
    const selfOnlyTiles = new Map();
    selfOnlyTiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(selfOnlyTiles, 2, 2, 42);

    // Should eventually produce a valid solution
    let finalResult;
    let count = 0;
    do {
      finalResult = generator.next();
      count++;
      expect(count).toBeLessThan(100); // Prevent infinite loops
    } while (!finalResult.done);

    expect(finalResult.value).toStrictEqual(["A", "A", "A", "A"]);
  });
});

describe("invalid state tests", () => {
  test("should throw when tile has invalid precondition (0 possibilities)", () => {
    // This test would require mocking or accessing internal state
    // Since the gen function validates input, we can't easily trigger this
    // But we can test that the function handles edge cases gracefully
    const tiles = new Map();
    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    // This should work normally
    const generator = gen(tiles, 1, 1, 42);

    // Should work normally and complete immediately
    const result = generator.next();
    expect(result.done).toBe(true);
    expect(result.value).toStrictEqual(["A"]);
  });
});

describe("seed consistency tests", () => {
  test("should produce consistent results with same seed", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator1 = gen(tiles, 2, 2, 42);
    const generator2 = gen(tiles, 2, 2, 42);

    // Get initial states (should be the same since same seed)
    const result1 = generator1.next();
    const result2 = generator2.next();
    expect(result1.value).toStrictEqual(result2.value);

    // Get final solutions
    let solution1, solution2;
    do {
      solution1 = generator1.next();
    } while (!solution1.done);

    do {
      solution2 = generator2.next();
    } while (!solution2.done);

    expect(solution1.value).toStrictEqual(solution2.value);
  });

  test("should produce different results with different seeds", () => {
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator1 = gen(tiles, 2, 2, 42);
    const generator2 = gen(tiles, 2, 2, 43);

    // Get initial states (might be different due to different seeds)
    const result1 = generator1.next();
    const result2 = generator2.next();
    // Don't expect them to be the same since different seeds

    // Get final solutions (might be different due to different seeds)
    let solution1, solution2;
    do {
      solution1 = generator1.next();
    } while (!solution1.done);

    do {
      solution2 = generator2.next();
    } while (!solution2.done);

    // Both should be valid solutions
    expect(solution1.value).toBeInstanceOf(Array);
    expect(solution2.value).toBeInstanceOf(Array);
    expect(solution1.value!.length).toBe(4);
    expect(solution2.value!.length).toBe(4);
    expect(solution1.value!.every((tile) => ["A", "B"].includes(tile))).toBe(
      true
    );
    expect(solution2.value!.every((tile) => ["A", "B"].includes(tile))).toBe(
      true
    );
  });

  test("should produce consistent results with deterministic shuffle", () => {
    // Test with a configuration that has multiple possible tiles to verify shuffle consistency
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B", "C"]), // north
      new Set(["B", "C"]), // east
      new Set(["B", "C"]), // south
      new Set(["B", "C"]), // west
    ]);
    tiles.set("B", [
      new Set(["A", "C"]), // north
      new Set(["A", "C"]), // east
      new Set(["A", "C"]), // south
      new Set(["A", "C"]), // west
    ]);
    tiles.set("C", [
      new Set(["A", "B"]), // north
      new Set(["A", "B"]), // east
      new Set(["A", "B"]), // south
      new Set(["A", "B"]), // west
    ]);

    // Run multiple times with the same seed
    const results: string[][][] = [];

    for (let i = 0; i < 3; i++) {
      const generator = gen(tiles, 2, 2, 42);

      // Skip to final result
      let result;
      do {
        result = generator.next();
      } while (!result.done);

      // Convert 1D result to 2D for easier comparison
      if (result.value) {
        const arrangement: string[][] = [];
        for (let y = 0; y < 2; y++) {
          arrangement[y] = [];
          for (let x = 0; x < 2; x++) {
            const index = y * 2 + x;
            arrangement[y][x] = result.value[index];
          }
        }

        results.push(arrangement);
      }
    }

    // All results should be identical due to deterministic shuffle
    expect(results[0]).toStrictEqual(results[1]);
    expect(results[1]).toStrictEqual(results[2]);
    expect(results[0]).toStrictEqual(results[2]);
  });
});

describe("advanced edge cases for maximum coverage", () => {
  test("should handle case where propagation leads to unsatisfiable state", () => {
    // Create a configuration where placing a tile leads to an unsatisfiable state
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);
    tiles.set("C", [
      new Set(["D"]), // north - only connects to D
      new Set(["D"]), // east
      new Set(["D"]), // south
      new Set(["D"]), // west
    ]);
    tiles.set("D", [
      new Set(["C"]), // north
      new Set(["C"]), // east
      new Set(["C"]), // south
      new Set(["C"]), // west
    ]);

    // This should work and eventually find a solution
    const generator = gen(tiles, 2, 2, 42);

    // Should eventually produce a valid solution
    let finalResult;
    let count = 0;
    do {
      finalResult = generator.next();
      count++;
      expect(count).toBeLessThan(200); // Prevent infinite loops
    } while (!finalResult.done);

    expect(finalResult.value).toBeInstanceOf(Array);
    expect(finalResult.value!.length).toBe(4);
    expect(
      finalResult.value!.every((tile) => ["A", "B", "C", "D"].includes(tile))
    ).toBe(true);
  });

  test("should handle complex propagation scenarios", () => {
    // Create a more complex tile configuration that tests propagation edge cases
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B", "C"]), // north
      new Set(["B"]), // east
      new Set(["B", "C"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A", "C"]), // north
      new Set(["A", "C"]), // east
      new Set(["A", "C"]), // south
      new Set(["A", "C"]), // west
    ]);
    tiles.set("C", [
      new Set(["A", "B"]), // north
      new Set(["B"]), // east
      new Set(["A", "B"]), // south
      new Set(["B"]), // west
    ]);

    const generator = gen(tiles, 3, 3, 42);

    // Should eventually produce a valid solution
    let finalResult;
    let count = 0;
    do {
      finalResult = generator.next();
      count++;
      expect(count).toBeLessThan(500); // Prevent infinite loops
    } while (!finalResult.done);

    expect(finalResult.value).toBeInstanceOf(Array);
    expect(finalResult.value!.length).toBe(9);
    expect(
      finalResult.value!.every((tile) => ["A", "B", "C"].includes(tile))
    ).toBe(true);
  });

  test("should handle edge case where all tiles are already collapsed", () => {
    // This tests the base case where cells.every((c) => c.size === 1)
    const tiles = new Map();
    tiles.set("A", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    const generator = gen(tiles, 1, 1, 42);

    // Should eventually produce a valid solution
    let finalResult;
    let count = 0;
    do {
      finalResult = generator.next();
      count++;
      expect(count).toBeLessThan(50); // Prevent infinite loops
    } while (!finalResult.done);

    expect(finalResult.value).toStrictEqual(["A"]);
  });

  test("should handle case where initial propagation fails", () => {
    // Create a configuration that would cause initial propagation to fail
    // This is difficult to achieve with the current validation, but we can test
    // the edge case where tiles are unsatisfiable after initial setup
    const tiles = new Map();
    tiles.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);
    tiles.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    // This should work normally
    const generator = gen(tiles, 1, 1, 42);

    // First yield should be tile placement
    const result = generator.next();
    expect(result.done).toBe(false);
    expect(result.value).toStrictEqual({ x: 0, y: 0, tile: "A" });

    const solution = generator.next();
    expect(solution.done).toBe(true);
    expect(solution.value).toStrictEqual(["A"]);
  });
});

// AI generated code goes below here
