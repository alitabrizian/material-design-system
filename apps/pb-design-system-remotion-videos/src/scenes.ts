import manifest from "./scenes.json";

export type Step = {
  action: "click" | "hover" | "type" | "select" | "drag" | "wait";
  caption?: string;
  target?: string;
  text?: string;
  label?: string;
  ms?: number;
  from?: number;
  to?: number;
  position?: { x: number; y: number };
  offset?: { x: number; y: number };
};

export type Scene = {
  id: string;
  title: string;
  route: string;
  example: string;
  /** Overrides the automatic card zoom, e.g. to leave room for a dropdown that opens below. */
  zoom?: number;
  /** Where captions sit; "top" for components whose UI occupies the bottom edge (e.g. a bottom sheet). */
  captions?: "top" | "bottom";
  steps: Step[];
};

export type Caption = { text: string; fromMs: number; toMs: number };

/** Written by scripts/record.mts next to each recording, times relative to the video's start. */
export type RecordingMeta = {
  startMs: number;
  endMs: number;
  captions: Caption[];
};

export const theme: string = manifest.theme;
export const scenes = manifest.scenes as Scene[];
