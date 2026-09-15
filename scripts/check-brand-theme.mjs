import assert from "node:assert/strict";
import { brandTokens, hexToHsl, hslToHex } from "../src/lib/theme.js";

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function close(a, b, tolerance = 2) {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return Math.abs(ar - br) <= tolerance && Math.abs(ag - bg) <= tolerance && Math.abs(ab - bb) <= tolerance;
}

// round-trip hex -> hsl -> hex (tolerancia de redondeo)
for (const hex of ["#ff7900", "#1d4ed8", "#0f766e", "#000000", "#ffffff"]) {
  assert.ok(close(hslToHex(...hexToHsl(hex)), hex), `round-trip ${hex}`);
}

const t = brandTokens("#ff7900");
assert.equal(t.brand, "#ff7900");
assert.ok(close(t.tint, "#fff1e5"), `tint ${t.tint}`);       // L 95
assert.ok(close(t.soft, "#ffbf80", 3), `soft ${t.soft}`);    // L 75
assert.ok(hexToHsl(t.hover)[2] < hexToHsl("#ff7900")[2], "hover es mas oscuro");
assert.equal(t.shadow, "rgba(255,121,0,0.22)");

// un color arbitrario produce 5 tokens validos
const u = brandTokens("#1d4ed8");
for (const key of ["brand", "hover", "tint", "soft"]) assert.match(u[key], /^#[0-9a-f]{6}$/, key);
assert.match(u.shadow, /^rgba\(\d+,\d+,\d+,0\.22\)$/);

// entrada invalida cae al default
assert.equal(brandTokens("no-es-hex").brand, "#ff7900");

console.log("check-brand-theme: ALL PASS");
