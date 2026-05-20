import { useState, useEffect } from "react";

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const S = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const ADMIN = { username: "jorge", password: "admin2024" };

const SERVICIOS_DEFAULT = [
  { id: "estrategia", nombre: "Estrategia", subetapas: ["Briefing", "Investigación de mercado", "Definición de audiencia", "Plan de acción"] },
  { id: "contenido", nombre: "Contenido", subetapas: ["Investigación", "Guionización", "Grabación", "Edición", "Primera Entrega", "Entrega Final"] },
  { id: "pauta", nombre: "Pauta", subetapas: ["Test de Anuncios", "Test de Públicos", "Campañas Ganadoras", "Escala"] },
  { id: "ventas", nombre: "Ventas", subetapas: ["Configuración CRM", "Capacitación equipo", "Seguimiento", "Optimización"] },
  { id: "remarketing", nombre: "Remarketing", subetapas: ["Segmentación", "Creatividades", "Activación", "Análisis"] },
  { id: "analisis", nombre: "Análisis", subetapas: ["Reporte semanal", "Reporte mensual", "Optimizaciones", "Presentación de resultados"] },
];

const REDES_SOCIALES = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok_personal", label: "TikTok Personal" },
  { id: "tiktok_empresarial", label: "TikTok Empresarial" },
  { id: "tiktok_ads", label: "TikTok Ads" },
  { id: "gmail", label: "Gmail" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "spotify", label: "Spotify" },
  { id: "pinterest", label: "Pinterest" },
];

const SEED_CLIENTS = [
  {
    id: "c1", name: "Bella Estética", username: "bella", password: "bella123",
    niche: "whatsapp", logo: "BE", color: "#7C3AED",
    producto: "Tratamientos faciales", email: "bella@ejemplo.com",
    telefono: "0991234567", direccion: "Av. Amazonas N24-01, Quito",
    representante: "María González",
    serviciosContratados: ["contenido", "pauta"],
    checklist: {},
    cuentas: [],
    contratos: [],
    records: [
      { date: "2025-05-01", inversion: 120, alcance: 8200, cpm: 8.57, cpc: 0.39, ctr: 2.21, leads: 48, contactados: 40, ventas: 12, ingreso: 1440 },
      { date: "2025-05-02", inversion: 135, alcance: 9100, cpm: 8.54, cpc: 0.40, ctr: 2.15, leads: 52, contactados: 44, ventas: 14, ingreso: 1680 },
      { date: "2025-05-03", inversion: 110, alcance: 7400, cpm: 8.53, cpc: 0.39, ctr: 2.17, leads: 41, contactados: 35, ventas: 10, ingreso: 1200 },
      { date: "2025-05-04", inversion: 150, alcance: 10500, cpm: 8.24, cpc: 0.38, ctr: 2.14, leads: 60, contactados: 51, ventas: 16, ingreso: 1920 },
      { date: "2025-05-05", inversion: 130, alcance: 8900, cpm: 8.39, cpc: 0.39, ctr: 2.13, leads: 50, contactados: 42, ventas: 13, ingreso: 1560 },
    ]
  },
  {
    id: "c2", name: "TechStore EC", username: "techstore", password: "tech456",
    niche: "web", logo: "TS", color: "#0891B2",
    producto: "Electrónicos y accesorios", email: "tech@ejemplo.com",
    telefono: "0987654321", direccion: "Av. Naciones Unidas, Quito",
    representante: "Carlos Pérez",
    serviciosContratados: ["estrategia", "pauta", "analisis"],
    checklist: {},
    cuentas: [],
    contratos: [],
    records: [
      { date: "2025-05-01", inversion: 200, alcance: 15000, cpm: 7.14, cpc: 0.36, ctr: 2.0, sesiones: 480, agregar_carrito: 96, compras: 22, ingreso: 3300, roas: 16.5 },
      { date: "2025-05-02", inversion: 220, alcance: 16400, cpm: 7.28, cpc: 0.36, ctr: 2.02, sesiones: 520, agregar_carrito: 104, compras: 25, ingreso: 3750, roas: 17.05 },
      { date: "2025-05-03", inversion: 185, alcance: 13800, cpm: 7.28, cpc: 0.36, ctr: 2.01, sesiones: 440, agregar_carrito: 88, compras: 19, ingreso: 2850, roas: 15.41 },
    ]
  }
];

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0F0F13;--surface:#18181F;--surface2:#22222C;--border:#2A2A38;
    --text:#F0EFF8;--muted:#7B7A8E;--accent:#7C3AED;--accent2:#0EA5E9;
    --green:#10B981;--red:#EF4444;--amber:#F59E0B;--orange:#F97316;
    --font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;--r:10px;--r2:16px;
  }
  html,body,#root{height:100%;width:100%}
  body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px}
  .app{display:flex;min-height:100vh}

  /* LOGIN */
  .login{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;background:var(--bg)}
  .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2.5rem;width:100%;max-width:400px}
  .login-logo{font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:2rem}
  .login-title{font-size:24px;font-weight:600;margin-bottom:.4rem}
  .login-sub{color:var(--muted);font-size:13px;margin-bottom:2rem}

  /* FIELDS */
  .field{margin-bottom:1rem}
  .field label{display:block;font-size:12px;font-weight:500;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
  .input-wrap{position:relative}
  .input-wrap input{padding-right:40px}
  .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:flex;align-items:center}
  .eye-btn:hover{color:var(--text)}
  input,select,textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)}
  textarea{resize:vertical;min-height:80px}

  /* BUTTONS */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--r);font-family:var(--font);font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{opacity:.88}.btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--muted)}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--border)}.btn-danger:hover{border-color:var(--red);background:rgba(239,68,68,.08)}
  .btn-green{background:var(--green);color:#fff}.btn-green:hover{opacity:.88}
  .btn-sm{padding:6px 12px;font-size:12px}.btn-full{width:100%}
  .err{color:var(--red);font-size:12px;margin-top:8px}

  /* LAYOUT */
  .sidebar{width:230px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:100vh;flex-shrink:0}
  .sidebar-logo{padding:1.5rem 1.25rem 1rem;border-bottom:1px solid var(--border)}
  .sidebar-logo-badge{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--accent);text-transform:uppercase;background:rgba(124,58,237,.12);padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px}
  .sidebar-logo-name{font-size:15px;font-weight:600}
  .sidebar-logo-role{font-size:11px;color:var(--muted);margin-top:2px}
  .nav{padding:1rem .75rem;flex:1;overflow-y:auto}
  .nav-label{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;padding:0 .5rem;margin-bottom:6px;margin-top:16px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;color:var(--muted);font-size:13px;font-weight:500;transition:all .15s;margin-bottom:2px;user-select:none}
  .nav-item:hover{background:var(--surface2);color:var(--text)}
  .nav-item.active{background:rgba(124,58,237,.15);color:var(--accent)}
  .nav-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .sidebar-footer{padding:1rem 1.25rem;border-top:1px solid var(--border)}
  .main{flex:1;display:flex;flex-direction:column;min-width:0}
  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .topbar-title{font-size:16px;font-weight:600}
  .content{padding:1.5rem;flex:1;overflow-y:auto}

  /* CARDS */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem}
  .card-title{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}

  /* METRICS */
  .metric{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1rem}
  .metric-label{font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .metric-value{font-size:22px;font-weight:600;font-family:var(--mono);line-height:1}
  .metric-sub{font-size:11px;color:var(--muted);margin-top:4px}

  /* TABLE */
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
  .tbl td{padding:10px 12px;border-bottom:1px solid rgba(42,42,56,.5);font-size:13px}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tr:hover td{background:var(--surface2)}

  /* BADGES */
  .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-wa{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-web{background:rgba(14,165,233,.12);color:var(--accent2)}
  .badge-launch{background:rgba(249,115,22,.12);color:var(--orange)}
  .badge-paid{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-partial{background:rgba(245,158,11,.12);color:var(--amber)}
  .badge-pending{background:rgba(239,68,68,.12);color:var(--red)}

  /* AVATAR */
  .avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}

  /* FORM ROWS */
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  .form-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem}
  .form-row-full{margin-bottom:1rem}
  .section-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1.5rem 0 .75rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}

  /* TABS */
  .tab-row{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:1.25rem;flex-wrap:wrap}
  .tab{padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--font)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:hover:not(.active){color:var(--text)}

  /* FILTER */
  .filter-bar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .period-pills{display:flex;gap:4px;flex-wrap:wrap}
  .pill{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;font-family:var(--font);transition:all .15s}
  .pill.active,.pill:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

  /* PROGRESS BAR */
  .progress-wrap{margin-bottom:1.5rem}
  .progress-stages{display:flex;gap:4px;margin-bottom:.75rem}
  .stage-block{flex:1;position:relative;cursor:pointer}
  .stage-bar{height:8px;border-radius:4px;transition:all .3s;position:relative}
  .stage-label{font-size:10px;font-weight:600;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage-tooltip{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:11px;white-space:nowrap;z-index:100;pointer-events:none;opacity:0;transition:opacity .15s;min-width:160px}
  .stage-block:hover .stage-tooltip{opacity:1}

  /* CHECKLIST */
  .checklist-wrap{display:flex;flex-direction:column;gap:.5rem}
  .check-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:13px}
  .check-item.done{opacity:.6;text-decoration:line-through}
  .check-item input[type=checkbox]{width:16px;height:16px;cursor:pointer;accent-color:var(--accent)}
  .check-sub{margin-left:26px;font-size:12px;color:var(--muted)}
  .upgrade-badge{font-size:10px;background:rgba(249,115,22,.12);color:var(--orange);padding:2px 7px;border-radius:10px;font-weight:600;margin-left:auto;white-space:nowrap}

  /* SERVICIOS */
  .servicio-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .servicio-chip.selected{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  .chips-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:.5rem}

  /* CUENTAS */
  .cuenta-row{display:grid;grid-template-columns:180px 1fr 1fr auto;gap:.75rem;align-items:center;margin-bottom:.75rem}

  /* CONTRATO */
  .contrato-card{background:var(--surface2);border-radius:var(--r);padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .estado-pago{display:flex;align-items:center;gap:8px;margin-top:.75rem;flex-wrap:wrap}

  /* CHART */
  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:1rem}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:4px;transition:opacity .15s;cursor:pointer}
  .bar:hover{opacity:.7}

  /* AI REPORT */
  .ai-report{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .ai-report-header{display:flex;align-items:center;gap:8px;margin-bottom:.75rem;font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em}
  .ai-report-body{font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}
  .streaming-cursor::after{content:'▌';animation:blink .7s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

  .scroll-x{overflow-x:auto}
  .empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
  .divider{height:1px;background:var(--border);margin:1.25rem 0}
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
  .sec-title{font-size:15px;font-weight:600}
  .info-row{display:flex;gap:.5rem;align-items:baseline;margin-bottom:.5rem;font-size:13px}
  .info-label{color:var(--muted);min-width:140px;font-size:12px}

  @media(max-width:640px){.sidebar{display:none}.grid4{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:1fr 1fr}.form-row,.form-row3{grid-template-columns:1fr}.cuenta-row{grid-template-columns:1fr 1fr;grid-template-rows:auto auto}}
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n, dec = 0) => isNaN(n) ? "—" : Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;

function filterByPeriod(records, period, from, to) {
  const now = new Date();
  return (records || []).filter(r => {
    const d = new Date(r.date + "T12:00:00");
    if (period === "custom") return (!from || d >= new Date(from + "T00:00:00")) && (!to || d <= new Date(to + "T23:59:59"));
    if (period === "7d") { const l = new Date(now); l.setDate(l.getDate() - 7); return d >= l; }
    if (period === "30d") { const l = new Date(now); l.setDate(l.getDate() - 30); return d >= l; }
    if (period === "mtd") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

function buildTotals(niche, rows) {
  if (!rows.length) return {};
  const inv = sum(rows, "inversion"), leads = sum(rows, "leads"), ventas = sum(rows, "ventas");
  const contactados = sum(rows, "contactados"), ingreso = sum(rows, "ingreso");
  const sesiones = sum(rows, "sesiones"), compras = sum(rows, "compras"), agregar = sum(rows, "agregar_carrito");
  const alcance = sum(rows, "alcance");
  return {
    inversion: fmt(inv, 2), alcance: fmt(alcance), leads: fmt(leads),
    contactados: fmt(contactados), ventas: fmt(ventas), ingreso: fmt(ingreso, 2),
    cpm: fmt(avg(rows, "cpm"), 2), cpc: fmt(avg(rows, "cpc"), 2), ctr: fmt(avg(rows, "ctr"), 2),
    tasaContacto: leads ? fmt(contactados / leads * 100, 1) : "—",
    tasaCierre: contactados ? fmt(ventas / contactados * 100, 1) : "—",
    cpl: leads ? fmt(inv / leads, 2) : "—",
    cpv: ventas ? fmt(inv / ventas, 2) : "—",
    roas: inv ? fmt(ingreso / inv, 2) : "—",
    sesiones: fmt(sesiones), agregar_carrito: fmt(agregar), compras: fmt(compras),
    convRate: sesiones ? fmt(compras / sesiones * 100, 2) : "—",
    cpp: compras ? fmt(inv / compras, 2) : "—",
    clientesPotenciales: fmt(sum(rows, "clientesPotenciales")),
    formularios: fmt(sum(rows, "formularios")),
    costo_formulario: sum(rows,"formularios") ? fmt(inv / sum(rows,"formularios"), 2) : "—",
  };
}

// ─── AI REPORT ────────────────────────────────────────────────────────────────
async function generateReport(client, rows, setReport, setLoading) {
  const apiKey = typeof import !== "undefined" ? (window.__ENV_KEY__ || "") : "";
  setLoading(true); setReport("");
  const t = buildTotals(client.niche, rows);
  const prompt = `Eres experto en marketing digital. Reporte ejecutivo en español para "${client.name}" (${client.niche}).\nDatos: Inversión $${t.inversion} | Alcance ${t.alcance} | CPM $${t.cpm} | CPC $${t.cpc} | CTR ${t.ctr}%${client.niche==="whatsapp"?` | Leads ${t.leads} | Ventas ${t.ventas} | ROAS ${t.roas}x`:client.niche==="web"?` | Sesiones ${t.sesiones} | Compras ${t.compras} | ROAS ${t.roas}x`:` | Formularios ${t.formularios} | CPF $${t.costo_formulario}`}\n\n3 párrafos cortos: resumen, puntos clave/alertas, recomendación accionable. Tono profesional cercano. Sin bullets.`;
  try {
    const VITE_KEY = typeof __VITE_KEY__ !== "undefined" ? __VITE_KEY__ : "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": VITE_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, stream: true, messages: [{ role: "user", content: prompt }] })
    });
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const d = l.slice(5).trim(); if (d === "[DONE]") break;
        try { const j = JSON.parse(d); if (j.type === "content_block_delta" && j.delta?.text) setReport(r => r + j.delta.text); } catch {}
      }
    }
  } catch { setReport("Configura VITE_ANTHROPIC_KEY en Vercel para activar esta función."); }
  setLoading(false);
}

// ─── EYE BUTTON ───────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder || "••••••••"} />
      <button type="button" className="eye-btn" onClick={() => setShow(s => !s)}>
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ client, isAdmin, onUpdate }) {
  const servicios = client.serviciosContratados || [];
  const checklist = client.checklist || {};
  const allStages = SERVICIOS_DEFAULT;

  function getStageProgress(svc) {
    const items = checklist[svc.id] || {};
    const total = svc.subetapas.length;
    const done = svc.subetapas.filter(s => items[s]).length;
    return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
  }

  const contratado = (id) => servicios.includes(id);

  return (
    <div className="progress-wrap card">
      <div className="card-title">Progreso del proyecto</div>
      <div className="progress-stages">
        {allStages.map(svc => {
          const { done, total, pct } = getStageProgress(svc);
          const activo = contratado(svc.id);
          const bg = activo ? (pct === 100 ? "var(--green)" : pct > 0 ? "var(--accent)" : "var(--border)") : "var(--surface2)";
          const subTexto = svc.subetapas.map(s => `${checklist[svc.id]?.[s] ? "✓" : "○"} ${s}`).join("\n");
          return (
            <div key={svc.id} className="stage-block">
              <div className="stage-tooltip">
                <div style={{ fontWeight: 600, marginBottom: 4, color: activo ? "var(--text)" : "var(--muted)" }}>{svc.nombre} {!activo && <span style={{ fontSize: 10, color: "var(--orange)", fontWeight: 600 }}>UPGRADE</span>}</div>
                {activo ? <div style={{ color: "var(--muted)", whiteSpace: "pre", fontSize: 11 }}>{subTexto}</div> : <div style={{ color: "var(--muted)", fontSize: 11 }}>No contratado</div>}
                {activo && <div style={{ color: "var(--accent)", fontWeight: 600, marginTop: 4 }}>{done}/{total} completadas</div>}
              </div>
              <div className="stage-bar" style={{ background: bg, opacity: activo ? 1 : 0.3, height: activo && pct > 0 ? `${Math.max(8, pct / 10 + 4)}px` : "8px" }} />
              <div className="stage-label" style={{ color: activo ? "var(--text)" : "var(--muted)", fontSize: 9 }}>{svc.nombre}</div>
              {activo && <div style={{ textAlign: "center", fontSize: 9, color: "var(--muted)" }}>{pct}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CHECKLIST (solo admin) ───────────────────────────────────────────────────
function ChecklistPanel({ client, onUpdate }) {
  const checklist = client.checklist || {};
  const servicios = client.serviciosContratados || [];

  function toggle(svcId, subetapa) {
    const updated = {
      ...checklist,
      [svcId]: { ...(checklist[svcId] || {}), [subetapa]: !checklist[svcId]?.[subetapa] }
    };
    onUpdate({ ...client, checklist: updated });
  }

  return (
    <div>
      {SERVICIOS_DEFAULT.map(svc => {
        const activo = servicios.includes(svc.id);
        return (
          <div key={svc.id} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.nombre}</div>
              {!activo && <span className="upgrade-badge">UPGRADE</span>}
              {activo && (() => {
                const done = svc.subetapas.filter(s => checklist[svc.id]?.[s]).length;
                return <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{done}/{svc.subetapas.length}</span>;
              })()}
            </div>
            <div className="checklist-wrap">
              {svc.subetapas.map(sub => (
                <div key={sub} className={`check-item${checklist[svc.id]?.[sub] ? " done" : ""}`}
                  style={{ opacity: activo ? 1 : 0.4, cursor: activo ? "pointer" : "default" }}
                  onClick={() => activo && toggle(svc.id, sub)}>
                  <input type="checkbox" checked={!!checklist[svc.id]?.[sub]} readOnly disabled={!activo} />
                  <span>{sub}</span>
                  {!activo && <span className="upgrade-badge" style={{ marginLeft: "auto" }}>No contratado</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CUENTAS PANEL ────────────────────────────────────────────────────────────
function CuentasPanel({ client, onUpdate, readOnly }) {
  const cuentas = client.cuentas || [];

  function addCuenta() {
    onUpdate({ ...client, cuentas: [...cuentas, { red: "facebook", usuario: "", password: "" }] });
  }

  function updateCuenta(i, field, val) {
    const c = cuentas.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
    onUpdate({ ...client, cuentas: c });
  }

  function removeCuenta(i) {
    onUpdate({ ...client, cuentas: cuentas.filter((_, idx) => idx !== i) });
  }

  if (readOnly) return (
    <div className="card">
      <div className="card-title">Cuentas vinculadas</div>
      {cuentas.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Sin cuentas registradas.</div>}
      {cuentas.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
          <span style={{ color: "var(--muted)", minWidth: 150 }}>{REDES_SOCIALES.find(r => r.id === c.red)?.label || c.red}</span>
          <span>{c.usuario}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card">
      <div className="sec-header">
        <div className="card-title" style={{ margin: 0 }}>Cuentas y accesos</div>
        <button className="btn btn-ghost btn-sm" onClick={addCuenta}>+ Añadir cuenta</button>
      </div>
      {cuentas.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>Sin cuentas. Añade la primera.</div>}
      {cuentas.map((c, i) => (
        <div key={i} className="cuenta-row">
          <select value={c.red} onChange={e => updateCuenta(i, "red", e.target.value)}>
            {REDES_SOCIALES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <input type="text" value={c.usuario} onChange={e => updateCuenta(i, "usuario", e.target.value)} placeholder="Usuario / correo" />
          <input type="text" value={c.password} onChange={e => updateCuenta(i, "password", e.target.value)} placeholder="Contraseña" />
          <button className="btn btn-danger btn-sm" onClick={() => removeCuenta(i)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── CONTRATOS PANEL ──────────────────────────────────────────────────────────
function ContratosPanel({ client, onUpdate }) {
  const contratos = client.contratos || [];

  function addContrato() {
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevosServicios = (client.serviciosContratados || []).map(id => {
      const svc = SERVICIOS_DEFAULT.find(s => s.id === id);
      return { id, nombre: svc?.nombre || id, precio: "" };
    });
    onUpdate({
      ...client,
      contratos: [...contratos, {
        id: "ct" + Date.now(),
        fechaInicio: hoy,
        fechaFin: "",
        servicios: nuevosServicios,
        totalContrato: "",
        cuota1: { monto: "", pagado: false, fecha: "" },
        cuota2: { monto: "", pagado: false, fecha: "" },
        notas: "",
      }]
    });
  }

  function updateContrato(i, field, val) {
    const c = contratos.map((ct, idx) => idx === i ? { ...ct, [field]: val } : ct);
    onUpdate({ ...client, contratos: c });
  }

  function updateCuota(i, cuota, field, val) {
    const c = contratos.map((ct, idx) => idx === i ? { ...ct, [cuota]: { ...ct[cuota], [field]: val } } : ct);
    onUpdate({ ...client, contratos: c });
  }

  function removeContrato(i) {
    if (!window.confirm("¿Eliminar este contrato?")) return;
    onUpdate({ ...client, contratos: contratos.filter((_, idx) => idx !== i) });
  }

  function getEstado(ct) {
    const p1 = ct.cuota1?.pagado, p2 = ct.cuota2?.pagado;
    if (p1 && p2) return { label: "Pago completo", cls: "badge-paid" };
    if (p1) return { label: "50% pagado", cls: "badge-partial" };
    return { label: "Pendiente", cls: "badge-pending" };
  }

  return (
    <div>
      <div className="sec-header">
        <div className="sec-title">Historial de contratos</div>
        <button className="btn btn-primary btn-sm" onClick={addContrato}>+ Nuevo contrato</button>
      </div>
      {contratos.length === 0 && <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📋</div><div>Sin contratos registrados.</div></div>}
      {contratos.map((ct, i) => {
        const estado = getEstado(ct);
        return (
          <div key={ct.id} className="contrato-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Contrato #{i + 1}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`badge ${estado.cls}`}>{estado.label}</span>
                <button className="btn btn-danger btn-sm" onClick={() => removeContrato(i)}>Eliminar</button>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Fecha inicio</label><input type="date" value={ct.fechaInicio} onChange={e => updateContrato(i, "fechaInicio", e.target.value)} /></div>
              <div className="field"><label>Fecha fin</label><input type="date" value={ct.fechaFin} onChange={e => updateContrato(i, "fechaFin", e.target.value)} /></div>
            </div>
            <div className="field" style={{ marginBottom: "1rem" }}>
              <label>Servicios contratados</label>
              <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
                {(ct.servicios || []).map(s => s.nombre).join(" · ") || "Sin servicios"}
              </div>
              {(ct.servicios || []).map((s, si) => (
                <div key={si} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, minWidth: 120 }}>{s.nombre}</span>
                  <input type="number" value={s.precio} onChange={e => {
                    const svcs = ct.servicios.map((sv, xi) => xi === si ? { ...sv, precio: e.target.value } : sv);
                    updateContrato(i, "servicios", svcs);
                  }} placeholder="$0.00" style={{ maxWidth: 120 }} />
                </div>
              ))}
            </div>
            <div className="field" style={{ marginBottom: "1rem" }}>
              <label>Total del contrato ($)</label>
              <input type="number" value={ct.totalContrato} onChange={e => updateContrato(i, "totalContrato", e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-row">
              <div style={{ background: "var(--bg)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Cuota 1 — 50% al inicio</div>
                <input type="number" value={ct.cuota1?.monto} onChange={e => updateCuota(i, "cuota1", "monto", e.target.value)} placeholder="Monto ($)" style={{ marginBottom: 8 }} />
                <input type="date" value={ct.cuota1?.fecha} onChange={e => updateCuota(i, "cuota1", "fecha", e.target.value)} style={{ marginBottom: 8 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!ct.cuota1?.pagado} onChange={e => updateCuota(i, "cuota1", "pagado", e.target.checked)} style={{ width: 16, height: 16 }} />
                  Pagado
                </label>
              </div>
              <div style={{ background: "var(--bg)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Cuota 2 — 50% a la entrega</div>
                <input type="number" value={ct.cuota2?.monto} onChange={e => updateCuota(i, "cuota2", "monto", e.target.value)} placeholder="Monto ($)" style={{ marginBottom: 8 }} />
                <input type="date" value={ct.cuota2?.fecha} onChange={e => updateCuota(i, "cuota2", "fecha", e.target.value)} style={{ marginBottom: 8 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!ct.cuota2?.pagado} onChange={e => updateCuota(i, "cuota2", "pagado", e.target.checked)} style={{ width: 16, height: 16 }} />
                  Pagado
                </label>
              </div>
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Notas del contrato</label>
              <textarea value={ct.notas} onChange={e => updateContrato(i, "notas", e.target.value)} placeholder="Observaciones, acuerdos especiales..." />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CLIENT FORM ──────────────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }) {
  const blank = {
    name: "", username: "", password: "", niche: "whatsapp", color: "#7C3AED", logo: "",
    producto: "", email: "", telefono: "", direccion: "", representante: "",
    serviciosContratados: [], checklist: {}, cuentas: [], contratos: [],
  };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : blank);
  const [serviciosCustom, setServiciosCustom] = useState([]);
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: "", subetapas: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function toggleServicio(id) {
    const arr = form.serviciosContratados;
    f("serviciosContratados", arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  }

  function addServicioCustom() {
    if (!nuevoServicio.nombre) return;
    const id = "custom_" + Date.now();
    const subs = nuevoServicio.subetapas.split(",").map(s => s.trim()).filter(Boolean);
    setServiciosCustom(p => [...p, { id, nombre: nuevoServicio.nombre, subetapas: subs }]);
    f("serviciosContratados", [...form.serviciosContratados, id]);
    setNuevoServicio({ nombre: "", subetapas: "" });
  }

  const todosServicios = [...SERVICIOS_DEFAULT, ...serviciosCustom];

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="section-label">Información del negocio</div>
      <div className="form-row">
        <div className="field"><label>Nombre del negocio</label><input type="text" value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ej: Bella Estética" /></div>
        <div className="field"><label>Producto / Servicio</label><input type="text" value={form.producto} onChange={e => f("producto", e.target.value)} placeholder="Ej: Tratamientos faciales" /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Nombre del representante</label><input type="text" value={form.representante} onChange={e => f("representante", e.target.value)} placeholder="Nombre completo" /></div>
        <div className="field"><label>Teléfono</label><input type="text" value={form.telefono} onChange={e => f("telefono", e.target.value)} placeholder="0991234567" /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Correo electrónico</label><input type="text" value={form.email} onChange={e => f("email", e.target.value)} placeholder="correo@empresa.com" /></div>
        <div className="field"><label>Dirección</label><input type="text" value={form.direccion} onChange={e => f("direccion", e.target.value)} placeholder="Ciudad, dirección" /></div>
      </div>

      <div className="section-label">Acceso al portal</div>
      <div className="form-row">
        <div className="field"><label>Iniciales (logo)</label><input type="text" value={form.logo} onChange={e => f("logo", e.target.value.slice(0, 2).toUpperCase())} placeholder="BE" maxLength={2} /></div>
        <div className="field"><label>Color de marca</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={form.color} onChange={e => f("color", e.target.value)} style={{ width: 44, height: 40, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{form.color}</span>
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label>Usuario</label><input type="text" value={form.username} onChange={e => f("username", e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="bellastetica" /></div>
        <div className="field"><label>Contraseña</label><PasswordInput value={form.password} onChange={e => f("password", e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Nicho</label>
        <select value={form.niche} onChange={e => f("niche", e.target.value)}>
          <option value="whatsapp">Venta por WhatsApp</option>
          <option value="web">Sitio web / E-commerce</option>
          <option value="lanzamiento">Lanzamiento (Leads / Formularios)</option>
        </select>
      </div>

      <div className="section-label">Servicios contratados</div>
      <div className="chips-wrap">
        {todosServicios.map(svc => (
          <div key={svc.id} className={`servicio-chip ${form.serviciosContratados.includes(svc.id) ? "selected" : ""}`} onClick={() => toggleServicio(svc.id)}>
            {form.serviciosContratados.includes(svc.id) ? "✓ " : ""}{svc.nombre}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: "var(--surface2)", borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>+ Crear servicio personalizado</div>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <input type="text" value={nuevoServicio.nombre} onChange={e => setNuevoServicio(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del servicio" />
          <input type="text" value={nuevoServicio.subetapas} onChange={e => setNuevoServicio(p => ({ ...p, subetapas: e.target.value }))} placeholder="Subetapas separadas por coma" />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={addServicioCustom}>Añadir servicio</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
        <button className="btn btn-primary" onClick={() => {
          if (!form.name || !form.username || !form.password) return alert("Completa nombre, usuario y contraseña.");
          onSave(form);
        }}>{initial ? "Guardar cambios" : "Crear cliente"}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── ADD RECORD FORM ──────────────────────────────────────────────────────────
function AddRecordForm({ client, onSave, onCancel }) {
  const isWA = client.niche === "whatsapp";
  const isWeb = client.niche === "web";
  const isLaunch = client.niche === "lanzamiento";
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, inversion: "", alcance: "", cpm: "", cpc: "", ctr: "", leads: "", contactados: "", ventas: "", ingreso: "", sesiones: "", agregar_carrito: "", compras: "", roas: "", clientesPotenciales: "", formularios: "", costo_formulario: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function handleSave() {
    const rec = { date: form.date };
    Object.entries(form).forEach(([k, v]) => { if (k !== "date" && v !== "") rec[k] = parseFloat(v) || 0; });
    onSave(rec);
  }
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="sec-title" style={{ marginBottom: "1.25rem" }}>Nuevo registro — {client.name}</div>
      <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
      <div className="section-label">Pauta</div>
      <div className="form-row">
        <div className="field"><label>Inversión ($)</label><input type="number" value={form.inversion} onChange={e => f("inversion", e.target.value)} placeholder="0" /></div>
        <div className="field"><label>Alcance</label><input type="number" value={form.alcance} onChange={e => f("alcance", e.target.value)} placeholder="0" /></div>
      </div>
      <div className="form-row3">
        <div className="field"><label>CPM ($)</label><input type="number" value={form.cpm} onChange={e => f("cpm", e.target.value)} /></div>
        <div className="field"><label>CPC ($)</label><input type="number" value={form.cpc} onChange={e => f("cpc", e.target.value)} /></div>
        <div className="field"><label>CTR (%)</label><input type="number" value={form.ctr} onChange={e => f("ctr", e.target.value)} /></div>
      </div>
      {isWA && <>
        <div className="section-label">Ventas WhatsApp</div>
        <div className="form-row"><div className="field"><label>Leads</label><input type="number" value={form.leads} onChange={e => f("leads", e.target.value)} /></div><div className="field"><label>Contactados</label><input type="number" value={form.contactados} onChange={e => f("contactados", e.target.value)} /></div></div>
        <div className="form-row"><div className="field"><label>Ventas cerradas</label><input type="number" value={form.ventas} onChange={e => f("ventas", e.target.value)} /></div><div className="field"><label>Ingresos ($)</label><input type="number" value={form.ingreso} onChange={e => f("ingreso", e.target.value)} /></div></div>
      </>}
      {isWeb && <>
        <div className="section-label">E-commerce</div>
        <div className="form-row"><div className="field"><label>Sesiones</label><input type="number" value={form.sesiones} onChange={e => f("sesiones", e.target.value)} /></div><div className="field"><label>Agregar carrito</label><input type="number" value={form.agregar_carrito} onChange={e => f("agregar_carrito", e.target.value)} /></div></div>
        <div className="form-row3"><div className="field"><label>Compras</label><input type="number" value={form.compras} onChange={e => f("compras", e.target.value)} /></div><div className="field"><label>Ingresos ($)</label><input type="number" value={form.ingreso} onChange={e => f("ingreso", e.target.value)} /></div><div className="field"><label>ROAS</label><input type="number" value={form.roas} onChange={e => f("roas", e.target.value)} /></div></div>
      </>}
      {isLaunch && <>
        <div className="section-label">Lanzamiento / Leads</div>
        <div className="form-row"><div className="field"><label>Clientes potenciales</label><input type="number" value={form.clientesPotenciales} onChange={e => f("clientesPotenciales", e.target.value)} /></div><div className="field"><label>Formularios</label><input type="number" value={form.formularios} onChange={e => f("formularios", e.target.value)} /></div></div>
      </>}
      <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
        <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── PERIOD FILTER ────────────────────────────────────────────────────────────
function PeriodFilter({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="filter-bar">
      <div className="period-pills">
        {["7d","mtd","30d","all","custom"].map(p => (
          <button key={p} className={`pill ${period===p?"active":""}`} onClick={()=>setPeriod(p)}>
            {p==="7d"?"7 días":p==="mtd"?"Este mes":p==="30d"?"30 días":p==="all"?"Todo":"Rango"}
          </button>
        ))}
      </div>
      {period==="custom"&&<>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{width:"auto"}}/>
        <span style={{color:"var(--muted)",fontSize:12}}>a</span>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{width:"auto"}}/>
      </>}
    </div>
  );
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className="metric" style={highlight?{borderColor:"rgba(124,58,237,.5)"}:{}}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={highlight?{color:"var(--accent)"}:{}}>{value}</div>
      {sub&&<div className="metric-sub">{sub}</div>}
    </div>
  );
}

function MiniChart({ rows, field, color }) {
  if(!rows.length) return null;
  const vals=rows.map(r=>Number(r[field])||0); const max=Math.max(...vals,1);
  return <div className="chart-bars">{vals.map((v,i)=><div key={i} className="bar" style={{height:`${(v/max)*100}%`,background:color||"var(--accent)",opacity:.75}} title={`${rows[i].date}: ${v}`}/>)}</div>;
}

// ─── ADMIN CLIENT DETAIL ──────────────────────────────────────────────────────
function AdminClientDetail({ client, onBack, onUpdate }) {
  const [tab, setTab] = useState("info");
  const [adding, setAdding] = useState(false);
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);

  const rows = filterByPeriod(client.records || [], period, from, to).sort((a,b)=>a.date.localeCompare(b.date));
  const isWA = client.niche==="whatsapp"; const isWeb=client.niche==="web"; const isLaunch=client.niche==="lanzamiento";
  const t = buildTotals(client.niche, rows);
  const nicheLabel = isWA?"WhatsApp":isWeb?"Sitio web":"Lanzamiento";

  if (adding) return <div className="content"><AddRecordForm client={client} onSave={rec=>{onUpdate({...client,records:[...(client.records||[]),rec]});setAdding(false);}} onCancel={()=>setAdding(false)}/></div>;

  return (
    <div className="main">
      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
          <div className="avatar" style={{background:client.color+"22",color:client.color}}>{client.logo||client.name.slice(0,2).toUpperCase()}</div>
          <div>
            <div className="topbar-title">{client.name}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{nicheLabel} · @{client.username}</div>
          </div>
        </div>
        {tab==="metricas"&&<button className="btn btn-primary btn-sm" onClick={()=>setAdding(true)}>+ Nuevo registro</button>}
      </div>
      <div className="content">
        <div className="tab-row">
          {["info","checklist","cuentas","contratos","metricas","reporte"].map(t2=>(
            <button key={t2} className={`tab ${tab===t2?"active":""}`} onClick={()=>setTab(t2)}>
              {t2==="info"?"Perfil":t2==="checklist"?"Checklist":t2==="cuentas"?"Cuentas":t2==="contratos"?"Contratos":t2==="metricas"?"Métricas":"Reporte IA"}
            </button>
          ))}
        </div>

        {tab==="info"&&(
          <div>
            <ProgressBar client={client} isAdmin={true} onUpdate={onUpdate}/>
            <div className="card">
              <div className="card-title">Información del cliente</div>
              <div className="grid2">
                <div>
                  {[["Negocio",client.name],["Representante",client.representante],["Producto/Servicio",client.producto],["Teléfono",client.telefono],["Email",client.email],["Dirección",client.direccion]].map(([l,v])=>(
                    <div key={l} className="info-row"><span className="info-label">{l}</span><span>{v||<span style={{color:"var(--muted)"}}>—</span>}</span></div>
                  ))}
                </div>
                <div>
                  {[["Usuario",client.username],["Nicho",nicheLabel],["Servicios",(client.serviciosContratados||[]).map(id=>SERVICIOS_DEFAULT.find(s=>s.id===id)?.nombre||id).join(", ")||"—"]].map(([l,v])=>(
                    <div key={l} className="info-row"><span className="info-label">{l}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==="checklist"&&<ChecklistPanel client={client} onUpdate={onUpdate}/>}
        {tab==="cuentas"&&<CuentasPanel client={client} onUpdate={onUpdate} readOnly={false}/>}
        {tab==="contratos"&&<ContratosPanel client={client} onUpdate={onUpdate}/>}

        {tab==="metricas"&&<>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
          <div className="grid4" style={{marginBottom:"1rem"}}>
            <MetricCard label="Inversión" value={"$"+t.inversion}/>
            <MetricCard label="Alcance" value={t.alcance}/>
            <MetricCard label="CPM" value={"$"+t.cpm}/>
            <MetricCard label="ROAS" value={(t.roas||"—")+"x"} highlight/>
          </div>
          {isWA&&<div className="grid4" style={{marginBottom:"1rem"}}>
            <MetricCard label="Leads" value={t.leads}/><MetricCard label="Contactados" value={t.contactados}/><MetricCard label="Ventas" value={t.ventas}/><MetricCard label="Ingresos" value={"$"+t.ingreso} highlight/>
          </div>}
          {isWeb&&<div className="grid4" style={{marginBottom:"1rem"}}>
            <MetricCard label="Sesiones" value={t.sesiones}/><MetricCard label="Carrito" value={t.agregar_carrito}/><MetricCard label="Compras" value={t.compras}/><MetricCard label="Ingresos" value={"$"+t.ingreso} highlight/>
          </div>}
          {isLaunch&&<div className="grid3" style={{marginBottom:"1rem"}}>
            <MetricCard label="Clientes potenciales" value={t.clientesPotenciales}/><MetricCard label="Formularios" value={t.formularios}/><MetricCard label="Costo/formulario" value={"$"+t.costo_formulario} highlight/>
          </div>}
          <div className="card scroll-x">
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>
                {isWA&&<><th>Leads</th><th>Contactados</th><th>Ventas</th><th>Ingresos</th></>}
                {isWeb&&<><th>Sesiones</th><th>Carrito</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}
                {isLaunch&&<><th>Potenciales</th><th>Formularios</th></>}
                <th></th>
              </tr></thead>
              <tbody>
                {rows.length===0&&<tr><td colSpan={12} style={{color:"var(--muted)",textAlign:"center",padding:"2rem"}}>Sin registros.</td></tr>}
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontFamily:"var(--mono)",fontSize:12}}>{r.date}</td>
                    <td>${fmt(r.inversion,0)}</td><td>${fmt(r.cpm,2)}</td><td>${fmt(r.cpc,2)}</td><td>{fmt(r.ctr,2)}%</td>
                    {isWA&&<><td>{fmt(r.leads)}</td><td>{fmt(r.contactados)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso,0)}</td></>}
                    {isWeb&&<><td>{fmt(r.sesiones)}</td><td>{fmt(r.agregar_carrito)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso,0)}</td><td>{fmt(r.roas,2)}x</td></>}
                    {isLaunch&&<><td>{fmt(r.clientesPotenciales)}</td><td>{fmt(r.formularios)}</td></>}
                    <td><button className="btn btn-danger btn-sm" onClick={()=>{if(window.confirm("¿Eliminar?"))onUpdate({...client,records:(client.records||[]).filter((_,xi)=>xi!==i)})}}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {tab==="reporte"&&(
          <div>
            <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
            <button className="btn btn-primary" disabled={loadingReport||rows.length===0} onClick={()=>generateReport(client,rows,setReport,setLoadingReport)} style={{marginBottom:"1rem"}}>
              {loadingReport?"Generando...":"Generar reporte IA"}
            </button>
            {(report||loadingReport)&&<div className="ai-report">
              <div className="ai-report-header"><span>✦</span> Reporte · {client.name}</div>
              <div className={`ai-report-body ${loadingReport&&!report?"streaming-cursor":""}`}>{report||" "}{loadingReport&&report&&<span className="streaming-cursor"/>}</div>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDashboard({ client, onLogout }) {
  const [tab, setTab] = useState("resumen");
  const [period, setPeriod] = useState("mtd");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);
  const rows = filterByPeriod(client.records||[],period,from,to).sort((a,b)=>a.date.localeCompare(b.date));
  const t = buildTotals(client.niche, rows);
  const isWA=client.niche==="whatsapp"; const isWeb=client.niche==="web"; const isLaunch=client.niche==="lanzamiento";

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-badge">Mi panel</div>
          <div className="sidebar-logo-name">{client.name}</div>
          <div className="sidebar-logo-role">Cliente</div>
        </div>
        <div className="nav">
          <div className="nav-label">Vistas</div>
          {["resumen","detalle","reporte"].map(v=>(
            <div key={v} className={`nav-item ${tab===v?"active":""}`} onClick={()=>setTab(v)}>
              <div className="nav-dot" style={{background:tab===v?"var(--accent)":"var(--border)"}}/>
              {v==="resumen"?"Resumen":v==="detalle"?"Detalle diario":"Reporte IA"}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div className="avatar" style={{background:client.color+"22",color:client.color}}>{client.logo}</div>
            <div><div style={{fontSize:13,fontWeight:500}}>{client.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{isWA?"WhatsApp":isWeb?"Web":"Lanzamiento"}</div></div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{tab==="resumen"?"Resumen":tab==="detalle"?"Detalle diario":"Reporte IA"}</div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
        </div>
        <div className="content">
          <ProgressBar client={client} isAdmin={false} onUpdate={()=>{}}/>
          {tab==="resumen"&&<>
            <div style={{marginBottom:"1.25rem"}}>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Inversión del período</div>
              <div style={{fontSize:32,fontWeight:700,fontFamily:"var(--mono)"}}>${t.inversion||"0.00"}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{rows.length} días con datos</div>
            </div>
            <div className="grid4" style={{marginBottom:"1.25rem"}}>
              <MetricCard label="Alcance" value={t.alcance||"—"}/><MetricCard label="CPM" value={"$"+(t.cpm||"—")}/><MetricCard label="CPC" value={"$"+(t.cpc||"—")}/><MetricCard label="CTR" value={(t.ctr||"—")+"%"}/>
            </div>
            {isWA&&<div className="grid4"><MetricCard label="Leads" value={t.leads||"—"}/><MetricCard label="Contactados" value={t.contactados||"—"}/><MetricCard label="Ventas" value={t.ventas||"—"}/><MetricCard label="ROAS" value={(t.roas||"—")+"x"} highlight/></div>}
            {isWeb&&<div className="grid4"><MetricCard label="Sesiones" value={t.sesiones||"—"}/><MetricCard label="Compras" value={t.compras||"—"}/><MetricCard label="Ingresos" value={"$"+(t.ingreso||"0")} highlight/><MetricCard label="ROAS" value={(t.roas||"—")+"x"} highlight/></div>}
            {isLaunch&&<div className="grid3"><MetricCard label="Potenciales" value={t.clientesPotenciales||"—"}/><MetricCard label="Formularios" value={t.formularios||"—"}/><MetricCard label="Costo/form" value={"$"+(t.costo_formulario||"—")} highlight/></div>}
            {rows.length>1&&<div className="card" style={{marginTop:"1.25rem"}}><div className="card-title">Inversión diaria</div><MiniChart rows={rows} field="inversion" color={client.color}/><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--muted)",marginTop:6}}><span>{rows[0].date}</span><span>{rows[rows.length-1].date}</span></div></div>}
          </>}
          {tab==="detalle"&&<div className="card scroll-x">
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>
                {isWA&&<><th>Leads</th><th>Ventas</th><th>Ingresos</th></>}
                {isWeb&&<><th>Sesiones</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}
                {isLaunch&&<><th>Potenciales</th><th>Formularios</th></>}
              </tr></thead>
              <tbody>
                {rows.length===0&&<tr><td colSpan={10} style={{color:"var(--muted)",textAlign:"center",padding:"2rem"}}>Sin datos.</td></tr>}
                {rows.map((r,i)=><tr key={i}>
                  <td style={{fontFamily:"var(--mono)",fontSize:12}}>{r.date}</td>
                  <td>${fmt(r.inversion,0)}</td><td>${fmt(r.cpm,2)}</td><td>${fmt(r.cpc,2)}</td><td>{fmt(r.ctr,2)}%</td>
                  {isWA&&<><td>{fmt(r.leads)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso,0)}</td></>}
                  {isWeb&&<><td>{fmt(r.sesiones)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso,0)}</td><td>{fmt(r.roas,2)}x</td></>}
                  {isLaunch&&<><td>{fmt(r.clientesPotenciales)}</td><td>{fmt(r.formularios)}</td></>}
                </tr>)}
              </tbody>
            </table>
          </div>}
          {tab==="reporte"&&<div>
            <p style={{color:"var(--muted)",fontSize:13,marginBottom:"1rem"}}>Claude analiza tus métricas y genera un reporte ejecutivo personalizado.</p>
            <button className="btn btn-primary" disabled={loadingReport||rows.length===0} onClick={()=>generateReport(client,rows,setReport,setLoadingReport)}>
              {loadingReport?"Generando...":"Generar reporte IA"}
            </button>
            {(report||loadingReport)&&<div className="ai-report">
              <div className="ai-report-header"><span>✦</span> Reporte · {client.name}</div>
              <div className={`ai-report-body ${loadingReport&&!report?"streaming-cursor":""}`}>{report||" "}{loadingReport&&report&&<span className="streaming-cursor"/>}</div>
            </div>}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ clients, onLogout, onUpdate, onAddClient, onDeleteClient }) {
  const [view, setView] = useState("clientes");
  const [selectedId, setSelectedId] = useState(null);
  const [addingClient, setAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const selected = clients.find(c => c.id === selectedId);

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-badge">Admin</div>
        <div className="sidebar-logo-name">Jorge Falcones</div>
        <div className="sidebar-logo-role">Trafficker digital</div>
      </div>
      <div className="nav">
        <div className="nav-label">Panel</div>
        {["clientes","resumen"].map(v=>(
          <div key={v} className={`nav-item ${view===v&&!selectedId&&!addingClient&&!editingClient?"active":""}`} onClick={()=>{setSelectedId(null);setAddingClient(false);setEditingClient(null);setView(v);}}>
            <div className="nav-dot" style={{background:view===v&&!selectedId?"var(--accent)":"var(--border)"}}/>
            {v==="clientes"?"Mis clientes":"Resumen general"}
          </div>
        ))}
        {clients.length>0&&<>
          <div className="nav-label">Clientes</div>
          {clients.map(c=>(
            <div key={c.id} className={`nav-item ${selectedId===c.id?"active":""}`} onClick={()=>{setSelectedId(c.id);setAddingClient(false);setEditingClient(null);}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
            </div>
          ))}
        </>}
      </div>
      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  );

  if (selectedId && selected) return <div className="app"><Sidebar/><AdminClientDetail client={selected} onBack={()=>setSelectedId(null)} onUpdate={onUpdate}/></div>;

  if (addingClient) return (
    <div className="app"><Sidebar/>
      <div className="main">
        <div className="topbar"><button className="btn btn-ghost btn-sm" onClick={()=>setAddingClient(false)}>← Volver</button><div className="topbar-title">Nuevo cliente</div></div>
        <div className="content"><ClientForm onSave={c=>{onAddClient(c);setAddingClient(false);}} onCancel={()=>setAddingClient(false)}/></div>
      </div>
    </div>
  );

  if (editingClient) return (
    <div className="app"><Sidebar/>
      <div className="main">
        <div className="topbar"><button className="btn btn-ghost btn-sm" onClick={()=>setEditingClient(null)}>← Volver</button><div className="topbar-title">Editar: {editingClient.name}</div></div>
        <div className="content"><ClientForm initial={editingClient} onSave={c=>{onUpdate({...editingClient,...c});setEditingClient(null);}} onCancel={()=>setEditingClient(null)}/></div>
      </div>
    </div>
  );

  return (
    <div className="app"><Sidebar/>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{view==="clientes"?"Mis clientes":"Resumen general"}</div>
          {view==="clientes"&&<button className="btn btn-primary btn-sm" onClick={()=>setAddingClient(true)}>+ Nuevo cliente</button>}
        </div>
        <div className="content">
          {view==="clientes"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem"}}>
              {clients.map(c=>{
                const nicheLabel=c.niche==="whatsapp"?"WhatsApp":c.niche==="web"?"Web":"Lanzamiento";
                const niche_cls=c.niche==="whatsapp"?"badge-wa":c.niche==="web"?"badge-web":"badge-launch";
                return(
                  <div key={c.id} className="card" style={{cursor:"pointer",transition:"border-color .15s",marginBottom:0}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=c.color+"88"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className="avatar" style={{background:c.color+"22",color:c.color}}>{c.logo||c.name.slice(0,2).toUpperCase()}</div>
                        <div><div style={{fontWeight:600,fontSize:14}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{c.representante||"Sin representante"}</div></div>
                      </div>
                      <span className={`badge ${niche_cls}`}>{nicheLabel}</span>
                    </div>
                    <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>{(c.records||[]).length} registros · {(c.serviciosContratados||[]).length} servicios</div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>setSelectedId(c.id)}>Ver perfil</button>
                      <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setEditingClient(c);}}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar cliente?"))onDeleteClient(c.id);}}>×</button>
                    </div>
                  </div>
                );
              })}
              {clients.length===0&&<div className="empty"><div style={{fontSize:32,marginBottom:12,opacity:.3}}>◎</div><div>Sin clientes. Crea el primero.</div></div>}
            </div>
          )}
          {view==="resumen"&&(
            <div>
              <div className="grid4" style={{marginBottom:"1.25rem"}}>
                <MetricCard label="Total clientes" value={clients.length}/>
                <MetricCard label="WhatsApp" value={clients.filter(c=>c.niche==="whatsapp").length}/>
                <MetricCard label="Web" value={clients.filter(c=>c.niche==="web").length}/>
                <MetricCard label="Lanzamiento" value={clients.filter(c=>c.niche==="lanzamiento").length}/>
              </div>
              <div className="card">
                <div className="card-title">Inversión total por cliente</div>
                {clients.map(c=>{
                  const total=sum(c.records||[],"inversion");
                  const maxInv=Math.max(...clients.map(cc=>sum(cc.records||[],"inversion")),1);
                  return(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:110,fontSize:12,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                      <div style={{flex:1,background:"var(--surface2)",borderRadius:4,height:8,overflow:"hidden"}}>
                        <div style={{width:`${(total/maxInv)*100}%`,height:"100%",background:c.color,borderRadius:4}}/>
                      </div>
                      <div style={{fontSize:13,fontFamily:"var(--mono)",minWidth:72,textAlign:"right"}}>${fmt(total,0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState("");
  function attempt() { if (!onLogin(user.trim(), pass)) setErr("Usuario o contraseña incorrectos"); }
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo">Trafficker Pro · Dashboard</div>
        <div className="login-title">Bienvenido</div>
        <div className="login-sub">Ingresa con tu usuario y contraseña</div>
        <div className="field"><label>Usuario</label><input type="text" value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="tu_usuario" autoFocus/></div>
        <div className="field"><label>Contraseña</label><PasswordInput value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} /></div>
        {err&&<div className="err">{err}</div>}
        <button className="btn btn-primary btn-full" style={{marginTop:"1rem"}} onClick={attempt}>Entrar</button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState(() => S.get("trafficker_clients_v3") || SEED_CLIENTS);

  function saveClients(c) { setClients(c); S.set("trafficker_clients_v3", c); }
  function handleLogin(username, password) {
    if (username === ADMIN.username && password === ADMIN.password) { setSession({ role: "admin" }); return true; }
    const c = clients.find(cl => cl.username === username && cl.password === password);
    if (c) { setSession({ role: "client", clientId: c.id }); return true; }
    return false;
  }
  function updateClient(updated) { saveClients(clients.map(c => c.id === updated.id ? updated : c)); }
  function addClient(data) { saveClients([...clients, { ...data, id: "c" + Date.now(), records: [] }]); }
  function deleteClient(id) { saveClients(clients.filter(c => c.id !== id)); }

  return (
    <>
      <style>{css}</style>
      {!session && <LoginScreen onLogin={handleLogin}/>}
      {session?.role === "admin" && <AdminPanel clients={clients} onLogout={()=>setSession(null)} onUpdate={updateClient} onAddClient={addClient} onDeleteClient={deleteClient}/>}
      {session?.role === "client" && (()=>{
        const client = clients.find(c => c.id === session.clientId);
        if (!client) { setSession(null); return null; }
        return <ClientDashboard client={client} onLogout={()=>setSession(null)}/>;
      })()}
    </>
  );
}
