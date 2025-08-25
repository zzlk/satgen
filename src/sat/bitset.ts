class Bitset {
  private bits: boolean[] = [];

  constructor(maxValue: number) {
    this.bits = new Array(maxValue).fill(false);
  }

  get(index: number): boolean {
    if (index < 0 || index >= this.bits.length) {
      throw new Error(
        `Index ${index} out of bounds. Valid range: 0-${this.bits.length - 1}`
      );
    }
    return this.bits[index];
  }

  set(index: number, value: boolean = true): void {
    if (index < 0 || index >= this.bits.length) {
      throw new Error(
        `Index ${index} out of bounds. Valid range: 0-${this.bits.length - 1}`
      );
    }
    this.bits[index] = value;
  }

  clear(): void {
    this.bits.fill(false);
  }

  toggle(index: number): void {
    if (index < 0 || index >= this.bits.length) {
      throw new Error(
        `Index ${index} out of bounds. Valid range: 0-${this.bits.length - 1}`
      );
    }
    this.bits[index] = !this.bits[index];
  }

  has(index: number): boolean {
    return this.get(index);
  }

  size(): number {
    return this.bits.length;
  }

  count(): number {
    return this.bits.filter((bit) => bit).length;
  }

  isEmpty(): boolean {
    return this.count() === 0;
  }

  isFull(): boolean {
    return this.count() === this.bits.length;
  }

  toString(): string {
    return this.bits.map((bit) => (bit ? "1" : "0")).join("");
  }

  toArray(): boolean[] {
    return [...this.bits];
  }

  // Set operations
  union(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error("Bitsets must have the same size for union operation");
    }
    const result = new Bitset(this.size());
    for (let i = 0; i < this.size(); i++) {
      result.set(i, this.get(i) || other.get(i));
    }
    return result;
  }

  intersection(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error(
        "Bitsets must have the same size for intersection operation"
      );
    }
    const result = new Bitset(this.size());
    for (let i = 0; i < this.size(); i++) {
      result.set(i, this.get(i) && other.get(i));
    }
    return result;
  }

  difference(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error(
        "Bitsets must have the same size for difference operation"
      );
    }
    const result = new Bitset(this.size());
    for (let i = 0; i < this.size(); i++) {
      result.set(i, this.get(i) && !other.get(i));
    }
    return result;
  }

  equals(other: Bitset): boolean {
    if (other.size() !== this.size()) {
      return false;
    }
    for (let i = 0; i < this.size(); i++) {
      if (this.get(i) !== other.get(i)) {
        return false;
      }
    }
    return true;
  }

  clone(): Bitset {
    const result = new Bitset(this.size());
    for (let i = 0; i < this.size(); i++) {
      result.set(i, this.get(i));
    }
    return result;
  }
}

export default Bitset;
