export function applyBaseTheme() {
  const root = document.documentElement.style;
  root.setProperty("--surface", "#fbfbf8");
  root.setProperty("--surface-alt", "#f5f5f3");
  root.setProperty("--border", "#ececf0");
  root.setProperty("--text", "#18181b");
  root.setProperty("--text-muted", "#71717a");
  root.setProperty("--success", "#0f766e");
  root.setProperty("--warning", "#b45309");
  root.setProperty("--danger", "#b42318");
}
