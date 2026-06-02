import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://rckcrrdkxmdeexkuuqie.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2NycmRreG1kZWV4a3V1cWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1MTEsImV4cCI6MjA5NTk3ODUxMX0.I5MSkDM16EqNJYYUsgoyOfrcbvAwKXlSTVyQYHd86b4";

const dbHeaders = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

const db = {
  async getAll() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=*`, { headers: dbHeaders });
      if (!r.ok) return [];
      const rows = await r.json();
      return rows.map(row => row.data);
    } catch { return []; }
  },
  async upsert(client) {
    await fetch(`${SUPA_URL}/rest/v1/clients`, {
      method: "POST",
      headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: client.id, data: client })
    });
  },
  async delete(id) {
    await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${id}`, { method: "DELETE", headers: dbHeaders });
  },
  async deleteAll() {
    await fetch(`${SUPA_URL}/rest/v1/clients?id=neq.IMPOSSIBLE_ID`, { method: "DELETE", headers: dbHeaders });
  }
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
  { id: "facebook", label: "Facebook" }, { id: "instagram", label: "Instagram" },
  { id: "tiktok_personal", label: "TikTok Personal" }, { id: "tiktok_empresarial", label: "TikTok Empresarial" },
  { id: "tiktok_ads", label: "TikTok Ads" }, { id: "gmail", label: "Gmail" },
  { id: "youtube", label: "YouTube" }, { id: "linkedin", label: "LinkedIn" },
  { id: "spotify", label: "Spotify" }, { id: "pinterest", label: "Pinterest" },
];

const REDES_PAUTA = ["Facebook / Instagram", "TikTok Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "Pinterest Ads"];

const ANTECEDENTES_CAMPOS = [
  { key: "inversion", label: "Inversión", prefix: "$", tipo: "costo" },
  { key: "ticket_promedio", label: "Ticket Promedio", prefix: "$", tipo: "neutro" },
  { key: "ganancia_bruta", label: "Ganancia Bruta", prefix: "$", tipo: "beneficio" },
  { key: "ganancia_neta", label: "Ganancia Neta", prefix: "$", tipo: "beneficio" },
  { key: "roas_marketing", label: "ROAS Marketing", suffix: "x", tipo: "beneficio" },
  { key: "roas_empresarial", label: "ROAS Empresarial", suffix: "x", tipo: "beneficio" },
  { key: "cpa", label: "CPA", prefix: "$", tipo: "costo" },
  { key: "cpr", label: "CPR", prefix: "$", tipo: "costo" },
  { key: "cpc", label: "CPC", prefix: "$", tipo: "costo" },
  { key: "impresiones", label: "Impresiones", tipo: "neutro" },
  { key: "alcance", label: "Alcance", tipo: "neutro" },
  { key: "clics_enlace", label: "Clics enlace", tipo: "beneficio" },
  { key: "resultados", label: "Resultados", tipo: "beneficio" },
  { key: "ventas_ant", label: "Ventas", tipo: "beneficio" },
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
  .login{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;background:var(--bg)}
  .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2.5rem;width:100%;max-width:400px}
  .login-logo{font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:2rem}
  .login-title{font-size:24px;font-weight:600;margin-bottom:.4rem}
  .login-sub{color:var(--muted);font-size:13px;margin-bottom:2rem}
  .field{margin-bottom:1rem}
  .field label{display:block;font-size:12px;font-weight:500;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
  .input-wrap{position:relative}.input-wrap input{padding-right:40px}
  .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:flex;align-items:center}.eye-btn:hover{color:var(--text)}
  input,select,textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)}
  textarea{resize:vertical;min-height:80px}
  .input-prefix{position:relative;display:flex;align-items:center}
  .input-prefix .pre{position:absolute;left:12px;color:var(--muted);font-size:14px;pointer-events:none}
  .input-prefix input{padding-left:24px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--r);font-family:var(--font);font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{opacity:.88}.btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--muted)}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--border)}.btn-danger:hover{border-color:var(--red);background:rgba(239,68,68,.08)}
  .btn-green{background:var(--green);color:#fff}.btn-green:hover{opacity:.88}
  .btn-sm{padding:6px 12px;font-size:12px}.btn-full{width:100%}
  .err{color:var(--red);font-size:12px;margin-top:8px}
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
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem}
  .card-title{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}
  .metric{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1rem}
  .metric-label{font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .metric-value{font-size:22px;font-weight:600;font-family:var(--mono);line-height:1}
  .metric-sub{font-size:11px;color:var(--muted);margin-top:4px}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
  .tbl td{padding:10px 12px;border-bottom:1px solid rgba(42,42,56,.5);font-size:13px}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tr:hover td{background:var(--surface2)}
  .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-wa{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-web{background:rgba(14,165,233,.12);color:var(--accent2)}
  .badge-launch{background:rgba(249,115,22,.12);color:var(--orange)}
  .badge-paid{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-partial{background:rgba(245,158,11,.12);color:var(--amber)}
  .badge-pending{background:rgba(239,68,68,.12);color:var(--red)}
  .avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  .form-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem}
  .section-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1.5rem 0 .75rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
  .tab-row{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:1.25rem;flex-wrap:wrap}
  .tab{padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--font)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:hover:not(.active){color:var(--text)}
  .filter-bar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .period-pills{display:flex;gap:4px;flex-wrap:wrap}
  .pill{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;font-family:var(--font);transition:all .15s}
  .pill.active,.pill:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
  .progress-stages{display:flex;gap:4px;margin-bottom:.75rem}
  .stage-block{flex:1;position:relative;cursor:pointer}
  .stage-bar{height:8px;border-radius:4px;transition:all .3s}
  .stage-label{font-size:9px;font-weight:600;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage-tooltip{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:11px;white-space:nowrap;z-index:100;pointer-events:none;opacity:0;transition:opacity .15s;min-width:160px}
  .stage-block:hover .stage-tooltip{opacity:1}
  .check-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:13px;margin-bottom:.5rem}
  .check-item.done{opacity:.6;text-decoration:line-through}
  .check-item input[type=checkbox]{width:16px;height:16px;cursor:pointer;accent-color:var(--accent)}
  .upgrade-badge{font-size:10px;background:rgba(249,115,22,.12);color:var(--orange);padding:2px 7px;border-radius:10px;font-weight:600;margin-left:auto;white-space:nowrap}
  .servicio-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .servicio-chip.selected{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  .chips-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:.5rem}
  .cuenta-row{display:grid;grid-template-columns:180px 1fr 1fr auto;gap:.75rem;align-items:center;margin-bottom:.75rem}
  .contrato-card{background:var(--surface2);border-radius:var(--r);padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:1rem}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:4px;transition:opacity .15s;cursor:pointer}.bar:hover{opacity:.7}
  .ai-report{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .ai-report-header{display:flex;align-items:center;gap:8px;margin-bottom:.75rem;font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em}
  .ai-report-body{font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}
  .streaming-cursor::after{content:'▌';animation:blink .7s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  .scroll-x{overflow-x:auto}
  .empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
  .sec-title{font-size:15px;font-weight:600}
  .info-row{display:flex;gap:.5rem;align-items:baseline;margin-bottom:.5rem;font-size:13px}
  .info-label{color:var(--muted);min-width:140px;font-size:12px}
  .ant-cell-green{background:rgba(16,185,129,.15);color:#10B981;font-weight:600;border-radius:4px;padding:2px 6px}
  .ant-cell-amber{background:rgba(245,158,11,.15);color:#F59E0B;font-weight:600;border-radius:4px;padding:2px 6px}
  .ant-cell-red{background:rgba(239,68,68,.15);color:#EF4444;font-weight:600;border-radius:4px;padding:2px 6px}
  .ant-cell-neutral{color:var(--text);padding:2px 6px}
  .ant-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem}
  .loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;color:var(--muted)}
  .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
  .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2rem;max-width:480px;width:100%}
  .modal-title{font-size:18px;font-weight:600;margin-bottom:.75rem}
  .modal-body{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:1.5rem}
  @media(max-width:640px){.sidebar{display:none}.grid4{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:1fr 1fr}.form-row,.form-row3{grid-template-columns:1fr}.cuenta-row{grid-template-columns:1fr 1fr}.ant-form-grid{grid-template-columns:1fr 1fr}}
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n, dec = 0) => (n === "" || n === null || n === undefined || isNaN(Number(n))) ? "—" : Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
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
    costo_formulario: sum(rows, "formularios") ? fmt(inv / sum(rows, "formularios"), 2) : "—",
  };
}

function exportClientJSON(client) {
  const blob = new Blob([JSON.stringify(client, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `cliente_${client.name}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

function exportAntecedentes(antecedentes, clientName, formato) {
  if (!antecedentes?.length) return;
  const headers = ["Red", "Período", ...ANTECEDENTES_CAMPOS.map(c => c.label)];
  const rows = antecedentes.map(a => [a.red || "", `${a.fechaInicio || ""} - ${a.fechaFin || ""}`, ...ANTECEDENTES_CAMPOS.map(c => a[c.key] || "")]);
  const sep = formato === "csv" ? "," : "\t";
  const content = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(sep)).join("\n");
  const blob = new Blob(["\ufeff" + content], { type: formato === "csv" ? "text/csv" : "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `antecedentes_${clientName}.${formato}`; a.click();
  URL.revokeObjectURL(url);
}

async function generateReport(client, rows, setReport, setLoading) {
  setLoading(true); setReport("");
  const t = buildTotals(client.niche, rows);
  const prompt = `Eres experto en marketing digital. Reporte ejecutivo en español para "${client.name}" (${client.niche}).\nDatos: Inversión $${t.inversion} | Alcance ${t.alcance} | CPM $${t.cpm} | CPC $${t.cpc} | CTR ${t.ctr}%${client.niche === "whatsapp" ? ` | Leads ${t.leads} | Ventas ${t.ventas} | ROAS ${t.roas}x` : client.niche === "web" ? ` | Sesiones ${t.sesiones} | Compras ${t.compras} | ROAS ${t.roas}x` : ` | Formularios ${t.formularios} | CPF $${t.costo_formulario}`}\n\n3 párrafos cortos: resumen, puntos clave/alertas, recomendación accionable. Tono profesional cercano. Sin bullets.`;
  try {
    const KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
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

// ─── COMPONENTES BASE ────────────────────────────────────────────────────────
function PasswordInput({ value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder="••••••••" />
      <button type="button" className="eye-btn" onClick={() => setShow(s => !s)}>
        {show
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
      </button>
    </div>
  );
}

function ConfirmModal({ title, body, onConfirm, onCancel, confirmLabel = "Confirmar", danger = false }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-title">{title}</div>
        <div className="modal-body">{body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return <div className="metric" style={highlight ? { borderColor: "rgba(124,58,237,.5)" } : {}}><div className="metric-label">{label}</div><div className="metric-value" style={highlight ? { color: "var(--accent)" } : {}}>{value}</div>{sub && <div className="metric-sub">{sub}</div>}</div>;
}

function MiniChart({ rows, field, color }) {
  if (!rows.length) return null;
  const vals = rows.map(r => Number(r[field]) || 0); const max = Math.max(...vals, 1);
  return <div className="chart-bars">{vals.map((v, i) => <div key={i} className="bar" style={{ height: `${(v / max) * 100}%`, background: color || "var(--accent)", opacity: .75 }} title={`${rows[i].date}: ${v}`} />)}</div>;
}

function PeriodFilter({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="filter-bar">
      <div className="period-pills">{["7d", "mtd", "30d", "all", "custom"].map(p => <button key={p} className={`pill ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{p === "7d" ? "7 días" : p === "mtd" ? "Este mes" : p === "30d" ? "30 días" : p === "all" ? "Todo" : "Rango"}</button>)}</div>
      {period === "custom" && <><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: "auto" }} /><span style={{ color: "var(--muted)", fontSize: 12 }}>a</span><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: "auto" }} /></>}
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ client }) {
  const servicios = client.serviciosContratados || [];
  const checklist = client.checklist || {};
  return (
    <div className="card">
      <div className="card-title">Progreso del proyecto</div>
      <div className="progress-stages">
        {SERVICIOS_DEFAULT.map(svc => {
          const activo = servicios.includes(svc.id);
          const done = svc.subetapas.filter(s => checklist[svc.id]?.[s]).length;
          const pct = svc.subetapas.length ? Math.round(done / svc.subetapas.length * 100) : 0;
          const bg = activo ? (pct === 100 ? "var(--green)" : pct > 0 ? "var(--accent)" : "var(--border)") : "var(--surface2)";
          return (
            <div key={svc.id} className="stage-block">
              <div className="stage-tooltip">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{svc.nombre}{!activo && <span style={{ color: "var(--orange)", fontSize: 10, marginLeft: 6 }}>UPGRADE</span>}</div>
                {activo ? <><div style={{ color: "var(--muted)", whiteSpace: "pre", fontSize: 11 }}>{svc.subetapas.map(s => `${checklist[svc.id]?.[s] ? "✓" : "○"} ${s}`).join("\n")}</div><div style={{ color: "var(--accent)", fontWeight: 600, marginTop: 4 }}>{done}/{svc.subetapas.length} completadas</div></> : <div style={{ color: "var(--muted)", fontSize: 11 }}>No contratado</div>}
              </div>
              <div className="stage-bar" style={{ background: bg, opacity: activo ? 1 : 0.25, height: activo && pct > 0 ? `${Math.max(8, pct / 10 + 4)}px` : "8px" }} />
              <div className="stage-label" style={{ color: activo ? "var(--text)" : "var(--muted)" }}>{svc.nombre}</div>
              {activo && <div style={{ textAlign: "center", fontSize: 9, color: "var(--muted)" }}>{pct}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
function ChecklistPanel({ client, onUpdate }) {
  const checklist = client.checklist || {};
  const servicios = client.serviciosContratados || [];
  function toggle(svcId, sub) { onUpdate({ ...client, checklist: { ...checklist, [svcId]: { ...(checklist[svcId] || {}), [sub]: !checklist[svcId]?.[sub] } } }); }
  return (
    <div>{SERVICIOS_DEFAULT.map(svc => {
      const activo = servicios.includes(svc.id);
      const done = svc.subetapas.filter(s => checklist[svc.id]?.[s]).length;
      return (
        <div key={svc.id} className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.nombre}</div>
            {!activo && <span className="upgrade-badge">UPGRADE</span>}
            {activo && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{done}/{svc.subetapas.length}</span>}
          </div>
          {svc.subetapas.map(sub => (
            <div key={sub} className={`check-item${checklist[svc.id]?.[sub] ? " done" : ""}`} style={{ opacity: activo ? 1 : 0.4, cursor: activo ? "pointer" : "default" }} onClick={() => activo && toggle(svc.id, sub)}>
              <input type="checkbox" checked={!!checklist[svc.id]?.[sub]} readOnly disabled={!activo} />
              <span>{sub}</span>
              {!activo && <span className="upgrade-badge">No contratado</span>}
            </div>
          ))}
        </div>
      );
    })}</div>
  );
}

// ─── CUENTAS ──────────────────────────────────────────────────────────────────
function CuentasPanel({ client, onUpdate, readOnly }) {
  const cuentas = client.cuentas || [];
  if (readOnly) return (
    <div className="card"><div className="card-title">Cuentas vinculadas</div>
      {cuentas.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Sin cuentas registradas.</div>}
      {cuentas.map((c, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}><span style={{ color: "var(--muted)", minWidth: 150 }}>{REDES_SOCIALES.find(r => r.id === c.red)?.label || c.red}</span><span>{c.usuario}</span></div>)}
    </div>
  );
  return (
    <div className="card">
      <div className="sec-header"><div className="card-title" style={{ margin: 0 }}>Cuentas y accesos</div><button className="btn btn-ghost btn-sm" onClick={() => onUpdate({ ...client, cuentas: [...cuentas, { red: "facebook", usuario: "", password: "" }] })}>+ Añadir</button></div>
      {cuentas.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>Sin cuentas.</div>}
      {cuentas.map((c, i) => (
        <div key={i} className="cuenta-row">
          <select value={c.red} onChange={e => onUpdate({ ...client, cuentas: cuentas.map((cu, xi) => xi === i ? { ...cu, red: e.target.value } : cu) })}>{REDES_SOCIALES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          <input type="text" value={c.usuario} onChange={e => onUpdate({ ...client, cuentas: cuentas.map((cu, xi) => xi === i ? { ...cu, usuario: e.target.value } : cu) })} placeholder="Usuario / correo" />
          <input type="text" value={c.password} onChange={e => onUpdate({ ...client, cuentas: cuentas.map((cu, xi) => xi === i ? { ...cu, password: e.target.value } : cu) })} placeholder="Contraseña" />
          <button className="btn btn-danger btn-sm" onClick={() => onUpdate({ ...client, cuentas: cuentas.filter((_, xi) => xi !== i) })}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
function ContratoItem({ ct, i, onSave, onRemove }) {
  const [local, setLocal] = useState({ ...ct });
  const upd = (k, v) => setLocal(p => ({ ...p, [k]: v }));
  useEffect(() => {
    const total = (local.servicios || []).reduce((a, s) => a + (parseFloat(s.precio) || 0), 0);
    if (total > 0) setLocal(p => ({ ...p, totalContrato: total.toFixed(2) }));
  }, [JSON.stringify(local.servicios)]);
  useEffect(() => {
    const total = parseFloat(local.totalContrato) || 0;
    if (total > 0 && local.cuotas?.length > 0) { const pc = (total / local.cuotas.length).toFixed(2); setLocal(p => ({ ...p, cuotas: p.cuotas.map(c => ({ ...c, monto: pc })) })); }
  }, [local.totalContrato, local.cuotas?.length]);
  const pagadas = (local.cuotas || []).filter(c => c.pagado).length;
  const totalCuotas = local.cuotas?.length || 0;
  const estado = pagadas === totalCuotas ? { label: "Pago completo", cls: "badge-paid" } : pagadas > 0 ? { label: `${pagadas}/${totalCuotas} cuotas pagadas`, cls: "badge-partial" } : { label: "Pendiente", cls: "badge-pending" };
  return (
    <div className="contrato-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 600 }}>Contrato #{i + 1}</div>
        <div style={{ display: "flex", gap: 8 }}><span className={`badge ${estado.cls}`}>{estado.label}</span><button className="btn btn-danger btn-sm" onClick={onRemove}>Eliminar</button></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Fecha inicio</label><input type="date" value={local.fechaInicio} onChange={e => upd("fechaInicio", e.target.value)} /></div>
        <div className="field"><label>Fecha fin</label><input type="date" value={local.fechaFin} onChange={e => upd("fechaFin", e.target.value)} /></div>
      </div>
      <div className="field" style={{ marginBottom: "1rem" }}>
        <label>Servicios y precios</label>
        {(local.servicios || []).map((s, si) => (
          <div key={si} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, minWidth: 120 }}>{s.nombre}</span>
            <div className="input-prefix" style={{ flex: 1 }}><span className="pre">$</span><input type="number" value={s.precio} onChange={e => { const svcs = local.servicios.map((sv, xi) => xi === si ? { ...sv, precio: e.target.value } : sv); upd("servicios", svcs); }} placeholder="0.00" /></div>
          </div>
        ))}
      </div>
      <div className="field" style={{ marginBottom: "1rem" }}>
        <label>Total del contrato</label>
        <div className="input-prefix"><span className="pre">$</span><input type="number" value={local.totalContrato} onChange={e => upd("totalContrato", e.target.value)} placeholder="0.00" /></div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Calculado automáticamente</div>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Cuotas</label>
          <button className="btn btn-ghost btn-sm" onClick={() => setLocal(p => ({ ...p, cuotas: [...(p.cuotas || []), { monto: "", pagado: false, fecha: "" }] }))}>+ Cuota</button>
        </div>
        <div className="grid2">
          {(local.cuotas || []).map((c, ci) => (
            <div key={ci} style={{ background: "var(--bg)", borderRadius: 8, padding: 12, position: "relative" }}>
              {local.cuotas.length > 1 && <button style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }} onClick={() => setLocal(p => ({ ...p, cuotas: p.cuotas.filter((_, xi) => xi !== ci) }))}>×</button>}
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase" }}>Cuota {ci + 1} ({totalCuotas > 0 ? Math.round(100 / totalCuotas) : 0}%)</div>
              <div className="input-prefix" style={{ marginBottom: 8 }}><span className="pre">$</span><input type="number" value={c.monto} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, monto: e.target.value } : cu) }))} placeholder="0.00" /></div>
              <input type="date" value={c.fecha} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, fecha: e.target.value } : cu) }))} style={{ marginBottom: 8 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!c.pagado} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, pagado: e.target.checked } : cu) }))} style={{ width: 16, height: 16 }} />Pagado
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: "1rem" }}><label>Notas</label><textarea value={local.notas} onChange={e => upd("notas", e.target.value)} placeholder="Observaciones..." /></div>
      <button className="btn btn-green btn-sm" onClick={() => onSave(local)}>💾 Guardar contrato</button>
    </div>
  );
}

function ContratosPanel({ client, onUpdate }) {
  const contratos = client.contratos || [];
  function addContrato() {
    const svcs = (client.serviciosContratados || []).map(id => ({ id, nombre: SERVICIOS_DEFAULT.find(x => x.id === id)?.nombre || id, precio: "" }));
    onUpdate({ ...client, contratos: [...contratos, { id: "ct" + Date.now(), fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: "", servicios: svcs, cuotas: [{ monto: "", pagado: false, fecha: "" }, { monto: "", pagado: false, fecha: "" }], notas: "" }] });
  }
  return (
    <div>
      <div className="sec-header"><div className="sec-title">Historial de contratos</div><button className="btn btn-primary btn-sm" onClick={addContrato}>+ Nuevo contrato</button></div>
      {contratos.length === 0 && <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📋</div><div>Sin contratos.</div></div>}
      {contratos.map((ct, i) => <ContratoItem key={ct.id} ct={ct} i={i} onSave={ct2 => onUpdate({ ...client, contratos: contratos.map((c, xi) => xi === i ? ct2 : c) })} onRemove={() => { if (window.confirm("¿Eliminar contrato?")) onUpdate({ ...client, contratos: contratos.filter((_, xi) => xi !== i) }); }} />)}
    </div>
  );
}

// ─── ANTECEDENTES ─────────────────────────────────────────────────────────────
function getColorClass(campo, valor, historico) {
  if (!historico || historico.length < 2 || !valor || valor === "") return "ant-cell-neutral";
  const vals = historico.map(h => parseFloat(h[campo])).filter(v => !isNaN(v));
  if (vals.length < 2) return "ant-cell-neutral";
  const v = parseFloat(valor);
  const info = ANTECEDENTES_CAMPOS.find(c => c.key === campo);
  if (!info) return "ant-cell-neutral";
  if (info.tipo === "beneficio") { const max = Math.max(...vals); return v >= max * 0.9 ? "ant-cell-green" : v >= max * 0.6 ? "ant-cell-amber" : "ant-cell-red"; }
  if (info.tipo === "costo") { const min = Math.min(...vals); return v <= min * 1.05 ? "ant-cell-green" : v <= min * 1.2 ? "ant-cell-amber" : "ant-cell-red"; }
  return "ant-cell-neutral";
}

function AntecedentesPanel({ client, onUpdate, readOnly }) {
  const ants = client.antecedentes || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ red: REDES_PAUTA[0], fechaInicio: "", fechaFin: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function saveAnt() {
    if (!form.fechaInicio || !form.fechaFin) return alert("Completa el rango de fechas.");
    onUpdate({ ...client, antecedentes: [...ants, { ...form, id: "ant" + Date.now() }] });
    setForm({ red: REDES_PAUTA[0], fechaInicio: "", fechaFin: "" }); setShowForm(false);
  }
  return (
    <div>
      <div className="sec-header">
        <div><div className="sec-title">Antecedentes históricos</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Historial de pauta por red y período</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          {ants.length > 0 && <><button className="btn btn-ghost btn-sm" onClick={() => exportAntecedentes(ants, client.name, "csv")}>⬇ CSV</button><button className="btn btn-ghost btn-sm" onClick={() => exportAntecedentes(ants, client.name, "xls")}>⬇ XLS</button></>}
          {!readOnly && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>{showForm ? "Cancelar" : "+ Nuevo"}</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[["ant-cell-green", "Óptimo"], ["ant-cell-amber", "Aceptable (+20%)"], ["ant-cell-red", "Atención (>+20%)"]].map(([cls, label]) => (
          <div key={cls} style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={cls} style={{ fontSize: 11 }}>Ej</span><span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span></div>
        ))}
      </div>
      {showForm && !readOnly && (
        <div className="card" style={{ borderColor: "rgba(124,58,237,.4)" }}>
          <div className="card-title">Nuevo registro histórico</div>
          <div className="form-row"><div className="field"><label>Red de pauta</label><select value={form.red} onChange={e => f("red", e.target.value)}>{REDES_PAUTA.map(r => <option key={r} value={r}>{r}</option>)}</select></div><div /></div>
          <div className="form-row"><div className="field"><label>Fecha inicio</label><input type="date" value={form.fechaInicio} onChange={e => f("fechaInicio", e.target.value)} /></div><div className="field"><label>Fecha fin</label><input type="date" value={form.fechaFin} onChange={e => f("fechaFin", e.target.value)} /></div></div>
          <div className="ant-form-grid">
            {ANTECEDENTES_CAMPOS.map(campo => (
              <div key={campo.key} className="field"><label>{campo.label}</label><div className="input-prefix">{campo.prefix && <span className="pre">{campo.prefix}</span>}<input type="number" value={form[campo.key] || ""} onChange={e => f(campo.key, e.target.value)} placeholder="0" /></div></div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveAnt}>Guardar</button>
        </div>
      )}
      {ants.length === 0 && !showForm && <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📊</div><div>Sin antecedentes.</div></div>}
      {ants.length > 0 && (
        <div className="card scroll-x">
          <table className="tbl">
            <thead><tr><th>Red</th><th>Período</th>{ANTECEDENTES_CAMPOS.map(c => <th key={c.key}>{c.label}</th>)}{!readOnly && <th></th>}</tr></thead>
            <tbody>{ants.map(a => (
              <tr key={a.id}>
                <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{a.red}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{a.fechaInicio} / {a.fechaFin}</td>
                {ANTECEDENTES_CAMPOS.map(c => { const val = a[c.key]; const cls = getColorClass(c.key, val, ants); const display = val !== "" && val !== undefined ? `${c.prefix || ""}${fmt(Number(val), 2)}${c.suffix || ""}` : "—"; return <td key={c.key}><span className={cls}>{display}</span></td>; })}
                {!readOnly && <td><button className="btn btn-danger btn-sm" onClick={() => onUpdate({ ...client, antecedentes: ants.filter(x => x.id !== a.id) })}>×</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT FORM ──────────────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }) {
  const blank = { name: "", username: "", password: "", niche: "whatsapp", color: "#7C3AED", logo: "", producto: "", email: "", telefono: "", direccion: "", representante: "", serviciosContratados: [], checklist: {}, cuentas: [], contratos: [], antecedentes: [], records: [] };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : blank);
  const [nuevoSvc, setNuevoSvc] = useState({ nombre: "", subetapas: "" });
  const [customSvcs, setCustomSvcs] = useState([]);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function toggleSvc(id) { const a = form.serviciosContratados; f("serviciosContratados", a.includes(id) ? a.filter(x => x !== id) : [...a, id]); }
  function addCustomSvc() {
    if (!nuevoSvc.nombre) return;
    const id = "custom_" + Date.now();
    setCustomSvcs(p => [...p, { id, nombre: nuevoSvc.nombre, subetapas: nuevoSvc.subetapas.split(",").map(s => s.trim()).filter(Boolean) }]);
    f("serviciosContratados", [...form.serviciosContratados, id]);
    setNuevoSvc({ nombre: "", subetapas: "" });
  }
  const todos = [...SERVICIOS_DEFAULT, ...customSvcs];
  return (
    <div style={{ maxWidth: 680 }}>
      <div className="section-label">Información del negocio</div>
      <div className="form-row"><div className="field"><label>Nombre del negocio</label><input type="text" value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ej: Bella Estética" /></div><div className="field"><label>Producto / Servicio</label><input type="text" value={form.producto} onChange={e => f("producto", e.target.value)} placeholder="Ej: Tratamientos faciales" /></div></div>
      <div className="form-row"><div className="field"><label>Representante</label><input type="text" value={form.representante} onChange={e => f("representante", e.target.value)} placeholder="Nombre completo" /></div><div className="field"><label>Teléfono</label><input type="text" value={form.telefono} onChange={e => f("telefono", e.target.value)} placeholder="0991234567" /></div></div>
      <div className="form-row"><div className="field"><label>Correo electrónico</label><input type="text" value={form.email} onChange={e => f("email", e.target.value)} placeholder="correo@empresa.com" /></div><div className="field"><label>Dirección</label><input type="text" value={form.direccion} onChange={e => f("direccion", e.target.value)} placeholder="Ciudad, dirección" /></div></div>
      <div className="section-label">Acceso al portal</div>
      <div className="form-row">
        <div className="field"><label>Iniciales (logo)</label><input type="text" value={form.logo} onChange={e => f("logo", e.target.value.slice(0, 2).toUpperCase())} placeholder="BE" maxLength={2} /></div>
        <div className="field"><label>Color de marca</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={form.color} onChange={e => f("color", e.target.value)} style={{ width: 44, height: 40, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", cursor: "pointer" }} /><span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{form.color}</span></div></div>
      </div>
      <div className="form-row"><div className="field"><label>Usuario</label><input type="text" value={form.username} onChange={e => f("username", e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="bellastetica" /></div><div className="field"><label>Contraseña</label><PasswordInput value={form.password} onChange={e => f("password", e.target.value)} /></div></div>
      <div className="field"><label>Nicho</label><select value={form.niche} onChange={e => f("niche", e.target.value)}><option value="whatsapp">Venta por WhatsApp</option><option value="web">Sitio web / E-commerce</option><option value="lanzamiento">Lanzamiento (Leads / Formularios)</option></select></div>
      <div className="section-label">Servicios contratados</div>
      <div className="chips-wrap">{todos.map(svc => <div key={svc.id} className={`servicio-chip ${form.serviciosContratados.includes(svc.id) ? "selected" : ""}`} onClick={() => toggleSvc(svc.id)}>{form.serviciosContratados.includes(svc.id) ? "✓ " : ""}{svc.nombre}</div>)}</div>
      <div style={{ marginTop: 12, background: "var(--surface2)", borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>+ Servicio personalizado</div>
        <div className="form-row" style={{ marginBottom: 8 }}><input type="text" value={nuevoSvc.nombre} onChange={e => setNuevoSvc(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del servicio" /><input type="text" value={nuevoSvc.subetapas} onChange={e => setNuevoSvc(p => ({ ...p, subetapas: e.target.value }))} placeholder="Subetapas separadas por coma" /></div>
        <button className="btn btn-ghost btn-sm" onClick={addCustomSvc}>Añadir servicio</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
        <button className="btn btn-primary" onClick={() => { if (!form.name || !form.username || !form.password) return alert("Completa nombre, usuario y contraseña."); onSave(form); }}>{initial ? "Guardar cambios" : "Crear cliente"}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── ADD RECORD ───────────────────────────────────────────────────────────────
function AddRecordForm({ client, onSave, onCancel }) {
  const isWA = client.niche === "whatsapp", isWeb = client.niche === "web";
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, inversion: "", alcance: "", cpm: "", cpc: "", ctr: "", leads: "", contactados: "", ventas: "", ingreso: "", sesiones: "", agregar_carrito: "", compras: "", roas: "", clientesPotenciales: "", formularios: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const Num = ({ lbl, fk }) => <div className="field"><label>{lbl}</label><input type="number" value={form[fk]} onChange={e => f(fk, e.target.value)} placeholder="0" /></div>;
  function handleSave() { const rec = { date: form.date }; Object.entries(form).forEach(([k, v]) => { if (k !== "date" && v !== "") rec[k] = parseFloat(v) || 0; }); onSave(rec); }
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="sec-title" style={{ marginBottom: "1.25rem" }}>Nuevo registro — {client.name}</div>
      <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
      <div className="section-label">Pauta</div>
      <div className="form-row"><Num lbl="Inversión ($)" fk="inversion" /><Num lbl="Alcance" fk="alcance" /></div>
      <div className="form-row3"><Num lbl="CPM ($)" fk="cpm" /><Num lbl="CPC ($)" fk="cpc" /><Num lbl="CTR (%)" fk="ctr" /></div>
      {isWA && <><div className="section-label">Ventas WhatsApp</div><div className="form-row"><Num lbl="Leads" fk="leads" /><Num lbl="Contactados" fk="contactados" /></div><div className="form-row"><Num lbl="Ventas cerradas" fk="ventas" /><Num lbl="Ingresos ($)" fk="ingreso" /></div></>}
      {isWeb && <><div className="section-label">E-commerce</div><div className="form-row"><Num lbl="Sesiones" fk="sesiones" /><Num lbl="Agregar carrito" fk="agregar_carrito" /></div><div className="form-row3"><Num lbl="Compras" fk="compras" /><Num lbl="Ingresos ($)" fk="ingreso" /><Num lbl="ROAS" fk="roas" /></div></>}
      {!isWA && !isWeb && <><div className="section-label">Lanzamiento</div><div className="form-row"><Num lbl="Clientes potenciales" fk="clientesPotenciales" /><Num lbl="Formularios" fk="formularios" /></div></>}
      <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}><button className="btn btn-primary" onClick={handleSave}>Guardar</button><button className="btn btn-ghost" onClick={onCancel}>Cancelar</button></div>
    </div>
  );
}

// ─── ADMIN CLIENT DETAIL ──────────────────────────────────────────────────────
function AdminClientDetail({ client, onBack, onUpdate }) {
  const [tab, setTab] = useState("info");
  const [adding, setAdding] = useState(false);
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);
  const rows = filterByPeriod(client.records || [], period, from, to).sort((a, b) => a.date.localeCompare(b.date));
  const isWA = client.niche === "whatsapp", isWeb = client.niche === "web", isLaunch = client.niche === "lanzamiento";
  const t = buildTotals(client.niche, rows);
  const nicheLabel = isWA ? "WhatsApp" : isWeb ? "Sitio web" : "Lanzamiento";
  if (adding) return <div className="content"><AddRecordForm client={client} onSave={rec => { onUpdate({ ...client, records: [...(client.records || []), rec] }); setAdding(false); }} onCancel={() => setAdding(false)} /></div>;
  return (
    <div className="main">
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
          <div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo || client.name.slice(0, 2).toUpperCase()}</div>
          <div><div className="topbar-title">{client.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{nicheLabel} · @{client.username}</div></div>
        </div>
        {tab === "metricas" && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Nuevo registro</button>}
      </div>
      <div className="content">
        <div className="tab-row">
          {["info", "checklist", "cuentas", "contratos", "antecedentes", "metricas", "reporte"].map(t2 => (
            <button key={t2} className={`tab ${tab === t2 ? "active" : ""}`} onClick={() => setTab(t2)}>
              {t2 === "info" ? "Perfil" : t2 === "checklist" ? "Checklist" : t2 === "cuentas" ? "Cuentas" : t2 === "contratos" ? "Contratos" : t2 === "antecedentes" ? "Antecedentes" : t2 === "metricas" ? "Métricas" : "Reporte IA"}
            </button>
          ))}
        </div>
        {tab === "info" && <div><ProgressBar client={client} /><div className="card"><div className="card-title">Información del cliente</div><div className="grid2"><div>{[["Negocio", client.name], ["Representante", client.representante], ["Producto/Servicio", client.producto], ["Teléfono", client.telefono], ["Email", client.email], ["Dirección", client.direccion]].map(([l, v]) => <div key={l} className="info-row"><span className="info-label">{l}</span><span>{v || <span style={{ color: "var(--muted)" }}>—</span>}</span></div>)}</div><div>{[["Usuario", client.username], ["Nicho", nicheLabel], ["Servicios", (client.serviciosContratados || []).map(id => SERVICIOS_DEFAULT.find(s => s.id === id)?.nombre || id).join(", ") || "—"]].map(([l, v]) => <div key={l} className="info-row"><span className="info-label">{l}</span><span>{v}</span></div>)}</div></div></div></div>}
        {tab === "checklist" && <ChecklistPanel client={client} onUpdate={onUpdate} />}
        {tab === "cuentas" && <CuentasPanel client={client} onUpdate={onUpdate} readOnly={false} />}
        {tab === "contratos" && <ContratosPanel client={client} onUpdate={onUpdate} />}
        {tab === "antecedentes" && <AntecedentesPanel client={client} onUpdate={onUpdate} readOnly={false} />}
        {tab === "metricas" && <>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="grid4" style={{ marginBottom: "1rem" }}><MetricCard label="Inversión" value={"$" + t.inversion} /><MetricCard label="Alcance" value={t.alcance} /><MetricCard label="CPM" value={"$" + t.cpm} /><MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight /></div>
          {isWA && <div className="grid4" style={{ marginBottom: "1rem" }}><MetricCard label="Leads" value={t.leads} /><MetricCard label="Contactados" value={t.contactados} /><MetricCard label="Ventas" value={t.ventas} /><MetricCard label="Ingresos" value={"$" + t.ingreso} highlight /></div>}
          {isWeb && <div className="grid4" style={{ marginBottom: "1rem" }}><MetricCard label="Sesiones" value={t.sesiones} /><MetricCard label="Carrito" value={t.agregar_carrito} /><MetricCard label="Compras" value={t.compras} /><MetricCard label="Ingresos" value={"$" + t.ingreso} highlight /></div>}
          {isLaunch && <div className="grid3" style={{ marginBottom: "1rem" }}><MetricCard label="Potenciales" value={t.clientesPotenciales} /><MetricCard label="Formularios" value={t.formularios} /><MetricCard label="Costo/form" value={"$" + t.costo_formulario} highlight /></div>}
          <div className="card scroll-x">
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>{isWA && <><th>Leads</th><th>Contactados</th><th>Ventas</th><th>Ingresos</th></>}{isWeb && <><th>Sesiones</th><th>Carrito</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}{isLaunch && <><th>Potenciales</th><th>Formularios</th></>}<th></th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={12} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Sin registros.</td></tr>}
                {rows.map((r, i) => <tr key={i}><td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.date}</td><td>${fmt(r.inversion, 0)}</td><td>${fmt(r.cpm, 2)}</td><td>${fmt(r.cpc, 2)}</td><td>{fmt(r.ctr, 2)}%</td>{isWA && <><td>{fmt(r.leads)}</td><td>{fmt(r.contactados)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso, 0)}</td></>}{isWeb && <><td>{fmt(r.sesiones)}</td><td>{fmt(r.agregar_carrito)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso, 0)}</td><td>{fmt(r.roas, 2)}x</td></>}{isLaunch && <><td>{fmt(r.clientesPotenciales)}</td><td>{fmt(r.formularios)}</td></>}<td><button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("¿Eliminar?")) onUpdate({ ...client, records: (client.records || []).filter((_, xi) => xi !== i) }); }}>×</button></td></tr>)}
              </tbody>
            </table>
          </div>
        </>}
        {tab === "reporte" && <div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <button className="btn btn-primary" disabled={loadingReport || rows.length === 0} onClick={() => generateReport(client, rows, setReport, setLoadingReport)} style={{ marginBottom: "1rem" }}>{loadingReport ? "Generando..." : "Generar reporte IA"}</button>
          {(report || loadingReport) && <div className="ai-report"><div className="ai-report-header"><span>✦</span> Reporte · {client.name}</div><div className={`ai-report-body ${loadingReport && !report ? "streaming-cursor" : ""}`}>{report || " "}{loadingReport && report && <span className="streaming-cursor" />}</div></div>}
        </div>}
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD (solo lectura) ──────────────────────────────────────────
function ClientDashboard({ client, onLogout }) {
  const [tab, setTab] = useState("resumen");
  const [period, setPeriod] = useState("mtd");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const rows = filterByPeriod(client.records || [], period, from, to).sort((a, b) => a.date.localeCompare(b.date));
  const t = buildTotals(client.niche, rows);
  const isWA = client.niche === "whatsapp", isWeb = client.niche === "web", isLaunch = client.niche === "lanzamiento";
  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-badge">Mi panel</div><div className="sidebar-logo-name">{client.name}</div><div className="sidebar-logo-role">Solo lectura</div></div>
        <div className="nav">
          <div className="nav-label">Vistas</div>
          {["resumen", "detalle", "antecedentes"].map(v => <div key={v} className={`nav-item ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}><div className="nav-dot" style={{ background: tab === v ? "var(--accent)" : "var(--border)" }} />{v === "resumen" ? "Resumen" : v === "detalle" ? "Detalle diario" : "Histórico"}</div>)}
        </div>
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo || client.name.slice(0, 2).toUpperCase()}</div>
            <div><div style={{ fontSize: 13, fontWeight: 500 }}>{client.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Vista de cliente</div></div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{tab === "resumen" ? "Resumen" : tab === "detalle" ? "Detalle diario" : "Histórico de pauta"}</div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        </div>
        <div className="content">
          <ProgressBar client={client} />
          {tab === "resumen" && <>
            <div style={{ marginBottom: "1.25rem" }}><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Inversión del período</div><div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--mono)" }}>${t.inversion || "0.00"}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{rows.length} días con datos</div></div>
            <div className="grid4" style={{ marginBottom: "1.25rem" }}><MetricCard label="Alcance" value={t.alcance || "—"} /><MetricCard label="CPM" value={"$" + (t.cpm || "—")} /><MetricCard label="CPC" value={"$" + (t.cpc || "—")} /><MetricCard label="CTR" value={(t.ctr || "—") + "%"} /></div>
            {isWA && <div className="grid4"><MetricCard label="Leads" value={t.leads || "—"} /><MetricCard label="Contactados" value={t.contactados || "—"} /><MetricCard label="Ventas" value={t.ventas || "—"} /><MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight /></div>}
            {isWeb && <div className="grid4"><MetricCard label="Sesiones" value={t.sesiones || "—"} /><MetricCard label="Compras" value={t.compras || "—"} /><MetricCard label="Ingresos" value={"$" + (t.ingreso || "0")} highlight /><MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight /></div>}
            {isLaunch && <div className="grid3"><MetricCard label="Potenciales" value={t.clientesPotenciales || "—"} /><MetricCard label="Formularios" value={t.formularios || "—"} /><MetricCard label="Costo/form" value={"$" + (t.costo_formulario || "—")} highlight /></div>}
            {rows.length > 1 && <div className="card" style={{ marginTop: "1.25rem" }}><div className="card-title">Inversión diaria</div><MiniChart rows={rows} field="inversion" color={client.color} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 6 }}><span>{rows[0].date}</span><span>{rows[rows.length - 1].date}</span></div></div>}
          </>}
          {tab === "detalle" && <div className="card scroll-x"><table className="tbl"><thead><tr><th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>{isWA && <><th>Leads</th><th>Ventas</th><th>Ingresos</th></>}{isWeb && <><th>Sesiones</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}{isLaunch && <><th>Potenciales</th><th>Formularios</th></>}</tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={10} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Sin datos.</td></tr>}{rows.map((r, i) => <tr key={i}><td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.date}</td><td>${fmt(r.inversion, 0)}</td><td>${fmt(r.cpm, 2)}</td><td>${fmt(r.cpc, 2)}</td><td>{fmt(r.ctr, 2)}%</td>{isWA && <><td>{fmt(r.leads)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso, 0)}</td></>}{isWeb && <><td>{fmt(r.sesiones)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso, 0)}</td><td>{fmt(r.roas, 2)}x</td></>}{isLaunch && <><td>{fmt(r.clientesPotenciales)}</td><td>{fmt(r.formularios)}</td></>}</tr>)}</tbody></table></div>}
          {tab === "antecedentes" && <AntecedentesPanel client={client} onUpdate={() => { }} readOnly={true} />}
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
  const [deleteModal, setDeleteModal] = useState(null);
  const selected = clients.find(c => c.id === selectedId);

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo"><div className="sidebar-logo-badge">Admin</div><div className="sidebar-logo-name">Jorge Falcones</div><div className="sidebar-logo-role">Trafficker digital</div></div>
      <div className="nav">
        <div className="nav-label">Panel</div>
        {["clientes", "resumen"].map(v => <div key={v} className={`nav-item ${view === v && !selectedId && !addingClient && !editingClient ? "active" : ""}`} onClick={() => { setSelectedId(null); setAddingClient(false); setEditingClient(null); setView(v); }}><div className="nav-dot" style={{ background: view === v && !selectedId ? "var(--accent)" : "var(--border)" }} />{v === "clientes" ? "Mis clientes" : "Resumen general"}</div>)}
        {clients.length > 0 && <><div className="nav-label">Clientes</div>{clients.map(c => <div key={c.id} className={`nav-item ${selectedId === c.id ? "active" : ""}`} onClick={() => { setSelectedId(c.id); setAddingClient(false); setEditingClient(null); }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span></div>)}</>}
      </div>
      <div className="sidebar-footer"><button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button></div>
    </div>
  );

  function renderModal() {
    if (!deleteModal) return null;
    if (deleteModal === "all") return (
      <ConfirmModal title="⚠️ Eliminar todos los clientes" body="Se descargará un archivo JSON de respaldo por cada cliente antes de eliminar. Esta acción es irreversible." confirmLabel="Descargar y eliminar todo" danger
        onConfirm={() => { clients.forEach(c => exportClientJSON(c)); setTimeout(() => { onDeleteClient("__ALL__"); setDeleteModal(null); }, 600); }}
        onCancel={() => setDeleteModal(null)} />
    );
    return (
      <ConfirmModal title={`Eliminar a ${deleteModal.name}`} body="Se descargará una copia de respaldo en JSON antes de eliminar. Esta acción es irreversible." confirmLabel="Descargar y eliminar" danger
        onConfirm={() => { exportClientJSON(deleteModal); setTimeout(() => { onDeleteClient(deleteModal.id); setDeleteModal(null); setSelectedId(null); }, 300); }}
        onCancel={() => setDeleteModal(null)} />
    );
  }

  if (selectedId && selected) return <><div className="app"><Sidebar /><AdminClientDetail client={selected} onBack={() => setSelectedId(null)} onUpdate={onUpdate} /></div>{renderModal()}</>;
  if (addingClient) return <div className="app"><Sidebar /><div className="main"><div className="topbar"><button className="btn btn-ghost btn-sm" onClick={() => setAddingClient(false)}>← Volver</button><div className="topbar-title">Nuevo cliente</div></div><div className="content"><ClientForm onSave={c => { onAddClient(c); setAddingClient(false); }} onCancel={() => setAddingClient(false)} /></div></div></div>;
  if (editingClient) return <div className="app"><Sidebar /><div className="main"><div className="topbar"><button className="btn btn-ghost btn-sm" onClick={() => setEditingClient(null)}>← Volver</button><div className="topbar-title">Editar: {editingClient.name}</div></div><div className="content"><ClientForm initial={editingClient} onSave={c => { onUpdate({ ...editingClient, ...c }); setEditingClient(null); }} onCancel={() => setEditingClient(null)} /></div></div></div>;

  return (
    <>
      <div className="app"><Sidebar />
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{view === "clientes" ? "Mis clientes" : "Resumen general"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {view === "clientes" && clients.length > 0 && <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal("all")}>🗑 Borrar todo</button>}
              {view === "clientes" && <button className="btn btn-primary btn-sm" onClick={() => setAddingClient(true)}>+ Nuevo cliente</button>}
            </div>
          </div>
          <div className="content">
            {view === "clientes" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
              {clients.map(c => {
                const nl = c.niche === "whatsapp" ? "WhatsApp" : c.niche === "web" ? "Web" : "Lanzamiento";
                const nc = c.niche === "whatsapp" ? "badge-wa" : c.niche === "web" ? "badge-web" : "badge-launch";
                return (
                  <div key={c.id} className="card" style={{ cursor: "pointer", transition: "border-color .15s", marginBottom: 0 }} onMouseEnter={e => e.currentTarget.style.borderColor = c.color + "88"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="avatar" style={{ background: c.color + "22", color: c.color }}>{c.logo || c.name.slice(0, 2).toUpperCase()}</div><div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.representante || "Sin representante"}</div></div></div>
                      <span className={`badge ${nc}`}>{nl}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{(c.records || []).length} registros · {(c.serviciosContratados || []).length} servicios</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedId(c.id)}>Ver perfil</button>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingClient(c); }}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDeleteModal(c); }}>🗑</button>
                    </div>
                  </div>
                );
              })}
              {clients.length === 0 && <div className="empty"><div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>◎</div><div>Sin clientes. Crea el primero.</div></div>}
            </div>}
            {view === "resumen" && <div>
              <div className="grid4" style={{ marginBottom: "1.25rem" }}><MetricCard label="Total clientes" value={clients.length} /><MetricCard label="WhatsApp" value={clients.filter(c => c.niche === "whatsapp").length} /><MetricCard label="Web" value={clients.filter(c => c.niche === "web").length} /><MetricCard label="Lanzamiento" value={clients.filter(c => c.niche === "lanzamiento").length} /></div>
              <div className="card"><div className="card-title">Inversión total por cliente</div>{clients.map(c => { const total = sum(c.records || [], "inversion"); const maxInv = Math.max(...clients.map(cc => sum(cc.records || [], "inversion")), 1); return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><div style={{ width: 110, fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div><div style={{ flex: 1, background: "var(--surface2)", borderRadius: 4, height: 8, overflow: "hidden" }}><div style={{ width: `${(total / maxInv) * 100}%`, height: "100%", background: c.color, borderRadius: 4 }} /></div><div style={{ fontSize: 13, fontFamily: "var(--mono)", minWidth: 72, textAlign: "right" }}>${fmt(total, 0)}</div></div>; })}</div>
            </div>}
          </div>
        </div>
      </div>
      {renderModal()}
    </>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, loading }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState("");
  async function attempt() { setErr(""); const ok = await onLogin(user.trim(), pass); if (!ok) setErr("Usuario o contraseña no encontrados."); }
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo">Trafficker Pro · Dashboard</div>
        <div className="login-title">Bienvenido</div>
        <div className="login-sub">Ingresa con tu usuario y contraseña</div>
        <div className="field"><label>Usuario</label><input type="text" value={user} onChange={e => { setUser(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="tu_usuario" autoFocus /></div>
        <div className="field"><label>Contraseña</label><PasswordInput value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} /></div>
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary btn-full" style={{ marginTop: "1rem" }} disabled={loading} onClick={attempt}>{loading ? "Verificando..." : "Entrar"}</button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    db.getAll().then(data => { setClients(data); setAppLoading(false); });
  }, []);

  async function saveClient(client) {
    await db.upsert(client);
    setClients(prev => prev.find(c => c.id === client.id) ? prev.map(c => c.id === client.id ? client : c) : [...prev, client]);
  }

  async function handleLogin(username, password) {
    setLoginLoading(true);
    if (username === ADMIN.username && password === ADMIN.password) { setSession({ role: "admin" }); setLoginLoading(false); return true; }
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, { headers: dbHeaders });
      const rows = await r.json();
      const all = rows.map(row => row.data);
      setClients(all);
      const found = all.find(c => c.username === username && c.password === password);
      if (found) { setSession({ role: "client", clientId: found.id }); setLoginLoading(false); return true; }
    } catch {}
    setLoginLoading(false); return false;
  }

  async function updateClient(updated) { await saveClient(updated); }
  async function addClient(data) { const nc = { antecedentes: [], records: [], checklist: {}, cuentas: [], contratos: [], ...data, id: "c" + Date.now() }; await saveClient(nc); }
  async function deleteClient(id) {
    if (id === "__ALL__") { await db.deleteAll(); setClients([]); }
    else { await db.delete(id); setClients(prev => prev.filter(c => c.id !== id)); }
  }

  if (appLoading) return (
    <><style>{css}</style>
      <div className="loading-screen"><div className="spinner" /><div style={{ fontSize: 14 }}>Cargando...</div></div>
    </>
  );

  const clientSession = session?.role === "client" ? clients.find(c => c.id === session.clientId) : null;

  return (
    <>
      <style>{css}</style>
      {!session && <LoginScreen onLogin={handleLogin} loading={loginLoading} />}
      {session?.role === "admin" && <AdminPanel clients={clients} onLogout={() => setSession(null)} onUpdate={updateClient} onAddClient={addClient} onDeleteClient={deleteClient} />}
      {session?.role === "client" && clientSession && <ClientDashboard client={clientSession} onLogout={() => setSession(null)} />}
      {session?.role === "client" && !clientSession && <LoginScreen onLogin={handleLogin} loading={loginLoading} />}
    </>
  );
}
