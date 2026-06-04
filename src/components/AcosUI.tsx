import { useState } from 'react';
import * as LucideIcons from 'lucide-react';

export const T = {
  navy900: "#022747", navy800: "#043666", navy700: "#0A3863", bright: "#045D93",
  sky: "#4AB3D8", tint: "#8FD0E8", light: "#E1F0F8", white: "#FEFEFE",
  bg: "#04203a",
  bgGrad: "radial-gradient(1100px 620px at 82% -12%, #0c3a64 0%, rgba(12,58,100,0) 60%), radial-gradient(900px 600px at -5% 110%, #06294a 0%, rgba(6,41,74,0) 55%), #04203a",
  panel: "#082a4b", panelHi: "#0b3460", inset: "#06223e",
  sidebar: "#022747", topbar: "rgba(8,42,75,0.7)",
  line: "rgba(255,255,255,0.09)", lineHi: "rgba(255,255,255,0.16)",
  track: "rgba(255,255,255,0.08)",
  txt: "#EAF4FB", sub: "#9DBAD2", dim: "#5F7C97",
  mode: "dark",
  green: "#34D399", amber: "#FBBF24", red: "#F87171", violet: "#8FD0E8",
  mono: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
  font: "'Montserrat','Poppins','Inter',sans-serif",
};

export function applyTheme(mode: string, density: string = 'Nyaman') {
  const root = document.documentElement.style;
  
  if (density === 'Padat') {
    // Add logic for density padat later if needed, e.g. reducing padding
  }
  
  if (mode === 'Terang' || mode === 'light') {
    T.bg = "#F3F7FA";
    T.bgGrad = "#F3F7FA";
    T.panel = "#FFFFFF";
    T.panelHi = "#F9FCFF";
    T.inset = "#EBF1F6";
    T.sidebar = "#FFFFFF";
    T.topbar = "rgba(255,255,255,0.8)";
    T.line = "rgba(0,0,0,0.06)";
    T.lineHi = "rgba(0,0,0,0.12)";
    T.track = "rgba(0,0,0,0.04)";
    T.txt = "#04203a";
    T.sub = "#415A72";
    T.dim = "#738C9F";
    T.mode = "light";

    root.setProperty('--bg-background', '#F3F7FA');
    root.setProperty('--bg-surface', '#FFFFFF');
    root.setProperty('--bg-surface-bright', '#F9FCFF');
    root.setProperty('--bg-surface-dim', '#EBF1F6');
    root.setProperty('--bg-surface-variant', '#FFFFFF');
    
    root.setProperty('--text-on-background', '#04203a');
    root.setProperty('--text-on-surface', '#04203a');
    root.setProperty('--text-on-surface-variant', '#415A72');
    root.setProperty('--text-dim', '#738C9F');
    
    root.setProperty('--border-outline', 'rgba(0,0,0,0.06)');
    root.setProperty('--border-outline-variant', 'rgba(0,0,0,0.12)');

    // Brand colors mapping to light equivalents
    root.setProperty('--brand-default', '#FFFFFF');
    root.setProperty('--brand-dark', '#F3F7FA');
    root.setProperty('--brand-mid', '#FFFFFF');
    root.setProperty('--brand-soft', '#EBF1F6');
    root.setProperty('--color-white', '#04203a'); // invert white to dark text
  } else {
    T.bg = "#04203a";
    T.bgGrad = "radial-gradient(1100px 620px at 82% -12%, #0c3a64 0%, rgba(12,58,100,0) 60%), radial-gradient(900px 600px at -5% 110%, #06294a 0%, rgba(6,41,74,0) 55%), #04203a";
    T.panel = "#082a4b";
    T.panelHi = "#0b3460";
    T.inset = "#06223e";
    T.sidebar = "#022747";
    T.topbar = "rgba(8,42,75,0.7)";
    T.line = "rgba(255,255,255,0.09)";
    T.lineHi = "rgba(255,255,255,0.16)";
    T.track = "rgba(255,255,255,0.08)";
    T.txt = "#EAF4FB";
    T.sub = "#9DBAD2";
    T.dim = "#5F7C97";
    T.mode = "dark";

    root.setProperty('--bg-background', '#04203a');
    root.setProperty('--bg-surface', '#082a4b');
    root.setProperty('--bg-surface-bright', '#0b3460');
    root.setProperty('--bg-surface-dim', '#06223e');
    root.setProperty('--bg-surface-variant', '#022747');
    
    root.setProperty('--text-on-background', '#EAF4FB');
    root.setProperty('--text-on-surface', '#EAF4FB');
    root.setProperty('--text-on-surface-variant', '#9DBAD2');
    root.setProperty('--text-dim', '#5F7C97');
    
    root.setProperty('--border-outline', 'rgba(255,255,255,0.09)');
    root.setProperty('--border-outline-variant', 'rgba(255,255,255,0.16)');

    // Brand colors revert to dark
    root.setProperty('--brand-default', '#04203a');
    root.setProperty('--brand-dark', '#022747');
    root.setProperty('--brand-mid', '#082a4b');
    root.setProperty('--brand-soft', '#06223e');
    root.setProperty('--color-white', '#ffffff');
  }
}

// Initial application of theme
try {
  applyTheme(localStorage.getItem('acos_theme') || 'Gelap', localStorage.getItem('acos_density') || 'Nyaman');
} catch (e) {}
export const statusColor: Record<string, string> = { 
  active: T.green, ok: T.green, paid: T.green, warn: T.amber, due: T.amber, sent: T.sky, info: T.sky, 
  overdue: T.red, error: T.red, hot: T.red, warm: T.amber, cold: T.dim, high: T.red, med: T.amber, medium: T.amber, low: T.green 
};

// ── ICON (Lucide UMD) ────────────────────────────────────
export function Icon({ name, size = 18, color = "currentColor", style = {} }: any) {
  const IconComponent = (LucideIcons as any)[name || 'HelpCircle'];
  if (!IconComponent) return <span style={{ display: "inline-block", width: size, height: size, ...style }} />;
  return <IconComponent size={size} color={color} style={{ flexShrink: 0, ...style }} />;
}

// ── BRAND MARK ───────────────────────────────────────────
export function Mark({ size = 30, glow = true }: any) {
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0, display: "grid", placeItems: "center" }}>
      {glow && <div style={{ position: "absolute", inset: -6, background: "radial-gradient(circle,rgba(74,179,216,0.45),transparent 70%)", filter: "blur(6px)" }} />}
      <div style={{ width: "100%", height: "100%", background: T.sky, borderRadius: '4px', position: "relative" }} />
    </div>
  );
}

// ── PANEL ────────────────────────────────────────────────
export function Panel({ children, style = {}, pad = 0, hover = false, onClick }: any) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: hover && h ? T.panelHi : T.panel, border: `1px solid ${hover && h ? T.lineHi : T.line}`,
        borderRadius: 14, padding: pad, position: "relative", overflow: "hidden",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px rgba(0,0,0,0.28)",
        transition: "border-color .18s, box-shadow .18s, transform .18s", cursor: onClick ? "pointer" : "default",
        transform: hover && h ? "translateY(-2px)" : "none", ...style,
      }}>{children}</div>
  );
}

export function PanelHead({ title, sub, icon, right, accent = T.sky }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(74,179,216,0.12)", display: "grid", placeItems: "center" }}><Icon name={icon} size={15} color={accent} /></div>}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.txt, letterSpacing: 0.2 }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: T.dim, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── CORNER BRACKETS ──────────────────────
export function Brackets({ c = "rgba(74,179,216,0.30)", s = 16 }: any) {
  const b = `1.4px solid ${c}`;
  return (<>
    <div style={{ position: "absolute", top: 10, left: 10, width: s, height: s, borderTop: b, borderLeft: b }} />
    <div style={{ position: "absolute", top: 10, right: 10, width: s, height: s, borderTop: b, borderRight: b }} />
    <div style={{ position: "absolute", bottom: 10, left: 10, width: s, height: s, borderBottom: b, borderLeft: b }} />
    <div style={{ position: "absolute", bottom: 10, right: 10, width: s, height: s, borderBottom: b, borderRight: b }} />
  </>);
}

// ── TAG / PILL / DOT ─────────────────────────────────────
export function Tag({ children, color = T.sky, solid = false, style = {} }: any) {
  return <span style={{
    display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.4, whiteSpace: "nowrap",
    color: solid ? "#03203a" : color, background: solid ? color : `${color}1f`,
    border: `1px solid ${solid ? color : color + "33"}`, ...style,
  }}>{children}</span>;
}

export function Dot({ color = T.green, pulse = false, size = 8 }: any) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, display: "inline-block", animation: pulse ? "pulse 1.8s infinite" : "none", flexShrink: 0 }} />;
}

// ── BUTTON ───────────────────────────────────────────────
export function Btn({ children, onClick, v = "primary", icon, size = "md", style = {} }: any) {
  const [h, setH] = useState(false);
  const pad = size === "sm" ? "7px 12px" : "9px 16px";
  const base = {
    primary: { bg: T.sky, fg: "#03203a", bd: T.sky },
    sky: { bg: "rgba(74,179,216,0.14)", fg: T.sky, bd: "rgba(74,179,216,0.3)" },
    ghost: { bg: "transparent", fg: T.sub, bd: T.line },
    solid: { bg: T.bright, fg: T.white, bd: T.bright },
  }[v as 'primary'|'sky'|'ghost'|'solid'];
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: pad, borderRadius: 9,
        border: `1px solid ${base.bd}`, background: base.bg, color: base.fg, cursor: "pointer",
        fontFamily: T.font, fontWeight: 700, fontSize: size === "sm" ? 11 : 12, letterSpacing: 0.2,
        filter: h ? "brightness(1.08)" : "none", transform: h ? "translateY(-1px)" : "none",
        boxShadow: v === "primary" && h ? "0 8px 20px rgba(74,179,216,0.35)" : "none",
        transition: "all .16s", ...style,
      }}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} color={base.fg} />}{children}
    </button>
  );
}

// ── AVATAR ───────────────────────────────────────────────
export function Avatar({ initials, color = T.sky, size = 32, bot = false }: any) {
  return <div style={{
    width: size, height: size, borderRadius: bot ? 9 : "50%", flexShrink: 0,
    background: bot ? "rgba(143,208,232,0.16)" : `linear-gradient(140deg,${color},${T.navy700})`,
    border: bot ? `1px solid ${T.sky}55` : "none",
    display: "grid", placeItems: "center", color: bot ? T.tint : T.white, fontWeight: 800, fontSize: size * 0.34,
  }}>{bot ? <Icon name="Bot" size={size * 0.5} color={T.tint} /> : initials}</div>;
}

// ── KPI STAT ─────────────────────────────────────────────
export function Stat({ label, value, delta, deltaUp = true, icon, accent = T.sky, spark }: any) {
  return (
    <Panel hover pad={16} style={{ minHeight: 104 }}>
      <Brackets c="rgba(74,179,216,0.16)" s={12} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10.5, color: T.dim, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</div>
        {icon && <Icon name={icon} size={16} color={accent} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: T.txt, marginTop: 8, letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        {delta != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: deltaUp ? T.green : T.red }}>
            <Icon name={deltaUp ? "TrendingUp" : "TrendingDown"} size={12} color={deltaUp ? T.green : T.red} />{delta}
          </div>
        )}
        {spark && <Spark data={spark} color={accent} w={70} h={22} />}
      </div>
    </Panel>
  );
}

// ── CHARTS ───────────────────────────────────────────────
export function Spark({ data, color = T.sky, w = 80, h = 24, fill = true }: any) {
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v: number, i: number) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 3) - 1.5]);
  const d = pts.map((p: any, i: number) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const id = "sg" + Math.round(w + h + data[0]);
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {fill && <><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} /></>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

export function Bars({ data, h = 120, fmt }: any) {
  const max = Math.max(...data.map((d: any) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: h, padding: "0 4px" }}>
      {data.map((d: any, i: number) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: i === data.length - 1 ? T.sky : T.sub }}>{fmt ? fmt(d.v) : d.v}</div>
          <div style={{ width: "100%", maxWidth: 30, height: `${(d.v / max) * 100}%`, borderRadius: "5px 5px 2px 2px",
            background: i === data.length - 1 ? `linear-gradient(${T.tint},${T.sky})` : "rgba(74,179,216,0.28)",
            border: `1px solid ${i === data.length - 1 ? T.sky : "rgba(74,179,216,0.2)"}`, transition: "height .5s" }} />
          <div style={{ fontSize: 9.5, color: T.dim, fontWeight: 600 }}>{d.m}</div>
        </div>
      ))}
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = T.sky, label }: any) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset .7s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div><div style={{ fontSize: size * 0.26, fontWeight: 800, color: T.txt }}>{value}<span style={{ fontSize: size * 0.16 }}>%</span></div>{label && <div style={{ fontSize: 8, color: T.dim }}>{label}</div>}</div>
      </div>
    </div>
  );
}

export function ProgBar({ value, color = T.sky, h = 6 }: any) {
  return <div style={{ height: h, borderRadius: 999, background: T.track, overflow: "hidden" }}>
    <div style={{ width: `${value}%`, height: "100%", background: `linear-gradient(90deg,${color},${T.tint})`, borderRadius: 999, transition: "width .6s" }} /></div>;
}
