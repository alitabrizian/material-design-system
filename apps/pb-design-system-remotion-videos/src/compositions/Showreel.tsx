import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { scenes, type RecordingMeta, type Scene } from "../scenes";
import { colorRoles, themes, tokenSheet } from "../tokens";
import { CaptionPill } from "./ComponentVideo";
import { TOKEN_TOUR_FRAMES, TokenTour } from "./DesignTokens";
import { clamp, Fade, Stage, TitleCard, token } from "./ui";

/**
 * The whole design system in one video: title, the token tour, every component's example
 * played full-screen in turn, and a closing card with the counts.
 */

export type ShowreelProps = { recordings: Record<string, RecordingMeta | null> };

const FPS = 30;
const INTRO_FRAMES = 90;
const CHAPTER_FRAMES = 60;
const OUTRO_FRAMES = 150;
/** Each example starts this many frames before its interaction, so the fade-in lands on a still card. */
const LEAD_FRAMES = 12;
/** Size of the recording relative to the frame, and the space kept free for the label. */
const SCREEN_SCALE = 0.86;
const LABEL_BAND = 92;

const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);

const segmentFrames = (recording: RecordingMeta) => LEAD_FRAMES + msToFrame(recording.endMs - recording.startMs);

/** The scenes that have a recording, in catalog order, with their recording. */
const recorded = (recordings: ShowreelProps["recordings"]) =>
  scenes.flatMap((scene) => {
    const recording = recordings[scene.id];
    return recording ? [{ scene, recording }] : [];
  });

/** Total length; the component part depends on the recordings, so Root's calculateMetadata calls this. */
export const showreelFrames = (recordings: ShowreelProps["recordings"]) =>
  INTRO_FRAMES +
  TOKEN_TOUR_FRAMES +
  CHAPTER_FRAMES +
  recorded(recordings).reduce((sum, { recording }) => sum + segmentFrames(recording), 0) +
  OUTRO_FRAMES;

export const Showreel = ({ recordings }: ShowreelProps) => {
  const examples = recorded(recordings);
  return (
    <Stage>
      <Series>
        <Series.Sequence durationInFrames={INTRO_FRAMES} name="intro">
          <Fade frames={INTRO_FRAMES} edge={8}>
            <TitleCard title="PartoBita Design System" subtitle="Design tokens · Themes · Blazor components" />
          </Fade>
        </Series.Sequence>
        <Series.Sequence durationInFrames={TOKEN_TOUR_FRAMES} name="tokens">
          <TokenTour />
        </Series.Sequence>
        <Series.Sequence durationInFrames={CHAPTER_FRAMES} name="components-title">
          <Fade frames={CHAPTER_FRAMES} edge={8}>
            <TitleCard title="Components" subtitle={`${examples.length} Blazor components, recorded from the live demo`} />
          </Fade>
        </Series.Sequence>
        {examples.map(({ scene, recording }, i) => (
          <Series.Sequence key={scene.id} durationInFrames={segmentFrames(recording)} name={scene.id}>
            <Fade frames={segmentFrames(recording)} edge={8}>
              <ComponentExample scene={scene} recording={recording} index={i} total={examples.length} />
            </Fade>
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={OUTRO_FRAMES} name="outro">
          <Fade frames={OUTRO_FRAMES} edge={8}>
            <Stats />
          </Fade>
        </Series.Sequence>
      </Series>
    </Stage>
  );
};

/** One component's recorded example at full size, with its captions and a title label. */
const ComponentExample = ({
  scene,
  recording,
  index,
  total,
}: {
  scene: Scene;
  recording: RecordingMeta;
  index: number;
  total: number;
}) => {
  const captionsAt = scene.captions ?? "bottom";
  // Keep the label clear of the captions: above the recording normally, below it when captions sit on top.
  const labelAt = captionsAt === "top" ? "bottom" : "top";
  const width = 1280 * SCREEN_SCALE;
  const height = 720 * SCREEN_SCALE;
  return (
    <AbsoluteFill>
      {/* The recording's example card fills its frame, so shrink it to leave a band for the label. */}
      <div
        style={{
          position: "absolute",
          width,
          height,
          left: (1280 - width) / 2,
          [labelAt]: LABEL_BAND,
          overflow: "hidden",
          borderRadius: token("shape-corner-large"),
          outline: `1px solid ${token("color-outline-variant")}`,
          boxShadow: token("elevation-level-1"),
        }}
      >
        <OffthreadVideo
          src={staticFile(`recordings/${scene.id}.webm`)}
          trimBefore={Math.max(0, msToFrame(recording.startMs) - LEAD_FRAMES)}
          muted
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {recording.captions.map((caption) => (
        <CaptionPill
          key={caption.fromMs}
          caption={caption}
          at={captionsAt}
          from={LEAD_FRAMES + msToFrame(caption.fromMs - recording.startMs)}
          to={LEAD_FRAMES + msToFrame(caption.toMs - recording.startMs)}
        />
      ))}
      <ExampleLabel title={scene.title} example={scene.example} index={index} total={total} at={labelAt} />
    </AbsoluteFill>
  );
};

const ExampleLabel = ({
  title,
  example,
  index,
  total,
  at,
}: {
  title: string;
  example: string;
  index: number;
  total: number;
  at: "top" | "bottom";
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        left: (1280 * (1 - SCREEN_SCALE)) / 2,
        [at]: 12,
        display: "flex",
        alignItems: "stretch",
        gap: 14,
        padding: "12px 20px 12px 14px",
        borderRadius: token("shape-corner-large"),
        background: token("color-surface-container-highest"),
        boxShadow: token("elevation-level-2"),
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
      }}
    >
      <div style={{ width: 5, borderRadius: 3, background: token("color-primary") }} />
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 26, color: token("color-on-surface") }}>{title}</span>
          <span style={{ fontSize: 16, color: token("color-primary"), fontVariantNumeric: "tabular-nums" }}>
            {index + 1} / {total}
          </span>
        </div>
        <div style={{ fontSize: 17, marginTop: 2, color: token("color-on-surface-variant") }}>{example}</div>
      </div>
    </div>
  );
};

const Stats = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const systemTokens = Object.keys(tokenSheet().root).filter((name) => !name.startsWith("--md-sys-color-")).length;
  const stats = [
    { value: scenes.length, label: "components" },
    { value: themes.length, label: "themes" },
    { value: colorRoles().length, label: "color roles per theme" },
    { value: systemTokens, label: "system tokens" },
  ];

  return (
    <AbsoluteFill style={{ background: token("color-surface-container-low"), alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 72, marginBottom: 72 }}>
        {stats.map(({ value, label }, i) => {
          const count = spring({ frame: frame - 6 - i * 6, fps, config: { damping: 200 }, durationInFrames: 40 });
          return (
            <div key={label} style={{ textAlign: "center", opacity: Math.min(1, count * 2) }}>
              <div style={{ fontSize: 96, color: token("color-primary"), fontVariantNumeric: "tabular-nums" }}>
                {Math.round(value * count)}
              </div>
              <div style={{ fontSize: 22, color: token("color-on-surface-variant") }}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 56, color: token("color-on-surface"), opacity: interpolate(frame, [40, 60], [0, 1], clamp) }}>
        PartoBita Design System
      </div>
    </AbsoluteFill>
  );
};
