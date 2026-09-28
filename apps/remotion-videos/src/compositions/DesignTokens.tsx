import { AbsoluteFill, Easing, interpolate, Series, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  colorRoles,
  easingOf,
  mixShadow,
  px,
  sys,
  sysGroup,
  themes,
  titleCase,
  tokenSheet,
  type ThemeMeta,
} from "../tokens";
import { clamp, Fade, SectionHeader, Stage, TitleCard, token } from "./ui";

/**
 * An animated tour of libs/design-system/tokens: themes, color roles, typescale, shape,
 * elevation, motion, spacing and state layers. Every value is read from the built tokens.css at
 * render time (see ../tokens.ts), so the video follows the tokens package without edits here.
 */

const LEFT = 72;
const TOP = 210;
const WIDTH = 1280 - 2 * LEFT;

const usePop = (delay: number, damping = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};

// ---- Themes ---------------------------------------------------------------------------------

const ThemeCard = ({ theme, index }: { theme: ThemeMeta; index: number }) => {
  const enter = usePop(12 + index * 8);
  const swatch = (role: string, i: number) => (
    <SwatchDot key={role} role={role} delay={30 + index * 8 + i * 5} />
  );

  return (
    <div
      data-theme={theme.id}
      style={{
        flex: 1,
        height: 420,
        padding: 28,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        borderRadius: token("shape-corner-extra-large"),
        background: token("color-surface-container"),
        color: token("color-on-surface"),
        boxShadow: token("elevation-level-2"),
        opacity: enter,
        transform: `translateY(${(1 - enter) * 80}px)`,
      }}
    >
      <div>
        <div style={{ fontSize: 25, whiteSpace: "nowrap" }}>{theme.name}</div>
        <div style={{ fontSize: 16, marginTop: 4, color: token("color-on-surface-variant") }}>{theme.mode} theme</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>{["primary", "secondary", "tertiary"].map(swatch)}</div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <Pill bg="color-primary" fg="color-on-primary">Filled</Pill>
        <Pill bg="color-secondary-container" fg="color-on-secondary-container">Tonal</Pill>
        <Pill bg="transparent" fg="color-primary" border>
          Outlined
        </Pill>
      </div>
    </div>
  );
};

const SwatchDot = ({ role, delay }: { role: string; delay: number }) => {
  const pop = usePop(delay, 10);
  return (
    <div style={{ textAlign: "center", fontSize: 13, color: token("color-on-surface-variant") }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: token("shape-corner-full"),
          background: token(`color-${role}`),
          transform: `scale(${pop})`,
          marginBottom: 6,
        }}
      />
      {role}
    </div>
  );
};

const Pill = ({ bg, fg, border, children }: { bg: string; fg: string; border?: boolean; children: React.ReactNode }) => (
  <div
    style={{
      padding: "10px 24px",
      fontSize: 18,
      fontWeight: 500,
      borderRadius: token("shape-corner-full"),
      background: bg === "transparent" ? bg : token(bg),
      color: token(fg),
      border: border ? `1px solid ${token("color-outline")}` : "1px solid transparent",
    }}
  >
    {children}
  </div>
);

const ThemesSection = () => (
  <AbsoluteFill>
    <SectionHeader title="Themes" note={`${themes.length} prebuilt Material 3 themes, each scoped by a data-theme attribute`} />
    <div style={{ position: "absolute", left: LEFT, top: TOP, width: WIDTH, display: "flex", gap: 24 }}>
      {themes.map((theme, i) => (
        <ThemeCard key={theme.id} theme={theme} index={i} />
      ))}
    </div>
  </AbsoluteFill>
);

// ---- Color roles ----------------------------------------------------------------------------

const COLOR_BUILD = 60;
const COLOR_PER_THEME = 48;
const COLOR_REVEAL = 22;

const KEY_GROUPS = ["primary", "secondary", "tertiary", "error"];
const SURFACES = [
  "surface-dim",
  "surface",
  "surface-bright",
  "surface-container-lowest",
  "surface-container-low",
  "surface-container",
  "surface-container-high",
  "surface-container-highest",
];
const ACCENTS: [role: string, on: string][] = [
  ["on-surface", "surface"],
  ["on-surface-variant", "surface"],
  ["outline", "surface"],
  ["outline-variant", "on-surface"],
  ["inverse-surface", "inverse-on-surface"],
  ["inverse-on-surface", "inverse-surface"],
  ["inverse-primary", "on-primary-container"],
];

/** A swatch filled with the role, labelled in its paired "on" color. */
const RoleTile = ({ role, on, height, delay, build }: { role: string; on: string; height: number; delay: number; build: number }) => {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: build - delay, fps, config: { damping: 18, stiffness: 160 } });
  return (
    <div
      style={{
        flex: "1 1 0",
        height,
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        fontSize: height > 50 ? 16 : 13,
        lineHeight: 1.25,
        overflow: "hidden",
        background: token(`color-${role}`),
        color: token(`color-${on}`),
        opacity: pop,
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
      }}
    >
      {titleCase(role)}
    </div>
  );
};

const ColorBoard = ({ theme, build }: { theme: ThemeMeta; build: number }) => {
  const roles = new Set(colorRoles(theme.id));
  const has = (role: string) => roles.has(role);
  let tile = 0;
  const next = () => tile++ * 1.5;

  return (
    <AbsoluteFill data-theme={theme.id} style={{ background: token("color-background") }}>
      <SectionHeader title="Color roles" note={`${roles.size} roles per theme · showing ${theme.name} (${theme.mode})`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP, width: WIDTH, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 16 }}>
          {KEY_GROUPS.filter(has).map((key) => (
            <div key={key} style={{ flex: 1, display: "grid", borderRadius: 16, overflow: "hidden" }}>
              <RoleTile role={key} on={`on-${key}`} height={72} delay={next()} build={build} />
              <RoleTile role={`on-${key}`} on={key} height={36} delay={next()} build={build} />
              <RoleTile role={`${key}-container`} on={`on-${key}-container`} height={72} delay={next()} build={build} />
              <RoleTile role={`on-${key}-container`} on={`${key}-container`} height={36} delay={next()} build={build} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", borderRadius: 16, overflow: "hidden", outline: `1px solid ${token("color-outline-variant")}` }}>
          {SURFACES.filter(has).map((role) => (
            <RoleTile key={role} role={role} on="on-surface" height={96} delay={next()} build={build} />
          ))}
        </div>
        <div style={{ display: "flex", borderRadius: 16, overflow: "hidden" }}>
          {ACCENTS.filter(([role]) => has(role)).map(([role, on]) => (
            <RoleTile key={role} role={role} on={on} height={56} delay={next()} build={build} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Builds the board in the first theme, then wipes through the others with a circular reveal. */
const ColorsSection = () => {
  const frame = useCurrentFrame();
  const current = frame < COLOR_BUILD ? 0 : Math.min(themes.length - 1, Math.floor((frame - COLOR_BUILD) / COLOR_PER_THEME) + 1);
  const revealStart = COLOR_BUILD + (current - 1) * COLOR_PER_THEME;
  const reveal = interpolate(frame, [revealStart, revealStart + COLOR_REVEAL], [0, 1], {
    ...clamp,
    easing: easingOf(sys("motion-easing-emphasized-decelerate")),
  });

  return (
    <AbsoluteFill>
      <ColorBoard theme={themes[Math.max(0, current - 1)]} build={current === 0 ? frame : 999} />
      {current > 0 && (
        <AbsoluteFill style={{ clipPath: `circle(${reveal * 150}% at 92% 12%)` }}>
          <ColorBoard theme={themes[current]} build={999} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---- Typography -----------------------------------------------------------------------------

const TYPE_COLUMNS = [
  ["display", "headline"],
  ["title", "body", "label"],
];
const SIZES = ["large", "medium", "small"];

const rem = (value: string) => (value.endsWith("rem") ? px(value) * 16 : px(value));

const TypeRow = ({ role, delay }: { role: string; delay: number }) => {
  const enter = usePop(delay, 20);
  const size = rem(sys(`typescale-${role}-size`));
  const line = rem(sys(`typescale-${role}-line-height`));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        opacity: enter,
        transform: `translateX(${(1 - enter) * -40}px)`,
      }}
    >
      <span
        style={{
          font: token(`typescale-${role}`),
          letterSpacing: token(`typescale-${role}-tracking`),
          color: token("color-on-surface"),
          whiteSpace: "nowrap",
        }}
      >
        {titleCase(role)}
      </span>
      <span style={{ fontSize: 14, color: token("color-on-surface-variant"), whiteSpace: "nowrap" }}>
        {Math.round(size)}/{Math.round(line)}px · {sys(`typescale-${role}-weight`)}
      </span>
    </div>
  );
};

const TypeSection = () => {
  let row = 0;
  return (
    <AbsoluteFill>
      <SectionHeader title="Typescale" note={`15 roles set in ${sys("typescale-font-family").split(",")[0]}, from display to label`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP, width: WIDTH, display: "flex", gap: 72 }}>
        {TYPE_COLUMNS.map((groups, c) => (
          <div key={c} style={{ flex: c === 0 ? 1.35 : 1, display: "flex", flexDirection: "column", gap: c === 0 ? 14 : 12 }}>
            {groups.flatMap((group) => SIZES.map((size) => <TypeRow key={size} role={`${group}-${size}`} delay={8 + row++ * 4} />))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---- Shape ----------------------------------------------------------------------------------

const ShapeSection = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const corners = sysGroup("shape-corner-")
    .filter(({ name }) => !/-(top|start|end)$/.test(name))
    .sort((a, b) => px(a.value) - px(b.value));
  const tile = 128;

  return (
    <AbsoluteFill>
      <SectionHeader title="Shape" note={`${corners.length} corner radii, from square to fully rounded`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP + 90, width: WIDTH, display: "flex", justifyContent: "space-between" }}>
        {corners.map(({ name, value }, i) => {
          const morph = spring({ frame: frame - 20 - i * 7, fps, config: { damping: 14 } });
          const enter = spring({ frame: frame - i * 4, fps, config: { damping: 200 } });
          const radius = Math.min(px(value), tile / 2) * morph;
          return (
            <div key={name} style={{ textAlign: "center", opacity: enter }}>
              <div
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: radius,
                  background: token("color-primary-container"),
                  border: `2px solid ${token("color-primary")}`,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 17, marginTop: 16, color: token("color-on-surface") }}>{titleCase(name.replace("shape-corner-", ""))}</div>
              <div style={{ fontSize: 14, marginTop: 2, color: token("color-on-surface-variant") }}>{px(value) > 999 ? "full" : value}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- Elevation ------------------------------------------------------------------------------

const ElevationSection = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const levels = sysGroup("elevation-level-");
  const flat = levels[0]?.value ?? "";

  return (
    <AbsoluteFill>
      <SectionHeader title="Elevation" note={`${levels.length} levels of shadow, from flat to floating`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP + 100, width: WIDTH, display: "flex", justifyContent: "space-between" }}>
        {levels.map(({ name, value }, i) => {
          const lift = spring({ frame: frame - 16 - i * 8, fps, config: { damping: 18 } });
          return (
            <div
              key={name}
              style={{
                width: 150,
                height: 150,
                borderRadius: token("shape-corner-medium"),
                background: token("color-surface-container-lowest"),
                boxShadow: mixShadow(flat, value, lift),
                transform: `translateY(${-lift * i * 8}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: token("color-on-surface"),
              }}
            >
              <div style={{ fontSize: 44, color: token("color-primary") }}>{i}</div>
              <div style={{ fontSize: 15, color: token("color-on-surface-variant") }}>level</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- Motion ---------------------------------------------------------------------------------

const MOTION_TRAVEL = 30;
const MOTION_LOOP = 54;

const EasingRow = ({ name, value, delay }: { name: string; value: string; delay: number }) => {
  const frame = useCurrentFrame();
  const enter = usePop(delay, 200);
  const ease = easingOf(value);
  const t = Math.max(0, frame - 24) % MOTION_LOOP;
  const progress = ease(Math.min(1, t / MOTION_TRAVEL));
  const track = 300;
  const curve = Array.from({ length: 21 }, (_, i) => {
    const x = i / 20;
    return `${i ? "L" : "M"}${x * 32} ${32 - ease(x) * 32}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: enter, height: 34 }}>
      <div style={{ width: 230, fontSize: 16, color: token("color-on-surface") }}>{titleCase(name.replace("motion-easing-", ""))}</div>
      <svg width={32} height={32} style={{ overflow: "visible" }}>
        <path d={curve} fill="none" stroke={token("color-primary")} strokeWidth={2.5} />
      </svg>
      <div style={{ position: "relative", width: track, height: 4, borderRadius: 2, background: token("color-surface-container-highest") }}>
        <div
          style={{
            position: "absolute",
            top: -8,
            left: progress * (track - 20),
            width: 20,
            height: 20,
            borderRadius: 10,
            background: token("color-primary"),
          }}
        />
      </div>
    </div>
  );
};

const MotionSection = () => {
  const { root } = tokenSheet();
  // Aliases (easing-decelerate: var(--...standard-decelerate)) would just repeat a curve.
  const easings = sysGroup("motion-easing-").filter(({ name }) => !root[`--md-sys-${name}`].startsWith("var("));
  const durations = sysGroup("motion-duration-");
  const longest = Math.max(...durations.map((d) => px(d.value)));

  return (
    <AbsoluteFill>
      <SectionHeader title="Motion" note={`${easings.length} easing curves and ${durations.length} durations`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP - 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {easings.map(({ name, value }, i) => (
          <EasingRow key={name} name={name} value={value} delay={6 + i * 3} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 800, top: TOP - 10, width: 408, display: "flex", flexDirection: "column", gap: 5 }}>
        {durations.map(({ name, value }, i) => (
          <DurationBar key={name} name={name.replace("motion-duration-", "")} ms={px(value)} max={longest} delay={10 + i * 2} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const DurationBar = ({ name, ms, max, delay }: { name: string; ms: number; max: number; delay: number }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [delay, delay + 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 22 }}>
      <div style={{ width: 110, fontSize: 14, color: token("color-on-surface-variant") }}>{name}</div>
      <div
        style={{
          width: (ms / max) * 220 * grow,
          height: 12,
          borderRadius: 6,
          background: token("color-tertiary"),
        }}
      />
      <div style={{ fontSize: 14, color: token("color-on-surface"), opacity: grow }}>{ms}ms</div>
    </div>
  );
};

// ---- Spacing & state layers -----------------------------------------------------------------

const SpacingStateSection = () => {
  const frame = useCurrentFrame();
  const spacing = sysGroup("spacing-");
  const states = sysGroup("state-");
  const pulse = (Math.sin((frame - 30) / 9) + 1) / 2;

  return (
    <AbsoluteFill>
      <SectionHeader title="Spacing & states" note={`A ${spacing.length}-step spacing scale and ${states.length} state-layer opacities`} />
      <div style={{ position: "absolute", left: LEFT, top: TOP + 20, display: "flex", flexDirection: "column", gap: 18 }}>
        {spacing.map(({ name, value }, i) => {
          const grow = interpolate(frame, [8 + i * 5, 28 + i * 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 16, height: 36 }}>
              <div style={{ width: 150, fontSize: 16, color: token("color-on-surface") }}>{titleCase(name.replace("spacing-", ""))}</div>
              <div style={{ width: px(value) * 14 * grow, height: 28, borderRadius: 6, background: token("color-secondary") }} />
              <div style={{ fontSize: 15, color: token("color-on-surface-variant"), opacity: grow }}>{value}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 760, top: TOP + 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {states.map(({ name, value }, i) => {
          const enter = interpolate(frame, [10 + i * 5, 26 + i * 5], [0, 1], clamp);
          return (
            <div
              key={name}
              style={{
                position: "relative",
                width: 200,
                height: 120,
                borderRadius: token("shape-corner-large"),
                overflow: "hidden",
                background: token("color-primary-container"),
                color: token("color-on-primary-container"),
                opacity: enter,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: token("color-on-primary-container"),
                  opacity: Number(value) * pulse,
                }}
              />
              <div style={{ fontSize: 20, position: "relative" }}>{titleCase(name.replace("state-", "").replace("-state-layer-opacity", ""))}</div>
              <div style={{ fontSize: 15, position: "relative" }}>{Math.round(Number(value) * 100)}% layer</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- Assembly -------------------------------------------------------------------------------

export const TOKEN_SECTIONS = [
  { id: "themes", frames: 130, Component: ThemesSection },
  { id: "colors", frames: COLOR_BUILD + themes.length * COLOR_PER_THEME, Component: ColorsSection },
  { id: "typescale", frames: 140, Component: TypeSection },
  { id: "shape", frames: 110, Component: ShapeSection },
  { id: "elevation", frames: 110, Component: ElevationSection },
  { id: "motion", frames: 170, Component: MotionSection },
  { id: "spacing-state", frames: 140, Component: SpacingStateSection },
];

export const TOKEN_TOUR_FRAMES = TOKEN_SECTIONS.reduce((sum, s) => sum + s.frames, 0);

/** All token sections back to back, each fading in and out. */
export const TokenTour = () => (
  <Series>
    {TOKEN_SECTIONS.map(({ id, frames, Component }) => (
      <Series.Sequence key={id} durationInFrames={frames} name={id}>
        <Fade frames={frames}>
          <Component />
        </Fade>
      </Series.Sequence>
    ))}
  </Series>
);

const TITLE_FRAMES = 60;
export const DESIGN_TOKENS_FRAMES = TITLE_FRAMES + TOKEN_TOUR_FRAMES + TITLE_FRAMES;

export const DesignTokens = () => (
  <Stage>
    <Series>
      <Series.Sequence durationInFrames={TITLE_FRAMES} name="intro">
        <Fade frames={TITLE_FRAMES} edge={8}>
          <TitleCard title="Design Tokens" subtitle={`Material 3 · ${themes.length} themes · ${colorRoles().length} color roles`} />
        </Fade>
      </Series.Sequence>
      <Series.Sequence durationInFrames={TOKEN_TOUR_FRAMES} name="tour">
        <TokenTour />
      </Series.Sequence>
      <Series.Sequence durationInFrames={TITLE_FRAMES} name="outro">
        <Fade frames={TITLE_FRAMES} edge={8}>
          <TitleCard title="PartoBita Design System" subtitle="libs/design-system/tokens" />
        </Fade>
      </Series.Sequence>
    </Series>
  </Stage>
);
