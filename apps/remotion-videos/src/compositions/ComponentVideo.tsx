import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Caption, RecordingMeta } from "../scenes";
import { Centered, clamp, Stage, TitleCard, token } from "./ui";

export const INTRO_FRAMES = 50;
export const OUTRO_FRAMES = 36;
/** The recording starts this many frames before the intro ends, so the two crossfade. */
const CROSSFADE_FRAMES = 12;

export type ComponentVideoProps = {
  sceneId: string;
  title: string;
  example: string;
  captionsAt: "top" | "bottom";
  recording: RecordingMeta | null;
};

export const ComponentVideo = ({ sceneId, title, example, captionsAt, recording }: ComponentVideoProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!recording) {
    return (
      <Stage>
        <Centered>
          <div style={{ fontSize: 44, color: token("color-on-surface") }}>{title}</div>
          <div style={{ fontSize: 24, color: token("color-on-surface-variant"), marginTop: 16 }}>
            No recording yet. Run: npx nx run remotion-videos:record -- {sceneId}
          </div>
        </Centered>
      </Stage>
    );
  }

  const msToFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const videoStart = INTRO_FRAMES - CROSSFADE_FRAMES;
  // Local frame (inside the video's Sequence) at which the recorded interaction begins.
  const interactionStart = CROSSFADE_FRAMES;
  const outroStart = durationInFrames - OUTRO_FRAMES;

  const introOpacity = interpolate(frame, [INTRO_FRAMES - CROSSFADE_FRAMES, INTRO_FRAMES], [1, 0], clamp);
  const outroOpacity = interpolate(frame, [outroStart - 10, outroStart], [0, 1], clamp);

  return (
    <Stage>
      <Sequence from={videoStart}>
        <OffthreadVideo
          src={staticFile(`recordings/${sceneId}.webm`)}
          trimBefore={msToFrame(recording.startMs) - CROSSFADE_FRAMES}
          muted
        />
        {recording.captions.map((caption) => (
          <CaptionPill
            key={caption.fromMs}
            caption={caption}
            at={captionsAt}
            from={interactionStart + msToFrame(caption.fromMs - recording.startMs)}
            to={interactionStart + msToFrame(caption.toMs - recording.startMs)}
          />
        ))}
      </Sequence>

      <AbsoluteFill style={{ opacity: introOpacity }}>
        <TitleCard title={title} subtitle={example} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: outroOpacity }}>
        <TitleCard title={title} subtitle="PartoBita Design System" />
      </AbsoluteFill>
    </Stage>
  );
};

export const CaptionPill = ({ caption, at, from, to }: { caption: Caption; at: "top" | "bottom"; from: number; to: number }) => {
  const frame = useCurrentFrame();
  const fade = 8;
  const opacity = interpolate(frame, [from, from + fade, to - fade, to], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  if (opacity === 0) return null;

  return (
    <AbsoluteFill
      style={{ justifyContent: at === "top" ? "flex-start" : "flex-end", alignItems: "center", padding: "48px 0" }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${interpolate(opacity, [0, 1], [12, 0])}px)`,
          padding: "14px 28px",
          borderRadius: 999,
          fontSize: 28,
          background: token("color-inverse-surface"),
          color: token("color-inverse-on-surface"),
          boxShadow: token("elevation-level-2"),
        }}
      >
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};
