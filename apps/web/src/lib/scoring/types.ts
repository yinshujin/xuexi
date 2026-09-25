/** Word verdict from the pronunciation engine. */
export type WordState = 'ok' | 'miss' | 'wrong';

/** One scored reading of a sentence (0–100 scores), whatever engine produced it. */
export interface ReadingScore {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  /** Engine words with their verdicts (engine tokenisation — align before colouring). */
  words: Array<{ word: string; state: WordState }>;
  /** What the engine heard, for troubleshooting. */
  heard: string;
  /**
   * The engine could not make sense of the recording (noise, silence).
   * Not the child's mistake: never shown as "读错", never a pass.
   */
  unclear?: boolean;
}

/** 讯飞开放平台 语音评测（ISE）credentials, kept on this device only. */
export interface XfyunCredentials {
  appId: string;
  apiKey: string;
  apiSecret: string;
}

export interface ScoringConfig {
  vendor: 'xfyun';
  xfyun: XfyunCredentials;
}
