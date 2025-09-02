import type Bitset from "./bitset";

export type MappedTile = {
  tileId: string;
  mappedTileId: number;
  borderInfo: [Bitset, Bitset, Bitset, Bitset];
};
