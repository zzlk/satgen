class Bitset {
  private bits: Uint32Array;
  private _size: number;

  constructor(maxValue: number) {
    this._size = maxValue;
    // Calculate how many 32-bit integers we need
    const arraySize = Math.ceil(maxValue / 32);
    this.bits = new Uint32Array(arraySize);
  }

  private getBitIndex(index: number): { wordIndex: number; bitOffset: number } {
    if (index < 0 || index >= this._size) {
      throw new Error(
        `Index ${index} out of bounds. Valid range: 0-${this._size - 1}`
      );
    }
    const wordIndex = Math.floor(index / 32);
    const bitOffset = index % 32;
    return { wordIndex, bitOffset };
  }

  get(index: number): boolean {
    const { wordIndex, bitOffset } = this.getBitIndex(index);
    return (this.bits[wordIndex] & (1 << bitOffset)) !== 0;
  }

  set(index: number, value: boolean = true): void {
    const { wordIndex, bitOffset } = this.getBitIndex(index);
    if (value) {
      this.bits[wordIndex] |= 1 << bitOffset;
    } else {
      this.bits[wordIndex] &= ~(1 << bitOffset);
    }
  }

  clear(): void {
    this.bits.fill(0);
  }

  toggle(index: number): void {
    const { wordIndex, bitOffset } = this.getBitIndex(index);
    this.bits[wordIndex] ^= 1 << bitOffset;
  }

  has(index: number): boolean {
    return this.get(index);
  }

  size(): number {
    return this._size;
  }

  count(): number {
    let count = 0;
    for (let i = 0; i < this.bits.length; i++) {
      let word = this.bits[i];
      // Count bits set in this 32-bit word
      while (word !== 0) {
        count += word & 1;
        word >>>= 1;
      }
    }
    return count;
  }

  isEmpty(): boolean {
    return this.count() === 0;
  }

  isFull(): boolean {
    return this.count() === this._size;
  }

  toString(): string {
    let result = "";
    for (let i = 0; i < this._size; i++) {
      result += this.get(i) ? "1" : "0";
    }
    return result;
  }

  toArray(): boolean[] {
    const result = new Array(this._size);
    for (let i = 0; i < this._size; i++) {
      result[i] = this.get(i);
    }
    return result;
  }

  // Set operations
  union(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error("Bitsets must have the same size for union operation");
    }
    const result = new Bitset(this._size);
    for (let i = 0; i < this.bits.length; i++) {
      result.bits[i] = this.bits[i] | other.bits[i];
    }
    return result;
  }

  intersection(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error(
        "Bitsets must have the same size for intersection operation"
      );
    }
    const result = new Bitset(this._size);
    for (let i = 0; i < this.bits.length; i++) {
      result.bits[i] = this.bits[i] & other.bits[i];
    }
    return result;
  }

  difference(other: Bitset): Bitset {
    if (other.size() !== this.size()) {
      throw new Error(
        "Bitsets must have the same size for difference operation"
      );
    }
    const result = new Bitset(this._size);
    for (let i = 0; i < this.bits.length; i++) {
      result.bits[i] = this.bits[i] & ~other.bits[i];
    }
    return result;
  }

  equals(other: Bitset): boolean {
    if (other.size() !== this.size()) {
      return false;
    }
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i] !== other.bits[i]) {
        return false;
      }
    }
    return true;
  }

  clone(): Bitset {
    const result = new Bitset(this._size);
    result.bits.set(this.bits);
    return result;
  }

  // Helper methods for Set-like operations
  isSubsetOf(other: Bitset): boolean {
    if (other.size() !== this.size()) {
      return false;
    }
    for (let i = 0; i < this.bits.length; i++) {
      if ((this.bits[i] & ~other.bits[i]) !== 0) {
        return false;
      }
    }
    return true;
  }

  *keys(): IterableIterator<number> {
    for (let i = 0; i < this._size; i++) {
      if (this.get(i)) {
        yield i;
      }
    }
  }

  getFirstSetBit(): number | null {
    for (let i = 0; i < this._size; i++) {
      if (this.get(i)) {
        return i;
      }
    }
    return null;
  }
}

export default Bitset;
