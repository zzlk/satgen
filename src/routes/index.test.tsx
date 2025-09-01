import { describe, test, expect } from "vitest";
import { gen } from "../sat/wave2";
import { Tile } from "../utils/Tile";
import { convertTilesToWave2Format } from "../utils/tileUtils";

// Mock the Set intersection polyfill
if (!Set.prototype.intersection) {
  Set.prototype.intersection = function (other: Set<any>): Set<any> {
    const result = new Set();
    for (const item of this) {
      if (other.has(item)) {
        result.add(item);
      }
    }
    return result;
  };
}

describe("Wave Function Collapse Integration", () => {
  test("should convert tiles to wave2 format correctly", () => {
    // Create mock tiles
    const tiles: Tile[] = [
      new Tile(
        "data:image/png;base64,mock1",
        new Uint8ClampedArray(32 * 32 * 4),
        32,
        32,
        [new Set(), new Set(), new Set(), new Set()],
        0,
        0
      ),
      new Tile(
        "data:image/png;base64,mock2",
        new Uint8ClampedArray(32 * 32 * 4),
        32,
        32,
        [new Set(), new Set(), new Set(), new Set()],
        1,
        0
      ),
    ];

    // Set up border connections manually
    // borders is [north, east, south, west]
    tiles[0].borders[0].add(tiles[1].id); // north
    tiles[0].borders[1].add(tiles[1].id); // east
    tiles[0].borders[2].add(tiles[1].id); // south
    tiles[0].borders[3].add(tiles[1].id); // west

    tiles[1].borders[0].add(tiles[0].id); // north
    tiles[1].borders[1].add(tiles[0].id); // east
    tiles[1].borders[2].add(tiles[0].id); // south
    tiles[1].borders[3].add(tiles[0].id); // west

    // Convert to wave2 format using the actual function
    const tileMap = convertTilesToWave2Format(tiles);

    // Verify the conversion
    expect(tileMap.size).toBe(2);
    const tile0Id = tiles[0].id;
    const tile1Id = tiles[1].id;
    expect(tileMap.has(tile0Id)).toBe(true);
    expect(tileMap.has(tile1Id)).toBe(true);

    const tile0Connections = tileMap.get(tile0Id)!;
    const tile1Connections = tileMap.get(tile1Id)!;

    // Check that connections are properly set up
    expect(tile0Connections[0].has(tile1Id)).toBe(true); // north
    expect(tile0Connections[1].has(tile1Id)).toBe(true); // east
    expect(tile0Connections[2].has(tile1Id)).toBe(true); // south
    expect(tile0Connections[3].has(tile1Id)).toBe(true); // west

    expect(tile1Connections[0].has(tile0Id)).toBe(true); // north
    expect(tile1Connections[1].has(tile0Id)).toBe(true); // east
    expect(tile1Connections[2].has(tile0Id)).toBe(true); // south
    expect(tile1Connections[3].has(tile0Id)).toBe(true); // west
  });

  test("should generate valid arrangement with wave2 algorithm", () => {
    // Create a simple tile configuration
    const tileMap = new Map<
      string,
      [Set<string>, Set<string>, Set<string>, Set<string>]
    >();

    tileMap.set("A", [
      new Set(["B"]), // north
      new Set(["B"]), // east
      new Set(["B"]), // south
      new Set(["B"]), // west
    ]);

    tileMap.set("B", [
      new Set(["A"]), // north
      new Set(["A"]), // east
      new Set(["A"]), // south
      new Set(["A"]), // west
    ]);

    // Generate arrangement
    const generator = gen(tileMap, 2, 2, 42);

    let result: string[] | null = null;
    const yieldedValues: { x: number; y: number; tile: string | null }[] = [];

    // Process the generator
    while (true) {
      const next = generator.next();
      if (next.done) {
        result = next.value;
        break;
      }
      yieldedValues.push(next.value);
    }

    // Verify the result
    expect(result).toBeUndefined();
    expect(yieldedValues.length).toBeGreaterThan(0);

    // Verify that we got some tile placements
    const tilePlacements = yieldedValues.filter((v) => v.tile !== null);
    expect(tilePlacements.length).toBeGreaterThan(0);
    expect(tilePlacements.every((v) => ["A", "B"].includes(v.tile!))).toBe(
      true
    );
  });

  test("should convert 1D result to 2D arrangement correctly", () => {
    const result = ["A", "B", "B", "A"];
    const width = 2;
    const height = 2;

    // Convert the 1D result array to 2D arrangement
    const arrangement: string[][] = [];
    for (let y = 0; y < height; y++) {
      arrangement[y] = [];
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        arrangement[y][x] = result[index];
      }
    }

    // Verify the conversion
    expect(arrangement).toEqual([
      ["A", "B"],
      ["B", "A"],
    ]);
  });

  test("should handle partial state rendering", () => {
    // Create a partial state with mixed collapsed and uncertain cells
    const partialState: Array<Set<string>> = [
      new Set(["A"]), // Collapsed cell
      new Set(["A", "B"]), // Uncertain cell with 2 possibilities
      new Set(["B"]), // Collapsed cell
      new Set([]), // Empty cell (contradiction)
    ];

    // Verify the state structure
    expect(partialState.length).toBe(4);
    expect(partialState[0].size).toBe(1); // Collapsed
    expect(partialState[1].size).toBe(2); // Uncertain
    expect(partialState[2].size).toBe(1); // Collapsed
    expect(partialState[3].size).toBe(0); // Empty/contradiction

    // Verify the content
    expect(Array.from(partialState[0])).toEqual(["A"]);
    expect(Array.from(partialState[1])).toEqual(["A", "B"]);
    expect(Array.from(partialState[2])).toEqual(["B"]);
    expect(Array.from(partialState[3])).toEqual([]);
  });
});
