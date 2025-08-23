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

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([new Set(["A", "B"])]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([new Set(["A"])]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(true);
      expect(result.value).toStrictEqual(["A"]);
    }
  });

  test("checkerboard basic test", () => {
    const generator = gen(tiles, 1, 2, 42);

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([
        new Set(["A", "B"]),
        new Set(["A", "B"]),
      ]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([new Set(["A"]), new Set(["B"])]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(true);
      expect(result.value).toStrictEqual(["A", "B"]);
    }
  });

  test("checkerboard basic test", () => {
    const generator = gen(tiles, 2, 2, 42);

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([
        new Set(["A", "B"]),
        new Set(["A", "B"]),
        new Set(["A", "B"]),
        new Set(["A", "B"]),
      ]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(false);
      expect(result.value).toStrictEqual([
        new Set(["A"]),
        new Set(["B"]),
        new Set(["B"]),
        new Set(["A"]),
      ]);
    }

    {
      const result = generator.next();
      expect(result.done).toBe(true);
      expect(result.value).toStrictEqual(["A", "B", "B", "A"]);
    }
  });
});

// AI generated code goes below here
