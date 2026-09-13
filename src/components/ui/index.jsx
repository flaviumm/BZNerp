import React from "react";
import { isDatabaseConfigured } from "../../lib/erpRepository";
import { clamp } from "../../lib/utils";
import { screens, menuSections } from "../../lib/navigation";
export function MenuGlyph({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    layout: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="7" rx="1.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>,
    pipeline: <><path d="M4 6h5v5H4zM15 13h5v5h-5zM9 8.5h3a3 3 0 0 1 3 3V13" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    wrench: <><path d="M14 6a5 5 0 0 0 6 6L11 21l-4-4 9-9a5 5 0 0 0-2-2z" /></>,
    box: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
    cart: <><path d="M4 5h2l2 11h9l2-7H8" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 11h5v4h-5a2 2 0 0 1 0-4zM6 9h8" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 11a3 3 0 0 0 0-6M17 20a5 5 0 0 0-3-4" /></>,
    check: <><path d="m5 13 4 4L19 7" /><rect x="3" y="3" width="18" height="18" rx="4" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    folder: <><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
    userCog: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 10-4.5" /><circle cx="18" cy="17" r="2" /><path d="M18 13v1M18 20v1M14 17h1M21 17h1" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="M8 16v-5M13 16V8M18 16v-8" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></>,
    map: <><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01" /></>,
  };

  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...common}>{paths[name] || paths.layout}</svg>;
}

export function IconMark({ icon, active = false }) {
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-white/20 text-current" : "bg-transparent text-zinc-400 group-hover:bg-[#fff4ea] group-hover:text-[#ff7900]"}`}>
      <MenuGlyph name={icon} />
    </span>
  );
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled = false }) {
  const styles = {
    primary: "border-[#ff7900] bg-[#ff7900] text-black shadow-sm hover:bg-[#ff8f1f]",
    ghost: "border-[#cfe7dd] bg-[#f0fdf7] text-[#0f766e] hover:border-[#0f766e]",
    danger: "border-[#f3d2d2] bg-[#fff5f5] text-[#b42318] hover:border-[#b42318]",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "zinc" }) {
  const tones = {
    zinc: "border-[#e7e7e2] bg-[#f7f7f4] text-zinc-600",
    green: "border-[#ffd2ad] bg-[#fff3e8] text-[#d85f00]",
    amber: "border-[#f4dfb6] bg-[#fff8e8] text-[#9a6500]",
    red: "border-[#f2c9c9] bg-[#fff3f1] text-[#b42318]",
    blue: "border-[#d8ddff] bg-[#f3f4ff] text-[#4a55c8]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.zinc}`}>{children}</span>;
}

export function Panel({ children, className = "" }) {
  return <section className={`rounded-[22px] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${className}`}>{children}</section>;
}

export function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
      {label}
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}

export function Select(props) {
  return <select {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition focus:border-[#ff7900] focus:ring-2" />;
}

export function TextArea(props) {
  return <textarea {...props} className="min-h-24 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 py-2 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}



export function Header({ activeLabel, databaseStatus, profile }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="h-10 w-10 rounded-xl bg-black object-contain p-1 lg:hidden" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">{activeLabel}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={databaseStatus === "Conectado a Supabase" || databaseStatus === "Base local" ? "green" : databaseStatus === "Error de base" ? "red" : "amber"}>{databaseStatus}</Badge>
          {profile && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1e5] text-sm font-semibold text-[#d85f00]">
                {profile.fullName?.slice(0, 1).toUpperCase() || "U"}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-zinc-950">{profile.fullName}</p>
                <p className="text-xs font-medium text-zinc-500">{profile.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Sidebar({ active, setActive, availableScreens, menuSections, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut }) {
  const allowedKeys = new Set(availableScreens.map((item) => item.key));
  const hasDatabaseError = databaseStatus === "Error de base";

  return (
    <aside className={`hidden h-screen shrink-0 border-r border-[#ececf0] bg-white p-3 transition-all duration-200 lg:block ${collapsed ? "w-16" : "w-44"}`}>
      <div className="flex h-full flex-col">
        <div className={`relative flex min-h-16 items-center border-b border-[#ececf0] pb-5 ${collapsed ? "justify-center" : "justify-start pr-12"}`}>
          <img src={collapsed ? "/brand/isotipo_bizon.png" : "/brand/logo_principal_horizontal.png"} alt="Bizon Soluciones Industriales" className={collapsed ? "h-8 w-8 rounded-xl bg-black object-contain p-1" : "h-auto max-h-14 w-full object-contain"} />
          <button type="button" onClick={onToggleCollapsed} className="absolute right-0 top-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ececf0] bg-white text-zinc-500 transition hover:border-[#ff7900] hover:text-[#ff7900] lg:inline-flex" title={collapsed ? "Expandir menu" : "Contraer menu"}>
            <span className={`transition ${collapsed ? "rotate-180" : ""}`}><MenuGlyph name="layout" /></span>
          </button>
        </div>
        {hasDatabaseError && !collapsed && (
          <div className="mt-4 rounded-lg border border-[#5b241a] bg-[#1b0d09] p-3 text-xs font-semibold text-[#ffb199]">
            Perfil y datos no cargados. Ejecutar SQL de Supabase y asignar rol admin.
          </div>
        )}
        <nav className="scrollbar-none mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{section.title}</p>}
              <div className="space-y-1.5">
                {section.keys.map((key) => screens.find((item) => item.key === key)).filter(Boolean).map((item) => {
                  const allowed = allowedKeys.has(item.key);
                  const isActive = active === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!allowed}
                      onClick={() => allowed && setActive(item.key)}
                      title={allowed ? item.label : "Bloqueado para este rol"}
                      className={`group flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-[13px] font-medium transition ${collapsed ? "justify-center px-0" : ""} ${
                        isActive
                          ? "bg-[#ff7900] text-black shadow-[0_12px_25px_rgba(255,121,0,0.22)]"
                          : allowed
                            ? "text-zinc-500 hover:bg-[#f7f7f5] hover:text-zinc-950"
                            : "cursor-not-allowed text-zinc-300"
                      }`}
                    >
                      <IconMark active={isActive} icon={item.icon} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className={`mt-5 border-t border-[#ececf0] pt-4 ${collapsed ? "grid justify-center gap-2" : "grid gap-2"}`}>
          {onNew && <Button onClick={onNew}>{collapsed ? <MenuGlyph name="file" /> : "Nuevo registro"}</Button>}
          <Button variant="ghost" onClick={onExportBackup}>{collapsed ? <MenuGlyph name="folder" /> : "Exportar"}</Button>
          {onResetLocal && <Button variant="ghost" onClick={onResetLocal}>{collapsed ? <MenuGlyph name="activity" /> : "Reiniciar local"}</Button>}
          {onSignOut && <Button variant="ghost" onClick={onSignOut}>{collapsed ? <MenuGlyph name="userCog" /> : "Salir"}</Button>}
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ active, setActive, availableScreens }) {
  return (
    <div className="border-b border-[#ecece6] bg-[#fbfbf8] p-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {availableScreens.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold ${active === item.key ? "border-[#ff7900] bg-[#ff7900] text-black" : "border-[#e4e4de] bg-white text-zinc-700"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MiniSparkBars({ values = [], tone = "green" }) {
  const max = Math.max(...values.map((value) => Number(value || 0)), 1);
  const color = {
    green: "bg-[#0f766e]",
    amber: "bg-[#d85f00]",
    red: "bg-[#b42318]",
    blue: "bg-[#334155]",
    zinc: "bg-zinc-500",
  }[tone] || "bg-[#d85f00]";

  return (
    <div className="mt-4 flex h-10 items-end gap-1.5">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} className={`flex-1 rounded-t-md ${color}`} style={{ height: `${Math.max((Number(value || 0) / max) * 100, 12)}%`, opacity: index === values.length - 1 ? 1 : 0.25 }} />
      ))}
    </div>
  );
}

export function StatCard({ title, value, subtitle, tone = "zinc", chart = [] }) {
  const colors = {
    zinc: "text-zinc-500 bg-zinc-100",
    green: "text-[#0f766e] bg-[#ecfdf5]",
    amber: "text-[#a16207] bg-[#fff8e1]",
    red: "text-[#b42318] bg-[#fff1f1]",
    blue: "text-[#334155] bg-[#eef2f7]",
  };
  return (
    <Panel className="p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-500">{title}</p>
          <p className="mt-5 text-[28px] font-semibold leading-none tracking-tight text-[#050505]">{value}</p>
          <p className="mt-3 text-[13px] font-semibold text-zinc-400">{subtitle}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone] || colors.zinc}`}><MenuGlyph name="chart" /></span>
      </div>
      {!!chart.length && <MiniSparkBars values={chart} tone={tone} />}
    </Panel>
  );
}

export function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-zinc-500">{subtitle}</p>}
      </div>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}

export function Progress({ value, tone = "green" }) {
  const color = { green: "bg-[#ff7900]", amber: "bg-[#f3a51b]", red: "bg-[#e4574f]", blue: "bg-[#050505]" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#edede8]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

export function BarChart({ items }) {
  const max = Math.max(...items.map((item) => Math.max(item.primary, item.secondary)), 1);
  return (
    <div className="mt-5 h-64">
      <div className="flex h-full items-end gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-52 w-full items-end justify-center gap-1.5">
              <div className="w-3 rounded-t-md bg-[#6c5df6]" style={{ height: `${(item.primary / max) * 100}%` }} />
              <div className="w-3 rounded-t-md bg-[#f4a338]" style={{ height: `${(item.secondary / max) * 100}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ items }) {
  const total = items.reduce((value, item) => value + item.value, 0) || 1;
  let cursor = 0;
  const gradient = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 100;
    cursor = end;
    return `${item.color} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center">
      <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-10 rounded-full bg-white" />
      </div>
      <div className="grid flex-1 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-zinc-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span>
            <strong className="text-[#050505]">{item.value}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTable({ headers, rows, empty = "Sin datos" }) {
  return (
    <Panel className="overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]" style={{ minWidth: `${Math.max(820, headers.length * 118)}px` }}>
          <thead className="bg-[#fafaf8] text-zinc-500">
            <tr>{headers.map((header) => <th key={header} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#eeeeec]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="font-medium text-zinc-600 transition hover:bg-[#fbfbfa]">
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2.5 align-middle">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-sm font-medium text-zinc-500">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function SearchBar({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <Badge tone={isDatabaseConfigured ? "green" : "blue"}>{isDatabaseConfigured ? "Datos persistentes" : "Datos locales"}</Badge>
    </div>
  );
}

export function CleanBarList({ items, valueFormatter = (value) => value }) {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-zinc-800">{item.label}</span>
            <strong className="text-zinc-950">{valueFormatter(item.value)}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#ededeb]">
            <div className="h-full rounded-full bg-[#ff7900]" style={{ width: `${Math.max((Number(item.value || 0) / max) * 100, 4)}%` }} />
          </div>
          {item.caption && <p className="text-xs font-semibold text-zinc-500">{item.caption}</p>}
        </div>
      ))}
    </div>
  );
}

export function DashboardLineChart({ values = [], labels = [] }) {
  const width = 360;
  const height = 128;
  const max = Math.max(...values.map((value) => Number(value || 0)), 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Number(value || 0) / max) * (height - 18) - 8;
    return { x, y, value, label: labels[index] || "" };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible" role="img" aria-label="Grafico de tendencia">
        <path d={area} fill="#ff7900" opacity="0.08" />
        <path d={path} fill="none" stroke="#ff7900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.x}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#ff7900" />
            <circle cx={point.x} cy={point.y} r="9" fill="#ff7900" opacity="0.1" />
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold text-zinc-500">
        {points.slice(0, 3).map((point) => <span key={point.label} className="truncate">{point.label}</span>)}
      </div>
    </div>
  );
}

export function DashboardRadialChart({ value, label, details = [] }) {
  const normalized = clamp(value, 0, 100);
  return (
    <div className="grid gap-4 rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4 sm:grid-cols-[132px_1fr] sm:items-center">
      <div className="relative h-32 w-32 rounded-full" style={{ background: `conic-gradient(#ff7900 ${normalized}%, #ececf0 ${normalized}% 100%)` }}>
        <div className="absolute inset-4 grid place-items-center rounded-full bg-white">
          <strong className="text-2xl font-semibold tracking-tight text-zinc-950">{Math.round(normalized)}%</strong>
          <span className="-mt-1 text-[11px] font-semibold text-zinc-400">{label}</span>
        </div>
      </div>
      <div className="grid gap-2">
        {details.map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex justify-between gap-3 text-xs font-semibold">
              <span className="text-zinc-500">{item.label}</span>
              <strong className="text-zinc-950">{item.value}</strong>
            </div>
            <Progress value={item.progress} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardStackChart({ items = [] }) {
  const total = items.reduce((sumValue, item) => sumValue + Number(item.value || 0), 0) || 1;
  return (
    <div className="rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4">
      <div className="flex h-5 overflow-hidden rounded-full bg-[#ececf0]">
        {items.map((item, index) => (
          <span
            key={item.label}
            className={index === 0 ? "bg-[#ff7900]" : index === 1 ? "bg-[#111111]" : "bg-[#f2c48d]"}
            style={{ width: `${Math.max((Number(item.value || 0) / total) * 100, 4)}%` }}
          />
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-zinc-600">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? "bg-[#ff7900]" : index === 1 ? "bg-[#111111]" : "bg-[#f2c48d]"}`} />
              <span className="truncate">{item.label}</span>
            </span>
            <strong className="text-zinc-950">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressRing({ value, label = "Avance" }) {
  const safeValue = clamp(Number(value || 0), 0, 100);
  const ringColor = safeValue >= 85 ? "#ff7900" : safeValue >= 50 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(${ringColor} ${safeValue * 3.6}deg, #eeeeec 0deg)` }}>
      <div className="absolute inset-3 rounded-full bg-white" />
      <div className="relative text-center">
        <p className="text-3xl font-semibold tracking-tight text-zinc-950">{safeValue}%</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export function GlobalStyles() {
  return (
    <style>{`
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .scrollbar-none {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
    `}</style>
  );
}
