// Web Worker for Tile Synthesis using Wave Function Collapse with Backtracking
// This runs the synthesis algorithm in a background thread

import { TileSynthesizer } from "./tileSynthesizer";
import type {
  TileData,
  WorkerAdapter,
  SynthesisEvent,
} from "./tileSynthesizer";

interface SynthesisMessage {
  type: "synthesize";
  tiles: TileData[];
  targetWidth: number;
  targetHeight: number;
  tileWidth: number;
  tileHeight: number;
}

type WorkerMessage = SynthesisMessage;

// Web Worker adapter that forwards messages to the main thread
class WebWorkerAdapter implements WorkerAdapter {
  postMessage(event: SynthesisEvent): void {
    self.postMessage(event);
  }
}

// Web Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "synthesize") {
    const adapter = new WebWorkerAdapter();
    const synthesizer = new TileSynthesizer(
      message.tiles,
      message.tileWidth,
      message.tileHeight,
      adapter
    );
    await synthesizer.synthesize(message.targetWidth, message.targetHeight);
  }
};
