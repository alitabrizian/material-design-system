/*
 * Exports the Foundation tokens of the design system Figma file (vQU7lIKOIAZ63SnS9kOUzy): every local
 * variable (with the variable it aliases), the text styles and the effect styles. Run it in the file
 * through the Figma MCP `use_figma` tool (or a plugin's console) three times, with PART = "base",
 * "alias" and "rest" (one call returns at most 20KB), and save the results as
 * tests/ui/figma/raw/<part>.json. Then run
 *   node tools/scripts/sync-figma-foundations.mts
 * to rebuild tests/ui/figma/foundations.json. See tests/ui/README.md.
 *
 * Figma's REST variables endpoint needs an Enterprise plan, so the export runs inside the file.
 */
const PART = "base"; // "base" (1. Base Colors) | "alias" (2. Alias Colors) | "rest" (numbers, typography, styles)

const hex = (c) => {
  const h = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + h(c.r) + h(c.g) + h(c.b) + (c.a !== undefined && c.a < 1 ? h(c.a) : "");
};
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const byId = new Map(variables.map((v) => [v.id, v]));
const colName = new Map(collections.map((c) => [c.id, c.name]));
const firstMode = (v) => v.valuesByMode[Object.keys(v.valuesByMode)[0]];
const resolve = (v) => {
  let value = firstMode(v);
  for (let i = 0; i < 10 && value && value.type === "VARIABLE_ALIAS"; i++) value = firstMode(byId.get(value.id));
  return value;
};
const fmt = (v) => {
  const raw = firstMode(v);
  const value = resolve(v);
  const shown = v.resolvedType === "COLOR" ? hex(value) : value;
  return raw && raw.type === "VARIABLE_ALIAS" ? [shown, byId.get(raw.id).name] : [shown];
};

const wanted = (v) => {
  const col = colName.get(v.variableCollectionId);
  if (PART === "base") return col === "1. Base Colors";
  if (PART === "alias") return col === "2. Alias Colors";
  return col !== "1. Base Colors" && col !== "2. Alias Colors";
};
const out = {};
for (const v of variables.filter(wanted)) {
  const col = colName.get(v.variableCollectionId);
  (out[col] ||= {})[v.name] = fmt(v);
}
if (PART === "rest") {
  out.textStyles = {};
  for (const s of await figma.getLocalTextStylesAsync()) {
    const bound = Object.fromEntries(Object.entries(s.boundVariables || {}).map(([k, a]) => [k, byId.get(a.id)?.name]));
    out.textStyles[s.name] = {
      fontFamily: s.fontName.family,
      fontStyle: s.fontName.style,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight.unit === "PIXELS" ? s.lineHeight.value + "px" : s.lineHeight.unit,
      letterSpacing: s.letterSpacing.value + (s.letterSpacing.unit === "PIXELS" ? "px" : "%"),
      bound,
    };
  }
  out.effectStyles = {};
  for (const s of await figma.getLocalEffectStylesAsync()) {
    out.effectStyles[s.name] = s.effects.map((e) => ({ type: e.type, x: e.offset?.x, y: e.offset?.y, blur: e.radius, spread: e.spread ?? 0, color: e.color ? hex(e.color) : null }));
  }
}
const json = JSON.stringify(out);
if (json.length > 20000) throw new Error(`result is ${json.length} bytes, over the 20KB use_figma limit; split PART further`);
return out;
