declare module 'spessasynth_lib' {
  export class Synthetizer {
    constructor(targetNode: AudioNode, soundFontBuffer?: ArrayBuffer | null, enableEventSystem?: boolean);
    loadSoundFont(url: string): Promise<void>;
    destroy(): void;
  }

  interface MidiFile {
    binary: ArrayBuffer;
    altName?: string;
  }

  interface SequencerOptions {
    skipToFirstNoteOn?: boolean;
    autoPlay?: boolean;
    preservePlaybackState?: boolean;
  }

  export class Sequencer {
    constructor(midiBinaries: MidiFile[], synth: Synthetizer, options?: SequencerOptions);
    play(resetTime?: boolean): void;
    pause(): void;
    stop(): void;
    readonly duration: number;
    readonly currentTime: number;
  }

  export const DEFAULT_SYNTH_CONFIG: any;
  export const WORKLET_URL_ABSOLUTE: string;
} 