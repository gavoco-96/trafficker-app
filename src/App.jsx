// Trafficker Pro v2.1 — build 18/06/2026
import { useState, useEffect, useCallback, useRef, Component } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://rckcrrdkxmdeexkuuqie.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2NycmRreG1kZWV4a3V1cWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1MTEsImV4cCI6MjA5NTk3ODUxMX0.I5MSkDM16EqNJYYUsgoyOfrcbvAwKXlSTVyQYHd86b4";
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

const db = {
  async getAll() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=*`, { headers: H });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows = await r.json();
      return { ok: true, data: rows.map(row => row.data) };
    } catch (e) { return { ok: false, data: [], error: e.message }; }
  },
  async upsert(client) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: client.id, data: client })
      });
      if (!r.ok) { const txt = await r.text(); throw new Error(`HTTP ${r.status}: ${txt}`); }
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async delete(id) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${id}`, { method: "DELETE", headers: H });
      return { ok: r.ok };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async deleteAll() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?id=neq.IMPOSSIBLE_MATCH_XYZ`, { method: "DELETE", headers: H });
      return { ok: r.ok };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async verify() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=id&limit=1`, { headers: H });
      return { ok: r.ok, status: r.status };
    } catch (e) { return { ok: false, error: e.message }; }
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

// Campos manuales vs calculados en antecedentes
const ANT_MANUALES = [
  { key: "inversion", label: "Inversión", prefix: "$" },
  { key: "ventas_ant", label: "Ventas", prefix: "" },
  { key: "resultados", label: "Resultados", prefix: "" },
  { key: "clics_enlace", label: "Clics en el Enlace", prefix: "" },
  { key: "alcance", label: "Alcance", prefix: "" },
  { key: "impresiones", label: "Impresiones", prefix: "" },
  { key: "ticket_promedio", label: "Ticket Promedio", prefix: "$" },
];

const ANT_CALCULADOS = [
  { key: "ganancia_bruta", label: "Ganancia Bruta", prefix: "$", tipo: "beneficio" },
  { key: "ganancia_neta", label: "Ganancia Neta", prefix: "$", tipo: "beneficio" },
  { key: "roas_marketing", label: "ROAS Marketing", suffix: "x", tipo: "beneficio" },
  { key: "roas_empresarial", label: "ROAS Empresarial", suffix: "x", tipo: "beneficio" },
  { key: "cpa", label: "CPA", prefix: "$", tipo: "costo" },
  { key: "cpr", label: "CPR", prefix: "$", tipo: "costo" },
  { key: "cpc", label: "CPC", prefix: "$", tipo: "costo" },
];

const ANT_TODOS = [...ANT_MANUALES, ...ANT_CALCULADOS];

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#080B12;--surface:#0D1220;--surface2:#111827;--border:#1a2540;
    --text:#F0EFF8;--muted:#6B7A99;
    --accent:#004AAD;--accent-glow:rgba(0,74,173,.35);
    --accent2:#FFDE59;--accent2-glow:rgba(255,222,89,.25);
    --orange:#FF914D;--orange-glow:rgba(255,145,77,.25);
    --green:#10B981;--red:#EF4444;--amber:#FFDE59;
    --font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;--r:10px;--r2:16px;
  }
  html,body,#root{height:100%;width:100%}
  body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px}
  /* Glow effects con colores de marca */
  .btn-primary{box-shadow:0 0 14px var(--accent-glow)}
  .btn-primary:hover{box-shadow:0 0 22px var(--accent-glow);opacity:1;background:#0057cc}
  .nav-item.active{background:rgba(0,74,173,.18);color:#4d9fff;box-shadow:inset 2px 0 0 var(--accent)}
  .metric{border-color:var(--border)}
  .metric:hover{border-color:rgba(0,74,173,.4);box-shadow:0 0 12px var(--accent-glow)}
  .tab.active{color:#4d9fff;border-bottom-color:var(--accent)}
  .sidebar{background:#0a0f1e;border-right:1px solid var(--border)}
  .topbar{background:#0a0f1e;border-bottom:1px solid var(--border)}
  .sidebar-logo-badge{color:var(--accent2);background:var(--accent2-glow)}
  .login-card{box-shadow:0 0 40px var(--accent-glow)}
  .card{border-color:var(--border)}
  .card:hover{border-color:rgba(0,74,173,.3)}
  .kpi-progress-fill{box-shadow:0 0 8px currentColor}
  .pill.active{background:var(--accent);box-shadow:0 0 10px var(--accent-glow)}
  .fb-chip.active{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .col-chip.active{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .servicio-chip.selected{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .badge-wa{background:rgba(16,185,129,.15);color:#10B981}
  .badge-web{background:rgba(255,222,89,.12);color:#c9a800}
  .badge-launch{background:rgba(255,145,77,.12);color:#FF914D}
  .tbl tr:hover td{background:rgba(0,74,173,.06)}
  /* Highlight accent2 (amarillo) para valores importantes */
  .metric-value[style*="accent"]{text-shadow:0 0 12px var(--accent2-glow)}
  .app{display:flex;height:100vh;overflow:hidden}
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
  input:read-only{opacity:.6;cursor:not-allowed}
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
  /* TOAST */
  .toast{position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;animation:slideUp .25s ease;max-width:320px;box-shadow:0 4px 24px rgba(0,0,0,.4)}
  .toast-ok{background:#10B981;color:#fff}
  .toast-err{background:#EF4444;color:#fff}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  /* DB STATUS */
  .db-status{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:600}
  .db-ok{background:rgba(16,185,129,.12);color:var(--green)}
  .db-err{background:rgba(239,68,68,.12);color:var(--red)}
  .db-checking{background:rgba(245,158,11,.12);color:var(--amber)}
  .db-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
  /* LAYOUT */
  .sidebar{width:230px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;height:100vh;overflow-y:auto;flex-shrink:0}
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
  .main{flex:1;display:flex;flex-direction:column;min-width:0;height:100vh;overflow:hidden}
  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .topbar-title{font-size:16px;font-weight:600}
  .content{padding:1.5rem;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
  /* CARDS */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem}
  .card-title{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem}
  .card:hover .card-controls{opacity:1!important;transition:opacity .2s}
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
  .badge-active{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-closed{background:rgba(107,114,128,.12);color:var(--muted)}
  .badge-progress{background:rgba(14,165,233,.12);color:var(--accent2)}
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
  /* PROGRESS */
  .progress-stages{display:flex;gap:4px;margin-bottom:.75rem}
  .stage-block{flex:1;position:relative;cursor:pointer}
  .stage-bar{height:8px;border-radius:4px;transition:all .3s}
  .stage-label{font-size:9px;font-weight:600;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage-tooltip{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:11px;white-space:nowrap;z-index:100;pointer-events:none;opacity:0;transition:opacity .15s;min-width:160px}
  .stage-block:hover .stage-tooltip{opacity:1}
  /* CHECKLIST COLAPSABLE */
  .checklist-service{background:var(--surface2);border-radius:10px;margin-bottom:.75rem;overflow:hidden}
  .checklist-service-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;user-select:none}
  .checklist-service-header:hover{background:rgba(255,255,255,.03)}
  .checklist-service-body{padding:0 14px 12px}
  .check-item{display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg);border-radius:7px;font-size:13px;margin-bottom:6px}
  .check-item.done{opacity:.55;text-decoration:line-through}
  .check-item input[type=checkbox]{width:15px;height:15px;cursor:pointer;accent-color:var(--accent);flex-shrink:0}
  .chevron{transition:transform .2s;font-size:12px;color:var(--muted)}
  .chevron.open{transform:rotate(180deg)}
  .upgrade-badge{font-size:10px;background:rgba(249,115,22,.12);color:var(--orange);padding:2px 7px;border-radius:10px;font-weight:600;margin-left:auto;white-space:nowrap}
  /* CUENTAS */
  .cuenta-row{display:grid;grid-template-columns:170px 1fr 1fr auto;gap:.75rem;align-items:center;margin-bottom:.75rem}
  /* CONTRATOS COLAPSABLES */
  .contrato-card{border-radius:var(--r);margin-bottom:.75rem;border:1px solid var(--border);overflow:hidden}
  .contrato-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--surface2);cursor:pointer;user-select:none;gap:12px}
  .contrato-header:hover{background:rgba(255,255,255,.03)}
  .contrato-body{padding:1rem;background:var(--surface)}
  .contrato-actions{display:flex;gap:8px;align-items:center}
  /* ANTECEDENTES */
  .ant-cell-green{background:rgba(16,185,129,.15);color:#10B981;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-amber{background:rgba(245,158,11,.15);color:#F59E0B;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-red{background:rgba(239,68,68,.15);color:#EF4444;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-neutral{color:var(--text);padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-calc{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.15);border-radius:8px;padding:10px 12px;font-size:13px;font-family:var(--mono);color:var(--accent)}
  /* CHART */
  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:1rem}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:4px;transition:opacity .15s;cursor:pointer}.bar:hover{opacity:.7}
  /* AI */
  .ai-report{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .ai-report-header{display:flex;align-items:center;gap:8px;margin-bottom:.75rem;font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em}
  .ai-report-body{font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}
  .streaming-cursor::after{content:'▌';animation:blink .7s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  /* PROYECCIONES */
  .kpi-card{background:var(--surface2);border-radius:var(--r);padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .kpi-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;gap:12px}
  .kpi-progress-bar{height:10px;background:var(--border);border-radius:5px;overflow:hidden;margin:.5rem 0}
  .kpi-progress-fill{height:100%;border-radius:5px;transition:width .4s ease}
  .kpi-relevance-high{color:var(--red);font-weight:600;font-size:11px}
  .kpi-relevance-mid{color:var(--amber);font-weight:600;font-size:11px}
  .kpi-relevance-low{color:var(--green);font-weight:600;font-size:11px}
  .funnel-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;padding:1rem 0}
  .funnel-stage{display:flex;align-items:center;width:100%;transition:all .3s}
  .funnel-bar{height:44px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:13px;font-weight:500;transition:width .4s ease;min-width:120px}
  .funnel-label{font-size:12px;color:var(--muted);width:100px;text-align:right;margin-right:12px;flex-shrink:0}
  .funnel-count{font-family:var(--mono);font-size:13px;color:var(--muted);width:80px;text-align:left;margin-left:12px;flex-shrink:0}
  .funnel-pct{font-size:11px;opacity:.7;margin-left:6px}
  /* BANNER */
  .banner-wrap{width:100%;overflow:hidden;border-radius:var(--r2);background:var(--surface);position:relative;user-select:none}
  .banner-track{display:flex;transition:transform .4s ease}
  .banner-slide{flex-shrink:0;width:100%;max-height:320px;object-fit:contain;object-position:center;display:block;background:#000}
  .banner-dots{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
  .banner-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.4);cursor:pointer;border:none;transition:background .2s}
  .banner-dot.active{background:#fff}
  .banner-arrow{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
  .banner-arrow:hover{background:rgba(0,0,0,.7)}
  .banner-arrow.left{left:12px}
  .banner-arrow.right{right:12px}
  .banner-admin-card{background:var(--surface2);border-radius:10px;padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .banner-preview{width:100%;height:120px;object-fit:cover;border-radius:8px;background:var(--border);display:block;margin-top:8px}
  .banner-hint{font-size:11px;color:var(--muted);opacity:.7;margin-top:6px;line-height:1.5}
  /* COLUMN SELECTOR */
  .col-selector{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:var(--surface2);border-radius:var(--r);margin-bottom:1rem}
  .col-chip{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;transition:all .15s;user-select:none}
  .col-chip.active{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  /* TELEGRAM VIEW/EDIT */
  .tg-plantilla-view{background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--border);transition:border-color .15s}
  .tg-plantilla-view:hover{border-color:var(--accent2)}
  .tg-plantilla-view.selected{border-color:var(--accent2);background:rgba(14,165,233,.06)}
  /* NOTIFICACIONES */
  .notif-bell{position:relative;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;transition:background .15s}
  .notif-bell:hover{background:var(--surface2)}
  .notif-badge{position:absolute;top:2px;right:2px;background:var(--red);color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1}
  .notif-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);width:320px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:500;overflow:hidden}
  .notif-item{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
  .notif-item:hover{background:var(--surface2)}
  .notif-item:last-child{border-bottom:none}
  .notif-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
  .notif-dot-red{background:var(--red);box-shadow:0 0 6px var(--red)}
  .notif-dot-amber{background:var(--amber);box-shadow:0 0 6px var(--amber)}
  .notif-dot-blue{background:#4d9fff;box-shadow:0 0 6px var(--accent)}
  /* ONBOARDING */
  .onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:flex-start;justify-content:center;z-index:2000;padding:1rem;overflow-y:auto}
  .onboarding-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2rem;width:100%;max-width:560px;box-shadow:0 0 60px var(--accent-glow);margin:auto}
  .onboarding-steps{display:flex;gap:6px;margin-bottom:2rem}
  .onboarding-step{height:4px;flex:1;border-radius:2px;transition:background .3s}
  .onboarding-step.done{background:var(--accent)}
  .onboarding-step.active{background:var(--accent2)}
  .onboarding-step.pending{background:var(--border)}
  /* HEALTH DASHBOARD */
  .health-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1rem}
  .health-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(26,37,64,.8);font-size:13px}
  .health-row:last-child{border-bottom:none}
  .health-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .health-ok{background:var(--green);box-shadow:0 0 6px var(--green)}
  .health-warn{background:var(--amber);box-shadow:0 0 6px var(--amber)}
  .health-err{background:var(--red);box-shadow:0 0 6px var(--red)}
  /* HERMES PRODUCT */
  .hermes-progress-wrap{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem;overflow:hidden}
  .hermes-track{position:relative;height:48px;background:linear-gradient(90deg,#0a0f1e 0%,#0d1a3a 50%,#1a0a2e 100%);border-radius:10px;overflow:hidden;margin:1rem 0}
  .hermes-stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,rgba(255,222,89,.6) 0%,transparent 100%),radial-gradient(1px 1px at 60% 20%,rgba(255,255,255,.4) 0%,transparent 100%),radial-gradient(1px 1px at 80% 60%,rgba(255,222,89,.3) 0%,transparent 100%),radial-gradient(1px 1px at 40% 70%,rgba(255,255,255,.3) 0%,transparent 100%),radial-gradient(1px 1px at 90% 40%,rgba(255,222,89,.5) 0%,transparent 100%)}
  .hermes-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(0,74,173,.3),rgba(255,222,89,.15));transition:width .8s ease;border-right:2px solid var(--accent2)}
  .hermes-carriage{position:absolute;top:50%;transform:translateY(-50%);font-size:22px;transition:left .8s ease;filter:drop-shadow(0 0 8px rgba(255,222,89,.8))}
  .hermes-temple{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:20px;filter:drop-shadow(0 0 6px rgba(255,222,89,.6))}
  .hermes-checkpoints{display:flex;justify-content:space-between;padding:0 4px}
  .hermes-cp{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1}
  .hermes-cp-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--border);transition:all .2s}
  .hermes-cp-dot.done{background:var(--accent2);border-color:var(--accent2);box-shadow:0 0 10px rgba(255,222,89,.5)}
  .hermes-cp-dot.active{background:rgba(255,222,89,.2);border-color:var(--accent2);animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,222,89,.4)}50%{box-shadow:0 0 0 6px rgba(255,222,89,0)}}
  .hermes-cp-label{font-size:9px;color:var(--muted);text-align:center;max-width:70px;line-height:1.2}
  /* KPI COMPARATIVO */
  .kpi-compare-table{width:100%;border-collapse:collapse}
  .kpi-compare-table th{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:8px 12px;border-bottom:1px solid var(--border);text-align:left}
  .kpi-compare-table td{padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.6);font-size:13px}
  .kpi-compare-table tr:last-child td{border-bottom:none}
  .delta-up{color:var(--green);font-weight:600;font-size:12px}
  .delta-down{color:var(--red);font-weight:600;font-size:12px}
  .delta-neutral{color:var(--muted);font-size:12px}
  /* BIBLIOTECA */
  .biblioteca-row{display:grid;gap:.75rem;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.6);font-size:13px}
  .biblioteca-row:hover{background:rgba(0,74,173,.04)}
  .iv-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:var(--mono)}
  .iv-green{background:rgba(16,185,129,.15);color:var(--green);box-shadow:0 0 8px rgba(16,185,129,.2)}
  .iv-amber{background:rgba(255,222,89,.12);color:#c9a800;box-shadow:0 0 8px rgba(255,222,89,.15)}
  .iv-red{background:rgba(239,68,68,.12);color:var(--red)}
  /* EMBUDO HERMES - forma real de embudo */
  .funnel-container{display:flex;flex-direction:column;align-items:center;gap:2px;padding:.75rem 0;width:100%}
  .funnel-level{display:flex;flex-direction:column;align-items:center;width:100%}
  .funnel-shape{display:flex;align-items:center;justify-content:space-between;padding:0 16px;color:#fff;font-weight:600;font-size:12px;transition:width .5s;clip-path:polygon(5% 0%,95% 0%,100% 100%,0% 100%);border-radius:2px}
  .funnel-connector{width:2px;height:6px;background:var(--border)}
  .funnel-label-row{display:flex;justify-content:space-between;width:100%;padding:2px 4px;margin-bottom:2px}
  .funnel-stage-label{font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}
  .funnel-stage-val{font-size:11px;font-family:var(--mono);font-weight:700}
  .funnel-conv-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:1px 6px;border-radius:8px}
  /* CALENDARIO */
  .cal-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden}
  .cal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border)}
  .cal-cell{background:var(--surface);padding:6px 4px;min-height:64px;cursor:pointer;transition:background .15s;position:relative}
  .cal-cell:hover{background:var(--surface2)}
  .cal-cell.today{background:rgba(0,74,173,.1);border:1px solid rgba(0,74,173,.3)}
  .cal-cell.disabled{opacity:.3;cursor:default;pointer-events:none}
  .cal-cell.available{background:rgba(16,185,129,.06)}
  .cal-day{font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px}
  .cal-day.today-num{color:var(--accent);font-weight:700}
  .cal-event{font-size:10px;padding:1px 5px;border-radius:4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
  .cal-event-grabacion{background:rgba(0,74,173,.25);color:#4d9fff}
  .cal-event-reunion{background:rgba(255,222,89,.2);color:#c9a800}
  .cal-event-metricas{background:rgba(16,185,129,.2);color:var(--green)}
  .cal-dow{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;text-align:center;padding:6px 0;background:var(--surface2)}
  .hermes-funnel{display:flex;flex-direction:column;gap:6px;align-items:center;padding:1rem 0}
  .hf-stage{display:flex;align-items:center;width:100%;max-width:500px;gap:12px}
  .hf-bar{height:40px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:12px;font-weight:600;transition:width .5s ease;min-width:80px}
  .hf-label{font-size:11px;color:var(--muted);width:90px;text-align:right;flex-shrink:0}
  .hf-pct{font-size:11px;color:var(--muted);width:50px;flex-shrink:0}
  /* FILMMAKER */
  .fm-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(255,145,77,.15);color:var(--orange);border:1px solid rgba(255,145,77,.3)}
  .fm-avail-chip{padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .fm-avail-chip.available{background:rgba(16,185,129,.15);border-color:var(--green);color:var(--green)}
  .fm-avail-chip.unavailable{background:rgba(239,68,68,.1);border-color:var(--red);color:var(--red)}
  /* ESTUDIO */
  .ficha-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;margin-bottom:.75rem;transition:border-color .15s}
  .ficha-wrap:hover{border-color:rgba(0,74,173,.3)}
  .ficha-header{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:var(--surface2)}
  .ficha-estado{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
  .estado-borrador{background:rgba(107,117,153,.15);color:var(--muted)}
  .estado-revision{background:rgba(255,222,89,.12);color:#c9a800}
  .estado-aprobado{background:rgba(16,185,129,.15);color:var(--green)}
  .estado-grabado{background:rgba(0,74,173,.15);color:#4d9fff}
  .estado-edicion{background:rgba(255,145,77,.12);color:var(--orange)}
  .ficha-field{margin-bottom:.75rem}
  .ficha-field label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:4px}
  .ficha-field .ficha-value{font-size:13px;color:var(--text);line-height:1.6;white-space:pre-wrap;background:var(--surface2);border-radius:8px;padding:8px 12px;min-height:32px}
  .ficha-field textarea{min-height:80px;resize:vertical;font-size:13px;line-height:1.6}
  .stars-wrap{display:flex;gap:4px}
  .star{font-size:20px;cursor:pointer;transition:transform .1s;user-select:none}
  .star:hover{transform:scale(1.2)}
  .nota-cliente{background:rgba(255,222,89,.06);border:1px solid rgba(255,222,89,.2);border-radius:8px;padding:10px 12px;font-size:12px;margin-top:4px}
  /* Ocultar flechas nativas de input number en todos los browsers */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
  /* FACEBOOK */
  .fb-card{background:rgba(24,119,242,.08);border:1px solid rgba(24,119,242,.25);border-radius:var(--r2);padding:1.25rem;margin-bottom:1rem}
  .fb-header{display:flex;align-items:center;gap:10px;margin-bottom:.75rem;font-size:13px;font-weight:600;color:#1877F2}
  .fb-metric-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}
  .fb-metric-row:last-child{border-bottom:none}
  .fb-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .fb-chip.active{background:rgba(24,119,242,.15);border-color:#1877F2;color:#1877F2}
  .fb-sync-badge{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
  .fb-sync-ok{background:rgba(16,185,129,.12);color:var(--green)}
  .fb-sync-err{background:rgba(239,68,68,.12);color:var(--red)}
  .fb-sync-loading{background:rgba(245,158,11,.12);color:var(--amber)}
  /* TELEGRAM */
  .tg-card{background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .tg-header{display:flex;align-items:center;gap:10px;margin-bottom:.75rem;font-size:13px;font-weight:600;color:var(--accent2)}
  /* MISC */
  .scroll-x{overflow-x:auto}
  .empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
  .sec-title{font-size:15px;font-weight:600}
  .info-row{display:flex;gap:.5rem;align-items:baseline;margin-bottom:.5rem;font-size:13px}
  .info-label{color:var(--muted);min-width:140px;font-size:12px}
  .loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;color:var(--muted)}
  .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
  .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2rem;max-width:480px;width:100%}
  .modal-title{font-size:18px;font-weight:600;margin-bottom:.75rem}
  .modal-body{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:1.5rem}
  .servicio-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .servicio-chip.selected{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  .chips-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:.5rem}
  @media(max-width:640px){.sidebar{display:none}.grid4{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:1fr 1fr}.form-row,.form-row3{grid-template-columns:1fr}.cuenta-row{grid-template-columns:1fr 1fr}}
  @media(max-width:900px){.grid4{grid-template-columns:1fr 1fr}.onboarding-card{padding:1.25rem}.tab-row{overflow-x:auto;flex-wrap:nowrap}}
  /* Zoom alto: asegurar que el contenido siga siendo navegable */
  @media(max-height:600px){.onboarding-overlay{align-items:flex-start;padding:.5rem}.onboarding-card{margin:.5rem auto}.sidebar{height:100vh}}
  /* Scrollbar estilizado */
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
  ::-webkit-scrollbar-thumb:hover{background:var(--muted)}
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtNum = (n, dec = 0) => (n === "" || n === null || n === undefined || isNaN(Number(n))) ? "—" : Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = (n) => n && !isNaN(n) ? "$" + fmtNum(n, 2) : "—";
const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;
// Formato de fecha compacto: "2026-06-04" → "04/06/26"
const fmtDate = (d) => { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y.slice(2)}`; };
const parseNum = (v) => v === "" ? "" : parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0;

// Input numérico - solución definitiva con input type=number
// Maneja su propio string interno para no perder el cursor ni el punto decimal
function NumInput({ value, onChange, placeholder, prefix, readOnly, highlight }) {
  // str es el texto que el usuario ve y escribe - NUNCA se resetea desde afuera mientras hay foco
  const [str, setStr] = useState(
    value === "" || value === undefined || value === null ? "" : String(value)
  );
  const focused = useRef(false);

  // Solo actualizar la representación visual cuando el campo no tiene foco
  // Esto evita que un re-render externo interrumpa lo que el usuario escribe
  useEffect(() => {
    if (!focused.current) {
      setStr(value === "" || value === undefined || value === null ? "" : String(value));
    }
  }, [value]);

  function onFocus() {
    focused.current = true;
    // Al hacer foco, mostrar el valor actual limpio
    setStr(value === "" || value === undefined || value === null ? "" : String(value));
  }

  function onBlur() {
    focused.current = false;
    // Al salir, normalizar (quitar punto final, etc)
    const n = parseFloat(str);
    if (!isNaN(n)) {
      setStr(String(n));
      onChange(n);
    } else {
      setStr("");
      onChange("");
    }
  }

  function onChangeInput(e) {
    const raw = e.target.value;
    // Permitir: dígitos, un punto decimal, no hay límite de caracteres
    let clean = raw.replace(/[^0-9.]/g, "");
    // Solo un punto
    const dotIdx = clean.indexOf(".");
    if (dotIdx !== -1) {
      clean = clean.slice(0, dotIdx + 1) + clean.slice(dotIdx + 1).replace(/\./g, "");
    }
    setStr(clean);
    if (clean === "" || clean === ".") {
      onChange("");
    } else {
      const n = parseFloat(clean);
      if (!isNaN(n)) onChange(n);
    }
  }

  return (
    <div className="input-prefix">
      {prefix && <span className="pre">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={str}
        onChange={onChangeInput}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder || "0"}
        readOnly={readOnly}
        style={highlight ? { borderColor: "rgba(124,58,237,.5)", background: "rgba(124,58,237,.05)" } : {}}
      />
    </div>
  );
}


function filterByPeriod(records, period, from, to) {
  const now = new Date();
  const ago = (days) => { const d = new Date(now); d.setDate(d.getDate() - days); return d; };
  return (records || []).filter(r => {
    const d = new Date(r.date + "T12:00:00");
    if (period === "custom") return (!from || d >= new Date(from + "T00:00:00")) && (!to || d <= new Date(to + "T23:59:59"));
    if (period === "hoy")   { const h = new Date(now.toISOString().slice(0,10) + "T00:00:00"); return d >= h; }
    if (period === "ayer")  { const a = ago(1); a.setHours(0,0,0,0); const b = new Date(a); b.setHours(23,59,59,999); return d >= a && d <= b; }
    if (period === "2d")    return d >= ago(2);
    if (period === "7d")    return d >= ago(7);
    if (period === "15d")   return d >= ago(15);
    if (period === "30d")   return d >= ago(30);
    if (period === "mtd")   return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "mes_ant") { const mp = new Date(now.getFullYear(), now.getMonth()-1, 1); const mf = new Date(now.getFullYear(), now.getMonth(), 0); return d >= mp && d <= mf; }
    if (period === "90d")   return d >= ago(90);
    return true; // "all"
  });
}

// Filtrar registros por búsqueda de nomenclatura de campañas
function filterByNomenclatura(records, busqueda) {
  if (!busqueda || !busqueda.trim()) return records;
  const q = busqueda.toLowerCase().trim();
  return records.filter(r => {
    const campos = [r.campanas, r.conjuntos, r.anuncios, r.etiquetas, r.notas_dia].filter(Boolean).join(" ").toLowerCase();
    return campos.includes(q);
  });
}

function buildTotals(niche, rows) {
  if (!rows.length) return {};
  const inv = sum(rows, "inversion"), leads = sum(rows, "leads"), ventas = sum(rows, "ventas");
  const contactados = sum(rows, "contactados"), ingreso = sum(rows, "ingreso");
  const sesiones = sum(rows, "sesiones"), compras = sum(rows, "compras"), agregar = sum(rows, "agregar_carrito");
  const alcance = sum(rows, "alcance");
  const formularios = sum(rows, "formularios");
  const clientesPotenciales = sum(rows, "clientesPotenciales");
  // Resultados: tomar el campo resultados si existe, si no usar formularios o leads según nicho
  const resultadosRaw = sum(rows, "resultados");
  const resultados = resultadosRaw > 0 ? resultadosRaw : niche === "lanzamiento" ? formularios : leads;
  return {
    inversion: fmtNum(inv, 2), alcance: fmtNum(alcance), leads: fmtNum(leads),
    contactados: fmtNum(contactados), ventas: fmtNum(ventas), ingreso: fmtNum(ingreso, 2),
    cpm: fmtNum(avg(rows, "cpm"), 2), cpc: fmtNum(avg(rows, "cpc"), 2), ctr: fmtNum(avg(rows, "ctr"), 2),
    tasaContacto: leads ? fmtNum(contactados / leads * 100, 1) : "—",
    tasaCierre: contactados ? fmtNum(ventas / contactados * 100, 1) : "—",
    cpl: leads ? fmtNum(inv / leads, 2) : "—",
    cpv: ventas ? fmtNum(inv / ventas, 2) : "—",
    roas: inv ? fmtNum(ingreso / inv, 2) : "—",
    sesiones: fmtNum(sesiones), agregar_carrito: fmtNum(agregar), compras: fmtNum(compras),
    convRate: sesiones ? fmtNum(compras / sesiones * 100, 2) : "—",
    cpp: compras ? fmtNum(inv / compras, 2) : "—",
    clientesPotenciales: fmtNum(clientesPotenciales),
    formularios: fmtNum(formularios),
    resultados: fmtNum(resultados),
    cpa: resultados ? fmtNum(inv / resultados, 2) : "—",
    costo_formulario: formularios ? fmtNum(inv / formularios, 2) : "—",
  };
}

// Calcular campos automáticos de antecedentes
function calcAntecedentes(form) {
  const inv = parseFloat(form.inversion) || 0;
  const ventas = parseFloat(form.ventas_ant) || 0;
  const resultados = parseFloat(form.resultados) || 0;
  const clics = parseFloat(form.clics_enlace) || 0;
  const ticket = parseFloat(form.ticket_promedio) || 0;
  const margen = parseFloat(form.margen_ganancia) || 0.3;
  const gb = ventas * ticket;
  const gn = gb * margen;
  const roas_mk = inv > 0 ? gb / inv : 0;
  const roas_emp = inv > 0 ? gn / inv : 0;
  const cpa = resultados > 0 ? inv / resultados : 0;
  const cpr = ventas > 0 ? inv / ventas : 0;
  const cpc_calc = clics > 0 ? inv / clics : 0;
  return {
    ganancia_bruta: gb > 0 ? gb : "",
    ganancia_neta: gn > 0 ? gn : "",
    roas_marketing: roas_mk > 0 ? roas_mk : "",
    roas_empresarial: roas_emp > 0 ? roas_emp : "",
    cpa: cpa > 0 ? cpa : "",
    cpr: cpr > 0 ? cpr : "",
    cpc: cpc_calc > 0 ? cpc_calc : "",
  };
}

// Export utils
function exportClientJSON(client) {
  const blob = new Blob([JSON.stringify(client, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `cliente_${client.name}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
}
function exportAntecedentes(antecedentes, clientName, formato) {
  if (!antecedentes?.length) return;
  const fields = [...ANT_MANUALES, ...ANT_CALCULADOS];
  const headers = ["Red", "Período", ...fields.map(c => c.label)];
  const rows = antecedentes.map(a => [a.red || "", `${a.fechaInicio || ""} - ${a.fechaFin || ""}`, ...fields.map(c => a[c.key] || "")]);
  const sep = formato === "csv" ? "," : "\t";
  const content = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(sep)).join("\n");
  const blob = new Blob(["\ufeff" + content], { type: formato === "csv" ? "text/csv" : "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `antecedentes_${clientName}.${formato}`; a.click();
  URL.revokeObjectURL(url);
}

// ─── AI REPORT ────────────────────────────────────────────────────────────────
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

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return <div className={`toast toast-${type}`}><span>{type === "ok" ? "✓" : "✕"}</span>{msg}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "ok") => setToast({ msg, type, key: Date.now() });
  const el = toast ? <Toast key={toast.key} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null;
  return { show, el };
}

// ─── DB STATUS ────────────────────────────────────────────────────────────────
function DbStatus() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    db.verify().then(r => setStatus(r.ok ? "ok" : "err"));
    const interval = setInterval(() => db.verify().then(r => setStatus(r.ok ? "ok" : "err")), 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className={`db-status db-${status}`}>
      <div className="db-dot" />
      {status === "ok" ? "Base de datos OK" : status === "err" ? "Sin conexión a BD" : "Verificando..."}
    </div>
  );
}

// ─── PASSWORD INPUT ───────────────────────────────────────────────────────────
function PasswordInput({ value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder="••••••••" />
      <button type="button" className="eye-btn" onClick={() => setShow(s => !s)}>
        {show ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
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
                {activo ? <><div style={{ color: "var(--muted)", whiteSpace: "pre", fontSize: 11 }}>{svc.subetapas.map(s => `${checklist[svc.id]?.[s] ? "✓" : "○"} ${s}`).join("\n")}</div><div style={{ color: "var(--accent)", fontWeight: 600, marginTop: 4 }}>{done}/{svc.subetapas.length}</div></> : <div style={{ color: "var(--muted)", fontSize: 11 }}>No contratado</div>}
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

// ─── CHECKLIST COLAPSABLE ─────────────────────────────────────────────────────
function ChecklistPanel({ client, onUpdate }) {
  const checklist = client.checklist || {};
  const servicios = client.serviciosContratados || [];
  const [open, setOpen] = useState({});
  function toggle(svcId, sub) { onUpdate({ ...client, checklist: { ...checklist, [svcId]: { ...(checklist[svcId] || {}), [sub]: !checklist[svcId]?.[sub] } } }); }
  function toggleOpen(id) { setOpen(p => ({ ...p, [id]: !p[id] })); }
  return (
    <div>
      {SERVICIOS_DEFAULT.map(svc => {
        const activo = servicios.includes(svc.id);
        const done = svc.subetapas.filter(s => checklist[svc.id]?.[s]).length;
        const isOpen = !!open[svc.id];
        return (
          <div key={svc.id} className="checklist-service" style={{ opacity: activo ? 1 : 0.6 }}>
            <div className="checklist-service-header" onClick={() => toggleOpen(svc.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.nombre}</div>
                {!activo && <span className="upgrade-badge">UPGRADE</span>}
                {activo && <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--bg)", padding: "2px 8px", borderRadius: 10 }}>{done}/{svc.subetapas.length}</span>}
              </div>
              <span className={`chevron ${isOpen ? "open" : ""}`}>▼</span>
            </div>
            {isOpen && (
              <div className="checklist-service-body">
                {svc.subetapas.map(sub => (
                  <div key={sub} className={`check-item${checklist[svc.id]?.[sub] ? " done" : ""}`}
                    style={{ cursor: activo ? "pointer" : "default" }}
                    onClick={() => activo && toggle(svc.id, sub)}>
                    <input type="checkbox" checked={!!checklist[svc.id]?.[sub]} readOnly disabled={!activo} />
                    <span>{sub}</span>
                    {!activo && <span className="upgrade-badge">No contratado</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── CUENTAS CON GUARDADO + VERIFICACIÓN ─────────────────────────────────────
function CuentasPanel({ client, onUpdate, readOnly }) {
  const [local, setLocal] = useState(client.cuentas || []);
  const [saving, setSaving] = useState(false);
  const { show, el: toastEl } = useToast();

  useEffect(() => { setLocal(client.cuentas || []); }, [client.cuentas]);

  function addCuenta() { setLocal(p => [...p, { red: "facebook", usuario: "", password: "" }]); }
  function upd(i, f, v) { setLocal(p => p.map((c, xi) => xi === i ? { ...c, [f]: v } : c)); }
  function rem(i) { setLocal(p => p.filter((_, xi) => xi !== i)); }

  async function save() {
    setSaving(true);
    const updated = { ...client, cuentas: local };
    const result = await db.upsert(updated);
    if (result.ok) {
      onUpdate(updated);
      // Verificar que realmente se guardó
      const verify = await db.verify();
      show(verify.ok ? "✓ Cuentas guardadas en base de datos" : "Guardado localmente, sin confirmar en BD", verify.ok ? "ok" : "err");
    } else {
      show("Error al guardar: " + (result.error || "intenta de nuevo"), "err");
    }
    setSaving(false);
  }

  if (readOnly) return (
    <div className="card"><div className="card-title">Cuentas vinculadas</div>
      {(client.cuentas || []).length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Sin cuentas registradas.</div>}
      {(client.cuentas || []).map((c, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}><span style={{ color: "var(--muted)", minWidth: 150 }}>{REDES_SOCIALES.find(r => r.id === c.red)?.label || c.red}</span><span>{c.usuario}</span></div>)}
    </div>
  );
  return (
    <>
      {toastEl}
      <div className="card">
        <div className="sec-header"><div className="card-title" style={{ margin: 0 }}>Cuentas y accesos</div><button className="btn btn-ghost btn-sm" onClick={addCuenta}>+ Añadir</button></div>
        {local.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>Sin cuentas. Añade la primera.</div>}
        {local.map((c, i) => (
          <div key={i} className="cuenta-row">
            <select value={c.red} onChange={e => upd(i, "red", e.target.value)}>{REDES_SOCIALES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
            <input type="text" value={c.usuario} onChange={e => upd(i, "usuario", e.target.value)} placeholder="Usuario / correo" />
            <input type="text" value={c.password} onChange={e => upd(i, "password", e.target.value)} placeholder="Contraseña" />
            <button className="btn btn-danger btn-sm" onClick={() => rem(i)}>×</button>
          </div>
        ))}
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button className="btn btn-green btn-sm" disabled={saving} onClick={save}>{saving ? "Guardando..." : "💾 Guardar cuentas"}</button>
          <DbStatus />
        </div>
      </div>
    </>
  );
}

// ─── CONTRATOS COLAPSABLES CON MODO VER/EDITAR ────────────────────────────────
function getContratoEstado(ct) {
  const pagadas = (ct.cuotas || []).filter(c => c.pagado).length;
  const total = (ct.cuotas || []).length;
  if (pagadas === total && total > 0) return { label: "Pago completo", cls: "badge-paid" };
  if (pagadas > 0) return { label: `${pagadas}/${total} cuotas`, cls: "badge-partial" };
  return { label: "Pendiente", cls: "badge-pending" };
}

function getContratoStatus(ct) {
  if (!ct.fechaInicio) return { label: "Borrador", cls: "badge-closed" };
  const hoy = new Date();
  const inicio = new Date(ct.fechaInicio);
  const fin = ct.fechaFin ? new Date(ct.fechaFin) : null;
  if (fin && hoy > fin) return { label: "Cerrado", cls: "badge-closed" };
  if (hoy >= inicio) return { label: "Activo", cls: "badge-active" };
  return { label: "En proceso", cls: "badge-progress" };
}

function ContratoItem({ ct, i, onSave, onRemove, toast }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState({ ...ct });
  const [saving, setSaving] = useState(false);

  const upd = (k, v) => setLocal(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const total = (local.servicios || []).reduce((a, s) => a + (parseFloat(s.precio) || 0), 0);
    if (total > 0) setLocal(p => ({ ...p, totalContrato: total.toFixed(2) }));
  }, [JSON.stringify(local.servicios)]);

  useEffect(() => {
    const total = parseFloat(local.totalContrato) || 0;
    if (total > 0 && local.cuotas?.length > 0) {
      const pc = (total / local.cuotas.length).toFixed(2);
      setLocal(p => ({ ...p, cuotas: p.cuotas.map(c => ({ ...c, monto: pc })) }));
    }
  }, [local.totalContrato, local.cuotas?.length]);

  async function save() {
    setSaving(true);
    await onSave(local);
    setEditing(false);
    setSaving(false);
  }

  const pagoEstado = getContratoEstado(ct);
  const statusEstado = getContratoStatus(ct);

  const renderField = (label, value, editEl) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {editing ? editEl : <div style={{ fontSize: 13, color: "var(--text)" }}>{value || <span style={{ color: "var(--muted)" }}>—</span>}</div>}
    </div>
  );

  return (
    <div className="contrato-card">
      <div className="contrato-header" onClick={() => setOpen(p => !p)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>Contrato #{i + 1}</div>
          <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ct.fechaInicio || "Sin fecha"}{ct.fechaFin ? ` → ${ct.fechaFin}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span className={`badge ${statusEstado.cls}`}>{statusEstado.label}</span>
          <span className={`badge ${pagoEstado.cls}`}>{pagoEstado.label}</span>
          <span className="chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", fontSize: 12, color: "var(--muted)" }}>▼</span>
        </div>
      </div>

      {open && (
        <div className="contrato-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{editing ? "Modo edición activado" : "Vista de contrato"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {!editing
                ? <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} title="Editar contrato">✏️ Editar</button>
                : <><button className="btn btn-green btn-sm" disabled={saving} onClick={save}>{saving ? "Guardando..." : "💾 Guardar"}</button><button className="btn btn-ghost btn-sm" onClick={() => { setLocal({ ...ct }); setEditing(false); }}>Cancelar</button></>
              }
              <button className="btn btn-danger btn-sm" onClick={onRemove}>Eliminar</button>
            </div>
          </div>

          <div className="form-row">
            {renderField("Fecha inicio", ct.fechaInicio, <input type="date" value={local.fechaInicio} onChange={e => upd("fechaInicio", e.target.value)} />)}
            {renderField("Fecha fin", ct.fechaFin, <input type="date" value={local.fechaFin} onChange={e => upd("fechaFin", e.target.value)} />)}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 8 }}>Servicios y precios</div>
            {(editing ? local.servicios : ct.servicios || []).map((s, si) => (
              <div key={si} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, minWidth: 130 }}>{s.nombre}</span>
                {editing
                  ? <div className="input-prefix" style={{ flex: 1 }}><span className="pre">$</span><input type="number" value={s.precio} onChange={e => { const svcs = local.servicios.map((sv, xi) => xi === si ? { ...sv, precio: e.target.value } : sv); upd("servicios", svcs); }} placeholder="0.00" /></div>
                  : <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>${fmtNum(parseFloat(s.precio) || 0, 2)}</span>
                }
              </div>
            ))}
          </div>

          {renderField("Total del contrato", `$${fmtNum(parseFloat(ct.totalContrato) || 0, 2)}`,
            <div><div className="input-prefix"><span className="pre">$</span><input type="number" value={local.totalContrato} onChange={e => upd("totalContrato", e.target.value)} placeholder="0.00" /></div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Calculado automáticamente</div></div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>Cuotas de pago</span>
              {editing && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setLocal(p => ({ ...p, cuotas: [...(p.cuotas || []), { monto: "", pagado: false, fecha: "" }] }))}>+ Cuota</button>}
            </div>
            <div className="grid2">
              {(editing ? local.cuotas : ct.cuotas || []).map((c, ci) => (
                <div key={ci} style={{ background: "var(--bg)", borderRadius: 8, padding: 12, position: "relative" }}>
                  {editing && local.cuotas.length > 1 && <button style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }} onClick={() => setLocal(p => ({ ...p, cuotas: p.cuotas.filter((_, xi) => xi !== ci) }))}>×</button>}
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase" }}>Cuota {ci + 1}</div>
                  {editing ? (
                    <>
                      <div className="input-prefix" style={{ marginBottom: 8 }}><span className="pre">$</span><input type="number" value={c.monto} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, monto: e.target.value } : cu) }))} placeholder="0.00" /></div>
                      <input type="date" value={c.fecha} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, fecha: e.target.value } : cu) }))} style={{ marginBottom: 8 }} />
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!c.pagado} onChange={e => setLocal(p => ({ ...p, cuotas: p.cuotas.map((cu, xi) => xi === ci ? { ...cu, pagado: e.target.checked } : cu) }))} style={{ width: 15, height: 15 }} />Pagado
                      </label>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontFamily: "var(--mono)", marginBottom: 4 }}>${fmtNum(parseFloat(c.monto) || 0, 2)}</div>
                      {c.fecha && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{c.fecha}</div>}
                      <span className={`badge ${c.pagado ? "badge-paid" : "badge-pending"}`} style={{ fontSize: 11 }}>{c.pagado ? "✓ Pagado" : "Pendiente"}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {renderField("Notas", ct.notas, <textarea value={local.notas} onChange={e => upd("notas", e.target.value)} placeholder="Observaciones..." />)}
        </div>
      )}
    </div>
  );
}

function ContratosPanel({ client, onUpdate }) {
  const { show, el: toastEl } = useToast();
  const contratos = client.contratos || [];

  function addContrato() {
    const svcs = (client.serviciosContratados || []).map(id => ({ id, nombre: SERVICIOS_DEFAULT.find(x => x.id === id)?.nombre || id, precio: "" }));
    onUpdate({ ...client, contratos: [...contratos, { id: "ct" + Date.now(), fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: "", servicios: svcs, cuotas: [{ monto: "", pagado: false, fecha: "" }, { monto: "", pagado: false, fecha: "" }], notas: "" }] });
  }

  async function saveContrato(i, ct2) {
    const updated = { ...client, contratos: contratos.map((c, xi) => xi === i ? ct2 : c) };
    const result = await db.upsert(updated);
    if (result.ok) { onUpdate(updated); show("✓ Contrato guardado correctamente", "ok"); }
    else show("Error al guardar el contrato: " + (result.error || ""), "err");
  }

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header"><div className="sec-title">Historial de contratos</div><button className="btn btn-primary btn-sm" onClick={addContrato}>+ Nuevo contrato</button></div>
        {contratos.length === 0 && <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📋</div><div>Sin contratos.</div></div>}
        {contratos.map((ct, i) => (
          <ContratoItem key={ct.id} ct={ct} i={i}
            onSave={ct2 => saveContrato(i, ct2)}
            onRemove={() => { if (window.confirm("¿Eliminar contrato?")) onUpdate({ ...client, contratos: contratos.filter((_, xi) => xi !== i) }); }}
            toast={show}
          />
        ))}
      </div>
    </>
  );
}

// ─── ANTECEDENTES CON CÁLCULOS AUTOMÁTICOS ────────────────────────────────────
function getColorClass(campo, valor, historico) {
  if (!historico || historico.length < 2 || !valor || valor === "") return "ant-cell-neutral";
  const vals = historico.map(h => parseFloat(h[campo])).filter(v => !isNaN(v) && v > 0);
  if (vals.length < 2) return "ant-cell-neutral";
  const v = parseFloat(valor);
  const info = ANT_TODOS.find(c => c.key === campo);
  if (!info) return "ant-cell-neutral";
  if (info.tipo === "beneficio") { const max = Math.max(...vals); return v >= max * 0.9 ? "ant-cell-green" : v >= max * 0.6 ? "ant-cell-amber" : "ant-cell-red"; }
  if (info.tipo === "costo") { const min = Math.min(...vals); return v <= min * 1.05 ? "ant-cell-green" : v <= min * 1.2 ? "ant-cell-amber" : "ant-cell-red"; }
  return "ant-cell-neutral";
}

function AntForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ red: REDES_PAUTA[0], fechaInicio: "", fechaFin: "", margen_ganancia: "0.30" });
  const [calc, setCalc] = useState({});
  const f = (k, v) => {
    const updated = { ...form, [k]: v };
    setForm(updated);
    setCalc(calcAntecedentes(updated));
  };

  function saveAnt() {
    if (!form.fechaInicio || !form.fechaFin) return alert("Completa el rango de fechas.");
    onSave({ ...form, ...calc, id: "ant" + Date.now() });
  }

  return (
    <div className="card" style={{ borderColor: "rgba(124,58,237,.4)" }}>
      <div className="card-title">Nuevo registro histórico</div>
      <div className="form-row">
        <div className="field"><label>Red de pauta</label><select value={form.red} onChange={e => f("red", e.target.value)}>{REDES_PAUTA.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <div className="field"><label>Margen de ganancia (%)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" inputMode="decimal" value={form.margen_ganancia} onChange={e => f("margen_ganancia", e.target.value)} placeholder="0.30" style={{ maxWidth: 100 }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Ej: 0.30 = 30%</span>
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label>Fecha inicio</label><input type="date" value={form.fechaInicio} onChange={e => f("fechaInicio", e.target.value)} /></div>
        <div className="field"><label>Fecha fin</label><input type="date" value={form.fechaFin} onChange={e => f("fechaFin", e.target.value)} /></div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Datos manuales</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem", marginBottom: "1.25rem" }}>
        {ANT_MANUALES.map(campo => (
          <div key={campo.key} className="field">
            <label>{campo.label}</label>
            <NumInput value={form[campo.key] || ""} onChange={v => f(campo.key, v)} prefix={campo.prefix} placeholder="0" />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Calculados automáticamente</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem", marginBottom: "1.25rem" }}>
        {ANT_CALCULADOS.map(campo => {
          const val = calc[campo.key];
          const display = val && !isNaN(val) ? `${campo.prefix || ""}${fmtNum(Number(val), 2)}${campo.suffix || ""}` : "—";
          return (
            <div key={campo.key} style={{ background: "var(--surface2)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{campo.label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 14, color: val ? "var(--accent)" : "var(--muted)" }}>{display}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={saveAnt}>Guardar registro</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function AntecedentesPanel({ client, onUpdate, readOnly }) {
  const ants = client.antecedentes || [];
  const [showForm, setShowForm] = useState(false);

  function saveAnt(nuevo) {
    onUpdate({ ...client, antecedentes: [...ants, nuevo] });
    setShowForm(false);
  }

  const allFields = [...ANT_MANUALES, ...ANT_CALCULADOS];

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
          <div key={cls} style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={cls} style={{ fontSize: 11, padding: "1px 6px" }}>Ej</span><span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span></div>
        ))}
      </div>
      {showForm && !readOnly && <AntForm onSave={saveAnt} onCancel={() => setShowForm(false)} />}
      {ants.length === 0 && !showForm && <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📊</div><div>Sin antecedentes.</div></div>}
      {ants.length > 0 && (
        <div className="card scroll-x">
          <table className="tbl">
            <thead><tr><th>Red</th><th>Período</th><th>Margen</th>{allFields.map(c => <th key={c.key}>{c.label}</th>)}{!readOnly && <th></th>}</tr></thead>
            <tbody>{ants.map(a => (
              <tr key={a.id}>
                <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{a.red}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{a.fechaInicio}/{a.fechaFin}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{a.margen_ganancia ? `${(parseFloat(a.margen_ganancia) * 100).toFixed(0)}%` : "30%"}</td>
                {allFields.map(c => {
                  const val = a[c.key];
                  const cls = getColorClass(c.key, val, ants);
                  const display = val !== "" && val !== undefined && !isNaN(parseFloat(val)) ? `${c.prefix || ""}${fmtNum(Number(val), 2)}${c.suffix || ""}` : "—";
                  return <td key={c.key}><span className={cls}>{display}</span></td>;
                })}
                {!readOnly && <td><button className="btn btn-danger btn-sm" onClick={() => onUpdate({ ...client, antecedentes: ants.filter(x => x.id !== a.id) })}>×</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── COLUMNAS PERSONALIZABLES ────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "date",     label: "Fecha",       always: true  },
  { key: "inversion", label: "Inversión",  prefix: "$"   },
  { key: "alcance",   label: "Alcance"                   },
  { key: "impresiones", label: "Impresiones"              },
  { key: "cpm",      label: "CPM",         prefix: "$"   },
  { key: "cpc",      label: "CPC",         prefix: "$"   },
  { key: "ctr",      label: "CTR",         suffix: "%"   },
  { key: "clics_enlace", label: "Clics enlace"           },
  { key: "leads",    label: "Leads"                      },
  { key: "contactados", label: "Contactados"             },
  { key: "ventas",   label: "Ventas"                     },
  { key: "ingreso",  label: "Ingresos",    prefix: "$"   },
  { key: "roas",     label: "ROAS",        suffix: "x"   },
  { key: "sesiones", label: "Sesiones"                   },
  { key: "agregar_carrito", label: "Carrito"             },
  { key: "compras",  label: "Compras"                    },
  { key: "clientesPotenciales", label: "Potenciales"     },
  { key: "formularios", label: "Formularios"             },
  { key: "resultados", label: "Resultados"               },
  { key: "personas_wp",    label: "Personas WP"                                  },
  { key: "costo_wp",       label: "Costo x WP",       prefix: "$", autoCalc: true },
  { key: "pct_captura_wp", label: "% Captura WP",      suffix: "%", autoCalc: true },
  { key: "cpa",            label: "Costo x Resultado", prefix: "$"                 },
  { key: "ticket_promedio",label: "Ticket prom.",       prefix: "$"                },
];

const DEFAULT_COLS_WA     = ["date","inversion","alcance","cpm","cpc","ctr","leads","contactados","ventas","ingreso"];
const DEFAULT_COLS_WEB    = ["date","inversion","alcance","cpm","cpc","ctr","sesiones","agregar_carrito","compras","ingreso","roas"];
const DEFAULT_COLS_LAUNCH = ["date","inversion","alcance","cpm","cpc","ctr","clientesPotenciales","formularios","personas_wp","costo_wp","pct_captura_wp","resultados","cpa","ingreso"];

function useColPrefs(client, isWA, isWeb) {
  const storageKey = "cols_" + (client?.id || "default");
  const defaults = isWA ? DEFAULT_COLS_WA : isWeb ? DEFAULT_COLS_WEB : DEFAULT_COLS_LAUNCH;
  const [cols, setCols] = useState(() => {
    try {
      const s = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (s) { const parsed = JSON.parse(s); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
    } catch {}
    return defaults;
  });
  function toggle(key) {
    if (key === "date") return;
    setCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return { cols, toggle };
}

function ColumnSelector({ cols, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
        ⚙️ Columnas visibles ({cols.length})
      </button>
      {open && (
        <div className="col-selector" style={{ marginTop: 8 }}>
          {ALL_COLUMNS.map(c => (
            <div key={c.key} className={"col-chip " + (cols.includes(c.key) ? "active" : "")}
              onClick={() => !c.always && onToggle(c.key)}
              style={{ opacity: c.always ? 0.5 : 1, cursor: c.always ? "default" : "pointer" }}>
              {c.label}{c.always ? " (fijo)" : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtCell(r, col) {
  const v = r[col.key];
  if (v === undefined || v === null || v === "") return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  const fmt2 = fmtNum(n, 2);
  if (col.prefix) return col.prefix + fmt2;
  if (col.suffix) return fmt2 + col.suffix;
  return fmtNum(n, col.key === "date" ? 0 : 0);
}

// ─── METRICAS ADMIN PANEL (ver/editar) ───────────────────────────────────────
function exportMetricas(rows, client, formato) {
  if (!rows.length) return;
  const isWA = client.niche === "whatsapp";
  const isWeb = client.niche === "web";
  const baseHeaders = ["Fecha", "Inversion", "Alcance", "CPM", "CPC", "CTR"];
  const nicheHeaders = isWA ? ["Leads", "Contactados", "Ventas", "Ingresos"] : isWeb ? ["Sesiones", "Carrito", "Compras", "Ingresos", "ROAS"] : ["Potenciales", "Formularios", "Ventas", "Ingresos"];
  const headers = [...baseHeaders, ...nicheHeaders];
  const dataRows = rows.map(r => {
    const base = [r.date, r.inversion||"", r.alcance||"", r.cpm||"", r.cpc||"", r.ctr||""];
    const niche = isWA ? [r.leads||"", r.contactados||"", r.ventas||"", r.ingreso||""] : isWeb ? [r.sesiones||"", r.agregar_carrito||"", r.compras||"", r.ingreso||"", r.roas||""] : [r.clientesPotenciales||"", r.formularios||"", r.ventas||"", r.ingreso||""];
    return [...base, ...niche];
  });
  const sep = formato === "csv" ? "," : "\t";
  const content = [headers, ...dataRows].map(r => r.map(v => '"' + String(v) + '"').join(sep)).join("\n");
  const blob = new Blob(["\ufeff" + content], { type: formato === "csv" ? "text/csv" : "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `metricas_${client.name}_${new Date().toISOString().slice(0,10)}.${formato}`; a.click();
  URL.revokeObjectURL(url);
}

// EditNum estable — definido FUERA de MetricasAdminPanel para evitar recreación en cada render
function EditNum({ editForm, fk, prefix, onChange }) {
  return <NumInput value={editForm[fk] ?? ""} onChange={v => onChange(fk, v)} prefix={prefix} placeholder="0" />;
}

function MetricasAdminPanel({ client, onUpdate, period, setPeriod, from, setFrom, to, setTo, rows, t, isWA, isWeb, isLaunch, onAdd }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [busqueda, setBusqueda] = useState("");
  const [vistaTab, setVistaTab] = useState("diario"); // diario | campanas
  const [adminHovRow, setAdminHovRow] = useState(null);
  const { cols, toggle: toggleCol } = useColPrefs(client, isWA, isWeb);
  const visibleCols = ALL_COLUMNS.filter(c => cols.includes(c.key));

  // Aplicar filtro de nomenclatura
  const rowsFiltrados = filterByNomenclatura(rows, busqueda);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortedRows = [...rowsFiltrados].sort((a, b) => {
    const va = a[sortCol] ?? ""; const vb = b[sortCol] ?? "";
    const na = parseFloat(va); const nb = parseFloat(vb);
    const numSort = !isNaN(na) && !isNaN(nb) ? na - nb : String(va).localeCompare(String(vb));
    return sortDir === "asc" ? numSort : -numSort;
  });

  const SortTh = ({ col, label }) => (
    <th style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅"}
    </th>
  );

  function startEdit(r, i) {
    setEditingRow(i);
    setEditForm({ ...r });
  }
  function cancelEdit() { setEditingRow(null); setEditForm({}); }
  function saveEdit() {
    const allRecords = [...(client.records || [])];
    // Encontrar el índice real en client.records (puede diferir por filtro)
    const realIdx = allRecords.findIndex(r => r === rows[editingRow]);
    if (realIdx >= 0) {
      allRecords[realIdx] = { ...editForm };
      onUpdate({ ...client, records: allRecords });
    }
    setEditingRow(null);
  }
  function deleteRow(i) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    const allRecords = [...(client.records || [])];
    const realIdx = allRecords.findIndex(r => r === rows[i]);
    if (realIdx >= 0) allRecords.splice(realIdx, 1);
    onUpdate({ ...client, records: allRecords });
  }
  const ef = (k, v) => setEditForm(p => ({ ...p, [k]: v }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Nuevo registro</button>
      </div>
      {/* Tarjetas — misma vista que el cliente, con personalización y metas independientes */}
      <ApolloMetricasPanel client={client} period={period} from={from} to={to} onUpdate={onUpdate} configKey="admin" />

      {/* TABS vista diario / por campaña */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div className="period-pills">
          <button className={"pill " + (vistaTab === "diario" ? "active" : "")} onClick={() => setVistaTab("diario")}>📅 Por día</button>
          <button className={"pill " + (vistaTab === "campanas" ? "active" : "")} onClick={() => setVistaTab("campanas")}>📡 Por campaña</button>
        </div>
        {/* BARRA DE BÚSQUEDA NOMENCLATURA */}
        <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 400, minWidth: 220 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por campaña, conjunto, anuncio..."
              style={{ width: "100%", paddingLeft: 32, fontSize: 12 }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 14 }}>🔍</span>
          </div>
          {busqueda && <button className="btn btn-ghost btn-sm" onClick={() => setBusqueda("")}>×</button>}
        </div>
      </div>
      {busqueda && <div style={{ fontSize: 12, color: "var(--accent2)", marginBottom: 8 }}>
        Mostrando {rowsFiltrados.length} de {rows.length} registros con "{busqueda}"
      </div>}

      {vistaTab === "campanas" ? (
        <VistaPorCampana rows={sortedRows} busqueda={busqueda} />
      ) : (<>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <ColumnSelector cols={cols} onToggle={toggleCol} />
        <div style={{ display: "flex", gap: 8 }}>
          <BotonesExportar
            headers={visibleCols.map(c => c.label)}
            rows={sortedRows.map(r => visibleCols.map(c => {
              if (c.key === "date") return fmtDate(r.date);
              const v = r[c.key]; if (v === undefined || v === null || v === "") return "—";
              const n = parseFloat(v); if (isNaN(n)) return v;
              return c.prefix ? c.prefix + fmtNum(n,2) : c.suffix ? fmtNum(n,2)+c.suffix : fmtNum(n,0);
            }))}
            nombreArchivo={"metricas_" + (client.name||"").replace(/\s/g,"_")}
          />
        </div>
      </div>
      <div className="card scroll-x">
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Clic en encabezado para ordenar</div>
        <table className="tbl">
          <thead>
            <tr>
              {visibleCols.map(c => <SortTh key={c.key} col={c.key} label={c.label} />)}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr><td colSpan={visibleCols.length + 1} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Sin registros.</td></tr>
            )}
            {sortedRows.map((r, i) => {
              const isEdit = editingRow === i;
              return (
                <tr key={i} style={{...(isEdit ? { background: "rgba(124,58,237,.06)" } : {}), position:"relative"}}
                  onMouseEnter={()=>!isEdit&&setAdminHovRow(i)} onMouseLeave={()=>setAdminHovRow(null)}>
                  {visibleCols.map((c,ci) => (
                    <td key={c.key} style={{...(c.key === "date" ? { fontFamily: "var(--mono)", fontSize: 12 } : {}), position:"relative"}}>
                      {isEdit
                        ? c.key === "date"
                          ? <input type="date" value={editForm.date} onChange={e => ef("date", e.target.value)} style={{ width: 130, fontSize: 12 }} />
                          : <EditNum editForm={editForm} fk={c.key} prefix={c.prefix} onChange={ef} />
                        : (() => {
                            if (c.key === "date") return fmtDate(r[c.key]);
                            if (c.key === "cpa") {
                              const res = r.resultados || r.formularios || r.leads || 0;
                              const inv = r.inversion || 0;
                              if (!res || !inv) return "—";
                              return "$" + fmtNum(inv / res, 2);
                            }
                            if (c.key === "costo_wp") {
                              const wp = parseFloat(r.personas_wp) || 0;
                              const inv = parseFloat(r.inversion) || 0;
                              if (!wp || !inv) return "—";
                              return "$" + fmtNum(inv / wp, 2);
                            }
                            if (c.key === "pct_captura_wp") {
                              const wp = parseFloat(r.personas_wp) || 0;
                              const fb = parseFloat(r.formularios || r.clientesPotenciales || r.leads) || 0;
                              if (!wp || !fb) return "—";
                              return fmtNum((wp / fb) * 100, 1) + "%";
                            }
                            const v = r[c.key];
                            if (v === undefined || v === null || v === "") return "—";
                            const n = parseFloat(v);
                            if (isNaN(n)) return String(v);
                            const fmt2 = fmtNum(n, 2);
                            if (c.prefix) return c.prefix + fmt2;
                            if (c.suffix) return fmt2 + c.suffix;
                            return fmtNum(n, 0);
                          })()
                      }
                      {/* Tooltip en primera columna visible */}
                      {ci===0 && adminHovRow===i && !isEdit && (()=>{
                        const inv=parseFloat(r.inversion)||0;
                        const leads=parseFloat(r.resultados||r.formularios||r.leads)||0;
                        const ventas=parseFloat(r.ventas)||0;
                        const ingreso=parseFloat(r.ingreso)||0;
                        const alcance=parseFloat(r.alcance)||0;
                        const cpl=leads>0&&inv>0?inv/leads:0;
                        const roas=inv>0&&ingreso>0?ingreso/inv:0;
                        const prevRow=i>0?sortedRows[i-1]:null;
                        const prevCpl=prevRow?(()=>{const pi=parseFloat(prevRow.inversion)||0,pl=parseFloat(prevRow.resultados||prevRow.formularios||prevRow.leads)||0;return pl>0&&pi>0?pi/pl:0;})():0;
                        const cplDelta=cpl>0&&prevCpl>0?((cpl-prevCpl)/prevCpl*100):null;
                        return (
                          <div style={{position:"absolute",left:0,bottom:"calc(100% + 6px)",zIndex:300,
                            background:"rgba(10,15,30,.97)",border:"1px solid var(--border)",borderRadius:10,
                            padding:"12px 14px",minWidth:230,boxShadow:"0 8px 32px rgba(0,0,0,.6)",pointerEvents:"none",whiteSpace:"nowrap"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"var(--accent2)",marginBottom:8}}>{fmtDate(r.date)}</div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",marginBottom:6}}>
                              {inv>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Inversión</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>${fmtNum(inv,2)}</span></>}
                              {alcance>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Alcance</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{fmtNum(alcance)}</span></>}
                              {leads>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Leads</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:"var(--accent2)"}}>{fmtNum(leads)}</span></>}
                              {cpl>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>CPL</span>
                                <span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:cplDelta!==null&&cplDelta<0?"var(--green)":"var(--red)"}}>
                                  ${fmtNum(cpl,2)}{cplDelta!==null&&<span style={{fontSize:9,marginLeft:3}}>{cplDelta<0?"▼":"▲"}{Math.abs(cplDelta).toFixed(1)}%</span>}
                                </span></>}
                              {ventas>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Ventas</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{fmtNum(ventas)}</span></>}
                              {ingreso>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Ingresos</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:"var(--green)"}}>${fmtNum(ingreso,2)}</span></>}
                              {roas>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>ROAS</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:roas>=3?"var(--green)":roas>=1.5?"var(--amber)":"var(--red)"}}>{fmtNum(roas,2)}x</span></>}
                            </div>
                            {r.notas_dia&&<div style={{fontSize:10,color:"var(--muted)",borderTop:"1px solid var(--border)",paddingTop:5}}>📝 {r.notas_dia}</div>}
                          </div>
                        );
                      })()}
                    </td>
                  ))}
                  <td>
                    {isEdit ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-green btn-sm" onClick={saveEdit}>&#10003;</button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>x</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(r, i)}>&#9998;</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRow(i)}>&#128465;</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {sortedRows.length > 1 && (
            <tfoot>
              <tr style={{ background: "rgba(124,58,237,.08)", fontWeight: 600 }}>
                {visibleCols.map(c => {
                  if (c.key === "date") return <td key="date" style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--mono)" }}>TOTAL</td>;
                  if (c.key === "cpa") {
                    const res = sum(sortedRows, "resultados") || sum(sortedRows, "formularios") || sum(sortedRows, "leads");
                    const inv = sum(sortedRows, "inversion");
                    return <td key="cpa">{res && inv ? "$" + fmtNum(inv/res, 2) : "—"}</td>;
                  }
                  if (c.key === "costo_wp") {
                    const wp = sum(sortedRows, "personas_wp");
                    const inv = sum(sortedRows, "inversion");
                    return <td key="costo_wp">{wp && inv ? "$" + fmtNum(inv/wp, 2) : "—"}</td>;
                  }
                  if (c.key === "pct_captura_wp") {
                    const wp = sum(sortedRows, "personas_wp");
                    const fb = sum(sortedRows, "formularios") || sum(sortedRows, "clientesPotenciales");
                    return <td key="pct_wp">{wp && fb ? fmtNum((wp/fb)*100, 1) + "%" : "—"}</td>;
                  }
                  const isAvg = ["cpm","cpc","ctr","roas"].includes(c.key);
                  const val = isAvg ? avg(sortedRows, c.key) : sum(sortedRows, c.key);
                  const fmt2 = fmtNum(val, 2);
                  const display = c.prefix ? c.prefix + fmt2 : c.suffix ? fmt2 + c.suffix : fmtNum(val, 0);
                  return <td key={c.key}>{display}</td>;
                })}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </>)}
    </>
  );
}


// ─── VISTA POR CAMPAÑA ────────────────────────────────────────────────────────
function VistaPorCampana({ rows, busqueda }) {
  const campanaMap = {};
  const hoy = new Date().toISOString().slice(0,10);

  // Solo registros hasta hoy (no futuros)
  const rowsActivos = rows.filter(r => r.date <= hoy);

  rowsActivos.forEach(r => {
    // Recopilar todas las fuentes de nomenclatura
    const campanas = (r.campanas || "").split(",").map(c => c.trim()).filter(Boolean);
    const conjuntos = (r.conjuntos || "").split(",").map(c => c.trim()).filter(Boolean);
    const anuncios  = (r.anuncios  || "").split(",").map(c => c.trim()).filter(Boolean);

    // Usar campañas primero, luego conjuntos, luego anuncios
    const allKeys = campanas.length ? campanas : conjuntos.length ? conjuntos : anuncios.length ? anuncios : [];
    if (!allKeys.length) return; // ignorar registros sin nomenclatura

    // Dividir métricas entre el número de campañas activas ese día
    const divisor = allKeys.length;
    const inv     = (parseFloat(r.inversion) || 0) / divisor;
    const alc     = (parseFloat(r.alcance)   || 0) / divisor;
    const leads   = (parseFloat(r.formularios || r.leads || r.clientesPotenciales) || 0) / divisor;
    const ventas  = (parseFloat(r.ventas)    || 0) / divisor;
    const wpP     = (parseFloat(r.personas_wp) || 0) / divisor;
    const cpm     = parseFloat(r.cpm) || 0;
    const cpc     = parseFloat(r.cpc) || 0;
    const ctr     = parseFloat(r.ctr) || 0;

    allKeys.forEach(key => {
      const nombre = key.trim();
      if (!nombre) return;
      if (!campanaMap[nombre]) campanaMap[nombre] = { nombre, dias: 0, inversion: 0, alcance: 0, leads: 0, ventas: 0, personas_wp: 0, cpm_sum: 0, cpc_sum: 0, ctr_sum: 0, n: 0 };
      const c = campanaMap[nombre];
      c.dias++;
      c.inversion    += inv;
      c.alcance      += alc;
      c.leads        += leads;
      c.ventas       += ventas;
      c.personas_wp  += wpP;
      c.cpm_sum      += cpm;
      c.cpc_sum      += cpc;
      c.ctr_sum      += ctr;
      c.n++;
    });
  });

  const lista = Object.values(campanaMap).map(c => ({
    ...c,
    cpm: c.n ? c.cpm_sum / c.n : 0,
    cpc: c.n ? c.cpc_sum / c.n : 0,
    ctr: c.n ? c.ctr_sum / c.n : 0,
    cpl: c.leads > 0 ? c.inversion / c.leads : 0,
  })).sort((a, b) => b.inversion - a.inversion);

  if (lista.length === 0) return (
    <div className="empty">
      <div style={{ fontSize: 28, opacity: .3 }}>📡</div>
      <div style={{ marginTop: 8 }}>Sin campañas con nomenclatura registrada.</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, maxWidth: 340, textAlign: "center" }}>
        {!busqueda ? "Agrega los nombres de campaña en cada registro diario, o sincroniza desde Facebook." : `No hay registros con "${busqueda}".`}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {lista.length} campaña{lista.length !== 1 ? "s" : ""}{busqueda ? ` con "${busqueda}"` : ""}
          <span style={{ marginLeft: 8, fontSize: 11 }}>· Métricas distribuidas proporcionalmente</span>
        </div>
        <BotonesExportar
          headers={["Campaña/Conjunto/Anuncio","Inversión","Alcance","CPM","CPC","CTR","Leads/FB","Pers. WP","CPL","Ventas"]}
          rows={lista.map(c => [c.nombre,"$"+fmtNum(c.inversion,2),fmtNum(c.alcance),"$"+fmtNum(c.cpm,2),"$"+fmtNum(c.cpc,2),fmtNum(c.ctr,2)+"%",c.leads>0?fmtNum(c.leads):"—",c.personas_wp>0?fmtNum(c.personas_wp):"—",c.cpl>0?"$"+fmtNum(c.cpl,2):"—",c.ventas>0?fmtNum(c.ventas):"—"])}
          nombreArchivo="campanas"
        />
      </div>
      <div className="card scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>Campaña / Conjunto / Anuncio</th>
              <th>Inversión</th>
              <th>Alcance</th>
              <th>CPM</th>
              <th>CPC</th>
              <th>CTR</th>
              <th>Leads/FB</th>
              <th>Pers. WP</th>
              <th>CPL</th>
              <th>Ventas</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c, i) => {
              const match = busqueda && c.nombre.toLowerCase().includes(busqueda.toLowerCase());
              return (
                <tr key={i} style={{ background: match ? "rgba(255,222,89,.06)" : "" }}>
                  <td style={{ fontWeight: 500, maxWidth: 300, wordBreak: "break-word", fontSize: 12 }}>
                    {match && <span style={{ color: "var(--accent2)", marginRight: 4 }}>●</span>}
                    {c.nombre}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>${fmtNum(c.inversion, 2)}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{fmtNum(c.alcance)}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>${fmtNum(c.cpm, 2)}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>${fmtNum(c.cpc, 2)}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{fmtNum(c.ctr, 2)}%</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.leads > 0 ? fmtNum(c.leads) : "—"}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.personas_wp > 0 ? fmtNum(c.personas_wp) : "—"}</td>
                  <td style={{ fontFamily: "var(--mono)", color: c.cpl > 0 && c.cpl < 5 ? "var(--green)" : c.cpl < 15 ? "var(--amber)" : "var(--red)" }}>
                    {c.cpl > 0 ? "$" + fmtNum(c.cpl, 2) : "—"}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.ventas > 0 ? fmtNum(c.ventas) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          {lista.length > 1 && (
            <tfoot>
              <tr style={{ background: "rgba(0,74,173,.08)", fontWeight: 600 }}>
                <td>TOTAL ({lista.length} campañas)</td>
                <td>—</td>
                <td>${fmtNum(lista.reduce((a,c) => a+c.inversion, 0), 2)}</td>
                <td>{fmtNum(lista.reduce((a,c) => a+c.alcance, 0))}</td>
                <td>${fmtNum(lista.reduce((a,c) => a+c.cpm, 0) / lista.length, 2)}</td>
                <td>${fmtNum(lista.reduce((a,c) => a+c.cpc, 0) / lista.length, 2)}</td>
                <td>{fmtNum(lista.reduce((a,c) => a+c.ctr, 0) / lista.length, 2)}%</td>
                <td>{fmtNum(lista.reduce((a,c) => a+c.leads, 0))}</td>
                <td>—</td>
                <td>{fmtNum(lista.reduce((a,c) => a+c.ventas, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── PROYECCIONES / KPIs SMART ────────────────────────────────────────────────

const METRICAS_TRACKEO = [
  { key: "leads", label: "Leads" },
  { key: "ventas", label: "Ventas" },
  { key: "ingreso", label: "Ingresos ($)" },
  { key: "roas", label: "ROAS" },
  { key: "contactados", label: "Contactados" },
  { key: "compras", label: "Compras" },
  { key: "sesiones", label: "Sesiones" },
  { key: "formularios", label: "Formularios" },
  { key: "clientesPotenciales", label: "Clientes potenciales" },
  { key: "clics", label: "Clics" },
  { key: "alcance", label: "Alcance" },
  { key: "cpc", label: "CPC ($)" },
  { key: "ctr", label: "CTR (%)" },
];

const FUNNEL_DEFAULT = [
  { key: "impresiones", label: "Impresiones", color: "#7C3AED" },
  { key: "alcance_f", label: "Alcance", color: "#0EA5E9" },
  { key: "clics_f", label: "Clics en el Enlace", color: "#10B981" },
  { key: "resultados_f", label: "Resultados", color: "#F59E0B" },
  { key: "ventas_f", label: "Ventas", color: "#EF4444" },
];

// Parsea el plazo del KPI a días (ej: "30 días" → 30, "2 semanas" → 14)
function parsePlazoToDays(plazo) {
  if (!plazo) return null;
  const s = String(plazo).toLowerCase();
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  if (s.includes("semana")) return n * 7;
  if (s.includes("mes")) return n * 30;
  if (s.includes("año") || s.includes("anio")) return n * 365;
  return n; // default: días
}

function calcKpiProgress(kpi, records) {
  if (!kpi.metrica || !records || !records.length) return { pct: 0, actual: 0, meta: 0 };
  const meta = parseFloat(kpi.meta_valor) || 0;
  if (meta === 0) return { pct: 0, actual: 0, meta: 0 };

  // Filtrar registros por rango de fechas explícito o por plazo en texto
  let filteredRecords = records;
  if (kpi.fechaInicio || kpi.fechaFin) {
    filteredRecords = records.filter(r => {
      const d = new Date(r.date + "T12:00:00");
      const ok1 = !kpi.fechaInicio || d >= new Date(kpi.fechaInicio + "T00:00:00");
      const ok2 = !kpi.fechaFin || d <= new Date(kpi.fechaFin + "T23:59:59");
      return ok1 && ok2;
    });
  } else {
    const days = parsePlazoToDays(kpi.plazo);
    if (days) {
      const desde = new Date();
      desde.setDate(desde.getDate() - days);
      filteredRecords = records.filter(r => new Date(r.date + "T12:00:00") >= desde);
    }
  }
  if (!filteredRecords.length) return { pct: 0, actual: 0, meta };

  // Métricas de promedio vs acumulado
  const isAvgMetric = ["ctr", "roas", "cpc", "cpm"].includes(kpi.metrica);
  const total = filteredRecords.reduce((a, r) => a + (Number(r[kpi.metrica]) || 0), 0);
  const actual = isAvgMetric ? total / filteredRecords.length : total;
  const pct = Math.min(Math.round((actual / meta) * 100), 999);
  return { pct, actual: Math.round(actual * 100) / 100, meta };
}

function getKpiColor(pct) {
  if (pct >= 100) return "var(--green)";
  if (pct >= 60) return "var(--accent)";
  if (pct >= 30) return "var(--amber)";
  return "var(--red)";
}

function KpiCard({ kpi, records, onEdit, onDelete, readOnly }) {
  const { pct, actual, meta } = calcKpiProgress(kpi, records);
  const color = getKpiColor(pct);
  const relevanceLabel = kpi.relevancia === "alto" ? "Alta" : kpi.relevancia === "medio" ? "Media" : "Baja";
  const relevanceCls = kpi.relevancia === "alto" ? "kpi-relevance-high" : kpi.relevancia === "medio" ? "kpi-relevance-mid" : "kpi-relevance-low";
  const metricaLabel = METRICAS_TRACKEO.find(m => m.key === kpi.metrica)?.label || kpi.metrica;

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{kpi.nombre || "Sin nombre"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Metrica: <span style={{ color: "var(--text)" }}>{metricaLabel}</span>
            {" · "}Meta: <span style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{kpi.meta_valor || "—"}</span>
            {kpi.unidad && <span style={{ color: "var(--muted)" }}> {kpi.unidad}</span>}
            {" · "}Plazo: <span style={{ color: "var(--text)" }}>{kpi.plazo || "—"}</span>
            {" · "}<span className={relevanceCls}>Relevancia {relevanceLabel}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color }}>{pct}%</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {actual > 0 ? `${actual} / ${meta}` : "sin datos"}
            </div>
          </div>
          {!readOnly && (
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar KPI">&#9998;</button>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>x</button>
            </div>
          )}
        </div>
      </div>
      <div className="kpi-progress-bar">
        <div className="kpi-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      {kpi.descripcion && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{kpi.descripcion}</div>
      )}
      {kpi.realizacion && (
        <div style={{ fontSize: 11, marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "rgba(124,58,237,.08)", color: "var(--accent)" }}>
          IA: {kpi.realizacion}
        </div>
      )}
    </div>
  );
}


function KpiForm({ initial, client, onSave, onCancel }) {
  const blank = { nombre: "", meta_valor: "", unidad: "", plazo: "", relevancia: "alto", metrica: "leads", descripcion: "", realizacion: "" };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : blank);
  const [loadingIA, setLoadingIA] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function evalIA() {
    setLoadingIA(true);
    const ants = client.antecedentes || [];
    const records = client.records || [];
    const context = ants.length > 0
      ? `Antecedentes históricos: ${JSON.stringify(ants.slice(-3))}`
      : records.length > 0
        ? `Datos recientes (${records.length} registros): promedio ${form.metrica} = ${(records.reduce((a,r) => a + (Number(r[form.metrica])||0),0)/records.length).toFixed(2)}`
        : "Sin datos históricos disponibles";
    const prompt = `Eres experto en marketing digital. Evalúa si este KPI es realista en máximo 2 oraciones. KPI: "${form.nombre}", meta: ${form.meta_valor} ${form.unidad}, plazo: ${form.plazo}, métrica: ${form.metrica}. ${context}. Responde solo con la evaluación, sin preámbulo.`;
    try {
      const KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      f("realizacion", data.content?.[0]?.text || "No se pudo evaluar.");
    } catch { f("realizacion", "Error al conectar con la IA."); }
    setLoadingIA(false);
  }

  return (
    <div className="card" style={{ borderColor: "rgba(124,58,237,.4)", maxWidth: 600 }}>
      <div className="card-title">{initial ? "Editar KPI" : "Nuevo KPI"}</div>
      <div className="form-row">
        <div className="field"><label>Nombre del KPI</label><input type="text" value={form.nombre} onChange={e => f("nombre", e.target.value)} placeholder="Ej: Aumentar ventas" /></div>
        <div className="field"><label>Métrica a trackear</label>
          <select value={form.metrica} onChange={e => f("metrica", e.target.value)}>
            {METRICAS_TRACKEO.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row3">
        <div className="field"><label>Meta (valor)</label><input type="text" inputMode="decimal" value={form.meta_valor} onChange={e => f("meta_valor", e.target.value)} placeholder="Ej: 30" /></div>
        <div className="field"><label>Unidad</label><input type="text" value={form.unidad} onChange={e => f("unidad", e.target.value)} placeholder="%, $, unidades..." /></div>
        <div className="field"><label>Plazo (texto)</label><input type="text" value={form.plazo} onChange={e => f("plazo", e.target.value)} placeholder="Ej: 30 dias, 2 meses" /></div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Fecha inicio del KPI (opcional)</label>
          <input type="date" value={form.fechaInicio || ""} onChange={e => f("fechaInicio", e.target.value)} />
        </div>
        <div className="field">
          <label>Fecha fin del KPI (opcional)</label>
          <input type="date" value={form.fechaFin || ""} onChange={e => f("fechaFin", e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: -8, marginBottom: 12 }}>
        Si defines un rango de fechas, el progreso se calcula solo con datos de ese periodo.
      </div>
      <div className="field"><label>Relevancia</label>
        <select value={form.relevancia} onChange={e => f("relevancia", e.target.value)}>
          <option value="alto">Alta</option>
          <option value="medio">Media</option>
          <option value="bajo">Baja</option>
        </select>
      </div>
      <div className="field"><label>Descripción (opcional)</label><input type="text" value={form.descripcion} onChange={e => f("descripcion", e.target.value)} placeholder="Contexto o detalles adicionales" /></div>
      {form.realizacion && (
        <div style={{ background: "rgba(124,58,237,.08)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)", marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>✦ Evaluación IA</div>
          {form.realizacion}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => { if (!form.nombre || !form.meta_valor) return alert("Completa nombre y meta."); onSave({ ...form, id: initial?.id || "kpi" + Date.now() }); }}>
          {initial ? "Guardar cambios" : "Crear KPI"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={evalIA} disabled={loadingIA || !form.nombre || !form.meta_valor}>
          {loadingIA ? "Evaluando..." : "✦ Evaluar con IA"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function FunnelPanel({ client, onUpdate, readOnly }) {
  const funnelData = client.funnel || FUNNEL_DEFAULT.map(f => ({ ...f, valor: "" }));
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(funnelData);

  const maxVal = Math.max(...local.map(f => parseFloat(f.valor) || 0), 1);

  function updLocal(i, k, v) { setLocal(p => p.map((f, xi) => xi === i ? { ...f, [k]: v } : f)); }
  function addStage() { setLocal(p => [...p, { key: "custom_" + Date.now(), label: "Nueva etapa", color: "#7B7A8E", valor: "" }]); }
  function removeStage(i) { if (local.length > 2) setLocal(p => p.filter((_, xi) => xi !== i)); }

  function save() {
    onUpdate({ ...client, funnel: local });
    setEditing(false);
  }

  return (
    <div className="card">
      <div className="sec-header">
        <div>
          <div className="card-title" style={{ margin: 0 }}>Embudo de conversión</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Ingresa los valores de cada etapa</div>
        </div>
        {!readOnly && (
          editing
            ? <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-green btn-sm" onClick={save}>💾 Guardar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setLocal(funnelData); setEditing(false); }}>Cancelar</button>
              </div>
            : <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>
        )}
      </div>
      <div className="funnel-wrap">
        {local.map((stage, i) => {
          const val = parseFloat(stage.valor) || 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const convPct = i > 0 ? (() => {
            const prev = parseFloat(local[i-1].valor) || 0;
            return prev > 0 ? ((val / prev) * 100).toFixed(1) : null;
          })() : null;
          const barWidth = `${Math.max(pct, 8)}%`;
          return (
            <div key={stage.key} className="funnel-stage" style={{ justifyContent: "center" }}>
              <div className="funnel-label">{stage.label}</div>
              <div className="funnel-bar" style={{ width: barWidth, background: stage.color + "33", border: `1px solid ${stage.color}66` }}>
                {editing ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                    <input type="text" inputMode="decimal" value={stage.valor} onChange={e => updLocal(i, "valor", e.target.value.replace(/[^0-9.]/g, ""))}
                      style={{ width: 80, padding: "2px 6px", fontSize: 12, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, color: "var(--text)" }}
                      placeholder="0" />
                    <input type="text" value={stage.label} onChange={e => updLocal(i, "label", e.target.value)}
                      style={{ flex: 1, padding: "2px 6px", fontSize: 11, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 4, color: "var(--text)" }}
                      placeholder="Etapa" />
                    <input type="color" value={stage.color} onChange={e => updLocal(i, "color", e.target.value)}
                      style={{ width: 24, height: 24, padding: 2, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                    {local.length > 2 && <button onClick={() => removeStage(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>}
                  </div>
                ) : (
                  <>
                    <span style={{ color: stage.color, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                      {val > 0 ? val.toLocaleString("es-EC") : "—"}
                    </span>
                    {convPct && <span className="funnel-pct" style={{ color: stage.color }}>↓{convPct}%</span>}
                  </>
                )}
              </div>
              <div className="funnel-count">
                {val > 0 && !editing && <span style={{ fontSize: 11, color: "var(--muted)" }}>{pct.toFixed(0)}%</span>}
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addStage}>+ Agregar etapa</button>
      )}
    </div>
  );
}

function ProyeccionesPanel({ client, onUpdate, readOnly }) {
  const kpis = client.kpis || [];
  const [showForm, setShowForm] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const records = client.records || [];

  function saveKpi(kpi) {
    const existing = kpis.find(k => k.id === kpi.id);
    const updated = existing ? kpis.map(k => k.id === kpi.id ? kpi : k) : [...kpis, kpi];
    onUpdate({ ...client, kpis: updated });
    setShowForm(false);
    setEditingKpi(null);
  }

  function deleteKpi(id) {
    if (window.confirm("¿Eliminar este KPI?")) onUpdate({ ...client, kpis: kpis.filter(k => k.id !== id) });
  }

  return (
    <div>
      {/* KPIs SMART */}
      <div className="sec-header">
        <div>
          <div className="sec-title">KPIs y metas SMART</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Las barras se actualizan automáticamente con los datos diarios</div>
        </div>
        {!readOnly && !showForm && !editingKpi && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nuevo KPI</button>
        )}
      </div>

      {(showForm || editingKpi) && (
        <KpiForm
          initial={editingKpi}
          client={client}
          onSave={saveKpi}
          onCancel={() => { setShowForm(false); setEditingKpi(null); }}
        />
      )}

      {kpis.length === 0 && !showForm && (
        <div className="empty" style={{ padding: "2rem" }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>🎯</div>
          <div>Sin KPIs definidos. {!readOnly && "Crea el primero."}</div>
        </div>
      )}

      {kpis.map(kpi => (
        <KpiCard
          key={kpi.id}
          kpi={kpi}
          records={records}
          readOnly={readOnly}
          onEdit={() => { setEditingKpi(kpi); setShowForm(false); }}
          onDelete={() => deleteKpi(kpi.id)}
        />
      ))}

      {/* EMBUDO */}
      <div style={{ marginTop: "1.5rem" }}>
        <FunnelPanel client={client} onUpdate={onUpdate} readOnly={readOnly} />
      </div>
    </div>
  );
}


// ─── BANNER / COMUNICACIONES ──────────────────────────────────────────────────
function BannerViewer({ banners }) {
  const [idx, setIdx] = useState(0);
  const visible = banners.filter(b => b.url && b.url.trim());
  if (!visible.length) return null;
  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + visible.length) % visible.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % visible.length); };
  const slide = visible[idx];

  const imgEl = (
    <img
      className="banner-slide"
      src={slide.url}
      alt={slide.titulo || "Banner"}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={e => { e.target.style.display = "none"; }}
      style={{ cursor: slide.enlace ? "pointer" : "default" }}
    />
  );

  return (
    <div className="banner-wrap">
      {slide.enlace ? (
        <a href={slide.enlace} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
          {imgEl}
        </a>
      ) : imgEl}
      {slide.titulo && (
        <div style={{ position: "absolute", bottom: 28, left: 16, background: "rgba(0,0,0,.6)", color: "#fff", padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, pointerEvents: "none" }}>
          {slide.titulo}
        </div>
      )}
      {visible.length > 1 && <>
        <button className="banner-arrow left" onClick={prev}>&#8249;</button>
        <button className="banner-arrow right" onClick={next}>&#8250;</button>
        <div className="banner-dots">
          {visible.map((_, i) => (
            <button key={i} className={"banner-dot " + (i === idx ? "active" : "")} onClick={e => { e.stopPropagation(); setIdx(i); }} />
          ))}
        </div>
      </>}
    </div>
  );
}

function getDriveDirectUrl(url) {
  if (!url) return "";
  // Formato 1: /file/d/ID/view
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (match1) return `https://lh3.googleusercontent.com/d/${match1[1]}`;
  // Formato 2: id= en query string (uc?id=)
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  return url;
}

function BannerAdmin({ clients, banners, onSave }) {
  const [local, setLocal] = useState(banners || []);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const { show, el: toastEl } = useToast();

  function addSlide() {
    if (local.length >= 5) return alert("Maximo 5 imagenes en el banner.");
    setLocal(p => [...p, { id: "b" + Date.now(), url: "", titulo: "", enlace: "", destinatarios: "todos", clientesSeleccionados: [] }]);
  }
  function upd(i, k, v) { setLocal(p => p.map((b, xi) => xi === i ? { ...b, [k]: v } : b)); }
  function rem(i) { setLocal(p => p.filter((_, xi) => xi !== i)); }
  function toggleCliente(i, clientId) {
    setLocal(p => p.map((b, xi) => {
      if (xi !== i) return b;
      const sel = b.clientesSeleccionados || [];
      return { ...b, clientesSeleccionados: sel.includes(clientId) ? sel.filter(c => c !== clientId) : [...sel, clientId] };
    }));
  }
  function toggleCollapse(id) { setCollapsed(p => ({ ...p, [id]: !p[id] })); }

  async function save() {
    setSaving(true);
    await onSave(local);
    // Colapsar todos al guardar
    const c = {}; local.forEach(b => { c[b.id] = true; });
    setCollapsed(c);
    show("✓ Banner guardado correctamente", "ok");
    setSaving(false);
  }

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Comunicaciones / Banner</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Hasta 5 imagenes · Visibles en la parte superior del panel del cliente</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={addSlide} disabled={local.length >= 5}>+ Añadir imagen</button>
            <button className="btn btn-green btn-sm" disabled={saving} onClick={save}>{saving ? "Guardando..." : "💾 Guardar banner"}</button>
          </div>
        </div>

        {local.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>🖼</div>
            <div>Sin imagenes. Añade la primera.</div>
          </div>
        )}

        {local.map((b, i) => {
          const isCollapsed = !!collapsed[b.id];
          const imgSrc = getDriveDirectUrl(b.url);
          return (
            <div key={b.id} className="banner-admin-card" style={{ padding: 0, overflow: "hidden" }}>
              {/* HEADER colapsable */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: "var(--surface2)" }}
                onClick={() => toggleCollapse(b.id)}>
                {isCollapsed && b.url ? (
                  <img src={imgSrc} alt="" style={{ width: 56, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <div style={{ width: 56, height: 28, background: "var(--border)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🖼</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Imagen {i + 1}{b.titulo ? ` — ${b.titulo}` : ""}</div>
                  {isCollapsed && b.url && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.url}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); rem(i); }}>× Eliminar</button>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{isCollapsed ? "▼" : "▲"}</span>
                </div>
              </div>

              {/* BODY expandible */}
              {!isCollapsed && (
                <div style={{ padding: "1rem" }}>
                  <div className="field">
                    <label>URL de la imagen</label>
                    <input type="text" value={b.url} onChange={e => upd(i, "url", e.target.value)} placeholder="https://... (enlace directo a la imagen)" />
                    <div className="banner-hint">
                      <b>Google Drive:</b> Sube la imagen, clic derecho, Obtener enlace, cambia a Cualquier persona, pega aqui. Se convierte automaticamente.
                      <br/>
                      <b>Otros:</b> Imgur, Cloudinary, o cualquier URL .jpg .png .webp funciona directo.
                      <br/>
                      <b>Dimensiones:</b> 1200x300 px minimo · Relacion 4:1 · Maximo 2MB
                    </div>
                  </div>
                  {b.url && (
                    <img src={imgSrc} alt="Preview" className="banner-preview"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={e => { e.target.style.display = "none"; }}
                      onLoad={e => { e.target.style.display = "block"; }} />
                  )}
                  <div className="field" style={{ marginTop: 10 }}>
                    <label>Titulo (opcional)</label>
                    <input type="text" value={b.titulo} onChange={e => upd(i, "titulo", e.target.value)} placeholder="Ej: Nueva promocion disponible" />
                  </div>
                  <div className="field">
                    <label>Enlace al hacer clic (opcional)</label>
                    <input type="text" value={b.enlace || ""} onChange={e => upd(i, "enlace", e.target.value)} placeholder="https://wa.me/... o cualquier URL" />
                  </div>
                  <div className="field">
                    <label>Mostrar a</label>
                    <select value={b.destinatarios} onChange={e => upd(i, "destinatarios", e.target.value)}>
                      <option value="todos">Todos los clientes</option>
                      <option value="seleccionados">Clientes especificos</option>
                    </select>
                  </div>
                  {b.destinatarios === "seleccionados" && (
                    <div>
                      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Selecciona clientes</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {clients.map(c => {
                          const sel = (b.clientesSeleccionados || []).includes(c.id);
                          return (
                            <div key={c.id} className={"servicio-chip " + (sel ? "selected" : "")} onClick={() => toggleCliente(i, c.id)}>
                              {sel ? "✓ " : ""}{c.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Función para obtener los banners que corresponden a un cliente específico
function getBannersForClient(banners, clientId) {
  return (banners || []).filter(b => {
    if (!b.url || !b.url.trim()) return false;
    // "todos" = siempre visible, incluso para clientes nuevos
    if (!b.destinatarios || b.destinatarios === "todos") return true;
    return (b.clientesSeleccionados || []).includes(clientId);
  }).map(b => ({ ...b, url: getDriveDirectUrl(b.url) }));
}


// ─── APOLLO PRODUCT ───────────────────────────────────────────────────────────

// Fuentes disponibles para KPIs personalizados
const KPI_FUENTES = [
  { id: "sum_resultados",   label: "Registros FB (suma resultados)",     tab: "metricas"  },
  { id: "sum_formularios",  label: "Formularios (suma formularios)",      tab: "metricas"  },
  { id: "sum_inversion",    label: "Inversión total",                     tab: "metricas"  },
  { id: "sum_ventas",       label: "Ventas totales",                      tab: "metricas"  },
  { id: "sum_ingreso",      label: "Ingresos totales",                    tab: "metricas"  },
  { id: "sum_alcance",      label: "Alcance total",                       tab: "metricas"  },
  { id: "sum_personas_wp",  label: "Personas WP (métricas diarias)",      tab: "metricas"  },
  { id: "cap_total_wp",     label: "Total en WP (Captura WP)",            tab: "captura"   },
  { id: "cap_total_form",   label: "Total registros FB (Captura WP)",     tab: "captura"   },
  { id: "cap_pct",          label: "% Captura FB→WP",                     tab: "captura"   },
  { id: "manual",           label: "Ingreso manual",                      tab: "manual"    },
];

const KPI_OPS = [
  { id: "+",  label: "+ Suma"        },
  { id: "-",  label: "- Resta"       },
  { id: "*",  label: "× Multiplicar" },
  { id: "/",  label: "÷ Dividir"     },
  { id: "%",  label: "% Porcentaje (A/B×100)" },
];

const APOLLO_KPIS_DEFAULT = [
  { id: "reg_fb",      nombre: "Registros en Facebook",     unidad: "personas", historico: "", actual: "", meta: "",   tipo: "auto",   fuente: "sum_resultados",  hint: "¿Cuántas personas se registraron en el formulario?" },
  { id: "reg_wp",      nombre: "Registros en WhatsApp",     unidad: "personas", historico: "", actual: "", meta: "",   tipo: "auto",   fuente: "cap_total_wp",    hint: "¿Cuántas personas ingresaron al grupo de WhatsApp?" },
  { id: "pct_cap",     nombre: "% de Captura",              unidad: "%",        historico: "", actual: "", meta: "70", tipo: "calc",   formula: "cap_total_wp % sum_resultados", hint: "¿Qué % pasó de Facebook a WhatsApp?" },
  { id: "asistentes",  nombre: "Asistentes al evento",      unidad: "personas", historico: "", actual: "", meta: "",   tipo: "calc",   formula: "cap_total_wp * 0.10", hint: "Estimado: 10% de personas en WP" },
  { id: "cpa_fb",      nombre: "CPA FB (Costo x Registro)", unidad: "$",        historico: "", actual: "", meta: "",   tipo: "calc",   formula: "sum_inversion / sum_resultados", hint: "Inversión total ÷ Registros en Facebook" },
  { id: "cpa_wp",      nombre: "CPA WP (Costo x WP)",      unidad: "$",        historico: "", actual: "", meta: "",   tipo: "calc",   formula: "sum_inversion / cap_total_wp",   hint: "Inversión total ÷ Personas en WhatsApp" },
  { id: "oportunidades",nombre: "Oportunidades",            unidad: "personas", historico: "", actual: "", meta: "",   tipo: "manual", fuente: "manual", hint: "Manual — personas con intención real de compra" },
  { id: "ventas",      nombre: "Ventas cerradas",           unidad: "ventas",   historico: "", actual: "", meta: "",   tipo: "manual", fuente: "manual", hint: "Manual — ventas generadas al cierre" },
  { id: "roas",        nombre: "ROAS",                      unidad: "x",        historico: "", actual: "", meta: "4",  tipo: "calc",   formula: "sum_ingreso / sum_inversion",    hint: "Ingresos totales ÷ Inversión total" },
];

const APOLLO_FASES = [
  { id: "estrategia",      nombre: "Estrategia",           icono: "🧠", tareas: ["Brief del lanzamiento definido","Avatar y segmentacion listos","Nomenclatura de campanas definida","Presupuesto total asignado"] },
  { id: "produccion",      nombre: "Produccion",           icono: "🎬", tareas: ["Anuncios de video grabados","Anuncios de imagen disenados","Copys redactados","Landing/Formularios configurados","Grupos WhatsApp creados y configurados"] },
  { id: "captacion",       nombre: "Captacion",            icono: "📡", tareas: ["Campanas activas y monitoreadas","Leads ingresando a WhatsApp","Presupuesto diario controlado","Reporte diario enviado","Calidad del lead verificada","Optimizacion de campanas"] },
  { id: "remarketing_cap", nombre: "Remarketing Captacion",icono: "🔄", tareas: ["Campanas de remarketing a clases activas","Audiencias calidas segmentadas","Mensajes de seguimiento en WP","Calificacion de leads con encuesta"] },
  { id: "calentamiento",   nombre: "Calentamiento",        icono: "🔥", tareas: ["Contenido de valor enviado por WP","Encuesta de intencion enviada","Confirmacion de asistencia obtenida","Lista de oportunidades identificada","Campanas de recordatorio activas"] },
  { id: "evento",          nombre: "Despegue de la mision",icono: "🚀", tareas: ["Transmision configurada (FB/YT Live)","Pruebas tecnicas realizadas","Operacion en vivo","Grabacion del evento","Pico de asistencia registrado","Ventas en vivo monitoreadas"] },
  { id: "escalamiento",    nombre: "En orbita",            icono: "🛸", tareas: ["Campanas de escala activas","Presupuesto escalado a ganadores","Optimizacion de audiencias calientes","Reportes de escala diarios"] },
  { id: "remarketing_vta", nombre: "Remarketing Ventas",   icono: "🎯", tareas: ["Campanas remarketing a no compradores","Segmentacion por comportamiento en evento","Mensajes de seguimiento personalizados"] },
  { id: "ventas",          nombre: "Aterrizaje",           icono: "🌕", tareas: ["Oportunidades contactadas","Ventas cerradas registradas","Seguimiento post-venta","ROAS calculado en tiempo real"] },
  { id: "replay",          nombre: "Replay",               icono: "📹", tareas: ["Grabacion del evento publicada","Campanas de replay activas","Nuevas oportunidades del replay","Leads calificados del replay"] },
  { id: "cierre",          nombre: "Cierre de mision",     icono: "🏆", tareas: ["Ultima oferta enviada","Ventas finales cerradas","Reporte final APOLLO enviado","ROAS final calculado","Recomendaciones para siguiente mision"] },
];

// ─── HERMES PRODUCT ───────────────────────────────────────────────────────────

// Configuración del producto HERMES
const HERMES_FASES = [
  { id: "onboarding",     nombre: "Onboarding",      icono: "🔍", dias: "1-2",  tareas: ["Reunion estrategica 60min","Recopilar Avatar y producto","Recopilar objetivos y competencia","Auditar redes sociales","Auditar contenido anterior","Entregable: Documento de descubrimiento"] },
  { id: "estrategia",     nombre: "Estrategia",       icono: "🧠", dias: "3",    tareas: ["Definir temas de contenido","Definir categorias y angulos","Identificar dolores y deseos","Calendario de contenido","9 piezas aprobadas"] },
  { id: "produccion",     nombre: "Produccion",       icono: "🎬", dias: "4",    tareas: ["Grabacion videos de valor","Grabacion videos virales","Grabacion videos de venta","Material bruto listo"] },
  { id: "postproduccion", nombre: "Postproduccion",   icono: "✂️", dias: "5-8",  tareas: ["Edicion y diseño","Subtitulos y miniaturas","Copys y CTA","9 piezas terminadas"] },
  { id: "publicacion",    nombre: "Publicacion",      icono: "📱", dias: "9-15", tareas: ["Publicar contenido","Monitorear metricas","Registrar Likes Comentarios","Registrar Compartidos Guardados","Registrar Retencion y CTR"] },
  { id: "validacion",     nombre: "Validacion",       icono: "✅", dias: "9-15", tareas: ["Clasificar contenido escalable","Clasificar contenido a observar","Descartar contenido bajo rendimiento","Identificar ganadores"] },
  { id: "pauta",          nombre: "Activar Pauta",    icono: "🚀", dias: "12-15",tareas: ["Seleccionar contenido ganador","Crear campana en Facebook/TikTok","Optimizar campana","Medir oportunidades y CPA"] },
  { id: "reporte",        nombre: "Reportes",         icono: "📊", dias: "7,15", tareas: ["Reporte dia 7 (enviar Telegram)","Reporte dia 15 (enviar Telegram)","Contenido ganador identificado","Oportunidades y ventas reportadas"] },
];

const HERMES_MOMENTOS_WOW = [
  { id: "wow1", dia: 2,  label: "Wow #1",  icono: "🔍", descripcion: "Despues de la reunion", contenido: "Resumen del negocio, Avatar preliminar y Objetivos detectados" },
  { id: "wow2", dia: 4,  label: "Wow #2",  icono: "🎬", descripcion: "Antes de grabar",        contenido: "Plan de grabacion, Temas, Objetivos y Guiones" },
  { id: "wow3", dia: 9,  label: "Wow #3",  icono: "⚡", descripcion: "Durante la semana",      contenido: "Primer hito de la estrategia: video con mejor desarrollo identificado" },
  { id: "wow4", dia: 15, label: "Wow #4",  icono: "🏆", descripcion: "En el reporte final",    contenido: "Que aprendimos, que funciono y que haremos despues" },
];

const HERMES_KPIS_DEFAULT = [
  { id: "oportunidades", nombre: "Oportunidades de venta", unidad: "mensajes/registros/checkouts", historico: "", actual: "", meta: "" },
  { id: "ventas",        nombre: "Ventas cerradas",         unidad: "ventas",                      historico: "", actual: "", meta: "" },
  { id: "cpa",           nombre: "CPA positivo",            unidad: "$",                           historico: "", actual: "", meta: "", cpaPositivo: true },
  { id: "calidad",       nombre: "Calidad de contenido",    unidad: "indice 0-100",                historico: "", actual: "", meta: "50" },
];

const HERMES_CATEGORIAS_CONTENIDO = ["Valor", "Viral", "Venta", "Captacion", "Remarketing"];

// Calcular Indice de Validacion (IV) de una pieza
// calcIV recibe la pieza y el conjunto completo para normalización relativa
function calcIV(pieza, biblioteca) {
  const compartidos = parseFloat(pieza.compartidos) || 0;
  const guardados   = parseFloat(pieza.guardados)   || 0;
  const comentarios = parseFloat(pieza.comentarios) || 0;
  const ctr         = parseFloat(pieza.ctr_pza)     || 0;
  const likes       = parseFloat(pieza.likes)       || 0;
  const alcance     = parseFloat(pieza.alcance_pza) || 1;

  // Tasas relativas al alcance (engagement rate)
  const rateComp  = alcance > 0 ? (compartidos / alcance) * 100 : 0;
  const rateGuard = alcance > 0 ? (guardados   / alcance) * 100 : 0;
  const rateComt  = alcance > 0 ? (comentarios / alcance) * 100 : 0;
  const rateLikes = alcance > 0 ? (likes       / alcance) * 100 : 0;

  // Si hay biblioteca para comparar, normalizar contra el máximo del conjunto
  let maxComp = 1, maxGuard = 1, maxComt = 1, maxLikes = 1, maxCtr = 1;
  if (biblioteca && biblioteca.length > 1) {
    const getRate = (arr, field, alc) => arr.map(p => {
      const a = parseFloat(p.alcance_pza) || 1;
      return (parseFloat(p[field]) || 0) / a * 100;
    });
    const ratiosComp  = getRate(biblioteca, "compartidos");
    const ratiosGuard = getRate(biblioteca, "guardados");
    const ratiosComt  = getRate(biblioteca, "comentarios");
    const ratiosLikes = getRate(biblioteca, "likes");
    const ctrList     = biblioteca.map(p => parseFloat(p.ctr_pza) || 0);
    maxComp  = Math.max(...ratiosComp,  0.001);
    maxGuard = Math.max(...ratiosGuard, 0.001);
    maxComt  = Math.max(...ratiosComt,  0.001);
    maxLikes = Math.max(...ratiosLikes, 0.001);
    maxCtr   = Math.max(...ctrList,     0.001);
  }

  // Score ponderado con normalización relativa (0-100)
  const score =
    Math.min(rateComp  / maxComp,  1) * 30 +
    Math.min(rateGuard / maxGuard, 1) * 25 +
    Math.min(rateComt  / maxComt,  1) * 20 +
    Math.min(ctr       / maxCtr,   1) * 15 +
    Math.min(rateLikes / maxLikes, 1) * 10;

  return Math.min(Math.round(score), 100);
}

function getIVClass(iv) {
  if (iv >= 70) return "iv-green";
  if (iv >= 40) return "iv-amber";
  return "iv-red";
}

function getIVLabel(iv) {
  if (iv >= 70) return "🟢 A pauta fijo";
  if (iv >= 50) return "🟢 Repetir / probar pauta";
  if (iv >= 40) return "🟡 Observar";
  return "🔴 Descartar";
}

// Calcular dias transcurridos desde inicio del contrato
function getDiasTranscurridos(client) {
  const contratos = client.contratos || [];
  if (!contratos.length) return 0;
  const ct = contratos[0];
  if (!ct.fechaInicio) return 0;
  const inicio = new Date(ct.fechaInicio + "T00:00:00");
  const hoy = new Date();
  return Math.max(0, Math.floor((hoy - inicio) / 86400000));
}

// ─── BARRA DE PROGRESO HERMES ─────────────────────────────────────────────────
function HermesProgressBar({ client, onUpdate, readOnly }) {
  const isApollo = client.producto?.startsWith("APOLLO");
  const hermes = client.hermesData || {};
  const momentos = hermes.momentos || {};
  const duracion = isApollo ? (client.apolloData?.duracion || 21) : 15;
  const [editMode, setEditMode] = useState(false);
  const [editFecha, setEditFecha] = useState("");
  const [editDuracion, setEditDuracion] = useState(duracion);
  const { show, el: toastEl } = useToast();

  // Calcular días usando fecha manual del apolloData si existe, sino desde contratos
  const fechaManual = client.apolloData?.fechaInicioMision;
  const fechaBase = fechaManual || (client.contratos?.[0]?.fechaInicio) || "";
  const diasBrutos = fechaBase
    ? Math.max(0, Math.floor((new Date() - new Date(fechaBase + "T00:00:00")) / 86400000))
    : getDiasTranscurridos(client);
  const dias = Math.min(diasBrutos, duracion);
  const pct = (dias / duracion) * 100;

  async function guardarAjuste() {
    const updated = {
      ...client,
      apolloData: {
        ...(client.apolloData || {}),
        fechaInicioMision: editFecha || fechaBase,
        duracion: parseInt(editDuracion) || duracion,
      }
    };
    await onUpdate(updated);
    setEditMode(false);
    show("✓ Ajuste guardado", "ok");
  }

  async function toggleMomento(id) {
    if (readOnly) return;
    const ya = !!momentos[id];
    if (!ya) {
      // Marcar como enviado CON editor de mensaje
      const wow = HERMES_MOMENTOS_WOW.find(m => m.id === id);
      const def = wow ? ("✦ " + wow.label + " — " + client.name + "\n\n" + wow.descripcion + "\n\n" + wow.contenido + "\n\nGavico Agency") : "";
      const editado = window.prompt("Editar mensaje del " + (wow?.label || "WOW") + " antes de enviar:", def);
      if (editado === null) return; // canceló
      const newMomentos = { ...momentos, [id]: true };
      await onUpdate({ ...client, hermesData: { ...hermes, momentos: newMomentos } });
      show("✦ " + (wow?.label || "WOW") + " marcado", "ok");
      if (client.tgConfig?.token && client.tgConfig?.chatId) {
        try {
          const res = await fetch("https://api.telegram.org/bot" + client.tgConfig.token + "/sendMessage", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: client.tgConfig.chatId, text: editado })
          });
          const d = await res.json();
          if (d.ok) show("✦ Mensaje enviado por Telegram", "ok");
          else show("Telegram error: " + d.description, "err");
        } catch (e) { show("Error enviando: " + e.message, "err"); }
      }
    } else {
      // Desmarcar
      await onUpdate({ ...client, hermesData: { ...hermes, momentos: { ...momentos, [id]: false } } });
    }
  }

  return (
    <>
      {toastEl}
      <div className="hermes-progress-wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: isApollo ? "#4d9fff" : "var(--accent2)", letterSpacing: ".05em" }}>
            {isApollo ? "🚀 APOLLO" : "✦ HERMES"} — Dia {dias} de {duracion}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{Math.round(pct)}% completado</div>
            {!readOnly && isApollo && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:"2px 8px" }}
                onClick={() => { setEditMode(e=>!e); setEditFecha(fechaBase); setEditDuracion(duracion); }}>
                {editMode ? "× Cerrar" : "⚙️ Ajustar"}
              </button>
            )}
          </div>
        </div>
        {/* Panel de ajuste de fase */}
        {editMode && !readOnly && (
          <div style={{ background:"rgba(0,74,173,.08)", border:"1px solid rgba(0,74,173,.2)", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:8 }}>Ajusta la fecha de inicio y duración de la misión para que la barra refleje la fase correcta.</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>Fecha inicio de misión</label>
                <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} style={{ fontSize:12 }} />
              </div>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>Duración total (días)</label>
                <input type="number" min="1" max="90" value={editDuracion} onChange={e => setEditDuracion(e.target.value)} style={{ width:80, fontSize:12 }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={guardarAjuste}>💾 Guardar</button>
            </div>
            {fechaBase && <div style={{ fontSize:10, color:"var(--muted)", marginTop:6 }}>Fecha actual: {fechaBase} · Días transcurridos: {diasBrutos}</div>}
          </div>
        )}
        <div className="hermes-track" style={isApollo ? { background: "linear-gradient(90deg,#000510 0%,#001a3d 50%,#000c20 100%)" } : {}}>
          <div className="hermes-stars" />
          <div className="hermes-fill" style={{ width: `${pct}%`, background: isApollo ? "linear-gradient(90deg,rgba(0,74,173,.4),rgba(77,159,255,.2))" : undefined }} />
          <div className="hermes-carriage" style={{ left: `calc(${Math.min(pct, 92)}% - 12px)` }}>
            {isApollo ? "🚀" : "🏺"}
          </div>
          <div className="hermes-temple">{isApollo ? "🌕" : "🏛️"}</div>
        </div>
        <div className="hermes-checkpoints">
          {isApollo
            ? APOLLO_FASES.map((f, idx) => {
                const diaFase = Math.round((idx / (APOLLO_FASES.length - 1)) * duracion);
                const done = !!(client.apolloData?.momentos?.[f.id]);
                const reachable = dias >= diaFase;
                return (
                  <div key={f.id} className="hermes-cp"
                    style={{ opacity: reachable ? 1 : 0.4, cursor: "default" }}>
                    <div className={"hermes-cp-dot " + (done ? "done" : reachable ? "active" : "")}>
                      {done ? "✓" : f.icono}
                    </div>
                    <div className="hermes-cp-label" style={{ color: "#4d9fff" }}>{f.nombre.slice(0, 8)}</div>
                  </div>
                );
              })
            : HERMES_MOMENTOS_WOW.map(m => {
                const done = !!momentos[m.id];
                const reachable = dias >= m.dia;
                return (
                  <div key={m.id} className="hermes-cp" onClick={() => !readOnly && reachable && toggleMomento(m.id)}
                    style={{ opacity: reachable ? 1 : 0.4, cursor: readOnly || !reachable ? "default" : "pointer" }}>
                    <div className={"hermes-cp-dot " + (done ? "done" : reachable ? "active" : "")}>
                      {done ? "✓" : m.icono}
                    </div>
                    <div className="hermes-cp-label">{m.label}<br/><span style={{ color: "var(--muted)", fontSize: 8 }}>Dia {m.dia}</span></div>
                  </div>
                );
              })
          }
        </div>
        {!readOnly && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
            Clic en un Momento WOW para marcarlo como enviado y notificar al cliente por Telegram
          </div>
        )}
      </div>
    </>
  );
}

// ─── KPIs COMPARATIVOS HERMES ─────────────────────────────────────────────────
// ─── MOTOR DE CÁLCULO DE KPIs ────────────────────────────────────────────────
function resolverFuente(fuente, records, capturaData) {
  const r = records || [];
  const c = capturaData || {};
  switch(fuente) {
    case "sum_resultados":  return r.reduce((a,x) => a+(parseFloat(x.resultados)||parseFloat(x.formularios)||0), 0);
    case "sum_formularios": return r.reduce((a,x) => a+(parseFloat(x.formularios)||0), 0);
    case "sum_inversion":   return r.reduce((a,x) => a+(parseFloat(x.inversion)||0), 0);
    case "sum_ventas":      return r.reduce((a,x) => a+(parseFloat(x.ventas)||0), 0);
    case "sum_ingreso":     return r.reduce((a,x) => a+(parseFloat(x.ingreso)||0), 0);
    case "sum_alcance":     return r.reduce((a,x) => a+(parseFloat(x.alcance)||0), 0);
    case "sum_personas_wp": return r.reduce((a,x) => a+(parseFloat(x.personas_wp)||0), 0);
    case "cap_total_wp":    return c.total_wp || r.reduce((a,x) => a+(parseFloat(x.personas_wp)||0), 0);
    case "cap_total_form":  return c.total_form || r.reduce((a,x) => a+(parseFloat(x.resultados)||parseFloat(x.formularios)||0), 0);
    case "cap_pct":         return c.total_form > 0 && c.total_wp > 0 ? c.total_wp/c.total_form*100 : 0;
    default: return 0;
  }
}

function calcularKPI(kpi, records, capturaData) {
  if (kpi.tipo === "manual") return null;

  const r = records || [];
  const c = capturaData || {};

  if (kpi.tipo === "auto") {
    const val = resolverFuente(kpi.fuente, r, c);
    return val > 0 ? val : null;
  }

  if (kpi.tipo === "calc" && kpi.formula) {
    const formula = kpi.formula.trim();

    // Operador % → porcentaje: A/B*100
    if (formula.includes(" % ")) {
      const parts = formula.split(" % ").map(s => s.trim());
      const va = resolverFuente(parts[0], r, c);
      const vb = isNaN(parseFloat(parts[1])) ? resolverFuente(parts[1], r, c) : parseFloat(parts[1]);
      if (va === 0 || vb === 0) return null;
      return va / vb * 100;
    }

    // Operadores estándar — probarlos todos
    for (const op of ["/", "*", "-", "+"]) {
      if (formula.includes(` ${op} `)) {
        const parts = formula.split(` ${op} `).map(s => s.trim());
        const va = isNaN(parseFloat(parts[0])) ? resolverFuente(parts[0], r, c) : parseFloat(parts[0]);
        const vb = isNaN(parseFloat(parts[1])) ? resolverFuente(parts[1], r, c) : parseFloat(parts[1]);
        if (op === "/" && vb === 0) return null;
        if (op === "/" && va === 0) return null;
        if (op === "*" && (va === 0 || vb === 0)) return null;
        if (op === "+") return va + vb;
        if (op === "-") return va - vb;
        if (op === "*") return va * vb;
        if (op === "/") return va / vb;
      }
    }
  }
  return null;
}

function formatKpiVal(val, unidad) {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (unidad === "$") return "$" + fmtNum(n, 2);
  if (unidad === "%") return fmtNum(n, 1) + "%";
  if (unidad === "x") return fmtNum(n, 2) + "x";
  return fmtNum(n, n < 100 ? 2 : 0);
}

// ─── CONSTRUCTOR DE KPI PERSONALIZADO ─────────────────────────────────────────
function KpiBuilder({ onSave, onCancel }) {
  const [form, setForm] = useState({ nombre: "", unidad: "personas", tipo: "auto", fuente: "sum_resultados", formula: "", formulaA: "", op: "/", formulaB: "", meta: "", hint: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function buildFormula() {
    if (form.tipo === "calc") {
      if (form.op === "%") return `${form.formulaA} % ${form.formulaB}`;
      return `${form.formulaA} ${form.op} ${form.formulaB}`;
    }
    return "";
  }

  function save() {
    if (!form.nombre) return alert("Ingresa el nombre del KPI");
    const kpi = {
      id: "kpi_" + Date.now(),
      nombre: form.nombre,
      unidad: form.unidad,
      tipo: form.tipo,
      fuente: form.tipo === "auto" ? form.fuente : "manual",
      formula: form.tipo === "calc" ? buildFormula() : "",
      meta: form.meta,
      hint: form.hint,
      historico: "", actual: "",
    };
    onSave(kpi);
  }

  return (
    <div className="card" style={{ borderColor:"rgba(0,74,173,.4)", marginBottom:"1rem" }}>
      <div className="card-title">Nuevo KPI personalizado</div>
      <div className="form-row">
        <div className="field"><label>Nombre del KPI *</label><input type="text" value={form.nombre} onChange={e => f("nombre", e.target.value)} placeholder="Ej: Tasa de conversión" /></div>
        <div className="field"><label>Unidad</label>
          <select value={form.unidad} onChange={e => f("unidad", e.target.value)}>
            {["personas","ventas","$","%","x","días","leads"].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Tipo de KPI</label>
        <div className="period-pills">
          <button type="button" className={"pill " + (form.tipo==="auto" ? "active" : "")} onClick={() => f("tipo","auto")}>Auto (una fuente)</button>
          <button type="button" className={"pill " + (form.tipo==="calc" ? "active" : "")} onClick={() => f("tipo","calc")}>Calculado (A op B)</button>
          <button type="button" className={"pill " + (form.tipo==="manual" ? "active" : "")} onClick={() => f("tipo","manual")}>Manual</button>
        </div>
      </div>
      {form.tipo === "auto" && (
        <div className="field"><label>Fuente de datos</label>
          <select value={form.fuente} onChange={e => f("fuente", e.target.value)}>
            {KPI_FUENTES.filter(f => f.id !== "manual").map(fu => <option key={fu.id} value={fu.id}>{fu.label}</option>)}
          </select>
        </div>
      )}
      {form.tipo === "calc" && (
        <div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:8 }}>Construye la fórmula: <strong>Valor A  Operación  Valor B</strong></div>
          <div className="form-row" style={{ alignItems:"center", gap:8 }}>
            <div className="field" style={{ flex:2 }}><label>Valor A</label>
              <select value={form.formulaA} onChange={e => f("formulaA", e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {KPI_FUENTES.filter(fu => fu.id !== "manual").map(fu => <option key={fu.id} value={fu.id}>{fu.label}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex:1 }}><label>Operación</label>
              <select value={form.op} onChange={e => f("op", e.target.value)}>
                {KPI_OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex:2 }}><label>Valor B (fuente o número)</label>
              <div style={{ display:"flex", gap:6 }}>
                <select value={form.formulaB} onChange={e => f("formulaB", e.target.value)} style={{ flex:1 }}>
                  <option value="">-- Seleccionar --</option>
                  {KPI_FUENTES.filter(fu => fu.id !== "manual").map(fu => <option key={fu.id} value={fu.id}>{fu.label}</option>)}
                  <option value="100">100 (constante)</option>
                  <option value="0.10">0.10 (10%)</option>
                  <option value="0.30">0.30 (30%)</option>
                </select>
              </div>
            </div>
          </div>
          {form.formulaA && form.formulaB && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"8px 12px", fontSize:12, marginTop:4 }}>
              <strong>Fórmula:</strong> {KPI_FUENTES.find(f=>f.id===form.formulaA)?.label || form.formulaA}
              {" "}<strong style={{ color:"var(--accent2)" }}>{KPI_OPS.find(o=>o.id===form.op)?.label}</strong>{" "}
              {KPI_FUENTES.find(f=>f.id===form.formulaB)?.label || form.formulaB}
              {form.op === "%" && " × 100"}
            </div>
          )}
        </div>
      )}
      {form.tipo === "manual" && (
        <div style={{ fontSize:12, color:"var(--muted)", background:"var(--surface2)", padding:"8px 12px", borderRadius:8 }}>
          Este KPI se llenará manualmente en la tabla — útil para datos que no están en el sistema.
        </div>
      )}
      <div className="form-row" style={{ marginTop:8 }}>
        <div className="field"><label>Meta (opcional)</label><input type="text" value={form.meta} onChange={e => f("meta", e.target.value)} placeholder="Ej: 4" /></div>
        <div className="field"><label>Descripción (opcional)</label><input type="text" value={form.hint} onChange={e => f("hint", e.target.value)} placeholder="¿Qué mide este KPI?" /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button className="btn btn-primary btn-sm" onClick={save}>Agregar KPI</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── PANEL DE KPIs APOLLO / HERMES ────────────────────────────────────────────
function HermesKpisPanel({ client, onUpdate, readOnly, isApollo }) {
  const hermes = client.hermesData || {};
  const capturaData = client.capturaConfig?.lastData || {};
  const records = client.records || [];
  const defaultKpis = isApollo ? APOLLO_KPIS_DEFAULT : HERMES_KPIS_DEFAULT;

  const savedKpis = isApollo
    ? (client.apolloData?.kpisApollo || [])
    : (hermes.kpisHermes || []);

  // Migración automática: si los KPIs guardados son del formato viejo (sin tipo/fuente), usar los nuevos default
  const kpisNecesitanMigracion = savedKpis.length > 0 && savedKpis.every(k => !k.tipo && !k.fuente && !k.formula);
  const kpis = (savedKpis.length > 0 && !kpisNecesitanMigracion) ? savedKpis : defaultKpis;

  const [editing, setEditing]   = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [local, setLocal]       = useState(kpis);
  const { show, el: toastEl }   = useToast();

  // Sincronizar cuando cambian datos externos
  useEffect(() => {
    const current = (savedKpis.length > 0 && !savedKpis.every(k => !k.tipo && !k.fuente)) ? savedKpis : defaultKpis;
    setLocal(current);
  }, [client.id, records.length, capturaData?.total_wp, capturaData?.lastSync]);

  async function resetearKpis() {
    if (!window.confirm("¿Restablecer los KPIs al formato nuevo? Los valores de 'Antes' y 'Meta' que hayas guardado se perderán.")) return;
    const updated = isApollo
      ? { ...client, apolloData: { ...(client.apolloData||{}), kpisApollo: APOLLO_KPIS_DEFAULT } }
      : { ...client, hermesData: { ...hermes, kpisHermes: HERMES_KPIS_DEFAULT } };
    await onUpdate(updated);
    setLocal(defaultKpis);
    show("✓ KPIs restablecidos con el nuevo formato", "ok");
  }

  function upd(id, k, v) { setLocal(p => p.map(kpi => kpi.id === id ? { ...kpi, [k]: v } : kpi)); }

  async function save() {
    const updated = isApollo
      ? { ...client, apolloData: { ...(client.apolloData||{}), kpisApollo: local } }
      : { ...client, hermesData: { ...hermes, kpisHermes: local } };
    await onUpdate(updated);
    setEditing(false);
    show("✓ KPIs guardados", "ok");
  }

  function addKpi(kpi) {
    setLocal(p => [...p, kpi]);
    setShowBuilder(false);
    setEditing(true);
    show("KPI agregado — guarda para confirmar", "ok");
  }

  // Calcular el valor actual para cada KPI
  function getActual(kpi) {
    const calc = calcularKPI(kpi, records, capturaData);
    if (calc !== null) return calc;
    if (kpi.actual) return parseFloat(kpi.actual) || kpi.actual;
    return null;
  }

  const displayKpis = editing ? local : kpis;

  return (
    <>
      {toastEl}
      {showBuilder && !readOnly && <KpiBuilder onSave={addKpi} onCancel={() => setShowBuilder(false)} />}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
          <div className="card-title" style={{ margin:0 }}>KPIs — Antes vs. Ahora</div>
          {!readOnly && (
            <div style={{ display:"flex", gap:6 }}>
              {!editing && !showBuilder && <button className="btn btn-ghost btn-sm" onClick={() => setShowBuilder(true)}>+ KPI</button>}
              {!editing && isApollo && (kpisNecesitanMigracion || savedKpis.length === 0) && (
                <button className="btn btn-sm" style={{ background:"rgba(255,145,77,.15)", color:"var(--orange)", border:"1px solid rgba(255,145,77,.3)", fontSize:11 }}
                  onClick={resetearKpis}>⚡ Actualizar formato</button>
              )}
              {!editing && isApollo && savedKpis.length > 0 && !kpisNecesitanMigracion && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize:10 }} onClick={resetearKpis} title="Restablecer KPIs al formato nuevo">↺</button>
              )}
              {editing
                ? <><button className="btn btn-green btn-sm" onClick={save}>💾 Guardar</button><button className="btn btn-ghost btn-sm" onClick={() => { setLocal(kpis); setEditing(false); }}>Cancelar</button></>
                : <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>}
            </div>
          )}
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>KPI</th>
                <th style={{ color:"var(--red)" }}>ANTES</th>
                <th style={{ color:"var(--accent2)" }}>AHORA</th>
                <th>META</th>
                <th>CAMBIO</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {displayKpis.map(kpi => {
                const actualVal = getActual(kpi);
                const actualStr = actualVal !== null ? formatKpiVal(actualVal, kpi.unidad) : (editing && kpi.tipo==="manual" ? "" : "—");
                const historico = kpi.historico ? formatKpiVal(parseFloat(kpi.historico), kpi.unidad) : "—";
                const isAuto = kpi.tipo !== "manual" && actualVal !== null;
                const isManual = kpi.tipo === "manual";

                // Calcular cambio
                let cambio = null;
                if (kpi.historico && actualVal !== null) {
                  const h = parseFloat(kpi.historico);
                  const a = typeof actualVal === "number" ? actualVal : parseFloat(actualVal);
                  if (h > 0 && !isNaN(a)) cambio = ((a - h) / h * 100).toFixed(1);
                }

                return (
                  <tr key={kpi.id}>
                    <td>
                      {editing ? (
                        <div>
                          <input type="text" value={kpi.nombre} onChange={e => upd(kpi.id,"nombre",e.target.value)} style={{ fontWeight:600, marginBottom:3 }} />
                          <input type="text" value={kpi.unidad} onChange={e => upd(kpi.id,"unidad",e.target.value)} style={{ fontSize:11 }} placeholder="unidad" />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight:600 }}>{kpi.nombre}</div>
                          <div style={{ fontSize:11, color:"var(--muted)" }}>{kpi.hint || kpi.unidad}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily:"var(--mono)" }}>
                      {editing
                        ? <input type="text" value={kpi.historico||""} onChange={e => upd(kpi.id,"historico",e.target.value)} style={{ width:80 }} placeholder="0" />
                        : <span style={{ color:"var(--red)" }}>{historico}</span>}
                    </td>
                    <td style={{ fontFamily:"var(--mono)" }}>
                      {isManual && editing
                        ? <input type="text" value={kpi.actual||""} onChange={e => upd(kpi.id,"actual",e.target.value)} style={{ width:80 }} placeholder="—" />
                        : (
                          <div>
                            <span style={{ color:"var(--accent2)", fontWeight:600 }}>{actualStr}</span>
                            {isAuto && <div style={{ fontSize:10, color:"var(--green)" }}>auto ✓</div>}
                            {isManual && !actualVal && <div style={{ fontSize:10, color:"var(--accent2)" }}>✏️ manual</div>}
                          </div>
                        )}
                    </td>
                    <td style={{ fontFamily:"var(--mono)" }}>
                      {editing
                        ? <input type="text" value={kpi.meta||""} onChange={e => upd(kpi.id,"meta",e.target.value)} style={{ width:80 }} placeholder="—" />
                        : kpi.meta ? formatKpiVal(parseFloat(kpi.meta), kpi.unidad) : "—"}
                    </td>
                    <td>
                      {cambio !== null
                        ? <span className={parseFloat(cambio) >= 0 ? "delta-up" : "delta-down"}>
                            {parseFloat(cambio) >= 0 ? "▲" : "▼"} {Math.abs(cambio)}%
                          </span>
                        : <span className="delta-neutral">—</span>}
                    </td>
                    {editing && <td><button className="btn btn-danger btn-sm" style={{ padding:"2px 8px" }} onClick={() => setLocal(p => p.filter(k => k.id !== kpi.id))}>×</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


// ─── EMBUDO HERMES - forma real ───────────────────────────────────────────────
function HermesFunnel({ client, period, from, to }) {
  const records = filterByPeriod(client.records || [], period, from, to);
  const biblioteca = client.hermesData?.biblioteca || [];
  const alcance = records.reduce((a, r) => a + (r.alcance || 0), 0);
  const likes = records.reduce((a, r) => a + (r.likes || 0), 0);
  const comentarios = records.reduce((a, r) => a + (r.comentarios || 0), 0);
  const compartidos = records.reduce((a, r) => a + (r.compartidos || 0), 0);
  const guardados = records.reduce((a, r) => a + (r.guardados || 0), 0);
  const interacciones = likes + comentarios + compartidos + guardados;
  const interesPct = alcance > 0 ? (interacciones / alcance * 100) : 0;
  const validacion = biblioteca.length > 0 ? biblioteca.reduce((a, p) => a + calcIV(p, biblioteca), 0) / biblioteca.length : 0;
  const conversion = records.reduce((a, r) => a + (r.leads || r.formularios || r.resultados || 0), 0);
  const resultado = records.reduce((a, r) => a + (r.ventas || 0), 0);

  // Tamaños FIJOS — solo los números cambian
  const stages = [
    { label: "Atraccion",  sub: "Alcance total",         display: alcance > 0 ? alcance.toLocaleString("es-EC") : "—",              color: "#e84040", topW: 280, botW: 220, h: 54 },
    { label: "Interes",    sub: "Tasa interaccion",       display: alcance > 0 ? interesPct.toFixed(1) + "%" : "—",                  color: "#e86020", topW: 220, botW: 168, h: 46 },
    { label: "Validacion", sub: "IV promedio",            display: biblioteca.length > 0 ? validacion.toFixed(0) + "/100" : "—",     color: "#FFDE59", topW: 168, botW: 120, h: 40 },
    { label: "Conversion", sub: "Leads / Registros",      display: conversion > 0 ? conversion.toLocaleString("es-EC") : "—",        color: "#c8a800", topW: 120, botW: 80,  h: 34 },
    { label: "Resultado",  sub: "Ventas cerradas",         display: resultado > 0 ? resultado.toLocaleString("es-EC") : "—",          color: "#10B981", topW: 80,  botW: 56,  h: 28 },
  ];

  const svgW = 300;
  const gap = 2;
  const totalH = stages.reduce((a, s) => a + s.h + gap, 0);
  const cx = svgW / 2;

  return (
    <div className="card">
      <div className="card-title">Embudo de estrategia HERMES</div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <svg width={svgW} height={totalH} viewBox={"0 0 " + svgW + " " + totalH} style={{ flexShrink: 0, display: "block" }}>
          <defs>
            {stages.map((s, i) => (
              <linearGradient key={i} id={"fg" + i} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.65" />
              </linearGradient>
            ))}
          </defs>
          {stages.map((s, i) => {
            const y = stages.slice(0, i).reduce((a, p) => a + p.h + gap, 0);
            const tl = cx - s.topW / 2;
            const tr = cx + s.topW / 2;
            const bl = cx - s.botW / 2;
            const br = cx + s.botW / 2;
            const ey = s.h * 0.18; // profundidad elipse superior
            return (
              <g key={i}>
                {/* Cuerpo trapezoidal */}
                <path d={"M " + tl + " " + (y + ey) + " L " + bl + " " + (y + s.h - ey * 0.5) + " L " + br + " " + (y + s.h - ey * 0.5) + " L " + tr + " " + (y + ey) + " Z"}
                  fill={"url(#fg" + i + ")"} />
                {/* Elipse inferior (sombra interior) */}
                <ellipse cx={cx} cy={y + s.h - ey * 0.5} rx={s.botW / 2} ry={ey * 0.6}
                  fill={s.color} fillOpacity="0.5" />
                {/* Elipse superior (borde) */}
                <ellipse cx={cx} cy={y + ey} rx={s.topW / 2} ry={ey}
                  fill={s.color} fillOpacity="0.25" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.8" />
                {/* Texto valor */}
                <text x={cx} y={y + s.h * 0.55} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize={Math.max(s.h * 0.3, 10)} fontWeight="800" fontFamily="var(--mono)">
                  {s.display}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Leyenda lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: (stages[i].h + gap) + "px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, boxShadow: "0 0 6px " + s.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: s.color }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




// ─── UTILIDAD UNIVERSAL DE EXPORTACIÓN ────────────────────────────────────────
function exportarTabla(headers, rows, nombreArchivo, tipo) {
  const fecha = new Date().toISOString().slice(0,10);
  const nombre = nombreArchivo + "_" + fecha;
  if (tipo === "csv") {
    const csvRows = [headers.join(",")];
    rows.forEach(row => {
      csvRows.push(row.map(v => {
        const s = String(v ?? "");
        // Forzar texto para números que empiezan con + (teléfonos)
        if (s.startsWith("+") || /^\d{8,}$/.test(s)) return `="${s}"`;
        return s.includes(",") ? `"${s}"` : s;
      }).join(","));
    });
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = nombre + ".csv"; a.click();
  } else {
    // XLS via HTML table — Excel lo abre nativamente
    let html = "<table><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
    rows.forEach(row => {
      html += "<tr>" + row.map(v => {
        const s = String(v ?? "");
        // Forzar texto para teléfonos/números largos
        if (s.startsWith("+") || /^\d{8,}$/.test(s)) return `<td style="mso-number-format:'@'">${s}</td>`;
        return `<td>${s}</td>`;
      }).join("") + "</tr>";
    });
    html += "</table>";
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = nombre + ".xls"; a.click();
  }
}

// Botones de exportación reutilizables
function BotonesExportar({ headers, rows, nombreArchivo, size }) {
  const sz = size || "btn-sm";
  return (
    <div style={{ display:"flex", gap:4 }}>
      <button className={"btn btn-ghost " + sz} title="Descargar CSV"
        onClick={() => exportarTabla(headers, rows, nombreArchivo, "csv")}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:4}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button className={"btn btn-ghost " + sz} title="Descargar Excel"
        onClick={() => exportarTabla(headers, rows, nombreArchivo, "xls")}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:4}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        XLS
      </button>
    </div>
  );
}



// ─── ALERTA TELEGRAM CONDICIONAL (desde programador) ────────────────────────
async function enviarAlertaTelegramSiNecesario(client) {
  if (!client.tgConfig?.token || !client.tgConfig?.chatId) return;
  if (!client.producto?.startsWith("APOLLO")) return;

  const records = client.records || [];
  if (!records.length) return;

  const capturaData = client.capturaConfig?.lastData;
  const kpisApollo = client.apolloData?.kpisApollo || APOLLO_KPIS_DEFAULT;
  const inv     = records.reduce((a,r) => a+(parseFloat(r.inversion)||0), 0);
  const forms   = records.reduce((a,r) => a+(parseFloat(r.resultados)||parseFloat(r.formularios)||0), 0);
  const ventas  = records.reduce((a,r) => a+(parseFloat(r.ventas)||0), 0);
  const ingreso = records.reduce((a,r) => a+(parseFloat(r.ingreso)||0), 0);
  const wpTotal = capturaData?.total_wp || records.reduce((a,r) => a+(parseFloat(r.personas_wp)||0), 0);
  const cpa     = ventas > 0 ? inv/ventas : forms > 0 ? inv/forms : 0;
  const roas    = inv > 0 && ingreso > 0 ? ingreso/inv : 0;
  const pctCap  = forms > 0 && wpTotal > 0 ? wpTotal/forms*100 : 0;

  const metaCPA  = parseFloat(kpisApollo.find(k=>k.id==="cpa")?.meta) || 0;
  const metaRoas = parseFloat(kpisApollo.find(k=>k.id==="roas")?.meta) || 4;

  const alertas = [];
  if (metaCPA > 0 && cpa > metaCPA * 2)
    alertas.push(`🔴 CPA $${fmtNum(cpa,2)} supera el doble de la meta ($${fmtNum(metaCPA,2)})`);
  if (pctCap > 0 && pctCap < 50)
    alertas.push(`🔴 Captura WP ${fmtNum(pctCap,1)}% — por debajo del 50%`);
  if (roas > 0 && roas >= metaRoas)
    alertas.push(`🟢 ROAS ${fmtNum(roas,2)}x — meta alcanzada 🎯`);

  if (!alertas.length) return;

  const msg = `⚠️ *Alerta de misión — ${client.name}*\n\n` + alertas.join("\n") + `\n\n_Trafficker Pro · Centro de Control APOLLO_`;
  try {
    await fetch("https://api.telegram.org/bot" + client.tgConfig.token + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: client.tgConfig.chatId, text: msg, parse_mode: "Markdown" })
    });
  } catch {}
}

// ─── SEMÁFORO DE MISIÓN APOLLO ────────────────────────────────────────────────
function SemaforoMision({ client }) {
  const records = client.records || [];
  if (!records.length) return null;

  const kpisApollo = client.apolloData?.kpisApollo || APOLLO_KPIS_DEFAULT;
  const capturaData = client.capturaConfig?.lastData;

  const inv     = records.reduce((a,r) => a+(parseFloat(r.inversion)||0), 0);
  const forms   = records.reduce((a,r) => a+(parseFloat(r.resultados)||parseFloat(r.formularios)||0), 0);
  const ventas  = records.reduce((a,r) => a+(parseFloat(r.ventas)||0), 0);
  const ingreso = records.reduce((a,r) => a+(parseFloat(r.ingreso)||0), 0);
  const wpTotal = capturaData?.total_wp || records.reduce((a,r) => a+(parseFloat(r.personas_wp)||0), 0);
  const cpa     = ventas > 0 && inv > 0 ? inv/ventas : forms > 0 && inv > 0 ? inv/forms : 0;
  const roas    = inv > 0 && ingreso > 0 ? ingreso/inv : 0;
  const pctCap  = forms > 0 && wpTotal > 0 ? wpTotal/forms*100 : 0;

  const metaCPA  = parseFloat(kpisApollo.find(k=>k.id==="cpa")?.meta) || 0;
  const metaRoas = parseFloat(kpisApollo.find(k=>k.id==="roas")?.meta) || 4;
  const metaCap  = parseFloat(kpisApollo.find(k=>k.id==="pct_cap")?.meta) || 70;

  // Evaluar alertas
  const alertas = [];
  if (metaCPA > 0 && cpa > 0 && cpa > metaCPA * 2)
    alertas.push({ tipo:"rojo", msg:`CPA $${fmtNum(cpa,2)} supera el doble de la meta ($${fmtNum(metaCPA,2)})` });
  else if (metaCPA > 0 && cpa > 0 && cpa > metaCPA * 1.3)
    alertas.push({ tipo:"amarillo", msg:`CPA $${fmtNum(cpa,2)} por encima de meta ($${fmtNum(metaCPA,2)})` });

  if (pctCap > 0 && pctCap < 50)
    alertas.push({ tipo:"rojo", msg:`% Captura WP ${fmtNum(pctCap,1)}% está por debajo del 50%` });
  else if (pctCap > 0 && pctCap < metaCap)
    alertas.push({ tipo:"amarillo", msg:`% Captura ${fmtNum(pctCap,1)}% por debajo de meta (${metaCap}%)` });

  if (roas > 0 && roas >= metaRoas)
    alertas.push({ tipo:"verde", msg:`ROAS ${fmtNum(roas,2)}x alcanzó la meta de ${metaRoas}x 🎯` });
  else if (roas > 0 && roas >= metaRoas * 0.7)
    alertas.push({ tipo:"amarillo", msg:`ROAS ${fmtNum(roas,2)}x — acercándose a la meta de ${metaRoas}x` });

  const hayAlertas = alertas.length > 0;
  const tieneRojo = alertas.some(a=>a.tipo==="rojo");
  const tieneVerde = alertas.every(a=>a.tipo==="verde") && alertas.length > 0;

  const colorBorde = tieneRojo ? "rgba(239,68,68,.4)" : tieneVerde ? "rgba(16,185,129,.4)" : "rgba(255,222,89,.3)";
  const colorBg    = tieneRojo ? "rgba(239,68,68,.06)" : tieneVerde ? "rgba(16,185,129,.06)" : "rgba(255,222,89,.05)";
  const icono      = tieneRojo ? "🔴" : tieneVerde ? "🟢" : hayAlertas ? "🟡" : "🟢";
  const estado     = tieneRojo ? "Requiere atención" : tieneVerde ? "Misión en objetivo" : hayAlertas ? "En monitoreo" : "Misión en curso";

  return (
    <div style={{ background:colorBg, border:"1px solid "+colorBorde, borderRadius:10, padding:"10px 16px", marginBottom:"1rem", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
      <div style={{ fontSize:20 }}>{icono}</div>
      <div style={{ flex:1, minWidth:200 }}>
        <div style={{ fontWeight:700, fontSize:13 }}>{estado}</div>
        {hayAlertas
          ? <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{alertas[0].msg}{alertas.length>1 ? ` · +${alertas.length-1} más` : ""}</div>
          : <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
              CPA ${cpa>0?fmtNum(cpa,2):"—"} · ROAS {roas>0?fmtNum(roas,2)+"x":"—"} · Captura {pctCap>0?fmtNum(pctCap,1)+"%":"—"}
            </div>
        }
      </div>
      {alertas.length > 1 && (
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {alertas.slice(1).map((a,i) => (
            <div key={i} style={{ fontSize:11, color:"var(--muted)" }}>
              {a.tipo==="rojo"?"🔴":a.tipo==="verde"?"🟢":"🟡"} {a.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TARJETA DE MÉTRICA CON GRÁFICA DESPLEGABLE ──────────────────────────────
function MetricaCard({ label, value, color, records, campo, prefix, suffix, ocultar, onOcultar, onSubir, onBajar, meta, onSetMeta, clientId }) {
  const [open, setOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(meta ? String(meta) : "");

  const histData = (records || [])
    .filter(r => r[campo] !== undefined && r[campo] !== null && r[campo] !== "")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({ fecha: fmtDate(r.date), val: parseFloat(r[campo]) || 0 }));

  const maxVal = histData.length > 0 ? Math.max(...histData.map(d => d.val), 0.01) : 1;

  // ── Semáforo: comparar valor actual vs promedio últimos 7 días ────────────
  const semaforo = (() => {
    if (histData.length < 3) return null;
    const ultimos7 = histData.slice(-7);
    const prom = ultimos7.slice(0,-1).reduce((a,d)=>a+d.val,0) / Math.max(ultimos7.length-1,1);
    const actual = histData[histData.length-1].val;
    if (prom === 0) return null;
    const diff = (actual - prom) / prom * 100;
    // Para CPL/CPM/CPA: bajar es mejor. Para el resto: subir es mejor
    const bajaMejor = ["cpa","cpm","cpl","cpc"].some(k => campo?.toLowerCase().includes(k));
    if (Math.abs(diff) < 5) return { color:"var(--muted)", label:"estable", icono:"●" };
    if (bajaMejor) return diff < -5 ? { color:"var(--green)", label:`▼ ${Math.abs(diff).toFixed(0)}% vs 7d`, icono:"▼" } : { color:"var(--red)", label:`▲ ${Math.abs(diff).toFixed(0)}% vs 7d`, icono:"▲" };
    return diff > 5 ? { color:"var(--green)", label:`▲ ${Math.abs(diff).toFixed(0)}% vs 7d`, icono:"▲" } : { color:"var(--red)", label:`▼ ${Math.abs(diff).toFixed(0)}% vs 7d`, icono:"▼" };
  })();

  function exportarCSV() {
    const csv = "Fecha," + label + "\n" + histData.map(d => d.fecha + "," + d.val).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = label.replace(/[^a-z0-9]/gi,"_") + "_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
  }

  if (ocultar) return null;

  return (
    <div className="card" style={{ padding:"1rem", cursor: histData.length > 0 ? "pointer" : "default", position:"relative" }}
      onClick={() => histData.length > 0 && setOpen(o => !o)}>
      {/* Controles de orden — solo visibles en hover */}
      {(onSubir || onBajar || onOcultar) && (
        <div style={{ position:"absolute", top:6, right:6, display:"flex", gap:3, opacity:0 }}
          className="card-controls"
          onClick={e=>e.stopPropagation()}>
          {onSubir && <button onClick={onSubir} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:11, padding:"1px 3px" }}>↑</button>}
          {onBajar && <button onClick={onBajar} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:11, padding:"1px 3px" }}>↓</button>}
          {onOcultar && <button onClick={onOcultar} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:11, padding:"1px 3px" }}>×</button>}
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
          <div style={{ fontSize:20, fontFamily:"var(--mono)", fontWeight:700, color: color || "var(--text)" }}>{value}</div>
          {semaforo && (
            <div style={{ fontSize:10, color:semaforo.color, marginTop:3, fontWeight:600 }}>{semaforo.label}</div>
          )}
          {/* Barra de progreso hacia meta */}
          {meta > 0 && (() => {
            const numVal = parseFloat(String(value).replace(/[^0-9.-]/g,"")) || 0;
            const pct = Math.min((numVal / meta) * 100, 100);
            const bajaMejor = ["cpa","cpm","cpl","cpc"].some(k => campo?.toLowerCase().includes(k));
            const barColor = bajaMejor
              ? (numVal <= meta ? "var(--green)" : numVal <= meta*1.15 ? "var(--amber)" : "var(--red)")
              : (pct >= 100 ? "var(--green)" : pct >= 70 ? "var(--amber)" : "var(--red)");
            return (
              <div style={{marginTop:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:9,color:"var(--muted)"}}>Meta: {prefix||""}{fmtNum(meta,meta<100?2:0)}{suffix||""}</span>
                  <span style={{fontSize:9,fontWeight:700,color:barColor}}>{bajaMejor?(numVal<=meta?"✓ Bajo meta":"↑ Sobre meta"):fmtNum(pct,0)+"%"}</span>
                </div>
                <div style={{height:3,borderRadius:2,background:"var(--border)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:barColor,borderRadius:2,transition:"width .4s",boxShadow:`0 0 6px ${barColor}`}}/>
                </div>
              </div>
            );
          })()}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          {histData.length > 0 && (
            <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:28 }}>
              {histData.slice(-7).map((d, i) => (
                <div key={i} style={{ width:4, borderRadius:2, background: color || "var(--accent)", opacity:.6,
                  height: Math.max((d.val / maxVal) * 28, 2) + "px", transition:"height .3s" }} />
              ))}
            </div>
          )}
          {/* Botón para establecer meta */}
          {onSetMeta && (
            editingMeta ? (
              <div style={{display:"flex",gap:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                <input type="number" value={metaInput} onChange={e=>setMetaInput(e.target.value)}
                  style={{width:70,fontSize:11,padding:"2px 6px"}}
                  placeholder="Meta" onKeyDown={e=>{if(e.key==="Enter"){onSetMeta(parseFloat(metaInput)||0);setEditingMeta(false);}if(e.key==="Escape")setEditingMeta(false);}}
                  autoFocus />
                <button onClick={()=>{onSetMeta(parseFloat(metaInput)||0);setEditingMeta(false);}} style={{background:"var(--green)",border:"none",color:"#fff",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontSize:11}}>✓</button>
                <button onClick={()=>setEditingMeta(false)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12}}>×</button>
              </div>
            ) : (
              <button onClick={e=>{e.stopPropagation();setMetaInput(meta?String(meta):"");setEditingMeta(true);}}
                style={{background:"none",border:"1px dashed var(--border)",color:"var(--muted)",borderRadius:4,padding:"1px 6px",cursor:"pointer",fontSize:10,transition:"all .15s"}}
                title="Establecer meta diaria">
                {meta>0?"✎ meta":"+ meta"}
              </button>
            )
          )}
        </div>
      </div>
      {open && histData.length > 0 && (
        <div style={{ marginTop:12, borderTop:"1px solid var(--border)", paddingTop:12 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase" }}>
              Historial — {histData.length} días
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button className="btn btn-ghost btn-sm" onClick={exportarCSV}>⬇ CSV</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>× Cerrar</button>
            </div>
          </div>
          <div style={{ overflowX:"auto", overflowY:"visible", WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
            <svg width={Math.max(histData.length * 36, 300)} height={130} style={{ display:"block" }}>
              {histData.map((d, i) => {
                const barH = maxVal > 0 ? Math.max((d.val / maxVal) * 75, 3) : 3;
                const x = i * 36 + 4;
                const valStr = (prefix||"") + (d.val > 9999 ? (d.val/1000).toFixed(1)+"k" : fmtNum(d.val,d.val<100?2:0)) + (suffix||"");
                return (
                  <g key={i}>
                    <rect x={x} y={88 - barH} width={28} height={barH}
                      fill={color || "var(--accent)"} fillOpacity=".75" rx="3" />
                    <text x={x+14} y={112} textAnchor="middle" fontSize="8" fill="var(--muted)">
                      {d.fecha.slice(0,5)}
                    </text>
                    <text x={x+14} y={84 - barH} textAnchor="middle" fontSize="9" fill={color || "var(--accent)"} fontWeight="700">
                      {valStr}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ marginTop:8, maxHeight:120, overflowY:"auto" }}>
            <table className="tbl" style={{ fontSize:11 }}>
              <thead><tr><th>Fecha</th><th style={{ textAlign:"right" }}>{label}</th></tr></thead>
              <tbody>
                {[...histData].reverse().map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily:"var(--mono)" }}>{d.fecha}</td>
                    <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:600, color: color || "var(--text)" }}>
                      {prefix || ""}{fmtNum(d.val, 2)}{suffix || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EMBUDO APOLLO ────────────────────────────────────────────────────────────
function ApolloFunnel({ client, period, from, to, onUpdate }) {
  const allRecords = client.records || [];
  const capturaData = client.capturaConfig?.lastData || {};

  // ── Datos REALES desde el motor de KPIs ──────────────────────────────────
  const personasFB = resolverFuente("sum_resultados", allRecords, capturaData) || resolverFuente("cap_total_form", allRecords, capturaData);
  const personasWP = resolverFuente("cap_total_wp", allRecords, capturaData) || resolverFuente("sum_personas_wp", allRecords, capturaData);
  const gasto      = resolverFuente("sum_inversion", allRecords, capturaData);
  const ingreso    = resolverFuente("sum_ingreso", allRecords, capturaData);
  const ventasReal = resolverFuente("sum_ventas", allRecords, capturaData);

  // ── Config de proyección guardada en el cliente ──────────────────────────
  const proyConfig = client.apolloData?.proyeccionFunnel || {};
  const [modoProyeccion, setModoProyeccion] = useState(false);
  const [pctAsistencia, setPctAsistencia]   = useState(proyConfig.pctAsistencia ?? 10);
  const [pctConversion, setPctConversion]   = useState(proyConfig.pctConversion ?? 10);
  const [precioProducto, setPrecioProducto] = useState(proyConfig.precioProducto ?? 297);
  const [metaRoasProyec, setMetaRoasProyec] = useState(proyConfig.metaRoasProyec ?? 4);
  const [savingProyec, setSavingProyec]      = useState(false);
  const { show, el: toastEl } = useToast();

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const pctCaptura = personasFB > 0 && personasWP > 0 ? (personasWP / personasFB * 100) : 0;
  const cpaFb  = personasFB > 0 && gasto > 0 ? gasto / personasFB : 0;
  const cpaWp  = personasWP > 0 && gasto > 0 ? gasto / personasWP : 0;
  const roasReal = gasto > 0 && ingreso > 0 ? ingreso / gasto : 0;

  // Proyección
  const asistentesProyec = Math.round(personasWP * (pctAsistencia / 100));
  const ventasProyec     = Math.round(asistentesProyec * (pctConversion / 100));
  const revenueProyec    = ventasProyec * precioProducto;
  const roasProyec       = gasto > 0 ? revenueProyec / gasto : 0;
  // Inversión necesaria para alcanzar el ROAS meta con el revenue proyectado
  const inversionNecesaria = metaRoasProyec > 0 && revenueProyec > 0 ? revenueProyec / metaRoasProyec : 0;

  // Datos que muestra el embudo según el modo
  const asistentes = modoProyeccion ? asistentesProyec : Math.round(personasWP * 0.10);
  const ventas     = modoProyeccion ? ventasProyec     : ventasReal;

  async function guardarProyeccion() {
    setSavingProyec(true);
    const updated = { ...client, apolloData: { ...(client.apolloData||{}),
      proyeccionFunnel: { pctAsistencia, pctConversion, precioProducto, metaRoasProyec }
    }};
    await onUpdate(updated);
    show("✓ Proyección guardada", "ok");
    setSavingProyec(false);
  }

  const stages = [
    { label:"Personas en Facebook", sub: personasFB > 0 ? fmtNum(personasFB,0)+" registros FB" : "Registros en formulario/LP",
      val: personasFB, color:"#004AAD", topW:300, botW:240, h:56 },
    { label:"Personas en WhatsApp", sub: pctCaptura > 0 ? fmtNum(pctCaptura,1)+"% captura" : "Tasa de captura",
      val: personasWP, color:"#0066cc", topW:240, botW:180, h:48 },
    { label:"Asistentes a la clase",
      sub: modoProyeccion ? `${pctAsistencia}% de WP (proyección)` : "10% de personas en WP",
      val: asistentes, color:"#FF914D", topW:180, botW:120, h:40 },
    { label:"Ventas",
      sub: modoProyeccion ? `${pctConversion}% de asistentes (proyección)` : "Tasa de conversión",
      val: ventas > 0 ? ventas : (modoProyeccion ? ventasProyec : 0), color:"#10B981", topW:120, botW:70, h:32 },
  ];

  const svgW   = 300;
  const gap    = 4;
  const totalH = stages.reduce((a,s) => a + s.h + gap, 0) - gap;
  const cx     = svgW / 2;

  return (
    <>
      {toastEl}
      <div className="card" style={{ height:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div className="card-title" style={{ margin:0 }}>Embudo de la Misión</div>
          <div className="period-pills">
            <button className={"pill " + (!modoProyeccion ? "active" : "")} onClick={() => setModoProyeccion(false)}>📊 Real</button>
            <button className={"pill " + (modoProyeccion ? "active" : "")}
              style={modoProyeccion ? { background:"rgba(255,145,77,.2)", borderColor:"rgba(255,145,77,.4)", color:"var(--orange)" } : {}}
              onClick={() => setModoProyeccion(true)}>🎯 Proyección</button>
          </div>
        </div>

        {/* PANEL DE PROYECCIÓN */}
        {modoProyeccion && (
          <div style={{ background:"rgba(255,145,77,.06)", border:"1px solid rgba(255,145,77,.2)", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--orange)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
              Ajusta los parámetros de proyección
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>% Asistencia al evento</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" min="1" max="100" step="1" value={pctAsistencia}
                    onChange={e => setPctAsistencia(Math.min(100, Math.max(1, parseFloat(e.target.value)||10)))}
                    style={{ width:70 }} />
                  <span style={{ color:"var(--muted)", fontSize:12 }}>% de {fmtNum(personasWP,0)} WP = <strong style={{ color:"var(--orange)" }}>{asistentesProyec}</strong></span>
                </div>
              </div>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>% Conversión a ventas</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" min="1" max="100" step="0.5" value={pctConversion}
                    onChange={e => setPctConversion(Math.min(100, Math.max(0.1, parseFloat(e.target.value)||10)))}
                    style={{ width:70 }} />
                  <span style={{ color:"var(--muted)", fontSize:12 }}>% de {asistentesProyec} = <strong style={{ color:"var(--green)" }}>{ventasProyec}</strong></span>
                </div>
              </div>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>Precio del producto ($)</label>
                <input type="number" min="1" step="1" value={precioProducto}
                  onChange={e => setPrecioProducto(Math.max(1, parseFloat(e.target.value)||297))}
                  style={{ width:100 }} />
              </div>
              <div className="field" style={{ marginBottom:0 }}>
                <label style={{ fontSize:11 }}>ROAS meta</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" min="0.1" max="100" step="0.5" value={metaRoasProyec}
                    onChange={e => setMetaRoasProyec(Math.max(0.1, parseFloat(e.target.value)||4))}
                    style={{ width:70 }} />
                  <span style={{ color:"var(--muted)", fontSize:11 }}>x</span>
                </div>
              </div>
            </div>
            {/* Resumen de proyección */}
            <div style={{ marginTop:10, display:"flex", gap:16, flexWrap:"wrap", borderTop:"1px solid rgba(255,145,77,.2)", paddingTop:10 }}>
              <div style={{ fontSize:12 }}>
                <span style={{ color:"var(--muted)" }}>Revenue proyectado: </span>
                <strong style={{ color:"var(--green)", fontSize:15, fontFamily:"var(--mono)" }}>${fmtNum(revenueProyec,2)}</strong>
              </div>
              <div style={{ fontSize:12 }}>
                <span style={{ color:"var(--muted)" }}>ROAS proyectado: </span>
                <strong style={{ color: roasProyec >= metaRoasProyec ? "var(--green)" : roasProyec >= metaRoasProyec*0.7 ? "var(--amber)" : "var(--red)", fontFamily:"var(--mono)" }}>
                  {gasto > 0 ? fmtNum(roasProyec,2)+"x" : "—"}
                </strong>
                <span style={{ color:"var(--muted)", fontSize:10 }}> / meta {metaRoasProyec}x</span>
              </div>
              <div style={{ fontSize:12 }}>
                <span style={{ color:"var(--muted)" }}>CPA proyectado: </span>
                <strong style={{ fontFamily:"var(--mono)", color:"var(--accent2)" }}>
                  {ventasProyec > 0 && gasto > 0 ? "$"+fmtNum(gasto/ventasProyec,2) : "—"}
                </strong>
              </div>
              {inversionNecesaria > 0 && (
                <div style={{ fontSize:12 }}>
                  <span style={{ color:"var(--muted)" }}>Inversión para ROAS {metaRoasProyec}x: </span>
                  <strong style={{ fontFamily:"var(--mono)", color: gasto >= inversionNecesaria ? "var(--green)" : "var(--orange)" }}>
                    ${fmtNum(inversionNecesaria,2)}
                  </strong>
                  {gasto > 0 && <span style={{ fontSize:10, color:"var(--muted)" }}> (actual ${fmtNum(gasto,2)})</span>}
                </div>
              )}
              {onUpdate && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft:"auto", fontSize:11 }}
                  disabled={savingProyec} onClick={guardarProyeccion}>
                  {savingProyec ? "Guardando..." : "💾 Guardar parámetros"}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
          <svg width={svgW} height={totalH} viewBox={"0 0 "+svgW+" "+totalH} style={{ flexShrink:0, display:"block" }}>
            <defs>
              {stages.map((s,i) => (
                <linearGradient key={i} id={"afg"+i} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={s.color} stopOpacity={modoProyeccion && i >= 2 ? "0.5" : "1"} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={modoProyeccion && i >= 2 ? "0.25" : "0.55"} />
                </linearGradient>
              ))}
            </defs>
            {stages.map((s,i) => {
              const y = stages.slice(0,i).reduce((a,p) => a+p.h+gap, 0);
              const tl = cx-s.topW/2, tr = cx+s.topW/2;
              const bl = cx-s.botW/2, br = cx+s.botW/2;
              const ey = s.h*0.18;
              return (
                <g key={i}>
                  {/* Línea punteada para etapas proyectadas */}
                  <path d={"M "+tl+" "+(y+ey)+" L "+bl+" "+(y+s.h-ey*0.5)+" L "+br+" "+(y+s.h-ey*0.5)+" L "+tr+" "+(y+ey)+" Z"}
                    fill={"url(#afg"+i+")"}
                    strokeDasharray={modoProyeccion && i >= 2 ? "4 3" : "none"}
                    stroke={modoProyeccion && i >= 2 ? s.color : "none"}
                    strokeWidth={modoProyeccion && i >= 2 ? "1.5" : "0"} />
                  <ellipse cx={cx} cy={y+s.h-ey*0.5} rx={s.botW/2} ry={ey*0.6} fill={s.color} fillOpacity={modoProyeccion && i>=2 ? "0.25" : "0.5"} />
                  <ellipse cx={cx} cy={y+ey} rx={s.topW/2} ry={ey} fill={s.color} fillOpacity="0.2"
                    stroke={s.color} strokeWidth="1.5" strokeOpacity="0.7"
                    strokeDasharray={modoProyeccion && i >= 2 ? "4 3" : "none"} />
                  <text x={cx} y={y+s.h*0.52} textAnchor="middle" dominantBaseline="middle"
                    fill="#fff" fontSize={Math.max(s.h*0.28, 11)} fontWeight="800" fontFamily="var(--mono)">
                    {s.val > 0 ? s.val.toLocaleString("es-EC") : "—"}
                  </text>
                  {/* Ícono de proyección */}
                  {modoProyeccion && i >= 2 && (
                    <text x={cx+s.topW/2-10} y={y+10} fontSize="10" fill={s.color} fillOpacity="0.8">~</text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Leyenda lateral */}
          <div style={{ display:"flex", flexDirection:"column", gap:4, paddingTop:4, flex:1 }}>
            {stages.map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, minHeight:(s.h+gap)+"px" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:s.color,
                  boxShadow:"0 0 6px "+s.color, flexShrink:0,
                  opacity: modoProyeccion && i >= 2 ? 0.6 : 1 }} />
                <div>
                  <div style={{ fontWeight:700, fontSize:12, color:s.color,
                    opacity: modoProyeccion && i >= 2 ? 0.8 : 1 }}>
                    {s.label}
                    {modoProyeccion && i >= 2 && <span style={{ fontSize:9, marginLeft:4, color:"var(--orange)" }}>proyección</span>}
                  </div>
                  <div style={{ fontSize:10, color:"var(--muted)" }}>{s.sub}</div>
                </div>
              </div>
            ))}
            {/* Métricas reales */}
            <div style={{ marginTop:8, borderTop:"1px solid var(--border)", paddingTop:8, display:"flex", flexDirection:"column", gap:4 }}>
              {cpaFb > 0 && <div style={{ fontSize:11, color:"var(--muted)" }}>CPA FB: <span style={{ color:"var(--accent2)", fontWeight:700 }}>${fmtNum(cpaFb,2)}</span></div>}
              {cpaWp > 0 && <div style={{ fontSize:11, color:"var(--muted)" }}>CPA WP: <span style={{ color:"var(--accent2)", fontWeight:700 }}>${fmtNum(cpaWp,2)}</span></div>}
              {modoProyeccion
                ? <div style={{ fontSize:11, color:"var(--muted)" }}>ROAS proy: <span style={{ color: roasProyec >= metaRoasProyec ? "var(--green)" : "var(--amber)", fontWeight:700 }}>{gasto > 0 ? fmtNum(roasProyec,2)+"x" : "—"}</span></div>
                : roasReal > 0 && <div style={{ fontSize:11, color:"var(--muted)" }}>ROAS: <span style={{ color: roasReal >= (client.apolloData?.kpisApollo?.find(k=>k.id==="roas")?.meta || 4) ? "var(--green)" : "var(--amber)", fontWeight:700 }}>{fmtNum(roasReal,2)}x</span></div>}
              {gasto > 0 && <div style={{ fontSize:11, color:"var(--muted)" }}>Gasto: <span style={{ fontFamily:"var(--mono)", color:"var(--text)" }}>${fmtNum(gasto,2)}</span></div>}
              {modoProyeccion && revenueProyec > 0 && (
                <div style={{ fontSize:12, fontWeight:700, color:"var(--green)", marginTop:4, padding:"4px 8px", background:"rgba(16,185,129,.1)", borderRadius:6 }}>
                  💰 ${fmtNum(revenueProyec,2)} revenue estimado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// ─── CALENDARIO HERMES ────────────────────────────────────────────────────────
const TIPO_AGENDA = [
  { id: "grabacion",    label: "Grabacion",              cls: "cal-event-grabacion" },
  { id: "reunion",      label: "Reunion",                 cls: "cal-event-reunion"   },
  { id: "metricas",     label: "Rev. Metricas",           cls: "cal-event-metricas"  },
  // APOLLO
  { id: "despegue",     label: "🚀 Despegue de mision",   cls: "cal-event-grabacion" },
  { id: "orbita",       label: "🛸 En orbita (escala)",   cls: "cal-event-reunion"   },
  { id: "aterrizaje",   label: "🌕 Aterrizaje (ventas)",  cls: "cal-event-metricas"  },
  { id: "captacion_ap", label: "📡 Captacion activa",     cls: "cal-event-grabacion" },
  { id: "remarketing_a",label: "🔄 Remarketing",          cls: "cal-event-reunion"   },
];

// Obtener todos los eventos de todos los clientes para bloquear horas ocupadas
function getHorasOcupadas(allClients, fecha, excludeClientId) {
  const ocupadas = [];
  (allClients || []).forEach(c => {
    if (c.id === excludeClientId) return;
    const agenda = c.hermesData?.agenda || [];
    agenda.filter(e => e.fecha === fecha).forEach(e => ocupadas.push(e.hora));
  });
  return ocupadas;
}

// Generar slots de tiempo disponibles
function generarSlots(horaInicio, horaFin, horasOcupadas) {
  const slots = [];
  const [hI, mI] = horaInicio.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  let h = hI, m = mI;
  while (h < hF || (h === hF && m < mF)) {
    const slot = String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
    slots.push({ hora: slot, ocupada: horasOcupadas.includes(slot) });
    m += 60; if (m >= 60) { h += m / 60 | 0; m = m % 60; }
  }
  return slots;
}

function CalendarioPanel({ client, onUpdate, readOnly, allClients }) {
  const hermes = client.hermesData || {};
  const eventos = hermes.agenda || [];
  const disponibilidad = hermes.disponibilidad || { dias: [1,2,3,4,5], horaInicio: "09:00", horaFin: "18:00" };
  const isApollo = client.producto?.startsWith("APOLLO");
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editDisp, setEditDisp] = useState(false);
  const [localDisp, setLocalDisp] = useState(disponibilidad);
  const [form, setForm] = useState({ tipo: "reunion", titulo: "", hora: "10:00", descripcion: "", tgRecordatorio: true, esRango: false, fechaFin: "" });
  const { show, el: toastEl } = useToast();
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const hoy = new Date();
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();
  const mesNombre = mes.toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  function isDayAvailable(d) {
    const fecha = new Date(mes.getFullYear(), mes.getMonth(), d);
    return disponibilidad.dias.includes(fecha.getDay());
  }

  function getEventosDelDia(d) {
    const key = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return eventos.filter(e => {
      if (e.fecha === key) return true;
      // Eventos de rango: verificar si el día cae dentro del rango
      if (e.esRango && e.fechaFin) return key >= e.fecha && key <= e.fechaFin;
      return false;
    });
  }

  async function saveEvento() {
    if (!selectedDate || !form.titulo) return show("Completa fecha y titulo", "err");
    const evento = { ...form, id: "ev" + Date.now(), fecha: selectedDate };
    const updated = { ...client, hermesData: { ...hermes, agenda: [...eventos, evento] } };
    await onUpdate(updated);

    // Programar mensajes de Telegram si está configurado
    if (form.tgRecordatorio && client.tgConfig?.token && client.tgConfig?.chatId) {
      const tipoLabel = TIPO_AGENDA.find(t => t.id === form.tipo)?.label || form.tipo;
      const msg1 = `📅 *${tipoLabel} agendada — ${client.name}*\n\nFecha: ${selectedDate}\nHora: ${form.hora}\n${form.descripcion ? "\n" + form.descripcion : ""}\n\n_Confirmacion de agenda · Trafficker Pro_`;
      try {
        await fetch(`https://api.telegram.org/bot${client.tgConfig.token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: client.tgConfig.chatId, text: msg1, parse_mode: "Markdown" })
        });
        show("✓ Evento guardado y confirmacion enviada por Telegram", "ok");
      } catch { show("✓ Evento guardado (Telegram no disponible)", "ok"); }
    } else {
      show("✓ Evento agendado", "ok");
    }
    setShowForm(false);
    setForm({ tipo: "reunion", titulo: "", hora: "10:00", descripcion: "", tgRecordatorio: true });
  }

  async function deleteEvento(id) {
    const updated = { ...client, hermesData: { ...hermes, agenda: eventos.filter(e => e.id !== id) } };
    await onUpdate(updated);
  }

  async function saveDisp() {
    const updated = { ...client, hermesData: { ...hermes, disponibilidad: localDisp } };
    await onUpdate(updated);
    setEditDisp(false);
    show("✓ Disponibilidad guardada", "ok");
  }

  const cells = [];
  for (let i = 0; i < primerDia; i++) cells.push(null);
  for (let d = 1; d <= diasMes; d++) cells.push(d);

  return (
    <>
      {toastEl}
      <div>
        {/* DISPONIBILIDAD - solo admin */}
        {!readOnly && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editDisp ? 12 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Disponibilidad: {disponibilidad.dias.map(d => DIAS_SEMANA.find(x => x.key === d)?.label).join(", ")} · {disponibilidad.horaInicio} - {disponibilidad.horaFin}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {editDisp
                  ? <><button className="btn btn-green btn-sm" onClick={saveDisp}>Guardar</button><button className="btn btn-ghost btn-sm" onClick={() => setEditDisp(false)}>Cancelar</button></>
                  : <button className="btn btn-ghost btn-sm" onClick={() => setEditDisp(true)}>✏️ Editar</button>}
              </div>
            </div>
            {editDisp && (
              <div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Dias disponibles</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {DIAS_SEMANA.map(d => (
                      <div key={d.key} className={"fb-chip " + (localDisp.dias.includes(d.key) ? "active" : "")}
                        onClick={() => setLocalDisp(p => ({ ...p, dias: p.dias.includes(d.key) ? p.dias.filter(x => x !== d.key) : [...p.dias, d.key].sort() }))}>
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="field"><label>Hora inicio</label><input type="time" value={localDisp.horaInicio} onChange={e => setLocalDisp(p => ({ ...p, horaInicio: e.target.value }))} /></div>
                  <div className="field"><label>Hora fin</label><input type="time" value={localDisp.horaFin} onChange={e => setLocalDisp(p => ({ ...p, horaFin: e.target.value }))} /></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CALENDARIO */}
        <div className="cal-wrap">
          <div className="cal-header">
            <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}>‹</button>
            <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{mesNombre}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>›</button>
          </div>
          <div className="cal-grid">
            {["Dom","Lun","Mar","Mie","Jue","Vie","Sab"].map(d => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={"empty-"+i} className="cal-cell disabled" />;
              const fechaStr = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const esHoy = d === hoy.getDate() && mes.getMonth() === hoy.getMonth() && mes.getFullYear() === hoy.getFullYear();
              const disponible = isDayAvailable(d);
              const evs = getEventosDelDia(d);
              // Para el cliente: puede agendar en días disponibles
              const puedeAgendar = disponible;
              return (
                <div key={d} className={"cal-cell " + (esHoy ? "today " : "") + (disponible ? "available " : "")}
                  onClick={() => { if (puedeAgendar) { setSelectedDate(fechaStr); setShowForm(true); } }}>
                  <div className={"cal-day " + (esHoy ? "today-num" : "")}>{d}</div>
                  {evs.map(ev => {
                    const tipo = TIPO_AGENDA.find(t => t.id === ev.tipo);
                    return (
                      <div key={ev.id} className={"cal-event " + (tipo?.cls || "")}
                        title={ev.titulo + " " + ev.hora}
                        onClick={e => { e.stopPropagation(); if (!readOnly) deleteEvento(ev.id); }}>
                        {ev.hora} {ev.titulo}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM NUEVO EVENTO - para admin Y cliente */}
        {showForm && (
          <div className="card" style={{ marginTop: "1rem", borderColor: "rgba(0,74,173,.4)" }}>
            <div className="card-title">{readOnly ? "Solicitar cita" : "Nueva cita"} — {selectedDate}</div>
            {(() => {
              const horasOcupadas = getHorasOcupadas(allClients, selectedDate, client.id);
              const slots = generarSlots(disponibilidad.horaInicio, disponibilidad.horaFin, horasOcupadas);
              return (
                <div>
                  {readOnly ? (
                    // VISTA CLIENTE: selector visual de horarios
                    <div className="field" style={{ marginBottom: "1rem" }}>
                      <label>Selecciona un horario disponible</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {slots.map(s => (
                          <button key={s.hora}
                            className={"btn " + (s.ocupada ? "btn-danger" : form.hora === s.hora ? "btn-primary" : "btn-ghost") + " btn-sm"}
                            disabled={s.ocupada}
                            style={{ opacity: s.ocupada ? 0.5 : 1, cursor: s.ocupada ? "not-allowed" : "pointer" }}
                            onClick={() => f("hora", s.hora)}>
                            {s.ocupada ? "🔴 " : form.hora === s.hora ? "✓ " : ""}{s.hora}
                          </button>
                        ))}
                      </div>
                      {slots.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>No hay horarios disponibles para este dia.</div>}
                    </div>
                  ) : (
                    // VISTA ADMIN: input de hora libre
                    <div>
                      <div className="form-row" style={{ marginBottom: 8 }}>
                        <div className="field" style={{ marginBottom: 0 }}><label>Tipo</label>
                          <select value={form.tipo} onChange={e => f("tipo", e.target.value)}>
                            <optgroup label="General">
                              {TIPO_AGENDA.filter(t => !["despegue","orbita","aterrizaje","captacion_ap","remarketing_a"].includes(t.id)).map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </optgroup>
                            {isApollo && <optgroup label="🚀 APOLLO - Misión">
                              {TIPO_AGENDA.filter(t => ["despegue","orbita","aterrizaje","captacion_ap","remarketing_a"].includes(t.id)).map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </optgroup>}
                          </select>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}><label>Hora</label>
                          <input type="time" value={form.hora} onChange={e => f("hora", e.target.value)}
                            min={disponibilidad.horaInicio} max={disponibilidad.horaFin} />
                        </div>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", marginBottom: 8 }}>
                        <input type="checkbox" checked={form.esRango || false} onChange={e => f("esRango", e.target.checked)} style={{ width: 14, height: 14 }} />
                        Actividad de múltiples días (rango de fechas)
                      </label>
                      {form.esRango && (
                        <div className="form-row" style={{ marginBottom: 8 }}>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label>Fecha inicio</label>
                            <input type="date" value={selectedDate} readOnly style={{ background: "var(--surface2)" }} />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label>Fecha fin</label>
                            <input type="date" value={form.fechaFin || ""} onChange={e => f("fechaFin", e.target.value)} min={selectedDate} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="field"><label>{readOnly ? "Motivo de la reunion" : "Titulo / Descripcion"}</label>
                    <input type="text" value={form.titulo} onChange={e => f("titulo", e.target.value)}
                      placeholder={readOnly ? "Ej: Reunion de seguimiento" : "Ej: Reunion de onboarding"} />
                  </div>
                  {!readOnly && (
                    <>
                      <div className="field"><label>Notas para el cliente (opcional)</label>
                        <textarea value={form.descripcion} onChange={e => f("descripcion", e.target.value)}
                          placeholder="Que debe tener a mano, donde sera, link de Meet..." style={{ minHeight: 60 }} />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: "1rem" }}>
                        <input type="checkbox" checked={form.tgRecordatorio} onChange={e => f("tgRecordatorio", e.target.checked)} style={{ width: 15, height: 15 }} />
                        Enviar confirmacion por Telegram al cliente
                      </label>
                    </>
                  )}
                  {readOnly && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: "1rem", background: "var(--surface2)", padding: "8px 12px", borderRadius: 8 }}>
                      📲 Se enviara confirmacion por Telegram cuando tu solicitud sea procesada.
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" disabled={!form.hora || !form.titulo} onClick={saveEvento}>
                      {readOnly ? "Solicitar cita" : "Agendar"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* LISTA DE EVENTOS */}
        {eventos.length > 0 && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <div className="card-title">Proximas citas</div>
            {[...eventos].sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora)).filter(e => e.fecha >= hoy.toISOString().slice(0,10)).map(ev => {
              const tipo = TIPO_AGENDA.find(t => t.id === ev.tipo);
              return (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className={"cal-event " + (tipo?.cls || "")} style={{ padding: "2px 8px" }}>{tipo?.label}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.titulo}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(ev.fecha)} · {ev.hora}</div>
                  </div>
                  {!readOnly && <button className="btn btn-danger btn-sm" onClick={() => deleteEvento(ev.id)}>×</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── VISTA HERMES ADMIN ───────────────────────────────────────────────────────
// FaseItem — componente separado para evitar useState ilegal dentro de .map()
function FaseItem({ fase, client, onUpdate }) {
  const [open, setOpen] = useState(false);
  const checklist = client.checklist || {};
  const done = fase.tareas.filter(t => checklist[fase.id]?.[t]).length;
  return (
    <div style={{ background: "var(--surface2)", borderRadius: 10, marginBottom: ".75rem", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 16 }}>{fase.icono}</span>
        <div style={{ fontWeight: 600, flex: 1 }}>{fase.nombre}</div>
        <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--bg)", padding: "2px 8px", borderRadius: 10 }}>Dias {fase.dias}</span>
        <span style={{ fontSize: 11, color: done === fase.tareas.length ? "var(--green)" : "var(--muted)" }}>{done}/{fase.tareas.length}</span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          {fase.tareas.map(tarea => {
            const checked = !!(checklist[fase.id]?.[tarea]);
            return (
              <div key={tarea} className={"check-item" + (checked ? " done" : "")}
                onClick={() => onUpdate({ ...client, checklist: { ...checklist, [fase.id]: { ...(checklist[fase.id]||{}), [tarea]: !checked } } })}>
                <input type="checkbox" checked={checked} readOnly />
                <span>{tarea}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HermesAdminView({ client, allClients, onUpdate }) {
  const isApollo = client.producto?.startsWith("APOLLO");
  const [subTab, setSubTab] = useState("dashboard");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const subTabs = isApollo
    ? [["dashboard","🚀 Dashboard"],["biblioteca","🎬 Biblioteca"],["calendario","📅 Mision"],["fases","📋 Fases"]]
    : [["dashboard","✦ Dashboard"],["biblioteca","🎬 Biblioteca"],["calendario","📅 Calendario"],["fases","📋 Fases"]];

  const fases = isApollo ? APOLLO_FASES : HERMES_FASES;

  return (
    <div>
      <HermesProgressBar client={client} onUpdate={onUpdate} readOnly={false} />
      <div className="tab-row" style={{ marginBottom: "1rem" }}>
        {subTabs.map(([id, lbl]) => (
          <button key={id} className={"tab " + (subTab === id ? "active" : "")} onClick={() => setSubTab(id)}>{lbl}</button>
        ))}
      </div>

      {subTab === "dashboard" && (
        <div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          {isApollo && <SemaforoMision client={client} />}
          <div className="grid2" style={{ alignItems: "start" }}>
            <HermesKpisPanel client={client} onUpdate={onUpdate} readOnly={false} isApollo={isApollo} />
            {isApollo
              ? <ApolloFunnel client={client} period={period} from={from} to={to} onUpdate={onUpdate} />
              : <HermesFunnel client={client} period={period} from={from} to={to} />}
          </div>
        </div>
      )}

      {subTab === "biblioteca" && <BibliotecaPanel client={client} onUpdate={onUpdate} readOnly={false} />}
      {subTab === "calendario" && <CalendarioPanel client={client} onUpdate={onUpdate} readOnly={false} allClients={allClients} />}

      {subTab === "fases" && (
        <div>
          {fases.map(fase => (
            <FaseItem key={fase.id} fase={fase} client={client} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VISTA HERMES CLIENTE ─────────────────────────────────────────────────────

// Sub-componente del dashboard APOLLO — evita IIFE en JSX
function ApolloMetricasPanel({ client, period, from, to, onUpdate, configKey = "cliente" }) {
  // configKey = "cliente" → claves tarjetas/metas (vista cliente)
  // configKey = "admin"   → claves tarjetas_admin/metas_admin (vista admin, independiente)
  const TARJETAS_KEY = configKey === "admin" ? "tarjetas_admin" : "tarjetas";
  const METAS_KEY    = configKey === "admin" ? "metas_admin"    : "metas";
  const rows = filterByPeriod(client.records || [], period, from, to);
  const allRows = client.records || [];
  const inv = rows.reduce((a,r) => a+(parseFloat(r.inversion)||0), 0);
  const alc = rows.reduce((a,r) => a+(parseFloat(r.alcance)||0), 0);
  const cpm = rows.length ? rows.reduce((a,r) => a+(parseFloat(r.cpm)||0), 0)/rows.length : 0;
  const forms = rows.reduce((a,r) => a+(parseFloat(r.resultados)||parseFloat(r.formularios)||0), 0);
  const wpPersons = client.capturaConfig?.lastData?.total_wp || rows.reduce((a,r) => a+(parseFloat(r.personas_wp)||0), 0);
  const cpl = forms > 0 && inv > 0 ? inv/forms : 0;
  const ventas = rows.reduce((a,r) => a+(parseFloat(r.ventas)||0), 0);
  const ingreso = rows.reduce((a,r) => a+(parseFloat(r.ingreso)||0), 0);
  const roas = inv > 0 && ingreso > 0 ? ingreso/inv : 0;
  const pctCap = forms > 0 && wpPersons > 0 ? (wpPersons/forms*100) : 0;
  const capturaData = client.capturaConfig?.lastData;
  const remarketing = capturaData?.total_remarketing || 0;

  // ── Personalización de tarjetas ───────────────────────────────────────────
  const TARJETAS_DEFAULT = ["inversion","alcance","cpm","roas","formularios","cpl","ventas","ingreso"];
  const [tarjetasConfig, setTarjetasConfig] = useState(() => client.metricasConfig?.[TARJETAS_KEY] || TARJETAS_DEFAULT);
  const [editandoTarjetas, setEditandoTarjetas] = useState(false);
  const [showCorte, setShowCorte] = useState(false);

  // ── Metas diarias por tarjeta ─────────────────────────────────────────────
  const [metasConfig, setMetasConfig] = useState(() => client.metricasConfig?.[METAS_KEY] || {});

  async function guardarMeta(id, valor) {
    const nuevasMetas = { ...metasConfig, [id]: valor };
    setMetasConfig(nuevasMetas);
    const newCfg = { ...(client.metricasConfig||{}), [METAS_KEY]: nuevasMetas };
    if (onUpdate) {
      await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method:"PATCH", headers:{...H, Prefer:"return=minimal"},
        body: JSON.stringify({ metricasConfig: newCfg })
      });
      client.metricasConfig = newCfg;
    }
  }

  async function guardarConfigTarjetas(nuevas) {
    setTarjetasConfig(nuevas);
    if (onUpdate) {
      await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method:"PATCH", headers:{...H, Prefer:"return=minimal"},
        body: JSON.stringify({ metricasConfig: { ...(client.metricasConfig||{}), [TARJETAS_KEY]: nuevas } })
      });
      client.metricasConfig = { ...(client.metricasConfig||{}), [TARJETAS_KEY]: nuevas };
    }
  }

  function moverTarjeta(id, dir) {
    const arr = [...tarjetasConfig];
    const i = arr.indexOf(id);
    if (i < 0) return;
    if (dir === "up" && i > 0) [arr[i-1], arr[i]] = [arr[i], arr[i-1]];
    if (dir === "down" && i < arr.length-1) [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
    guardarConfigTarjetas(arr);
  }

  function toggleTarjeta(id) {
    const arr = tarjetasConfig.includes(id)
      ? tarjetasConfig.filter(t=>t!==id)
      : [...tarjetasConfig, id];
    guardarConfigTarjetas(arr);
  }

  const TODAS_TARJETAS = [
    { id:"inversion",   label:"Inversión",         val:"$"+fmtNum(inv,2),              color:"var(--text)",     campo:"inversion",  prefix:"$" },
    { id:"alcance",     label:"Alcance",            val:fmtNum(alc),                    color:"var(--text)",     campo:"alcance" },
    { id:"cpm",         label:"CPM",                val:"$"+fmtNum(cpm,2),              color:"var(--text)",     campo:"cpm",        prefix:"$" },
    { id:"roas",        label:"ROAS",               val:roas>0?fmtNum(roas,2)+"x":"0,00x", color:roas>=4?"var(--green)":roas>=2?"var(--amber)":"#4d9fff", campo:"roas", suffix:"x" },
    { id:"formularios", label:"Formularios/Leads FB", val:fmtNum(forms),               color:"var(--accent2)",  campo:"resultados" },
    { id:"cpl",         label:"Costo x Lead",       val:cpl>0?"$"+fmtNum(cpl,2):"—",   color:"var(--text)",     campo:"cpa",        prefix:"$" },
    { id:"ventas",      label:"Ventas",             val:fmtNum(ventas),                 color:"var(--text)",     campo:"ventas" },
    { id:"ingreso",     label:"Ingresos",           val:"$"+fmtNum(ingreso,2),          color:ingreso>0?"var(--green)":"#4d9fff", campo:"ingreso", prefix:"$" },
    { id:"personas_wp", label:"Personas WP",        val:fmtNum(wpPersons),              color:"var(--green)",    campo:"personas_wp" },
    { id:"pct_captura", label:"% Captura FB→WP",    val:pctCap>0?fmtNum(pctCap,1)+"%":"—", color:pctCap>=70?"var(--green)":pctCap>=50?"var(--amber)":"var(--red)", campo:"pct_captura_wp" },
    { id:"remarketing", label:"Para remarketing",   val:fmtNum(remarketing),            color:"var(--orange)",   campo:"personas_wp" },
  ];

  const tarjetasVisibles = tarjetasConfig
    .map(id => TODAS_TARJETAS.find(t=>t.id===id))
    .filter(Boolean);

  // ── Corte del día ─────────────────────────────────────────────────────────
  const hoy = new Date().toISOString().slice(0,10);
  const diasTranscurridos = allRows.length;
  const invPromDia  = diasTranscurridos > 0 ? inv/diasTranscurridos : 0;
  const leadsPromDia = diasTranscurridos > 0 ? forms/diasTranscurridos : 0;

  // Estado para datos en vivo de FB
  const [corteFB, setCorteFB]       = useState(null);   // { inv, leads, alcance, cpm, ctr, cpc }
  const [corteLoading, setCorteLoading] = useState(false);
  const [corteError, setCorteError] = useState(null);

  async function fetchCorteHoy() {
    const { token, cuentas: _cuentas } = client.fbConfig || {};
  const adAccountId = (_cuentas?.[0]?.adAccountId) || client.fbConfig?.adAccountId || "";
    if (!token || !adAccountId) {
      setCorteError("Sin credenciales de Facebook configuradas.");
      return;
    }
    setCorteLoading(true);
    setCorteError(null);
    setCorteFB(null);
    try {
      const fields = "spend,actions,impressions,reach,cpm,ctr,cpc,date_start";
      const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=${fields}&time_range={"since":"${hoy}","until":"${hoy}"}&level=account&access_token=${token}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.error) { setCorteError("FB: " + json.error.message); setCorteLoading(false); return; }
      if (!json.data?.length) { setCorteError("Sin datos en Facebook para hoy todavía."); setCorteLoading(false); return; }
      const d   = json.data[0];
      const inv = parseFloat(d.spend) || 0;
      const la  = (d.actions||[]).find(a => a.action_type==="lead" || a.action_type==="onsite_conversion.lead_grouped");
      const leads = la ? parseFloat(la.value) : 0;
      const alcance = parseFloat(d.reach) || 0;
      const impr    = parseFloat(d.impressions) || 0;
      const cpm  = parseFloat(d.cpm) || 0;
      const ctr  = parseFloat(d.ctr) || 0;
      const cpc  = parseFloat(d.cpc) || 0;
      setCorteFB({ inv, leads, alcance, impr, cpm, ctr, cpc,
        cpl: inv > 0 && leads > 0 ? inv/leads : 0,
        hora: new Date().toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"})
      });
    } catch(e) {
      setCorteError("Error de red: " + e.message);
    }
    setCorteLoading(false);
  }

  // Lanzar fetch al abrir el panel
  function abrirCorte() {
    setShowCorte(v => {
      if (!v) fetchCorteHoy(); // solo fetch al abrir
      return !v;
    });
  }

  return (
    <div>
      {/* Barra de acciones */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:11, color:"var(--muted)" }}>
          {tarjetasVisibles.length} tarjetas visibles
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={abrirCorte}>
            📊 Corte del día
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={()=>setEditandoTarjetas(v=>!v)}>
            ⚙️ {editandoTarjetas?"Listo":"Personalizar"}
          </button>
        </div>
      </div>

      {/* Panel de personalización */}
      {editandoTarjetas && (
        <div className="card" style={{ marginBottom:"1rem", padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Selecciona y ordena las tarjetas que quieres ver</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {TODAS_TARJETAS.map(t => {
              const activa = tarjetasConfig.includes(t.id);
              const idx = tarjetasConfig.indexOf(t.id);
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, border:`1px solid ${activa?"var(--accent)":"var(--border)"}`, background:activa?"rgba(77,159,255,.1)":"transparent", cursor:"pointer" }}
                  onClick={()=>toggleTarjeta(t.id)}>
                  <span style={{ fontSize:12, color:activa?"var(--accent)":"var(--muted)" }}>{t.label}</span>
                  {activa && (
                    <span style={{ display:"flex", gap:2, marginLeft:4 }}>
                      <span onClick={e=>{e.stopPropagation();moverTarjeta(t.id,"up");}} style={{ cursor:"pointer", color:"var(--muted)", fontSize:10, padding:"0 2px" }}>↑</span>
                      <span onClick={e=>{e.stopPropagation();moverTarjeta(t.id,"down");}} style={{ cursor:"pointer", color:"var(--muted)", fontSize:10, padding:"0 2px" }}>↓</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Corte del día — datos en vivo de Facebook */}
      {showCorte && (
        <div className="card" style={{ marginBottom:"1rem", padding:"16px 20px", background:"rgba(0,74,173,.05)", borderColor:"rgba(0,74,173,.2)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>📊 Corte del día — {fmtDate(hoy)}</div>
              {corteFB && <span style={{ fontSize:10, color:"var(--muted)" }}>Actualizado {corteFB.hora} · Facebook Ads en vivo</span>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
                onClick={fetchCorteHoy} disabled={corteLoading}>
                {corteLoading ? "⟳" : "🔄 Actualizar"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowCorte(false)}>×</button>
            </div>
          </div>

          {/* Estado de carga */}
          {corteLoading && (
            <div style={{ textAlign:"center", padding:"1.5rem", color:"var(--muted)", fontSize:13 }}>
              <div style={{ fontSize:20, marginBottom:8 }}>⟳</div>
              Consultando Facebook Ads...
            </div>
          )}

          {/* Error */}
          {corteError && !corteLoading && (
            <div style={{ textAlign:"center", padding:"1rem", color:"var(--amber)", fontSize:13, background:"rgba(255,170,0,.06)", borderRadius:8 }}>
              ⚠️ {corteError}
            </div>
          )}

          {/* Datos en vivo */}
          {corteFB && !corteLoading && (() => {
            const cplVsAcum = corteFB.cpl > 0 && cpl > 0 ? ((corteFB.cpl - cpl) / cpl * 100) : null;
            const invVsProm = invPromDia > 0 ? ((corteFB.inv - invPromDia) / invPromDia * 100) : null;
            const leadsVsProm = leadsPromDia > 0 ? ((corteFB.leads - leadsPromDia) / leadsPromDia * 100) : null;
            return (
              <>
                {/* Fila principal — métricas del día */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
                  {[
                    {
                      lbl:"Inversión hoy", val:"$"+fmtNum(corteFB.inv,2),
                      sub: invVsProm!==null ? `${invVsProm>0?"+":""}${fmtNum(invVsProm,1)}% vs prom $${fmtNum(invPromDia,2)}` : `Prom/día: $${fmtNum(invPromDia,2)}`,
                      color: invVsProm!==null ? (Math.abs(invVsProm)<15?"var(--green)":"var(--amber)") : "var(--green)"
                    },
                    {
                      lbl:"Leads hoy", val: corteFB.leads > 0 ? fmtNum(corteFB.leads) : "Sin leads aún",
                      sub: leadsVsProm!==null ? `${leadsVsProm>0?"+":""}${fmtNum(leadsVsProm,1)}% vs prom ${fmtNum(leadsPromDia,0)}` : `Prom/día: ${fmtNum(leadsPromDia,0)}`,
                      color: corteFB.leads > 0 ? (leadsVsProm===null||leadsVsProm>=-10?"var(--green)":"var(--amber)") : "var(--amber)"
                    },
                    {
                      lbl:"CPL hoy", val: corteFB.cpl > 0 ? "$"+fmtNum(corteFB.cpl,2) : "—",
                      sub: cplVsAcum!==null ? `${cplVsAcum>0?"▲":"▼"} ${Math.abs(cplVsAcum).toFixed(1)}% vs CPL acum $${fmtNum(cpl,2)}` : cpl>0?`CPL acum: $${fmtNum(cpl,2)}`:"",
                      color: corteFB.cpl>0 ? (cplVsAcum===null||cplVsAcum<=5?"var(--green)":cplVsAcum<=15?"var(--amber)":"var(--red)") : "var(--muted)"
                    },
                  ].map(({lbl,val,sub,color},i) => (
                    <div key={i} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"var(--muted)", marginBottom:4 }}>{lbl}</div>
                      <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:18, color }}>{val}</div>
                      {sub && <div style={{ fontSize:10, color:"var(--muted)", marginTop:3 }}>{sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Divisor */}
                <div style={{ borderTop:"1px solid var(--border)", marginBottom:14 }}/>

                {/* Fila secundaria — alcance, CPM, CTR + acumulados */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[
                    corteFB.alcance>0 && { lbl:"Alcance hoy",      val:fmtNum(corteFB.alcance),        color:"var(--text)" },
                    corteFB.cpm>0    && { lbl:"CPM hoy",           val:"$"+fmtNum(corteFB.cpm,2),      color:"var(--text)" },
                    corteFB.ctr>0    && { lbl:"CTR hoy",           val:fmtNum(corteFB.ctr,2)+"%",      color:"var(--text)" },
                    { lbl:"Acumulado inversión", val:"$"+fmtNum(inv,2),  color:"var(--text)", sub:diasTranscurridos+" días" },
                    { lbl:"Acumulado leads",     val:fmtNum(forms),      color:"var(--accent2)", sub:cpl>0?"CPL acum: $"+fmtNum(cpl,2):"" },
                    pctCap>0 && { lbl:"% Captura FB→WP",  val:fmtNum(pctCap,1)+"%", color:pctCap>=70?"var(--green)":pctCap>=50?"var(--amber)":"var(--red)", sub:wpPersons>0?fmtNum(wpPersons)+" en WP":"" },
                  ].filter(Boolean).map((item,i) => (
                    <div key={i} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"var(--muted)", marginBottom:2 }}>{item.lbl}</div>
                      <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:14, color:item.color }}>{item.val}</div>
                      {item.sub && <div style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Sin FB config — mostrar datos del registro guardado como fallback */}
          {!corteFB && !corteLoading && !corteError && (
            <div style={{ textAlign:"center", padding:"1rem", color:"var(--muted)", fontSize:12 }}>
              Abriendo...
            </div>
          )}
        </div>
      )}

      {/* Tarjetas personalizadas */}
      <div className="grid4" style={{ marginBottom:"0.5rem" }}>
        {tarjetasVisibles.slice(0,4).map(t=>(
          <MetricaCard key={t.id} label={t.label} value={t.val} color={t.color} records={allRows} campo={t.campo} prefix={t.prefix} suffix={t.suffix}
            meta={metasConfig[t.id]||0} onSetMeta={onUpdate?(v=>guardarMeta(t.id,v)):null} />
        ))}
      </div>
      {tarjetasVisibles.length > 4 && (
        <div className="grid4" style={{ marginBottom:"0.5rem" }}>
          {tarjetasVisibles.slice(4,8).map(t=>(
            <MetricaCard key={t.id} label={t.label} value={t.val} color={t.color} records={allRows} campo={t.campo} prefix={t.prefix} suffix={t.suffix}
              meta={metasConfig[t.id]||0} onSetMeta={onUpdate?(v=>guardarMeta(t.id,v)):null} />
          ))}
        </div>
      )}
      {tarjetasVisibles.length > 8 && (
        <div className="grid4" style={{ marginBottom:"1rem" }}>
          {tarjetasVisibles.slice(8).map(t=>(
            <MetricaCard key={t.id} label={t.label} value={t.val} color={t.color} records={allRows} campo={t.campo} prefix={t.prefix} suffix={t.suffix}
              meta={metasConfig[t.id]||0} onSetMeta={onUpdate?(v=>guardarMeta(t.id,v)):null} />
          ))}
        </div>
      )}
    </div>
  );
}

// Tabla de métricas diarias para el cliente — componente separado para evitar IIFEs
function ClientMetricasTable({ client, period, from, to, onUpdate }) {
  const isApollo = client.producto?.startsWith("APOLLO");
  const { cols: rawCols, toggle } = useColPrefs(client, client.niche === "whatsapp", client.niche === "web");
  const cols = isApollo
    ? [...new Set([...rawCols, "personas_wp", "costo_wp", "pct_captura_wp"])]
    : rawCols;
  const rows = filterByPeriod(client.records || [], period, from, to).sort((a,b) => a.date.localeCompare(b.date));
  const vis = ALL_COLUMNS.filter(c => cols.includes(c.key));
  const [hovRow, setHovRow] = useState(null);

  // ── Calcular valor de celda (reutilizable para tabla y tooltip) ───────────
  function getCellVal(r, c) {
    if (c.key === "date") return fmtDate(r.date);
    if (c.key === "costo_wp") { const wp=parseFloat(r.personas_wp)||0,inv=parseFloat(r.inversion)||0; return wp>0&&inv>0?"$"+fmtNum(inv/wp,2):"—"; }
    if (c.key === "pct_captura_wp") { const wp=parseFloat(r.personas_wp)||0,fb=parseFloat(r.formularios||r.resultados||r.clientesPotenciales)||0; return wp>0&&fb>0?fmtNum(wp/fb*100,1)+"%":"—"; }
    if (c.key === "cpa") { const res=parseFloat(r.resultados||r.formularios)||0,inv=parseFloat(r.inversion)||0; return res>0&&inv>0?"$"+fmtNum(inv/res,2):"—"; }
    const v = parseFloat(r[c.key]); return isNaN(v) ? "—" : (c.prefix||"") + fmtNum(v, c.prefix||c.suffix?2:0) + (c.suffix||"");
  }

  // ── Tooltip con datos extendidos del día ──────────────────────────────────
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  function RowTooltip({ r }) {
    const inv = parseFloat(r.inversion)||0;
    const leads = parseFloat(r.resultados||r.formularios||r.leads)||0;
    const ventas = parseFloat(r.ventas)||0;
    const ingreso = parseFloat(r.ingreso)||0;
    const alcance = parseFloat(r.alcance)||0;
    const cpl = leads>0&&inv>0 ? inv/leads : 0;
    const roas = inv>0&&ingreso>0 ? ingreso/inv : 0;
    const tasaCierre = leads>0&&ventas>0 ? (ventas/leads*100) : 0;
    const idx = rows.findIndex(x=>x===r);
    const prev = idx > 0 ? rows[idx-1] : null;
    const prevCpl = prev ? (()=>{ const pi=parseFloat(prev.inversion)||0,pl=parseFloat(prev.resultados||prev.formularios||prev.leads)||0; return pl>0&&pi>0?pi/pl:0; })() : 0;
    const cplDelta = cpl>0&&prevCpl>0 ? ((cpl-prevCpl)/prevCpl*100) : null;
    const anotaciones = (client.cplAnotaciones||[]).filter(a=>a.fecha===r.date);
    // Posición fija: aparece a la derecha del cursor, ajustada para no salirse de pantalla
    const TW = 260, TH = 180;
    const left = Math.min(tooltipPos.x + 12, (typeof window !== "undefined" ? window.innerWidth : 1200) - TW - 16);
    const top  = Math.max(tooltipPos.y - TH/2, 8);
    return (
      <div style={{position:"fixed", left, top, zIndex:9999,
        background:"rgba(10,15,30,.97)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",
        width:TW,boxShadow:"0 8px 32px rgba(0,0,0,.6)",pointerEvents:"none",whiteSpace:"nowrap"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--accent2)",marginBottom:8,letterSpacing:".04em"}}>{fmtDate(r.date)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",marginBottom:8}}>
          {inv>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Inversión</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>${fmtNum(inv,2)}</span></>}
          {alcance>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Alcance</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{fmtNum(alcance)}</span></>}
          {leads>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Leads/Result.</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:"var(--accent2)"}}>{fmtNum(leads)}</span></>}
          {cpl>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>CPL</span>
            <span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:cpl<(prevCpl||cpl)?"var(--green)":"var(--red)"}}>
              ${fmtNum(cpl,2)}{cplDelta!==null&&<span style={{fontSize:9,marginLeft:3}}>{cplDelta<0?"▼":"▲"}{Math.abs(cplDelta).toFixed(1)}%</span>}
            </span></>}
          {ventas>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Ventas</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{fmtNum(ventas)}</span></>}
          {ingreso>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Ingresos</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:"var(--green)"}}>${fmtNum(ingreso,2)}</span></>}
          {roas>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>ROAS</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right",color:roas>=3?"var(--green)":roas>=1.5?"var(--amber)":"var(--red)"}}>{fmtNum(roas,2)}x</span></>}
          {tasaCierre>0&&<><span style={{fontSize:10,color:"var(--muted)"}}>Tasa cierre</span><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{fmtNum(tasaCierre,1)}%</span></>}
        </div>
        {r.notas_dia&&<div style={{fontSize:10,color:"var(--muted)",borderTop:"1px solid var(--border)",paddingTop:6,marginTop:4}}>📝 {r.notas_dia}</div>}
        {anotaciones.length>0&&<div style={{borderTop:"1px solid var(--border)",paddingTop:6,marginTop:4}}>
          {anotaciones.map(a=><div key={a.id} style={{fontSize:10,color:"var(--amber)"}}>📌 {a.hora} — {a.texto}</div>)}
        </div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop:"1rem" }}>
      <CplTradingChart client={client} onUpdate={onUpdate} />
      {/* ── Resumen semanal automático ─────────────────────────────────────── */}
      {rows.length >= 3 && (() => {
        const allR = [...rows].sort((a,b)=>a.date.localeCompare(b.date));
        const ultimos7 = allR.slice(-7);
        const getCpl = r => { const i=parseFloat(r.inversion)||0,l=parseFloat(r.resultados||r.formularios||r.leads)||0; return i>0&&l>0?i/l:0; };
        const cpls = ultimos7.map(getCpl).filter(v=>v>0);
        if (cpls.length < 2) return null;
        const cplProm = cpls.reduce((a,v)=>a+v,0)/cpls.length;
        const mejorDia = [...ultimos7].filter(r=>getCpl(r)>0).sort((a,b)=>getCpl(a)-getCpl(b))[0];
        const peorDia = [...ultimos7].filter(r=>getCpl(r)>0).sort((a,b)=>getCpl(b)-getCpl(a))[0];
        const primera = cpls[0], ultima = cpls[cpls.length-1];
        const tendencia = ((ultima-primera)/primera*100);
        const invTotal7 = ultimos7.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
        const leadsTotal7 = ultimos7.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
        const ventasTotal7 = ultimos7.reduce((a,r)=>a+(parseFloat(r.ventas)||0),0);
        return (
          <div className="card" style={{marginTop:"1rem",padding:"14px 18px",background:"rgba(0,74,173,.04)",borderColor:"rgba(0,74,173,.15)"}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>📊 Resumen últimos {ultimos7.length} días</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
              {[
                ["Inversión total", "$"+fmtNum(invTotal7,2), "var(--text)"],
                ["Leads totales", fmtNum(leadsTotal7), "var(--accent2)"],
                ventasTotal7>0 && ["Ventas", fmtNum(ventasTotal7), "var(--green)"],
                ["CPL promedio", "$"+fmtNum(cplProm,2), "var(--text)"],
                mejorDia && ["Mejor día", fmtDate(mejorDia.date)+" · $"+fmtNum(getCpl(mejorDia),2), "var(--green)"],
                peorDia && mejorDia?.date!==peorDia?.date && ["Peor día", fmtDate(peorDia.date)+" · $"+fmtNum(getCpl(peorDia),2), "var(--red)"],
              ].filter(Boolean).map(([lbl,val,c],i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>{lbl}</div>
                  <div style={{fontSize:13,fontFamily:"var(--mono)",fontWeight:700,color:c}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {rows.length > 0 && (
        <div className="card scroll-x" style={{ marginTop:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:8 }}>
            <div className="card-title" style={{ margin:0 }}>Métricas diarias</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <ColumnSelector cols={cols} onToggle={toggle} />
              <BotonesExportar
                headers={vis.map(c => c.label)}
                rows={rows.map(r => vis.map(c => getCellVal(r,c)))}
                nombreArchivo="metricas"
              />
            </div>
          </div>
          <table className="tbl">
            <thead><tr>{vis.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} style={{position:"relative"}}
                  onMouseEnter={e=>{ setHovRow(i); setTooltipPos({x:e.clientX, y:e.clientY}); }}
                  onMouseMove={e=>setTooltipPos({x:e.clientX, y:e.clientY})}
                  onMouseLeave={()=>setHovRow(null)}>
                  {vis.map(c => (
                    <td key={c.key} style={{ fontFamily:"var(--mono)", fontSize:12 }}>
                      {getCellVal(r,c)}
                    </td>
                  ))}
                  {hovRow === i && <RowTooltip r={r} />}
                </tr>
              ))}
            </tbody>
            {rows.length > 1 && (
              <tfoot>
                <tr style={{ background:"rgba(77,159,255,.08)", fontWeight:600 }}>
                  {vis.map(c => {
                    if (c.key === "date") return <td key="date" style={{ fontSize:12, color:"var(--accent)", fontFamily:"var(--mono)" }}>TOTAL</td>;
                    if (c.key === "cpa") {
                      const res = rows.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios)||0),0);
                      const inv = rows.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
                      return <td key="cpa" style={{fontFamily:"var(--mono)",fontSize:12}}>{res&&inv?"$"+fmtNum(inv/res,2):"—"}</td>;
                    }
                    if (c.key === "costo_wp") {
                      const wp  = rows.reduce((a,r)=>a+(parseFloat(r.personas_wp)||0),0);
                      const inv = rows.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
                      return <td key="costo_wp" style={{fontFamily:"var(--mono)",fontSize:12}}>{wp&&inv?"$"+fmtNum(inv/wp,2):"—"}</td>;
                    }
                    if (c.key === "pct_captura_wp") {
                      const wp = rows.reduce((a,r)=>a+(parseFloat(r.personas_wp)||0),0);
                      const fb = rows.reduce((a,r)=>a+(parseFloat(r.formularios||r.resultados||r.clientesPotenciales)||0),0);
                      return <td key="pct_captura_wp" style={{fontFamily:"var(--mono)",fontSize:12}}>{wp&&fb?fmtNum(wp/fb*100,1)+"%":"—"}</td>;
                    }
                    const isAvg = ["cpm","cpc","ctr","roas"].includes(c.key);
                    const val = isAvg
                      ? rows.reduce((a,r)=>a+(parseFloat(r[c.key])||0),0) / rows.filter(r=>parseFloat(r[c.key])>0).length || 0
                      : rows.reduce((a,r)=>a+(parseFloat(r[c.key])||0),0);
                    if (!val) return <td key={c.key} style={{fontFamily:"var(--mono)",fontSize:12}}>—</td>;
                    return <td key={c.key} style={{fontFamily:"var(--mono)",fontSize:12}}>
                      {c.prefix||""}{fmtNum(val, c.prefix||c.suffix?2:0)}{c.suffix||""}
                    </td>;
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function HermesClientView({ client, allClients, onUpdate }) {
  const isApollo = client.producto?.startsWith("APOLLO");
  const [subTab, setSubTab] = useState("dashboard");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const clientTabs = isApollo
    ? [["dashboard","🚀 Dashboard"],["biblioteca","🎬 Contenido"],["calendario","📅 Mision"]]
    : [["dashboard","✦ Dashboard"],["biblioteca","🎬 Contenido"],["calendario","📅 Agenda"]];

  return (
    <div>
      <HermesProgressBar client={client} onUpdate={() => {}} readOnly={true} />
      <div className="tab-row" style={{ marginBottom: "1rem" }}>
        {clientTabs.map(([id, lbl]) => (
          <button key={id} className={"tab " + (subTab === id ? "active" : "")} onClick={() => setSubTab(id)}>{lbl}</button>
        ))}
      </div>
      {subTab === "dashboard" && (
        <div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          {/* Semáforo de misión — solo APOLLO */}
          {isApollo && <SemaforoMision client={client} />}

          {/* Panel de métricas rápidas — entre barra de progreso y KPIs */}
          {isApollo && <ApolloMetricasPanel client={client} period={period} from={from} to={to} onUpdate={onUpdate} />}
          <div className="grid2" style={{ alignItems: "start" }}>
            <HermesKpisPanel client={client} onUpdate={() => {}} readOnly={true} isApollo={isApollo} />
            {isApollo
              ? <ApolloFunnel client={client} period={period} from={from} to={to} onUpdate={onUpdate} />
              : <HermesFunnel client={client} period={period} from={from} to={to} />}
          </div>

          {/* Datos diarios de campañas */}
          <ClientMetricasTable client={client} period={period} from={from} to={to} onUpdate={onUpdate} />
        </div>
      )}
      {subTab === "biblioteca" && <BibliotecaPanel client={client} onUpdate={() => {}} readOnly={true} />}
      {subTab === "calendario" && <CalendarioPanel client={client} onUpdate={onUpdate} readOnly={true} allClients={allClients} />}
    </div>
  );
}


// ─── SYNC MÉTRICAS POR ANUNCIO DESDE FACEBOOK ─────────────────────────────────
async function fetchMetricasPorAnuncio(token, adAccountId, fechaInicio, fechaFin) {
  const fields = "ad_name,spend,reach,impressions,cpm,cpc,ctr,actions,cost_per_action_type,video_avg_time_watched_actions,video_p50_watched_actions,video_p100_watched_actions";
  const timeRange = JSON.stringify({ since: fechaInicio, until: fechaFin });

  let allAds = [];
  let nextUrl = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=ad&limit=500&access_token=${token}`;

  try {
    // Paginar hasta traer TODOS los anuncios
    while (nextUrl) {
      const res  = await fetch(nextUrl);
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error.message };

      const getAction = (ad, type) => {
        const a = (ad.actions || []).find(x => x.action_type === type);
        return a ? parseFloat(a.value) || 0 : 0;
      };
      const getVideo = (arr) => {
        if (!arr || !arr.length) return 0;
        return parseFloat(arr[0]?.value) || 0;
      };

      (data.data || []).forEach(ad => {
        allAds.push({
          nombre:       ad.ad_name || "",
          alcance:      parseFloat(ad.reach)       || 0,
          impresiones:  parseFloat(ad.impressions)  || 0,
          gasto:        parseFloat(ad.spend)        || 0,
          cpm:          parseFloat(ad.cpm)          || 0,
          cpc:          parseFloat(ad.cpc)          || 0,
          ctr:          parseFloat(ad.ctr)          || 0,
          leads:        getAction(ad, "lead") || getAction(ad, "onsite_conversion.lead_grouped"),
          likes:        getAction(ad, "post_reaction"),
          comentarios:  getAction(ad, "comment"),
          compartidos:  getAction(ad, "post"),
          vistas3s:     getVideo(ad.video_avg_time_watched_actions),
          vistas50:     getVideo(ad.video_p50_watched_actions),
          vistas100:    getVideo(ad.video_p100_watched_actions),
        });
      });

      // Siguiente página si existe
      nextUrl = data.paging?.next || null;
    }

    return { ok: true, ads: allAds };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// Normalizar nombre para comparación — quitar espacios extra, mayúsculas
function normalizarNombre(nombre) {
  return (nombre || "").toLowerCase().replace(/[\s_\-]+/g, " ").trim();
}

function BibliotecaPanel({ client, onUpdate, readOnly }) {
  const hermes = client.hermesData || {};
  const biblioteca = hermes.biblioteca || [];
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [sortCol, setSortCol] = useState("iv");
  const [sortDir, setSortDir] = useState("desc");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [syncDesde, setSyncDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10);
  });
  const [syncHasta, setSyncHasta] = useState(new Date().toISOString().slice(0,10));
  const [form, setForm] = useState({ nombre: "", categoria: "Valor", fechaGrabacion: "", enlaceTerabox: "", alcance_pza: "", likes: "", comentarios: "", compartidos: "", guardados: "", ctr_pza: "", retencion3s: "", retencion50: "", retencionFinal: "" });
  const { show, el: toastEl } = useToast();
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function sincronizarConFacebook() {
    const { token, cuentas: _cuentas } = client.fbConfig || {};
  const adAccountId = (_cuentas?.[0]?.adAccountId) || client.fbConfig?.adAccountId || "";
    if (!token || !adAccountId) return show("Configura Facebook Ads en la tab 📘 Facebook primero", "err");
    setSyncing(true); setSyncResult(null);
    show("⏳ Obteniendo anuncios de Facebook (puede tomar unos segundos)...", "ok");
    const result = await fetchMetricasPorAnuncio(token, adAccountId, syncDesde, syncHasta);
    if (!result.ok) { show("Error Facebook: " + result.error, "err"); setSyncing(false); return; }

    // Agrupar todos los anuncios por nombre y sumar sus métricas
    const adsPorNombre = {};
    result.ads.forEach(ad => {
      const norm = normalizarNombre(ad.nombre);
      if (!adsPorNombre[norm]) {
        adsPorNombre[norm] = { ...ad, _count: 1 };
      } else {
        const a = adsPorNombre[norm];
        a.gasto      += ad.gasto;
        a.alcance    += ad.alcance;
        a.impresiones+= ad.impresiones;
        a.leads      += ad.leads;
        a.likes      += ad.likes;
        a.comentarios+= ad.comentarios;
        a.compartidos+= ad.compartidos;
        a.vistas3s   += ad.vistas3s;
        a.vistas50   += ad.vistas50;
        a.vistas100  += ad.vistas100;
        // CTR y CPM se promedian
        a.ctr = (a.ctr * a._count + ad.ctr) / (a._count + 1);
        a.cpm = (a.cpm * a._count + ad.cpm) / (a._count + 1);
        a._count++;
      }
    });

    // Hacer match por nombre entre biblioteca y anuncios agrupados
    let actualizados = 0, noEncontrados = [];
    const newBib = biblioteca.map(pieza => {
      const normPieza = normalizarNombre(pieza.nombre);
      // Buscar match exacto primero, luego parcial
      const adSum = adsPorNombre[normPieza]
        || Object.values(adsPorNombre).find(a => normalizarNombre(a.nombre).includes(normPieza) || normPieza.includes(normalizarNombre(a.nombre)));

      if (adSum) {
        actualizados++;
        const cpl = adSum.leads > 0 && adSum.gasto > 0 ? (adSum.gasto / adSum.leads).toFixed(2) : "";
        // Siempre sobreescribir con datos frescos de Facebook — si el valor es 0 también se actualiza
        return {
          ...pieza,
          alcance_pza:    String(Math.round(adSum.alcance)),
          ctr_pza:        String(adSum.ctr.toFixed(2)),
          likes:          String(Math.round(adSum.likes)),
          comentarios:    String(Math.round(adSum.comentarios)),
          compartidos:    String(Math.round(adSum.compartidos)),
          retencion3s:    adSum.vistas3s   > 0 ? String(Math.round(adSum.vistas3s))   : pieza.retencion3s,
          retencion50:    adSum.vistas50   > 0 ? String(Math.round(adSum.vistas50))   : pieza.retencion50,
          retencionFinal: adSum.vistas100  > 0 ? String(Math.round(adSum.vistas100))  : pieza.retencionFinal,
          leads_fb:       String(Math.round(adSum.leads)),
          gasto_pza:      String(adSum.gasto.toFixed(2)),
          cpl_pza:        cpl || pieza.cpl_pza,
          fb_anuncios_n:  String(adSum._count),
          fbSyncDate:     new Date().toISOString().slice(0,10),
          fbSyncDesde:    syncDesde,
          fbSyncHasta:    syncHasta,
        };
      } else {
        noEncontrados.push(pieza.nombre);
        return pieza;
      }
    });

    await onUpdate({ ...client, hermesData: { ...hermes, biblioteca: newBib } });
    setSyncResult({ actualizados, total: result.ads.length, nombresUnicos: Object.keys(adsPorNombre).length, noEncontrados, ads: result.ads });
    setSyncing(false);
    show(`✓ ${actualizados} piezas actualizadas desde Facebook`, "ok");
  }

  function handleSort(col) { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } }

  function filtered() {
    let list = [...biblioteca];
    if (filtroCategoria !== "todas") list = list.filter(p => p.categoria === filtroCategoria);
    list.sort((a, b) => {
      let va = sortCol === "iv" ? calcIV(a, biblioteca) : (a[sortCol] || "");
      let vb = sortCol === "iv" ? calcIV(b, biblioteca) : (b[sortCol] || "");
      const na = parseFloat(va), nb = parseFloat(vb);
      const r = !isNaN(na) && !isNaN(nb) ? na - nb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? r : -r;
    });
    return list;
  }

  async function savePieza() {
    if (!form.nombre) return show("Ingresa el nombre del video", "err");
    const pieza = { ...form, id: editingId || "pza" + Date.now() };
    const newBib = editingId
      ? biblioteca.map(p => p.id === editingId ? pieza : p)
      : [...biblioteca, pieza];
    const updated = { ...client, hermesData: { ...hermes, biblioteca: newBib } };
    await onUpdate(updated);
    show("✓ Pieza guardada", "ok");
    setForm({ nombre: "", categoria: "Valor", fechaGrabacion: "", enlaceTerabox: "", alcance_pza: "", likes: "", comentarios: "", compartidos: "", guardados: "", ctr_pza: "", retencion3s: "", retencion50: "", retencionFinal: "" });
    setShowForm(false); setEditingId(null);
  }

  async function deletePieza(id) {
    if (!window.confirm("¿Eliminar esta pieza?")) return;
    const updated = { ...client, hermesData: { ...hermes, biblioteca: biblioteca.filter(p => p.id !== id) } };
    await onUpdate(updated);
  }

  function startEdit(p) { setForm({ ...p }); setEditingId(p.id); setShowForm(true); }

  function exportBiblioteca(formato) {
    const list = filtered();
    if (!list.length) return;
    const headers = ["Nombre", "Categoria", "Fecha", "Alcance", "Likes", "Comentarios", "Compartidos", "Guardados", "CTR%", "Ret.3s%", "Ret.50%", "Ret.Final%", "IV", "Clasificacion"];
    const rows = list.map(p => {
      const iv = calcIV(p, biblioteca);
      return [p.nombre, p.categoria, p.fechaGrabacion, p.alcance_pza, p.likes, p.comentarios, p.compartidos, p.guardados, p.ctr_pza, p.retencion3s, p.retencion50, p.retencionFinal, iv, getIVLabel(iv)];
    });
    const sep = formato === "csv" ? "," : "\t";
    const content = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(sep)).join("\n");
    const blob = new Blob(["\ufeff" + content], { type: formato === "csv" ? "text/csv" : "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `biblioteca_${client.name}.${formato}`; a.click();
    URL.revokeObjectURL(url);
  }

  const SortTh = ({ col, label }) => (
    <th style={{ cursor: "pointer", userSelect: "none", fontSize: 10, whiteSpace: "nowrap" }} onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </th>
  );

  const piezas = filtered();
  const avgIV = piezas.length > 0 ? (piezas.reduce((a, p) => a + calcIV(p, biblioteca), 0) / piezas.length).toFixed(0) : 0;

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Biblioteca de contenido</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {biblioteca.length} piezas · IV promedio: <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{avgIV}/100</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <BotonesExportar
              headers={["Video","Tipo","Fecha","Inversión","Alcance","Likes","Comentarios","CTR%","Leads","CPL","Ret.3s","Ret.50%","Ret.Final","IV","Estado"]}
              rows={biblioteca.map(p => [p.nombre||"",p.tipo||"",p.fechaGrabacion||"",p.gasto_pza?("$"+p.gasto_pza):"—",p.alcance_pza||0,p.likes||0,p.comentarios||0,p.ctr_pza||0,p.leads_fb||0,p.cpl_pza||"—",p.retencion3s||0,p.retencion50||0,p.retencionFinal||0,calcIV(p,biblioteca),p.estado||""])}
              nombreArchivo={"biblioteca_" + (client.name||"").replace(/\s/g,"_")}
            />
            {!readOnly && client.fbConfig?.token && (
              <button className="btn btn-sm" disabled={syncing}
                style={{ background:"rgba(0,74,173,.15)", color:"#4d9fff", border:"1px solid rgba(0,74,173,.3)" }}
                onClick={() => setShowSyncPanel(s => !s)}>
                {syncing ? "⏳ Sincronizando..." : "📘 Sync con Facebook"}
              </button>
            )}
            {!readOnly && <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(s => !s); setEditingId(null); setForm({ nombre: "", categoria: "Valor", fechaGrabacion: "", enlaceTerabox: "", alcance_pza: "", likes: "", comentarios: "", compartidos: "", guardados: "", ctr_pza: "", retencion3s: "", retencion50: "", retencionFinal: "" }); }}>
              {showForm ? "Cancelar" : "+ Añadir pieza"}
            </button>}
          </div>
        </div>

        {/* PANEL DE SYNC CON FACEBOOK */}
        {showSyncPanel && !readOnly && (
          <div className="card" style={{ borderColor:"rgba(0,74,173,.3)", marginBottom:"1rem", background:"rgba(0,74,173,.04)" }}>
            <div className="card-title">📘 Sincronizar métricas desde Facebook Ads</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:"1rem", lineHeight:1.6 }}>
              El sistema buscará cada video de la biblioteca por nombre exacto en tus anuncios de Facebook y actualizará automáticamente: <strong>Alcance, CTR, Likes, Comentarios, Compartidos, Vistas 3s, Vistas 50% y Vistas completas</strong>.
              <br/>⚠️ El nombre del video en la biblioteca debe coincidir con el nombre del anuncio en Facebook.
            </div>
            <div className="form-row" style={{ marginBottom:"1rem" }}>
              <div className="field"><label>Desde</label><input type="date" value={syncDesde} onChange={e => setSyncDesde(e.target.value)} /></div>
              <div className="field"><label>Hasta</label><input type="date" value={syncHasta} onChange={e => setSyncHasta(e.target.value)} /></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-primary btn-sm" disabled={syncing || !biblioteca.length} onClick={sincronizarConFacebook}>
                {syncing ? "⏳ Sincronizando..." : "🔄 Sincronizar ahora"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowSyncPanel(false); setSyncResult(null); }}>Cerrar</button>
            </div>

            {/* Resultado de la sincronización */}
            {syncResult && (
              <div style={{ marginTop:"1rem", borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>
                  ✅ {syncResult.actualizados} de {biblioteca.length} piezas actualizadas · {syncResult.total} anuncios sumados por nombre ({syncResult.nombresUnicos} nombres únicos)
                </div>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:8 }}>
                  Período: {syncDesde} → {syncHasta} · Datos sobreescritos con valores frescos de Facebook
                </div>
                {/* Mostrar todos los nombres disponibles en Facebook para facilitar el match */}
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>📋 Nombres encontrados en Facebook Ads ({syncResult.nombresUnicos}):</div>
                  <div style={{ maxHeight:120, overflowY:"auto", background:"var(--surface2)", borderRadius:6, padding:"6px 10px" }}>
                    {[...new Set(syncResult.ads.map(a=>a.nombre))].map((n,i) => (
                      <div key={i} style={{ fontSize:10, color:"var(--muted)", padding:"1px 0", fontFamily:"var(--mono)" }}>• {n}</div>
                    ))}
                  </div>
                </div>
                {syncResult.noEncontrados.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:"var(--amber)", marginBottom:6 }}>
                      ⚠️ {syncResult.noEncontrados.length} piezas sin match — el nombre en la biblioteca debe coincidir exactamente con el nombre del anuncio en Facebook:
                    </div>
                    {syncResult.noEncontrados.map((n,i) => (
                      <div key={i} style={{ fontSize:11, color:"var(--red)", padding:"2px 8px", background:"rgba(239,68,68,.08)", borderRadius:4, marginBottom:2 }}>
                        ❌ "{n}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showForm && !readOnly && (
          <div className="card" style={{ borderColor: "rgba(0,74,173,.4)" }}>
            <div className="card-title">{editingId ? "Editar pieza" : "Nueva pieza de contenido"}</div>
            <div className="form-row">
              <div className="field"><label>Nombre del video *</label><input type="text" value={form.nombre} onChange={e => f("nombre", e.target.value)} placeholder="Ej: Video testimonial cliente 1" /></div>
              <div className="field"><label>Categoria</label>
                <select value={form.categoria} onChange={e => f("categoria", e.target.value)}>
                  {HERMES_CATEGORIAS_CONTENIDO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Fecha de grabacion</label><input type="date" value={form.fechaGrabacion} onChange={e => f("fechaGrabacion", e.target.value)} /></div>
              <div className="field"><label>Enlace Terabox</label><input type="text" value={form.enlaceTerabox} onChange={e => f("enlaceTerabox", e.target.value)} placeholder="https://terabox.com/..." /></div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8, marginTop: 4 }}>Metricas de rendimiento</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".75rem", marginBottom: "1rem" }}>
              {[["Inversión ($)","gasto_pza"],["Alcance","alcance_pza"],["Likes","likes"],["Comentarios","comentarios"],["Compartidos","compartidos"],["Guardados","guardados"],["CTR (%)","ctr_pza"],["Leads/Registros","leads_fb"],["Vistas 3s (personas)","retencion3s"],["Vistas 50% (personas)","retencion50"],["Vistas completas (personas)","retencionFinal"],["Personas en formulario","personas_form"],["Personas en WP","personas_wp_pza"],["Calidad del lead (1-10)","calidad_lead"]].map(([lbl, fk]) => (
                <div key={fk} className="field" style={{ marginBottom: 0 }}>
                  <label>{lbl}</label>
                  <input type="number" step="any" value={form[fk] || ""} onChange={e => f(fk, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
            {form.alcance_pza && (
              <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Preview Indice de Validacion</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={"iv-badge " + getIVClass(calcIV(form, biblioteca))} style={{ fontSize: 16 }}>{calcIV(form, biblioteca)}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{getIVLabel(calcIV(form, biblioteca))}</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={savePieza}>Guardar pieza</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="period-pills">
            {["todas", ...HERMES_CATEGORIAS_CONTENIDO].map(c => (
              <button key={c} className={"pill " + (filtroCategoria === c ? "active" : "")} onClick={() => setFiltroCategoria(c)}>{c}</button>
            ))}
          </div>
        </div>

        {piezas.length === 0 && (
          <div className="empty"><div style={{ fontSize: 28, opacity: .3, marginBottom: 8 }}>🎬</div><div>Sin piezas. {!readOnly && "Añade la primera."}</div></div>
        )}

        {piezas.length > 0 && (
          <div className="card scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <SortTh col="nombre" label="Video" />
                  <SortTh col="categoria" label="Tipo" />
                  <SortTh col="fechaGrabacion" label="Fecha" />
                  <SortTh col="gasto_pza" label="Inversión" />
                  <SortTh col="alcance_pza" label="Alcance" />
                  <SortTh col="likes" label="Likes" />
                  <SortTh col="comentarios" label="Coment." />
                  <SortTh col="ctr_pza" label="CTR%" />
                  <SortTh col="leads_fb" label="Leads" />
                  <SortTh col="cpl_pza" label="CPL" />
                  <SortTh col="retencion3s" label="Ret.3s" />
                  <SortTh col="retencion50" label="Ret.50%" />
                  <SortTh col="iv" label="IV" />
                  <th>Estado</th>
                  {!readOnly && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {piezas.map(p => {
                  const iv = calcIV(p, biblioteca);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.enlaceTerabox
                          ? <a href={p.enlaceTerabox} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent2)", textDecoration: "none" }}>{p.nombre} 🔗</a>
                          : p.nombre}
                      </td>
                      <td><span className="badge" style={{ fontSize: 11, background: p.categoria === "Valor" ? "rgba(0,74,173,.15)" : p.categoria === "Viral" ? "rgba(255,222,89,.1)" : "rgba(255,145,77,.1)", color: p.categoria === "Valor" ? "#4d9fff" : p.categoria === "Viral" ? "var(--accent2)" : "var(--orange)" }}>{p.categoria}</span></td>
                      <td style={{ fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{p.fechaGrabacion ? fmtDate(p.fechaGrabacion) : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)", color: p.gasto_pza ? "var(--accent2)" : "" }}>
                        {p.gasto_pza ? "$"+fmtNum(parseFloat(p.gasto_pza),2) : "—"}
                        {p.fb_anuncios_n > 1 && <div style={{ fontSize:9, color:"var(--muted)" }}>{p.fb_anuncios_n} anuncios</div>}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.alcance_pza ? fmtNum(parseFloat(p.alcance_pza), 0) : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.likes || "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.comentarios || "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.ctr_pza ? fmtNum(parseFloat(p.ctr_pza),2)+"%" : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.leads_fb || "—"}</td>
                      <td style={{ fontFamily: "var(--mono)", color: p.cpl_pza ? "var(--green)" : "" }}>{p.cpl_pza ? "$"+fmtNum(parseFloat(p.cpl_pza),2) : p.gasto_pza && p.leads_fb ? "$"+fmtNum(parseFloat(p.gasto_pza)/parseFloat(p.leads_fb),2) : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.retencion3s ? fmtNum(parseFloat(p.retencion3s),0) : "—"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{p.retencion50 ? fmtNum(parseFloat(p.retencion50),0) : "—"}</td>
                      <td><span className={"iv-badge " + getIVClass(iv)}>{iv}</span></td>
                      <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>{getIVLabel(iv)}</td>
                      {!readOnly && <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePieza(p.id)}>×</button>
                        </div>
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


// ─── FILMMAKER MODULE ─────────────────────────────────────────────────────────

// Panel principal del Filmmaker
function FilmakerDashboard({ filmmaker, allClients, onLogout, onUpdate }) {
  const [view, setView] = useState("agenda"); // agenda | disponibilidad
  const misClientes = allClients.filter(c => c.filmakerAsignado === filmmaker.id);
  const hoy = new Date().toISOString().slice(0, 10);

  // Recopilar todas las grabaciones de sus clientes
  const grabaciones = [];
  misClientes.forEach(c => {
    (c.hermesData?.agenda || []).forEach(e => {
      if (e.tipo === "grabacion") grabaciones.push({ ...e, clientName: c.name, clientColor: c.color, clientId: c.id });
    });
  });
  const proximas = grabaciones.filter(g => g.fecha >= hoy).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-badge" style={{ background: "rgba(255,145,77,.2)", color: "var(--orange)" }}>FILMMAKER</div>
          <div className="sidebar-logo-name">{filmmaker.nombre}</div>
          <div className="sidebar-logo-role">Camarografo / Editor</div>
        </div>
        <div className="nav">
          <div className="nav-label">Vistas</div>
          {[["agenda","📅 Mi Agenda"],["disponibilidad","🗓️ Disponibilidad"]].map(([v, lbl]) => (
            <div key={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
              <div className="nav-dot" style={{ background: view === v ? "var(--orange)" : "var(--border)" }} />
              {lbl}
            </div>
          ))}
          <div className="nav-label" style={{ marginTop: 16 }}>Clientes asignados</div>
          {misClientes.map(c => (
            <div key={c.id} className="nav-item" style={{ opacity: .8 }}>
              <div className="nav-dot" style={{ background: c.color || "var(--border)" }} />{c.name}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{view === "agenda" ? "Mi Agenda de grabaciones" : "Mi Disponibilidad"}</div>
        </div>
        <div className="content">
          {view === "agenda" && (
            <div>
              <div style={{ marginBottom: "1.25rem" }}>
                <div className="sec-title">Proximas grabaciones</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{proximas.length} sesiones programadas</div>
              </div>
              {proximas.length === 0 && <div className="empty"><div style={{ fontSize: 28, opacity: .3 }}>🎬</div><div style={{ marginTop: 8 }}>Sin grabaciones proximas.</div></div>}
              {proximas.map((g, i) => (
                <div key={i} className="card" style={{ marginBottom: ".75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: (g.clientColor || "#004AAD") + "22", color: g.clientColor || "#004AAD", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {g.clientName?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.titulo || "Sesion de grabacion"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        <span style={{ color: g.clientColor || "var(--accent)" }}>{g.clientName}</span>
                        {" · "}{fmtDate(g.fecha)} a las {g.hora}
                      </div>
                      {g.descripcion && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>{g.descripcion}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: g.fecha === hoy ? "var(--green)" : "var(--muted)", fontWeight: g.fecha === hoy ? 700 : 400 }}>
                      {g.fecha === hoy ? "HOY" : fmtDate(g.fecha)}
                    </div>
                  </div>
                </div>
              ))}
              {/* Calendario visual consolidado */}
              <div style={{ marginTop: "1.5rem" }}>
                <div className="card-title">Calendario de grabaciones</div>
                <FilmakerCalendario grabaciones={grabaciones} />
              </div>
            </div>
          )}
          {view === "disponibilidad" && (
            <FilmakerDisponibilidad filmmaker={filmmaker} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
}

function FilmakerCalendario({ grabaciones }) {
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();
  const hoy = new Date();
  const mesNombre = mes.toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  function getGrabacionesDia(d) {
    const key = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return grabaciones.filter(g => g.fecha === key);
  }

  const cells = [];
  for (let i = 0; i < primerDia; i++) cells.push(null);
  for (let d = 1; d <= diasMes; d++) cells.push(d);

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}>‹</button>
        <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{mesNombre}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {["Dom","Lun","Mar","Mie","Jue","Vie","Sab"].map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={"e"+i} className="cal-cell disabled" />;
          const esHoy = d === hoy.getDate() && mes.getMonth() === hoy.getMonth() && mes.getFullYear() === hoy.getFullYear();
          const gs = getGrabacionesDia(d);
          return (
            <div key={d} className={"cal-cell " + (esHoy ? "today " : "") + (gs.length > 0 ? "available " : "")}>
              <div className={"cal-day " + (esHoy ? "today-num" : "")}>{d}</div>
              {gs.map((g, gi) => (
                <div key={gi} className="cal-event cal-event-grabacion" title={g.clientName + " · " + g.hora}>
                  🎬 {g.hora} {g.clientName}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilmakerDisponibilidad({ filmmaker, onUpdate }) {
  const disp = filmmaker.disponibilidad || { diasDisponibles: [], diasOcupados: [] };
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [local, setLocal] = useState(disp);
  const { show, el: toastEl } = useToast();
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();
  const mesNombre = mes.toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  function toggleDia(fechaStr) {
    setLocal(prev => {
      const disponibles = prev.diasDisponibles || [];
      const ocupados = prev.diasOcupados || [];
      if (disponibles.includes(fechaStr)) return { ...prev, diasDisponibles: disponibles.filter(d => d !== fechaStr), diasOcupados: [...ocupados, fechaStr] };
      if (ocupados.includes(fechaStr)) return { ...prev, diasOcupados: ocupados.filter(d => d !== fechaStr) };
      return { ...prev, diasDisponibles: [...disponibles, fechaStr] };
    });
  }

  async function save() {
    await onUpdate({ ...filmmaker, disponibilidad: local });
    show("✓ Disponibilidad actualizada", "ok");
  }

  const cells = [];
  for (let i = 0; i < primerDia; i++) cells.push(null);
  for (let d = 1; d <= diasMes; d++) cells.push(d);

  return (
    <>
      {toastEl}
      <div>
        <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
          Toca un dia para marcarlo como disponible (🟢) o no disponible (🔴). Sin marcar = sin definir.
        </div>
        <div className="cal-wrap" style={{ marginBottom: "1rem" }}>
          <div className="cal-header">
            <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}>‹</button>
            <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{mesNombre}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>›</button>
          </div>
          <div className="cal-grid">
            {["Dom","Lun","Mar","Mie","Jue","Vie","Sab"].map(d => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={"e"+i} className="cal-cell disabled" />;
              const fechaStr = `${mes.getFullYear()}-${String(mes.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const disponible = (local.diasDisponibles || []).includes(fechaStr);
              const ocupado = (local.diasOcupados || []).includes(fechaStr);
              return (
                <div key={d} className="cal-cell" style={{ cursor: "pointer", background: disponible ? "rgba(16,185,129,.1)" : ocupado ? "rgba(239,68,68,.08)" : "" }}
                  onClick={() => toggleDia(fechaStr)}>
                  <div className="cal-day">{d}</div>
                  {disponible && <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 700, textAlign: "center" }}>✓ Disp.</div>}
                  {ocupado && <div style={{ fontSize: 10, color: "var(--red)", fontWeight: 700, textAlign: "center" }}>✗ Ocup.</div>}
                </div>
              );
            })}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={save}>💾 Guardar disponibilidad</button>
      </div>
    </>
  );
}

// ─── ESTUDIO (FICHAS TÉCNICAS) ────────────────────────────────────────────────

const ESTADOS_FICHA = ["Borrador", "En revisión", "Aprobado", "Grabado", "En edición"];
const CATEGORIAS_FICHA = ["Valor", "Viral", "Venta", "Captacion", "Remarketing"];
const OBJETIVOS_FICHA = ["Educar", "Alcance", "Conversión"];

function estadoClass(estado) {
  const map = { "Borrador": "estado-borrador", "En revisión": "estado-revision", "Aprobado": "estado-aprobado", "Grabado": "estado-grabado", "En edición": "estado-edicion" };
  return map[estado] || "estado-borrador";
}

function FichaItem({ ficha, onUpdate, onDelete, canEdit, canReview, clientNombre }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(ficha);
  const [notaCliente, setNotaCliente] = useState("");
  const [calificacion, setCalificacion] = useState(ficha.calificacion || 0);
  const { show, el: toastEl } = useToast();
  const f = (k, v) => setLocal(p => ({ ...p, [k]: v }));

  async function saveEdit() {
    await onUpdate({ ...local });
    setEditing(false);
    show("✓ Ficha actualizada", "ok");
  }

  async function saveNota() {
    if (!notaCliente.trim()) return;
    const notas = [...(ficha.notas || []), { texto: notaCliente, fecha: new Date().toLocaleString("es-EC"), autor: clientNombre || "Cliente", calificacion }];
    await onUpdate({ ...ficha, notas, calificacion });
    setNotaCliente("");
    show("✓ Nota enviada", "ok");
  }

  async function cambiarEstado(estado) {
    await onUpdate({ ...ficha, estado });
    show("Estado actualizado: " + estado, "ok");
  }

  return (
    <>
      {toastEl}
      <div className="ficha-wrap">
        {/* HEADER colapsable */}
        <div className="ficha-header" onClick={() => setOpen(o => !o)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>{ficha.codigo || "—"}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{ficha.nombre}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={"ficha-estado " + estadoClass(ficha.estado)}>{ficha.estado || "Borrador"}</span>
              {ficha.categoria && <span className="badge" style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>{ficha.categoria}</span>}
              {ficha.objetivo && <span className="badge" style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>{ficha.objetivo}</span>}
              {(ficha.notas || []).length > 0 && <span style={{ fontSize: 10, color: "var(--accent2)", background: "rgba(255,222,89,.1)", padding: "2px 6px", borderRadius: 8 }}>💬 {ficha.notas.length} nota(s)</span>}
              {ficha.calificacion > 0 && <span style={{ fontSize: 11 }}>{"★".repeat(ficha.calificacion)}{"☆".repeat(5 - ficha.calificacion)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {canEdit && !editing && <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditing(true); setOpen(true); }}>✏️</button>}
            {canEdit && <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(ficha.id); }}>×</button>}
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* BODY */}
        {open && (
          <div style={{ padding: "1rem" }}>
            {/* Selector de estado */}
            {canEdit && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
                {ESTADOS_FICHA.map(e => (
                  <button key={e} className={"btn btn-ghost btn-sm " + (ficha.estado === e ? "active" : "")}
                    style={{ fontSize: 11, borderColor: ficha.estado === e ? "var(--accent)" : "var(--border)" }}
                    onClick={() => cambiarEstado(e)}>{e}</button>
                ))}
              </div>
            )}

            {editing && canEdit ? (
              /* MODO EDICIÓN */
              <div>
                <div className="form-row">
                  <div className="field"><label>Código</label><input type="text" value={local.codigo || ""} onChange={e => f("codigo", e.target.value)} placeholder="COD-001" /></div>
                  <div className="field"><label>Nombre del video</label><input type="text" value={local.nombre || ""} onChange={e => f("nombre", e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="field"><label>Categoría</label>
                    <select value={local.categoria || ""} onChange={e => f("categoria", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {CATEGORIAS_FICHA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Objetivo</label>
                    <select value={local.objetivo || ""} onChange={e => f("objetivo", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {OBJETIVOS_FICHA.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Estado</label>
                    <select value={local.estado || "Borrador"} onChange={e => f("estado", e.target.value)}>
                      {ESTADOS_FICHA.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                {[["hook","Hook (apertura del video)"],["guion","Guión completo"],["cta","Call to Action (CTA)"],["locacion","Locación"],["planoPrincipal","Plano principal"],["tomasApoyo","Tomas de apoyo (separadas por coma)"],["copy","Copy para publicación"]].map(([fk, lbl]) => (
                  <div key={fk} className="field">
                    <label>{lbl}</label>
                    {["guion","copy","tomasApoyo"].includes(fk)
                      ? <textarea value={local[fk] || ""} onChange={e => f(fk, e.target.value)} style={{ minHeight: fk === "guion" ? 180 : 80 }} />
                      : <input type="text" value={local[fk] || ""} onChange={e => f(fk, e.target.value)} />}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-green btn-sm" onClick={saveEdit}>💾 Guardar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setLocal(ficha); setEditing(false); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              /* MODO LECTURA */
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: ".75rem" }}>
                  {[["Hook", ficha.hook],["CTA", ficha.cta],["Locación", ficha.locacion],["Plano principal", ficha.planoPrincipal],["Tomas de apoyo", ficha.tomasApoyo]].map(([lbl, val]) => val ? (
                    <div key={lbl} className="ficha-field">
                      <label>{lbl}</label>
                      <div className="ficha-value" style={{ fontSize: 12 }}>{val}</div>
                    </div>
                  ) : null)}
                </div>
                {ficha.guion && <div className="ficha-field"><label>Guión</label><div className="ficha-value" style={{ maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap" }}>{ficha.guion}</div></div>}
                {ficha.copy && <div className="ficha-field"><label>Copy de publicación</label><div className="ficha-value" style={{ maxHeight: 120, overflow: "auto" }}>{ficha.copy}</div></div>}

                {/* NOTAS DEL CLIENTE */}
                {(ficha.notas || []).length > 0 && (
                  <div style={{ marginTop: ".75rem" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Notas y correcciones</div>
                    {(ficha.notas || []).map((n, ni) => (
                      <div key={ni} className="nota-cliente">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 11, color: "var(--accent2)" }}>{n.autor}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {n.calificacion > 0 && <span style={{ fontSize: 12 }}>{"★".repeat(n.calificacion)}{"☆".repeat(5-n.calificacion)}</span>}
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{n.fecha}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{n.texto}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* FORMULARIO REVISIÓN CLIENTE / FILMMAKER */}
                {canReview && (
                  <div style={{ marginTop: "1rem", background: "var(--surface2)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Agregar nota o corrección</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Calificación del contenido:</div>
                      <div className="stars-wrap">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className="star" style={{ color: s <= calificacion ? "var(--accent2)" : "var(--border)" }}
                            onClick={() => setCalificacion(s)}>★</span>
                        ))}
                        {calificacion > 0 && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{["","Necesita trabajo","Regular","Bueno","Muy bueno","Excelente"][calificacion]}</span>}
                      </div>
                    </div>
                    <textarea value={notaCliente} onChange={e => setNotaCliente(e.target.value)}
                      placeholder="Escribe tu corrección o sugerencia..." style={{ minHeight: 70, marginBottom: 8 }} />
                    <button className="btn btn-primary btn-sm" disabled={!notaCliente.trim()} onClick={saveNota}
                      style={{ background: "var(--accent2)", color: "#000" }}>
                      Enviar nota
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function EstudioPanel({ client, onUpdate, role }) {
  const fichas = client.hermesData?.fichas || [];
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const canEdit = role === "admin";
  const canReview = role === "client" || role === "filmmaker";
  const { show, el: toastEl } = useToast();

  const blank = { id: "", codigo: "", nombre: "", categoria: "Valor", objetivo: "Educar", hook: "", guion: "", cta: "", locacion: "", planoPrincipal: "", tomasApoyo: "", copy: "", estado: "Borrador", notas: [], calificacion: 0 };
  const [form, setForm] = useState({ ...blank });
  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function saveFicha() {
    if (!form.nombre) return show("Ingresa el nombre del video", "err");
    const nueva = { ...form, id: form.id || "ficha" + Date.now() };
    const newFichas = form.id ? fichas.map(f => f.id === form.id ? nueva : f) : [...fichas, nueva];
    await onUpdate({ ...client, hermesData: { ...(client.hermesData || {}), fichas: newFichas } });
    setForm({ ...blank }); setShowForm(false);
    show("✓ Ficha guardada", "ok");
  }

  async function updateFicha(updated) {
    const newFichas = fichas.map(f => f.id === updated.id ? updated : f);
    await onUpdate({ ...client, hermesData: { ...(client.hermesData || {}), fichas: newFichas } });
  }

  async function deleteFicha(id) {
    if (!window.confirm("¿Eliminar esta ficha?")) return;
    const newFichas = fichas.filter(f => f.id !== id);
    await onUpdate({ ...client, hermesData: { ...(client.hermesData || {}), fichas: newFichas } });
  }

  function exportDocx() {
    // Generar HTML para impresión
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fichas - ${client.name}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#111}.ficha{border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:24px;page-break-inside:avoid}.header{background:#004AAD;color:#fff;padding:12px 16px;border-radius:6px;margin-bottom:12px}.field{margin-bottom:10px}.field label{font-size:10px;font-weight:700;text-transform:uppercase;color:#666;display:block;margin-bottom:2px}.field .val{font-size:13px;line-height:1.6;border:1px solid #eee;padding:6px 10px;border-radius:4px;white-space:pre-wrap}.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin:0 4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media print{.ficha{page-break-after:always}}</style></head><body>
    <h1>Fichas Técnicas de Grabación</h1><h2>${client.name}</h2><p>Generado: ${new Date().toLocaleDateString("es-EC")}</p>
    ${fichas.map(f => `<div class="ficha"><div class="header"><strong>${f.codigo || ""} — ${f.nombre}</strong> <span class="badge" style="background:rgba(255,255,255,.2)">${f.estado || "Borrador"}</span> <span class="badge" style="background:rgba(255,255,255,.2)">${f.categoria || ""}</span></div>
    <div class="grid">${[["Categoría",f.categoria],["Objetivo",f.objetivo],["Locación",f.locacion],["Plano principal",f.planoPrincipal]].filter(x=>x[1]).map(([l,v])=>`<div class="field"><label>${l}</label><div class="val">${v}</div></div>`).join("")}</div>
    ${f.hook ? `<div class="field"><label>Hook</label><div class="val">${f.hook}</div></div>` : ""}
    ${f.guion ? `<div class="field"><label>Guión</label><div class="val">${f.guion}</div></div>` : ""}
    ${f.cta ? `<div class="field"><label>CTA</label><div class="val">${f.cta}</div></div>` : ""}
    ${f.copy ? `<div class="field"><label>Copy</label><div class="val">${f.copy}</div></div>` : ""}
    </div>`).join("")}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `fichas_${client.name}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = fichas
    .filter(f => filtroEstado === "todos" ? true : f.estado === filtroEstado)
    .filter(f => filtroCategoria === "todas" ? true : f.categoria === filtroCategoria);

  const fichasConNotas = fichas.filter(f => (f.notas || []).some(n => !n.vista)).length;

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Fichas Técnicas de Grabación</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {fichas.length} fichas · {fichas.filter(f => f.estado === "Aprobado").length} aprobadas
              {fichasConNotas > 0 && <span style={{ color: "var(--accent2)", marginLeft: 8 }}>· {fichasConNotas} con notas nuevas</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportDocx}>📄 Exportar HTML</button>
            {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
              {showForm ? "Cancelar" : "+ Nueva ficha"}
            </button>}
          </div>
        </div>

        {/* FORM NUEVA FICHA */}
        {showForm && canEdit && (
          <div className="card" style={{ borderColor: "rgba(0,74,173,.4)", marginBottom: "1rem" }}>
            <div className="card-title">Nueva ficha técnica</div>
            <div className="form-row">
              <div className="field"><label>Código</label><input type="text" value={form.codigo} onChange={e => ff("codigo", e.target.value)} placeholder="COD-001" /></div>
              <div className="field"><label>Nombre del video *</label><input type="text" value={form.nombre} onChange={e => ff("nombre", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Categoría</label>
                <select value={form.categoria} onChange={e => ff("categoria", e.target.value)}>
                  {CATEGORIAS_FICHA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Objetivo</label>
                <select value={form.objetivo} onChange={e => ff("objetivo", e.target.value)}>
                  {OBJETIVOS_FICHA.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {[["hook","Hook"],["cta","CTA"],["locacion","Locación"],["planoPrincipal","Plano principal"]].map(([fk,lbl]) => (
              <div key={fk} className="field"><label>{lbl}</label><input type="text" value={form[fk]} onChange={e => ff(fk, e.target.value)} /></div>
            ))}
            <div className="field"><label>Guión</label><textarea value={form.guion} onChange={e => ff("guion", e.target.value)} style={{ minHeight: 150 }} /></div>
            <div className="field"><label>Tomas de apoyo</label><textarea value={form.tomasApoyo} onChange={e => ff("tomasApoyo", e.target.value)} style={{ minHeight: 60 }} /></div>
            <div className="field"><label>Copy de publicación</label><textarea value={form.copy} onChange={e => ff("copy", e.target.value)} style={{ minHeight: 80 }} /></div>
            <button className="btn btn-primary btn-sm" onClick={saveFicha}>Guardar ficha</button>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
          <div className="period-pills">
            <button className={"pill " + (filtroEstado === "todos" ? "active" : "")} onClick={() => setFiltroEstado("todos")}>Todos</button>
            {ESTADOS_FICHA.map(e => <button key={e} className={"pill " + (filtroEstado === e ? "active" : "")} onClick={() => setFiltroEstado(e)}>{e}</button>)}
          </div>
          <div className="period-pills">
            <button className={"pill " + (filtroCategoria === "todas" ? "active" : "")} onClick={() => setFiltroCategoria("todas")}>Todas</button>
            {CATEGORIAS_FICHA.map(c => <button key={c} className={"pill " + (filtroCategoria === c ? "active" : "")} onClick={() => setFiltroCategoria(c)}>{c}</button>)}
          </div>
        </div>

        {filtered.length === 0 && <div className="empty"><div style={{ fontSize: 28, opacity: .3 }}>🎬</div><div style={{ marginTop: 8 }}>{canEdit ? "Sin fichas. Crea la primera." : "Sin fichas disponibles aún."}</div></div>}

        {filtered.map(f => (
          <FichaItem key={f.id} ficha={f} onUpdate={updateFicha} onDelete={deleteFicha}
            canEdit={canEdit} canReview={canReview} clientNombre={client.name} />
        ))}
      </div>
    </>
  );
}


// ─── CLIENT FORM ──────────────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }) {
  const blank = { name: "", username: "", password: "", niche: "whatsapp", color: "#7C3AED", logo: "", producto: "", email: "", telefono: "", direccion: "", representante: "", serviciosContratados: [], checklist: {}, cuentas: [], contratos: [], antecedentes: [], records: [], kpis: [], funnel: [] };
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
      <div className="form-row"><div className="field"><label>Representante</label><input type="text" value={form.representante} onChange={e => f("representante", e.target.value)} /></div><div className="field"><label>Teléfono</label><input type="text" value={form.telefono} onChange={e => f("telefono", e.target.value)} /></div></div>
      <div className="form-row"><div className="field"><label>Correo electrónico</label><input type="text" value={form.email} onChange={e => f("email", e.target.value)} /></div><div className="field"><label>Dirección</label><input type="text" value={form.direccion} onChange={e => f("direccion", e.target.value)} /></div></div>
      <div className="section-label">Acceso al portal</div>
      <div className="form-row">
        <div className="field"><label>Iniciales (logo)</label><input type="text" value={form.logo} onChange={e => f("logo", e.target.value.slice(0, 2).toUpperCase())} maxLength={2} /></div>
        <div className="field"><label>Color de marca</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={form.color} onChange={e => f("color", e.target.value)} style={{ width: 44, height: 40, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", cursor: "pointer" }} /><span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{form.color}</span></div></div>
      </div>
      <div className="form-row"><div className="field"><label>Usuario</label><input type="text" value={form.username} onChange={e => f("username", e.target.value.toLowerCase().replace(/\s/g, ""))} /></div><div className="field"><label>Contraseña</label><PasswordInput value={form.password} onChange={e => f("password", e.target.value)} /></div></div>
      <div className="field"><label>Nicho</label><select value={form.niche} onChange={e => f("niche", e.target.value)}><option value="whatsapp">Venta por WhatsApp</option><option value="web">Sitio web / E-commerce</option><option value="lanzamiento">Lanzamiento (Leads / Formularios)</option></select></div>

      <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
        <button className="btn btn-primary" onClick={() => { if (!form.name || !form.username || !form.password) return alert("Completa nombre, usuario y contraseña."); onSave(form); }}>{initial ? "Guardar cambios" : "Crear cliente"}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── ADD RECORD ───────────────────────────────────────────────────────────────
// Campo numérico estable: definido FUERA de cualquier componente padre
// para que React nunca lo destruya ni recree entre renders
function StableNumField({ label, name, formRef, prefix }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-prefix">
        {prefix && <span className="pre">{prefix}</span>}
        <input
          type="number"
          step="any"
          min="0"
          name={name}
          defaultValue=""
          placeholder="0"
          ref={el => { if (el && formRef.current) formRef.current[name] = el; }}
          style={{ MozAppearance: "textfield" }}
        />
      </div>
    </div>
  );
}

function AddRecordForm({ client, onSave, onCancel }) {
  const isWA = client.niche === "whatsapp";
  const isWeb = client.niche === "web";
  const isLaunch = !isWA && !isWeb;
  const today = new Date().toISOString().slice(0, 10);
  const dateRef = useRef(null);
  // formRef guarda referencias directas a cada input por nombre
  const formRef = useRef({});

  function handleSave(extraData) {
    const rec = { date: dateRef.current?.value || today, ...(extraData || {}) };
    Object.entries(formRef.current).forEach(([k, el]) => {
      if (k.startsWith("_")) return; // los campos de texto ya están en extraData
      if (el && el.value !== "" && el.value !== null) {
        const n = parseFloat(el.value);
        if (!isNaN(n)) rec[k] = n;
      }
    });
    onSave(rec);
  }

  const F = ({ lbl, name, prefix }) => (
    <StableNumField label={lbl} name={name} formRef={formRef} prefix={prefix} />
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="sec-title" style={{ marginBottom: "1.25rem" }}>
        Nuevo registro — {client.name}
      </div>
      <div className="field">
        <label>Fecha</label>
        <input type="date" defaultValue={today} ref={dateRef} />
      </div>

      <div className="section-label">Pauta</div>
      <div className="form-row">
        <F lbl="Inversión" name="inversion" prefix="$" />
        <F lbl="Alcance" name="alcance" />
      </div>
      <div className="form-row3">
        <F lbl="CPM" name="cpm" prefix="$" />
        <F lbl="CPC" name="cpc" prefix="$" />
        <F lbl="CTR (%)" name="ctr" />
      </div>
      <div className="form-row">
        <F lbl="Impresiones" name="impresiones" />
        <F lbl="Clics en enlace" name="clics_enlace" />
      </div>

      {isWA && <>
        <div className="section-label">Ventas WhatsApp</div>
        <div className="form-row">
          <F lbl="Leads" name="leads" />
          <F lbl="Contactados" name="contactados" />
        </div>
        <div className="form-row">
          <F lbl="Ventas cerradas" name="ventas" />
          <F lbl="Ingresos" name="ingreso" prefix="$" />
        </div>
      </>}

      {isWeb && <>
        <div className="section-label">E-commerce</div>
        <div className="form-row">
          <F lbl="Sesiones" name="sesiones" />
          <F lbl="Agregar carrito" name="agregar_carrito" />
        </div>
        <div className="form-row3">
          <F lbl="Compras" name="compras" />
          <F lbl="Ingresos" name="ingreso" prefix="$" />
          <F lbl="ROAS" name="roas" />
        </div>
        <div className="form-row">
          <F lbl="Ventas" name="ventas" />
          <F lbl="Resultados" name="resultados" />
        </div>
      </>}

      {isLaunch && <>
        <div className="section-label">Lanzamiento / Leads</div>
        <div className="form-row">
          <F lbl="Clientes potenciales" name="clientesPotenciales" />
          <F lbl="Formularios" name="formularios" />
        </div>
        <div className="form-row">
          <F lbl="Ventas" name="ventas" />
          <F lbl="Ingresos" name="ingreso" prefix="$" />
        </div>
        <div className="form-row">
          <F lbl="Resultados" name="resultados" />
          <F lbl="Ticket promedio" name="ticket_promedio" prefix="$" />
        </div>
      </>}

      {/* NOMENCLATURA DE CAMPAÑAS */}
      <div className="section-label" style={{ marginTop: "1rem" }}>Nomenclatura de campañas (opcional)</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
        Escribe los nombres separados por coma. Permite filtrar y agrupar métricas por campaña.
      </div>
      <div className="field">
        <label>Campañas activas este día</label>
        <input type="text" ref={el => { formRef.current["_campanas"] = el; }}
          placeholder="Ej: L1_JORGE_CAP_FB_FORM1_COL_FRIO_01042026, L1_JORGE_CAP_FB_LP2_MEX_TEMP_01042026"
          onChange={() => {}} style={{ fontSize: 12 }} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Conjuntos de anuncios</label>
          <input type="text" ref={el => { formRef.current["_conjuntos"] = el; }}
            placeholder="Ej: CJ_INTERES_25-45_COL, CJ_LOOKALIKE_MEX" onChange={() => {}} style={{ fontSize: 12 }} />
        </div>
        <div className="field">
          <label>Anuncios</label>
          <input type="text" ref={el => { formRef.current["_anuncios"] = el; }}
            placeholder="Ej: AD_VIDEO1_HOOK_DOLOR, AD_IMG2_OFERTA" onChange={() => {}} style={{ fontSize: 12 }} />
        </div>
      </div>
      <div className="field">
        <label>Notas del día (contexto adicional)</label>
        <input type="text" ref={el => { formRef.current["_notas_dia"] = el; }}
          placeholder="Ej: subimos presupuesto congelado, pausamos anuncio bajo rendimiento" onChange={() => {}} style={{ fontSize: 12 }} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
        <button className="btn btn-primary" onClick={() => {
          // Capturar campos de texto de nomenclatura antes de guardar
          const txtFields = ["_campanas","_conjuntos","_anuncios","_notas_dia"];
          const extraData = {};
          txtFields.forEach(k => {
            const el = formRef.current[k];
            if (el && el.value.trim()) extraData[k.replace("_","")] = el.value.trim();
          });
          handleSave(extraData);
        }}>Guardar</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── PROGRAMADOR DE MENSAJES ─────────────────────────────────────────────────
const DIAS_SEMANA = [
  { key: 0, label: "Dom" }, { key: 1, label: "Lun" }, { key: 2, label: "Mar" },
  { key: 3, label: "Mie" }, { key: 4, label: "Jue" }, { key: 5, label: "Vie" },
  { key: 6, label: "Sab" },
];

function SchedulerPanel({ client, onUpdate }) {
  const schedConfig = client.schedConfig || {};
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(schedConfig.enabled || false);
  const [hora, setHora] = useState(schedConfig.hora || "08:00");
  const [dias, setDias] = useState(schedConfig.dias || [1,2,3,4,5]);
  const [fechaInicio, setFechaInicio] = useState(schedConfig.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(schedConfig.fechaFin || "");
  const [plantillaId, setPlantillaId] = useState(schedConfig.plantillaId || "p1");
  const [saving, setSaving] = useState(false);
  const { show, el: toastEl } = useToast();

  const plantillas = client.tgConfig?.plantillas || PLANTILLAS_DEFAULT;
  const tgOk = !!(client.tgConfig?.token && client.tgConfig?.chatId);

  function toggleDia(d) { setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()); }

  async function save() {
    setSaving(true);
    await onUpdate({ ...client, schedConfig: { enabled, hora, dias, fechaInicio, fechaFin, plantillaId } });
    show(enabled ? "✓ Envio automatico activado" : "Envio automatico desactivado", "ok");
    setSaving(false);
    setOpen(false);
  }

  function proximosEnvios() {
    if (!enabled || !dias.length) return [];
    const ahora = new Date(); const result = [];
    for (let i = 0; i < 14 && result.length < 3; i++) {
      const d = new Date(ahora); d.setDate(d.getDate() + i);
      const ds = d.getDay(); const fs = d.toISOString().slice(0,10);
      if (!dias.includes(ds)) continue;
      if (fechaInicio && fs < fechaInicio) continue;
      if (fechaFin && fs > fechaFin) continue;
      result.push(fs + " a las " + hora);
    }
    return result;
  }

  const proximos = proximosEnvios();

  return (
    <>
      {toastEl}
      {/* HEADER colapsable */}
      <div style={{ background: "var(--surface2)", borderRadius: 10, overflow: "hidden", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Envio automatico diario</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {enabled
                  ? <span style={{ color: "var(--green)" }}>Activo · {dias.length} dias · {hora} (Quito){proximos[0] ? " · Próximo: " + proximos[0] : ""}</span>
                  : <span style={{ color: "var(--muted)" }}>Inactivo</span>
                }
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? "var(--green)" : "var(--border)", position: "relative", transition: "background .2s" }}
              onClick={e => { e.stopPropagation(); setEnabled(v => !v); }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: enabled ? 19 : 3, transition: "left .2s" }} />
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {open && (
          <div style={{ padding: "0 16px 16px" }}>
            {!tgOk && <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--amber)", marginBottom: 12 }}>⚠️ Configura Token y Chat ID en la tab ✈️ Telegram primero</div>}
            <div className="form-row">
              <div className="field"><label>Hora de envio (Quito UTC-5)</label><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></div>
              <div className="field"><label>Plantilla</label><select value={plantillaId} onChange={e => setPlantillaId(e.target.value)}>{plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
            </div>
            <div className="field" style={{ marginBottom: "1rem" }}>
              <label>Dias de envio</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {DIAS_SEMANA.map(d => <div key={d.key} className={"fb-chip " + (dias.includes(d.key) ? "active" : "")} onClick={() => toggleDia(d.key)}>{d.label}</div>)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setDias([1,2,3,4,5])}>Lun-Vie</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDias([0,1,2,3,4,5,6])}>Todos</button>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Fecha inicio</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
              <div className="field"><label>Fecha fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
            </div>
            {(client.contratos || []).filter(c => c.fechaInicio).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Llenar desde contrato:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(client.contratos || []).filter(c => c.fechaInicio).map((c, i) => (
                    <button key={i} className="btn btn-ghost btn-sm" onClick={() => { setFechaInicio(c.fechaInicio); setFechaFin(c.fechaFin || ""); }}>
                      Contrato #{i+1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-sm" disabled={saving || (enabled && !dias.length) || !tgOk} onClick={save}>
              {saving ? "Guardando..." : "💾 Guardar"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}


// ─── FACEBOOK ADS INTEGRATION ────────────────────────────────────────────────

// Métricas disponibles de Facebook Ads API
const FB_METRICAS_DISPONIBLES = [
  { key: "spend",           label: "Inversión",          campo: "inversion",          prefix: "$" },
  { key: "impressions",     label: "Impresiones",         campo: "impresiones",         prefix: ""  },
  { key: "reach",           label: "Alcance",             campo: "alcance",             prefix: ""  },
  { key: "cpm",             label: "CPM",                 campo: "cpm",                prefix: "$" },
  { key: "cpc",             label: "CPC",                 campo: "cpc",                prefix: "$" },
  { key: "ctr",             label: "CTR",                 campo: "ctr",                suffix: "%" },
  { key: "clicks",          label: "Clics en enlace",     campo: "clics_enlace",        prefix: ""  },
  { key: "actions_lead",    label: "Leads / Formularios", campo: "leads",               prefix: ""  },
  { key: "actions_purchase",label: "Compras / Ventas",    campo: "ventas",              prefix: ""  },
  { key: "purchase_roas",   label: "ROAS",                campo: "roas",                prefix: ""  },
  { key: "frequency",       label: "Frecuencia",          campo: "frecuencia",          prefix: ""  },
  { key: "cost_per_result", label: "Costo por resultado", campo: "cpa",                 prefix: "$" },
];

async function fetchFbMetrics(token, adAccountId, date, selectedMetrics) {
  // Construir campos requeridos
  const fbFields = selectedMetrics
    .map(m => {
      if (m.key === "actions_lead") return "actions";
      if (m.key === "actions_purchase") return "actions";
      if (m.key === "purchase_roas") return "purchase_roas";
      return m.key;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicar
    .join(",");

  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=${fbFields}&time_range={"since":"${date}","until":"${date}"}&level=account&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return { ok: false, error: data.error.message };

    const row = data.data?.[0];
    if (!row) return { ok: false, error: "Sin datos para esta fecha en Facebook Ads." };

    // Mapear campos de FB a campos internos
    const record = { date };
    selectedMetrics.forEach(m => {
      if (m.key === "actions_lead") {
        const action = (row.actions || []).find(a => a.action_type === "lead");
        const val = parseFloat(action?.value || 0);
        record[m.campo] = val;
        // Para campañas de lanzamiento/formularios, leads = resultados
        record["resultados"] = val;
        record["formularios"] = val;
      } else if (m.key === "actions_purchase") {
        const action = (row.actions || []).find(a => a.action_type === "purchase");
        record[m.campo] = parseFloat(action?.value || 0);
      } else if (m.key === "purchase_roas") {
        record[m.campo] = parseFloat(row.purchase_roas?.[0]?.value || 0);
      } else if (row[m.key] !== undefined) {
        record[m.campo] = parseFloat(row[m.key]) || 0;
      }
    });

    // Jalar nombres de campañas activas ese día
    try {
      const campUrl = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=name,status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${token}`;
      const campRes = await fetch(campUrl);
      const campData = await campRes.json();
      if (campData.data?.length) {
        record.campanas = campData.data.map(c => c.name).join(", ");
      }
    } catch {} // no es crítico si falla

    return { ok: true, record };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function FacebookPanel({ client, onUpdate }) {
  const fbConfig = client.fbConfig || {};

  // ── Estado principal ──────────────────────────────────────────────────────
  const [token, setToken]           = useState(fbConfig.token || "");
  const [selectedMetrics, setSelectedMetrics] = useState(
    fbConfig.selectedMetrics || FB_METRICAS_DISPONIBLES.slice(0, 7)
  );
  const [lastSync, setLastSync]     = useState(fbConfig.lastSync || null);
  const [syncing, setSyncing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [syncDate, setSyncDate]     = useState(new Date(Date.now()-86400000).toISOString().slice(0,10));
  const [rangeFrom, setRangeFrom]   = useState(new Date(Date.now()-7*86400000).toISOString().slice(0,10));
  const [rangeTo, setRangeTo]       = useState(new Date(Date.now()-86400000).toISOString().slice(0,10));
  const [syncMode, setSyncMode]     = useState("single"); // single | range
  const [syncStatus, setSyncStatus] = useState(null);     // null | loading | ok | err
  const [syncLog, setSyncLog]       = useState([]);
  const [verifyStatus, setVerify]   = useState(null);     // null | loading | {name, accounts} | err
  const [campaigns, setCampaigns]   = useState(null);
  const [loadingCamp, setLoadingCamp] = useState(false);
  const [autoSync, setAutoSync]     = useState(fbConfig.autoSync || false);
  const { show, el: toastEl }       = useToast();

  // ── Multi-cuenta ──────────────────────────────────────────────────────────
  // cuentas: [{ id, nombre, adAccountId }]
  const [cuentas, setCuentas] = useState(() => {
    if (fbConfig.cuentas?.length) return fbConfig.cuentas;
    // Migrar config antigua a nueva estructura
    if (fbConfig.adAccountId) return [{ id:1, nombre:"Cuenta principal", adAccountId: fbConfig.adAccountId }];
    return [{ id:1, nombre:"Cuenta principal", adAccountId:"" }];
  });

  function addCuenta() {
    setCuentas(p => [...p, { id: Date.now(), nombre:"Nueva cuenta", adAccountId:"" }]);
  }
  function removeCuenta(id) {
    if (cuentas.length <= 1) return show("Debe quedar al menos una cuenta", "err");
    setCuentas(p => p.filter(c => c.id !== id));
  }
  function updateCuenta(id, field, val) {
    setCuentas(p => p.map(c => c.id===id ? {...c, [field]: val} : c));
  }

  // ── Alerta expiración token ───────────────────────────────────────────────
  const tokenAge = fbConfig.tokenSavedAt
    ? Math.floor((Date.now() - new Date(fbConfig.tokenSavedAt).getTime()) / 86400000)
    : null;
  const tokenExpirando = tokenAge !== null && tokenAge >= 50;

  // ── Auto-sync y auto-carga al montar ─────────────────────────────────────
  useEffect(() => {
    if (!token || !cuentas.some(c=>c.adAccountId)) return;
    // Auto-sync de métricas si está activado
    if (autoSync) {
      const today = new Date().toISOString().slice(0,10);
      setSyncDate(today);
      setTimeout(() => ejecutarSync([today]), 300);
    }
    // Facturación — siempre cargar al abrir (datos críticos)
    setTimeout(() => fetchBillingData(), 600);
    // Campañas activas — cargar al abrir
    setTimeout(() => cargarCampanas(), 900);
  }, []);

  // ── Verificar token ───────────────────────────────────────────────────────
  async function verificarToken() {
    if (!token) return show("Ingresa el token primero", "err");
    setVerify("loading");
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=name,id&access_token=${token}`);
      const d = await res.json();
      if (d.error) { setVerify("err"); show("Token inválido: " + d.error.message, "err"); return; }
      // Verificar cuentas
      const accRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status&access_token=${token}`);
      const accD = await accRes.json();
      setVerify({ name: d.name, accounts: accD.data || [] });
      show("✅ Token válido — " + d.name, "ok");
    } catch(e) { setVerify("err"); show("Error: " + e.message, "err"); }
  }

  // ── Campañas activas ──────────────────────────────────────────────────────
  async function cargarCampanas() {
    const activas = cuentas.filter(c => c.adAccountId);
    if (!token || !activas.length) return show("Configura token y al menos una cuenta", "err");
    setLoadingCamp(true); setCampaigns(null);
    const todas = [];
    for (const cuenta of activas) {
      try {
        const url = `https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/campaigns?fields=name,status,daily_budget,lifetime_budget,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50&access_token=${token}`;
        const res = await fetch(url);
        const d = await res.json();
        if (d.data) todas.push(...d.data.map(c => ({...c, _cuenta: cuenta.nombre, _cuentaId: cuenta.id})));
      } catch {}
    }
    setCampaigns(todas);
    setLoadingCamp(false);
  }

  // ── Core sync — suma datos de todas las cuentas para una fecha ───────────
  async function syncFecha(fecha) {
    const activas = cuentas.filter(c => c.adAccountId);
    if (!activas.length) return { ok: false, error: "Sin cuentas configuradas" };

    // Acumular datos de todas las cuentas
    const sumFields = ["inversion","alcance","impresiones","clics_enlace","leads","resultados","formularios","ventas","roas","frecuencia","cpa"];
    const avgFields = ["cpm","cpc","ctr"];
    const acum = {};
    const porCuenta = [];

    for (const cuenta of activas) {
      const res = await fetchFbMetrics(token, cuenta.adAccountId, fecha, selectedMetrics);
      if (!res.ok) continue;
      const r = res.record;
      porCuenta.push({ cuenta: cuenta.nombre, adAccountId: cuenta.adAccountId, ...r });
      // Sumar campos numéricos
      sumFields.forEach(f => { if (r[f]) acum[f] = (acum[f]||0) + (parseFloat(r[f])||0); });
      // Promedio ponderado por inversión para CPM, CPC, CTR (se recalculan abajo)
    }

    if (!porCuenta.length) return { ok: false, error: "Sin datos en FB para " + fecha };

    // Recalcular métricas derivadas del consolidado
    if (acum.inversion && acum.leads) acum.cpa = parseFloat((acum.inversion/acum.leads).toFixed(4));
    if (acum.inversion && acum.impresiones) acum.cpm = parseFloat((acum.inversion/acum.impresiones*1000).toFixed(4));
    if (acum.inversion && acum.clics_enlace) acum.cpc = parseFloat((acum.inversion/acum.clics_enlace).toFixed(4));
    if (acum.clics_enlace && acum.impresiones) acum.ctr = parseFloat((acum.clics_enlace/acum.impresiones*100).toFixed(4));

    return { ok: true, record: { date: fecha, ...acum, _porCuenta: porCuenta } };
  }

  // ── Ejecutar sync de un array de fechas ──────────────────────────────────
  async function ejecutarSync(fechas) {
    if (!token) return show("Ingresa el Access Token", "err");
    if (!cuentas.some(c=>c.adAccountId)) return show("Agrega al menos una cuenta con Ad Account ID", "err");
    setSyncing(true); setSyncStatus("loading"); setSyncLog([]);

    let ok = 0, err = 0;
    const existingRecords = [...(client.records||[])];

    for (const fecha of fechas) {
      setSyncLog(l => [...l, { fecha, estado: "⟳" }]);
      const result = await syncFecha(fecha);
      if (!result.ok) {
        err++;
        setSyncLog(l => l.map(x => x.fecha===fecha ? {...x, estado:"❌ "+result.error} : x));
        continue;
      }
      // Fusionar con registros existentes
      const idx = existingRecords.findIndex(r => r.date === fecha);
      if (idx >= 0) existingRecords[idx] = { ...existingRecords[idx], ...result.record };
      else existingRecords.push(result.record);
      ok++;
      setSyncLog(l => l.map(x => x.fecha===fecha ? {...x, estado:"✅"} : x));
    }

    existingRecords.sort((a,b) => a.date.localeCompare(b.date));
    const now = new Date().toLocaleString("es-EC");
    const updated = {
      ...client,
      records: existingRecords,
      fbConfig: { token, cuentas, selectedMetrics, lastSync: now, autoSync,
        tokenSavedAt: fbConfig.tokenSavedAt || new Date().toISOString() }
    };
    await onUpdate(updated);
    setLastSync(now);
    setSyncStatus(err === 0 ? "ok" : ok > 0 ? "partial" : "err");
    show(`✓ ${ok} día${ok!==1?"s":""} sincronizados${err>0?` · ${err} con error`:""}`, ok>0?"ok":"err");
    setSyncing(false);
  }

  function handleSync() {
    if (syncMode === "single") {
      ejecutarSync([syncDate]);
    } else {
      // Generar array de fechas del rango
      const fechas = [];
      let d = new Date(rangeFrom);
      const end = new Date(rangeTo);
      while (d <= end) {
        fechas.push(d.toISOString().slice(0,10));
        d.setDate(d.getDate()+1);
      }
      if (fechas.length > 90) return show("Máximo 90 días por rango", "err");
      ejecutarSync(fechas);
    }
  }

  // ── Alertas de presupuesto ────────────────────────────────────────────────
  const [billingData, setBillingData]   = useState(fbConfig.billingData || null);   // datos de facturación por cuenta
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingAlerts, setBillingAlerts] = useState(() =>
    fbConfig.billingAlerts || { enabled: false, pctThreshold: 15, diasThreshold: 2 }
  );

  async function fetchBillingData() {
    const activas = cuentas.filter(c => c.adAccountId);
    if (!token || !activas.length) return show("Configura token y cuentas primero", "err");
    setLoadingBilling(true);
    const resultados = [];
    for (const cuenta of activas) {
      try {
        const url = `https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}?fields=name,amount_spent,spend_cap,balance,currency&access_token=${token}`;
        const res  = await fetch(url);
        const d    = await res.json();
        if (d.error) { resultados.push({ id: cuenta.id, nombre: cuenta.nombre, error: d.error.message }); continue; }
        const gastado  = parseFloat(d.amount_spent || 0) / 100;  // gasto total acumulado
        const umbral   = parseFloat(d.spend_cap   || 0) / 100;   // umbral de gasto (puede ser 0 si no está configurado)
        const deuda    = parseFloat(d.balance      || 0) / 100;   // monto pendiente de cobro (deuda actual)
        // pctUsado: solo si hay umbral configurado
        const pctUsado = umbral > 0 ? (deuda / umbral * 100) : null;
        const restante = umbral > 0 ? umbral - deuda : null;
        const proximoCobro = null;
        const diasParaCobro = null;
        resultados.push({
          id: cuenta.id, nombre: cuenta.nombre,
          adAccountId: cuenta.adAccountId,
          cuentaNombre: d.name || cuenta.nombre,
          gastado, umbral, deuda, restante, pctUsado,
          proximoCobro, diasParaCobro,
          currency: d.currency || "USD",
        });
      } catch(e) { resultados.push({ id: cuenta.id, nombre: cuenta.nombre, error: e.message }); }
    }
    setBillingData(resultados);
    setLoadingBilling(false);
    // Guardar en config para persistir
    const updated = { ...client, fbConfig: { token, cuentas, selectedMetrics, lastSync, autoSync,
      tokenSavedAt: fbConfig.tokenSavedAt || new Date().toISOString(),
      billingData: resultados, billingAlerts,
      billingLastCheck: new Date().toISOString()
    }};
    await onUpdate(updated);
    // Verificar si disparar alertas de Telegram
    checkAndSendBillingAlerts(resultados);
  }

  async function checkAndSendBillingAlerts(datos) {
    if (!billingAlerts.enabled) return;
    const tgToken  = client.tgConfig?.token;
    const tgChatId = client.tgConfig?.chatIds?.[0]?.chatId || client.tgConfig?.chatId;
    if (!tgToken || !tgChatId) return;
    for (const d of datos) {
      if (d.error) continue;
      const alertas = [];
      // Alerta % — cuando la deuda acumulada supera el (100 - threshold)% del umbral de cobro
      if (d.pctUsado !== null && d.pctUsado >= (100 - billingAlerts.pctThreshold)) {
        alertas.push(`⚠️ *Umbral de cobro al ${fmtNum(d.pctUsado,1)}%*\nDeuda actual: $${fmtNum(d.deuda,2)} / Umbral: $${fmtNum(d.umbral,2)}\nFacebook cobrará cuando llegues a $${fmtNum(d.umbral,2)}`);
      }
      // Alerta días para cobro
      if (d.diasParaCobro !== null && d.diasParaCobro <= billingAlerts.diasThreshold && d.diasParaCobro >= 0) {
        alertas.push(`📅 *Cobro en ${d.diasParaCobro} día${d.diasParaCobro !== 1 ? "s" : ""}*\nFecha: ${d.proximoCobro}\nSaldo pendiente: $${fmtNum(d.gastado,2)}`);
      }
      if (alertas.length) {
        const msg = `🔔 *Alerta de facturación — ${d.nombre}*\n_Cuenta: ${d.cuentaNombre}_\n\n${alertas.join("\n\n")}\n\n_Trafficker Pro · ${new Date().toLocaleString("es-EC")}_`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChatId, text: msg, parse_mode: "Markdown" })
        });
      }
    }
  }

  async function saveConfig() {
    setSaving(true);
    const updated = { ...client, fbConfig: {
      token, cuentas, selectedMetrics, lastSync,
      autoSync, billingAlerts,
      billingData: billingData || fbConfig.billingData,
      tokenSavedAt: fbConfig.tokenSavedAt || new Date().toISOString()
    }};
    await onUpdate(updated);
    show("✓ Configuración de Facebook guardada", "ok");
    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {toastEl}

      {/* Alerta expiración token */}
      {tokenExpirando && (
        <div style={{padding:"10px 16px",marginBottom:"1rem",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",fontSize:13,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            <strong style={{color:"var(--red)"}}>Token con {tokenAge} días — expira pronto</strong>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>El token dura 60 días. Renuévalo en developers.facebook.com antes de que expire para no perder la sincronización automática.</div>
          </div>
        </div>
      )}

      {/* ── Sección 1: Token ─────────────────────────────────────────────── */}
      <div className="fb-card" style={{marginBottom:"1rem"}}>
        <div className="fb-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Integración con Facebook Ads
          {lastSync && <span className="fb-sync-badge fb-sync-ok" style={{marginLeft:"auto"}}>Última sync: {lastSync}</span>}
        </div>

        <div className="field">
          <label>Access Token de Facebook</label>
          <div style={{display:"flex",gap:8}}>
            <input type="text" value={token} onChange={e=>setToken(e.target.value)}
              placeholder="EAAOWMIieniUBRIB7Tw..." style={{flex:1}} />
            <button className="btn btn-ghost btn-sm" style={{whiteSpace:"nowrap"}}
              onClick={verificarToken} disabled={verifyStatus==="loading"}>
              {verifyStatus==="loading" ? "⟳" : "🔍 Verificar"}
            </button>
          </div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>
            developers.facebook.com → tu app → Marketing API → Herramientas → Obtener token (60 días)
          </div>
        </div>

        {/* Resultado verificación */}
        {verifyStatus && verifyStatus !== "loading" && verifyStatus !== "err" && (
          <div style={{padding:"10px 14px",borderRadius:8,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:13,color:"var(--green)"}}>✅ Token válido — {verifyStatus.name}</div>
            {verifyStatus.accounts?.length > 0 && (
              <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                Cuentas disponibles:
                {verifyStatus.accounts.map(a => (
                  <span key={a.account_id} style={{marginLeft:8,padding:"1px 8px",background:"rgba(255,255,255,.06)",borderRadius:10,cursor:"pointer"}}
                    onClick={()=>{ if(!cuentas.some(c=>c.adAccountId===a.account_id)) updateCuenta(cuentas[0].id,"adAccountId",a.account_id); }}>
                    {a.name} ({a.account_id})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto-sync toggle */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:"var(--surface2)",marginTop:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>🔄 Sincronización automática al abrir</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>Sincroniza el día de hoy automáticamente cada vez que abres este panel</div>
          </div>
          <div style={{position:"relative",width:44,height:24,cursor:"pointer"}} onClick={()=>setAutoSync(v=>!v)}>
            <div style={{position:"absolute",inset:0,borderRadius:12,background:autoSync?"var(--green)":"var(--border)",transition:"background .2s"}}/>
            <div style={{position:"absolute",top:3,left:autoSync?22:3,width:18,height:18,borderRadius:9,background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
          </div>
        </div>
      </div>

      {/* ── Sección 2: Multi-cuenta ──────────────────────────────────────── */}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13}}>📊 Cuentas de anunciante</div>
          <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={addCuenta}>+ Agregar cuenta</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {cuentas.map((c, i) => (
            <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end",padding:"10px 12px",borderRadius:8,background:"var(--surface2)"}}>
              <div>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:3}}>Nombre de la cuenta</div>
                <input type="text" value={c.nombre} onChange={e=>updateCuenta(c.id,"nombre",e.target.value)}
                  placeholder="Ej: Principal, Respaldo, Ecuador..." style={{width:"100%",fontSize:12}} />
              </div>
              <div>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:3}}>Ad Account ID</div>
                <input type="text" value={c.adAccountId}
                  onChange={e=>updateCuenta(c.id,"adAccountId",e.target.value.replace("act_",""))}
                  placeholder="120247229359120062" style={{width:"100%",fontSize:12}} />
              </div>
              <button onClick={()=>removeCuenta(c.id)}
                style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:"0 4px",alignSelf:"center"}}>×</button>
            </div>
          ))}
        </div>
        {cuentas.length > 1 && (
          <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>
            💡 Al sincronizar, los datos de todas las cuentas se suman en un registro consolidado por día. También puedes ver el desglose por cuenta en el historial.
          </div>
        )}
      </div>

      {/* ── Sección 3: Métricas ──────────────────────────────────────────── */}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>
          Métricas a sincronizar ({selectedMetrics.length}/10)
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {FB_METRICAS_DISPONIBLES.map(m => {
            const active = !!selectedMetrics.find(x=>x.key===m.key);
            return (
              <div key={m.key} className={"fb-chip "+(active?"active":"")} onClick={()=>toggleMetric(m)}>
                {active?"✓ ":""}{m.label}
              </div>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
          Se guardan en los registros diarios. Mínimo 1, máximo 10.
        </div>
      </div>

      {/* ── Sección 4: Sincronización ────────────────────────────────────── */}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>⟳ Sincronizar datos</div>

        {/* Tabs single/range */}
        <div className="period-pills" style={{marginBottom:12}}>
          <button className={"pill "+(syncMode==="single"?"active":"")} onClick={()=>setSyncMode("single")}>📅 Fecha específica</button>
          <button className={"pill "+(syncMode==="range"?"active":"")} onClick={()=>setSyncMode("range")}>📆 Rango de fechas</button>
        </div>

        {syncMode === "single" ? (
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input type="date" value={syncDate} onChange={e=>setSyncDate(e.target.value)}
              max={new Date().toISOString().slice(0,10)} style={{width:"auto"}} />
            <button className="btn btn-ghost btn-sm" onClick={()=>setSyncDate(new Date().toISOString().slice(0,10))}>Hoy</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSyncDate(new Date(Date.now()-86400000).toISOString().slice(0,10))}>Ayer</button>
          </div>
        ) : (
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input type="date" value={rangeFrom} onChange={e=>setRangeFrom(e.target.value)}
              max={rangeTo} style={{width:"auto"}} />
            <span style={{color:"var(--muted)",fontSize:12}}>hasta</span>
            <input type="date" value={rangeTo} onChange={e=>setRangeTo(e.target.value)}
              max={new Date().toISOString().slice(0,10)} style={{width:"auto"}} />
            <span style={{fontSize:11,color:"var(--muted)"}}>
              {(() => { const d=Math.round((new Date(rangeTo)-new Date(rangeFrom))/86400000)+1; return d>0?d+" días":""; })()}
            </span>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn btn-primary btn-sm" disabled={syncing||!token||!cuentas.some(c=>c.adAccountId)} onClick={handleSync}
            style={{background:"var(--accent)"}}>
            {syncing ? "⟳ Sincronizando..." : syncMode==="range"?"⟳ Sincronizar rango":"⟳ Sincronizar"}
          </button>
          {syncStatus && (
            <span className={"fb-sync-badge "+(syncStatus==="ok"?"fb-sync-ok":syncStatus==="err"?"fb-sync-err":syncStatus==="partial"?"fb-sync-loading":"fb-sync-loading")}>
              {syncStatus==="ok"?"✓ Completado":syncStatus==="err"?"✕ Error":syncStatus==="partial"?"⚠ Parcial":"⟳ Sincronizando..."}
            </span>
          )}
        </div>

        {/* Log de sync para rango */}
        {syncLog.length > 0 && (
          <div style={{marginTop:12,maxHeight:160,overflowY:"auto",background:"var(--surface2)",borderRadius:8,padding:"8px 12px"}}>
            {syncLog.map((l,i) => (
              <div key={i} style={{fontSize:11,display:"flex",gap:10,padding:"2px 0",color:"var(--muted)"}}>
                <span style={{fontFamily:"var(--mono)"}}>{l.fecha}</span>
                <span>{l.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sección 5: Alertas de presupuesto ──────────────────────────── */}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>💳 Facturación y alertas de presupuesto</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Monitorea el gasto y recibe alertas en Telegram automáticamente</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Toggle alertas */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--muted)"}}>Alertas</span>
              <div style={{position:"relative",width:36,height:20,cursor:"pointer"}}
                onClick={()=>setBillingAlerts(a=>({...a,enabled:!a.enabled}))}>
                <div style={{position:"absolute",inset:0,borderRadius:10,background:billingAlerts.enabled?"var(--green)":"var(--border)",transition:"background .2s"}}/>
                <div style={{position:"absolute",top:2,left:billingAlerts.enabled?18:2,width:16,height:16,borderRadius:8,background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={fetchBillingData} disabled={loadingBilling||!token||!cuentas.some(c=>c.adAccountId)}>
              {loadingBilling?"⟳":"🔄"} {loadingBilling?"Consultando...":"Consultar"}
            </button>
          </div>
        </div>

        {/* Configuración de umbrales */}
        {billingAlerts.enabled && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"10px 12px",background:"rgba(16,185,129,.06)",borderRadius:8,marginBottom:12,border:"1px solid rgba(16,185,129,.2)"}}>
            <div>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:3}}>⚠️ Alerta cuando quede menos del</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" min="5" max="50" value={billingAlerts.pctThreshold}
                  onChange={e=>setBillingAlerts(a=>({...a,pctThreshold:parseInt(e.target.value)||15}))}
                  style={{width:60,fontSize:13,textAlign:"center"}} />
                <span style={{fontSize:12,color:"var(--muted)"}}>% del límite de gasto</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:3}}>📅 Alerta cuando falten menos de</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" min="1" max="7" value={billingAlerts.diasThreshold}
                  onChange={e=>setBillingAlerts(a=>({...a,diasThreshold:parseInt(e.target.value)||2}))}
                  style={{width:60,fontSize:13,textAlign:"center"}} />
                <span style={{fontSize:12,color:"var(--muted)"}}>días para el próximo cobro</span>
              </div>
            </div>
            <div style={{gridColumn:"1/-1",fontSize:10,color:"var(--muted)"}}>
              {client.tgConfig?.token && (client.tgConfig?.chatIds?.[0]?.chatId || client.tgConfig?.chatId)
                ? "✅ Las alertas se enviarán por Telegram al consultar."
                : "⚠️ Configura Telegram primero para recibir alertas."}
            </div>
          </div>
        )}

        {/* Datos de facturación */}
        {loadingBilling && <div style={{textAlign:"center",padding:"1rem",color:"var(--muted)",fontSize:13}}>⟳ Consultando Facebook Ads...</div>}

        {billingData && !loadingBilling && billingData.map((d,i) => (
          <div key={i} style={{padding:"12px 14px",borderRadius:10,background:"var(--surface2)",marginBottom:8,
            border:`1px solid ${d.error?"rgba(239,68,68,.3)":d.deuda>500?"rgba(239,68,68,.4)":d.deuda>200?"rgba(255,222,89,.3)":"var(--border)"}`}}>
            {d.error ? (
              <div style={{fontSize:12,color:"var(--red)"}}>❌ {d.nombre}: {d.error}</div>
            ) : (
              <>
                {/* Header: nombre + estado */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <span style={{fontWeight:600,fontSize:13}}>{d.nombre}</span>
                    {d.cuentaNombre !== d.nombre && <span style={{fontSize:11,color:"var(--muted)",marginLeft:6}}>({d.cuentaNombre})</span>}
                  </div>
                  <span style={{fontSize:11,padding:"2px 10px",borderRadius:10,fontWeight:700,
                    background:d.deuda>500?"rgba(239,68,68,.15)":d.deuda>200?"rgba(255,222,89,.1)":"rgba(16,185,129,.1)",
                    color:d.deuda>500?"var(--red)":d.deuda>200?"var(--amber)":"var(--green)"}}>
                    {d.deuda>500?"🔴 Cobro inminente":d.deuda>200?"🟡 Acumulando":"🟢 Normal"}
                  </span>
                </div>

                {/* Deuda pendiente — siempre visible si hay deuda */}
                {d.deuda > 0 ? (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"10px 12px",borderRadius:8,marginBottom:8,
                    background:d.deuda>500?"rgba(239,68,68,.08)":d.deuda>200?"rgba(255,222,89,.06)":"rgba(0,74,173,.06)",
                    border:`1px solid ${d.deuda>500?"rgba(239,68,68,.3)":d.deuda>200?"rgba(255,222,89,.3)":"rgba(0,74,173,.2)"}`}}>
                    <div>
                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:2}}>💳 Deuda pendiente con Facebook</div>
                      <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:22,
                        color:d.deuda>500?"var(--red)":d.deuda>200?"var(--amber)":"var(--text)"}}>
                        ${fmtNum(d.deuda,2)}
                      </div>
                    </div>
                    {d.umbral > 0 && (
                      <div style={{textAlign:"right",fontSize:11,color:"var(--muted)"}}>
                        <div>Umbral de cobro</div>
                        <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--text)",fontWeight:600}}>${fmtNum(d.umbral,2)}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{fontSize:12,color:"var(--green)",padding:"6px 10px",background:"rgba(16,185,129,.06)",borderRadius:6,marginBottom:8}}>
                    ✅ Sin deuda pendiente
                  </div>
                )}

                {/* Barra de progreso — solo si hay umbral (spend_cap) configurado */}
                {d.pctUsado !== null && d.deuda > 0 && (
                  <div style={{marginBottom:8}}>
                    <div style={{height:8,background:"rgba(255,255,255,.08)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:Math.min(d.pctUsado,100)+"%",borderRadius:4,transition:"width .5s",
                        background:d.pctUsado>=90?"var(--red)":d.pctUsado>=75?"var(--amber)":"#4d9fff"}}/>
                    </div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>
                      {d.pctUsado.toFixed(1)}% del umbral · {d.restante > 0
                        ? `Faltan $${fmtNum(d.restante,2)} para el cobro automático`
                        : "⚠️ Umbral superado — cobro en proceso"}
                    </div>
                  </div>
                )}

                {/* Gasto histórico total */}
                {d.gastado > 0 && (
                  <div style={{fontSize:11,color:"var(--muted)"}}>
                    Gasto total histórico (toda la cuenta): <span style={{fontFamily:"var(--mono)",color:"var(--text)"}}>${fmtNum(d.gastado,2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {!billingData && !loadingBilling && (
          <div style={{fontSize:12,color:"var(--muted)",textAlign:"center",padding:"1rem"}}>
            Presiona "🔄 Consultar" para ver el estado de facturación de tus cuentas en tiempo real.
          </div>
        )}
      </div>

      {/* ── Sección 6: Campañas activas ──────────────────────────────────── */}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:13}}>📡 Campañas activas ahora</div>
          <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={cargarCampanas} disabled={loadingCamp}>
            {loadingCamp?"⟳ Cargando...":"🔄 Cargar"}
          </button>
        </div>
        {!campaigns && !loadingCamp && (
          <div style={{fontSize:12,color:"var(--muted)",textAlign:"center",padding:"1rem"}}>
            Presiona "Cargar" para ver las campañas activas y pausadas ahora mismo.
          </div>
        )}
        {loadingCamp && <div style={{fontSize:12,color:"var(--muted)",textAlign:"center",padding:"1rem"}}>⟳ Consultando Facebook Ads...</div>}
        {campaigns && campaigns.length === 0 && (
          <div style={{fontSize:12,color:"var(--muted)",textAlign:"center",padding:"1rem"}}>Sin campañas activas en este momento.</div>
        )}
        {campaigns && campaigns.length > 0 && (() => {
          // Agrupar por cuenta
          const grupos = cuentas
            .map(c => ({ cuenta: c, items: campaigns.filter(x => x._cuentaId === c.id) }))
            .filter(g => g.items.length > 0);
          return (
            <div className="scroll-x">
              {grupos.map((g, gi) => (
                <div key={gi} style={{marginBottom: gi < grupos.length-1 ? 16 : 0}}>
                  {/* Encabezado de cuenta — solo si hay más de una */}
                  {cuentas.filter(c=>c.adAccountId).length > 1 && (
                    <div style={{fontSize:11,fontWeight:700,color:"var(--accent2)",textTransform:"uppercase",
                      letterSpacing:".06em",padding:"4px 0 8px",borderBottom:"1px solid var(--border)",marginBottom:8}}>
                      📊 {g.cuenta.nombre} · {g.items.length} campaña{g.items.length!==1?"s":""} activa{g.items.length!==1?"s":""}
                    </div>
                  )}
                  <table className="tbl">
                    <thead><tr>
                      <th>Campaña</th>
                      <th>Objetivo</th>
                      <th style={{textAlign:"right"}}>Presupuesto</th>
                    </tr></thead>
                    <tbody>
                      {g.items.map((c,i) => (
                        <tr key={i}>
                          <td style={{fontWeight:500,fontSize:12,maxWidth:400,wordBreak:"break-word"}}>
                            <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"var(--green)",marginRight:8,flexShrink:0}}/>
                            {c.name}
                          </td>
                          <td style={{fontSize:11,color:"var(--muted)"}}>{(c.objective||"").replace(/_/g," ").toLowerCase()}</td>
                          <td style={{fontFamily:"var(--mono)",textAlign:"right",fontSize:12}}>
                            {c.daily_budget ? "$"+fmtNum(parseFloat(c.daily_budget)/100,2)+"/día"
                              : c.lifetime_budget ? "$"+fmtNum(parseFloat(c.lifetime_budget)/100,2)+" total"
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div style={{fontSize:11,color:"var(--muted)",marginTop:10,textAlign:"right"}}>
                {campaigns.length} campaña{campaigns.length!==1?"s":""} activa{campaigns.length!==1?"s":""} en total
              </div>
            </div>
          );
        })()}
      </div>

      {/* Guardar + nota token */}
      <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
        <button className="btn btn-green btn-sm" disabled={saving} onClick={saveConfig}>
          {saving?"Guardando...":"💾 Guardar configuración"}
        </button>
      </div>

      <div style={{background:"var(--surface2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
        <b style={{color:"var(--amber)"}}>⚠️ Token de larga duración (60 días):</b> El token del panel de desarrolladores dura solo 1-2 horas.
        Para extenderlo: Graph API Explorer → genera token → Exchange for a long-lived token.
        Cuando la app esté aprobada esto será automático.
      </div>
    </>
  );
}


// ─── DETECTAR CHAT ID AUTOMATICAMENTE ────────────────────────────────────────
async function detectarChatId(token) {
  if (!token || token.length < 20) return { ok: false, error: "Token invalido o muy corto" };
  try {
    // 1. Intentar deleteWebhook para liberar getUpdates
    await fetch("https://api.telegram.org/bot" + token + "/deleteWebhook");

    // 2. Consultar getUpdates
    const r = await fetch("https://api.telegram.org/bot" + token + "/getUpdates?limit=20&offset=-20");
    const data = await r.json();

    if (!data.ok) {
      // Si sigue fallando, intentar getWebhookInfo como fallback
      return { ok: false, error: "Error de Telegram: " + (data.description || "desconocido") };
    }

    if (!data.result || data.result.length === 0) {
      return { ok: false, error: "No hay mensajes recientes. Pide al cliente que escriba /start al bot primero." };
    }

    // Extraer todos los chats únicos
    const chats = [];
    const seen = new Set();
    data.result.forEach(upd => {
      const msg = upd.message || upd.edited_message || upd.callback_query?.message;
      if (msg?.chat?.id && !seen.has(msg.chat.id)) {
        seen.add(msg.chat.id);
        chats.push({
          id: String(msg.chat.id),
          nombre: [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ") || msg.chat.username || "Sin nombre",
          username: msg.chat.username || "",
          tipo: msg.chat.type
        });
      }
    });

    if (chats.length === 0) return { ok: false, error: "No se encontraron chats. Pide al cliente que escriba /start." };

    return { ok: true, chats };

  } catch (e) {
    return { ok: false, error: "Error de conexion: " + e.message };
  } finally {
    // 3. Reactivar webhook automáticamente
    try {
      const webhookUrl = window.location.origin + "/api/telegram-webhook";
      await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      });
    } catch {}
  }
}

// ─── TELEGRAM INTEGRATION ────────────────────────────────────────────────────
// Para activar: crear bot en @BotFather en Telegram, obtener token
// El cliente debe iniciar conversacion con el bot una vez para obtener chat_id

function buildReportMessage(client, records) {
  const t = buildTotals(client.niche, records);
  const isWA = client.niche === "whatsapp";
  const isWeb = client.niche === "web";
  const hoy = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  const ultimo = records[records.length - 1];

  let msg = `📊 *Reporte diario - ${client.name}*\n`;
  msg += `📅 ${hoy}\n\n`;
  msg += `💰 *Pauta*\n`;
  msg += `Inversión: $${ultimo?.inversion ?? "—"}\n`;
  msg += `Alcance: ${ultimo?.alcance ?? "—"}\n`;
  msg += `CPM: $${ultimo?.cpm ?? "—"} | CPC: $${ultimo?.cpc ?? "—"} | CTR: ${ultimo?.ctr ?? "—"}%\n\n`;

  if (isWA) {
    msg += `📱 *Ventas WhatsApp*\n`;
    msg += `Leads: ${ultimo?.leads ?? "—"} | Contactados: ${ultimo?.contactados ?? "—"}\n`;
    msg += `Ventas: ${ultimo?.ventas ?? "—"} | Ingresos: $${ultimo?.ingreso ?? "—"}\n`;
    if (ultimo?.leads && ultimo?.ventas) {
      msg += `Tasa de cierre: ${((ultimo.ventas / ultimo.leads) * 100).toFixed(1)}%\n`;
    }
  } else if (isWeb) {
    msg += `🛒 *E-commerce*\n`;
    msg += `Sesiones: ${ultimo?.sesiones ?? "—"} | Compras: ${ultimo?.compras ?? "—"}\n`;
    msg += `Ingresos: $${ultimo?.ingreso ?? "—"} | ROAS: ${ultimo?.roas ?? "—"}x\n`;
  } else {
    msg += `🎯 *Lanzamiento*\n`;
    msg += `Potenciales: ${ultimo?.clientesPotenciales ?? "—"} | Formularios: ${ultimo?.formularios ?? "—"}\n`;
    msg += `Ventas: ${ultimo?.ventas ?? "—"} | Ingresos: $${ultimo?.ingreso ?? "—"}\n`;
  }

  msg += `\n_Enviado desde Trafficker Pro_`;
  return msg;
}

// Reporte APOLLO — formato gasto diario exacto para lanzamientos
function buildReportApollo(client, records) {
  if (!records || !records.length) return null;
  const r = records[records.length - 1];
  const fecha = r.date ? new Date(r.date + "T12:00:00").toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const gasto = parseFloat(r.inversion) || 0;
  const personasFB = parseFloat(r.formularios || r.leads || r.clientesPotenciales) || 0;
  const personasWP = parseFloat(r.personas_wp || r.contactados) || 0;
  const costoFB = personasFB > 0 ? gasto / personasFB : 0;
  const costoWP = personasWP > 0 ? gasto / personasWP : 0;
  const captura = personasFB > 0 && personasWP > 0 ? ((personasWP / personasFB) * 100) : 0;

  // Fase actual de la misión
  const duracion = client.apolloData?.duracion || 21;
  const fechaBase = client.apolloData?.fechaInicioMision || client.contratos?.[0]?.fechaInicio || "";
  const diasMision = fechaBase ? Math.max(0, Math.floor((new Date() - new Date(fechaBase + "T00:00:00")) / 86400000)) : 0;
  const faseIdx = Math.min(Math.floor((diasMision / duracion) * APOLLO_FASES.length), APOLLO_FASES.length - 1);
  const faseActual = APOLLO_FASES[faseIdx];

  const campanas = r.campanas ? `\n📡 *Campañas activas:*\n${r.campanas.split(",").map(c => `• ${c.trim()}`).join("\n")}` : "";
  const notas = r.notas_dia ? `\n📝 ${r.notas_dia}` : "";

  let msg = `🚀 *GASTO DIARIO — ${client.name}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 Fecha: ${fecha}\n`;
  if (faseActual) msg += `${faseActual.icono} Fase: *${faseActual.nombre}* (Día ${diasMision} de ${duracion})\n`;
  msg += `💵 Gasto: $${fmtNum(gasto, 2)}\n`;
  msg += `👥 Personas en FB/LP: ${fmtNum(personasFB)}\n`;
  msg += `📱 Personas en WP: ${fmtNum(personasWP)}\n`;
  msg += `💰 Costo en FB/LP: $${fmtNum(costoFB, 2)}\n`;
  msg += `💰 Costo en WP: $${fmtNum(costoWP, 2)}\n`;
  msg += `📊 % de Captura: ${fmtNum(captura, 2)}%\n`;
  if (r.cpm) msg += `🎯 CPM: $${fmtNum(r.cpm, 2)} | CPC: $${fmtNum(r.cpc || 0, 2)} | CTR: ${fmtNum(r.ctr || 0, 2)}%\n`;
  msg += campanas;
  msg += notas;
  msg += `\n━━━━━━━━━━━━━━━━━━\n_Trafficker Pro · Centro de Control APOLLO_`;
  return msg;
}


async function sendTelegram(token, chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Genera mensaje de cobro basado en contratos del cliente
function buildCobroMessage(client) {
  const contratos = client.contratos || [];
  if (!contratos.length) return null;
  const hoy = new Date();
  let msg = "💰 Recordatorio de pago - " + client.name + "\n\n";
  let hayCuotas = false;
  contratos.forEach((ct, ci) => {
    (ct.cuotas || []).forEach((c, qi) => {
      if (!c.pagado && c.monto) {
        hayCuotas = true;
        const vence = c.fecha ? new Date(c.fecha + "T12:00:00") : null;
        const diasRestantes = vence ? Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24)) : null;
        msg += "Contrato #" + (ci + 1) + " - Cuota " + (qi + 1) + "\n";
        msg += "Monto: $" + (c.monto || "—") + "\n";
        if (c.fecha) msg += "Fecha de pago: " + c.fecha + "\n";
        if (diasRestantes !== null) {
          if (diasRestantes < 0) msg += "VENCIDA hace " + Math.abs(diasRestantes) + " dias\n";
          else if (diasRestantes === 0) msg += "Vence HOY\n";
          else msg += "Vence en " + diasRestantes + " dias\n";
        }
        const svcs = (ct.servicios || []).map(s => s.nombre).filter(Boolean).join(", ");
        if (svcs) msg += "Servicio: " + svcs + "\n";
        if (ct.totalContrato) msg += "Total contrato: $" + ct.totalContrato + "\n";
        msg += "\n";
      }
    });
  });
  if (!hayCuotas) return null;
  msg += "Por favor confirmar el pago para continuar con los servicios.";
  return msg;
}

const PLANTILLAS_DEFAULT = [
  { id: "p1", nombre: "Reporte diario", tipo: "reporte", texto: "" },
  { id: "p2", nombre: "🚀 Gasto diario APOLLO", tipo: "apollo", texto: "" },
  { id: "p3", nombre: "Recordatorio de cobro", tipo: "cobro", texto: "" },
  { id: "p4", nombre: "Mensaje personalizado", tipo: "custom", texto: "" },
];

function TelegramPanel({ client, records, tgConfig, onSaveConfig, onUpdate }) {
  const [token, setToken]     = useState(tgConfig?.token || "");
  const [sending, setSending] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [plantillas, setPlantillas] = useState(tgConfig?.plantillas || PLANTILLAS_DEFAULT);
  const [selectedPlantilla, setSelectedPlantilla] = useState("p1");
  const [editingPlantilla, setEditingPlantilla]   = useState(null);
  const [detecting, setDetecting]     = useState(false);
  const [chatsEncontrados, setChatsEncontrados] = useState([]);
  const [editingMensaje, setEditingMensaje] = useState(false);
  const [mensajeEditado, setMensajeEditado] = useState("");
  const { show, el: toastEl } = useToast();

  // Sub-tabs: mensajeria | programador
  const [subTab, setSubTab] = useState("mensajeria");

  // ── NUEVO: múltiples destinatarios ───────────────────────────────────────
  const [chatIds, setChatIds] = useState(() => {
    if (tgConfig?.chatIds?.length) return tgConfig.chatIds;
    const legacyChatId = tgConfig?.chatId || client.telefono || "";
    return [{ id: 1, nombre: client.name || "Cliente", chatId: legacyChatId }];
  });

  // ── NUEVO: historial de envíos ────────────────────────────────────────────
  const [historial, setHistorial]       = useState(tgConfig?.historial || []);
  const [showHistorial, setShowHistorial] = useState(false);

  // ── NUEVO: webhook bot ────────────────────────────────────────────────────
  const [showWebhook, setShowWebhook]     = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);

  const chatIdPrincipal = chatIds[0]?.chatId || "";

  function addDestinatario() {
    if (chatIds.length >= 5) return show("Máximo 5 destinatarios", "err");
    setChatIds(p => [...p, { id: Date.now(), nombre: "Destinatario " + (p.length + 1), chatId: "" }]);
  }
  function updateDest(id, field, val) {
    setChatIds(p => p.map(d => d.id === id ? { ...d, [field]: val } : d));
  }
  function removeDest(id) {
    if (chatIds.length <= 1) return show("Debe quedar al menos un destinatario", "err");
    setChatIds(p => p.filter(d => d.id !== id));
  }

  useEffect(() => {
    if (tgConfig?.plantillas) setPlantillas(tgConfig.plantillas);
  }, [client.id]);

  async function handleDetectarChatId() {
    if (!token) return show("Ingresa el Bot Token primero", "err");
    setDetecting(true); setChatsEncontrados([]);
    const result = await detectarChatId(token);
    if (result.ok) {
      if (result.chats.length === 1) {
        updateDest(chatIds[0].id, "chatId", result.chats[0].id);
        show("✓ Chat ID detectado: " + result.chats[0].id, "ok");
      } else {
        setChatsEncontrados(result.chats);
        show(result.chats.length + " chats — selecciona el correcto", "ok");
      }
    } else { show("No se pudo detectar: " + result.error, "err"); }
    setDetecting(false);
  }

  const lastRecord = records && records.length > 0 ? [records[records.length - 1]] : [];

  // ── NUEVO: variables dinámicas ────────────────────────────────────────────
  function resolverVariables(texto) {
    if (!texto) return texto;
    const hoy   = new Date();
    const ult   = records?.length ? records[records.length - 1] : null;
    const inv   = ult ? parseFloat(ult.inversion) || 0 : 0;
    const leads = ult ? parseFloat(ult.resultados || ult.formularios || ult.leads) || 0 : 0;
    const cpl   = leads > 0 ? inv / leads : 0;
    return texto
      .replace(/\{\{nombre\}\}/gi, client.name || "")
      .replace(/\{\{fecha\}\}/gi, hoy.toLocaleDateString("es-EC"))
      .replace(/\{\{inversion\}\}/gi, "$" + fmtNum(inv, 2))
      .replace(/\{\{leads\}\}/gi, fmtNum(leads))
      .replace(/\{\{cpl\}\}/gi, cpl > 0 ? "$" + fmtNum(cpl, 2) : "—")
      .replace(/\{\{producto\}\}/gi, client.producto || "")
      .replace(/\{\{mes\}\}/gi, hoy.toLocaleDateString("es-EC", { month: "long" }));
  }

  function getMensaje() {
    try {
      const p = plantillas.find(x => x.id === selectedPlantilla);
      if (!p) return "";
      if (p.tipo === "reporte") return lastRecord.length ? buildReportMessage(client, lastRecord) : "";
      if (p.tipo === "apollo")  return lastRecord.length ? (buildReportApollo(client, lastRecord) || buildReportMessage(client, lastRecord)) : "";
      if (p.tipo === "cobro")   return buildCobroMessage(client) || "No hay cuotas pendientes para este cliente.";
      return resolverVariables(p.texto || "");
    } catch (e) { return ""; }
  }

  const mensajeBase = getMensaje();
  useEffect(() => { setEditingMensaje(false); setMensajeEditado(""); }, [selectedPlantilla]);
  const mensajeFinal = editingMensaje ? mensajeEditado : mensajeBase;
  const preview      = mensajeFinal ? mensajeFinal.replace(/[*_]/g, "") : "";

  async function saveConfig(extra = {}) {
    setSaving(true);
    await onSaveConfig({ token, chatId: chatIdPrincipal, chatIds, plantillas, historial, ...extra });
    show("✓ Configuración guardada", "ok");
    setSaving(false);
  }

  // ── NUEVO: prueba de conexión ─────────────────────────────────────────────
  async function enviarPrueba() {
    if (!token || !chatIdPrincipal) return show("Completa el token y chat ID primero", "err");
    setSending(true);
    const msg = `✅ *Trafficker Pro conectado*\n\nHola ${client.name || ""}! Tu bot está funcionando.\n\nEscribe /ayuda para ver los comandos disponibles.\n\n_${new Date().toLocaleString("es-EC")}_`;
    const result = await sendTelegram(token, chatIdPrincipal, msg);
    show(result.ok ? "✓ Prueba enviada correctamente" : "Error: " + result.error, result.ok ? "ok" : "err");
    setSending(false);
  }

  // ── NUEVO: enviar a todos los destinatarios + guardar historial ───────────
  async function send() {
    if (!token) return show("Completa el token primero", "err");
    if (!mensajeFinal) return show("No hay mensaje para enviar", "err");
    const activos = chatIds.filter(d => d.chatId);
    if (!activos.length) return show("Agrega al menos un Chat ID", "err");
    setSending(true);
    let ok = 0, err = 0;
    for (const dest of activos) {
      const result = await sendTelegram(token, dest.chatId, mensajeFinal);
      if (result.ok) ok++; else err++;
    }
    const p = plantillas.find(x => x.id === selectedPlantilla);
    const entrada = { id: Date.now(), fecha: new Date().toLocaleString("es-EC"), plantilla: p?.nombre || "—", destinatarios: ok, estado: err === 0 ? "ok" : ok > 0 ? "parcial" : "err" };
    const nuevoHistorial = [entrada, ...historial].slice(0, 30);
    setHistorial(nuevoHistorial);
    await onSaveConfig({ token, chatId: chatIdPrincipal, chatIds, plantillas, historial: nuevoHistorial });
    show(ok > 0 ? `✓ Enviado a ${ok} destinatario${ok !== 1 ? "s" : ""}${err > 0 ? " · " + err + " fallaron" : ""}` : "Error al enviar", ok > 0 ? "ok" : "err");
    setSending(false);
  }

  // ── NUEVO: webhook ────────────────────────────────────────────────────────
  async function configurarWebhook() {
    if (!token) return show("Ingresa el Bot Token primero", "err");
    setWebhookStatus("loading");
    const webhookUrl = (typeof window !== "undefined" ? window.location.origin : "https://trafficker-app.vercel.app") + "/api/telegram-webhook";
    try {
      const res  = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: webhookUrl }) });
      const data = await res.json();
      if (data.ok) { setWebhookStatus("ok"); show("✓ Webhook activado — el bot ya responde mensajes", "ok"); }
      else { setWebhookStatus("err"); show("Error: " + data.description, "err"); }
    } catch (e) { setWebhookStatus("err"); show("Error: " + e.message, "err"); }
  }

  async function verificarWebhook() {
    if (!token) return show("Ingresa el Bot Token primero", "err");
    try {
      const res  = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      const url  = data.result?.url || "";
      const expected = (typeof window !== "undefined" ? window.location.origin : "") + "/api/telegram-webhook";
      if (url === expected) { setWebhookStatus("ok"); show("✓ Webhook activo y correcto", "ok"); }
      else if (url) { setWebhookStatus("err"); show("Webhook apunta a: " + url, "err"); }
      else { setWebhookStatus("none"); show("Sin webhook configurado", "err"); }
    } catch (e) { show("Error: " + e.message, "err"); }
  }

  function updPlantilla(id, k, v) { setPlantillas(p => p.map(x => x.id === id ? { ...x, [k]: v } : x)); }
  function addPlantilla() {
    if (plantillas.length >= 5) return show("Máximo 5 plantillas", "err");
    setPlantillas(p => [...p, { id: "p" + Date.now(), nombre: "Nueva plantilla", tipo: "custom", texto: "" }]);
  }

  return (
    <>
      {toastEl}

      {/* Sub-tabs: Mensajería | Programador */}
      <div className="tab-row" style={{ marginBottom:"1.25rem" }}>
        <button className={`tab ${subTab === "mensajeria" ? "active" : ""}`} onClick={() => setSubTab("mensajeria")}>✈️ Mensajería</button>
        <button className={`tab ${subTab === "programador" ? "active" : ""}`} onClick={() => setSubTab("programador")}>⏰ Programador</button>
      </div>

      {subTab === "programador" && (
        <SchedulerPanel client={client} onUpdate={onUpdate || (async () => {})} />
      )}

      {subTab === "mensajeria" && <>
      {/* ── Config: token + destinatarios ───────────────────────────────── */}
      <div className="tg-card">
        <div className="tg-header">
          <span style={{ fontSize: 18 }}>✈️</span> Mensajería por Telegram
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
          <b style={{ color: "var(--text)" }}>Configuración (una sola vez):</b><br/>
          1. Busca <b>@BotFather</b> en Telegram, escribe /newbot, copia el Token<br/>
          2. El cliente busca tu bot y le da <b>/start</b><br/>
          3. Clic en <b>"Detectar"</b> — lo encuentra automáticamente ✓
        </div>

        <div className="field">
          <label>Bot Token</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="text" value={token} onChange={e => { setToken(e.target.value); setChatsEncontrados([]); }} placeholder="1234567890:ABCdef..." style={{ flex: 1 }} />
          </div>
        </div>

        {/* Destinatarios */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Destinatarios ({chatIds.length})</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={handleDetectarChatId} disabled={detecting || !token}>{detecting ? "⟳" : "🔍 Detectar"}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={addDestinatario}>+ Añadir</button>
            </div>
          </div>
          {chatIds.map((d, i) => (
            <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "end" }}>
              <div>
                {i === 0 && <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>Nombre</div>}
                <input type="text" value={d.nombre} onChange={e => updateDest(d.id, "nombre", e.target.value)} placeholder="Ej: Cliente, Socio..." style={{ width: "100%", fontSize: 12 }} />
              </div>
              <div>
                {i === 0 && <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>Chat ID</div>}
                <input type="text" value={d.chatId} onChange={e => updateDest(d.id, "chatId", e.target.value)} placeholder="123456789" style={{ width: "100%", fontSize: 12 }} />
              </div>
              <button onClick={() => removeDest(d.id)} disabled={chatIds.length <= 1}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: "0 4px", alignSelf: "center", opacity: chatIds.length <= 1 ? .3 : 1 }}>×</button>
            </div>
          ))}
        </div>

        {/* Chats detectados */}
        {chatsEncontrados.length > 1 && (
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 12, marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent2)", marginBottom: 8 }}>{chatsEncontrados.length} conversaciones — selecciona:</div>
            {chatsEncontrados.map(c => (
              <div key={c.id} onClick={() => { updateDest(chatIds[0].id, "chatId", c.id); setChatsEncontrados([]); show("✓ " + c.id, "ok"); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: chatIdPrincipal === c.id ? "rgba(0,74,173,.2)" : "var(--bg)", border: "1px solid " + (chatIdPrincipal === c.id ? "var(--accent)" : "var(--border)") }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,74,173,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--accent2)" }}>{c.nombre.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.username ? "@" + c.username + " · " : ""}ID: {c.id}</div>
                </div>
                {chatIdPrincipal === c.id && <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        )}

        {chatIdPrincipal && token && (
          <div style={{ fontSize: 12, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--green)", fontWeight: 700 }}>●</span>
            <span style={{ color: "var(--muted)" }}>Configurado · Chat ID: <span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{chatIdPrincipal}</span>
              {chatIds.length > 1 && <span style={{ marginLeft: 6, color: "var(--accent2)" }}>+{chatIds.length - 1} más</span>}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => saveConfig()}>💾 Guardar</button>
          <button className="btn btn-ghost btn-sm" disabled={sending || !token || !chatIdPrincipal} onClick={enviarPrueba}>📨 Prueba de conexión</button>
        </div>
      </div>

      {/* ── Bot inteligente (webhook) ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "1rem", borderColor: "rgba(124,58,237,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showWebhook ? 12 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>🤖 Bot inteligente</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>El cliente consulta métricas escribiéndole al bot 24/7</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShowWebhook(v => !v)}>{showWebhook ? "Ocultar" : "⚙️ Configurar"}</button>
        </div>
        {showWebhook && (
          <div style={{ padding: "12px 14px", background: "var(--surface2)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, lineHeight: 1.7 }}>
              Sube <code>api/telegram-webhook.js</code> a tu repo en Vercel, luego activa el webhook aquí.<br/>
              <b>Comandos disponibles:</b> /hoy · /semana · /mes · /mision · /captura · /proyeccion · /contrato + lenguaje natural con IA
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-primary btn-sm" style={{ background: "rgba(124,58,237,.8)" }} onClick={configurarWebhook} disabled={!token || webhookStatus === "loading"}>
                {webhookStatus === "loading" ? "⟳ Configurando..." : "🔗 Activar webhook"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={verificarWebhook} disabled={!token}>🔍 Verificar</button>
              {webhookStatus === "ok"   && <span style={{ color: "var(--green)",  fontSize: 12 }}>✅ Activo</span>}
              {webhookStatus === "err"  && <span style={{ color: "var(--red)",    fontSize: 12 }}>❌ Error</span>}
              {webhookStatus === "none" && <span style={{ color: "var(--amber)",  fontSize: 12 }}>⚠️ Sin configurar</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Plantillas ───────────────────────────────────────────────────── */}
      <div className="tg-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Plantillas ({plantillas.length}/5)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {editingPlantilla && <button className="btn btn-green btn-sm" onClick={async () => { setEditingPlantilla(null); await saveConfig(); }}>💾 Guardar cambios</button>}
            <button className="btn btn-ghost btn-sm" onClick={addPlantilla}>+ Añadir</button>
          </div>
        </div>

        {plantillas.map(p => {
          const isEditing  = editingPlantilla === p.id;
          const isSelected = selectedPlantilla === p.id;
          return (
            <div key={p.id} className={"tg-plantilla-view " + (isSelected ? "selected" : "")} onClick={() => !isEditing && setSelectedPlantilla(p.id)}>
              {isEditing ? (
                <div onClick={e => e.stopPropagation()}>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Nombre</label>
                      <input type="text" value={p.nombre} onChange={e => updPlantilla(p.id, "nombre", e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Tipo</label>
                      <select value={p.tipo} onChange={e => updPlantilla(p.id, "tipo", e.target.value)}>
                        <option value="reporte">Reporte diario (automático)</option>
                        <option value="apollo">🚀 Gasto diario APOLLO</option>
                        <option value="cobro">Recordatorio de cobro</option>
                        <option value="custom">Mensaje personalizado</option>
                      </select>
                    </div>
                  </div>
                  {p.tipo === "custom" && (
                    <div className="field" style={{ marginBottom: 4 }}>
                      <label>Texto del mensaje</label>
                      <textarea value={p.texto || ""} onChange={e => updPlantilla(p.id, "texto", e.target.value)}
                        placeholder="Hola {{nombre}}! Hoy {{fecha}} invertiste {{inversion}} y obtuviste {{leads}} leads (CPL {{cpl}})."
                        style={{ minHeight: 80 }} />
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                        Variables: <code>{"{{nombre}}"}</code> <code>{"{{fecha}}"}</code> <code>{"{{inversion}}"}</code> <code>{"{{leads}}"}</code> <code>{"{{cpl}}"}</code> <code>{"{{producto}}"}</code> <code>{"{{mes}}"}</code>
                      </div>
                    </div>
                  )}
                  {p.tipo === "reporte" && <div style={{ fontSize: 11, color: "var(--muted)" }}>Genera automáticamente con los datos del último registro diario.</div>}
                  {p.tipo === "cobro"   && <div style={{ fontSize: 11, color: "var(--muted)" }}>Genera automáticamente con las cuotas pendientes del contrato.</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingPlantilla(null)}>Cancelar</button>
                    {plantillas.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => { setPlantillas(prev => prev.filter(x => x.id !== p.id)); setEditingPlantilla(null); setSelectedPlantilla(plantillas[0]?.id); }}>Eliminar</button>}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {p.tipo === "reporte" ? "Reporte automático" : p.tipo === "cobro" ? "Recordatorio de cobro" : p.tipo === "apollo" ? "🚀 APOLLO" : "Personalizado"}
                      {isSelected && <span style={{ color: "var(--accent2)", marginLeft: 8 }}>● Seleccionada</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingPlantilla(p.id); setSelectedPlantilla(p.id); }} title="Editar">&#9998;</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Vista previa */}
        {mensajeBase && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                {editingMensaje ? "Editando mensaje" : "Vista previa"}
              </div>
              {editingMensaje
                ? <button className="btn btn-ghost btn-sm" onClick={() => { setEditingMensaje(false); setMensajeEditado(""); }}>Restaurar original</button>
                : <button className="btn btn-ghost btn-sm" onClick={() => { setEditingMensaje(true); setMensajeEditado(mensajeBase.replace(/[*_]/g, "")); }}>✏️ Editar</button>
              }
            </div>
            {editingMensaje
              ? <textarea value={mensajeEditado} onChange={e => setMensajeEditado(e.target.value)} style={{ width: "100%", minHeight: 220, background: "var(--bg)", border: "1px solid var(--accent2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "var(--mono)", color: "var(--text)", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
              : <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "var(--mono)", color: "var(--text)", whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto", lineHeight: 1.6, border: "1px solid var(--border)" }}>{preview}</div>
            }
          </div>
        )}

        {!mensajeBase && (
          <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--muted)", marginBottom: "1rem" }}>
            {(() => {
              const p = plantillas.find(x => x.id === selectedPlantilla);
              if (!p) return "Selecciona una plantilla.";
              if (p.tipo === "reporte") return "Agrega un registro diario para generar el reporte.";
              if (p.tipo === "cobro")   return "Este cliente no tiene contratos con cuotas pendientes.";
              return "Edita el texto de esta plantilla haciendo clic en el lápiz ✏️.";
            })()}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary" disabled={sending || !mensajeFinal} onClick={send} style={{ background: "var(--accent)" }}>
            {sending ? "Enviando..." : chatIds.length > 1 ? `📤 Enviar a ${chatIds.filter(d => d.chatId).length} destinatarios` : "📤 Enviar mensaje"}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => saveConfig()}>💾 Guardar todo</button>
        </div>
      </div>

      {/* ── Historial de envíos ──────────────────────────────────────────── */}
      {historial.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Historial de envíos</div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShowHistorial(v => !v)}>
              {showHistorial ? "Ocultar" : "Ver " + historial.length}
            </button>
          </div>
          {showHistorial && (
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead><tr><th>Fecha</th><th>Plantilla</th><th>Dest.</th><th>Estado</th></tr></thead>
              <tbody>
                {historial.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{h.fecha}</td>
                    <td>{h.plantilla}</td>
                    <td style={{ textAlign: "center" }}>{h.destinatarios}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, background: h.estado === "ok" ? "rgba(16,185,129,.15)" : h.estado === "parcial" ? "rgba(255,222,89,.1)" : "rgba(239,68,68,.1)", color: h.estado === "ok" ? "var(--green)" : h.estado === "parcial" ? "var(--amber)" : "var(--red)" }}>
                        {h.estado === "ok" ? "✓ OK" : h.estado === "parcial" ? "⚠ Parcial" : "✕ Error"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      </>}
    </>
  );
}

const DEFAULT_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1j6FZO1DU2sbQDPx3-TUyfIQQ7IkaK8wkY4psvhdHW0M";

function extractSheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// RemarketingTable — componente separado para evitar useState ilegal en render

// ─── MÓDULO CALIDAD DE LEAD ────────────────────────────────────────────────────
function CalidadLeadPanel({ client, onUpdate, readOnly }) {
  const sheetConfig  = client.capturaConfig || {};
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState(client.calidadData || null);
  const [nivelVista, setNivel]  = useState("anuncio");
  const [sortKey, setSortKey]   = useState("score_prom");
  const [sortDir, setSortDir]   = useState("desc");
  const [filtro, setFiltro]     = useState("");
  const { show, el: toastEl }   = useToast();

  async function cargarCalidad() {
    const sheetId = extractSheetId(sheetConfig.url || "");
    const apiKey  = sheetConfig.apiKey || "";
    if (!sheetId || !apiKey) return show("Configura el Google Sheet en la tab 📊 Captura WP primero", "err");
    setLoading(true);
    try {
      const range = encodeURIComponent("__trafficker_calidad__!A1");
      const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      const res   = await fetch(url);
      const json  = await res.json();
      if (json.error) { show("Error: " + json.error.message, "err"); setLoading(false); return; }
      const raw = json.values?.[0]?.[0];
      if (!raw) { show("Sin datos. Ejecuta 'Análisis completo + Exportar' en el sheet.", "err"); setLoading(false); return; }
      const parsed = JSON.parse(raw);
      setData(parsed);
      await onUpdate({ ...client, calidadData: parsed });
      show("✓ " + parsed.total_respuestas + " respuestas cargadas · Score " + parsed.score_promedio + "%", "ok");
    } catch(e) { show("Error: " + e.message, "err"); }
    setLoading(false);
  }

  const scoreColor = (s) => s >= 70 ? "var(--green)" : s >= 40 ? "var(--amber)" : "var(--red)";
  const scoreBg    = (s) => s >= 70 ? "rgba(16,185,129,.15)" : s >= 40 ? "rgba(255,222,89,.15)" : "rgba(239,68,68,.15)";

  const porAnuncio = data?.por_anuncio || [];
  const filtrados  = porAnuncio
    .filter(i => !filtro || i.anuncio.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a,b) => sortDir==="desc" ? b[sortKey]-a[sortKey] : a[sortKey]-b[sortKey]);

  function SortTh({ label, k }) {
    const active = sortKey === k;
    return (
      <th style={{ cursor:"pointer", userSelect:"none", color: active ? "var(--accent2)" : "" }}
        onClick={() => { if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(k); setSortDir("desc"); } }}>
        {label} {active ? (sortDir==="desc"?"▼":"▲") : "⇅"}
      </th>
    );
  }

  return (
    <>
      {toastEl}
      <div>
        {/* Botón sync — solo admin */}
        {!readOnly && (
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem", gap:8 }}>
            <button className="btn btn-primary btn-sm" disabled={loading} onClick={cargarCalidad}>
              {loading ? "⏳ Cargando..." : "🔄 Sincronizar calidad"}
            </button>
          </div>
        )}

        {!data && (
          <div className="card" style={{ background:"rgba(255,222,89,.05)", borderColor:"rgba(255,222,89,.2)" }}>
            <div style={{ fontWeight:600, marginBottom:10 }}>⭐ Cómo configurar Calidad de Lead</div>
            <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.8 }}>
              <div>1. Conecta tu Google Form de encuesta al mismo Google Sheet</div>
              <div>2. Renombra la hoja de respuestas a <strong>"Encuesta Calidad"</strong></div>
              <div>3. Asegúrate que haya columnas: <code>telefono</code>, <code>email</code>, <code>score</code></div>
              <div>4. Ejecuta <strong>🚀 Trafficker Pro → Análisis completo + Exportar</strong> en el sheet</div>
              <div>5. Regresa aquí y presiona <strong>Sincronizar calidad</strong></div>
            </div>
          </div>
        )}

        {data && (
          <div>
            {/* Tarjetas resumen */}
            <div className="grid4" style={{ marginBottom:"1rem" }}>
              <div className="card" style={{ padding:"1rem", textAlign:"center" }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Respuestas totales</div>
                <div style={{ fontSize:24, fontFamily:"var(--mono)", fontWeight:700, color:"var(--accent2)" }}>{data.total_respuestas}</div>
              </div>
              <div className="card" style={{ padding:"1rem", textAlign:"center", background:scoreBg(data.score_promedio) }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Score promedio</div>
                <div style={{ fontSize:24, fontFamily:"var(--mono)", fontWeight:700, color:scoreColor(data.score_promedio) }}>{data.score_promedio}%</div>
              </div>
              <div className="card" style={{ padding:"1rem" }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>Distribución de calidad</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[["🟢 Alta", data.distribucion?.alta||0, "var(--green)"],
                    ["🟡 Media", data.distribucion?.media||0, "var(--amber)"],
                    ["🔴 Baja", data.distribucion?.baja||0, "var(--red)"]].map(([l,v,c])=>(
                    <div key={l} style={{ textAlign:"center", flex:1 }}>
                      <div style={{ fontSize:16, fontFamily:"var(--mono)", fontWeight:700, color:c }}>{v}</div>
                      <div style={{ fontSize:9, color:"var(--muted)" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding:"1rem" }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>% Alta calidad</div>
                {(() => {
                  const total = data.total_respuestas || 1;
                  const alta  = data.distribucion?.alta || 0;
                  const pct   = (alta/total*100).toFixed(1);
                  return (
                    <div>
                      <div style={{ fontSize:22, fontFamily:"var(--mono)", fontWeight:700, color: scoreColor(parseFloat(pct)) }}>{pct}%</div>
                      <div style={{ background:"var(--surface2)", borderRadius:20, height:6, marginTop:6, overflow:"hidden" }}>
                        <div style={{ width:pct+"%", height:"100%", background:"var(--green)", borderRadius:20 }}/>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Tabla por anuncio */}
            <div style={{ display:"flex", gap:8, marginBottom:"1rem", flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ fontWeight:600, fontSize:13 }}>Calidad por anuncio</div>
              <div style={{ position:"relative", flex:1, maxWidth:280 }}>
                <input type="text" value={filtro} onChange={e=>setFiltro(e.target.value)}
                  placeholder="Buscar anuncio..." style={{ paddingLeft:28, fontSize:12 }} />
                <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }}>🔍</span>
              </div>
              {filtro && <button className="btn btn-ghost btn-sm" onClick={()=>setFiltro("")}>×</button>}
              <BotonesExportar
                headers={["Anuncio","Respuestas","Score Prom.","Alta","Media","Baja","% Alta"]}
                rows={filtrados.map(i=>[i.anuncio,i.total,i.score_prom+"%",i.alta,i.media,i.baja,i.pct_alta+"%"])}
                nombreArchivo="calidad_leads"
              />
            </div>

            {filtrados.length === 0 ? (
              <div className="empty"><div style={{opacity:.3,fontSize:24}}>⭐</div><div style={{marginTop:6}}>Sin datos de calidad aún.</div></div>
            ) : (
              <div className="card scroll-x">
                <table className="tbl">
                  <thead><tr>
                    <th>#</th>
                    <SortTh label="Anuncio" k="anuncio" />
                    <SortTh label="Respuestas" k="total" />
                    <SortTh label="Score prom." k="score_prom" />
                    <SortTh label="🟢 Alta" k="alta" />
                    <SortTh label="🟡 Media" k="media" />
                    <SortTh label="🔴 Baja" k="baja" />
                    <SortTh label="% Alta" k="pct_alta" />
                    <th>Calidad</th>
                  </tr></thead>
                  <tbody>
                    {filtrados.map((item, i) => {
                      const ranking = i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1);
                      const barW = item.total > 0 ? (item.alta/item.total*100) : 0;
                      return (
                        <tr key={i}>
                          <td style={{ textAlign:"center", fontWeight:700, fontSize:13 }}>{ranking}</td>
                          <td style={{ fontWeight:500, maxWidth:260, wordBreak:"break-word", fontSize:12 }}>{item.anuncio}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{item.total}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:700, color:scoreColor(item.score_prom) }}>
                            {item.score_prom}%
                          </td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)", fontWeight:600 }}>{item.alta}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--amber)" }}>{item.media}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--red)" }}>{item.baja}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:scoreColor(item.pct_alta), fontWeight:600 }}>{item.pct_alta}%</td>
                          <td style={{ minWidth:100 }}>
                            <div style={{ display:"flex", gap:2, height:10, borderRadius:4, overflow:"hidden", background:"var(--surface2)" }}>
                              <div style={{ width:barW+"%", background:"var(--green)" }}/>
                              <div style={{ width:(item.media/item.total*100)+"%", background:"var(--amber)" }}/>
                              <div style={{ width:(item.baja/item.total*100)+"%", background:"var(--red)" }}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filtrados.length > 1 && (
                    <tfoot><tr style={{ fontWeight:600, background:"rgba(255,222,89,.08)" }}>
                      <td colSpan={2}>TOTAL ({filtrados.length} anuncios)</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{filtrados.reduce((a,i)=>a+i.total,0)}</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:scoreColor(data.score_promedio), fontWeight:700 }}>{data.score_promedio}%</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)" }}>{data.distribucion?.alta||0}</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--amber)" }}>{data.distribucion?.media||0}</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--red)" }}>{data.distribucion?.baja||0}</td>
                      <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:scoreColor((data.distribucion?.alta||0)/data.total_respuestas*100) }}>
                        {data.total_respuestas>0?((data.distribucion?.alta||0)/data.total_respuestas*100).toFixed(1):0}%
                      </td>
                      <td/>
                    </tr></tfoot>
                  )}
                </table>
              </div>
            )}

            <div style={{ fontSize:10, color:"var(--muted)", marginTop:8, textAlign:"right" }}>
              {!readOnly && <button className="btn btn-ghost btn-sm" style={{fontSize:10}} disabled={loading} onClick={cargarCalidad}>🔄 Actualizar</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── PANEL DE NÚMEROS SIN IDENTIFICAR ────────────────────────────────────────
function SinIdentificarPanel({ data, client, onUpdate }) {
  const sinIdentificar = data?.sinAnuncioIdentificado || [];
  const asignaciones = client.capturaConfig?.asignacionesManuales || {};
  const [localAsig, setLocalAsig] = useState(asignaciones);
  const [saving, setSaving] = useState(false);
  const { show, el: toastEl } = useToast();

  // Obtener lista de anuncios disponibles del análisis
  const anunciosDisp = (data?.niveles?.anuncio || []).map(a => a.nombre).filter(Boolean);

  async function guardarAsignaciones() {
    setSaving(true);
    const updated = { ...client, capturaConfig: { ...client.capturaConfig, asignacionesManuales: localAsig } };
    await onUpdate(updated);
    show("✓ Asignaciones guardadas", "ok");
    setSaving(false);
  }

  if (sinIdentificar.length === 0) return (
    <div className="empty"><div style={{ fontSize:24, opacity:.3 }}>✅</div><div style={{ marginTop:8 }}>Todos los contactos tienen anuncio identificado.</div></div>
  );

  return (
    <>
      {toastEl}
      <div>
        <div style={{ background:"rgba(255,222,89,.08)", border:"1px solid rgba(255,222,89,.25)", borderRadius:10, padding:"10px 14px", marginBottom:"1rem", fontSize:12 }}>
          <strong>⚠️ {sinIdentificar.length} contactos</strong> están en el grupo de WhatsApp y tienen registro en el formulario, pero <strong>no se pudo identificar el anuncio de origen</strong> (campo ad_name vacío en Facebook). Puedes asignarlos manualmente para que no queden fuera del análisis.
        </div>

        <div className="card scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Teléfono</th>
                <th>País</th>
                <th>Nombre</th>
                <th>Asignar al anuncio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sinIdentificar.map((c, i) => {
                const asignado = localAsig[c.tel] || "";
                return (
                  <tr key={i} style={{ background: asignado ? "rgba(16,185,129,.04)" : "" }}>
                    <td style={{ color:"var(--muted)", fontSize:11, textAlign:"center" }}>{i+1}</td>
                    <td style={{ fontFamily:"var(--mono)", fontSize:12 }}>{c.tel}</td>
                    <td style={{ fontSize:12 }}>{c.pais || "—"}</td>
                    <td style={{ fontSize:12 }}>{c.nombre || "—"}</td>
                    <td>
                      <select
                        value={asignado}
                        onChange={e => setLocalAsig(p => ({ ...p, [c.tel]: e.target.value }))}
                        style={{ fontSize:12, minWidth:200 }}>
                        <option value="">-- Sin asignar --</option>
                        {anunciosDisp.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                        <option value="__organico__">Orgánico / Sin anuncio</option>
                        <option value="__equipo__">Miembro del equipo</option>
                        <option value="__prueba__">Registro de prueba</option>
                      </select>
                    </td>
                    <td>
                      {asignado === "__organico__" && <span style={{ fontSize:10, color:"var(--muted)" }}>Orgánico</span>}
                      {asignado === "__equipo__" && <span style={{ fontSize:10, color:"var(--muted)" }}>Equipo</span>}
                      {asignado === "__prueba__" && <span style={{ fontSize:10, color:"var(--red)" }}>Prueba</span>}
                      {asignado && !asignado.startsWith("__") && <span style={{ fontSize:10, color:"var(--green)" }}>✓ Asignado</span>}
                      {!asignado && <span style={{ fontSize:10, color:"var(--accent2)" }}>Pendiente</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop:"1rem", display:"flex", gap:8, alignItems:"center" }}>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={guardarAsignaciones}>
            {saving ? "Guardando..." : "💾 Guardar asignaciones"}
          </button>
          <span style={{ fontSize:12, color:"var(--muted)" }}>
            {Object.values(localAsig).filter(Boolean).length} de {sinIdentificar.length} asignados
          </span>
        </div>
      </div>
    </>
  );
}

function RemarketingTable({ data, readOnly }) {
  const [filtroRem, setFiltroRem] = useState("");
  const [nivelRem, setNivelRem]   = useState("anuncio");
  const [sortKey, setSortKey]     = useState("pendientes");
  const [sortDir, setSortDir]     = useState("desc");

  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  }
  function SortTh({ label, k, align = "right" }) {
    const active = sortKey === k;
    return (
      <th style={{ cursor:"pointer", userSelect:"none", textAlign:align, color: active ? "var(--accent2)" : "", whiteSpace:"nowrap" }}
        onClick={() => toggleSort(k)}>
        {label} {active ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
      </th>
    );
  }

  const remItemsFiltrados = (data.niveles?.[nivelRem] || [])
    .filter(i => i.pendientes > 0)
    .filter(i => !filtroRem || i.nombre.toLowerCase().includes(filtroRem.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      return sortDir === "desc" ? vb - va : va - vb;
    });

  function descargar(tipo) {
    const items = (data.niveles?.[nivelRem] || []).filter(i => i.pendientes > 0);
    const fecha = new Date().toISOString().slice(0,10);
    // Contactos pendientes con nombre (calculados por app) o solo teléfonos (script)
    const contactos = data.contactosPendientes || (data.telefonosPendientes||[]).map(t=>({tel:t,nombre:""}));
    const tieneNombre = contactos.some(c => c.nombre);

    if (tipo === "telefonos_csv") {
      if (!contactos.length) { alert("Sincroniza los datos primero para generar la lista."); return; }
      // Limpiar cada contacto antes de exportar
      const limpios = contactos.map(c => {
        // Teléfono: solo dígitos, sin p:, sin comillas
        const tel = String(c.tel||"").replace(/[pP]:/g,"").replace(/\D/g,"");
        // Nombre: sin comillas residuales, sin el fragmento p:NUM si quedó pegado
        const nombre = String(c.nombre||"").replace(/["']/g,"").replace(/,?\s*[pP]:\d+$/,"").trim();
        return { nombre, tel };
      }).filter(c => c.tel.length >= 7);

      // Exportar como Excel HTML — dos columnas reales, teléfono forzado a texto
      let html = `<html><head><meta charset="UTF-8"></head><body><table>`;
      html += `<tr><th>Nombre</th><th>Telefono</th></tr>`;
      limpios.forEach(c => {
        html += `<tr><td>${c.nombre}</td><td style="mso-number-format:'@'">${c.tel}</td></tr>`;
      });
      html += `</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `remarketing_contactos_${fecha}.xls`; a.click();

    } else if (tipo === "telefonos_txt") {
      if (!contactos.length) { alert("Sincroniza los datos primero para generar la lista."); return; }
      // Solo números limpios, uno por línea
      const tels = contactos
        .map(c => String(c.tel||"").replace(/[pP]:/g,"").replace(/\D/g,""))
        .filter(t => t.length >= 7);
      const blob = new Blob([tels.join("\n")], { type: "text/plain;charset=utf-8;" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `remarketing_telefonos_${fecha}.txt`; a.click();

    } else if (tipo === "csv") {
      // Resumen analítico por nivel (campaña/conjunto/anuncio)
      let csv = `${nivelRem},Registros FB,Personas WP,Pendientes,% Captura\n`;
      items.forEach(i => { csv += `"${i.nombre}",${i.total_form},${i.total_wp},${i.pendientes},${i.pct_captura}%\n`; });
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `remarketing_analisis_${nivelRem}_${fecha}.csv`; a.click();

    } else {
      // Excel: resumen analítico como tabla HTML — sin fórmulas
      let html = `<html><head><meta charset="UTF-8"></head><body><table>`;
      html += `<tr><th>${nivelRem}</th><th>Reg. FB</th><th>En WP</th><th>Pendientes</th><th>% Captura</th></tr>`;
      items.forEach(i => { html += `<tr><td>${i.nombre}</td><td>${i.total_form}</td><td>${i.total_wp}</td><td>${i.pendientes}</td><td>${i.pct_captura}%</td></tr>`; });
      html += "</table></body></html>";
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `remarketing_analisis_${nivelRem}_${fecha}.xls`; a.click();
    }
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:"1rem" }}>
        <div className="period-pills">
          {[["campaña","Campaña"],["conjunto","Conjunto"],["anuncio","Anuncio"]].map(([id,lbl]) => (
            <button key={id} className={"pill " + (nivelRem===id ? "active" : "")} onClick={() => setNivelRem(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{ position:"relative", flex:1, maxWidth:260 }}>
          <input type="text" value={filtroRem} onChange={e => setFiltroRem(e.target.value)}
            placeholder="Filtrar..." style={{ paddingLeft:28, fontSize:12 }} />
          <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }}>🔍</span>
        </div>
        {filtroRem && <button className="btn btn-ghost btn-sm" onClick={() => setFiltroRem("")}>×</button>}
        <button className="btn btn-sm" onClick={() => descargar("telefonos_csv")} style={{ background:"rgba(255,145,77,.2)", color:"var(--orange)", border:"1px solid rgba(255,145,77,.4)", whiteSpace:"nowrap" }}>📱 CSV masivos</button>
        <button className="btn btn-sm" onClick={() => descargar("telefonos_txt")} style={{ background:"rgba(255,145,77,.15)", color:"var(--orange)", border:"1px solid rgba(255,145,77,.3)", whiteSpace:"nowrap" }}>📱 TXT masivos</button>
        <button className="btn btn-ghost btn-sm" onClick={() => descargar("csv")}>⬇ CSV</button>
        <button className="btn btn-ghost btn-sm" onClick={() => descargar("xls")}>⬇ Excel</button>
      </div>
      <div className="card scroll-x">
        <table className="tbl">
          <thead><tr>
            <th>#</th>
                    <SortTh label="Nombre" k="nombre" align="left" />
                    <SortTh label="Reg. FB" k="total_form" />
                    <SortTh label="En WP" k="total_wp" />
                    <SortTh label="Pendientes" k="pendientes" />
                    <SortTh label="% Captura" k="pct_captura" />
                    <th>Potencial +30%</th>
          </tr></thead>
          <tbody>
            {remItemsFiltrados.map((item, i) => {
              const potencial = Math.round(item.pendientes * 0.3);
              const pctNew = item.total_form > 0 ? ((item.total_wp + potencial) / item.total_form * 100).toFixed(1) : 0;
              const color = item.pct_captura >= 70 ? "var(--green)" : item.pct_captura >= 50 ? "var(--amber)" : "var(--red)";
              return (
                <tr key={i}>
                  <td style={{ color:"var(--muted)", fontSize:11, textAlign:"center" }}>{i+1}</td>
                  <td style={{ fontWeight:500, fontSize:12, maxWidth:260, wordBreak:"break-word" }}>{item.nombre}</td>
                  <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{item.total_form}</td>
                  <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)" }}>{item.total_wp}</td>
                  <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:700, color:"var(--orange)" }}>{item.pendientes}</td>
                  <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:700, color }}>{item.pct_captura}%</td>
                  <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--accent2)", fontSize:11 }}>+{potencial} → {pctNew}%</td>
                </tr>
              );
            })}
          </tbody>
          {remItemsFiltrados.length > 1 && (
            <tfoot><tr style={{ fontWeight:600, background:"rgba(255,145,77,.08)" }}>
              <td colSpan={2}>TOTAL ({remItemsFiltrados.length})</td>
              <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{remItemsFiltrados.reduce((a,i)=>a+i.total_form,0)}</td>
              <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)" }}>{remItemsFiltrados.reduce((a,i)=>a+i.total_wp,0)}</td>
              <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--orange)", fontWeight:700 }}>{remItemsFiltrados.reduce((a,i)=>a+i.pendientes,0)}</td>
              <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--accent2)" }}>
                {data.total_form > 0 ? (data.total_wp/data.total_form*100).toFixed(1) : 0}%
              </td>
              <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--accent2)", fontSize:11 }}>
                +{Math.round(remItemsFiltrados.reduce((a,i)=>a+i.pendientes,0)*0.3)} potenciales
              </td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function CapturaWPPanel({ client, onUpdate, readOnly }) {
  const sheetConfig = client.capturaConfig || {};
  const [sheetUrl, setSheetUrl] = useState(sheetConfig.url || DEFAULT_SHEETS_URL);
  const [apiKey, setApiKey]     = useState(sheetConfig.apiKey || "");
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState(sheetConfig.lastData || null);
  const [nivel, setNivel]       = useState("anuncio");
  const [sortDir, setSortDir]   = useState("desc");
  const [sortKey, setSortKey]   = useState("pct_captura");
  const [filterText, setFilter] = useState("");
  const [viewTab, setViewTab]   = useState("anuncios"); // anuncios | paises | remarketing
  const { show, el: toastEl }   = useToast();

  // ── Nombres configurables de hojas ───────────────────────────────────────
  const [hojaFB, setHojaFB] = useState(sheetConfig.hojaFB || "Registros");
  const [hojaWP, setHojaWP] = useState(sheetConfig.hojaWP || "Miembros WP");
  const [colNombrePersona, setColNombrePersona] = useState(sheetConfig.colNombrePersona || "");
  const [showHojas, setShowHojas] = useState(false);

  // ── Tabla de prefijos de país ─────────────────────────────────────────────
  const PREFIJOS_PAIS = [
    { prefix:"593", pais:"🇪🇨 Ecuador" },
    { prefix:"57",  pais:"🇨🇴 Colombia" },
    { prefix:"51",  pais:"🇵🇪 Perú" },
    { prefix:"52",  pais:"🇲🇽 México" },
    { prefix:"54",  pais:"🇦🇷 Argentina" },
    { prefix:"56",  pais:"🇨🇱 Chile" },
    { prefix:"58",  pais:"🇻🇪 Venezuela" },
    { prefix:"502", pais:"🇬🇹 Guatemala" },
    { prefix:"503", pais:"🇸🇻 El Salvador" },
    { prefix:"504", pais:"🇭🇳 Honduras" },
    { prefix:"505", pais:"🇳🇮 Nicaragua" },
    { prefix:"506", pais:"🇨🇷 Costa Rica" },
    { prefix:"507", pais:"🇵🇦 Panamá" },
    { prefix:"591", pais:"🇧🇴 Bolivia" },
    { prefix:"595", pais:"🇵🇾 Paraguay" },
    { prefix:"598", pais:"🇺🇾 Uruguay" },
    { prefix:"53",  pais:"🇨🇺 Cuba" },
    { prefix:"1",   pais:"🇺🇸 EEUU/Canadá" },
    { prefix:"34",  pais:"🇪🇸 España" },
    { prefix:"55",  pais:"🇧🇷 Brasil" },
  ];

  function detectarPais(telefono) {
    if (!telefono) return "Otro";
    // Limpiar: quitar espacios, guiones, paréntesis, +
    const limpio = String(telefono).replace(/[\s\-\(\)\+\.]/g, "");
    // Ordenar prefijos de mayor a menor longitud para evitar falsos positivos
    const sorted = [...PREFIJOS_PAIS].sort((a,b) => b.prefix.length - a.prefix.length);
    for (const { prefix, pais } of sorted) {
      if (limpio.startsWith(prefix)) return pais;
    }
    return "Otro";
  }

  // Lee una hoja de Google Sheets y devuelve todas las filas como arrays
  // Lee hoja via exportación CSV pública — NO requiere API Key
  // Solo requiere que el sheet sea compartido con "cualquiera con el enlace puede ver"
  async function leerHoja(sheetId, nombreHoja, _key) {
    try {
      // Primero obtener el GID (ID numérico) de la hoja por nombre usando la API
      // Si falla, intentar con el endpoint de exportación por nombre directo
      const gidUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties&key=${_key}`;
      const gidRes = await fetch(gidUrl);
      const gidJson = await gidRes.json();
      let gid = 0;
      if (!gidJson.error && gidJson.sheets) {
        const hoja = gidJson.sheets.find(s =>
          s.properties.title.toLowerCase() === nombreHoja.toLowerCase()
        );
        if (hoja) gid = hoja.properties.sheetId;
      }
      // Exportar como CSV — sin API Key, solo necesita sheet público
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const csvRes = await fetch(csvUrl);
      if (!csvRes.ok) {
        // Fallback: intentar con API Key y range
        const range = encodeURIComponent(`'${nombreHoja}'!A:Z`);
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${_key}`;
        const apiRes = await fetch(apiUrl);
        const apiJson = await apiRes.json();
        if (apiJson.error) return null;
        return apiJson.values || [];
      }
      const csvText = await csvRes.text();
      // Parsear CSV respetando comillas y comas dentro de campos
      return csvText.trim().split("\n").map(line => {
        const cols = []; let cur = ""; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQ = !inQ; }
          else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
      });
    } catch { return null; }
  }

  // Lee los encabezados de una hoja para diagnóstico
  async function verEncabezados() {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId || !apiKey) return show("Configura URL y API Key primero", "err");
    const rows = await leerHoja(sheetId, hojaFB, apiKey);
    if (!rows || !rows[0]) return show("No se pudo leer la hoja: " + hojaFB, "err");
    show("Columnas de '" + hojaFB + "': " + rows[0].join(" | "), "ok");
  }

  async function calcularPaisesYRemarketing(sheetId, key, parsedBase) {
    // Leer hoja de WP (números que SÍ entraron)
    const rowsWP = await leerHoja(sheetId, hojaWP, key);
    if (!rowsWP || rowsWP.length < 2) return parsedBase;

    // Detectar columna de teléfono en WP (buscar encabezado que contenga "tel" o "phone" o "numero" o "whatsapp")
    const headerWP = rowsWP[0].map(h => String(h).toLowerCase());
    const colTelWP = headerWP.findIndex(h => h.includes("tel") || h.includes("phone") || h.includes("numero") || h.includes("número") || h.includes("whatsapp") || h.includes("celular"));
    const telColWP = colTelWP >= 0 ? colTelWP : 0; // fallback columna A

    // Construir set de teléfonos normalizados en WP
    const telWPSet = new Set();
    for (let i = 1; i < rowsWP.length; i++) {
      const tel = rowsWP[i]?.[telColWP];
      if (!tel) continue;
      const s = String(tel);
      const mP = s.match(/p:(\d+)/);
      const norm = mP ? mP[1] : s.replace(/[\s\-\(\)\+\.]/g, "");
      if (norm.length >= 7) telWPSet.add(norm);
    }

    // Leer hoja de FB (formularios/registros)
    const rowsFB = await leerHoja(sheetId, hojaFB, key);
    if (!rowsFB || rowsFB.length < 2) {
      // Sin hoja FB, calcular países solo desde WP
      const mapaP = {};
      telWPSet.forEach(tel => {
        const p = detectarPais(tel);
        if (!mapaP[p]) mapaP[p] = { total_form: 0, total_wp: 0 };
        mapaP[p].total_wp++;
      });
      const paises = Object.entries(mapaP).map(([pais, v]) => ({ pais, ...v, pct_captura: v.total_form > 0 ? parseFloat((v.total_wp/v.total_form*100).toFixed(1)) : 100 }));
      return { ...parsedBase, paises };
    }

    // Detectar columna de teléfono en FB
    const headerFB = rowsFB[0].map(h => String(h).toLowerCase());
    const colTelFB = headerFB.findIndex(h => h.includes("tel") || h.includes("phone") || h.includes("numero") || h.includes("número") || h.includes("whatsapp") || h.includes("celular"));
    const telColFB = colTelFB >= 0 ? colTelFB : 0;

    const colNombreFB = (() => {
      // Si el usuario configuró el nombre de columna exacto — usarlo directamente
      if (colNombrePersona.trim()) {
        const idx = headerFB.findIndex(h => h.toLowerCase() === colNombrePersona.trim().toLowerCase());
        if (idx >= 0 && idx !== telColFB) return idx;
      }
      // Auto-detección: columnas claramente de nombre de persona
      const EXCLUIR_NOMBRE = ["anuncio","campaign","conjunto","adset","ad_name","ad_id",
        "campaign_name","conjunto_nombre","creatividad","creative","fecha","date","hora",
        "time","email","correo","telefon","phone","celular","numero","número","id","utm",
        "fuente","source","etiqueta","tag","status","estado","ciudad","pais","country"];
      const candidatos = [
        "full_name","nombre_completo","nombre completo","first_name","primer_nombre",
        "nombre_lead","lead_name","nombre del lead","tu nombre","your name","nombre y apellido",
        "nombre","name"
      ];
      for (const c of candidatos) {
        const idx = headerFB.findIndex(h => h.trim() === c || (h.includes(c) && !EXCLUIR_NOMBRE.some(ex => ex !== c && h.includes(ex))));
        if (idx >= 0 && idx !== telColFB) return idx;
      }
      return -1;
    })();

    // Función para extraer teléfono limpio — maneja formatos:
    // "593991234567", "+593 99 123 4567", "p:593991234567", "Nombre,p:593991234567"
    function limpiarCelda(raw) {
      // Quitar comillas que quedan del parseo CSV
      return String(raw || "").replace(/^["']|["']$/g, "").trim();
    }

    function extraerTelefono(raw) {
      if (!raw) return "";
      const s = limpiarCelda(raw);
      // Formato con p: → extraer SOLO dígitos después de p:
      const mP = s.match(/[pP]:(\d+)/);
      if (mP) return mP[1];
      // Solo dígitos
      const soloDigitos = s.replace(/\D/g, "");
      return soloDigitos;
    }

    function extraerNombre(rawStr) {
      const s = limpiarCelda(rawStr);
      // Formato "Nombre,p:NUM" o "Nombre p:NUM"
      const mSep = s.match(/^(.+?)[,\s]+[pP]:\d+/);
      if (mSep) return mSep[1].replace(/["']/g,"").trim();
      return "";
    }

    // Procesar cada registro FB
    const mapaP = {};
    const pendientesRem = []; // { tel, nombre }
    for (let i = 1; i < rowsFB.length; i++) {
      const row = rowsFB[i];
      const rawTel = row?.[telColFB];
      if (!rawTel) continue;
      const rawStr = String(rawTel);
      const telNorm = extraerTelefono(rawStr);
      if (!telNorm || telNorm.length < 7) continue;

      // Nombre: columna configurada > extraído de la misma celda > vacío
      let nombre = "";
      if (colNombreFB >= 0 && colNombreFB !== telColFB) {
        nombre = limpiarCelda(row[colNombreFB] || "");
      }
      if (!nombre) nombre = extraerNombre(rawStr);

      const pais = detectarPais(telNorm);
      if (!mapaP[pais]) mapaP[pais] = { total_form: 0, total_wp: 0 };
      mapaP[pais].total_form++;
      // Verificar si está en WP
      const estaEnWP = telWPSet.has(telNorm) ||
        // También probar sin prefijo de país (por si hay diferencia de formato)
        [...telWPSet].some(wpTel => wpTel.endsWith(telNorm.slice(-9)) || telNorm.endsWith(wpTel.slice(-9)));
      if (estaEnWP) {
        mapaP[pais].total_wp++;
      } else {
        pendientesRem.push({ tel: telNorm, nombre });
      }
    }

    const paises = Object.entries(mapaP)
      .map(([pais, v]) => ({
        pais,
        total_form: v.total_form,
        total_wp: v.total_wp,
        pct_captura: v.total_form > 0 ? parseFloat((v.total_wp/v.total_form*100).toFixed(1)) : 0
      }))
      .sort((a,b) => b.total_form - a.total_form);

    const total_remarketing_calculado = pendientesRem.length;

    return {
      ...parsedBase,
      paises,
      total_remarketing: total_remarketing_calculado,
      total_wp: telWPSet.size,
      total_form: rowsFB.length - 1,
      telefonosPendientes: pendientesRem.map(p => p.tel),         // compatibilidad
      contactosPendientes: pendientesRem,                          // { tel, nombre } — para export con nombre
      _paisesCalculadosEnApp: true,
    };
  }

  async function cargarDatos() {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) return show("URL de Google Sheet inválida", "err");
    if (!apiKey)  return show("Ingresa tu Google Sheets API Key", "err");
    setLoading(true);
    try {
      // 1. Leer el JSON del Apps Script (análisis por anuncio/campaña/conjunto)
      const range = encodeURIComponent("__trafficker_api__!A1");
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.error) { show("Error de Google API: " + json.error.message, "err"); setLoading(false); return; }
      const raw = json.values?.[0]?.[0];
      if (!raw) { show("Sin datos del script. Ejecuta 'Exportar para Trafficker Pro' primero.", "err"); setLoading(false); return; }
      let parsed = JSON.parse(raw);

      // 2. Calcular países y remarketing leyendo las hojas directamente
      show("⏳ Calculando países y remarketing...", "ok");
      parsed = await calcularPaisesYRemarketing(sheetId, apiKey, parsed);

      setData(parsed);
      const updated = { ...client, capturaConfig: { url: sheetUrl, apiKey, hojaFB, hojaWP, colNombrePersona, lastData: parsed, lastSync: new Date().toISOString() } };
      await onUpdate(updated);
      show(`✓ ${parsed.total_wp} en WP · ${parsed.total_con_match||"?"} identificados · ${parsed.total_remarketing} para remarketing`, "ok");
    } catch(e) { show("Error: " + e.message, "err"); }
    setLoading(false);
  }

  async function guardarConfig() {
    await onUpdate({ ...client, capturaConfig: { ...sheetConfig, url: sheetUrl, apiKey } });
    show("✓ Configuración guardada", "ok");
  }

  const items = data?.niveles?.[nivel] || [];
  const filtered = items.filter(i => !filterText || i.nombre.toLowerCase().includes(filterText.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
    return sortDir === "desc" ? vb - va : va - vb;
  });
  const maxPct = sorted.length > 0 ? Math.max(...sorted.map(i => i.pct_captura), 1) : 100;
  const paises = data?.paises || [];

  function SortBtn({ label, k }) {
    const active = sortKey === k;
    return (
      <th style={{ cursor:"pointer", userSelect:"none", whiteSpace:"nowrap", color: active ? "var(--accent2)" : "" }}
        onClick={() => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("desc"); } }}>
        {label} {active ? (sortDir === "desc" ? "▼" : "▲") : "⇅"}
      </th>
    );
  }

  return (
    <>
      {toastEl}
      <div>
        {/* Configuración — solo admin */}
        {!readOnly && (
          <div className="card" style={{ marginBottom:"1rem", borderColor:"rgba(0,74,173,.3)" }}>
            <div className="card-title">Conexión con Google Sheets</div>
            <div className="field">
              <label>URL del Google Sheet</label>
              <input type="text" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>
            <div className="field">
              <label>Google Sheets API Key <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style={{ fontSize:10, color:"var(--accent)", marginLeft:8 }}>¿Cómo obtenerla? →</a></label>
              <PasswordInput value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button className="btn btn-primary btn-sm" disabled={loading} onClick={cargarDatos}>{loading ? "⏳ Cargando..." : "🔄 Sincronizar datos"}</button>
              <button className="btn btn-ghost btn-sm" onClick={guardarConfig}>💾 Guardar config</button>
              <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>setShowHojas(v=>!v)}>
                ⚙️ {showHojas ? "Ocultar" : "Nombres de hojas"}
              </button>
            </div>
            {showHojas && (
              <div style={{marginTop:12,padding:"12px 14px",background:"rgba(0,74,173,.06)",borderRadius:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Hoja de Registros FB (formularios)</div>
                  <input type="text" value={hojaFB} onChange={e=>setHojaFB(e.target.value)}
                    placeholder="Ej: Registros, Formulario, Leads FB..."
                    style={{width:"100%",fontSize:12}} />
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Hoja de Miembros WP (teléfonos)</div>
                  <input type="text" value={hojaWP} onChange={e=>setHojaWP(e.target.value)}
                    placeholder="Ej: Miembros WP, WhatsApp, Contactos..."
                    style={{width:"100%",fontSize:12}} />
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>Columna con nombre de la persona (encabezado exacto)</div>
                  <input type="text" value={colNombrePersona} onChange={e=>setColNombrePersona(e.target.value)}
                    placeholder="Ej: Nombre completo, first_name, Nombre..."
                    style={{width:"100%",fontSize:12}} />
                </div>
                <div style={{display:"flex",alignItems:"flex-end"}}>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11,width:"100%"}} onClick={verEncabezados}>
                    🔍 Ver columnas disponibles
                  </button>
                </div>
                <div style={{gridColumn:"1/-1",fontSize:10,color:"var(--muted)"}}>
                  💡 Usa "Ver columnas" para descubrir el nombre exacto de la columna con el nombre de la persona en tu hoja FB.
                </div>
              </div>
            )}
            {sheetConfig.lastSync && <div style={{ fontSize:11, color:"var(--muted)", marginTop:8 }}>Última sync: {new Date(sheetConfig.lastSync).toLocaleString("es-EC")}</div>}
          </div>
        )}

        {/* Instrucciones si no hay datos */}
        {!data && !readOnly && (
          <div className="card" style={{ background:"rgba(0,74,173,.06)", borderColor:"rgba(0,74,173,.2)" }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>📋 Cómo configurar (una sola vez):</div>
            <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.8 }}>
              <div>1. Abre tu Google Sheet → <strong>Extensiones → Apps Script</strong></div>
              <div>2. Pega el script <code>trafficker_pro_apps_script.js</code> y guarda</div>
              <div>3. Recarga el Sheet — aparece el menú <strong>🚀 Trafficker Pro</strong></div>
              <div>4. Ejecuta <strong>"Analizar captura FB → WP"</strong> → crea hoja "Miembros WP"</div>
              <div>5. Pega números de WhatsApp en col A de "Miembros WP"</div>
              <div>6. Ejecuta <strong>"Exportar para Trafficker Pro"</strong></div>
              <div>7. Regresa aquí → presiona Sincronizar datos</div>
            </div>
          </div>
        )}

        {/* Vista cliente sin datos */}
        {!data && readOnly && (
          <div className="empty"><div style={{ fontSize:28, opacity:.3 }}>📊</div><div style={{ marginTop:8 }}>Análisis de captura no disponible aún.</div></div>
        )}

        {/* DATOS */}
        {data && (
          <div>
            {/* ── Semáforo de salud ─────────────────────────────────────────── */}
            {(() => {
              const pct = data.total_form > 0 ? (data.total_wp/data.total_form*100) : 0;
              const rem = data.total_remarketing || 0;
              const [ico, msg, bg, border] = pct >= 70
                ? ["✅", `Captura saludable — ${pct.toFixed(1)}% de leads entraron a WP`, "rgba(16,185,129,.08)", "rgba(16,185,129,.25)"]
                : pct >= 50
                ? ["⚠️", `Captura media — ${rem.toLocaleString()} personas sin entrar a WP`, "rgba(255,222,89,.07)", "rgba(255,222,89,.3)"]
                : ["🔴", `Captura baja — ${rem.toLocaleString()} personas sin entrar a WP`, "rgba(239,68,68,.07)", "rgba(239,68,68,.25)"];
              return (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderRadius:10,background:bg,border:`1px solid ${border}`,marginBottom:"1rem",fontSize:13}}>
                  <span style={{fontSize:18}}>{ico}</span>
                  <span style={{fontWeight:600}}>{msg}</span>
                  <span style={{marginLeft:"auto",fontSize:10,color:"var(--muted)"}}>
                    {sheetConfig.lastSync ? `Sync: ${new Date(sheetConfig.lastSync).toLocaleString("es-EC")}` : "Sin sync"}
                  </span>
                  {readOnly && (
                    <button className="btn btn-ghost btn-sm" style={{fontSize:11,whiteSpace:"nowrap"}}
                      disabled={loading} onClick={cargarDatos}>
                      {loading ? "⟳" : "🔄 Actualizar"}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Resumen 4 tarjetas */}
            <div className="grid4" style={{ marginBottom:"1rem" }}>
              {[
                ["Personas en WP", data.total_wp, "var(--green)"],
                ["Registros en FB", data.total_form, "#4d9fff"],
                ["% Captura global", data.total_form > 0 ? (data.total_wp/data.total_form*100).toFixed(1)+"%" : "—", "var(--accent2)"],
                ...(!readOnly ? [["Para remarketing", data.total_remarketing || 0, "var(--orange)"]] : []),
              ].map(([label, val, color]) => (
                <div key={label} className="card" style={{ textAlign:"center", padding:"1rem" }}>
                  <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:22, fontFamily:"var(--mono)", fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* ── Gráfica de tendencia de captura por anuncio ───────────────── */}
            {(() => {
              const anuncios = (data.niveles?.anuncio || [])
                .filter(i => i.total_form >= 5)
                .sort((a,b) => b.total_form - a.total_form)
                .slice(0, 8);
              if (anuncios.length < 2) return null;
              const W = 600, H = 140;
              const PAD = { top:16, right:16, bottom:32, left:36 };
              const cW = W-PAD.left-PAD.right, cH = H-PAD.top-PAD.bottom;
              const maxF = Math.max(...anuncios.map(a=>a.total_form),1);
              const barW = Math.floor(cW / anuncios.length) - 4;
              return (
                <div className="card" style={{padding:"1rem",marginBottom:"1rem"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>
                    📈 Tendencia de captura por anuncio
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <svg width={W} height={H} style={{display:"block",minWidth:W}}>
                      {/* Líneas de referencia 50% y 70% */}
                      {[50,70,100].map(ref => {
                        const y = PAD.top + cH - (ref/100)*cH;
                        return (
                          <g key={ref}>
                            <line x1={PAD.left} y1={y} x2={PAD.left+cW} y2={y}
                              stroke={ref===70?"rgba(16,185,129,.3)":ref===50?"rgba(255,222,89,.3)":"rgba(255,255,255,.06)"}
                              strokeWidth="0.8" strokeDasharray="4 3"/>
                            <text x={PAD.left-4} y={y+3} fontSize="8" fill="var(--muted)" textAnchor="end">{ref}%</text>
                          </g>
                        );
                      })}
                      {/* Barras */}
                      {anuncios.map((a, i) => {
                        const x = PAD.left + i*(barW+4) + 2;
                        const pct = a.pct_captura || 0;
                        const hBar = Math.max((pct/100)*cH, 2);
                        const y = PAD.top + cH - hBar;
                        const color = pct>=70?"var(--green)":pct>=50?"var(--amber)":"var(--red)";
                        // Barra de fondo (total FB)
                        const hFB = Math.max((a.total_form/maxF)*cH*0.85, 2);
                        const yFB = PAD.top + cH - hFB;
                        return (
                          <g key={i}>
                            <rect x={x} y={yFB} width={barW} height={hFB}
                              fill="rgba(255,255,255,.04)" rx="2"/>
                            <rect x={x} y={y} width={barW} height={hBar}
                              fill={color} fillOpacity=".85" rx="2"/>
                            <text x={x+barW/2} y={y-3} textAnchor="middle" fontSize="8"
                              fontWeight="700" fill={color}>{pct}%</text>
                            <text x={x+barW/2} y={PAD.top+cH+14} textAnchor="middle" fontSize="7"
                              fill="var(--muted)">{a.nombre.slice(0,8)}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:6,fontSize:10,color:"var(--muted)"}}>
                    <span><span style={{color:"var(--green)"}}>■</span> ≥70% óptimo</span>
                    <span><span style={{color:"var(--amber)"}}>■</span> 50-70% aceptable</span>
                    <span><span style={{color:"var(--red)"}}>■</span> &lt;50% mejorar</span>
                  </div>
                </div>
              );
            })()}

            {/* Tabs de vista */}
            <div className="period-pills" style={{ marginBottom:"1rem" }}>
              <button className={"pill " + (viewTab==="anuncios" ? "active" : "")} onClick={() => setViewTab("anuncios")}>📡 Por anuncio</button>
              <button className={"pill " + (viewTab==="paises" ? "active" : "")} onClick={() => setViewTab("paises")}>🌎 Por país</button>
              {(data.sinAnuncioIdentificado?.length > 0) && (
                <button className={"pill " + (viewTab==="sin" ? "active" : "")}
                  style={{ borderColor: "rgba(255,222,89,.4)", color: "var(--accent2)" }}
                  onClick={() => setViewTab("sin")}>
                  ⚠️ Sin identificar ({data.sinAnuncioIdentificado.length})
                </button>
              )}
              {/* Remarketing — solo admin, nunca visible para el cliente */}
              {!readOnly && <button className={"pill " + (viewTab==="remarketing" ? "active" : "")} onClick={() => setViewTab("remarketing")}>🎯 Remarketing ({data.total_remarketing || 0})</button>}
            </div>

            {/* Vista por anuncio/conjunto/campaña */}
            {viewTab === "anuncios" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:"1rem", flexWrap:"wrap", alignItems:"center" }}>
                  <div className="period-pills">
                    {[["campaña","Campaña"],["conjunto","Conjunto"],["anuncio","Anuncio"]].map(([id,lbl]) => (
                      <button key={id} className={"pill " + (nivel===id ? "active" : "")} onClick={() => setNivel(id)}>{lbl}</button>
                    ))}
                  </div>
                  <div style={{ position:"relative", flex:1, maxWidth:240 }}>
                    <input type="text" value={filterText} onChange={e => setFilter(e.target.value)}
                      placeholder={"Buscar " + nivel + "..."} style={{ paddingLeft:28, fontSize:12 }} />
                    <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--muted)" }}>🔍</span>
                  </div>
                  {filterText && <button className="btn btn-ghost btn-sm" onClick={() => setFilter("")}>×</button>}
                  <BotonesExportar
                    headers={["Nombre","Reg. FB","Pers. WP","% Captura","% del Total","Pendientes"]}
                    rows={sorted.map(i => [i.nombre,i.total_form,i.total_wp,i.pct_captura+"%",i.pct_del_total+"%",i.pendientes||0])}
                    nombreArchivo={"captura_"+nivel}
                  />
                </div>
                {sorted.length === 0
                  ? <div className="empty"><div style={{ fontSize:24, opacity:.3 }}>📊</div><div style={{ marginTop:6 }}>Sin datos.</div></div>
                  : <div className="card scroll-x">
                      <table className="tbl">
                        <thead><tr>
                          <th>#</th>
                          <SortBtn label={"Nombre del " + nivel} k="nombre" />
                          <SortBtn label="Reg. FB" k="total_form" />
                          <SortBtn label="Pers. WP" k="total_wp" />
                          <SortBtn label="% Captura FB→WP" k="pct_captura" />
                          <SortBtn label="% del Total WP" k="pct_del_total" />
                          {!readOnly && <SortBtn label="Pendientes" k="pendientes" />}
                          <th>Visual</th>
                        </tr></thead>
                        <tbody>
                          {sorted.map((item, idx) => {
                            const pct = item.pct_captura;
                            const color = pct >= 70 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
                            const match = filterText && item.nombre.toLowerCase().includes(filterText.toLowerCase());
                            return (
                              <tr key={idx} style={{ background: match ? "rgba(255,222,89,.06)" : "" }}>
                                <td style={{ color:"var(--muted)", fontSize:11, textAlign:"center" }}>{idx+1}</td>
                                <td style={{ fontWeight:500, maxWidth:280, wordBreak:"break-word", fontSize:12 }}>
                                  {match && <span style={{ color:"var(--accent2)", marginRight:4 }}>●</span>}
                                  {item.nombre}
                                </td>
                                <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{item.total_form}</td>
                                <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:600, color:"var(--green)" }}>{item.total_wp}</td>
                                <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:700, color }}>{pct}%</td>
                                <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--muted)" }}>{item.pct_del_total}%</td>
                                {!readOnly && <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--orange)" }}>{item.pendientes || 0}</td>}
                                <td style={{ minWidth:100 }}>
                                  <div style={{ background:"var(--surface2)", borderRadius:20, height:8, overflow:"hidden" }}>
                                    <div style={{ width: maxPct > 0 ? (pct/maxPct*100)+"%" : "0%", height:"100%", background:color, borderRadius:20, transition:"width .5s" }} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {sorted.length > 1 && (
                          <tfoot><tr style={{ fontWeight:600, background:"rgba(0,74,173,.08)" }}>
                            <td colSpan={2}>TOTAL ({sorted.length})</td>
                            <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{sorted.reduce((a,i)=>a+i.total_form,0)}</td>
                            <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)" }}>{sorted.reduce((a,i)=>a+i.total_wp,0)}</td>
                            <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--accent2)" }}>
                              {data.total_form > 0 ? (data.total_wp/data.total_form*100).toFixed(1) : 0}%
                            </td>
                            <td>100%</td>
                            {!readOnly && <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--orange)" }}>{data.total_remarketing || 0}</td>}
                            <td></td>
                          </tr></tfoot>
                        )}
                      </table>
                    </div>
                }
              </div>
            )}

            {/* Sin identificar — asignación manual */}
            {viewTab === "sin" && (
              <SinIdentificarPanel data={data} client={client} onUpdate={onUpdate} />
            )}

            {/* Vista por país */}
            {viewTab === "paises" && (
              <div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
                  <BotonesExportar
                    headers={["País","Registros FB","Personas WP","% Captura","Pendientes"]}
                    rows={paises.map(p => [p.pais,p.total_form,p.total_wp,p.total_form>0?(p.total_wp/p.total_form*100).toFixed(1)+"%":"—",p.total_form-p.total_wp])}
                    nombreArchivo="captura_paises"
                  />
                </div>
              <div className="card scroll-x">
                <table className="tbl">
                  <thead><tr>
                    <SortBtn label="País" k="pais" />
                    <SortBtn label="Registros FB" k="total_form" />
                    <SortBtn label="Personas WP" k="total_wp" />
                    <SortBtn label="% Captura" k="pct_captura" />
                    <SortBtn label="Pendientes" k="pendientes" />
                    <th>Visual</th>
                  </tr></thead>
                  <tbody>
                    {[...paises]
                      .map(p => ({
                        ...p,
                        pct_captura: p.total_form > 0 ? p.total_wp/p.total_form*100 : 0,
                        pendientes: p.total_form - p.total_wp
                      }))
                      .sort((a,b) => {
                        const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
                        if (typeof va === "string") return sortDir==="desc" ? vb.localeCompare(va) : va.localeCompare(vb);
                        return sortDir === "desc" ? vb - va : va - vb;
                      })
                      .map((p, i) => {
                      const color = p.pct_captura >= 70 ? "var(--green)" : p.pct_captura >= 50 ? "var(--amber)" : "var(--red)";
                      const maxPaisForm = Math.max(...paises.map(x => x.total_form), 1);
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{p.pais}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right" }}>{p.total_form}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--green)", fontWeight:600 }}>{p.total_wp}</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", fontWeight:700, color }}>{p.pct_captura.toFixed(1)}%</td>
                          <td style={{ fontFamily:"var(--mono)", textAlign:"right", color:"var(--orange)" }}>{p.pendientes}</td>
                          <td style={{ minWidth:100 }}>
                            <div style={{ background:"var(--surface2)", borderRadius:20, height:8, overflow:"hidden" }}>
                              <div style={{ width:(p.total_form/maxPaisForm*100)+"%", height:"100%", background:"#4d9fff", borderRadius:20 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {/* Remarketing — admin Y cliente */}
            {viewTab === "remarketing" && (
              <div>
                <div style={{ background:"rgba(255,145,77,.08)", border:"1px solid rgba(255,145,77,.2)", borderRadius:10, padding:"10px 14px", marginBottom:"1rem", fontSize:12 }}>
                  <strong>🎯 {data.total_remarketing} personas</strong> se registraron en Facebook pero no llegaron a WhatsApp.
                  {readOnly
                    ? " Descarga la lista para activar tu remarketing."
                    : " Expórtalas también del Google Sheet en la hoja \"Remarketing FB→WP\"."}
                </div>

                <RemarketingTable data={data} readOnly={readOnly} />
              </div>
            )}

            {/* Footer */}
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:12, display:"flex", justifyContent:"flex-end" }}>
              {!readOnly && <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} disabled={loading} onClick={cargarDatos}>🔄 Actualizar</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── SISTEMA DE MISIONES HISTÓRICAS ──────────────────────────────────────────
// Cada misión es un snapshot completo: KPIs, registros, biblioteca, resultados

function MisionesPanel({ client, onUpdate, readOnly }) {
  const misiones = client.misiones || [];
  const isApollo = client.producto?.startsWith("APOLLO");
  const { show, el: toastEl } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [misionNombre, setMisionNombre] = useState("");
  const [expandida, setExpandida] = useState(null);

  // Generar nombre sugerido automáticamente
  const nombreSugerido = isApollo
    ? `APOLLO ${misiones.length + 1}`
    : `HERMES ${misiones.length + 1}`;

  async function finalizarMision() {
    const nombre = misionNombre.trim() || nombreSugerido;
    const ahora = new Date().toISOString();

    // ── Calcular métricas de biblioteca para IA ──────────────────
    const biblioteca = client.hermesData?.biblioteca || client.apolloData?.biblioteca || [];
    const creativosArchivados = biblioteca.map(p => ({
      nombre:         p.nombre,
      categoria:      p.categoria,
      fechaGrabacion: p.fechaGrabacion,
      // Métricas de Facebook
      gasto:          parseFloat(p.gasto_pza) || 0,
      alcance:        parseFloat(p.alcance_pza) || 0,
      ctr:            parseFloat(p.ctr_pza) || 0,
      leads:          parseFloat(p.leads_fb) || 0,
      cpl:            parseFloat(p.cpl_pza) || 0,
      likes:          parseFloat(p.likes) || 0,
      comentarios:    parseFloat(p.comentarios) || 0,
      compartidos:    parseFloat(p.compartidos) || 0,
      retencion3s:    parseFloat(p.retencion3s) || 0,
      retencion50:    parseFloat(p.retencion50) || 0,
      retencionFinal: parseFloat(p.retencionFinal) || 0,
      n_anuncios:     parseInt(p.fb_anuncios_n) || 0,
      iv:             calcIV(p, biblioteca),
      clasificacion:  getIVLabel(calcIV(p, biblioteca)),
      fbSyncDate:     p.fbSyncDate || "",
      fbSyncDesde:    p.fbSyncDesde || "",
      fbSyncHasta:    p.fbSyncHasta || "",
    }));

    // ── Métricas del embudo completo ─────────────────────────────
    const records = client.records || [];
    const embudo = {
      total_dias:       records.length,
      inversion_total:  records.reduce((a,r) => a + (parseFloat(r.inversion)||0), 0),
      leads_fb:         records.reduce((a,r) => a + (parseFloat(r.formularios)||parseFloat(r.leads)||0), 0),
      personas_wp:      records.reduce((a,r) => a + (parseFloat(r.personas_wp)||0), 0),
      ventas:           records.reduce((a,r) => a + (parseFloat(r.ventas)||0), 0),
      ingreso:          records.reduce((a,r) => a + (parseFloat(r.ingreso)||0), 0),
      // Tasas de conversión
      pct_captura_fb_wp: null,
      cpl_promedio: null,
      cpa_promedio: null,
      roas: null,
    };
    if (embudo.leads_fb > 0) {
      embudo.pct_captura_fb_wp = parseFloat((embudo.personas_wp / embudo.leads_fb * 100).toFixed(1));
      embudo.cpl_promedio      = parseFloat((embudo.inversion_total / embudo.leads_fb).toFixed(2));
    }
    if (embudo.ventas > 0) {
      embudo.cpa_promedio = parseFloat((embudo.inversion_total / embudo.ventas).toFixed(2));
    }
    if (embudo.inversion_total > 0 && embudo.ingreso > 0) {
      embudo.roas = parseFloat((embudo.ingreso / embudo.inversion_total).toFixed(2));
    }

    // ── Datos de WhatsApp (si están disponibles en Supabase) ─────
    // Se guardan como referencia — el dashboard puede consultarlos después
    const waGrupos = client.waGruposSnapshot || [];

    // ── Creativos ganadores automáticos ─────────────────────────
    const ganadores    = creativosArchivados.filter(c => c.iv >= 70).sort((a,b) => b.iv - a.iv);
    const descartados  = creativosArchivados.filter(c => c.iv < 40);
    const mejorCPL     = creativosArchivados.filter(c => c.cpl > 0).sort((a,b) => a.cpl - b.cpl)[0] || null;
    const mayorAlcance = creativosArchivados.sort((a,b) => b.alcance - a.alcance)[0] || null;

    // ── Snapshot completo ────────────────────────────────────────
    const snapshot = {
      id:              "mision_" + Date.now(),
      nombre,
      fechaInicio:     client.fechaContrato || client.contracts?.[0]?.fechaInicio || "",
      fechaFin:        ahora.slice(0, 10),
      fechaArchivado:  ahora,
      producto:        client.producto,
      cliente_nombre:  client.name,
      cliente_nicho:   client.nicho || client.rubro || "",
      // KPIs finales
      kpis: isApollo ? (client.apolloData?.kpisApollo || []) : (client.hermesData?.kpisHermes || []),
      // Registros diarios completos
      records,
      // Resumen del embudo completo
      embudo,
      // Creativos con performance completo
      creativos: creativosArchivados,
      // Insights para IA
      insights: {
        n_creativos_total:    creativosArchivados.length,
        n_ganadores:          ganadores.length,
        n_descartados:        descartados.length,
        creativo_mejor_iv:    ganadores[0]?.nombre || null,
        creativo_mejor_cpl:   mejorCPL?.nombre || null,
        creativo_mayor_alcance: mayorAlcance?.nombre || null,
        categoria_ganadora:   ganadores[0]?.categoria || null,
        inversion_por_dia:    embudo.total_dias > 0 ? parseFloat((embudo.inversion_total / embudo.total_dias).toFixed(2)) : null,
        leads_por_dia:        embudo.total_dias > 0 ? parseFloat((embudo.leads_fb / embudo.total_dias).toFixed(1)) : null,
      },
      // Data completa de producto (para consultas detalladas)
      apolloData:  isApollo ? client.apolloData : undefined,
      hermesData:  !isApollo ? client.hermesData : undefined,
      // ── WhatsApp snapshot
      wa_grupos_snapshot: waGrupos,
      // ── Bitácora de tráfico (anotaciones en gráfica CPL)
      bitacora_trafico: client.cplAnotaciones || [],
      // Resumen legacy (compatibilidad)
      resumen: calcularResumenMision(client, isApollo),
    };

    // Guardar en misiones y limpiar datos actuales
    const nuevasMisiones = [...misiones, snapshot];

    const clientLimpio = {
      ...client,
      misiones: nuevasMisiones,
      records: [], // limpiar registros
      kpis: [],
      checklist: {},
      hermesData: !isApollo ? { momentos: {}, kpisHermes: [], biblioteca: client.hermesData?.biblioteca || [] } : client.hermesData,
      apolloData: isApollo ? {
        ...client.apolloData,
        kpisApollo: [],
        momentos: {},
        faseActual: 0,
        fechaLanzamiento: "",
      } : client.apolloData,
    };

    await onUpdate(clientLimpio);
    setConfirm(false);
    setMisionNombre("");
    show(`✓ ${nombre} archivada. Datos listos para nueva misión.`, "ok");
  }

  function calcularResumenMision(c, apollo) {
    const records = c.records || [];
    if (!records.length) return {};
    const inv = records.reduce((a, r) => a + (parseFloat(r.inversion) || 0), 0);
    const leads = records.reduce((a, r) => a + (parseFloat(r.formularios) || parseFloat(r.leads) || 0), 0);
    const wpPersons = records.reduce((a, r) => a + (parseFloat(r.personas_wp) || 0), 0);
    const ventas = records.reduce((a, r) => a + (parseFloat(r.ventas) || 0), 0);
    const ingreso = records.reduce((a, r) => a + (parseFloat(r.ingreso) || 0), 0);
    const dias = records.length;
    return {
      inversion: inv.toFixed(2),
      leads,
      personas_wp: wpPersons,
      pct_captura: leads > 0 && wpPersons > 0 ? (wpPersons / leads * 100).toFixed(1) : null,
      ventas,
      cpa: ventas > 0 && inv > 0 ? (inv / ventas).toFixed(2) : null,
      roas: inv > 0 && ingreso > 0 ? (ingreso / inv).toFixed(2) : null,
      ingreso: ingreso.toFixed(2),
      dias,
    };
  }

  return (
    <>
      {toastEl}
      <div>
        {/* Botón de finalizar misión — SOLO para admin */}
        {!readOnly && (
        <div className="card" style={{ borderColor: "rgba(255,145,77,.3)", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {isApollo ? "🚀 Finalizar misión actual" : "✦ Finalizar ciclo HERMES actual"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Archiva todos los datos actuales (KPIs, registros, métricas) y deja el perfil listo para la siguiente misión.
                Los datos quedan guardados permanentemente en el historial.
              </div>
            </div>
            {!confirm
              ? <button className="btn btn-sm" style={{ background: "rgba(255,145,77,.2)", color: "var(--orange)", border: "1px solid rgba(255,145,77,.3)", whiteSpace: "nowrap" }}
                  onClick={() => { setConfirm(true); setMisionNombre(nombreSugerido); }}>
                  🏁 Finalizar y archivar
                </button>
              : <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="text" value={misionNombre} onChange={e => setMisionNombre(e.target.value)}
                    placeholder={nombreSugerido}
                    style={{ width: 140, fontSize: 12 }} />
                  <button className="btn btn-green btn-sm" onClick={finalizarMision}>✓ Confirmar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>×</button>
                </div>
            }
          </div>
          {confirm && (
            <div style={{ marginTop: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)" }}>
              ⚠️ Se archivarán {(client.records || []).length} registros diarios y los KPIs actuales. Esta acción no se puede deshacer.
            </div>
          )}
        </div>
        )} {/* fin !readOnly */}

        {/* Historial de misiones */}
        <div className="sec-title" style={{ marginBottom: ".75rem" }}>
          Historial de misiones — {misiones.length} archivada{misiones.length !== 1 ? "s" : ""}
        </div>

        {misiones.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 28, opacity: .3 }}>{isApollo ? "🚀" : "✦"}</div>
            <div style={{ marginTop: 8 }}>Sin misiones archivadas aún.</div>
          </div>
        )}

        {[...misiones].reverse().map(m => {
          const isExp = expandida === m.id;
          const r = m.resumen || {};
          return (
            <div key={m.id} className="card" style={{ marginBottom: ".75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setExpandida(isExp ? null : m.id)}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: isApollo ? "rgba(0,74,173,.2)" : "rgba(255,222,89,.15)", color: isApollo ? "#4d9fff" : "var(--accent2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {isApollo ? "🚀" : "✦"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                    {m.fechaFin ? fmtDate(m.fechaFin) : "—"} · {r.dias || 0} días · {r.records?.length || m.records?.length || 0} registros
                  </div>
                </div>
                {/* Resumen rápido */}
                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                  {r.inversion && <div style={{ textAlign: "center" }}><div style={{ color: "var(--muted)" }}>Inversión</div><div style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>${r.inversion}</div></div>}
                  {r.leads > 0 && <div style={{ textAlign: "center" }}><div style={{ color: "var(--muted)" }}>Leads</div><div style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{r.leads}</div></div>}
                  {r.ventas > 0 && <div style={{ textAlign: "center" }}><div style={{ color: "var(--muted)" }}>Ventas</div><div style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{r.ventas}</div></div>}
                  {r.roas && <div style={{ textAlign: "center" }}><div style={{ color: "var(--muted)" }}>ROAS</div><div style={{ fontFamily: "var(--mono)", fontWeight: 600, color: parseFloat(r.roas) >= 4 ? "var(--green)" : parseFloat(r.roas) >= 2 ? "var(--amber)" : "var(--red)" }}>{r.roas}x</div></div>}
                </div>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{isExp ? "▲" : "▼"}</span>
              </div>

              {isExp && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>

                  {/* Embudo completo */}
                  {m.embudo && (
                    <div style={{ marginBottom:"1rem" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Embudo completo</div>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        {[
                          ["💰 Inversión", m.embudo.inversion_total ? "$"+parseFloat(m.embudo.inversion_total).toFixed(2) : null, "var(--accent)"],
                          ["📋 Leads FB", m.embudo.leads_fb || null, null],
                          ["💬 Personas WP", m.embudo.personas_wp || null, null],
                          ["% Captura FB→WP", m.embudo.pct_captura_fb_wp ? m.embudo.pct_captura_fb_wp+"%" : null, m.embudo.pct_captura_fb_wp >= 60 ? "var(--green)" : "var(--amber)"],
                          ["💵 CPL promedio", m.embudo.cpl_promedio ? "$"+m.embudo.cpl_promedio : null, "var(--green)"],
                          ["🛒 Ventas", m.embudo.ventas || null, null],
                          ["📈 ROAS", m.embudo.roas ? m.embudo.roas+"x" : null, parseFloat(m.embudo.roas) >= 4 ? "var(--green)" : "var(--amber)"],
                          ["📅 Días", m.embudo.total_dias || null, null],
                        ].filter(x => x[1]).map(([label, val, color]) => (
                          <div key={label} style={{ background:"var(--surface2)", borderRadius:8, padding:"8px 14px", textAlign:"center" }}>
                            <div style={{ fontSize:10, color:"var(--muted)", marginBottom:2 }}>{label}</div>
                            <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:15, color: color || "var(--text)" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insights para IA */}
                  {m.insights && (
                    <div style={{ marginBottom:"1rem", background:"rgba(0,74,173,.06)", border:"1px solid rgba(0,74,173,.15)", borderRadius:10, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--accent)", marginBottom:8 }}>🤖 Insights del lanzamiento</div>
                      <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:12 }}>
                        {m.insights.creativo_mejor_iv && <div><span style={{ color:"var(--muted)" }}>Mejor IV: </span><strong>{m.insights.creativo_mejor_iv}</strong></div>}
                        {m.insights.creativo_mejor_cpl && <div><span style={{ color:"var(--muted)" }}>Mejor CPL: </span><strong>{m.insights.creativo_mejor_cpl}</strong></div>}
                        {m.insights.categoria_ganadora && <div><span style={{ color:"var(--muted)" }}>Categoría ganadora: </span><strong>{m.insights.categoria_ganadora}</strong></div>}
                        {m.insights.n_ganadores > 0 && <div><span style={{ color:"var(--muted)" }}>Creativos ganadores: </span><strong style={{ color:"var(--green)" }}>{m.insights.n_ganadores}</strong></div>}
                        {m.insights.inversion_por_dia && <div><span style={{ color:"var(--muted)" }}>Inversión/día: </span><strong>${m.insights.inversion_por_dia}</strong></div>}
                        {m.insights.leads_por_dia && <div><span style={{ color:"var(--muted)" }}>Leads/día: </span><strong>{m.insights.leads_por_dia}</strong></div>}
                      </div>
                    </div>
                  )}

                  {/* Creativos archivados */}
                  {m.creativos?.length > 0 && (
                    <div style={{ marginBottom:"1rem" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Creativos ({m.creativos.length})</div>
                      <div style={{ overflowX:"auto" }}>
                        <table className="tbl" style={{ fontSize:11 }}>
                          <thead>
                            <tr>
                              <th>Video</th><th>Tipo</th><th>Inversión</th><th>Leads</th><th>CPL</th><th>CTR%</th><th>IV</th><th>Resultado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...m.creativos].sort((a,b) => b.iv - a.iv).map((c,i) => (
                              <tr key={i}>
                                <td style={{ maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.nombre}</td>
                                <td><span className="badge" style={{ fontSize:10 }}>{c.categoria}</span></td>
                                <td style={{ fontFamily:"var(--mono)" }}>{c.gasto > 0 ? "$"+c.gasto.toFixed(2) : "—"}</td>
                                <td style={{ fontFamily:"var(--mono)" }}>{c.leads || "—"}</td>
                                <td style={{ fontFamily:"var(--mono)", color:"var(--green)" }}>{c.cpl > 0 ? "$"+c.cpl.toFixed(2) : "—"}</td>
                                <td style={{ fontFamily:"var(--mono)" }}>{c.ctr > 0 ? c.ctr.toFixed(2)+"%" : "—"}</td>
                                <td><span className={"iv-badge "+getIVClass(c.iv)}>{c.iv}</span></td>
                                <td style={{ fontSize:10 }}>{c.clasificacion}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* KPIs finales */}
                  {(m.kpis || []).length > 0 && (
                    <div style={{ marginBottom:"1rem" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>KPIs finales</div>
                      <div className="grid2">
                        {m.kpis.map(k => (
                          <div key={k.id} style={{ background:"var(--surface2)", borderRadius:8, padding:"8px 12px" }}>
                            <div style={{ fontSize:11, color:"var(--muted)" }}>{k.nombre}</div>
                            <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:16, color:"var(--accent2)", marginTop:2 }}>
                              {k.actual || "—"} <span style={{ fontSize:10, color:"var(--muted)" }}>{k.unidad}</span>
                            </div>
                            {k.meta && <div style={{ fontSize:10, color:"var(--muted)" }}>Meta: {k.meta}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:8, fontSize:11, color:"var(--muted)" }}>
                    Archivado el {new Date(m.fechaArchivado).toLocaleDateString("es-EC")} · {(m.records||[]).length} registros guardados · {m.creativos?.length || 0} creativos
                    {m.bitacora_trafico?.length > 0 && ` · ${m.bitacora_trafico.length} anotaciones en bitácora`}
                  </div>

                  {/* Bitácora de tráfico */}
                  {m.bitacora_trafico?.length > 0 && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--amber)", marginBottom:8 }}>📌 Bitácora de tráfico ({m.bitacora_trafico.length} anotaciones)</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {m.bitacora_trafico.map(a=>(
                          <div key={a.id} style={{ fontSize:12, padding:"6px 10px", background:"rgba(255,222,89,.06)", borderRadius:6, display:"flex", gap:10 }}>
                            <span style={{ color:"var(--muted)", fontSize:11, whiteSpace:"nowrap" }}>{a.fecha} {a.hora}</span>
                            <span>{a.texto}</span>
                            {a.cpl && <span style={{ color:"var(--muted)", fontSize:11, marginLeft:"auto" }}>CPL: ${fmtNum(a.cpl,2)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}



// ─── GRÁFICAS DE MÉTRICAS PRINCIPALES ─────────────────────────────────────────
function GraficasMetricas({ client, period, from, to }) {
  const allRows = (client.records || []).filter(r => {
    const hoy = new Date().toISOString().slice(0,10);
    return r.date <= hoy;
  });
  const rows = filterByPeriod(allRows, period, from, to).sort((a,b) => a.date.localeCompare(b.date));
  const capturaData = client.capturaConfig?.lastData;

  if (!rows.length) return null;

  // Agrupar métricas por gráfica
  const GRAFICAS = [
    {
      id: "captacion",
      titulo: "Captación — Resultados vs Personas WP",
      metricas: [
        { key: "resultados",  label: "Registros FB",   color: "#004AAD", fn: r => parseFloat(r.resultados||r.formularios) || 0 },
        { key: "personas_wp", label: "Personas WP",    color: "#10B981", fn: r => parseFloat(r.personas_wp) || 0 },
      ]
    },
    {
      id: "costos",
      titulo: "Costos — CPA FB vs Costo WP",
      metricas: [
        { key: "cpa",      label: "Costo x Resultado", color: "#FF914D", fn: (r, i) => {
          const inv = parseFloat(r.inversion) || 0;
          const res = parseFloat(r.resultados||r.formularios) || 0;
          return res > 0 ? inv/res : 0;
        }},
        { key: "costo_wp", label: "Costo x WP",        color: "#FFDE59", fn: (r) => {
          const inv = parseFloat(r.inversion) || 0;
          const wp  = parseFloat(r.personas_wp) || 0;
          return wp > 0 ? inv/wp : 0;
        }},
      ]
    },
    {
      id: "captura_pct",
      titulo: "% de Captura FB → WP",
      metricas: [
        { key: "pct_cap", label: "% Captura", color: "#A855F7", fn: r => {
          const fb = parseFloat(r.resultados||r.formularios) || 0;
          const wp = parseFloat(r.personas_wp) || 0;
          return fb > 0 && wp > 0 ? (wp/fb*100) : 0;
        }},
      ]
    },
    {
      id: "inversion",
      titulo: "Inversión diaria",
      metricas: [
        { key: "inversion", label: "Inversión $", color: "#EF4444", fn: r => parseFloat(r.inversion) || 0 },
      ]
    },
  ];

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "1rem" }}>
        Gráficas de tendencia
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {GRAFICAS.map(g => (
          <MiniLineChart key={g.id} titulo={g.titulo} rows={rows} metricas={g.metricas} />
        ))}
      </div>
    </div>
  );
}

function MiniLineChart({ titulo, rows, metricas }) {
  const [expandido, setExpandido] = useState(false);
  const [hovIdx, setHovIdx] = useState(null);
  const W = expandido ? 700 : 340;
  const H = expandido ? 200 : 120;
  const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Calcular datos
  const series = metricas.map(m => ({
    ...m,
    data: rows.map((r, i) => ({ fecha: r.date, val: m.fn(r, i) }))
  }));

  const allVals = series.flatMap(s => s.data.map(d => d.val)).filter(v => v > 0);
  if (!allVals.length) return null;

  const minVal = 0;
  const maxVal = Math.max(...allVals) * 1.1 || 1;
  const n = rows.length;

  function xPos(i) { return PAD.left + (i / Math.max(n-1, 1)) * chartW; }
  function yPos(v) { return PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH; }

  function makePath(data) {
    const pts = data.filter(d => d.val > 0);
    if (!pts.length) return "";
    const allPts = data.map((d, i) => ({ x: xPos(i), y: d.val > 0 ? yPos(d.val) : null }));
    let path = "";
    allPts.forEach((pt, i) => {
      if (pt.y === null) return;
      if (i === 0 || allPts[i-1].y === null) path += `M ${pt.x} ${pt.y}`;
      else path += ` L ${pt.x} ${pt.y}`;
    });
    return path;
  }

  function makeArea(data, color) {
    const baseline = PAD.top + chartH;
    const pts = data.map((d, i) => ({ x: xPos(i), y: d.val > 0 ? yPos(d.val) : baseline }));
    if (!pts.length) return "";
    let p = `M ${pts[0].x} ${baseline}`;
    pts.forEach(pt => { p += ` L ${pt.x} ${pt.y}`; });
    p += ` L ${pts[pts.length-1].x} ${baseline} Z`;
    return p;
  }

  // Ticks Y
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ pct: t, val: minVal + (maxVal - minVal) * t }));

  // Labels X (fechas simplificadas)
  const xLabels = rows.filter((_, i) => {
    const step = Math.max(1, Math.floor(n / (expandido ? 10 : 5)));
    return i % step === 0 || i === n-1;
  });

  return (
    <div className="card" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{titulo}</div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}
          onClick={() => setExpandido(e => !e)}>
          {expandido ? "⊡ Reducir" : "⊞ Expandir"}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            {metricas.map((m, mi) => (
              <linearGradient key={mi} id={"area_"+titulo.replace(/\s/g,"_")+mi} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={yPos(t.val)} x2={PAD.left + chartW} y2={yPos(t.val)}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={yPos(t.val) + 4} textAnchor="end" fontSize="8" fill="var(--muted)">
                {t.val > 1000 ? (t.val/1000).toFixed(1)+"k" : t.val > 100 ? Math.round(t.val) : fmtNum(t.val, t.val < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
          {/* X labels */}
          {xLabels.map((r, i) => {
            const idx = rows.indexOf(r);
            return (
              <text key={i} x={xPos(idx)} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--muted)">
                {r.date.slice(5)} {/* MM-DD */}
              </text>
            );
          })}
          {/* Series */}
          {series.map((s, si) => (
            <g key={si}>
              <path d={makeArea(s.data, s.color)}
                fill={"url(#area_"+titulo.replace(/\s/g,"_")+si+")"}/>
              <path d={makePath(s.data)}
                fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" />
              {/* Puntos */}
              {s.data.map((d, i) => d.val > 0 ? (
                <circle key={i} cx={xPos(i)} cy={yPos(d.val)} r={2}
                  fill={s.color} fillOpacity="0.8" />
              ) : null)}
            </g>
          ))}
          {/* Zonas invisibles de hover por punto */}
          {rows.map((r, i) => (
            <rect key={i}
              x={xPos(i) - Math.max(chartW/Math.max(rows.length,1)/2, 6)}
              y={PAD.top} width={Math.max(chartW/Math.max(rows.length,1), 12)} height={chartH}
              fill="transparent" style={{cursor:"crosshair"}}
              onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(null)}
            />
          ))}

          {/* Tooltip al hover */}
          {hovIdx !== null && (() => {
            const r = rows[hovIdx];
            const cx = xPos(hovIdx);
            const tooltipX = hovIdx < rows.length * 0.65 ? cx + 8 : cx - 168;
            const vals = series.map(s => ({ label: s.label, color: s.color, val: s.data[hovIdx]?.val ?? 0 })).filter(v=>v.val>0);
            const tooltipH = 24 + vals.length * 18;
            const tooltipY = Math.max(PAD.top, PAD.top + chartH/2 - tooltipH/2);
            return (
              <g>
                {/* Línea vertical */}
                <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top+chartH}
                  stroke="rgba(255,255,255,.25)" strokeWidth="0.8" strokeDasharray="3 2"/>
                {/* Puntos resaltados */}
                {series.map((s,si)=>s.data[hovIdx]?.val>0&&(
                  <circle key={si} cx={cx} cy={yPos(s.data[hovIdx].val)} r={4}
                    fill={s.color} stroke="var(--bg)" strokeWidth="2"/>
                ))}
                {/* Caja tooltip */}
                <rect x={tooltipX} y={tooltipY} width={160} height={tooltipH}
                  rx="7" fill="rgba(10,15,30,.96)" stroke="rgba(255,255,255,.1)" strokeWidth="0.8"/>
                {/* Fecha */}
                <text x={tooltipX+10} y={tooltipY+15} fontSize="9" fill="rgba(255,255,255,.45)"
                  fontFamily="var(--mono)">{r.date}</text>
                {/* Valores por serie */}
                {vals.map((v,vi)=>(
                  <g key={vi}>
                    <circle cx={tooltipX+12} cy={tooltipY+24+vi*18+4} r="3" fill={v.color}/>
                    <text x={tooltipX+20} y={tooltipY+24+vi*18+8} fontSize="10" fill="rgba(255,255,255,.6)">{v.label}</text>
                    <text x={tooltipX+150} y={tooltipY+24+vi*18+8} fontSize="11" fontWeight="700"
                      fill={v.color} textAnchor="end" fontFamily="var(--mono)">
                      {v.val > 100 ? fmtNum(v.val, v.val>1000?0:1) : fmtNum(v.val, 2)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

        </svg>
      </div>
      {/* Leyenda */}
      {metricas.length > 1 && (
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {metricas.map((m, mi) => (
            <div key={mi} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
              <div style={{ width: 16, height: 2, background: m.color, borderRadius: 1 }} />
              {m.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GRÁFICA CPL EN TIEMPO REAL (estilo trading) ──────────────────────────────
// ─── GRÁFICA CPL ESTILO COINMARKETCAP ────────────────────────────────────────
function CplTradingChart({ client, onUpdate }) {
  const { token, cuentas: _cuentas } = client.fbConfig || {};
  const adAccountId = (_cuentas?.[0]?.adAccountId) || client.fbConfig?.adAccountId || "";

  const [rango, setRango]           = useState("24h");
  const [loading, setLoading]       = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [hovIdx, setHovIdx]         = useState(null);
  const [showAnotForm, setShowAnotForm] = useState(false);
  const [anotTexto, setAnotTexto]   = useState("");
  const [puntosRT, setPuntosRT]     = useState(() => {
    const hoy = new Date().toISOString().slice(0,10);
    return client.cplRtData?.[hoy] || [];
  });
  const fetchCount = useRef(0);
  const INTERVALO  = 30;

  // ── Historial diario ──────────────────────────────────────────────────────
  const histDiario = [
    ...(client.misiones||[]).flatMap(m => (m.records||[]).map(r => {
      const inv=parseFloat(r.inversion)||0, res=parseFloat(r.resultados||r.formularios)||0;
      return res>0 ? {fecha:r.date, cpl:inv/res, tipo:"mision", mision:m.nombre} : null;
    }).filter(Boolean)),
    ...(client.records||[]).filter(r => r.date<=new Date().toISOString().slice(0,10))
      .map(r => {
        const inv=parseFloat(r.inversion)||0, res=parseFloat(r.resultados||r.formularios)||0;
        return res>0 ? {fecha:r.date, cpl:inv/res, tipo:"dia"} : null;
      }).filter(Boolean)
  ].sort((a,b)=>a.fecha.localeCompare(b.fecha));

  // ── Anotaciones ───────────────────────────────────────────────────────────
  const anotaciones = client.cplAnotaciones || [];

  async function guardarAnotacion() {
    if (!anotTexto.trim()) return;
    const nueva = {
      id: "anot_" + Date.now(),
      ts: Date.now(),
      hora: new Date().toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}),
      fecha: new Date().toISOString().slice(0,10),
      texto: anotTexto.trim(),
      cpl: puntosRT.length ? puntosRT[puntosRT.length-1].cpl : null,
    };
    const nuevas = [...anotaciones, nueva];
    await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${client.id}`, {
      method:"PATCH", headers:{...H, Prefer:"return=minimal"},
      body: JSON.stringify({cplAnotaciones: nuevas})
    });
    client.cplAnotaciones = nuevas;
    setAnotTexto(""); setShowAnotForm(false);
  }

  // ── Guardar puntos ────────────────────────────────────────────────────────
  async function guardarPuntos(nuevosPuntos) {
    if (!onUpdate || !nuevosPuntos.length) return;
    const hoy = new Date().toISOString().slice(0,10);
    const cplRtData = {...(client.cplRtData||{})};
    const existing = cplRtData[hoy] || [];
    const mapa = {};
    [...existing, ...nuevosPuntos].forEach(p => { mapa[p.ts] = p; });
    cplRtData[hoy] = Object.values(mapa).sort((a,b)=>a.ts-b.ts).slice(-2880);
    const limite = new Date(); limite.setDate(limite.getDate()-90);
    Object.keys(cplRtData).forEach(k => { if(k < limite.toISOString().slice(0,10)) delete cplRtData[k]; });
    try {
      await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${client.id}`, {
        method:"PATCH", headers:{...H, Prefer:"return=minimal"},
        body: JSON.stringify({cplRtData})
      });
      client.cplRtData = cplRtData;
    } catch {}
  }

  // ── Fetch histórico por hora ───────────────────────────────────────────────
  async function fetchHistoricoHoy() {
    if (!token || !adAccountId) return;
    setLoadingHist(true);
    const hoy = new Date().toISOString().slice(0,10);
    try {
      const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,actions,date_start,date_stop&time_range={"since":"${hoy}","until":"${hoy}"}&time_increment=hourly&level=account&limit=48&access_token=${token}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.error || !json.data?.length) { setLoadingHist(false); return; }
      const puntosPorHora = json.data.map(d => {
        const inv = parseFloat(d.spend)||0;
        const la  = (d.actions||[]).find(a=>a.action_type==="lead"||a.action_type==="onsite_conversion.lead_grouped");
        const nl  = la ? parseFloat(la.value) : 0;
        if (inv<=0 || nl<=0) return null;
        const ts = new Date((d.date_start||hoy).replace(" ","T")).getTime();
        return { ts, hora:new Date(ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}), cpl:parseFloat((inv/nl).toFixed(4)), inv:parseFloat(inv.toFixed(2)), leads:nl, tipo:"hist_hora" };
      }).filter(Boolean);
      if (puntosPorHora.length > 0) {
        setPuntosRT(prev => {
          const mapa = {};
          [...prev, ...puntosPorHora].forEach(p => { mapa[p.ts]=p; });
          return Object.values(mapa).sort((a,b)=>a.ts-b.ts);
        });
        await guardarPuntos(puntosPorHora);
      }
    } catch {}
    setLoadingHist(false);
  }

  // ── Fetch en tiempo real cada 30s ─────────────────────────────────────────
  async function fetchCplActual() {
    if (!token || !adAccountId) return;
    setLoading(true);
    const hoy = new Date().toISOString().slice(0,10);
    try {
      const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,actions&time_range={"since":"${hoy}","until":"${hoy}"}&level=account&access_token=${token}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.error && json.data?.length) {
        const d = json.data[0];
        const inv=parseFloat(d.spend)||0;
        const la=(d.actions||[]).find(a=>a.action_type==="lead"||a.action_type==="onsite_conversion.lead_grouped");
        const nl=la?parseFloat(la.value):0;
        if (inv>0 && nl>0) {
          const cpl=inv/nl;
          const ahora=Date.now();
          const punto={ ts:ahora, hora:new Date().toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit",second:"2-digit"}), cpl:parseFloat(cpl.toFixed(4)), inv:parseFloat(inv.toFixed(2)), leads:nl };
          setPuntosRT(prev => {
            const mapa={};
            [...prev, punto].forEach(p=>{mapa[p.ts]=p;});
            return Object.values(mapa).sort((a,b)=>a.ts-b.ts).slice(-2880);
          });
          fetchCount.current++;
          if (fetchCount.current%5===0) guardarPuntos([punto]);
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (!token || !adAccountId) return;
    fetchHistoricoHoy();
    fetchCplActual();
    const t = setInterval(fetchCplActual, INTERVALO*1000);
    return () => clearInterval(t);
  }, [token, adAccountId]);

  // ── Construir datos según rango ────────────────────────────────────────────
  const hoy = new Date().toISOString().slice(0,10);
  let datosVista = [], datosAyer = [], modoRT = false;

  if (rango === "24h") {
    const ahora = Date.now();
    const ahoraDate = new Date(ahora);
    const ayer = new Date(ahora); ayer.setDate(ayer.getDate()-1);
    const ayerStr = ayer.toISOString().slice(0,10);

    // ── Ventana deslizante sincronizada ────────────────────────────────────
    // Inicio de ventana = ayer a la misma hora exacta que ahora
    // Fin de ventana   = ahora (tiempo real)
    // → la gráfica siempre cubre exactamente 24h y avanza con el tiempo
    const tsVentanaInicio = ahora - 24*60*60*1000; // ayer misma hora

    // Datos de hoy (línea principal) — solo desde inicio de ventana
    const ptsHoyGuardados = client.cplRtData?.[hoy]||[];
    const mapa={};
    [...ptsHoyGuardados, ...puntosRT].forEach(p=>{mapa[p.ts]=p;});
    datosVista = Object.values(mapa)
      .sort((a,b)=>a.ts-b.ts)
      .filter(p => p.ts >= tsVentanaInicio && p.ts <= ahora)
      .map(p=>({...p, fecha:new Date(p.ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}), esHoy:true}));

    // Datos de ayer (línea de referencia gris) — misma ventana horaria
    // Tomamos los puntos de ayer cuyo timestamp original cae en [tsVentanaInicio-24h, ahora-24h]
    // es decir, los de ayer entre "ayer a la hora de inicio de ventana" y "ayer a la hora actual"
    const ptsAyer = client.cplRtData?.[ayerStr]||[];
    datosAyer = ptsAyer
      .filter(p => {
        // el punto de ayer está dentro de la misma franja horaria del día
        const horaAyer = p.ts - ayer.setHours(0,0,0,0); // ms desde medianoche de ayer
        const horaInicio = tsVentanaInicio - new Date(tsVentanaInicio).setHours(0,0,0,0);
        const horaFin = ahora - ahoraDate.setHours(0,0,0,0);
        return horaAyer >= horaInicio && horaAyer <= horaFin;
      })
      .map(p=>({
        ...p,
        tsOriginal: p.ts,
        ts: p.ts + 24*60*60*1000, // desplazar +1 día → eje X compartido con hoy
        fecha: new Date(p.ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}),
        esAyer: true
      })).sort((a,b)=>a.ts-b.ts);

    modoRT = true;
  } else if (rango==="1W") {
    for (let i=6; i>=0; i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=d.toISOString().slice(0,10);
      const pts=client.cplRtData?.[ds]||[];
      if (pts.length>0) {
        const avgCpl = pts.reduce((a,p)=>a+p.cpl,0)/pts.length;
        datosVista.push({fecha:ds.slice(5), cpl:avgCpl, tipo:"dia_rt"});
      } else {
        const hist = histDiario.find(h=>h.fecha===ds);
        if (hist) datosVista.push({...hist, fecha:ds.slice(5)});
      }
    }
  } else if (rango==="1M") {
    datosVista = histDiario.slice(-30).map(d=>({...d, fecha:d.fecha.slice(5)}));
  } else if (rango==="1Y") {
    datosVista = histDiario.slice(-365).map(d=>({...d, fecha:d.fecha.slice(5)}));
  } else {
    datosVista = histDiario.map(d=>({...d, fecha:d.fecha.slice(5)}));
  }

  // Combinar hoy+ayer para calcular escala Y
  const todosLosVals = [
    ...datosVista.map(d=>d.cpl),
    ...datosAyer.map(d=>d.cpl)
  ].filter(v=>v>0);

  const n=datosVista.length, hasData=todosLosVals.length>0;
  const ultimo=datosVista.length>0?datosVista[datosVista.length-1]:null;
  const primero=datosVista.length>0?datosVista[0]:null;
  const minCpl=hasData?Math.min(...todosLosVals):0;
  const maxCpl=hasData?Math.max(...todosLosVals):0;
  const cambio=hasData&&primero&&ultimo?((ultimo.cpl-primero.cpl)/primero.cpl*100):0;
  const tend=cambio<-0.1?"baja":cambio>0.1?"sube":"igual";
  const color=tend==="baja"?"#10B981":tend==="sube"?"#EF4444":"#FFDE59";

  const W=700, H=240, PAD={top:20,right:70,bottom:60,left:60};
  const cW=W-PAD.left-PAD.right, cH=H-PAD.top-PAD.bottom;
  const maxV=hasData?maxCpl*1.1:1, minV=hasData?Math.max(0,minCpl*0.9):0, rngV=maxV-minV||1;

  // Para el eje X en modo 24h usamos timestamps; en otros modos usamos índices
  function xP(i, arr){ return PAD.left+(i/Math.max((arr||datosVista).length-1,1))*cW; }
  function xPts(ts, allPts) {
    if (!allPts.length) return PAD.left;
    const minTs = allPts[0].ts, maxTs = allPts[allPts.length-1].ts;
    const rng = maxTs - minTs || 1;
    return PAD.left + ((ts - minTs) / rng) * cW;
  }
  function yP(v){ return PAD.top+cH-((v-minV)/rngV)*cH; }

  // En modo 24h mezclar ayer y hoy para eje X compartido
  const allPts24h = modoRT ? [...datosAyer, ...datosVista].sort((a,b)=>a.ts-b.ts) : [];

  const pathHoy = modoRT && datosVista.length>0
    ? datosVista.map((d,i)=>(i===0?"M ":"L ")+xPts(d.ts, allPts24h)+" "+yP(d.cpl)).join(" ")
    : !modoRT && datosVista.length>0
      ? datosVista.map((d,i)=>(i===0?"M ":"L ")+xP(i)+" "+yP(d.cpl)).join(" ")
      : "";

  const areaHoy = modoRT && datosVista.length>0
    ? `M ${xPts(datosVista[0].ts, allPts24h)} ${PAD.top+cH} `+datosVista.map(d=>`L ${xPts(d.ts,allPts24h)} ${yP(d.cpl)}`).join(" ")+` L ${xPts(datosVista[datosVista.length-1].ts,allPts24h)} ${PAD.top+cH} Z`
    : !modoRT && datosVista.length>0
      ? `M ${xP(0)} ${PAD.top+cH} `+datosVista.map((d,i)=>`L ${xP(i)} ${yP(d.cpl)}`).join(" ")+` L ${xP(n-1)} ${PAD.top+cH} Z`
      : "";

  const pathAyer = datosAyer.length>0
    ? datosAyer.map((d,i)=>(i===0?"M ":"L ")+xPts(d.ts,allPts24h)+" "+yP(d.cpl)).join(" ")
    : "";

  const yTicks=[0,0.2,0.4,0.6,0.8,1].map(t=>minV+rngV*t);
  const xStep=Math.max(1,Math.floor(n/8));
  const xLabels=datosVista.filter((_,i)=>i%xStep===0||i===n-1);

  // Sparkline inferior
  const sparkD=histDiario.slice(-60), sN=sparkD.length;
  const sVals=sparkD.map(d=>d.cpl), sMax=sVals.length?Math.max(...sVals):1, sMin=Math.max(0,sVals.length?Math.min(...sVals)*0.9:0), sRng=sMax-sMin||1;
  function sxP(i){return(i/Math.max(sN-1,1))*(W-4)+2;}
  function syP(v){return 28-((v-sMin)/sRng)*24;}
  const sparkPath=sparkD.map((d,i)=>(i===0?"M ":"L ")+sxP(i)+" "+syP(d.cpl)).join(" ");

  // Anotaciones del día visible
  const anotHoy = anotaciones.filter(a => a.fecha === hoy);

  const RANGOS=["24h","1W","1M","1Y","Todo"];

  return (
    <div className="card" style={{marginBottom:"1rem",padding:"1.25rem"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontWeight:700,fontSize:16}}>Costo por Lead (CPL)</div>
            {modoRT && puntosRT.length>0 && <span style={{fontSize:10,background:"rgba(16,185,129,.15)",color:"var(--green)",padding:"2px 8px",borderRadius:10,fontWeight:600}}>● EN VIVO</span>}
            {(loading||loadingHist) && <span style={{fontSize:10,color:"var(--muted)"}}>{loadingHist?"Cargando...":"⟳"}</span>}
          </div>
          {hasData && ultimo && <>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:4}}>
              <span style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color}}>${fmtNum(ultimo.cpl,2)}</span>
              <span style={{fontSize:13,color,fontWeight:600}}>{tend==="baja"?"▼":"▲"} {Math.abs(cambio).toFixed(2)}% ({rango})</span>
            </div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
              Min: <span style={{fontFamily:"var(--mono)",color:"var(--green)"}}>${fmtNum(minCpl,2)}</span>
              {" · "}Max: <span style={{fontFamily:"var(--mono)",color:"var(--red)"}}>${fmtNum(maxCpl,2)}</span>
              {modoRT && datosAyer.length>0 && <span style={{marginLeft:8,color:"rgba(255,255,255,.3)"}}>— Gris: ayer</span>}
            </div>
          </>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          {modoRT && (
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:"3px 10px",color:"var(--amber)"}}
              onClick={()=>setShowAnotForm(v=>!v)}>📌 Anotar</button>
          )}
          {RANGOS.map(r=>(
            <button key={r} className="btn btn-ghost btn-sm"
              style={{fontSize:11,padding:"3px 10px",background:rango===r?"var(--accent)":"transparent",color:rango===r?"#fff":"var(--muted)",borderRadius:6,fontWeight:rango===r?700:400}}
              onClick={()=>setRango(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Panel de anotación */}
      {showAnotForm && (
        <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
          <input type="text" value={anotTexto} onChange={e=>setAnotTexto(e.target.value)}
            placeholder="Ej: Subí presupuesto $50, cambié creativos, pausé campaña..."
            style={{flex:1,fontSize:13}} onKeyDown={e=>e.key==="Enter"&&guardarAnotacion()} />
          <button className="btn btn-sm" onClick={guardarAnotacion}>Guardar</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAnotForm(false)}>×</button>
        </div>
      )}

      {/* Anotaciones del día */}
      {modoRT && anotHoy.length>0 && (
        <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:4}}>
          {anotHoy.map(a=>(
            <div key={a.id} style={{fontSize:11,padding:"2px 10px",background:"rgba(255,222,89,.1)",border:"1px solid rgba(255,222,89,.2)",borderRadius:10,color:"var(--amber)"}}>
              📌 {a.hora} — {a.texto}
            </div>
          ))}
        </div>
      )}

      {/* Gráfica */}
      {!hasData ? (
        <div style={{height:160,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:12,gap:8}}>
          {token&&adAccountId ? <>
            <div>Cargando datos de hoy desde Facebook...</div>
            <div style={{fontSize:10}}>Se actualizan automáticamente cada 30 segundos</div>
          </> : "Configura Facebook Ads para activar el monitoreo en tiempo real"}
        </div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <svg width={W} height={H} style={{display:"block"}} onMouseLeave={()=>setHovIdx(null)}>
            <defs>
              <linearGradient id={"cplG_"+client.id} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
                <stop offset="90%" stopColor={color} stopOpacity="0.02"/>
              </linearGradient>
            </defs>

            {/* Grid Y */}
            {yTicks.map((v,i)=>(
              <g key={i}>
                <line x1={PAD.left} y1={yP(v)} x2={PAD.left+cW} y2={yP(v)} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                <text x={PAD.left-4} y={yP(v)+4} textAnchor="end" fontSize="9" fill="var(--muted)">${fmtNum(v,2)}</text>
              </g>
            ))}

            {/* Labels X */}
            {modoRT ? (
              datosVista.filter((_,i,arr)=>i===0||i===Math.floor(arr.length/2)||i===arr.length-1).map((d,i)=>(
                <text key={i} x={xPts(d.ts,allPts24h)} y={PAD.top+cH+16} textAnchor="middle" fontSize="8" fill="var(--muted)">{d.fecha}</text>
              ))
            ) : (
              xLabels.map((d,i)=>(
                <text key={i} x={xP(datosVista.indexOf(d))} y={PAD.top+cH+16} textAnchor="middle" fontSize="8" fill="var(--muted)">{d.fecha}</text>
              ))
            )}

            {/* Línea de ayer (referencia gris) */}
            {pathAyer && (
              <path d={pathAyer} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" strokeDasharray="4 2" strokeLinejoin="round"/>
            )}

            {/* Área y línea de hoy */}
            {areaHoy && <path d={areaHoy} fill={`url(#cplG_${client.id})`}/>}
            {pathHoy && <path d={pathHoy} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>}

            {/* Anotaciones en la gráfica */}
            {modoRT && anotHoy.map(a=>{
              const ptCercano = datosVista.reduce((prev,curr)=>Math.abs(curr.ts-a.ts)<Math.abs(prev.ts-a.ts)?curr:prev, datosVista[0]);
              if (!ptCercano) return null;
              const cx = xPts(ptCercano.ts, allPts24h);
              const cy = yP(ptCercano.cpl);
              return (
                <g key={a.id}>
                  <line x1={cx} y1={cy-4} x2={cx} y2={PAD.top+cH} stroke="rgba(255,222,89,.3)" strokeWidth="0.8" strokeDasharray="2 2"/>
                  <circle cx={cx} cy={cy-4} r="5" fill="rgba(255,222,89,.2)" stroke="var(--amber)" strokeWidth="1"/>
                  <text x={cx} y={cy-8} textAnchor="middle" fontSize="8" fill="var(--amber)">📌</text>
                </g>
              );
            })}

            {/* Punto actual */}
            {hasData && ultimo && <>
              <circle cx={modoRT?xPts(ultimo.ts,allPts24h):xP(n-1)} cy={yP(ultimo.cpl)} r="10" fill={color} fillOpacity="0.12"/>
              <circle cx={modoRT?xPts(ultimo.ts,allPts24h):xP(n-1)} cy={yP(ultimo.cpl)} r="4" fill={color}/>
            </>}

            {/* Línea de precio actual con badge */}
            {hasData && ultimo && <>
              <line x1={PAD.left} y1={yP(ultimo.cpl)} x2={PAD.left+cW} y2={yP(ultimo.cpl)} stroke={color} strokeWidth="0.5" strokeDasharray="4 3" strokeOpacity="0.5"/>
              <rect x={PAD.left+cW+4} y={yP(ultimo.cpl)-9} width={58} height={18} rx="4" fill={color}/>
              <text x={PAD.left+cW+33} y={yP(ultimo.cpl)+4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#000" fontFamily="var(--mono)">${fmtNum(ultimo.cpl,2)}</text>
            </>}

            {/* Watermark */}
            <text x={PAD.left+cW-10} y={PAD.top+cH-10} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.06)" fontWeight="700" letterSpacing="1">📊 TRAFFICK PRO</text>

            {/* Hover areas */}
            {datosVista.map((d,i)=>(
              <rect key={i}
                x={(modoRT?xPts(d.ts,allPts24h):xP(i))-Math.max(cW/Math.max(n,1)/2,3)}
                y={PAD.top} width={Math.max(cW/Math.max(n,1),6)} height={cH}
                fill="transparent" style={{cursor:"crosshair"}} onMouseEnter={()=>setHovIdx(i)}/>
            ))}

            {/* Tooltip mejorado */}
            {hovIdx!==null && hovIdx<datosVista.length && (()=>{
              const d=datosVista[hovIdx];
              const cx=modoRT?xPts(d.ts,allPts24h):xP(hovIdx);
              const tx=hovIdx<datosVista.length*0.65?cx+8:cx-165;
              const ty=Math.max(yP(d.cpl)-80,PAD.top);
              // Buscar dato de ayer a la misma hora
              const dAyer = datosAyer.find(a=>a.hora===d.fecha);
              const tooltipH = dAyer ? 90 : 70;
              return (
                <g>
                  <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top+cH} stroke="rgba(255,255,255,.3)" strokeWidth="0.8" strokeDasharray="3 2"/>
                  <circle cx={cx} cy={yP(d.cpl)} r="5" fill={color} stroke="var(--bg)" strokeWidth="2"/>
                  {dAyer && <circle cx={cx} cy={yP(dAyer.cpl)} r="4" fill="rgba(255,255,255,.3)" stroke="var(--bg)" strokeWidth="2"/>}
                  <rect x={tx} y={ty} width={158} height={tooltipH} rx="8" fill="rgba(15,20,40,.95)" stroke={color} strokeWidth="0.8"/>
                  <text x={tx+10} y={ty+16} fontSize="10" fill="rgba(255,255,255,.5)">{d.fecha}{d.esHoy?" · HOY":""}</text>
                  <text x={tx+10} y={ty+34} fontSize="15" fontWeight="800" fill={color} fontFamily="var(--mono)">${fmtNum(d.cpl,2)}/lead</text>
                  {d.leads&&<text x={tx+10} y={ty+50} fontSize="9" fill="rgba(255,255,255,.5)">{Math.round(d.leads)} leads · ${fmtNum(d.inv||0,2)} invertido</text>}
                  {dAyer&&<>
                    <line x1={tx+8} y1={ty+60} x2={tx+150} y2={ty+60} stroke="rgba(255,255,255,.08)" strokeWidth="0.5"/>
                    <text x={tx+10} y={ty+74} fontSize="9" fill="rgba(255,255,255,.35)">Ayer {dAyer.hora}: ${fmtNum(dAyer.cpl,2)}/lead</text>
                    <text x={tx+10} y={ty+86} fontSize="9" fill={d.cpl<dAyer.cpl?"#10B981":"#EF4444"}>
                      {d.cpl<dAyer.cpl?"▼ Mejor que ayer":"▲ Peor que ayer"} {Math.abs(((d.cpl-dAyer.cpl)/dAyer.cpl)*100).toFixed(1)}%
                    </text>
                  </>}
                  {d.mision&&<text x={tx+10} y={ty+50} fontSize="9" fill="rgba(255,255,255,.5)">{d.mision}</text>}
                </g>
              );
            })()}
            <line x1={PAD.left} y1={PAD.top+cH} x2={PAD.left+cW} y2={PAD.top+cH} stroke="var(--border)" strokeWidth="1"/>
          </svg>
        </div>
      )}

      {/* Sparkline histórico inferior */}
      {sN>3 && (
        <div style={{marginTop:8,borderTop:"1px solid var(--border)",paddingTop:8}}>
          <div style={{fontSize:9,color:"var(--muted)",marginBottom:4}}>Historial CPL — últimos {sN} días</div>
          <svg width={W} height={32} style={{display:"block",opacity:.6}}>
            <defs>
              <linearGradient id={"spkG_"+client.id} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4d9fff" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.02"/>
              </linearGradient>
            </defs>
            <path d={sparkPath+` L ${sxP(sN-1)} 30 L ${sxP(0)} 30 Z`} fill={`url(#spkG_${client.id})`}/>
            <path d={sparkPath} fill="none" stroke="#4d9fff" strokeWidth="1"/>
            {(()=>{
              const dias=rango==="1W"?7:rango==="1M"?30:rango==="1Y"?365:0;
              if(!dias||sN<=dias) return null;
              const x=sxP(sN-dias);
              return <rect x={x} y={0} width={sxP(sN-1)-x} height={30} fill="rgba(77,159,255,.1)" rx="2"/>;
            })()}
          </svg>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"var(--muted)"}}>
        <span>{client.cplRtData?`${Object.keys(client.cplRtData).length} días guardados · ${Object.values(client.cplRtData).reduce((a,v)=>a+v.length,0)} puntos total`:"Sin historial RT aún"}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {modoRT && datosAyer.length>0 && <span style={{color:"rgba(255,255,255,.25)"}}>— ayer</span>}
          {token&&adAccountId&&<button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"1px 8px"}} onClick={()=>{fetchHistoricoHoy();fetchCplActual();}} disabled={loading||loadingHist}>🔄</button>}
        </div>
      </div>
    </div>
  );
}



// ─── SISTEMA DE LINKS ENMASCARADOS ────────────────────────────────────────────

const SUPA_LINKS_URL = SUPA_URL + "/rest/v1/links";
const HL = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

// Generar slug aleatorio único
function genSlug(len = 6) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// CRUD de links en Supabase tabla separada
const LinksDB = {
  async getAll() {
    try {
      const r = await fetch(`${SUPA_LINKS_URL}?select=*&order=created_at.desc`, { headers: HL });
      if (!r.ok) { console.error("LinksDB.getAll error:", r.status, await r.text()); return []; }
      return await r.json();
    } catch(e) { console.error("LinksDB.getAll exception:", e); return []; }
  },
  async create(link) {
    try {
      const r = await fetch(SUPA_LINKS_URL, {
        method: "POST", headers: { ...HL, Prefer: "return=representation" },
        body: JSON.stringify(link)
      });
      const txt = await r.text();
      if (!r.ok) { console.error("LinksDB.create error:", r.status, txt); return { ok: false, error: `HTTP ${r.status}: ${txt}` }; }
      const d = JSON.parse(txt);
      return { ok: true, data: d[0] || null };
    } catch(e) { console.error("LinksDB.create exception:", e); return { ok: false, error: e.message }; }
  },
  async update(id, data) {
    try {
      const r = await fetch(`${SUPA_LINKS_URL}?id=eq.${id}`, {
        method: "PATCH", headers: { ...HL, Prefer: "return=minimal" },
        body: JSON.stringify(data)
      });
      if (!r.ok) { const txt = await r.text(); console.error("LinksDB.update error:", r.status, txt); return { ok: false, error: txt }; }
      return { ok: true };
    } catch(e) { console.error("LinksDB.update exception:", e); return { ok: false, error: e.message }; }
  },
  async delete(id) {
    try {
      const r = await fetch(`${SUPA_LINKS_URL}?id=eq.${id}`, { method: "DELETE", headers: HL });
      return { ok: r.ok };
    } catch(e) { return { ok: false, error: e.message }; }
  }
};

// ─── SELECTOR DE GRUPOS ───────────────────────────────────────
function GruposSelector({ grupos, seleccionados, onChange, label }) {
  const [abierto, setAbierto]   = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (jid) => {
    if (seleccionados.includes(jid)) onChange(seleccionados.filter(j=>j!==jid));
    else onChange([...seleccionados, jid]);
  };

  const filtrados = grupos.filter(g =>
    (g.nombre||g.jid).toLowerCase().includes(busqueda.toLowerCase()) ||
    (g.etiquetas||[]).some(et=>et.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const nombresSeleccionados = seleccionados.map(jid => {
    const g = grupos.find(x=>x.jid===jid);
    return g?.nombre || jid;
  });

  return (
    <div style={{marginBottom:12,position:"relative"}} ref={ref}>
      <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>
        {label} <span style={{fontWeight:400,textTransform:"none"}}>— vacío = todos los grupos</span>
      </label>

      {/* Trigger */}
      <div onClick={()=>setAbierto(!abierto)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"var(--surface2)",border:`1px solid ${abierto?"var(--accent)":"var(--border)"}`,borderRadius:8,cursor:"pointer",minHeight:38,gap:8}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,flex:1}}>
          {seleccionados.length === 0
            ? <span style={{fontSize:13,color:"var(--muted)"}}>Todos los grupos</span>
            : nombresSeleccionados.slice(0,3).map((n,i)=>(
                <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:"rgba(77,159,255,.2)",color:"var(--accent)"}}>{n}</span>
              ))
          }
          {seleccionados.length > 3 && (
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:"var(--border)",color:"var(--muted)"}}>+{seleccionados.length-3} más</span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {seleccionados.length > 0 && (
            <span style={{fontSize:11,background:"var(--accent)",color:"#fff",borderRadius:10,padding:"1px 7px",fontWeight:700}}>{seleccionados.length}</span>
          )}
          <span style={{color:"var(--muted)",fontSize:12,transition:"transform .2s",display:"inline-block",transform:abierto?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
        </div>
      </div>

      {/* Dropdown */}
      {abierto && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:999,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,.4)",marginTop:4,overflow:"hidden"}}>
          {/* Búsqueda */}
          <div style={{padding:"8px 10px",borderBottom:"1px solid var(--border)"}}>
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={e=>setBusqueda(e.target.value)}
              placeholder="Buscar grupo o etiqueta..."
              style={{width:"100%",fontSize:13,background:"transparent",border:"none",outline:"none",color:"var(--text)"}}
            />
          </div>

          {/* Acciones rápidas */}
          <div style={{display:"flex",gap:6,padding:"6px 10px",borderBottom:"1px solid var(--border)"}}>
            <button onClick={()=>onChange(grupos.map(g=>g.jid))} style={{fontSize:11,padding:"2px 8px",borderRadius:10,border:"1px solid var(--border)",background:"none",cursor:"pointer",color:"var(--muted)"}}>Seleccionar todos</button>
            <button onClick={()=>onChange([])} style={{fontSize:11,padding:"2px 8px",borderRadius:10,border:"1px solid var(--border)",background:"none",cursor:"pointer",color:"var(--muted)"}}>Limpiar</button>
          </div>

          {/* Lista */}
          <div style={{maxHeight:240,overflowY:"auto"}}>
            {filtrados.length === 0
              ? <div style={{padding:"12px",fontSize:13,color:"var(--muted)",textAlign:"center"}}>Sin resultados</div>
              : filtrados.map(g => {
                  const sel = seleccionados.includes(g.jid);
                  return (
                    <div key={g.jid} onClick={()=>toggle(g.jid)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",background:sel?"rgba(77,159,255,.08)":"transparent",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                      <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${sel?"var(--accent)":"var(--border)"}`,background:sel?"var(--accent)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {sel && <span style={{color:"#fff",fontSize:10,lineHeight:1}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:sel?600:400,color:sel?"var(--text)":"var(--muted)"}}>{g.nombre||g.jid}</div>
                        {g.etiquetas?.length > 0 && (
                          <div style={{fontSize:11,color:"var(--amber)",marginTop:1}}>{g.etiquetas.join(" · ")}</div>
                        )}
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>👥 {g.miembros_count||0}</div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PANEL DE ALERTAS ─────────────────────────────────────────
const SUPA_ALERTAS_URL = `${SUPA_URL}/rest/v1/wa_alertas`;

function AlertasPanel() {
  const [alertas, setAlertas] = useState([]);

  async function cargar() {
    const data = await fetch(`${SUPA_ALERTAS_URL}?leida=eq.false&order=creado_en.desc&limit=20`, { headers: HL }).then(r=>r.json()).catch(()=>[]);
    setAlertas(Array.isArray(data) ? data : []);
  }

  async function marcarLeida(id) {
    await fetch(`${SUPA_ALERTAS_URL}?id=eq.${id}`, { method:"PATCH", headers:{...HL,Prefer:"return=minimal"}, body:JSON.stringify({leida:true}) });
    cargar();
  }

  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return ()=>clearInterval(t); }, []);

  if (!alertas.length) return (
    <div style={{textAlign:"center",padding:"1.5rem",color:"var(--muted)",fontSize:13}}>✅ Sin alertas activas</div>
  );

  return (
    <div>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>🔔 Alertas activas ({alertas.length})</div>
      {alertas.map(a => (
        <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",background:a.tipo==="grupo_caido"?"rgba(239,68,68,.08)":"rgba(16,185,129,.08)",borderRadius:10,marginBottom:8,border:`1px solid ${a.tipo==="grupo_caido"?"rgba(239,68,68,.2)":"rgba(16,185,129,.2)"}`}}>
          <div style={{fontSize:20,flexShrink:0}}>{a.tipo==="grupo_caido"?"🔴":a.tipo==="grupo_recuperado"?"🟢":"🟡"}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{a.nombre_grupo}</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>{a.mensaje}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{new Date(a.creado_en).toLocaleString("es-ES")}</div>
          </div>
          <button onClick={()=>marcarLeida(a.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:16,padding:4}}>✕</button>
        </div>
      ))}
    </div>
  );
}


// ─── PANEL DE GRUPOS WHATSAPP ──────────────────────────────────
const SUPA_GRUPOS_URL  = `${SUPA_URL}/rest/v1/wa_grupos`;
const SUPA_CONFIG_URL  = `${SUPA_URL}/rest/v1/wa_config`;
const SUPA_STORAGE_URL = `${SUPA_URL}/storage/v1/object/wa-media`;
const SUPA_PUBLIC_URL  = `${SUPA_URL}/storage/v1/object/public/wa-media`;
const BOT_URL          = import.meta.env.VITE_BOT_URL || "";

// ─── COMPONENTE DE UPLOAD DE MEDIA ────────────────────────────
function MediaUpload({ value, tipo, onChangeUrl, onChangeTipo, label = "Media" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState(null);
  const inputRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const esImagen = file.type.startsWith("image/");
    const esVideo  = file.type.startsWith("video/");
    if (!esImagen && !esVideo) { setError("Solo se permiten imágenes y videos"); return; }

    // Validar tamaño — imágenes max 5MB, videos max 50MB
    const maxMB = esVideo ? 50 : 5;
    if (file.size > maxMB * 1024 * 1024) { setError(`Máximo ${maxMB}MB para ${esVideo?"videos":"imágenes"}`); return; }

    setUploading(true);
    setError(null);

    try {
      const ext      = file.name.split(".").pop();
      const nombre   = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
      const r = await fetch(`${SUPA_STORAGE_URL}/${nombre}`, {
        method: "POST",
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": file.type },
        body: file
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t); }
      const url = `${SUPA_PUBLIC_URL}/${nombre}`;
      onChangeUrl(url);
      onChangeTipo(esVideo ? "video" : "imagen");
    } catch(e) {
      setError("Error subiendo archivo: " + e.message);
    }
    setUploading(false);
  }

  function limpiar() { onChangeUrl(""); onChangeTipo(""); if (inputRef.current) inputRef.current.value = ""; }

  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,marginBottom:6,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em"}}>{label}</label>

      {/* Preview si hay archivo */}
      {value && tipo === "imagen" && (
        <div style={{marginBottom:8,position:"relative",display:"inline-block"}}>
          <img src={value} alt="preview" style={{maxWidth:200,maxHeight:120,borderRadius:8,border:"1px solid var(--border)",display:"block"}} onError={e=>e.target.style.display="none"} />
          <button onClick={limpiar} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"var(--red)",border:"none",color:"#fff",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      )}
      {value && tipo === "video" && (
        <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"var(--surface2)",borderRadius:8}}>
          <span style={{fontSize:20}}>🎥</span>
          <span style={{fontSize:12,color:"var(--text)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value.split("/").pop()}</span>
          <button onClick={limpiar} style={{background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      )}

      {/* Área de upload */}
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/mov,video/avi"
            onChange={handleFile}
            style={{display:"none"}}
            id={`upload_${label}`}
          />
          <label htmlFor={`upload_${label}`} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"var(--surface2)",border:"1px dashed var(--border)",borderRadius:8,cursor:uploading?"not-allowed":"pointer",fontSize:13,color:"var(--muted)",transition:"border-color .2s"}}>
            {uploading ? "⏳ Subiendo..." : "📎 Subir imagen o video"}
          </label>
        </div>
        <span style={{fontSize:11,color:"var(--muted)",paddingTop:10}}>o</span>
        <input
          type="text"
          value={value||""}
          onChange={e=>{ onChangeUrl(e.target.value); if(e.target.value) onChangeTipo(e.target.value.match(/\.(mp4|mov|avi|webm)$/i)?"video":"imagen"); }}
          placeholder="Pegar URL..."
          style={{flex:2,fontSize:13}}
        />
      </div>
      {error && <div style={{marginTop:6,fontSize:12,color:"var(--red)"}}>{error}</div>}
      <div style={{marginTop:4,fontSize:11,color:"var(--muted)"}}>Imágenes: JPG, PNG, GIF (máx 5MB) · Videos: MP4 (máx 50MB)</div>
    </div>
  );
}

function GruposPanel() {
  const [grupos, setGrupos]       = useState([]);
  const [config, setConfig]       = useState(null);
  const [tab, setTab]             = useState("grupos"); // grupos | mensajes
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [editGrupo, setEditGrupo] = useState(null);

  const show = (msg, tipo="ok") => { setToast({msg,tipo}); setTimeout(()=>setToast(null),3500); };

  async function cargar() {
    setLoading(true);
    try {
      const [g, c] = await Promise.all([
        fetch(`${SUPA_GRUPOS_URL}?select=*&order=creado_en.desc`, { headers: HL }).then(r=>r.json()),
        fetch(`${SUPA_CONFIG_URL}?id=eq.global&select=*`, { headers: HL }).then(r=>r.json())
      ]);
      setGrupos(Array.isArray(g) ? g : []);
      setConfig(c?.[0] || {});
    } catch(e) { show("Error cargando datos", "err"); }
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function guardarConfig() {
    setSaving(true);
    try {
      const r = await fetch(`${SUPA_CONFIG_URL}?id=eq.global`, {
        method: "PATCH", headers: { ...HL, Prefer: "return=minimal" },
        body: JSON.stringify({ ...config, actualizado_en: new Date().toISOString() })
      });
      if (!r.ok) throw new Error("Error guardando");
      // Invalidar cache del bot
      if (BOT_URL) await fetch(`${BOT_URL}/config/refresh`, { method: "POST" }).catch(()=>{});
      show("✓ Configuración guardada");
    } catch(e) { show("❌ Error: " + e.message, "err"); }
    setSaving(false);
  }

  async function actualizarGrupo(id, data) {
    await fetch(`${SUPA_GRUPOS_URL}?id=eq.${id}`, {
      method: "PATCH", headers: { ...HL, Prefer: "return=minimal" },
      body: JSON.stringify(data)
    });
    cargar();
  }

  const estadoColor = { activo:"var(--green)", lleno:"var(--amber)", pausado:"var(--muted)", archivado:"var(--border)" };

  return (
    <div style={{padding:"1.5rem", maxWidth:900, margin:"0 auto"}}>
      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.tipo==="err"?"var(--red)":"var(--green)",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:13}}>{toast.msg}</div>}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <div style={{fontSize:20,fontWeight:700}}>💬 Grupos WhatsApp</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Gestiona tus grupos y mensajes automáticos</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={async()=>{
            try {
              const r = await fetch(`${BOT_URL}/sync/grupos`,{method:"POST"});
              const d = await r.json();
              if(d.ok) { show(`✓ ${d.grupos} grupos sincronizados`); cargar(); }
              else show("❌ " + (d.error||"Error"), "err");
            } catch(e){ show("❌ Bot no disponible","err"); }
          }}>🔄 Forzar sync</button>
          <button className="btn btn-ghost btn-sm" onClick={cargar}>↻ Actualizar</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:"1.5rem",borderBottom:"1px solid var(--border)",paddingBottom:12}}>
        {[["grupos","📊 Grupos"],["mensajes","✉️ Mensajes"],["remarketing","🎯 Remarketing"],["conexion","📡 Conexión WA"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:tab===k?"var(--accent)":"var(--surface2)",color:tab===k?"#fff":"var(--muted)"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TAB GRUPOS ── */}
      {tab === "grupos" && (
        <div>
          {loading ? <div style={{color:"var(--muted)",textAlign:"center",padding:"3rem"}}>Cargando grupos...</div> : (
            grupos.length === 0 ? (
              <div style={{textAlign:"center",padding:"3rem",color:"var(--muted)"}}>
                <div style={{fontSize:40,marginBottom:12}}>💬</div>
                <div style={{fontWeight:600,marginBottom:8}}>No hay grupos sincronizados</div>
                <div style={{fontSize:13}}>Conecta el bot de WhatsApp y los grupos aparecerán aquí automáticamente.</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {grupos.map(g => (
                  <div key={g.id} className="card" style={{padding:"16px 20px"}}>
                    {editGrupo?.id === g.id ? (
                      // Modo edición
                      <div>
                        <div className="form-row" style={{marginBottom:12}}>
                          <div className="field">
                            <label>Nombre</label>
                            <input type="text" value={editGrupo.nombre||""} onChange={e=>setEditGrupo({...editGrupo,nombre:e.target.value})} />
                          </div>
                          <div className="field">
                            <label>Límite de miembros</label>
                            <input type="number" value={editGrupo.limite_miembros||""} onChange={e=>setEditGrupo({...editGrupo,limite_miembros:e.target.value?parseInt(e.target.value):null})} placeholder="Sin límite" />
                          </div>
                        </div>
                        <div className="form-row" style={{marginBottom:12}}>
                          <div className="field">
                            <label>Estado</label>
                            <select value={editGrupo.estado||"activo"} onChange={e=>setEditGrupo({...editGrupo,estado:e.target.value})}>
                              <option value="activo">Activo</option>
                              <option value="pausado">Pausado</option>
                              <option value="archivado">Archivado</option>
                            </select>
                          </div>
                          <div className="field">
                            <label>Link enmascarado ID (opcional)</label>
                            <input type="text" value={editGrupo.link_id||""} onChange={e=>setEditGrupo({...editGrupo,link_id:e.target.value})} placeholder="lnk_..." />
                          </div>
                        </div>
                        <div className="form-row" style={{marginBottom:12}}>
                          <div className="field">
                            <label>Etiquetas <span style={{fontWeight:400,color:"var(--muted)"}}>— separadas por coma (ej: nuevos, VIP)</span></label>
                            <input type="text" value={(editGrupo.etiquetas||[]).join(", ")} onChange={e=>setEditGrupo({...editGrupo,etiquetas:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} placeholder="nuevos, activos, VIP..." />
                          </div>
                          <div className="field">
                            <label>Grupo de respaldo <span style={{fontWeight:400,color:"var(--muted)"}}>— se activa si este cae</span></label>
                            <select value={editGrupo.grupo_respaldo_id||""} onChange={e=>setEditGrupo({...editGrupo,grupo_respaldo_id:e.target.value||null})}>
                              <option value="">Sin respaldo</option>
                              {grupos.filter(og=>og.id!==editGrupo.id).map(og=>(
                                <option key={og.id} value={og.id}>{og.nombre||og.jid}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button className="btn btn-sm" onClick={async()=>{ await actualizarGrupo(g.id,editGrupo); setEditGrupo(null); show("✓ Grupo actualizado"); }}>Guardar</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>setEditGrupo(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      // Vista normal
                      <div style={{display:"flex",alignItems:"center",gap:16}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,fontSize:15}}>{g.nombre || g.jid}</span>
                            <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${estadoColor[g.estado] || "var(--border)"}22`,color:estadoColor[g.estado] || "var(--muted)"}}>{g.estado || "activo"}</span>
                            {g.alerta_activa && <span style={{fontSize:11,background:"rgba(239,68,68,.15)",color:"var(--red)",padding:"2px 8px",borderRadius:10}}>🔴 Caído</span>}
                            {g.link_id && <span style={{fontSize:11,background:"rgba(77,159,255,.15)",color:"var(--accent)",padding:"2px 8px",borderRadius:10}}>🔗 Link</span>}
                            {g.grupo_respaldo_id && <span style={{fontSize:11,background:"rgba(16,185,129,.1)",color:"var(--green)",padding:"2px 8px",borderRadius:10}}>🛡️ Respaldo</span>}
                            {(g.etiquetas||[]).map(et=>(
                              <span key={et} style={{fontSize:11,background:"rgba(255,222,89,.1)",color:"var(--amber)",padding:"2px 8px",borderRadius:10}}>{et}</span>
                            ))}
                          </div>
                          <div style={{fontSize:12,color:"var(--muted)"}}>
                            <span style={{marginRight:16}}>👥 <strong style={{color:"var(--text)"}}>{g.miembros_count || 0}</strong>{g.limite_miembros ? ` / ${g.limite_miembros}` : " miembros"}</span>
                            <span style={{marginRight:16}}>Check: {g.ultimo_check ? new Date(g.ultimo_check).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "—"}</span>
                          </div>
                          {g.alerta_activa && <div style={{fontSize:12,color:"var(--red)",marginTop:4}}>{g.alerta_mensaje}</div>}
                          {g.limite_miembros && (
                            <div style={{marginTop:8,height:4,borderRadius:4,background:"var(--border)",overflow:"hidden"}}>
                              <div style={{height:"100%",borderRadius:4,background:g.miembros_count>=g.limite_miembros?"var(--red)":g.miembros_count/g.limite_miembros>0.8?"var(--amber)":"var(--green)",width:`${Math.min(100,Math.round((g.miembros_count||0)/g.limite_miembros*100))}%`,transition:"width .3s"}} />
                            </div>
                          )}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setEditGrupo({...g})}>✏️ Editar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── TAB MENSAJES AUTOMÁTICOS ── */}
      {tab === "mensajes" && config && (
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>

          {/* Bienvenida */}
          <div className="card" style={{padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>👋 Mensaje de bienvenida</div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Se envía al privado cuando alguien entra a un grupo</div>
              </div>
              <div onClick={()=>setConfig({...config,bienvenida_activo:!config.bienvenida_activo})} style={{cursor:"pointer",width:44,height:24,borderRadius:12,background:config.bienvenida_activo?"var(--accent)":"var(--border)",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,left:config.bienvenida_activo?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
            {config.bienvenida_activo && (
              <div>
                <GruposSelector grupos={grupos} seleccionados={config.grupos_bienvenida||[]} onChange={v=>setConfig({...config,grupos_bienvenida:v})} label="Aplicar a estos grupos" />
                <div className="field" style={{marginBottom:12}}>
                  <label>Mensaje <span style={{color:"var(--muted)",fontWeight:400}}>— usa {"{nombre}"} para el nombre, {"{grupo}"} para el nombre del grupo</span></label>
                  <textarea value={config.bienvenida_texto||""} onChange={e=>setConfig({...config,bienvenida_texto:e.target.value})} rows={5} style={{width:"100%",resize:"vertical"}} placeholder="Hola {nombre}, bienvenido/a al grupo 👋&#10;&#10;Aquí encontrarás..."/>
                </div>
                <MediaUpload label="Imagen o video" value={config.bienvenida_media_url||""} tipo={config.bienvenida_media_tipo||""} onChangeUrl={v=>setConfig({...config,bienvenida_media_url:v})} onChangeTipo={v=>setConfig({...config,bienvenida_media_tipo:v})} />
              </div>
            )}
          </div>

          {/* Despedida */}
          <div className="card" style={{padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>👋 Mensaje de despedida</div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Se envía al privado cuando alguien sale de un grupo</div>
              </div>
              <div onClick={()=>setConfig({...config,despedida_activo:!config.despedida_activo})} style={{cursor:"pointer",width:44,height:24,borderRadius:12,background:config.despedida_activo?"var(--accent)":"var(--border)",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,left:config.despedida_activo?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
            {config.despedida_activo && (
              <div>
                <GruposSelector grupos={grupos} seleccionados={config.grupos_despedida||[]} onChange={v=>setConfig({...config,grupos_despedida:v})} label="Aplicar a estos grupos" />
                <div className="field" style={{marginBottom:12}}>
                  <label>Mensaje <span style={{color:"var(--muted)",fontWeight:400}}>— usa {"{nombre}"} y {"{grupo}"}</span></label>
                  <textarea value={config.despedida_texto||""} onChange={e=>setConfig({...config,despedida_texto:e.target.value})} rows={5} style={{width:"100%",resize:"vertical"}} placeholder="Hasta luego {nombre} 👋&#10;&#10;Fue un placer tenerte con nosotros..."/>
                </div>
                <MediaUpload label="Imagen o video" value={config.despedida_media_url||""} tipo={config.despedida_media_tipo||""} onChangeUrl={v=>setConfig({...config,despedida_media_url:v})} onChangeTipo={v=>setConfig({...config,despedida_media_tipo:v})} />
              </div>
            )}
          </div>

          <button className="btn" style={{alignSelf:"flex-start"}} onClick={guardarConfig} disabled={saving}>
            {saving ? "Guardando..." : "💾 Guardar configuración"}
          </button>
        </div>
      )}

      {/* ── TAB REMARKETING ── */}
      {tab === "remarketing" && config && (
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>

          {/* Toggle principal */}
          <div style={{background:"var(--surface2)",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>🎯 Remarketing activo</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Envía mensajes automáticos a leads que llenaron el formulario pero no entraron al grupo</div>
            </div>
            <div onClick={()=>setConfig({...config,remarketing_activo:!config.remarketing_activo})} style={{cursor:"pointer",width:44,height:24,borderRadius:12,background:config.remarketing_activo?"var(--accent)":"var(--border)",position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{position:"absolute",top:3,left:config.remarketing_activo?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
            </div>
          </div>

          {config.remarketing_activo && (<>

            {/* Mensaje 1 */}
            <div className="card" style={{padding:"20px 24px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>1</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>Primer mensaje</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>Se envía si el lead no entra al grupo en el tiempo definido</div>
                </div>
              </div>
              <div className="form-row" style={{marginBottom:12}}>
                <div className="field" style={{maxWidth:180}}>
                  <label>Enviar después de (minutos)</label>
                  <input type="number" min="1" value={config.remarketing_msg1_min||10} onChange={e=>setConfig({...config,remarketing_msg1_min:parseInt(e.target.value)||10})} />
                </div>
              <GruposSelector grupos={grupos} seleccionados={config.grupos_remarketing1||[]} onChange={v=>setConfig({...config,grupos_remarketing1:v})} label="Aplicar a leads de estos grupos" />
              </div>
              <MediaUpload label="Imagen o video (opcional)" value={config.remarketing_msg1_media_url||""} tipo={config.remarketing_msg1_media_tipo||""} onChangeUrl={v=>setConfig({...config,remarketing_msg1_media_url:v})} onChangeTipo={v=>setConfig({...config,remarketing_msg1_media_tipo:v})} />
              <div className="field">
                <label>Mensaje <span style={{color:"var(--muted)",fontWeight:400}}>— usa {"{nombre}"} y {"{link}"}</span></label>
                <textarea value={config.remarketing_msg1_texto||""} onChange={e=>setConfig({...config,remarketing_msg1_texto:e.target.value})} rows={4} style={{width:"100%",resize:"vertical"}} placeholder="Hola {nombre} 👋, vimos que te registraste pero aún no te has unido al grupo. Aquí tienes el link: {link}"/>
              </div>
              <div style={{marginTop:10,padding:"8px 12px",background:"rgba(77,159,255,.06)",borderRadius:8,fontSize:12,color:"var(--muted)"}}>
                💡 Este mensaje se envía al WhatsApp privado del lead, no al grupo.
              </div>
            </div>

            {/* Mensaje 2 */}
            <div className="card" style={{padding:"20px 24px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"var(--surface2)",border:"2px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"var(--muted)",flexShrink:0}}>2</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>Segundo mensaje</div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>Recordatorio final — solo si aún no entró</div>
                  </div>
                </div>
                <div onClick={()=>setConfig({...config,remarketing_msg2_activo:!config.remarketing_msg2_activo})} style={{cursor:"pointer",width:44,height:24,borderRadius:12,background:config.remarketing_msg2_activo?"var(--green)":"var(--border)",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:config.remarketing_msg2_activo?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                </div>
              </div>
              {config.remarketing_msg2_activo && (
                <>
                  <div className="form-row" style={{marginBottom:12}}>
                    <div className="field" style={{maxWidth:180}}>
                      <label>Enviar después de (horas)</label>
                      <input type="number" min="1" value={config.remarketing_msg2_horas||24} onChange={e=>setConfig({...config,remarketing_msg2_horas:parseInt(e.target.value)||24})} />
                    </div>
                  <GruposSelector grupos={grupos} seleccionados={config.grupos_remarketing2||[]} onChange={v=>setConfig({...config,grupos_remarketing2:v})} label="Aplicar a leads de estos grupos" />
                  </div>
                  <MediaUpload label="Imagen o video (opcional)" value={config.remarketing_msg2_media_url||""} tipo={config.remarketing_msg2_media_tipo||""} onChangeUrl={v=>setConfig({...config,remarketing_msg2_media_url:v})} onChangeTipo={v=>setConfig({...config,remarketing_msg2_media_tipo:v})} />
                  <div className="field">
                    <label>Mensaje</label>
                    <textarea value={config.remarketing_msg2_texto||""} onChange={e=>setConfig({...config,remarketing_msg2_texto:e.target.value})} rows={4} style={{width:"100%",resize:"vertical"}} placeholder="Hola {nombre}, es tu última oportunidad de unirte 🚀 {link}"/>
                  </div>
                  <div style={{marginTop:10,padding:"8px 12px",background:"rgba(255,222,89,.06)",borderRadius:8,fontSize:12,color:"var(--amber)"}}>
                    ⚠️ Recomendamos no enviar más de 2 mensajes para evitar que el número sea reportado como spam.
                  </div>
                </>
              )}
              {!config.remarketing_msg2_activo && (
                <div style={{fontSize:12,color:"var(--muted)",padding:"8px 0"}}>Activa el segundo mensaje si quieres enviar un recordatorio final a las {config.remarketing_msg2_horas||24} horas.</div>
              )}
            </div>

            {/* Resumen visual del flujo */}
            <div style={{background:"var(--surface2)",borderRadius:10,padding:"14px 18px"}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Flujo de remarketing</div>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,flexWrap:"wrap"}}>
                <span style={{padding:"4px 10px",background:"rgba(77,159,255,.15)",color:"var(--accent)",borderRadius:20}}>Lead llena formulario</span>
                <span style={{color:"var(--muted)"}}>→</span>
                <span style={{padding:"4px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:20}}>{config.remarketing_msg1_min||10} min</span>
                <span style={{color:"var(--muted)"}}>→</span>
                <span style={{padding:"4px 10px",background:"rgba(16,185,129,.15)",color:"var(--green)",borderRadius:20}}>Mensaje 1</span>
                {config.remarketing_msg2_activo && (<>
                  <span style={{color:"var(--muted)"}}>→</span>
                  <span style={{padding:"4px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:20}}>{config.remarketing_msg2_horas||24}h</span>
                  <span style={{color:"var(--muted)"}}>→</span>
                  <span style={{padding:"4px 10px",background:"rgba(16,185,129,.15)",color:"var(--green)",borderRadius:20}}>Mensaje 2</span>
                </>)}
                <span style={{color:"var(--muted)"}}>→</span>
                <span style={{padding:"4px 10px",background:"rgba(239,68,68,.1)",color:"var(--red)",borderRadius:20}}>Si entra al grupo → se cancela ✓</span>
              </div>
            </div>

          </>)}

          <button className="btn" style={{alignSelf:"flex-start"}} onClick={guardarConfig} disabled={saving}>
            {saving ? "Guardando..." : "💾 Guardar configuración"}
          </button>
        </div>
      )}

      {/* ── TAB CONEXIÓN WA ── */}
      {tab === "conexion" && (
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div className="card" style={{padding:"24px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>📡</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Vincular WhatsApp</div>
            <div style={{fontSize:13,color:"var(--muted)",marginBottom:24}}>Escanea el QR desde WhatsApp → Dispositivos vinculados → Vincular dispositivo</div>
            <iframe
              src={`${BOT_URL}/qr`}
              style={{width:"100%",height:420,border:"none",borderRadius:12,background:"var(--bg)"}}
              title="QR WhatsApp"
            />
            <div style={{marginTop:16,display:"flex",gap:8,justifyContent:"center"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ const el = document.querySelector("iframe"); if(el) el.src=el.src; }}>🔄 Refrescar QR</button>
              <a href={`${BOT_URL}/health`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">🔍 Estado del bot</a>
            </div>
          </div>

          {/* Alertas activas */}
          <AlertasPanel />
        </div>
      )}
    </div>
  );
}

// ─── PANEL PRINCIPAL DE LINKS ──────────────────────────────────
function LinksPanel() {
  const [links, setLinks]         = useState([]);
  const [grupos, setGrupos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editLink, setEditLink]   = useState(null);
  const [filtroGrupo, setFiltroG] = useState("todos");
  const [busqueda, setBusqueda]   = useState("");
  const [filtroInactividad, setFiltroInactividad] = useState("todos"); // todos | activos | inactivos_7 | inactivos_30
  const [detalle, setDetalle]     = useState(null);
  const { show, el: toastEl }     = useToast();

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://trafficker-app.vercel.app";

  async function cargar() {
    setLoading(true);
    const data = await LinksDB.getAll();
    setLinks(data);
    const gs = [...new Set(data.map(l => l.grupo).filter(Boolean))];
    setGrupos(gs);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleSave(linkData) {
    if (editLink) {
      const res = await LinksDB.update(editLink.id, linkData);
      if (!res.ok) return show("❌ Error al actualizar: " + (res.error || "desconocido"), "err");
      show("✓ Link actualizado", "ok");
    } else {
      const payload = { ...linkData, id: "lnk_" + Date.now(), created_at: new Date().toISOString(), total_clicks: 0, clicks: [], active: true };
      const res = await LinksDB.create(payload);
      if (!res.ok) return show("❌ Error al crear link: " + (res.error || "desconocido"), "err");
      show("✓ Link creado", "ok");
    }
    setShowForm(false); setEditLink(null);
    await cargar();
  }

  async function toggleActive(link) {
    await LinksDB.update(link.id, { active: !link.active });
    show(link.active ? "Link desactivado" : "Link activado", "ok");
    cargar();
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este link permanentemente?")) return;
    await LinksDB.delete(id);
    show("Link eliminado", "ok");
    cargar();
  }

  function copiarLink(slug) {
    const url = `${BASE_URL}/r/${slug}`;
    navigator.clipboard.writeText(url);
    show("✓ Link copiado: " + url, "ok");
  }

  function getDiasInactivo(link) {
    const ref = link.ultimo_click || link.created_at;
    if (!ref) return 999;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  }

  const linksFiltrados = links
    .filter(l => filtroGrupo === "todos" || l.grupo === filtroGrupo)
    .filter(l => !busqueda || l.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || l.slug?.includes(busqueda))
    .filter(l => {
      if (filtroInactividad === "todos") return true;
      if (filtroInactividad === "activos") return getDiasInactivo(l) < 7;
      if (filtroInactividad === "inactivos_7") return getDiasInactivo(l) >= 7 && getDiasInactivo(l) < 30;
      if (filtroInactividad === "inactivos_30") return getDiasInactivo(l) >= 30;
      return true;
    });

  const inactivos7  = links.filter(l => getDiasInactivo(l) >= 7 && getDiasInactivo(l) < 30).length;
  const inactivos30 = links.filter(l => getDiasInactivo(l) >= 30).length;

  if (loading) return <div className="empty"><div style={{opacity:.3}}>⏳</div><div>Cargando links...</div></div>;

  return (
    <>
      {toastEl}
      <div>
        {/* Header */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:8}}>
          <div>
            <div style={{fontWeight:700, fontSize:18}}>🔗 Links Enmascarados</div>
            <div style={{fontSize:12, color:"var(--muted)", marginTop:2}}>{links.length} links · Base URL: <code style={{background:"var(--surface2)", padding:"1px 6px", borderRadius:4}}>{BASE_URL}/r/...</code></div>
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {inactivos30 > 0 && (
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:"rgba(239,68,68,.12)",color:"var(--red)",fontWeight:600,cursor:"pointer"}}
                onClick={()=>setFiltroInactividad("inactivos_30")}>
                ⚠️ {inactivos30} sin clicks 30d+
              </span>
            )}
            {inactivos7 > 0 && (
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:"rgba(255,222,89,.1)",color:"var(--amber)",fontWeight:600,cursor:"pointer"}}
                onClick={()=>setFiltroInactividad("inactivos_7")}>
                🕐 {inactivos7} sin clicks 7d+
              </span>
            )}
            <button className="btn btn-primary" onClick={() => { setEditLink(null); setShowForm(true); }}>+ Nuevo link</button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{display:"flex", gap:8, marginBottom:"1rem", flexWrap:"wrap", alignItems:"center"}}>
          <div className="period-pills">
            <button className={"pill "+(filtroGrupo==="todos"?"active":"")} onClick={()=>setFiltroG("todos")}>Todos</button>
            {grupos.map(g => <button key={g} className={"pill "+(filtroGrupo===g?"active":"")} onClick={()=>setFiltroG(g)}>{g}</button>)}
          </div>
          <div className="period-pills">
            <button className={"pill "+(filtroInactividad==="todos"?"active":"")} onClick={()=>setFiltroInactividad("todos")}>Todos</button>
            <button className={"pill "+(filtroInactividad==="activos"?"active":"")} onClick={()=>setFiltroInactividad("activos")}>🟢 Activos</button>
            <button className={"pill "+(filtroInactividad==="inactivos_7"?"active":"")} onClick={()=>setFiltroInactividad("inactivos_7")}>🟡 +7d sin click</button>
            <button className={"pill "+(filtroInactividad==="inactivos_30"?"active":"")} onClick={()=>setFiltroInactividad("inactivos_30")}>🔴 +30d sin click</button>
          </div>
          <div style={{position:"relative", flex:1, maxWidth:280}}>
            <input type="text" value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              placeholder="Buscar link..." style={{paddingLeft:28, fontSize:12}}/>
            <span style={{position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"var(--muted)"}}>🔍</span>
          </div>
        </div>

        {/* Formulario */}
        {showForm && <LinkForm link={editLink} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditLink(null);}} baseUrl={BASE_URL} />}

        {/* Lista de links */}
        {linksFiltrados.length === 0 ? (
          <div className="empty"><div style={{fontSize:32,opacity:.3}}>🔗</div><div style={{marginTop:8}}>Sin links aún. Crea el primero.</div></div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:"0.75rem"}}>
            {linksFiltrados.map(link => (
              <LinkCard key={link.id} link={link} baseUrl={BASE_URL}
                onCopy={()=>copiarLink(link.slug)}
                onEdit={()=>{setEditLink(link); setShowForm(true);}}
                onToggle={()=>toggleActive(link)}
                onDelete={()=>handleDelete(link.id)}
                onDetalle={()=>setDetalle(detalle?.id===link.id?null:link)}
              />
            ))}
          </div>
        )}

        {/* Panel de detalle/analytics */}
        {detalle && <LinkAnalytics link={detalle} onClose={()=>setDetalle(null)} />}
      </div>
    </>
  );
}

// ─── TARJETA DE LINK ───────────────────────────────────────────
function generarQR(url, size = 256) {
  // QR usando la API pública de QR Server (no requiere librería)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=4d9fff&bgcolor=0a0f1e&format=png&margin=2`;
}

async function descargarQR(url, nombre) {
  try {
    const qrUrl = generarQR(url, 512);
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${nombre || "link"}.png`;
    a.click();
  } catch {
    // Fallback: abrir en nueva pestaña para guardar manualmente
    window.open(generarQR(url, 512), "_blank");
  }
}

function LinkCard({ link, baseUrl, onCopy, onEdit, onToggle, onDelete, onDetalle }) {
  const [showQR, setShowQR] = useState(false);
  const url = `${baseUrl}/r/${link.slug}`;
  const destinos = link.destinos || [];
  const clicks = link.total_clicks || 0;
  const activo = link.active !== false;
  const ultimoClick = link.ultimo_click ? new Date(link.ultimo_click).toLocaleDateString("es-EC") : null;

  // ── Contador de inactividad ───────────────────────────────────────────────
  const diasSinClick = (() => {
    if (!link.ultimo_click && !link.created_at) return null;
    const ref = link.ultimo_click || link.created_at;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  })();
  const inactivoAlerta = diasSinClick !== null && diasSinClick >= 7;
  const inactivoCritico = diasSinClick !== null && diasSinClick >= 30;

  // Calcular distribución de países
  const paises = (link.clicks || []).reduce((acc, c) => {
    if (c.country) acc[c.country] = (acc[c.country]||0)+1;
    return acc;
  }, {});
  const topPais = Object.entries(paises).sort((a,b)=>b[1]-a[1])[0];
  const topPlataforma = (() => {
    const plats = (link.clicks||[]).reduce((acc,c) => { if(c.platform) acc[c.platform]=(acc[c.platform]||0)+1; return acc; }, {});
    return Object.entries(plats).sort((a,b)=>b[1]-a[1])[0];
  })();

  return (
    <div className="card" style={{borderLeft: `3px solid ${inactivoCritico?"var(--red)":inactivoAlerta?"var(--amber)":activo?"var(--accent)":"var(--border)"}`, opacity:activo?1:0.6}}>
      <div style={{display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap"}}>
        {/* Info principal */}
        <div style={{flex:1, minWidth:200}}>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
            <span style={{fontWeight:700, fontSize:14}}>{link.nombre || link.slug}</span>
            {link.grupo && <span style={{fontSize:10, background:"rgba(77,159,255,.15)", color:"#4d9fff", padding:"2px 8px", borderRadius:10}}>{link.grupo}</span>}
            {!activo && <span style={{fontSize:10, background:"rgba(239,68,68,.15)", color:"var(--red)", padding:"2px 8px", borderRadius:10}}>Inactivo</span>}
            {link.usar_landing && <span style={{fontSize:10, background:"rgba(255,222,89,.1)", color:"var(--amber)", padding:"2px 8px", borderRadius:10}}>🛡️ Landing</span>}
            {link.rotacion_automatica && <span style={{fontSize:10, background:"rgba(16,185,129,.1)", color:"var(--green)", padding:"2px 8px", borderRadius:10}}>🔄 Rotación</span>}
            {/* Badge de inactividad */}
            {inactivoCritico && <span style={{fontSize:10, background:"rgba(239,68,68,.15)", color:"var(--red)", padding:"2px 8px", borderRadius:10}}>⚠️ {diasSinClick}d sin clicks</span>}
            {inactivoAlerta && !inactivoCritico && <span style={{fontSize:10, background:"rgba(255,222,89,.1)", color:"var(--amber)", padding:"2px 8px", borderRadius:10}}>🕐 {diasSinClick}d sin clicks</span>}
          </div>
          <div style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--accent)", marginBottom:6}}>{url}</div>
          <div style={{fontSize:11, color:"var(--muted)"}}>
            {destinos.length} destino{destinos.length!==1?"s":""} · {ultimoClick ? `Último click: ${ultimoClick}` : "Sin clicks aún"}
          </div>
          {destinos.length > 0 && (
            <div style={{marginTop:4, fontSize:11, color:"var(--muted)"}}>
              {destinos.map((d,i) => (
                <div key={i} style={{display:"flex", gap:6, alignItems:"center", marginTop:2}}>
                  <span style={{color: d.activo===false?"var(--red)":"var(--green)", fontSize:8}}>●</span>
                  <span style={{color:"var(--muted)"}}>{d.nombre || "Destino "+(i+1)}</span>
                  {d.paises?.length > 0 && <span style={{fontSize:9, color:"var(--accent2)"}}>[{d.paises.join(",")}]</span>}
                  {d.limite_clicks && <span style={{fontSize:9, color:"var(--muted)"}}>{d.clicks||0}/{d.limite_clicks} clicks</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats rápidas */}
        <div style={{display:"flex", gap:16, fontSize:11, textAlign:"center"}}>
          <div><div style={{fontSize:22, fontFamily:"var(--mono)", fontWeight:700, color:"var(--accent2)"}}>{clicks}</div><div style={{color:"var(--muted)"}}>Clicks</div></div>
          {topPais && <div><div style={{fontSize:13, fontWeight:600}}>{topPais[0]}</div><div style={{color:"var(--muted)"}}>Top país</div></div>}
          {topPlataforma && <div><div style={{fontSize:13, fontWeight:600}}>{topPlataforma[0]}</div><div style={{color:"var(--muted)"}}>Top fuente</div></div>}
        </div>

        {/* Acciones */}
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          <button className="btn btn-primary btn-sm" onClick={onCopy} title="Copiar link">📋</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowQR(v=>!v)} title="Ver / descargar QR">◻️ QR</button>
          <button className="btn btn-ghost btn-sm" onClick={onDetalle} title="Ver analytics">📊</button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar">✏️</button>
          <button className="btn btn-ghost btn-sm" onClick={onToggle} title={activo?"Desactivar":"Activar"} style={{color:activo?"var(--red)":"var(--green)"}}>{activo?"⏸":"▶"}</button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} title="Eliminar" style={{color:"var(--red)"}}>🗑</button>
        </div>
      </div>

      {/* Panel QR */}
      {showQR && (
        <div style={{marginTop:12,padding:"14px 16px",background:"var(--surface2)",borderRadius:10,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <img src={generarQR(url, 160)} alt="QR" style={{width:160,height:160,borderRadius:8,imageRendering:"pixelated"}} />
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Código QR — {link.nombre}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--accent)",marginBottom:12,wordBreak:"break-all"}}>{url}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-primary btn-sm" onClick={()=>descargarQR(url,link.nombre)}>⬇️ Descargar PNG</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowQR(false)}>Cerrar</button>
            </div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:8}}>512×512px · fondo oscuro · azul Trafficker Pro</div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── FORMULARIO DE LINK ────────────────────────────────────────
function LinkForm({ link, onSave, onCancel, baseUrl }) {
  const isEdit = !!link;
  const [form, setForm] = useState({
    nombre: link?.nombre || "",
    slug: link?.slug || genSlug(),
    grupo: link?.grupo || "",
    usar_landing: link?.usar_landing ?? false,
    landing_titulo: link?.landing_titulo || "¡Únete al grupo!",
    landing_descripcion: link?.landing_descripcion || "Haz clic para unirte al grupo de WhatsApp",
    landing_imagen: link?.landing_imagen || "",
    pixel_fb: link?.pixel_fb || "",
    pixel_tiktok: link?.pixel_tiktok || "",
    rotacion_automatica: link?.rotacion_automatica ?? false,
    destinos: link?.destinos || [{ id:"d1", nombre:"Grupo 1", url:"", paises:[], limite_clicks:null, clicks:0, activo:true }],
    notas: link?.notas || "",
    // UTMs
    utm_source: link?.utm_source || "",
    utm_medium: link?.utm_medium || "link",
    utm_campaign: link?.utm_campaign || "",
    utm_content: link?.utm_content || "",
    utm_term: link?.utm_term || "",
  });
  const f = (k, v) => setForm(p => ({...p, [k]: v}));

  // Preview URL con UTMs aplicados al primer destino activo
  const buildUrlConUtm = (destUrl) => {
    if (!destUrl) return "";
    const utms = [
      form.utm_source   && `utm_source=${encodeURIComponent(form.utm_source)}`,
      form.utm_medium   && `utm_medium=${encodeURIComponent(form.utm_medium)}`,
      form.utm_campaign && `utm_campaign=${encodeURIComponent(form.utm_campaign)}`,
      form.utm_content  && `utm_content=${encodeURIComponent(form.utm_content)}`,
      form.utm_term     && `utm_term=${encodeURIComponent(form.utm_term)}`,
    ].filter(Boolean).join("&");
    if (!utms) return destUrl;
    return destUrl + (destUrl.includes("?") ? "&" : "?") + utms;
  };

  function addDestino() {
    setForm(p => ({...p, destinos: [...p.destinos, { id:"d"+Date.now(), nombre:"Grupo "+(p.destinos.length+1), url:"", paises:[], limite_clicks:null, clicks:0, activo:true }]}));
  }
  function updDestino(id, k, v) {
    setForm(p => ({...p, destinos: p.destinos.map(d => d.id===id ? {...d, [k]:v} : d)}));
  }
  function delDestino(id) {
    setForm(p => ({...p, destinos: p.destinos.filter(d => d.id!==id)}));
  }

  function handleSubmit() {
    if (!form.nombre) return alert("Ingresa un nombre para el link");
    if (!form.slug) return alert("El slug no puede estar vacío");
    if (form.destinos.length === 0) return alert("Agrega al menos un destino");
    if (form.destinos.some(d => !d.url)) return alert("Todos los destinos necesitan una URL");
    onSave(form);
  }

  const urlPreview = `${baseUrl}/r/${form.slug}`;

  return (
    <div className="card" style={{borderColor:"rgba(0,74,173,.3)", marginBottom:"1rem"}}>
      <div className="card-title">{isEdit?"Editar link":"Nuevo link enmascarado"}</div>

      <div className="form-row">
        <div className="field"><label>Nombre del link *</label><input type="text" value={form.nombre} onChange={e=>f("nombre",e.target.value)} placeholder="Ej: WA Lanzamiento EC" /></div>
        <div className="field"><label>Grupo/Categoría</label><input type="text" value={form.grupo} onChange={e=>f("grupo",e.target.value)} placeholder="Ej: Evelyn Cherrez" /></div>
      </div>

      <div className="field">
        <label>Slug (parte final del URL)</label>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <input type="text" value={form.slug} onChange={e=>f("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} style={{flex:1, fontFamily:"var(--mono)"}} />
          <button className="btn btn-ghost btn-sm" onClick={()=>f("slug",genSlug())} title="Generar nuevo slug">🔄</button>
        </div>
        <div style={{fontSize:11, color:"var(--accent)", marginTop:4, fontFamily:"var(--mono)"}}>{urlPreview}</div>
      </div>

      {/* Toggle: Página intermedia */}
      <div style={{background:"var(--surface2)", borderRadius:10, padding:"12px 16px", marginBottom:0, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12}}>
        <div>
          <div style={{fontWeight:600, fontSize:13}}>🛡️ Página intermedia</div>
          <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>Muestra una landing antes de redirigir. Actívala si usas píxeles de retargeting.</div>
        </div>
        <div onClick={()=>f("usar_landing",!form.usar_landing)} style={{cursor:"pointer", width:44, height:24, borderRadius:12, background:form.usar_landing?"var(--accent)":"var(--border)", position:"relative", transition:"background .2s", flexShrink:0}}>
          <div style={{position:"absolute", top:3, left:form.usar_landing?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s"}}/>
        </div>
      </div>

      {/* Advertencia siempre visible */}
      <div style={{background:"rgba(255,222,89,.06)", border:"1px solid rgba(255,222,89,.2)", borderRadius:"0 0 10px 10px", padding:"10px 16px", marginBottom:"0.75rem"}}>
        <div style={{fontSize:11, color:"var(--muted)", lineHeight:1.6}}>
          <span style={{color:"var(--amber)", fontWeight:600}}>¿Cuándo activarla?</span>{" "}
          Úsala cuando tengas un <strong style={{color:"var(--text)"}}>píxel de Facebook o TikTok</strong> activo — la landing lo dispara antes de redirigir, lo que te permite hacer retargeting de todos los que hicieron clic.{" "}
          <span style={{color:"var(--amber)"}}>⚠️ Agrega un paso extra antes de llegar a WhatsApp, lo que puede bajar ligeramente la conversión directa.</span>{" "}
          Si el link es orgánico o no usas píxeles, <strong style={{color:"var(--text)"}}>déjala apagada</strong> para máxima conversión.
        </div>
      </div>

      {form.usar_landing && (
        <div style={{borderLeft:"2px solid var(--accent)", paddingLeft:12, marginBottom:"0.75rem"}}>
          <div className="form-row">
            <div className="field"><label>Título de la landing</label><input type="text" value={form.landing_titulo} onChange={e=>f("landing_titulo",e.target.value)} /></div>
            <div className="field"><label>Descripción</label><input type="text" value={form.landing_descripcion} onChange={e=>f("landing_descripcion",e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Imagen URL (og:image)</label><input type="text" value={form.landing_imagen} onChange={e=>f("landing_imagen",e.target.value)} placeholder="https://..." /></div>
          </div>
          <div style={{fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", margin:".75rem 0 .5rem"}}>Pixels de conversión</div>
          <div className="form-row">
            <div className="field"><label>Pixel Facebook ID</label><input type="text" value={form.pixel_fb} onChange={e=>f("pixel_fb",e.target.value)} placeholder="1234567890" /></div>
            <div className="field"><label>Pixel TikTok ID</label><input type="text" value={form.pixel_tiktok} onChange={e=>f("pixel_tiktok",e.target.value)} placeholder="ABCDEF123456" /></div>
          </div>
          {/* Preview branding */}
          <div style={{marginTop:"0.75rem", background:"var(--bg)", borderRadius:10, padding:"10px 14px", border:"1px solid var(--border)"}}>
            <div style={{fontSize:11, color:"var(--muted)", marginBottom:6}}>Vista previa del pie de página en la landing:</div>
            <div style={{fontSize:11, color:"var(--muted)", textAlign:"center", opacity:.7}}>📊 <strong style={{color:"var(--text)"}}>TRAFFICK PRO</strong> by Gavico</div>
          </div>
        </div>
      )}

      {/* Toggle: Rotación automática */}
      <div style={{background:"var(--surface2)", borderRadius:10, padding:"12px 16px", marginBottom:"0.75rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12}}>
        <div>
          <div style={{fontWeight:600, fontSize:13}}>🔄 Rotación automática de destinos</div>
          <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>Distribuye el tráfico entre los destinos activos según orden, país y límites de clicks. Si está OFF, siempre va al primer destino activo.</div>
        </div>
        <div onClick={()=>f("rotacion_automatica",!form.rotacion_automatica)} style={{cursor:"pointer", width:44, height:24, borderRadius:12, background:form.rotacion_automatica?"var(--accent)":"var(--border)", position:"relative", transition:"background .2s", flexShrink:0}}>
          <div style={{position:"absolute", top:3, left:form.rotacion_automatica?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s"}}/>
        </div>
      </div>

      {/* Destinos */}
      <div style={{fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", margin:"1rem 0 .5rem"}}>
        Destinos {form.rotacion_automatica ? "y rotación" : ""}
        <span style={{fontSize:11, fontWeight:400, marginLeft:8, textTransform:"none"}}>
          {form.rotacion_automatica ? "— Se rotan en orden. Puedes segmentar por país o limitar por clicks." : "— Siempre redirige al primer destino activo."}
        </span>
      </div>
      {form.destinos.map((d, i) => (
        <div key={d.id} style={{background:"var(--surface2)", borderRadius:10, padding:"12px", marginBottom:8}}>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
            <div style={{fontWeight:600, fontSize:12}}>Destino {i+1}</div>
            <div style={{display:"flex", gap:6}}>
              <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={()=>updDestino(d.id,"activo",!d.activo)}>{d.activo!==false?"✅ Activo":"❌ Inactivo"}</button>
              {form.destinos.length > 1 && <button className="btn btn-ghost btn-sm" style={{color:"var(--red)",fontSize:10}} onClick={()=>delDestino(d.id)}>× Eliminar</button>}
            </div>
          </div>
          <div className="form-row">
            <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>Nombre</label><input type="text" value={d.nombre} onChange={e=>updDestino(d.id,"nombre",e.target.value)} placeholder="Ej: Grupo WhatsApp EC" style={{fontSize:12}}/></div>
            <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>URL destino *</label><input type="text" value={d.url} onChange={e=>updDestino(d.id,"url",e.target.value)} placeholder="https://chat.whatsapp.com/..." style={{fontSize:12,fontFamily:"var(--mono)"}}/></div>
          </div>
          <div className="form-row" style={{marginTop:8}}>
            <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>Países (códigos separados por coma)</label><input type="text" value={(d.paises||[]).join(",")} onChange={e=>updDestino(d.id,"paises",e.target.value.split(",").map(p=>p.trim().toUpperCase()).filter(Boolean))} placeholder="EC,CO,PE — vacío = todos" style={{fontSize:12}}/></div>
            <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>Límite de clicks (vacío = sin límite)</label><input type="number" value={d.limite_clicks||""} onChange={e=>updDestino(d.id,"limite_clicks",e.target.value?parseInt(e.target.value):null)} placeholder="500" style={{fontSize:12}}/></div>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addDestino} style={{marginBottom:"1rem"}}>+ Agregar destino</button>

      {/* UTMs */}
      <div style={{background:"var(--surface2)", borderRadius:10, padding:"12px 16px", marginBottom:"0.75rem"}}>
        <div style={{fontWeight:600, fontSize:13, marginBottom:2}}>🏷️ Parámetros UTM</div>
        <div style={{fontSize:11, color:"var(--muted)", marginBottom:10}}>
          Se agregan automáticamente a cada URL de destino. Facebook los lee para atribución. Usa <code style={{color:"var(--accent)"}}>{"{{slug}}"}</code> como valor dinámico.
        </div>
        <div className="form-row">
          <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>utm_source</label><input type="text" value={form.utm_source} onChange={e=>f("utm_source",e.target.value)} placeholder="facebook, tiktok, email..." style={{fontSize:12}}/></div>
          <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>utm_medium</label><input type="text" value={form.utm_medium} onChange={e=>f("utm_medium",e.target.value)} placeholder="cpc, link, post..." style={{fontSize:12}}/></div>
        </div>
        <div className="form-row" style={{marginTop:8}}>
          <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>utm_campaign</label><input type="text" value={form.utm_campaign} onChange={e=>f("utm_campaign",e.target.value)} placeholder="nombre de campaña" style={{fontSize:12}}/></div>
          <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>utm_content</label><input type="text" value={form.utm_content} onChange={e=>f("utm_content",e.target.value)} placeholder="variante del anuncio" style={{fontSize:12}}/></div>
        </div>
        <div style={{marginTop:8}}>
          <div className="field" style={{marginBottom:0}}><label style={{fontSize:11}}>utm_term</label><input type="text" value={form.utm_term} onChange={e=>f("utm_term",e.target.value)} placeholder="palabra clave" style={{fontSize:12}}/></div>
        </div>
        {/* Preview del primer destino con UTMs */}
        {form.destinos[0]?.url && (form.utm_source || form.utm_campaign) && (
          <div style={{marginTop:10, padding:"6px 10px", background:"rgba(0,0,0,.2)", borderRadius:6}}>
            <div style={{fontSize:10, color:"var(--muted)", marginBottom:2}}>Preview URL con UTMs:</div>
            <div style={{fontSize:10, fontFamily:"var(--mono)", color:"var(--accent)", wordBreak:"break-all"}}>{buildUrlConUtm(form.destinos[0].url)}</div>
          </div>
        )}
      </div>

      <div className="field"><label>Notas internas</label><input type="text" value={form.notas} onChange={e=>f("notas",e.target.value)} placeholder="Uso interno..." /></div>

      <div style={{display:"flex", gap:8, marginTop:8}}>
        <button className="btn btn-primary" onClick={handleSubmit}>{isEdit?"💾 Guardar cambios":"✅ Crear link"}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── ANALYTICS DEL LINK ────────────────────────────────────────
function LinkAnalytics({ link, onClose }) {
  const clicks = link.clicks || [];
  const total = link.total_clicks || 0;

  const agrupar = (campo) => clicks.reduce((acc, c) => {
    const k = c[campo] || "Unknown";
    acc[k] = (acc[k]||0)+1;
    return acc;
  }, {});

  const paises    = Object.entries(agrupar("country")).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const platafs   = Object.entries(agrupar("platform")).sort((a,b)=>b[1]-a[1]);
  const devices   = Object.entries(agrupar("device")).sort((a,b)=>b[1]-a[1]);
  const browsers  = Object.entries(agrupar("browser")).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const destStats = Object.entries(agrupar("destino_id")).sort((a,b)=>b[1]-a[1]);

  // Clicks por día (últimos 14 días)
  const hoy = new Date();
  const clicksPorDia = Array.from({length:14},(_,i)=>{
    const d = new Date(hoy); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    return { fecha: key.slice(5), count: clicks.filter(c=>c.ts?.slice(0,10)===key).length };
  }).reverse();

  const maxDay = Math.max(...clicksPorDia.map(d=>d.count),1);

  function BarsSimple({ data, total }) {
    return (
      <div style={{display:"flex", flexDirection:"column", gap:6}}>
        {data.map(([label, count]) => (
          <div key={label} style={{display:"flex", gap:8, alignItems:"center", fontSize:12}}>
            <div style={{width:100, color:"var(--muted)", textAlign:"right", fontSize:11, flexShrink:0}}>{label}</div>
            <div style={{flex:1, background:"var(--surface2)", borderRadius:20, height:8, overflow:"hidden"}}>
              <div style={{width:(count/Math.max(...data.map(d=>d[1]),1)*100)+"%", height:"100%", background:"var(--accent)", borderRadius:20}}/>
            </div>
            <div style={{fontFamily:"var(--mono)", fontWeight:600, width:32, textAlign:"right"}}>{count}</div>
            <div style={{color:"var(--muted)", fontSize:10, width:36}}>{total>0?(count/total*100).toFixed(0)+"%":""}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card" style={{marginTop:"1rem", borderColor:"rgba(0,74,173,.3)"}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:"1rem"}}>
        <div className="card-title" style={{margin:0}}>📊 Analytics — {link.nombre}</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>× Cerrar</button>
      </div>

      {total === 0 ? (
        <div className="empty"><div style={{opacity:.3}}>📊</div><div style={{marginTop:6}}>Sin clicks aún.</div></div>
      ) : (
        <div>
          {/* Resumen */}
          <div className="grid4" style={{marginBottom:"1rem"}}>
            {[["Total clicks", total, "var(--accent2)"],["Países", Object.keys(agrupar("country")).length, "var(--text)"],["Dispositivos", Object.keys(agrupar("device")).length, "var(--text)"],["Fuentes", Object.keys(agrupar("platform")).length, "var(--text)"]].map(([l,v,c])=>(
              <div key={l} className="card" style={{padding:"1rem",textAlign:"center"}}>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:4}}>{l}</div>
                <div style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Gráfica de días */}
          <div style={{marginBottom:"1.5rem"}}>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>Clicks últimos 14 días</div>
            <div style={{display:"flex", gap:3, alignItems:"flex-end", height:60}}>
              {clicksPorDia.map((d,i)=>(
                <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3}}>
                  <div style={{width:"100%", background:"var(--accent)", borderRadius:"3px 3px 0 0", height:Math.max(d.count/maxDay*52,d.count>0?4:0)+"px", opacity:d.count>0?1:0.2}}/>
                  <div style={{fontSize:8,color:"var(--muted)",transform:"rotate(-45deg)",transformOrigin:"center",whiteSpace:"nowrap"}}>{d.fecha}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid2" style={{gap:"1.5rem"}}>
            {paises.length>0 && <div><div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Por país</div><BarsSimple data={paises} total={total}/></div>}
            {platafs.length>0 && <div><div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Por plataforma</div><BarsSimple data={platafs} total={total}/></div>}
            {devices.length>0 && <div><div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Por dispositivo</div><BarsSimple data={devices} total={total}/></div>}
            {browsers.length>0 && <div><div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Por navegador</div><BarsSimple data={browsers} total={total}/></div>}
          </div>

          {/* Por destino */}
          {destStats.length>1 && (
            <div style={{marginTop:"1rem"}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Clicks por destino</div>
              {destStats.map(([id,count])=>{
                const d = (link.destinos||[]).find(x=>x.id===id);
                return (
                  <div key={id} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,marginBottom:6}}>
                    <div style={{flex:1,color:"var(--muted)"}}>{d?.nombre||id}</div>
                    <div style={{fontFamily:"var(--mono)",fontWeight:600}}>{count}</div>
                    <div style={{fontSize:10,color:"var(--muted)",width:36}}>{total>0?(count/total*100).toFixed(0)+"%":""}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Export */}
          <div style={{marginTop:"1rem",display:"flex",justifyContent:"flex-end"}}>
            <BotonesExportar
              headers={["Fecha/Hora","País","Ciudad","Plataforma","Dispositivo","OS","Navegador","Destino"]}
              rows={clicks.map(c=>[c.ts?.slice(0,19)||"",c.country||"",c.city||"",c.platform||"",c.device||"",c.os||"",c.browser||"",c.destino_url||""])}
              nombreArchivo={"clicks_"+link.slug}
            />
          </div>
        </div>
      )}
    </div>
  );
}



// ─── ADMIN CLIENT DETAIL ──────────────────────────────────────────────────────
// Cambio de contraseña inline desde el perfil admin
function ChangePasswordInline({ client, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { show, el: toastEl } = useToast();

  async function save() {
    if (!newPass || newPass.length < 4) return show("La contraseña debe tener al menos 4 caracteres", "err");
    setSaving(true);
    await onUpdate({ ...client, password: newPass });
    show("✓ Contraseña actualizada", "ok");
    setNewPass("");
    setOpen(false);
    setShowCurrent(false);
    setSaving(false);
  }

  return (
    <>
      {toastEl}
      <div className="info-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 8 }}>
        <span className="info-label">Contraseña</span>
        {/* Contraseña actual - siempre visible con ojo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <div className="input-wrap" style={{ flex: 1, pointerEvents: "none", opacity: .85 }}>
            <input readOnly type={showCurrent ? "text" : "password"} value={client.password || ""} style={{ background: "var(--surface2)", cursor: "default" }} />
          </div>
          <button type="button" className="eye-btn" style={{ position: "static", padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)" }}
            onClick={() => setShowCurrent(s => !s)}>
            {showCurrent
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
            🔑 {open ? "Cancelar" : "Cambiar"}
          </button>
        </div>
        {/* Campo nueva contraseña - solo visible al expandir */}
        {open && (
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <input type={showNew ? "text" : "password"} value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Nueva contraseña (min. 4 caracteres)"
                onKeyDown={e => e.key === "Enter" && save()} />
              <button type="button" className="eye-btn" onClick={() => setShowNew(s => !s)}>
                {showNew
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            <button className="btn btn-green btn-sm" disabled={saving || !newPass} onClick={save}>
              {saving ? "..." : "✓ Guardar"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AdminClientDetail({ client, allClients, onBack, onUpdate }) {
  const [tab, setTab] = useState("info");
  const [adding, setAdding] = useState(false);
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);
  const { show, el: toastEl } = useToast();
  const rows = filterByPeriod(client.records || [], period, from, to).sort((a, b) => a.date.localeCompare(b.date));
  const isWA = client.niche === "whatsapp", isWeb = client.niche === "web", isLaunch = client.niche === "lanzamiento";
  const t = buildTotals(client.niche, rows);
  const nicheLabel = isWA ? "WhatsApp" : isWeb ? "Sitio web" : "Lanzamiento";

  async function handleUpdate(updated) {
    onUpdate(updated);
    const r = await db.upsert(updated);
    show(r.ok ? "✓ Cambios guardados" : "Error al guardar: " + (r.error || ""), r.ok ? "ok" : "err");
  }

  if (adding) return <div className="content"><AddRecordForm client={client} onSave={async rec => { await handleUpdate({ ...client, records: [...(client.records || []), rec] }); setAdding(false); }} onCancel={() => setAdding(false)} /></div>;

  return (
    <div className="main">
      {toastEl}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
          <div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo || client.name.slice(0, 2).toUpperCase()}</div>
          <div><div className="topbar-title">{client.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{nicheLabel} · @{client.username}</div></div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {tab === "metricas" && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Nuevo registro</button>}
          <DbStatus />
        </div>
      </div>
      <div className="content">
        <div className="tab-row">
          {["info", "hermes", ...(client.producto?.startsWith("APOLLO") ? [] : ["estudio"]), "metricas", "captura", ...(client.producto?.startsWith("APOLLO") ? ["calidad"] : []), "facebook", "telegram"].map(t2 => (
            <button key={t2} className={`tab ${tab === t2 ? "active" : ""}`} onClick={() => setTab(t2)}>
              {t2 === "info" ? "👤 Perfil" : t2 === "hermes" ? (client.producto?.startsWith("APOLLO") ? "🚀 APOLLO" : "✦ HERMES") : t2 === "estudio" ? "🎬 Estudio" : t2 === "metricas" ? "Metricas" : t2 === "captura" ? "📊 Captura WP" : t2 === "calidad" ? "⭐ Calidad" : t2 === "facebook" ? "📘 Facebook" : "✈️ Telegram"}
            </button>
          ))}
        </div>
        {tab === "hermes" && <HermesAdminView client={client} allClients={allClients} onUpdate={handleUpdate} />}
        {tab === "info" && (
          <div>
            <HermesProgressBar client={client} onUpdate={handleUpdate} readOnly={false} />
            <div className="card">
              <div className="card-title">Información del cliente</div>
              <div className="grid2">
                <div>
                  {[["Negocio", client.name], ["Representante", client.representante], ["Producto/Servicio", client.producto], ["Teléfono", client.telefono], ["Email", client.email], ["Dirección", client.direccion]].map(([l, v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span>{v || <span style={{ color: "var(--muted)" }}>—</span>}</span>
                    </div>
                  ))}
                </div>
                <div>
                  {[["Usuario", client.username], ["Nicho", nicheLabel]].map(([l, v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <ChangePasswordInline client={client} onUpdate={handleUpdate} />
                </div>
              </div>
            </div>
            {/* Cuentas y Contratos consolidados */}
            <div className="grid2" style={{ alignItems:"start", marginTop:"1rem" }}>
              <div>
                <div className="sec-title" style={{ marginBottom:".75rem" }}>💳 Cuentas</div>
                <CuentasPanel client={client} onUpdate={handleUpdate} readOnly={false} />
              </div>
              <div>
                <div className="sec-title" style={{ marginBottom:".75rem" }}>📄 Contratos</div>
                <ContratosPanel client={client} onUpdate={handleUpdate} />
              </div>
            </div>
            {/* Historial: misiones + antecedentes — fusionado en Perfil */}
            <div style={{ borderTop:"1px solid var(--border)", marginTop:"1.5rem", paddingTop:"1.5rem" }}>
              <MisionesPanel client={client} onUpdate={handleUpdate} />
              <div style={{ borderTop:"1px solid var(--border)", marginTop:"1.5rem", paddingTop:"1.5rem" }}>
                <AntecedentesPanel client={client} onUpdate={handleUpdate} readOnly={false} />
              </div>
            </div>
          </div>
        )}

        {tab === "metricas" && (
          <div>
            {/* Gráfica CPL tiempo real — primera */}
            {client.producto?.startsWith("APOLLO") && <CplTradingChart client={client} onUpdate={handleUpdate} />}
            <MetricasAdminPanel client={client} onUpdate={handleUpdate} period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} rows={rows} t={t} isWA={isWA} isWeb={isWeb} isLaunch={isLaunch} onAdd={() => setAdding(true)} />
            {client.producto?.startsWith("APOLLO") && (
              <div style={{ marginTop:"1.5rem" }}>
                <GraficasMetricas client={client} period={period} from={from} to={to} />
              </div>
            )}
          </div>
        )}
        {tab === "estudio" && <EstudioPanel client={client} onUpdate={handleUpdate} role="admin" />}
        {tab === "captura" && <CapturaWPPanel client={client} onUpdate={handleUpdate} />}
        {tab === "calidad" && <CalidadLeadPanel client={client} onUpdate={handleUpdate} readOnly={false} />}
        {tab === "facebook" && (
          <FacebookPanel client={client} onUpdate={handleUpdate} />
        )}
        {tab === "telegram" && (
          <TelegramPanel
            client={client}
            records={rows}
            tgConfig={client.tgConfig || {}}
            onUpdate={handleUpdate}
            onSaveConfig={async (cfg) => {
              await handleUpdate({ ...client, tgConfig: cfg });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDashboard({ client, onLogout, banners, onUpdate }) {
  const [tab, setTab] = useState("hermes");
  const [period, setPeriod] = useState("mtd");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  // Defensivo: si client no está listo, mostrar loading
  if (!client || !client.id) return <div className="app" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}><div style={{ color:"var(--muted)" }}>Cargando...</div></div>;

  const isApollo = client.producto?.startsWith("APOLLO");
  const rows = filterByPeriod(client.records || [], period, from, to).sort((a, b) => a.date.localeCompare(b.date));
  const t = buildTotals(client.niche, rows);
  const isWA = client.niche === "whatsapp", isWeb = client.niche === "web", isLaunch = client.niche === "lanzamiento";
  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-badge">Mi panel</div><div className="sidebar-logo-name">{client.name}</div><div className="sidebar-logo-role">Solo lectura</div></div>
        <div className="nav">
          <div className="nav-label">Vistas</div>
          {(["hermes", ...(client.producto?.startsWith("APOLLO") ? ["captura", "calidad"] : ["estudio"]), "antecedentes"]).map(v => <div key={v} className={`nav-item ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}><div className="nav-dot" style={{ background: tab === v ? "var(--accent)" : "var(--border)" }} />{v === "hermes" ? (client.producto?.startsWith("APOLLO") ? "🚀 APOLLO" : "✦ HERMES") : v === "estudio" ? "🎬 Estudio" : v === "captura" ? "📊 Captura WP" : v === "calidad" ? "⭐ Calidad" : "📚 Historial"}</div>)}
        </div>
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo || client.name.slice(0, 2).toUpperCase()}</div><div><div style={{ fontSize: 13, fontWeight: 500 }}>{client.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Vista de cliente</div></div></div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">
            {tab === "hermes" ? (client.producto?.startsWith("APOLLO") ? "🚀 APOLLO" : "✦ HERMES") : tab === "captura" ? "📊 Captura WP" : tab === "antecedentes" ? "📚 Historial" : tab === "estudio" ? "🎬 Estudio" : "Histórico de pauta"}
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        </div>
        <div className="content">
          {/* Banner de comunicaciones — siempre visible en la parte superior */}
          {banners && banners.length > 0 && <BannerViewer banners={banners} />}
          {/* Carroza visible en todas las tabs EXCEPTO hermes */}
          {tab !== "hermes" && <HermesProgressBar client={client} onUpdate={() => {}} readOnly={true} />}
          {tab === "hermes" && <HermesClientView client={client} allClients={[]} onUpdate={onUpdate || (() => {})} />}
          {tab === "estudio" && <EstudioPanel client={client} onUpdate={onUpdate || (() => {})} role="client" />}
          {tab === "captura" && client.capturaConfig?.lastData && (
            <CapturaWPPanel client={client} onUpdate={onUpdate || (() => {})} readOnly={true} />
          )}
          {tab === "captura" && !client.capturaConfig?.lastData && (
            <div className="empty"><div style={{ fontSize:28, opacity:.3 }}>📊</div><div style={{ marginTop:8 }}>El análisis de captura estará disponible pronto.</div></div>
          )}
          {tab === "calidad" && <CalidadLeadPanel client={client} onUpdate={onUpdate || (() => {})} readOnly={true} />}
          {tab === "resumen" && <>
            {banners && banners.length > 0 && (
              <div style={{ marginBottom: "1.25rem", borderRadius: "var(--r2)", overflow: "hidden" }}>
                <BannerViewer banners={banners} />
              </div>
            )}
            <div style={{ marginBottom: "1.25rem" }}><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Inversión del período</div><div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--mono)" }}>${t.inversion || "0.00"}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{rows.length} días con datos</div></div>
            <div className="grid4" style={{ marginBottom: "1.25rem" }}><MetricCard label="Alcance" value={t.alcance || "—"} /><MetricCard label="CPM" value={"$" + (t.cpm || "—")} /><MetricCard label="CPC" value={"$" + (t.cpc || "—")} /><MetricCard label="CTR" value={(t.ctr || "—") + "%"} /></div>
            {isWA && <div className="grid4"><MetricCard label="Leads" value={t.leads || "—"} /><MetricCard label="Contactados" value={t.contactados || "—"} /><MetricCard label="Ventas" value={t.ventas || "—"} /><MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight /></div>}
            {isWeb && <div className="grid4"><MetricCard label="Sesiones" value={t.sesiones || "—"} /><MetricCard label="Compras" value={t.compras || "—"} /><MetricCard label="Ingresos" value={"$" + (t.ingreso || "0")} highlight /><MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight /></div>}
            {isLaunch && <><div className="grid4">
              <MetricCard label="Potenciales" value={t.clientesPotenciales || "—"} />
              <MetricCard label="Formularios" value={t.formularios || "—"} />
              <MetricCard label="Resultados" value={t.resultados || "—"} highlight />
              <MetricCard label="CPA" value={"$" + (t.cpa || "—")} />
            </div>
            <div className="grid3" style={{ marginTop: "0.75rem" }}>
              <MetricCard label="Costo/formulario" value={"$" + (t.costo_formulario || "—")} />
              <MetricCard label="Ventas" value={t.ventas || "—"} />
              <MetricCard label="Ingresos" value={"$" + (t.ingreso || "0")} highlight />
            </div></>}
            {rows.length > 1 && <div className="card" style={{ marginTop: "1.25rem" }}><div className="card-title">Inversión diaria</div><MiniChart rows={rows} field="inversion" color={client.color} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 6 }}><span>{rows[0].date}</span><span>{rows[rows.length - 1].date}</span></div></div>}
          </>}
          {tab === "antecedentes" && (
            <div>
              <MisionesPanel client={client} onUpdate={onUpdate || (() => {})} readOnly={true} />
              <div style={{ borderTop:"1px solid var(--border)", marginTop:"1.5rem", paddingTop:"1.5rem" }}>
                <AntecedentesPanel client={client} onUpdate={onUpdate || (() => {})} readOnly={true} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CAMPAÑAS MASIVAS ────────────────────────────────────────────────────────
function CampanasPanel({ clients }) {
  const [campanas, setCampanas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(null); // id de campaña enviando
  const { show, el: toastEl } = useToast();

  const blank = {
    id: "", nombre: "", mensaje: "", destinatarios: "todos",
    clientesSeleccionados: [], programado: false,
    fechaEnvio: new Date().toISOString().slice(0,10),
    horaEnvio: "08:00", estado: "borrador"
  };
  const [form, setForm] = useState({ ...blank });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function toggleCliente(id) {
    setForm(p => {
      const sel = p.clientesSeleccionados;
      return { ...p, clientesSeleccionados: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] };
    });
  }

  function getDestinatarios(campana) {
    if (campana.destinatarios === "todos") return clients.filter(c => c.tgConfig?.token && c.tgConfig?.chatId);
    return clients.filter(c => campana.clientesSeleccionados.includes(c.id) && c.tgConfig?.token && c.tgConfig?.chatId);
  }

  function saveCampana() {
    if (!form.nombre || !form.mensaje) return show("Completa nombre y mensaje", "err");
    if (form.destinatarios === "seleccionados" && !form.clientesSeleccionados.length) return show("Selecciona al menos un cliente", "err");
    const nueva = { ...form, id: form.id || "camp" + Date.now(), estado: "borrador" };
    setCampanas(prev => {
      const idx = prev.findIndex(c => c.id === nueva.id);
      return idx >= 0 ? prev.map((c, i) => i === idx ? nueva : c) : [...prev, nueva];
    });
    setForm({ ...blank });
    setShowForm(false);
    show("✓ Campaña guardada", "ok");
  }

  async function sendCampana(campana) {
    const dest = getDestinatarios(campana);
    if (!dest.length) return show("Ningún destinatario tiene Telegram configurado", "err");
    setSending(campana.id);
    let ok = 0; let err = 0;
    for (const client of dest) {
      try {
        const r = await sendTelegram(client.tgConfig.token, client.tgConfig.chatId, campana.mensaje);
        if (r.ok) ok++; else err++;
      } catch { err++; }
    }
    setCampanas(prev => prev.map(c => c.id === campana.id ? { ...c, estado: "enviada", ultimoEnvio: new Date().toLocaleString("es-EC") } : c));
    show(`✓ Enviado: ${ok} clientes${err > 0 ? ` · ${err} errores` : ""}`, ok > 0 ? "ok" : "err");
    setSending(null);
  }

  function editCampana(c) { setForm({ ...c }); setShowForm(true); }
  function deleteCampana(id) { if (window.confirm("¿Eliminar esta campaña?")) setCampanas(prev => prev.filter(c => c.id !== id)); }

  const estadoBadge = (e) => e === "enviada" ? "badge-paid" : e === "programada" ? "badge-progress" : "badge-pending";

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Campañas de mensajería</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Envía mensajes a grupos de clientes a la vez</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...blank }); setShowForm(true); }}>+ Nueva campaña</button>
        </div>

        {/* FORMULARIO */}
        {showForm && (
          <div className="card" style={{ borderColor: "rgba(124,58,237,.4)" }}>
            <div className="card-title">{form.id ? "Editar campaña" : "Nueva campaña"}</div>
            <div className="form-row">
              <div className="field"><label>Nombre de la campaña</label><input type="text" value={form.nombre} onChange={e => f("nombre", e.target.value)} placeholder="Ej: Reporte semanal junio" /></div>
              <div className="field"><label>Destinatarios</label>
                <select value={form.destinatarios} onChange={e => f("destinatarios", e.target.value)}>
                  <option value="todos">Todos los clientes con Telegram</option>
                  <option value="seleccionados">Clientes especificos</option>
                </select>
              </div>
            </div>

            {form.destinatarios === "seleccionados" && (
              <div className="field" style={{ marginBottom: "1rem" }}>
                <label>Selecciona clientes</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {clients.map(c => {
                    const tgOk = !!(c.tgConfig?.token && c.tgConfig?.chatId);
                    const sel = form.clientesSeleccionados.includes(c.id);
                    return (
                      <div key={c.id}
                        className={"fb-chip " + (sel ? "active" : "")}
                        style={{ opacity: tgOk ? 1 : 0.4 }}
                        onClick={() => tgOk && toggleCliente(c.id)}>
                        {sel ? "✓ " : ""}{c.name}
                        {!tgOk && <span style={{ fontSize: 10, marginLeft: 4, color: "var(--red)" }}>sin TG</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="field" style={{ marginBottom: "1rem" }}>
              <label>Mensaje</label>
              <textarea value={form.mensaje} onChange={e => f("mensaje", e.target.value)}
                placeholder="Escribe el mensaje que recibirán los clientes..." style={{ minHeight: 120 }} />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {form.destinatarios === "todos"
                  ? `Se enviara a ${clients.filter(c => c.tgConfig?.token && c.tgConfig?.chatId).length} clientes con Telegram configurado`
                  : `Se enviara a ${form.clientesSeleccionados.length} clientes seleccionados`}
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", gridColumn: "1/-1", marginBottom: 4 }}>
                <input type="checkbox" checked={form.programado} onChange={e => f("programado", e.target.checked)} style={{ width: 14, height: 14, marginRight: 6, accentColor: "var(--accent)" }} />
                Programar envio para mas tarde
              </label>
              {form.programado && <>
                <div className="field" style={{ marginBottom: 0 }}><label>Fecha</label><input type="date" value={form.fechaEnvio} onChange={e => f("fechaEnvio", e.target.value)} /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Hora (Quito)</label><input type="time" value={form.horaEnvio} onChange={e => f("horaEnvio", e.target.value)} /></div>
              </>}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveCampana}>Guardar campaña</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* LISTA DE CAMPAÑAS */}
        {campanas.length === 0 && !showForm && (
          <div className="empty"><div style={{ fontSize: 28, marginBottom: 8, opacity: .3 }}>📣</div><div>Sin campañas. Crea la primera.</div></div>
        )}

        {campanas.map(c => {
          const dest = getDestinatarios(c);
          const isSending = sending === c.id;
          return (
            <div key={c.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nombre}</div>
                    <span className={"badge " + estadoBadge(c.estado)} style={{ fontSize: 10 }}>{c.estado}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                    {c.destinatarios === "todos" ? `Todos (${dest.length} con Telegram)` : `${dest.length} clientes seleccionados`}
                    {c.programado && ` · Programado: ${c.fechaEnvio} ${c.horaEnvio}`}
                    {c.ultimoEnvio && ` · Último envio: ${c.ultimoEnvio}`}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text)", background: "var(--surface2)", padding: "6px 10px", borderRadius: 6, fontFamily: "var(--mono)", whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>
                    {c.mensaje.slice(0, 120)}{c.mensaje.length > 120 ? "..." : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => editCampana(c)}>✏️</button>
                  <button className="btn btn-primary btn-sm" disabled={isSending || !dest.length}
                    style={{ background: "var(--accent)" }} onClick={() => sendCampana(c)}>
                    {isSending ? "Enviando..." : "📤 Enviar"}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteCampana(c.id)}>×</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}




// ─── GESTIÓN DE FILMMAKERS (Admin) ────────────────────────────────────────────
function FilmakersAdminPanel({ filmmakers, clients, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { show, el: toastEl } = useToast();
  const blank = { id: "", nombre: "", username: "", password: "", telefono: "", email: "", tgToken: "", tgChatId: "", disponibilidad: { diasDisponibles: [], diasOcupados: [] } };
  const [form, setForm] = useState({ ...blank });
  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function startEdit(fm) { setForm({ ...fm }); setEditing(fm.id); setShowForm(true); }
  function startNew() { setForm({ ...blank, id: "fm" + Date.now() }); setEditing(null); setShowForm(true); }

  async function save() {
    if (!form.nombre || !form.username || !form.password) return show("Completa nombre, usuario y contraseña", "err");
    const list = editing ? filmmakers.map(f => f.id === editing ? form : f) : [...filmmakers, form];
    await onSave(list);
    setShowForm(false); setEditing(null);
    show("✓ Filmmaker guardado", "ok");
  }

  async function del(id) {
    if (!window.confirm("¿Eliminar este Filmmaker?")) return;
    await onSave(filmmakers.filter(f => f.id !== id));
    show("Filmmaker eliminado", "ok");
  }

  // Clientes asignados a cada filmmaker
  function misClientes(fmId) { return clients.filter(c => c.filmakerAsignado === fmId).map(c => c.name).join(", ") || "Sin asignar"; }

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div><div className="sec-title">Filmmakers</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{filmmakers.length} registrados</div></div>
          <button className="btn btn-primary btn-sm" onClick={startNew}>+ Nuevo Filmmaker</button>
        </div>

        {showForm && (
          <div className="card" style={{ borderColor: "rgba(255,145,77,.4)", marginBottom: "1rem" }}>
            <div className="card-title">{editing ? "Editar Filmmaker" : "Nuevo Filmmaker"}</div>
            <div className="form-row">
              <div className="field"><label>Nombre completo *</label><input type="text" value={form.nombre} onChange={e => ff("nombre", e.target.value)} /></div>
              <div className="field"><label>Teléfono</label><input type="text" value={form.telefono || ""} onChange={e => ff("telefono", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Usuario de acceso *</label><input type="text" value={form.username} onChange={e => ff("username", e.target.value.toLowerCase().replace(/\s/g,""))} /></div>
              <div className="field"><label>Contraseña *</label><PasswordInput value={form.password} onChange={e => ff("password", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Bot Token Telegram (para alertas)</label><input type="text" value={form.tgToken || ""} onChange={e => ff("tgToken", e.target.value)} placeholder="Token del bot" /></div>
              <div className="field">
                <label>Chat ID Telegram</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="text" value={form.tgChatId || ""} onChange={e => ff("tgChatId", e.target.value)} style={{ flex: 1 }} placeholder="123456789" />
                  <button className="btn btn-primary btn-sm" disabled={!form.tgToken}
                    style={{ background: "var(--accent)" }}
                    onClick={async () => {
                      const r = await detectarChatId(form.tgToken);
                      if (r.ok) { if (r.chats.length === 1) ff("tgChatId", r.chats[0].id); else { const opciones = r.chats.map((c,i) => (i+1)+". "+c.nombre+" — "+c.id).join("\n"); const sel = window.prompt("Selecciona:\n" + opciones); if (sel) ff("tgChatId", sel.trim()); } }
                      else alert("Error: " + r.error);
                    }}>🔍</button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save}>💾 Guardar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
            </div>
          </div>
        )}

        {filmmakers.length === 0 && !showForm && <div className="empty"><div style={{ fontSize: 28, opacity: .3 }}>🎬</div><div style={{ marginTop: 8 }}>Sin filmmakers registrados.</div></div>}

        {filmmakers.map(fm => (
          <div key={fm.id} className="card" style={{ marginBottom: ".75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,145,77,.2)", color: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {fm.nombre?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fm.nombre} <span className="fm-badge">Filmmaker</span></div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  @{fm.username} {fm.telefono ? "· " + fm.telefono : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  Clientes: {misClientes(fm.id)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(fm)}>✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(fm.id)}>×</button>
              </div>
            </div>

            {/* Asignar clientes */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Clientes asignados</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {clients.map(c => {
                  const asignado = c.filmakerAsignado === fm.id;
                  return (
                    <div key={c.id} className={"fb-chip " + (asignado ? "active" : "")}
                      style={{ cursor: "pointer" }}
                      onClick={async () => {
                        const updated = { ...c, filmakerAsignado: asignado ? undefined : fm.id };
                        // Actualizar en clients — necesitamos onUpdate del AdminPanel
                        // Por ahora guardamos via window.dispatchEvent
                        window.dispatchEvent(new CustomEvent("updateClient", { detail: updated }));
                      }}>
                      {asignado ? "✓ " : ""}{c.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── AGENDA CONSOLIDADA ADMIN ────────────────────────────────────────────────
function AgendaConsolidadaPanel({ clients }) {
  const [filtro, setFiltro] = useState("proximas"); // proximas | todas
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const hoy = new Date().toISOString().slice(0, 10);

  // Recopilar todos los eventos de todos los clientes
  const todos = [];
  (clients || []).forEach(c => {
    const agenda = c.hermesData?.agenda || [];
    agenda.forEach(e => todos.push({ ...e, clientName: c.name, clientColor: c.color, clientId: c.id }));
  });

  const filtrados = todos
    .filter(e => filtro === "proximas" ? e.fecha >= hoy : true)
    .filter(e => filtroTipo === "todos" ? true : e.tipo === filtroTipo)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  return (
    <div>
      <div className="sec-header">
        <div>
          <div className="sec-title">Agenda consolidada</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Todas las citas de todos los clientes</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div className="period-pills">
          <button className={"pill " + (filtro === "proximas" ? "active" : "")} onClick={() => setFiltro("proximas")}>Proximas</button>
          <button className={"pill " + (filtro === "todas" ? "active" : "")} onClick={() => setFiltro("todas")}>Todas</button>
        </div>
        <div className="period-pills">
          <button className={"pill " + (filtroTipo === "todos" ? "active" : "")} onClick={() => setFiltroTipo("todos")}>Todos</button>
          {TIPO_AGENDA.map(t => (
            <button key={t.id} className={"pill " + (filtroTipo === t.id ? "active" : "")} onClick={() => setFiltroTipo(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 && (
        <div className="empty"><div style={{ fontSize: 28, opacity: .3, marginBottom: 8 }}>📅</div><div>Sin citas {filtro === "proximas" ? "proximas" : "registradas"}.</div></div>
      )}

      {filtrados.map((e, i) => {
        const tipo = TIPO_AGENDA.find(t => t.id === e.tipo);
        const esPasada = e.fecha < hoy;
        return (
          <div key={e.id || i} className="card" style={{ marginBottom: ".75rem", opacity: esPasada ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: (e.clientColor || "#004AAD") + "22", color: e.clientColor || "#004AAD", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {e.clientName?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.titulo}</span>
                  <span className={"cal-event " + (tipo?.cls || "")} style={{ fontSize: 10, padding: "1px 6px" }}>{tipo?.label}</span>
                  {esPasada && <span style={{ fontSize: 10, color: "var(--muted)", background: "var(--surface2)", padding: "1px 6px", borderRadius: 8 }}>Pasada</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  <span style={{ color: e.clientColor || "var(--accent)" }}>{e.clientName}</span>
                  <span style={{ margin: "0 6px" }}>·</span>
                  {fmtDate(e.fecha)} a las {e.hora}
                  {e.descripcion && <span style={{ marginLeft: 8, color: "var(--muted)", fontStyle: "italic" }}>— {e.descripcion}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────
function getNotificaciones(clients) {
  const notifs = [];
  const hoy = new Date();

  clients.forEach(client => {
    // 1. Cuotas vencidas o por vencer
    (client.contratos || []).forEach((ct, ci) => {
      (ct.cuotas || []).forEach((c, qi) => {
        if (c.pagado) return;
        if (!c.monto) return;
        const vence = c.fecha ? new Date(c.fecha + "T12:00:00") : null;
        if (!vence) return;
        const dias = Math.ceil((vence - hoy) / 86400000);
        if (dias < 0) {
          notifs.push({ id: `${client.id}-ct${ci}-q${qi}`, tipo: "err", icon: "💰",
            texto: `${client.name} — Cuota ${qi+1} VENCIDA hace ${Math.abs(dias)} dias ($${ct.cuotas[qi].monto})`,
            clientId: client.id });
        } else if (dias <= 5) {
          notifs.push({ id: `${client.id}-ct${ci}-q${qi}v`, tipo: "amber", icon: "⏰",
            texto: `${client.name} — Cuota ${qi+1} vence en ${dias} dias ($${ct.cuotas[qi].monto})`,
            clientId: client.id });
        }
      });
    });

    // 2. Sin datos esta semana
    const records = client.records || [];
    if (records.length > 0) {
      const ultimo = new Date(records[records.length-1].date + "T12:00:00");
      const diasSinDatos = Math.floor((hoy - ultimo) / 86400000);
      if (diasSinDatos >= 3) {
        notifs.push({ id: `${client.id}-nodata`, tipo: "amber", icon: "📊",
          texto: `${client.name} — Sin datos hace ${diasSinDatos} dias`,
          clientId: client.id });
      }
    }

    // 3. KPIs en rojo
    (client.kpis || []).forEach(kpi => {
      const { pct } = calcKpiProgress(kpi, client.records || []);
      if (pct < 30 && pct > 0) {
        notifs.push({ id: `${client.id}-kpi-${kpi.id}`, tipo: "err", icon: "🎯",
          texto: `${client.name} — KPI "${kpi.nombre}" al ${pct}% (meta: ${kpi.meta_valor} ${kpi.unidad || ""})`,
          clientId: client.id });
      }
    });

    // 3b. Notas pendientes en fichas de estudio
    const fichas = client.hermesData?.fichas || [];
    const fichasConNotas = fichas.filter(f => (f.notas || []).length > 0);
    if (fichasConNotas.length > 0) {
      notifs.push({ id: `${client.id}-fichas`, tipo: "amber", icon: "🎬",
        texto: `${client.name} — ${fichasConNotas.length} ficha(s) con notas del cliente`,
        clientId: client.id });
    }
    // 4. Sincronización de Facebook fallida (token viejo)
    if (client.fbConfig?.token && client.fbConfig?.lastSync) {
      const lastSync = new Date(client.fbConfig.lastSync);
      const diasSync = Math.floor((hoy - lastSync) / 86400000);
      if (diasSync > 2) {
        notifs.push({ id: `${client.id}-fbsync`, tipo: "amber", icon: "📘",
          texto: `${client.name} — Facebook sin sincronizar hace ${diasSync} dias`,
          clientId: client.id });
      }
    }

    // 5. Eventos de agenda hoy o mañana
    const hoyStr = hoy.toISOString().slice(0, 10);
    const manana = new Date(hoy.getTime() + 86400000).toISOString().slice(0, 10);
    (client.hermesData?.agenda || []).forEach(ev => {
      if (ev.fecha === hoyStr) {
        notifs.push({ id: `${client.id}-ev-${ev.id}`, tipo: "blue", icon: "📅",
          texto: `${client.name} — ${ev.titulo || "Cita"} HOY a las ${ev.hora}`,
          clientId: client.id });
      } else if (ev.fecha === manana) {
        notifs.push({ id: `${client.id}-ev-man-${ev.id}`, tipo: "amber", icon: "📅",
          texto: `${client.name} — ${ev.titulo || "Cita"} mañana a las ${ev.hora}`,
          clientId: client.id });
      }
    });
  });

  return notifs.slice(0, 20);
}

function NotificationBell({ clients, onGoToClient }) {
  const [open, setOpen] = useState(false);
  const [vistas, setVistas] = useState([]);
  const notifs = getNotificaciones(clients);
  const nuevas = notifs.filter(n => !vistas.includes(n.id));

  function markAllRead() { setVistas(notifs.map(n => n.id)); }

  return (
    <div style={{ position: "relative" }}>
      <div className="notif-bell" onClick={() => { setOpen(o => !o); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {nuevas.length > 0 && <div className="notif-badge">{nuevas.length > 9 ? "9+" : nuevas.length}</div>}
      </div>
      {open && (
        <div className="notif-dropdown">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Notificaciones {nuevas.length > 0 && <span style={{ color: "var(--red)", fontSize: 11 }}>({nuevas.length} nuevas)</span>}</div>
            {nuevas.length > 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "3px 8px" }} onClick={markAllRead}>Marcar leidas</button>}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifs.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Todo en orden ✓</div>}
            {notifs.map(n => (
              <div key={n.id} className="notif-item" style={{ opacity: vistas.includes(n.id) ? 0.5 : 1 }}
                onClick={() => { setVistas(p => [...p, n.id]); onGoToClient(n.clientId); setOpen(false); }}>
                <div className={"notif-dot " + (n.tipo === "err" ? "notif-dot-red" : n.tipo === "blue" ? "notif-dot-blue" : "notif-dot-amber")} />
                <div>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>{n.icon} {n.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HEALTH DASHBOARD ────────────────────────────────────────────────────────
function HealthDashboard({ clients }) {
  const hoy = new Date();

  function getClientHealth(client) {
    const issues = [];
    const records = client.records || [];

    // Datos recientes
    if (records.length === 0) {
      issues.push({ tipo: "err", msg: "Sin registros de metricas" });
    } else {
      const ultimo = new Date(records[records.length-1].date + "T12:00:00");
      const dias = Math.floor((hoy - ultimo) / 86400000);
      if (dias >= 3) issues.push({ tipo: "warn", msg: `Sin datos hace ${dias} dias` });
    }

    // Contrato activo
    const contratos = client.contratos || [];
    if (!contratos.length) {
      issues.push({ tipo: "warn", msg: "Sin contratos registrados" });
    } else {
      const cuotasPendientes = contratos.flatMap(ct => (ct.cuotas||[]).filter(c => !c.pagado && c.monto));
      if (cuotasPendientes.length > 0) {
        const vencidas = cuotasPendientes.filter(c => c.fecha && new Date(c.fecha + "T12:00:00") < hoy);
        if (vencidas.length > 0) issues.push({ tipo: "err", msg: `${vencidas.length} cuota(s) vencida(s)` });
      }
    }

    // Telegram configurado
    if (!client.tgConfig?.token || !client.tgConfig?.chatId) {
      issues.push({ tipo: "warn", msg: "Telegram no configurado" });
    }

    // Facebook configurado
    if (!client.fbConfig?.token) {
      issues.push({ tipo: "warn", msg: "Facebook no conectado" });
    }

    // KPIs
    const kpis = client.kpis || [];
    if (!kpis.length) {
      issues.push({ tipo: "warn", msg: "Sin KPIs definidos" });
    } else {
      const enRojo = kpis.filter(k => { const { pct } = calcKpiProgress(k, records); return pct < 30; });
      if (enRojo.length > 0) issues.push({ tipo: "err", msg: `${enRojo.length} KPI(s) por debajo del 30%` });
    }

    if (!issues.length) return { estado: "ok", issues: [] };
    const tieneErr = issues.some(i => i.tipo === "err");
    return { estado: tieneErr ? "err" : "warn", issues };
  }

  const resumen = clients.map(c => ({ client: c, health: getClientHealth(c) }));
  const ok = resumen.filter(r => r.health.estado === "ok").length;
  const warn = resumen.filter(r => r.health.estado === "warn").length;
  const err = resumen.filter(r => r.health.estado === "err").length;

  return (
    <div>
      <div className="grid3" style={{ marginBottom: "1.25rem" }}>
        <div className="metric" style={{ borderColor: "rgba(16,185,129,.3)" }}>
          <div className="metric-label">En orden</div>
          <div className="metric-value" style={{ color: "var(--green)" }}>{ok}</div>
          <div className="metric-sub">clientes sin alertas</div>
        </div>
        <div className="metric" style={{ borderColor: "rgba(255,222,89,.3)" }}>
          <div className="metric-label">Atencion</div>
          <div className="metric-value" style={{ color: "var(--amber)" }}>{warn}</div>
          <div className="metric-sub">clientes con advertencias</div>
        </div>
        <div className="metric" style={{ borderColor: "rgba(239,68,68,.3)" }}>
          <div className="metric-label">Critico</div>
          <div className="metric-value" style={{ color: "var(--red)" }}>{err}</div>
          <div className="metric-sub">clientes requieren accion</div>
        </div>
      </div>

      {resumen.map(({ client: c, health }) => (
        <div key={c.id} className="health-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: health.issues.length > 0 ? 10 : 0 }}>
            <div className="avatar" style={{ background: c.color + "22", color: c.color, width: 30, height: 30, fontSize: 11 }}>
              {c.logo || c.name.slice(0,2).toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{c.name}</div>
            <div className={"health-dot " + (health.estado === "ok" ? "health-ok" : health.estado === "warn" ? "health-warn" : "health-err")} style={{ width: 10, height: 10 }} />
            <span style={{ fontSize: 11, color: health.estado === "ok" ? "var(--green)" : health.estado === "warn" ? "var(--amber)" : "var(--red)", fontWeight: 600 }}>
              {health.estado === "ok" ? "OK" : health.estado === "warn" ? "Atencion" : "Critico"}
            </span>
          </div>
          {health.issues.map((issue, i) => (
            <div key={i} className="health-row">
              <div className={"health-dot " + (issue.tipo === "err" ? "health-err" : "health-warn")} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{issue.msg}</span>
            </div>
          ))}
        </div>
      ))}

      {clients.length === 0 && <div className="empty"><div style={{ fontSize: 28, opacity: .3, marginBottom: 8 }}>🏥</div><div>Sin clientes aun.</div></div>}
    </div>
  );
}

// ─── ONBOARDING WIZARD ────────────────────────────────────────────────────────
function OnboardingWizard({ onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", username: "", password: "", niche: "lanzamiento",
    color: "#004AAD", logo: "", producto: "", telefono: "", email: "",
    representante: "", serviciosContratados: [],
    tgToken: "", tgChatId: "",
    fbToken: "", fbAdAccountId: ""
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const steps = ["Datos del cliente", "Telegram & Automatizacion", "Facebook Ads"];

  function finish() {
    if (!form.name || !form.username || !form.password) return alert("Completa nombre, usuario y contraseña");

    const isHermes = form.producto === "HERMES";
    const isApollo = form.producto === "APOLLO";
    const apolloFases = APOLLO_FASES;
    const apolloDuracion = parseInt(form.apolloDuracion) || 21;

    // ── HERMES autosetup ──
    const hermesData = isHermes ? { momentos: {}, kpisHermes: HERMES_KPIS_DEFAULT, biblioteca: [] } : undefined;
    const hermesChecklist = isHermes ? Object.fromEntries(HERMES_FASES.map(f => [f.id, {}])) : {};
    const hermesKpis = isHermes ? HERMES_FASES.flatMap(f => [{
      id: "kpi_" + f.id, nombre: f.nombre, metrica: "resultados",
      meta_valor: "", unidad: "", plazo: "15 dias", relevancia: "alto"
    }]).slice(0, 4) : [];

    // ── APOLLO autosetup ──
    const apolloData = isApollo ? {
      tipo: form.producto,
      duracion: apolloDuracion,
      momentos: {},
      kpisApollo: APOLLO_KPIS_DEFAULT,
      faseActual: 0,
      fechaLanzamiento: "",
      wpGrupos: [],
    } : undefined;
    const apolloChecklist = isApollo ? Object.fromEntries(apolloFases.map(f => [f.id, {}])) : {};
    const apolloKpis = isApollo ? APOLLO_KPIS_DEFAULT.map(k => ({
      id: "kpi_" + k.id, nombre: k.nombre, metrica: k.id === "roas" ? "roas" : k.id === "cpa" ? "cpa" : "resultados",
      meta_valor: k.meta || "", unidad: k.unidad, plazo: apolloDuracion + " dias", relevancia: "alto"
    })) : [];

    // Plantillas Telegram adaptadas al producto
    const plantillasBase = isApollo
      ? [
          { id: "p1", nombre: "🚀 Gasto diario APOLLO", tipo: "apollo", texto: "" },
          { id: "p2", nombre: "Reporte de campaña", tipo: "reporte", texto: "" },
          { id: "p3", nombre: "Recordatorio de cobro", tipo: "cobro", texto: "" },
          { id: "p4", nombre: "Mensaje personalizado", tipo: "custom", texto: "" },
        ]
      : PLANTILLAS_DEFAULT;

    // Métricas de Facebook adaptadas a APOLLO
    const fbMetricsApollo = isApollo
      ? FB_METRICAS_DISPONIBLES.filter(m => ["spend","impressions","reach","cpm","cpc","ctr","clicks","actions_lead","cost_per_result"].includes(m.key))
      : FB_METRICAS_DISPONIBLES.slice(0, 7);

    const client = {
      name: form.name, username: form.username, password: form.password,
      niche: isApollo ? "lanzamiento" : form.niche,
      color: form.color, logo: form.logo,
      producto: form.producto, telefono: form.telefono, email: form.email,
      representante: form.representante,
      serviciosContratados: isHermes
        ? ["estrategia","contenido","pauta","ventas","analisis"]
        : isApollo
        ? ["estrategia","captacion","whatsapp","transmision","analiticas"]
        : form.serviciosContratados,
      checklist: isHermes ? hermesChecklist : isApollo ? apolloChecklist : {},
      cuentas: [], contratos: [], antecedentes: [],
      records: [],
      kpis: isHermes ? hermesKpis : isApollo ? apolloKpis : [],
      funnel: [],
      hermesData: hermesData,
      apolloData: apolloData,
      tgConfig: form.tgToken ? { token: form.tgToken, chatId: form.tgChatId, plantillas: plantillasBase } : { plantillas: plantillasBase },
      fbConfig: form.fbToken ? { token: form.fbToken, adAccountId: form.fbAdAccountId, selectedMetrics: fbMetricsApollo } : {},
      schedConfig: {
        enabled: false, hora: "08:00", dias: [1,2,3,4,5],
        plantillaId: isApollo ? "p1" : "p1"
      }
    };
    onSave(client);
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
            Nuevo cliente — Paso {step + 1} de {steps.length}
          </div>
          <div className="onboarding-steps">
            {steps.map((_, i) => <div key={i} className={"onboarding-step " + (i < step ? "done" : i === step ? "active" : "pending")} />)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{steps[step]}</div>
        </div>

        {step === 0 && (
          <div>
            <div className="form-row">
              <div className="field"><label>Nombre del negocio *</label><input type="text" value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ej: Bella Estetica" autoFocus /></div>
              <div className="field"><label>Producto / Servicio</label><input type="text" value={form.producto} onChange={e => f("producto", e.target.value)} placeholder="Ej: Tratamientos faciales" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Representante</label><input type="text" value={form.representante} onChange={e => f("representante", e.target.value)} /></div>
              <div className="field"><label>Telefono</label><input type="text" value={form.telefono} onChange={e => f("telefono", e.target.value)} /></div>
            </div>
            <div className="field"><label>Nicho</label>
              <select value={form.niche} onChange={e => f("niche", e.target.value)}>
                <option value="whatsapp">Venta por WhatsApp</option>
                <option value="web">Sitio web / E-commerce</option>
                <option value="lanzamiento">Lanzamiento (Leads / Formularios)</option>
              </select>
            </div>
            <div className="field">
              <label>Producto contratado</label>
              <select value={form.producto} onChange={e => f("producto", e.target.value)}>
                <option value="">-- Seleccionar producto --</option>
                <option value="HERMES">✦ HERMES — Contenido + Pauta 15 dias</option>
                <option value="APOLLO">🚀 APOLLO — Lanzamiento digital</option>
                <option value="personalizado">Personalizado</option>
              </select>
              {form.producto === "HERMES" && (
                <div style={{ marginTop: 8, background: "rgba(255,222,89,.08)", border: "1px solid rgba(255,222,89,.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--accent2)" }}>
                  ✦ Se configurara automaticamente: 8 fases, 4 KPIs, Biblioteca de contenido y Momentos WOW
                </div>
              )}
              {form.producto === "APOLLO" && (
                <>
                  <div style={{ marginTop: 8, background: "rgba(0,74,173,.08)", border: "1px solid rgba(0,74,173,.25)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#4d9fff" }}>
                    🚀 Se configurara automaticamente: 7 fases de mision, 6 KPIs, Plantilla reporte APOLLO, Metricas de lanzamiento y Calendario de mision
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Duracion del lanzamiento</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["7","14","21","30"].map(d => (
                        <button key={d} type="button"
                          className={"btn btn-sm " + (form.apolloDuracion === d ? "btn-primary" : "btn-ghost")}
                          onClick={() => f("apolloDuracion", d)}>
                          {d} dias
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="form-row">
              <div className="field"><label>Usuario de acceso *</label><input type="text" value={form.username} onChange={e => f("username", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="bellastetica" /></div>
              <div className="field"><label>Contrasena *</label><PasswordInput value={form.password} onChange={e => f("password", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Iniciales</label><input type="text" value={form.logo} onChange={e => f("logo", e.target.value.slice(0,2).toUpperCase())} maxLength={2} placeholder="BE" /></div>
              <div className="field"><label>Color de marca</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={form.color} onChange={e => f("color", e.target.value)} style={{ width: 44, height: 40, padding: 2, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }} />
                  <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{form.color}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6, background: "var(--surface2)", padding: "10px 14px", borderRadius: 8 }}>
              Configura Telegram para enviar reportes automaticos. Si no tienes los datos ahora, puedes configurarlo despues desde la tab ✈️ Telegram del cliente.
            </div>
            <div className="field">
              <label>Bot Token de Telegram</label>
              <input type="text" value={form.tgToken} onChange={e => { f("tgToken", e.target.value); }} placeholder="1234567890:ABCdef... (opcional)" />
            </div>
            <div className="field">
              <label>Chat ID del cliente</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="text" value={form.tgChatId} onChange={e => f("tgChatId", e.target.value)} placeholder="Ej: 123456789 (opcional)" style={{ flex: 1 }} />
                <button type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!form.tgToken}
                  style={{ whiteSpace: "nowrap", background: "var(--accent)" }}
                  onClick={async () => {
                    if (!form.tgToken) return;
                    const r = await detectarChatId(form.tgToken);
                    if (r.ok) {
                      if (r.chats.length === 1) {
                        f("tgChatId", r.chats[0].id);
                        alert("✓ Chat ID detectado: " + r.chats[0].id + " (" + r.chats[0].nombre + ")");
                      } else {
                        const opciones = r.chats.map((c, i) => (i+1) + ". " + c.nombre + (c.username ? " (@"+c.username+")" : "") + " — ID: " + c.id).join("\n");
                        const sel = window.prompt("Se encontraron varios chats. Copia el ID del cliente:\n\n" + opciones);
                        if (sel) f("tgChatId", sel.trim());
                      }
                    } else {
                      alert("No se pudo detectar: " + r.error);
                    }
                  }}>
                  🔍 Detectar
                </button>
              </div>
              {!form.tgToken && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Ingresa el Bot Token primero para detectar automaticamente</div>}
              {form.tgChatId && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>● Chat ID configurado: {form.tgChatId}</div>}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
              El cliente debe haber escrito <b>/start</b> al bot antes de detectar. El programador automatico quedara Lun-Vie 8:00am.
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6, background: "var(--surface2)", padding: "10px 14px", borderRadius: 8 }}>
              Conecta la cuenta publicitaria de Facebook para sincronizar metricas automaticamente. Puedes configurarlo despues desde la tab 📘 Facebook.
            </div>
            <div className="field"><label>Access Token de Facebook</label><input type="text" value={form.fbToken} onChange={e => f("fbToken", e.target.value)} placeholder="EAAOWMIieni... (opcional)" /></div>
            <div className="field"><label>Ad Account ID</label><input type="text" value={form.fbAdAccountId} onChange={e => f("fbAdAccountId", e.target.value)} placeholder="120247229359120062 (opcional)" /></div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: "1.5rem", justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
            {step === 0 ? "Cancelar" : "← Anterior"}
          </button>
          {step < steps.length - 1
            ? <button className="btn btn-primary" onClick={() => { if (step === 0 && (!form.name || !form.username || !form.password)) return alert("Completa nombre, usuario y contraseña"); setStep(s => s + 1); }}>Siguiente →</button>
            : <button className="btn btn-primary" onClick={finish}>Crear cliente ✓</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── PANEL DE COMANDOS GLOBALES ──────────────────────────────────────────────
const DEFAULT_COMMANDS_FRONT = [
  { cmd: "/reporte",      label: "Reporte del dia",      descripcion: "Metricas de hoy desde Facebook Ads",              activo: true  },
  { cmd: "/ayer",         label: "Reporte de ayer",      descripcion: "Metricas del dia anterior",                        activo: true  },
  { cmd: "/semana",       label: "Resumen semanal",       descripcion: "Ultimos 7 dias acumulados",                        activo: true  },
  { cmd: "/presupuesto",  label: "Presupuesto activo",    descripcion: "Campanas activas CBO/ABO y total programado",      activo: true  },
  { cmd: "/contrato",     label: "Estado del contrato",   descripcion: "Cuotas y fechas de pago",                          activo: true  },
  { cmd: "/kpis",         label: "Progreso de KPIs",      descripcion: "Avance de las metas del periodo",                  activo: true  },
  { cmd: "/ayuda",        label: "Ayuda",                 descripcion: "Lista de todos los comandos disponibles",          activo: true  },
];

function ComandosPanel({ globalConfig, onSave }) {
  const [commands, setCommands] = useState(globalConfig?.commands || DEFAULT_COMMANDS_FRONT);
  const [saving, setSaving] = useState(false);
  const [webhookToken, setWebhookToken] = useState(globalConfig?.webhookToken || "");
  const [activating, setActivating] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const { show, el: toastEl } = useToast();

  function toggleCmd(cmd) {
    setCommands(prev => prev.map(c => c.cmd === cmd ? { ...c, activo: !c.activo } : c));
  }

  function updCmd(cmd, k, v) {
    setCommands(prev => prev.map(c => c.cmd === cmd ? { ...c, [k]: v } : c));
  }

  async function saveCommands() {
    setSaving(true);
    await onSave({ ...globalConfig, commands, webhookToken });
    show("✓ Comandos guardados — se aplican a todos los clientes", "ok");
    setSaving(false);
  }

  async function activateWebhook() {
    if (!webhookToken) return show("Ingresa el Bot Token primero", "err");
    setActivating(true);
    const webhookUrl = `${window.location.origin}/api/telegram-webhook`;
    try {
      const r = await fetch(`https://api.telegram.org/bot${webhookToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl })
      });
      const data = await r.json();
      if (data.ok) {
        setWebhookStatus("ok");
        show("✓ Webhook activado — el bot ya puede recibir comandos", "ok");
        await onSave({ ...globalConfig, commands, webhookToken });
      } else {
        setWebhookStatus("err");
        show("Error: " + data.description, "err");
      }
    } catch (e) {
      setWebhookStatus("err");
      show("Error de conexion: " + e.message, "err");
    }
    setActivating(false);
  }

  async function checkWebhook() {
    if (!webhookToken) return;
    try {
      const r = await fetch(`https://api.telegram.org/bot${webhookToken}/getWebhookInfo`);
      const data = await r.json();
      if (data.ok && data.result?.url) {
        setWebhookStatus("ok");
        show("Webhook activo en: " + data.result.url, "ok");
      } else {
        setWebhookStatus("err");
        show("Webhook no configurado aun", "err");
      }
    } catch { show("Error al verificar", "err"); }
  }

  return (
    <>
      {toastEl}
      <div>
        <div className="sec-header">
          <div>
            <div className="sec-title">Comandos del Bot</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Activa o desactiva comandos globalmente para todos los clientes
            </div>
          </div>
          <button className="btn btn-green btn-sm" disabled={saving} onClick={saveCommands}>
            {saving ? "Guardando..." : "💾 Guardar cambios"}
          </button>
        </div>

        {/* CONFIGURACION WEBHOOK */}
        <div className="card" style={{ borderColor: "rgba(0,74,173,.3)", marginBottom: "1.25rem" }}>
          <div className="card-title">Activar recepcion de comandos (Webhook)</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Para que los clientes puedan escribirle comandos al bot, debes activar el webhook una sola vez.
            Usa el token del bot principal (el mismo que usas en los clientes).
          </div>
          <div className="field">
            <label>Bot Token</label>
            <input type="text" value={webhookToken} onChange={e => setWebhookToken(e.target.value)} placeholder="1234567890:ABCdef..." />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary btn-sm" disabled={activating || !webhookToken} onClick={activateWebhook}
              style={{ background: "var(--accent)" }}>
              {activating ? "Activando..." : "⚡ Activar Webhook"}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={!webhookToken} onClick={checkWebhook}>
              Verificar estado
            </button>
            {webhookStatus && (
              <span style={{ fontSize: 12, color: webhookStatus === "ok" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                {webhookStatus === "ok" ? "✓ Webhook activo" : "✕ Sin activar"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
            URL del webhook: <span style={{ fontFamily: "var(--mono)", color: "var(--accent2)" }}>{typeof window !== "undefined" ? window.location.origin : "https://tu-app.vercel.app"}/api/telegram-webhook</span>
          </div>
        </div>

        {/* LISTA DE COMANDOS */}
        <div className="card">
          <div className="card-title">Comandos disponibles</div>
          {commands.map(c => (
            <div key={c.cmd} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: c.activo ? "var(--green)" : "var(--border)", position: "relative", flexShrink: 0, cursor: "pointer", marginTop: 2 }}
                onClick={() => toggleCmd(c.cmd)}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: c.activo ? 19 : 3, transition: "left .2s" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>{c.cmd}</span>
                  <input type="text" value={c.label} onChange={e => updCmd(c.cmd, "label", e.target.value)}
                    style={{ fontSize: 12, padding: "2px 8px", width: "auto", flex: 1 }} />
                </div>
                <input type="text" value={c.descripcion} onChange={e => updCmd(c.cmd, "descripcion", e.target.value)}
                  style={{ fontSize: 11, padding: "2px 8px", color: "var(--muted)", width: "100%" }}
                  placeholder="Descripcion del comando..." />
              </div>
              <div style={{ fontSize: 11, color: c.activo ? "var(--green)" : "var(--muted)", fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                {c.activo ? "Activo" : "Inactivo"}
              </div>
            </div>
          ))}
        </div>

        {/* INFO SOBRE COMANDOS */}
        <div style={{ background: "rgba(0,74,173,.07)", border: "1px solid rgba(0,74,173,.2)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: "var(--accent2)", marginBottom: 4 }}>💡 Como funciona</div>
          Cuando un cliente escribe un comando al bot, el sistema lo identifica por su Chat ID,
          consulta sus datos (Facebook Ads si esta conectado, o registros locales si no),
          y responde automaticamente en segundos. Los cambios aqui aplican para todos los clientes de forma instantanea.
        </div>
      </div>
    </>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ clients, onLogout, onUpdate, onAddClient, onDeleteClient, banners, onSaveBanners, globalConfig, onSaveGlobalConfig, filmmakers, saveFilmmakers }) {
  // Listener para actualización de cliente desde el panel de filmmakers
  useEffect(() => {
    const handler = (e) => onUpdate(e.detail);
    window.addEventListener("updateClient", handler);
    return () => window.removeEventListener("updateClient", handler);
  }, [onUpdate]);
  const [view, setView] = useState("clientes");
  const [selectedId, setSelectedId] = useState(null);
  const [addingClient, setAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const { show, el: toastEl } = useToast();
  const selected = clients.find(c => c.id === selectedId);

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo"><div className="sidebar-logo-badge">Admin</div><div className="sidebar-logo-name">Jorge Falcones</div><div className="sidebar-logo-role">Trafficker digital</div></div>
      <div className="nav">
        <div className="nav-label">Panel</div>
        {["clientes", "resumen", "salud", "agenda", "filmmakers", "banner", "campanas", "links", "grupos", "comandos"].map(v => <div key={v} className={`nav-item ${view === v && !selectedId && !addingClient && !editingClient ? "active" : ""}`} onClick={() => { setSelectedId(null); setAddingClient(false); setEditingClient(null); setView(v); }}><div className="nav-dot" style={{ background: view === v && !selectedId ? "var(--accent)" : "var(--border)" }} />{v === "clientes" ? "Mis clientes" : v === "resumen" ? "Resumen general" : v === "salud" ? "🏥 Salud general" : v === "agenda" ? "📅 Mi Agenda" : v === "filmmakers" ? "🎬 Filmmakers" : v === "banner" ? "🖼️ Comunicaciones" : v === "campanas" ? "📣 Campanas" : v === "links" ? "🔗 Links" : v === "grupos" ? "💬 Grupos WA" : "🤖 Comandos Bot"}</div>)}
        {clients.length > 0 && <><div className="nav-label">Clientes</div>{clients.map(c => <div key={c.id} className={`nav-item ${selectedId === c.id ? "active" : ""}`} onClick={() => { setSelectedId(c.id); setAddingClient(false); setEditingClient(null); }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span></div>)}</>}
      </div>
      <div className="sidebar-footer"><DbStatus /><button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 10 }} onClick={onLogout}>Cerrar sesión</button></div>
    </div>
  );

  function renderModal() {
    if (!deleteModal) return null;
    if (deleteModal === "all") return (
      <ConfirmModal title="⚠️ Eliminar todos los clientes" body="Se descargará un JSON de respaldo por cada cliente. Acción irreversible." confirmLabel="Descargar y eliminar todo" danger
        onConfirm={() => { clients.forEach(c => exportClientJSON(c)); setTimeout(() => { onDeleteClient("__ALL__"); setDeleteModal(null); }, 600); }}
        onCancel={() => setDeleteModal(null)} />
    );
    return (
      <ConfirmModal title={`Eliminar a ${deleteModal.name}`} body="Se descargará una copia de respaldo antes de eliminar. Acción irreversible." confirmLabel="Descargar y eliminar" danger
        onConfirm={() => { exportClientJSON(deleteModal); setTimeout(() => { onDeleteClient(deleteModal.id); setDeleteModal(null); setSelectedId(null); }, 300); }}
        onCancel={() => setDeleteModal(null)} />
    );
  }

  if (selectedId && selected) return <><div className="app"><Sidebar /><AdminClientDetail client={selected} allClients={clients} onBack={() => setSelectedId(null)} onUpdate={onUpdate} /></div>{renderModal()}{toastEl}</>;
  if (addingClient) return (
    <>
      <div className="app"><Sidebar /><div className="main"><div className="topbar"><div className="topbar-title">Clientes</div></div><div className="content" /></div></div>
      <OnboardingWizard
        onSave={async c => { await onAddClient(c); show("✓ Cliente creado en 3 pasos", "ok"); setAddingClient(false); }}
        onCancel={() => setAddingClient(false)}
      />
    </>
  );
  if (editingClient) return <div className="app"><Sidebar /><div className="main"><div className="topbar"><button className="btn btn-ghost btn-sm" onClick={() => setEditingClient(null)}>← Volver</button><div className="topbar-title">Editar: {editingClient.name}</div></div><div className="content"><ClientForm initial={editingClient} onSave={async c => { await onUpdate({ ...editingClient, ...c }); show("✓ Cliente actualizado", "ok"); setEditingClient(null); }} onCancel={() => setEditingClient(null)} /></div></div></div>;

  return (
    <>
      {toastEl}
      <div className="app"><Sidebar />
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{view === "clientes" ? "Mis clientes" : view === "resumen" ? "Resumen general" : view === "salud" ? "Salud de clientes" : view === "agenda" ? "Mi Agenda" : view === "banner" ? "Comunicaciones / Banner" : view === "campanas" ? "Campanas de mensajeria" : view === "links" ? "🔗 Links Enmascarados" : "Comandos del Bot"}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <NotificationBell clients={clients} onGoToClient={(id) => { setSelectedId(id); }} />
              {view === "clientes" && clients.length > 0 && <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal("all")}>🗑 Borrar todo</button>}
              {view === "clientes" && <button className="btn btn-primary btn-sm" onClick={() => setAddingClient(true)}>+ Nuevo cliente</button>}
            </div>
          </div>
          <div className="content">
            {view === "clientes" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
              {clients.map(c => {
                const nl = c.niche === "whatsapp" ? "WhatsApp" : c.niche === "web" ? "Web" : "Lanzamiento";
                const nc = c.niche === "whatsapp" ? "badge-wa" : c.niche === "web" ? "badge-web" : "badge-launch";
                return <div key={c.id} className="card" style={{ cursor: "pointer", transition: "border-color .15s", marginBottom: 0 }} onClick={() => setSelectedId(c.id)} onMouseEnter={e => e.currentTarget.style.borderColor = c.color + "88"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="avatar" style={{ background: c.color + "22", color: c.color }}>{c.logo || c.name.slice(0, 2).toUpperCase()}</div><div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{c.representante || "Sin representante"}</div></div></div>
                    <span className={`badge ${nc}`}>{nl}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{(c.records || []).length} registros · {(c.serviciosContratados || []).length} servicios</div>
                  <div style={{ display: "flex", gap: 8 }}><button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedId(c.id)}>Ver perfil</button><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingClient(c); }}>Editar</button><button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDeleteModal(c); }}>&#128465;</button></div>
                </div>;
              })}
              {clients.length === 0 && <div className="empty"><div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>◎</div><div>Sin clientes. Crea el primero.</div></div>}
            </div>}
            {view === "resumen" && <div>
              <div className="grid4" style={{ marginBottom: "1.25rem" }}><MetricCard label="Total clientes" value={clients.length} /><MetricCard label="WhatsApp" value={clients.filter(c => c.niche === "whatsapp").length} /><MetricCard label="Web" value={clients.filter(c => c.niche === "web").length} /><MetricCard label="Lanzamiento" value={clients.filter(c => c.niche === "lanzamiento").length} /></div>
              <div className="card">
                <div className="card-title">Inversión total por cliente</div>
                {clients.map(c => {
                  const total = sum(c.records || [], "inversion");
                  const maxInv = Math.max(...clients.map(cc => sum(cc.records || [], "inversion")), 1);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 110, fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ flex: 1, background: "var(--surface2)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${(total / maxInv) * 100}%`, height: "100%", background: c.color, borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 13, fontFamily: "var(--mono)", minWidth: 72, textAlign: "right" }}>${fmtNum(total, 0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>}
            {view === "salud" && <HealthDashboard clients={clients} />}
            {view === "agenda" && <AgendaConsolidadaPanel clients={clients} />}
            {view === "filmmakers" && <FilmakersAdminPanel filmmakers={filmmakers} clients={clients} onSave={saveFilmmakers} />}
            {view === "banner" && (
              <BannerAdmin clients={clients} banners={banners} onSave={onSaveBanners} />
            )}
            {view === "campanas" && (
              <CampanasPanel clients={clients} />
            )}
            {view === "links" && (
              <LinksPanel />
            )}
            {view === "grupos" && (
              <GruposPanel />
            )}
            {view === "comandos" && (
              <ComandosPanel globalConfig={globalConfig} onSave={onSaveGlobalConfig} />
            )}
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
        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center" }}><DbStatus /></div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [banners, setBanners] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({ commands: DEFAULT_COMMANDS_FRONT, webhookToken: "" });
  const [filmmakers, setFilmmakers] = useState([]);
  const [appLoading, setAppLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      const result = await db.getAll();
      if (result.ok) {
        // Separar banners de clientes reales
        const allItems = result.data;
        const clientData = allItems.filter(item => item && item.id && !item.id.startsWith("__"));
        const bannerItem = allItems.find(item => item && item.id === "__banners__");
        const configItem = allItems.find(item => item && item.id === "__globalconfig__");
        const fmItem = allItems.find(item => item && item.id === "__filmmakers__");
        setClients(clientData);
        setBanners(bannerItem?.data || []);
        if (configItem?.data) setGlobalConfig(configItem.data);
        if (fmItem?.data) setFilmmakers(fmItem.data);
        setDbError(null);
      } else {
        setDbError("No se pudo conectar a la base de datos. Verifica las variables de entorno en Vercel.");
      }
      setAppLoading(false);
    }
    loadAll();
  }, []);

  async function saveClient(client) {
    const result = await db.upsert(client);
    if (result.ok) setClients(prev => prev.find(c => c.id === client.id) ? prev.map(c => c.id === client.id ? client : c) : [...prev, client]);
    return result;
  }

  async function saveBanners(newBanners) {
    setBanners(newBanners);
    await db.upsert({ id: "__banners__", data: newBanners });
  }

  async function saveGlobalConfig(cfg) {
    setGlobalConfig(cfg);
    await db.upsert({ id: "__globalconfig__", data: cfg });
  }

  async function saveFilmmakers(list) {
    setFilmmakers(list);
    await db.upsert({ id: "__filmmakers__", data: list });
  }

  async function updateFilmmaker(updated) {
    const list = filmmakers.map(f => f.id === updated.id ? updated : f);
    await saveFilmmakers(list);
  }

  async function handleLogin(username, password) {
    setLoginLoading(true);
    if (username === ADMIN.username && password === ADMIN.password) { setSession({ role: "admin" }); setLoginLoading(false); return true; }
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, { headers: H });
      if (!r.ok) throw new Error("Sin conexión a BD");
      const rows = await r.json();
      const all = rows.map(row => row.data).filter(item => item && !item.id?.startsWith("__"));
      setClients(all);
      const found = all.find(c => c.username === username && c.password === password);
      if (found) { setSession({ role: "client", clientId: found.id }); setLoginLoading(false); return true; }
    } catch (e) { console.error("Login error:", e); }
    setLoginLoading(false); return false;
  }

  async function updateClient(updated) { return await saveClient(updated); }
  async function addClient(data) {
    const nc = { antecedentes: [], records: [], checklist: {}, cuentas: [], contratos: [], kpis: [], funnel: [], ...data, id: "c" + Date.now() };
    return await saveClient(nc);
  }
  async function deleteClient(id) {
    if (id === "__ALL__") { await db.deleteAll(); setClients([]); }
    else { await db.delete(id); setClients(prev => prev.filter(c => c.id !== id)); }
  }

  if (appLoading) return (
    <><style>{css}</style>
      <div className="loading-screen">
        <div className="spinner" />
        <div style={{ fontSize: 14 }}>Conectando con base de datos...</div>
      </div>
    </>
  );

  if (dbError) return (
    <><style>{css}</style>
      <div className="loading-screen">
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", marginBottom: 8 }}>Error de conexión</div>
        <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: 400 }}>{dbError}</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => {
          setAppLoading(true); setDbError(null);
          db.getAll().then(r => { if (r.ok) { setClients(r.data.filter(i => i && !i.id?.startsWith("__"))); } else setDbError(r.error); setAppLoading(false); });
        }}>Reintentar conexión</button>
      </div>
    </>
  );

  const clientSession = session?.role === "client" ? clients.find(c => c.id === session.clientId) : null;
  const clientBanners = clientSession ? getBannersForClient(banners, clientSession.id) : [];

  return (
    <>
      <style>{css}</style>
      {!session && <LoginScreen onLogin={handleLogin} loading={loginLoading} />}
      {session?.role === "admin" && (
        <AdminPanel
          clients={clients}
          onLogout={() => setSession(null)}
          onUpdate={updateClient}
          onAddClient={addClient}
          onDeleteClient={deleteClient}
          banners={banners}
          onSaveBanners={saveBanners}
          globalConfig={globalConfig}
          onSaveGlobalConfig={saveGlobalConfig}
          filmmakers={filmmakers}
          saveFilmmakers={saveFilmmakers}
        />
      )}
      {session?.role === "filmmaker" && (() => {
        const fm = filmmakers.find(f => f.id === session.filmmakerId);
        if (!fm) return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
        return <FilmakerDashboard filmmaker={fm} allClients={clients} onLogout={() => setSession(null)} onUpdate={updateFilmmaker} />;
      })()}
      {session?.role === "client" && clientSession && (
        <ClientDashboard client={clientSession} onLogout={() => setSession(null)} banners={clientBanners} onUpdate={updateClient} />
      )}
      {session?.role === "client" && !clientSession && <LoginScreen onLogin={handleLogin} loading={loginLoading} />}
    </>
  );
}

