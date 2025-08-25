import { describe, it, expect, beforeEach } from "vitest";
import Bitset from "./bitset";

describe("Bitset", () => {
  let bitset: Bitset;

  beforeEach(() => {
    bitset = new Bitset(8);
  });

  describe("constructor", () => {
    it("should create a bitset with the specified size", () => {
      const bs = new Bitset(10);
      expect(bs.size()).toBe(10);
      expect(bs.toString()).toBe("0000000000");
    });

    it("should initialize all bits to false", () => {
      expect(bitset.toString()).toBe("00000000");
      expect(bitset.count()).toBe(0);
      expect(bitset.isEmpty()).toBe(true);
    });
  });

  describe("get", () => {
    it("should return false for unset bits", () => {
      expect(bitset.get(0)).toBe(false);
      expect(bitset.get(7)).toBe(false);
    });

    it("should return true for set bits", () => {
      bitset.set(0, true);
      bitset.set(7, true);
      expect(bitset.get(0)).toBe(true);
      expect(bitset.get(7)).toBe(true);
    });

    it("should throw error for out of bounds index", () => {
      expect(() => bitset.get(-1)).toThrow("Index -1 out of bounds");
      expect(() => bitset.get(8)).toThrow("Index 8 out of bounds");
    });
  });

  describe("set", () => {
    it("should set a bit to true", () => {
      bitset.set(0, true);
      expect(bitset.get(0)).toBe(true);
      expect(bitset.toString()).toBe("10000000");
    });

    it("should set a bit to false", () => {
      bitset.set(0, true);
      bitset.set(0, false);
      expect(bitset.get(0)).toBe(false);
      expect(bitset.toString()).toBe("00000000");
    });

    it("should default to true when no value is provided", () => {
      bitset.set(0);
      expect(bitset.get(0)).toBe(true);
    });

    it("should throw error for out of bounds index", () => {
      expect(() => bitset.set(-1, true)).toThrow("Index -1 out of bounds");
      expect(() => bitset.set(8, true)).toThrow("Index 8 out of bounds");
    });
  });

  describe("clear", () => {
    it("should clear all bits", () => {
      bitset.set(0, true);
      bitset.set(1, true);
      bitset.set(7, true);
      expect(bitset.count()).toBe(3);

      bitset.clear();
      expect(bitset.count()).toBe(0);
      expect(bitset.toString()).toBe("00000000");
      expect(bitset.isEmpty()).toBe(true);
    });
  });

  describe("toggle", () => {
    it("should toggle a bit from false to true", () => {
      bitset.toggle(0);
      expect(bitset.get(0)).toBe(true);
    });

    it("should toggle a bit from true to false", () => {
      bitset.set(0, true);
      bitset.toggle(0);
      expect(bitset.get(0)).toBe(false);
    });

    it("should throw error for out of bounds index", () => {
      expect(() => bitset.toggle(-1)).toThrow("Index -1 out of bounds");
      expect(() => bitset.toggle(8)).toThrow("Index 8 out of bounds");
    });
  });

  describe("has", () => {
    it("should return true for set bits", () => {
      bitset.set(0, true);
      expect(bitset.has(0)).toBe(true);
    });

    it("should return false for unset bits", () => {
      expect(bitset.has(0)).toBe(false);
    });
  });

  describe("size", () => {
    it("should return the correct size", () => {
      expect(bitset.size()).toBe(8);

      const bs2 = new Bitset(16);
      expect(bs2.size()).toBe(16);
    });
  });

  describe("count", () => {
    it("should return 0 for empty bitset", () => {
      expect(bitset.count()).toBe(0);
    });

    it("should return correct count for partially filled bitset", () => {
      bitset.set(0, true);
      bitset.set(2, true);
      bitset.set(5, true);
      expect(bitset.count()).toBe(3);
    });

    it("should return size for full bitset", () => {
      for (let i = 0; i < bitset.size(); i++) {
        bitset.set(i, true);
      }
      expect(bitset.count()).toBe(8);
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty bitset", () => {
      expect(bitset.isEmpty()).toBe(true);
    });

    it("should return false for non-empty bitset", () => {
      bitset.set(0, true);
      expect(bitset.isEmpty()).toBe(false);
    });
  });

  describe("isFull", () => {
    it("should return false for empty bitset", () => {
      expect(bitset.isFull()).toBe(false);
    });

    it("should return true for full bitset", () => {
      for (let i = 0; i < bitset.size(); i++) {
        bitset.set(i, true);
      }
      expect(bitset.isFull()).toBe(true);
    });
  });

  describe("toString", () => {
    it("should return correct string representation", () => {
      expect(bitset.toString()).toBe("00000000");

      bitset.set(0, true);
      expect(bitset.toString()).toBe("10000000");

      bitset.set(7, true);
      expect(bitset.toString()).toBe("10000001");

      bitset.set(3, true);
      expect(bitset.toString()).toBe("10010001");
    });
  });

  describe("toArray", () => {
    it("should return correct array representation", () => {
      expect(bitset.toArray()).toEqual([
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ]);

      bitset.set(0, true);
      bitset.set(2, true);
      expect(bitset.toArray()).toEqual([
        true,
        false,
        true,
        false,
        false,
        false,
        false,
        false,
      ]);
    });

    it("should return a copy, not the original array", () => {
      const array = bitset.toArray();
      array[0] = true; // Modify the returned array
      expect(bitset.get(0)).toBe(false); // Original bitset should be unchanged
    });
  });

  describe("union", () => {
    it("should perform union operation correctly", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(8);

      bs1.set(0, true);
      bs1.set(2, true);
      bs2.set(1, true);
      bs2.set(2, true);

      const result = bs1.union(bs2);
      expect(result.toString()).toBe("11100000");
    });

    it("should throw error for different sizes", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(4);
      expect(() => bs1.union(bs2)).toThrow(
        "Bitsets must have the same size for union operation"
      );
    });
  });

  describe("intersection", () => {
    it("should perform intersection operation correctly", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(8);

      bs1.set(0, true);
      bs1.set(2, true);
      bs1.set(4, true);
      bs2.set(1, true);
      bs2.set(2, true);
      bs2.set(4, true);

      const result = bs1.intersection(bs2);
      expect(result.toString()).toBe("00101000");
    });

    it("should throw error for different sizes", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(4);
      expect(() => bs1.intersection(bs2)).toThrow(
        "Bitsets must have the same size for intersection operation"
      );
    });
  });

  describe("difference", () => {
    it("should perform difference operation correctly", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(8);

      bs1.set(0, true);
      bs1.set(2, true);
      bs1.set(4, true);
      bs2.set(1, true);
      bs2.set(2, true);
      bs2.set(4, true);

      const result = bs1.difference(bs2);
      expect(result.toString()).toBe("10000000");
    });

    it("should throw error for different sizes", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(4);
      expect(() => bs1.difference(bs2)).toThrow(
        "Bitsets must have the same size for difference operation"
      );
    });
  });

  describe("equals", () => {
    it("should return true for equal bitsets", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(8);

      bs1.set(0, true);
      bs1.set(2, true);
      bs2.set(0, true);
      bs2.set(2, true);

      expect(bs1.equals(bs2)).toBe(true);
    });

    it("should return false for different bitsets", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(8);

      bs1.set(0, true);
      bs2.set(1, true);

      expect(bs1.equals(bs2)).toBe(false);
    });

    it("should return false for different sizes", () => {
      const bs1 = new Bitset(8);
      const bs2 = new Bitset(4);
      expect(bs1.equals(bs2)).toBe(false);
    });
  });

  describe("clone", () => {
    it("should create an independent copy", () => {
      bitset.set(0, true);
      bitset.set(2, true);

      const clone = bitset.clone();
      expect(clone.equals(bitset)).toBe(true);

      // Modify the original
      bitset.set(1, true);
      expect(clone.equals(bitset)).toBe(false);
      expect(clone.get(1)).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should work with complex operations", () => {
      const bs1 = new Bitset(16);
      const bs2 = new Bitset(16);

      // Set some bits
      for (let i = 0; i < 16; i += 2) {
        bs1.set(i, true);
      }
      for (let i = 1; i < 16; i += 2) {
        bs2.set(i, true);
      }

      expect(bs1.count()).toBe(8);
      expect(bs2.count()).toBe(8);

      // Union should give all bits set
      const union = bs1.union(bs2);
      expect(union.isFull()).toBe(true);
      expect(union.count()).toBe(16);

      // Intersection should be empty
      const intersection = bs1.intersection(bs2);
      expect(intersection.isEmpty()).toBe(true);
      expect(intersection.count()).toBe(0);

      // Difference should be the same as original
      const diff = bs1.difference(bs2);
      expect(diff.equals(bs1)).toBe(true);
    });

    it("should handle edge cases", () => {
      const bs = new Bitset(1);
      expect(bs.size()).toBe(1);
      expect(bs.isEmpty()).toBe(true);

      bs.set(0, true);
      expect(bs.isFull()).toBe(true);
      expect(bs.count()).toBe(1);

      bs.toggle(0);
      expect(bs.isEmpty()).toBe(true);
    });
  });
});
