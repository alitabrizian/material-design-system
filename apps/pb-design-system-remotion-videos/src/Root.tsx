import "../../../libs/design-system/tokens/dist/css/tokens.css";
import "../../../libs/design-system/tokens/dist/css/material-tokens.css";
import { loadFont } from "@remotion/google-fonts/Roboto";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import {
  ComponentVideo,
  INTRO_FRAMES,
  OUTRO_FRAMES,
  type ComponentVideoProps,
} from "./compositions/ComponentVideo";
import { DESIGN_TOKENS_FRAMES, DesignTokens } from "./compositions/DesignTokens";
import { Showreel, showreelFrames, type ShowreelProps } from "./compositions/Showreel";
import { scenes, type RecordingMeta } from "./scenes";

const FPS = 30;

// The typescale token names Roboto first; the render browser has no local Roboto, so load it
// explicitly or the title card and captions fall back to Arial while the recorded UI does not.
loadFont("normal", { weights: ["400", "500"], subsets: ["latin"] });

async function loadRecording(sceneId: string): Promise<RecordingMeta | null> {
  const response = await fetch(staticFile(`recordings/${sceneId}.json`));
  return response.ok ? response.json() : null;
}

/** Sizes each video to its recording; a scene without one renders a short "not recorded" card. */
const calculateMetadata: CalculateMetadataFunction<ComponentVideoProps> = async ({ props }) => {
  const recording = await loadRecording(props.sceneId);
  if (!recording) {
    return { durationInFrames: 3 * FPS, props: { ...props, recording: null } };
  }
  const videoFrames = Math.ceil(((recording.endMs - recording.startMs) / 1000) * FPS);
  return { durationInFrames: INTRO_FRAMES + videoFrames + OUTRO_FRAMES, props: { ...props, recording } };
};

const calculateShowreelMetadata: CalculateMetadataFunction<ShowreelProps> = async ({ props }) => {
  const loaded = await Promise.all(scenes.map(async (scene) => [scene.id, await loadRecording(scene.id)] as const));
  const recordings = Object.fromEntries(loaded);
  return { durationInFrames: showreelFrames(recordings), props: { ...props, recordings } };
};

export const RemotionRoot = () => (
  <>
    <Composition
      id="showreel"
      component={Showreel}
      fps={FPS}
      width={1280}
      height={720}
      durationInFrames={showreelFrames({})}
      defaultProps={{ recordings: {} }}
      calculateMetadata={calculateShowreelMetadata}
    />
    <Composition id="design-tokens" component={DesignTokens} fps={FPS} width={1280} height={720} durationInFrames={DESIGN_TOKENS_FRAMES} />
    {scenes.map((scene) => (
      <Composition
        key={scene.id}
        id={scene.id}
        component={ComponentVideo}
        fps={FPS}
        width={1280}
        height={720}
        durationInFrames={3 * FPS}
        defaultProps={{
          sceneId: scene.id,
          title: scene.title,
          example: scene.example,
          captionsAt: scene.captions ?? "bottom",
          recording: null,
        }}
        calculateMetadata={calculateMetadata}
      />
    ))}
  </>
);
