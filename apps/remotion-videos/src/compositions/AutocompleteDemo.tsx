import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

const COLORS = {
  ink: "#182230",
  muted: "#687586",
  line: "#dfe5eb",
  panel: "#ffffff",
  soft: "#f1f5f8",
  accent: "#216bf3",
  background: "#f7f9fb",
};

const TYPED_TEXT = "Ma";
const FILTERED_OPTIONS = ["Mango"];

function eased(frame: number, from: number, to: number) {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

export const AutocompleteDemo = () => {
  const frame = useCurrentFrame();

  const titleOpacity = eased(frame, 0, 15);
  const cardProgress = eased(frame, 10, 30);
  const cardOffsetY = interpolate(cardProgress, [0, 1], [16, 0]);

  const typedLength = Math.round(
    interpolate(frame, [40, 70], [0, TYPED_TEXT.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedText = TYPED_TEXT.slice(0, typedLength);
  const caretVisible = frame < 95 && Math.floor(frame / 10) % 2 === 0;

  const panelOpacity = eased(frame, 78, 95);
  const optionHighlighted = eased(frame, 100, 112) > 0.5;
  const statusOpacity = eased(frame, 122, 140);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <AbsoluteFill
        style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 64 }}
      >
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              color: COLORS.accent,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Component
          </div>
          <div style={{ color: COLORS.ink, fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            Autocomplete
          </div>
        </div>

        <div
          style={{
            opacity: cardProgress,
            transform: `translateY(${cardOffsetY}px)`,
            width: 520,
            padding: 28,
            borderRadius: 16,
            border: `1px solid ${COLORS.line}`,
            background: COLORS.panel,
            boxShadow: "0 16px 44px rgba(25,43,58,0.08)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>
            Pick a fruit
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 18px",
              borderRadius: 8,
              border: `1px solid ${typedLength > 0 ? COLORS.accent : COLORS.line}`,
              fontSize: 20,
              color: COLORS.ink,
              background: COLORS.panel,
            }}
          >
            {typedText.length > 0 ? (
              <span>{typedText}</span>
            ) : (
              <span style={{ color: "#8b97a3" }}>Start typing...</span>
            )}
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 22,
                marginLeft: 3,
                background: COLORS.accent,
                opacity: caretVisible ? 1 : 0,
              }}
            />
          </div>

          <div
            style={{
              opacity: panelOpacity,
              marginTop: 8,
              borderRadius: 8,
              border: `1px solid ${COLORS.line}`,
              background: COLORS.panel,
              boxShadow: "0 4px 12px rgba(25,43,58,0.12)",
              overflow: "hidden",
            }}
          >
            {FILTERED_OPTIONS.map((option) => (
              <div
                key={option}
                style={{
                  padding: "14px 18px",
                  fontSize: 18,
                  color: optionHighlighted ? COLORS.accent : COLORS.ink,
                  fontWeight: optionHighlighted ? 700 : 400,
                  background: optionHighlighted ? COLORS.soft : COLORS.panel,
                }}
              >
                {option}
              </div>
            ))}
          </div>

          <div
            style={{
              opacity: statusOpacity,
              marginTop: 16,
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.accent,
            }}
          >
            Selected: Mango
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
