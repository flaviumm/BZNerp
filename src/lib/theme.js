const DEFAULT_BRAND = "#ff7900";

export function hexToHsl(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

export function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function brandTokens(hex, isDark = false) {
  const brand = isHex(hex) ? hex.toLowerCase() : DEFAULT_BRAND;
  const [h, s, l] = hexToHsl(brand);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(brand.slice(i, i + 2), 16));
  return {
    brand,
    hover: hslToHex(h, s, Math.max(l - 10, 0)),
    tint: isDark ? hslToHex(h, s, 18) : hslToHex(h, s, 95),
    soft: isDark ? hslToHex(h, s, 35) : hslToHex(h, s, 75),
    shadow: `rgba(${r},${g},${b},0.22)`,
  };
}

export function applyBrandTheme(hex, isDark = false) {
  const tokens = brandTokens(hex, isDark);
  const root = document.documentElement.style;
  root.setProperty("--brand", tokens.brand);
  root.setProperty("--brand-hover", tokens.hover);
  root.setProperty("--brand-tint", tokens.tint);
  root.setProperty("--brand-soft", tokens.soft);
  root.setProperty("--brand-shadow", tokens.shadow);
}

const THEME_KEY = "bizon-theme";

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) - fall through to system preference
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage unavailable - theme just won't persist across reloads
  }
}

export function applyColorScheme(theme) {
  document.documentElement.dataset.theme = theme;
}
