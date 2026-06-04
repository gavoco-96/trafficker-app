import { useState, useEffect, useCallback, useRef } from "react";

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
  .banner-wrap{width:100%;overflow:hidden;border-radius:0;background:var(--surface);border-bottom:1px solid var(--border);position:relative;user-select:none}
  .banner-track{display:flex;transition:transform .4s ease;height:180px}
  .banner-slide{flex-shrink:0;width:100%;height:180px;object-fit:cover;object-position:center}
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
  /* Ocultar flechas nativas de input number en todos los browsers */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
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
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtNum = (n, dec = 0) => (n === "" || n === null || n === undefined || isNaN(Number(n))) ? "—" : Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = (n) => n && !isNaN(n) ? "$" + fmtNum(n, 2) : "—";
const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;
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
    clientesPotenciales: fmtNum(sum(rows, "clientesPotenciales")),
    formularios: fmtNum(sum(rows, "formularios")),
    costo_formulario: sum(rows, "formularios") ? fmtNum(inv / sum(rows, "formularios"), 2) : "—",
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
  const sep = formato === "csv" ? "," : "	";
  const content = [headers, ...dataRows].map(r => r.map(v => `"${v}"`).join(sep)).join("
");
  const blob = new Blob(["﻿" + content], { type: formato === "csv" ? "text/csv" : "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `metricas_${client.name}_${new Date().toISOString().slice(0,10)}.${formato}`; a.click();
  URL.revokeObjectURL(url);
}

function MetricasAdminPanel({ client, onUpdate, period, setPeriod, from, setFrom, to, setTo, rows, t, isWA, isWeb, isLaunch, onAdd }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortedRows = [...rows].sort((a, b) => {
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
  const EditNum = ({ fk, prefix }) => (
    <NumInput value={editForm[fk] ?? ""} onChange={v => ef(fk, v)} prefix={prefix} placeholder="0" />
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
        <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Nuevo registro</button>
      </div>
      <div className="grid4" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Inversión" value={"$" + t.inversion} />
        <MetricCard label="Alcance" value={t.alcance} />
        <MetricCard label="CPM" value={"$" + t.cpm} />
        <MetricCard label="ROAS" value={(t.roas || "—") + "x"} highlight />
      </div>
      {isWA && <div className="grid4" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Leads" value={t.leads} />
        <MetricCard label="Contactados" value={t.contactados} />
        <MetricCard label="Ventas" value={t.ventas} />
        <MetricCard label="Ingresos" value={"$" + t.ingreso} highlight />
      </div>}
      {isWeb && <div className="grid4" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Sesiones" value={t.sesiones} />
        <MetricCard label="Carrito" value={t.agregar_carrito} />
        <MetricCard label="Compras" value={t.compras} />
        <MetricCard label="Ingresos" value={"$" + t.ingreso} highlight />
      </div>}
      {isLaunch && <div className="grid3" style={{ marginBottom: "1rem" }}>
        <MetricCard label="Potenciales" value={t.clientesPotenciales} />
        <MetricCard label="Formularios" value={t.formularios} />
        <MetricCard label="Costo/form" value={"$" + t.costo_formulario} highlight />
      </div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => exportMetricas(sortedRows, client, "csv")}>⬇ CSV</button>
        <button className="btn btn-ghost btn-sm" onClick={() => exportMetricas(sortedRows, client, "xls")}>⬇ XLS</button>
      </div>
      <div className="card scroll-x">
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          Clic en encabezado para ordenar · ✏️ para editar
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <SortTh col="date" label="Fecha" />
              <SortTh col="inversion" label="Inversión" />
              <SortTh col="cpm" label="CPM" />
              <SortTh col="cpc" label="CPC" />
              <SortTh col="ctr" label="CTR" />
              {isWA && <><SortTh col="leads" label="Leads" /><SortTh col="contactados" label="Contactados" /><SortTh col="ventas" label="Ventas" /><SortTh col="ingreso" label="Ingresos" /></>}
              {isWeb && <><SortTh col="sesiones" label="Sesiones" /><SortTh col="agregar_carrito" label="Carrito" /><SortTh col="compras" label="Compras" /><SortTh col="ingreso" label="Ingresos" /><SortTh col="roas" label="ROAS" /></>}
              {isLaunch && <><SortTh col="clientesPotenciales" label="Potenciales" /><SortTh col="formularios" label="Formularios" /></>}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr><td colSpan={14} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Sin registros.</td></tr>
            )}
            {sortedRows.map((r, i) => {
              const isEdit = editingRow === i;
              return (
                <tr key={i} style={isEdit ? { background: "rgba(124,58,237,.06)" } : {}}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                    {isEdit ? <input type="date" value={editForm.date} onChange={e => ef("date", e.target.value)} style={{ width: 130, fontSize: 12 }} /> : r.date}
                  </td>
                  <td>{isEdit ? <EditNum fk="inversion" prefix="$" /> : "$" + fmtNum(r.inversion, 2)}</td>
                  <td>{isEdit ? <EditNum fk="cpm" prefix="$" /> : "$" + fmtNum(r.cpm, 2)}</td>
                  <td>{isEdit ? <EditNum fk="cpc" prefix="$" /> : "$" + fmtNum(r.cpc, 2)}</td>
                  <td>{isEdit ? <EditNum fk="ctr" /> : fmtNum(r.ctr, 2) + "%"}</td>
                  {isWA && <>
                    <td>{isEdit ? <EditNum fk="leads" /> : fmtNum(r.leads)}</td>
                    <td>{isEdit ? <EditNum fk="contactados" /> : fmtNum(r.contactados)}</td>
                    <td>{isEdit ? <EditNum fk="ventas" /> : fmtNum(r.ventas)}</td>
                    <td>{isEdit ? <EditNum fk="ingreso" prefix="$" /> : "$" + fmtNum(r.ingreso, 2)}</td>
                  </>}
                  {isWeb && <>
                    <td>{isEdit ? <EditNum fk="sesiones" /> : fmtNum(r.sesiones)}</td>
                    <td>{isEdit ? <EditNum fk="agregar_carrito" /> : fmtNum(r.agregar_carrito)}</td>
                    <td>{isEdit ? <EditNum fk="compras" /> : fmtNum(r.compras)}</td>
                    <td>{isEdit ? <EditNum fk="ingreso" prefix="$" /> : "$" + fmtNum(r.ingreso, 2)}</td>
                    <td>{isEdit ? <EditNum fk="roas" /> : fmtNum(r.roas, 2) + "x"}</td>
                  </>}
                  {isLaunch && <>
                    <td>{isEdit ? <EditNum fk="clientesPotenciales" /> : fmtNum(r.clientesPotenciales)}</td>
                    <td>{isEdit ? <EditNum fk="formularios" /> : fmtNum(r.formularios)}</td>
                  </>}
                  <td>
                    {isEdit ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-green btn-sm" onClick={saveEdit} title="Guardar">✓</button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit} title="Cancelar">x</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(r, i)} title="Editar">&#9998;</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRow(i)} title="Eliminar">&#128465;</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* FILA DE TOTALES */}
          {sortedRows.length > 1 && (
            <tfoot>
              <tr style={{ background: "rgba(124,58,237,.08)", fontWeight: 600 }}>
                <td style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--mono)" }}>TOTAL</td>
                <td>${fmtNum(sum(sortedRows, "inversion"), 2)}</td>
                <td>${fmtNum(avg(sortedRows, "cpm"), 2)}</td>
                <td>${fmtNum(avg(sortedRows, "cpc"), 2)}</td>
                <td>{fmtNum(avg(sortedRows, "ctr"), 2)}%</td>
                {isWA && <>
                  <td>{fmtNum(sum(sortedRows, "leads"))}</td>
                  <td>{fmtNum(sum(sortedRows, "contactados"))}</td>
                  <td>{fmtNum(sum(sortedRows, "ventas"))}</td>
                  <td>${fmtNum(sum(sortedRows, "ingreso"), 2)}</td>
                </>}
                {isWeb && <>
                  <td>{fmtNum(sum(sortedRows, "sesiones"))}</td>
                  <td>{fmtNum(sum(sortedRows, "agregar_carrito"))}</td>
                  <td>{fmtNum(sum(sortedRows, "compras"))}</td>
                  <td>${fmtNum(sum(sortedRows, "ingreso"), 2)}</td>
                  <td>{fmtNum(avg(sortedRows, "roas"), 2)}x</td>
                </>}
                {isLaunch && <>
                  <td>{fmtNum(sum(sortedRows, "clientesPotenciales"))}</td>
                  <td>{fmtNum(sum(sortedRows, "formularios"))}</td>
                </>}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
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
  const match = url && url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url || "";
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
    if (b.destinatarios === "todos") return true;
    return (b.clientesSeleccionados || []).includes(clientId);
  }).map(b => ({
    ...b,
    url: (() => {
      const match = b.url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
      return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : b.url;
    })()
  }));
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

  function handleSave() {
    const rec = { date: dateRef.current?.value || today };
    Object.entries(formRef.current).forEach(([k, el]) => {
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

      <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
        <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
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
  { id: "p2", nombre: "Recordatorio de cobro", tipo: "cobro", texto: "" },
  { id: "p3", nombre: "Mensaje personalizado", tipo: "custom", texto: "" },
];

function TelegramPanel({ client, records, tgConfig, onSaveConfig }) {
  const [token, setToken] = useState(tgConfig?.token || "");
  const [chatId, setChatId] = useState(tgConfig?.chatId || client.telefono || "");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plantillas, setPlantillas] = useState(tgConfig?.plantillas || PLANTILLAS_DEFAULT);
  const [selectedPlantilla, setSelectedPlantilla] = useState("p1");
  const [customTexto, setCustomTexto] = useState("");
  const { show, el: toastEl } = useToast();

  const lastRecord = records && records.length > 0 ? [records[records.length - 1]] : [];

  function getMensaje() {
    const p = plantillas.find(x => x.id === selectedPlantilla);
    if (!p) return "";
    if (p.tipo === "reporte") return lastRecord.length ? buildReportMessage(client, lastRecord) : "";
    if (p.tipo === "cobro") return buildCobroMessage(client) || "No hay cuotas pendientes para este cliente.";
    return p.texto || customTexto || "";
  }

  const mensaje = getMensaje();
  const preview = mensaje ? mensaje.split("\n").join("\n").replace(/[*_]/g, "") : "";

  async function saveConfig() {
    setSaving(true);
    await onSaveConfig({ token, chatId, plantillas });
    show("✓ Configuracion guardada", "ok");
    setSaving(false);
  }

  async function send() {
    if (!token || !chatId) return show("Completa el token y chat ID primero", "err");
    if (!mensaje) return show("No hay mensaje para enviar", "err");
    setSending(true);
    const result = await sendTelegram(token, chatId, mensaje);
    show(result.ok ? "✓ Mensaje enviado a Telegram" : "Error: " + result.error, result.ok ? "ok" : "err");
    setSending(false);
  }

  function updPlantilla(id, k, v) {
    setPlantillas(p => p.map(x => x.id === id ? { ...x, [k]: v } : x));
  }

  function addPlantilla() {
    if (plantillas.length >= 5) return show("Maximo 5 plantillas", "err");
    setPlantillas(p => [...p, { id: "p" + Date.now(), nombre: "Nueva plantilla", tipo: "custom", texto: "" }]);
  }

  return (
    <>
      {toastEl}
      <div className="tg-card">
        <div className="tg-header">
          <span style={{ fontSize: 18 }}>✈️</span> Mensajeria por Telegram
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
          <b style={{ color: "var(--text)" }}>Configuracion (una sola vez):</b><br/>
          1. Busca <b>@BotFather</b> en Telegram, escribe /newbot, copia el Token<br/>
          2. El cliente busca tu bot y le da /start<br/>
          3. Visita api.telegram.org/bot[TOKEN]/getUpdates para obtener el Chat ID
        </div>

        <div className="form-row">
          <div className="field">
            <label>Bot Token</label>
            <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="1234567890:ABCdef..." />
          </div>
          <div className="field">
            <label>Chat ID del destinatario</label>
            <input type="text" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Ej: 123456789" />
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={saveConfig} style={{ marginBottom: "1.5rem" }}>
          {saving ? "Guardando..." : "💾 Guardar configuracion"}
        </button>

        {/* PLANTILLAS */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Plantillas de mensaje</div>
            <button className="btn btn-ghost btn-sm" onClick={addPlantilla}>+ Añadir</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {plantillas.map(p => (
              <button key={p.id}
                className={"pill " + (selectedPlantilla === p.id ? "active" : "")}
                onClick={() => setSelectedPlantilla(p.id)}>
                {p.nombre}
              </button>
            ))}
          </div>
          {(() => {
            const p = plantillas.find(x => x.id === selectedPlantilla);
            if (!p) return null;
            return (
              <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 12 }}>
                <div className="form-row" style={{ marginBottom: 8 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Nombre de la plantilla</label>
                    <input type="text" value={p.nombre} onChange={e => updPlantilla(p.id, "nombre", e.target.value)} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Tipo</label>
                    <select value={p.tipo} onChange={e => updPlantilla(p.id, "tipo", e.target.value)}>
                      <option value="reporte">Reporte diario (automatico)</option>
                      <option value="cobro">Recordatorio de cobro (del contrato)</option>
                      <option value="custom">Mensaje personalizado</option>
                    </select>
                  </div>
                </div>
                {p.tipo === "custom" && (
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Texto del mensaje</label>
                    <textarea value={p.texto} onChange={e => updPlantilla(p.id, "texto", e.target.value)} placeholder="Escribe tu mensaje aqui..." style={{ minHeight: 80 }} />
                  </div>
                )}
                {p.tipo === "reporte" && !lastRecord.length && (
                  <div style={{ fontSize: 12, color: "var(--amber)" }}>Agrega un registro diario para activar este tipo.</div>
                )}
                {p.tipo === "cobro" && !(client.contratos || []).length && (
                  <div style={{ fontSize: 12, color: "var(--amber)" }}>Este cliente no tiene contratos registrados.</div>
                )}
              </div>
            );
          })()}
        </div>

        {/* PREVIEW */}
        {preview && (
          <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: "1rem", whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto" }}>
            <div style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600, marginBottom: 6 }}>Vista previa:</div>
            {preview}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" disabled={sending || !mensaje} onClick={send} style={{ background: "var(--accent2)" }}>
            {sending ? "Enviando..." : "📤 Enviar mensaje"}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={saving} onClick={saveConfig}>
            💾 Guardar plantillas
          </button>
        </div>
      </div>
    </>
  );
}

// ─── ADMIN CLIENT DETAIL ──────────────────────────────────────────────────────
function AdminClientDetail({ client, onBack, onUpdate }) {
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
          {["info", "checklist", "cuentas", "contratos", "antecedentes", "proyecciones", "metricas", "reporte", "telegram"].map(t2 => (
            <button key={t2} className={`tab ${tab === t2 ? "active" : ""}`} onClick={() => setTab(t2)}>
              {t2 === "info" ? "Perfil" : t2 === "checklist" ? "Checklist" : t2 === "cuentas" ? "Cuentas" : t2 === "contratos" ? "Contratos" : t2 === "antecedentes" ? "Antecedentes" : t2 === "proyecciones" ? "Proyecciones" : t2 === "metricas" ? "Metricas" : t2 === "reporte" ? "Reporte IA" : "✈️ Telegram"}
            </button>
          ))}
        </div>
        {tab === "info" && (
          <div>
            <ProgressBar client={client} />
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
                  {[["Usuario", client.username], ["Nicho", nicheLabel], ["Servicios", (client.serviciosContratados || []).map(id => SERVICIOS_DEFAULT.find(s => s.id === id)?.nombre || id).join(", ") || "—"]].map(([l, v]) => (
                    <div key={l} className="info-row">
                      <span className="info-label">{l}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "checklist" && <ChecklistPanel client={client} onUpdate={handleUpdate} />}
        {tab === "cuentas" && <CuentasPanel client={client} onUpdate={onUpdate} readOnly={false} />}
        {tab === "contratos" && <ContratosPanel client={client} onUpdate={handleUpdate} />}
        {tab === "antecedentes" && <AntecedentesPanel client={client} onUpdate={handleUpdate} readOnly={false} />}
        {tab === "proyecciones" && <ProyeccionesPanel client={client} onUpdate={handleUpdate} readOnly={false} />}
        {tab === "metricas" && <MetricasAdminPanel client={client} onUpdate={handleUpdate} period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} rows={rows} t={t} isWA={isWA} isWeb={isWeb} isLaunch={isLaunch} onAdd={() => setAdding(true)} />}
        {tab === "reporte" && <div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <button className="btn btn-primary" disabled={loadingReport || rows.length === 0} onClick={() => generateReport(client, rows, setReport, setLoadingReport)} style={{ marginBottom: "1rem" }}>{loadingReport ? "Generando..." : "Generar reporte IA"}</button>
          {(report || loadingReport) && <div className="ai-report"><div className="ai-report-header"><span>✦</span> Reporte · {client.name}</div><div className={`ai-report-body ${loadingReport && !report ? "streaming-cursor" : ""}`}>{report || " "}{loadingReport && report && <span className="streaming-cursor" />}</div></div>}
        </div>}
        {tab === "telegram" && (
          <TelegramPanel
            client={client}
            records={rows}
            tgConfig={client.tgConfig || {}}
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
function ClientDashboard({ client, onLogout, banners }) {
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
          {["resumen", "detalle", "proyecciones", "antecedentes"].map(v => <div key={v} className={`nav-item ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}><div className="nav-dot" style={{ background: tab === v ? "var(--accent)" : "var(--border)" }} />{v === "resumen" ? "Resumen" : v === "detalle" ? "Detalle diario" : v === "proyecciones" ? "Proyecciones" : "Histórico"}</div>)}
        </div>
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo || client.name.slice(0, 2).toUpperCase()}</div><div><div style={{ fontSize: 13, fontWeight: 500 }}>{client.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Vista de cliente</div></div></div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="main">
        <div className="topbar"><div className="topbar-title">{tab === "resumen" ? "Resumen" : tab === "detalle" ? "Detalle diario" : tab === "proyecciones" ? "Proyecciones" : "Histórico de pauta"}</div><PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} /></div>
        {banners && banners.length > 0 && <BannerViewer banners={banners} />}
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
          {tab === "detalle" && (
            <div className="card scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>
                    {isWA && <><th>Leads</th><th>Ventas</th><th>Ingresos</th></>}
                    {isWeb && <><th>Sesiones</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}
                    {isLaunch && <><th>Potenciales</th><th>Formularios</th></>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={10} style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>Sin datos.</td></tr>}
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.date}</td>
                      <td>${fmtNum(r.inversion, 2)}</td>
                      <td>${fmtNum(r.cpm, 2)}</td>
                      <td>${fmtNum(r.cpc, 2)}</td>
                      <td>{fmtNum(r.ctr, 2)}%</td>
                      {isWA && <><td>{fmtNum(r.leads)}</td><td>{fmtNum(r.ventas)}</td><td>${fmtNum(r.ingreso, 2)}</td></>}
                      {isWeb && <><td>{fmtNum(r.sesiones)}</td><td>{fmtNum(r.compras)}</td><td>${fmtNum(r.ingreso, 2)}</td><td>{fmtNum(r.roas, 2)}x</td></>}
                      {isLaunch && <><td>{fmtNum(r.clientesPotenciales)}</td><td>{fmtNum(r.formularios)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "proyecciones" && <ProyeccionesPanel client={client} onUpdate={() => {}} readOnly={true} />}
          {tab === "antecedentes" && <AntecedentesPanel client={client} onUpdate={() => { }} readOnly={true} />}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ clients, onLogout, onUpdate, onAddClient, onDeleteClient, banners, onSaveBanners }) {
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
        {["clientes", "resumen", "banner"].map(v => <div key={v} className={`nav-item ${view === v && !selectedId && !addingClient && !editingClient ? "active" : ""}`} onClick={() => { setSelectedId(null); setAddingClient(false); setEditingClient(null); setView(v); }}><div className="nav-dot" style={{ background: view === v && !selectedId ? "var(--accent)" : "var(--border)" }} />{v === "clientes" ? "Mis clientes" : v === "resumen" ? "Resumen general" : "🖼️ Comunicaciones"}</div>)}
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

  if (selectedId && selected) return <><div className="app"><Sidebar /><AdminClientDetail client={selected} onBack={() => setSelectedId(null)} onUpdate={onUpdate} /></div>{renderModal()}{toastEl}</>;
  if (addingClient) return <div className="app"><Sidebar /><div className="main"><div className="topbar"><button className="btn btn-ghost btn-sm" onClick={() => setAddingClient(false)}>← Volver</button><div className="topbar-title">Nuevo cliente</div></div><div className="content"><ClientForm onSave={async c => { await onAddClient(c); show("✓ Cliente creado correctamente", "ok"); setAddingClient(false); }} onCancel={() => setAddingClient(false)} /></div></div></div>;
  if (editingClient) return <div className="app"><Sidebar /><div className="main"><div className="topbar"><button className="btn btn-ghost btn-sm" onClick={() => setEditingClient(null)}>← Volver</button><div className="topbar-title">Editar: {editingClient.name}</div></div><div className="content"><ClientForm initial={editingClient} onSave={async c => { await onUpdate({ ...editingClient, ...c }); show("✓ Cliente actualizado", "ok"); setEditingClient(null); }} onCancel={() => setEditingClient(null)} /></div></div></div>;

  return (
    <>
      {toastEl}
      <div className="app"><Sidebar />
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{view === "clientes" ? "Mis clientes" : view === "resumen" ? "Resumen general" : "Comunicaciones / Banner"}</div>
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
            {view === "banner" && (
              <BannerAdmin clients={clients} banners={banners} onSave={onSaveBanners} />
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
  const [appLoading, setAppLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      const result = await db.getAll();
      if (result.ok) {
        // Separar banners de clientes reales
        const allItems = result.data;
        const clientData = allItems.filter(item => item && item.id && !item.id.startsWith("__banners__"));
        const bannerItem = allItems.find(item => item && item.id === "__banners__");
        setClients(clientData);
        setBanners(bannerItem?.data || []);
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
    // Guardar banners como un registro especial en la misma tabla
    await db.upsert({ id: "__banners__", data: newBanners });
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
        />
      )}
      {session?.role === "client" && clientSession && (
        <ClientDashboard client={clientSession} onLogout={() => setSession(null)} banners={clientBanners} />
      )}
      {session?.role === "client" && !clientSession && <LoginScreen onLogin={handleLogin} loading={loginLoading} />}
    </>
  );
}

