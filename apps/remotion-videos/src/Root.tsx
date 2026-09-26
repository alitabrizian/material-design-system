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
import { scenes, type RecordingMeta } from "./scenes";

const FPS = 30;

// The typescale token names Roboto first; the render browser has no local Roboto, so load it
// explicitly or the title card and captions fall back to Arial while the recorded UI does not.
loadFont("normal", { weights: ["400", "500"], subsets: ["latin"] });

/** Sizes each video to its recording; a scene without one renders a short "not recorded" card. */
const calculateMetadata: CalculateMetadataFunction<ComponentVideoProps> = async ({ props }) => {
  const response = await fetch(staticFile(`recordings/${props.sceneId}.json`));
  if (!response.ok) {
    return { durationInFrames: 3 * FPS, props: { ...props, recording: null } };
  }
  const recording: RecordingMeta = await response.json();
  const videoFrames = Math.ceil(((recording.endMs - recording.startMs) / 1000) * FPS);
  return { durationInFrames: INTRO_FRAMES + videoFrames + OUTRO_FRAMES, props: { ...props, recording } };
};

export const RemotionRoot = () => (
  <>
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
