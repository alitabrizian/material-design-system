import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../scenes";

// All colors and type come from the design tokens (tokens.css / material-tokens.css,
// imported in Root.tsx), so the videos always match the design system's theme.
export const token = (name: string) => `var(--md-sys-${name})`;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Stage = ({ children }: { children: React.ReactNode }) => (
  <AbsoluteFill
    data-theme={theme}
    style={{ background: token("color-background"), fontFamily: token("typescale-font-family") }}
  >
    {children}
  </AbsoluteFill>
);

export const Centered = ({ children }: { children: React.ReactNode }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
    {children}
  </AbsoluteFill>
);

export const TitleCard = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: token("color-surface-container-low") }}>
      <Centered>
        <div style={{ transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`, opacity: enter }}>
          <div
            style={{
              width: 64,
              height: 6,
              margin: "0 auto 32px",
              borderRadius: 3,
              background: token("color-primary"),
            }}
          />
          <div style={{ fontSize: 88, fontWeight: 400, letterSpacing: -1, color: token("color-on-surface") }}>
            {title}
          </div>
          <div style={{ fontSize: 30, marginTop: 12, color: token("color-on-surface-variant") }}>{subtitle}</div>
        </div>
      </Centered>
    </AbsoluteFill>
  );
};

/** Fades its children in over the first frames of the enclosing Sequence and out over the last. */
export const Fade = ({ frames, children, edge = 10 }: { frames: number; children: React.ReactNode; edge?: number }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, edge, frames - edge, frames], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Overline + headline + note, top-left, used by every section page. */
export const SectionHeader = ({ title, note, overline = "Design tokens" }: { title: string; note: string; overline?: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 52,
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [-24, 0])}px)`,
      }}
    >
      <div style={{ fontSize: 18, letterSpacing: 2, textTransform: "uppercase", color: token("color-primary") }}>
        {overline}
      </div>
      <div style={{ fontSize: 48, marginTop: 4, color: token("color-on-surface") }}>{title}</div>
      <div style={{ fontSize: 20, marginTop: 6, color: token("color-on-surface-variant") }}>{note}</div>
    </div>
  );
};
