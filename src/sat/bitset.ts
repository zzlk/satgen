class Bitset {
  private bits: boolean[] = [];

  constructor(maxValue: number) {
    this.bits = new Array(maxValue).fill(false);
  }

  get(index: number): boolean {
    return this.bits[index];
  }

  set(index: number, value: boolean) {
    this.bits[index];
  }
}

export default Bitset;
