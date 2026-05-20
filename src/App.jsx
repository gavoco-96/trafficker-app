import { useState, useEffect } from "react";

// ─── STORAGE (localStorage real para producción) ───────────────────────────
const S = {
  get(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch { return false; }
  }
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_CLIENTS = [
  {
    id: "c1", name: "Bella Estética", username: "bella", password: "bella123",
    niche: "whatsapp", logo: "BE", color: "#7C3AED",
    records: [
      { date: "2025-05-01", inversion: 120, alcance: 8200, impresiones: 14000, clics: 310, cpm: 8.57, cpc: 0.39, ctr: 2.21, leads: 48, contactados: 40, ventas: 12, ingreso: 1440 },
      { date: "2025-05-02", inversion: 135, alcance: 9100, impresiones: 15800, clics: 340, cpm: 8.54, cpc: 0.40, ctr: 2.15, leads: 52, contactados: 44, ventas: 14, ingreso: 1680 },
      { date: "2025-05-03", inversion: 110, alcance: 7400, impresiones: 12900, clics: 280, cpm: 8.53, cpc: 0.39, ctr: 2.17, leads: 41, contactados: 35, ventas: 10, ingreso: 1200 },
      { date: "2025-05-04", inversion: 150, alcance: 10500, impresiones: 18200, clics: 390, cpm: 8.24, cpc: 0.38, ctr: 2.14, leads: 60, contactados: 51, ventas: 16, ingreso: 1920 },
      { date: "2025-05-05", inversion: 130, alcance: 8900, impresiones: 15500, clics: 330, cpm: 8.39, cpc: 0.39, ctr: 2.13, leads: 50, contactados: 42, ventas: 13, ingreso: 1560 },
    ]
  },
  {
    id: "c2", name: "TechStore EC", username: "techstore", password: "tech456",
    niche: "web", logo: "TS", color: "#0891B2",
    records: [
      { date: "2025-05-01", inversion: 200, alcance: 15000, impresiones: 28000, clics: 560, cpm: 7.14, cpc: 0.36, ctr: 2.0, sesiones: 480, agregar_carrito: 96, compras: 22, ingreso: 3300, roas: 16.5 },
      { date: "2025-05-02", inversion: 220, alcance: 16400, impresiones: 30200, clics: 610, cpm: 7.28, cpc: 0.36, ctr: 2.02, sesiones: 520, agregar_carrito: 104, compras: 25, ingreso: 3750, roas: 17.05 },
      { date: "2025-05-03", inversion: 185, alcance: 13800, impresiones: 25400, clics: 510, cpm: 7.28, cpc: 0.36, ctr: 2.01, sesiones: 440, agregar_carrito: 88, compras: 19, ingreso: 2850, roas: 15.41 },
      { date: "2025-05-04", inversion: 240, alcance: 18200, impresiones: 33500, clics: 670, cpm: 7.16, cpc: 0.36, ctr: 2.0, sesiones: 580, agregar_carrito: 116, compras: 28, ingreso: 4200, roas: 17.5 },
      { date: "2025-05-05", inversion: 210, alcance: 15600, impresiones: 28800, clics: 580, cpm: 7.29, cpc: 0.36, ctr: 2.01, sesiones: 500, agregar_carrito: 100, compras: 23, ingreso: 3450, roas: 16.43 },
    ]
  }
];

const ADMIN = { username: "jorge", password: "admin2024" };

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0F0F13;--surface:#18181F;--surface2:#22222C;--border:#2A2A38;
    --text:#F0EFF8;--muted:#7B7A8E;--accent:#7C3AED;--accent2:#0EA5E9;
    --green:#10B981;--red:#EF4444;--amber:#F59E0B;
    --font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
    --r:10px;--r2:16px;
  }
  html,body,#root{height:100%;width:100%}
  body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px}
  .app{display:flex;min-height:100vh}

  .login{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;background:var(--bg)}
  .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2.5rem;width:100%;max-width:380px}
  .login-logo{font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:2rem}
  .login-title{font-size:24px;font-weight:600;margin-bottom:.4rem}
  .login-sub{color:var(--muted);font-size:13px;margin-bottom:2rem}
  .field{margin-bottom:1rem}
  .field label{display:block;font-size:12px;font-weight:500;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
  .field input,.field select{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s}
  .field input:focus,.field select:focus{border-color:var(--accent)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--r);font-family:var(--font);font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all .15s;text-decoration:none}
  .btn-primary{background:var(--accent);color:#fff}
  .btn-primary:hover{opacity:.88}
  .btn-primary:disabled{opacity:.45;cursor:not-allowed}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
  .btn-ghost:hover{color:var(--text);border-color:var(--muted)}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--border)}
  .btn-danger:hover{border-color:var(--red);background:rgba(239,68,68,.08)}
  .btn-sm{padding:6px 12px;font-size:12px}
  .btn-full{width:100%}
  .err{color:var(--red);font-size:12px;margin-top:8px}

  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:100vh;flex-shrink:0}
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

  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem}
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

  .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.04em}
  .badge-wa{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-web{background:rgba(14,165,233,.12);color:var(--accent2)}

  .avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}

  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  .form-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem}
  select{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none}
  select:focus{border-color:var(--accent)}
  input[type=text],input[type=password],input[type=number],input[type=date]{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s}
  input:focus{border-color:var(--accent)}

  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
  .sec-title{font-size:15px;font-weight:600}

  .filter-bar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .period-pills{display:flex;gap:4px;flex-wrap:wrap}
  .pill{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;font-family:var(--font);transition:all .15s}
  .pill.active,.pill:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:1rem}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:4px;transition:opacity .15s;cursor:pointer}
  .bar:hover{opacity:.7}

  .tab-row{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:1.25rem}
  .tab{padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--font)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:hover:not(.active){color:var(--text)}

  .ai-report{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r2);padding:1.25rem}
  .ai-report-header{display:flex;align-items:center;gap:8px;margin-bottom:.75rem;font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em}
  .ai-report-body{font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}
  .streaming-cursor::after{content:'▌';animation:blink .7s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

  .scroll-x{overflow-x:auto}
  .empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
  .divider{height:1px;background:var(--border);margin:1.25rem 0}
  .modal-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.5rem;max-width:560px}

  .hint-box{background:var(--surface2);border-radius:8px;padding:.75rem 1rem;font-size:12px;color:var(--muted);margin-top:1.25rem}
  .hint-box b{color:var(--text);font-weight:500}

  @media(max-width:640px){
    .sidebar{display:none}
    .grid4{grid-template-columns:1fr 1fr}
    .grid3{grid-template-columns:1fr 1fr}
    .form-row,.form-row3{grid-template-columns:1fr}
  }
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n, dec = 0) => isNaN(n) ? "—" : Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = (n) => isNaN(n) ? "—" : "$" + fmt(n, 2);

function filterByPeriod(records, period, from, to) {
  const now = new Date();
  return (records || []).filter(r => {
    const d = new Date(r.date + "T12:00:00");
    if (period === "custom") return (!from || d >= new Date(from + "T00:00:00")) && (!to || d <= new Date(to + "T23:59:59"));
    if (period === "7d") { const lim = new Date(now); lim.setDate(lim.getDate() - 7); return d >= lim; }
    if (period === "30d") { const lim = new Date(now); lim.setDate(lim.getDate() - 30); return d >= lim; }
    if (period === "mtd") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;

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
  };
}

// ─── AI REPORT ────────────────────────────────────────────────────────────────
async function generateReport(client, rows, setReport, setLoading, apiKey) {
  if (!apiKey) { setReport("⚠️ Configura tu API key de Claude en el archivo src/config.js para usar esta función."); return; }
  setLoading(true); setReport("");
  const t = buildTotals(client.niche, rows);
  const isWA = client.niche === "whatsapp";
  const prompt = isWA
    ? `Eres experto en marketing digital. Reporte ejecutivo en español para "${client.name}" (ventas WhatsApp):\nInversión: $${t.inversion} | Leads: ${t.leads} | Contactados: ${t.contactados} | Ventas: ${t.ventas} | Ingresos: $${t.ingreso} | CPM: $${t.cpm} | CPC: $${t.cpc} | CTR: ${t.ctr}% | Tasa contacto: ${t.tasaContacto}% | Tasa cierre: ${t.tasaCierre}% | CPL: $${t.cpl} | CPV: $${t.cpv} | ROAS: ${t.roas}x\n\n3 párrafos: resumen, puntos fuertes/alertas, recomendación. Tono profesional cercano. Sin bullets.`
    : `Eres experto en marketing digital. Reporte ejecutivo en español para "${client.name}" (e-commerce):\nInversión: $${t.inversion} | Sesiones: ${t.sesiones} | Carrito: ${t.agregar_carrito} | Compras: ${t.compras} | Ingresos: $${t.ingreso} | ROAS: ${t.roas}x | CPM: $${t.cpm} | CPC: $${t.cpc} | CTR: ${t.ctr}% | Conv: ${t.convRate}% | CPP: $${t.cpp}\n\n3 párrafos: resumen, puntos fuertes/alertas, recomendación. Tono profesional cercano. Sin bullets.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, stream: true, messages: [{ role: "user", content: prompt }] })
    });
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim(); if (data === "[DONE]") break;
        try { const j = JSON.parse(data); if (j.type === "content_block_delta" && j.delta?.text) setReport(r => r + j.delta.text); } catch {}
      }
    }
  } catch (e) { setReport("Error al conectar con la IA. Verifica tu API key en src/config.js"); }
  setLoading(false);
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className="metric" style={highlight ? { borderColor: "rgba(124,58,237,.5)" } : {}}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={highlight ? { color: "var(--accent)" } : {}}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function PeriodFilter({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="filter-bar">
      <div className="period-pills">
        {["7d","mtd","30d","all","custom"].map(p => (
          <button key={p} className={`pill ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>
            {p === "7d" ? "7 días" : p === "mtd" ? "Este mes" : p === "30d" ? "30 días" : p === "all" ? "Todo" : "Rango"}
          </button>
        ))}
      </div>
      {period === "custom" && <>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: "var(--muted)", fontSize: 12 }}>a</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
      </>}
    </div>
  );
}

function MiniChart({ rows, field, color }) {
  if (!rows.length) return null;
  const vals = rows.map(r => Number(r[field]) || 0);
  const max = Math.max(...vals, 1);
  return (
    <div className="chart-bars">
      {vals.map((v, i) => (
        <div key={i} className="bar" style={{ height: `${(v / max) * 100}%`, background: color || "var(--accent)", opacity: 0.75 }} title={`${rows[i].date}: ${v}`} />
      ))}
    </div>
  );
}

// ─── ADD RECORD FORM ──────────────────────────────────────────────────────────
function AddRecordForm({ client, onSave, onCancel }) {
  const isWA = client.niche === "whatsapp";
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, inversion: "", alcance: "", cpm: "", cpc: "", ctr: "", leads: "", contactados: "", ventas: "", ingreso: "", sesiones: "", agregar_carrito: "", compras: "", roas: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function handleSave() {
    const rec = { date: form.date };
    Object.entries(form).forEach(([k, v]) => { if (k !== "date" && v !== "") rec[k] = parseFloat(v) || 0; });
    onSave(rec);
  }
  return (
    <div className="modal-wrap">
      <div className="sec-title" style={{ marginBottom: "1.25rem" }}>Nuevo registro — {client.name}</div>
      <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", margin: "1rem 0 .5rem" }}>Pauta</p>
      <div className="form-row">
        <div className="field"><label>Inversión ($)</label><input type="number" value={form.inversion} onChange={e => f("inversion", e.target.value)} placeholder="0" /></div>
        <div className="field"><label>Alcance</label><input type="number" value={form.alcance} onChange={e => f("alcance", e.target.value)} placeholder="0" /></div>
      </div>
      <div className="form-row3">
        <div className="field"><label>CPM ($)</label><input type="number" value={form.cpm} onChange={e => f("cpm", e.target.value)} placeholder="0.00" /></div>
        <div className="field"><label>CPC ($)</label><input type="number" value={form.cpc} onChange={e => f("cpc", e.target.value)} placeholder="0.00" /></div>
        <div className="field"><label>CTR (%)</label><input type="number" value={form.ctr} onChange={e => f("ctr", e.target.value)} placeholder="0.00" /></div>
      </div>
      {isWA ? <>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", margin: "1rem 0 .5rem" }}>Ventas WhatsApp</p>
        <div className="form-row">
          <div className="field"><label>Leads</label><input type="number" value={form.leads} onChange={e => f("leads", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Contactados</label><input type="number" value={form.contactados} onChange={e => f("contactados", e.target.value)} placeholder="0" /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Ventas cerradas</label><input type="number" value={form.ventas} onChange={e => f("ventas", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Ingresos ($)</label><input type="number" value={form.ingreso} onChange={e => f("ingreso", e.target.value)} placeholder="0" /></div>
        </div>
      </> : <>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", margin: "1rem 0 .5rem" }}>E-commerce</p>
        <div className="form-row">
          <div className="field"><label>Sesiones</label><input type="number" value={form.sesiones} onChange={e => f("sesiones", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Agregar carrito</label><input type="number" value={form.agregar_carrito} onChange={e => f("agregar_carrito", e.target.value)} placeholder="0" /></div>
        </div>
        <div className="form-row3">
          <div className="field"><label>Compras</label><input type="number" value={form.compras} onChange={e => f("compras", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>Ingresos ($)</label><input type="number" value={form.ingreso} onChange={e => f("ingreso", e.target.value)} placeholder="0" /></div>
          <div className="field"><label>ROAS</label><input type="number" value={form.roas} onChange={e => f("roas", e.target.value)} placeholder="0.00" /></div>
        </div>
      </>}
      <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
        <button className="btn btn-primary" onClick={handleSave}>Guardar registro</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── CLIENT FORM ──────────────────────────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel }) {
  const blank = { name: "", username: "", password: "", niche: "whatsapp", color: "#7C3AED", logo: "" };
  const [form, setForm] = useState(initial ? { ...initial } : blank);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-wrap">
      <div className="sec-title" style={{ marginBottom: "1.25rem" }}>{initial ? "Editar cliente" : "Nuevo cliente"}</div>
      <div className="form-row">
        <div className="field"><label>Nombre del negocio</label><input type="text" value={form.name} onChange={e => f("name", e.target.value)} placeholder="Ej: Bella Estética" /></div>
        <div className="field"><label>Iniciales logo</label><input type="text" value={form.logo} onChange={e => f("logo", e.target.value.slice(0,2).toUpperCase())} placeholder="BE" maxLength={2} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Usuario (login)</label><input type="text" value={form.username} onChange={e => f("username", e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="bellastetica" /></div>
        <div className="field"><label>Contraseña</label><input type="text" value={form.password} onChange={e => f("password", e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Nicho</label>
          <select value={form.niche} onChange={e => f("niche", e.target.value)}>
            <option value="whatsapp">Venta por WhatsApp</option>
            <option value="web">Sitio web / E-commerce</option>
          </select>
        </div>
        <div className="field"><label>Color de marca</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={form.color} onChange={e => f("color", e.target.value)} style={{ width: 44, height: 40, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>{form.color}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: "1rem" }}>
        <button className="btn btn-primary" onClick={() => { if (!form.name || !form.username || !form.password) return alert("Completa todos los campos"); onSave(form); }}>
          {initial ? "Guardar cambios" : "Crear cliente"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── ADMIN CLIENT DETAIL ──────────────────────────────────────────────────────
function AdminClientDetail({ client, onBack, onUpdate, apiKey }) {
  const [tab, setTab] = useState("datos");
  const [adding, setAdding] = useState(false);
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);

  const rows = filterByPeriod(client.records || [], period, from, to).sort((a,b) => a.date.localeCompare(b.date));
  const isWA = client.niche === "whatsapp";

  function saveRecord(rec) { onUpdate({ ...client, records: [...(client.records || []), rec] }); setAdding(false); }

  function deleteRecord(row) {
    const idx = (client.records || []).findIndex(r => r === row);
    if (idx === -1) return;
    const newRecs = [...(client.records || [])]; newRecs.splice(idx, 1);
    onUpdate({ ...client, records: newRecs });
  }

  if (adding) return <div className="content"><AddRecordForm client={client} onSave={saveRecord} onCancel={() => setAdding(false)} /></div>;

  return (
    <div className="main">
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
          <div className="avatar" style={{ background: client.color + "22", color: client.color }}>{client.logo}</div>
          <div>
            <div className="topbar-title">{client.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{isWA ? "WhatsApp" : "Sitio web"} · @{client.username}</div>
          </div>
        </div>
        {tab === "datos" && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Nuevo registro</button>}
      </div>
      <div className="content">
        <div className="tab-row">
          {["datos","reporte"].map(t => <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t==="datos"?"Datos y métricas":"Reporte IA"}</button>)}
        </div>
        {tab === "datos" && <>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="card scroll-x">
            <table className="tbl">
              <thead><tr>
                <th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>
                {isWA ? <><th>Leads</th><th>Contactados</th><th>Ventas</th><th>Ingresos</th></> : <><th>Sesiones</th><th>Carrito</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}
                <th></th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={12} style={{ color:"var(--muted)",textAlign:"center",padding:"2rem" }}>Sin registros. Agrega el primero.</td></tr>}
                {rows.map((r,i) => (
                  <tr key={i}>
                    <td style={{ fontFamily:"var(--mono)",fontSize:12 }}>{r.date}</td>
                    <td>${fmt(r.inversion,0)}</td><td>${fmt(r.cpm,2)}</td><td>${fmt(r.cpc,2)}</td><td>{fmt(r.ctr,2)}%</td>
                    {isWA ? <><td>{fmt(r.leads)}</td><td>{fmt(r.contactados)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso,0)}</td></> : <><td>{fmt(r.sesiones)}</td><td>{fmt(r.agregar_carrito)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso,0)}</td><td>{fmt(r.roas,2)}x</td></>}
                    <td><button className="btn btn-danger btn-sm" onClick={()=>{ if(window.confirm("¿Eliminar este registro?")) deleteRecord(r); }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}
        {tab === "reporte" && (
          <div>
            <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
            <button className="btn btn-primary" style={{ marginBottom:"1.25rem" }} disabled={loadingReport||rows.length===0} onClick={()=>generateReport(client,rows,setReport,setLoadingReport,apiKey)}>
              {loadingReport ? "Generando..." : "Generar reporte IA"}
            </button>
            {rows.length===0 && <p style={{color:"var(--red)",fontSize:12}}>Sin datos en el período.</p>}
            {(report||loadingReport) && (
              <div className="ai-report">
                <div className="ai-report-header"><span style={{fontSize:14}}>✦</span> Reporte · {client.name}</div>
                <div className={`ai-report-body ${loadingReport&&!report?"streaming-cursor":""}`}>{report||" "}{loadingReport&&report&&<span className="streaming-cursor"/>}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────
function ClientDashboard({ client, onLogout, apiKey }) {
  const [tab, setTab] = useState("resumen");
  const [period, setPeriod] = useState("mtd");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [report, setReport] = useState(""); const [loadingReport, setLoadingReport] = useState(false);

  const rows = filterByPeriod(client.records || [], period, from, to).sort((a,b) => a.date.localeCompare(b.date));
  const t = buildTotals(client.niche, rows);
  const isWA = client.niche === "whatsapp";

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
            <div><div style={{fontSize:13,fontWeight:500}}>{client.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{isWA?"WhatsApp":"Sitio web"}</div></div>
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
          {tab==="resumen"&&<>
            <div style={{marginBottom:"1.25rem"}}>
              <div style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>Inversión del período</div>
              <div style={{fontSize:32,fontWeight:700,fontFamily:"var(--mono)"}}>${t.inversion||"0"}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{rows.length} días con datos</div>
            </div>
            <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)",marginBottom:10}}>Pauta</p>
            <div className="grid4" style={{marginBottom:"1.25rem"}}>
              <MetricCard label="Alcance" value={t.alcance||"—"}/>
              <MetricCard label="CPM" value={"$"+(t.cpm||"—")}/>
              <MetricCard label="CPC" value={"$"+(t.cpc||"—")}/>
              <MetricCard label="CTR" value={(t.ctr||"—")+"%"}/>
            </div>
            {isWA?<>
              <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)",marginBottom:10}}>Ventas WhatsApp</p>
              <div className="grid4" style={{marginBottom:"1.25rem"}}>
                <MetricCard label="Leads" value={t.leads||"—"}/>
                <MetricCard label="Contactados" value={t.contactados||"—"} sub={"Tasa: "+(t.tasaContacto||"—")+"%"}/>
                <MetricCard label="Ventas" value={t.ventas||"—"} sub={"Cierre: "+(t.tasaCierre||"—")+"%"}/>
                <MetricCard label="Ingresos" value={"$"+(t.ingreso||"0")} highlight/>
              </div>
              <div className="grid3">
                <MetricCard label="Costo por lead" value={"$"+(t.cpl||"—")}/>
                <MetricCard label="Costo por venta" value={"$"+(t.cpv||"—")}/>
                <MetricCard label="ROAS" value={(t.roas||"—")+"x"} highlight/>
              </div>
            </>:<>
              <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"var(--muted)",marginBottom:10}}>E-commerce</p>
              <div className="grid4" style={{marginBottom:"1.25rem"}}>
                <MetricCard label="Sesiones" value={t.sesiones||"—"}/>
                <MetricCard label="Agregar carrito" value={t.agregar_carrito||"—"}/>
                <MetricCard label="Compras" value={t.compras||"—"} sub={"Conv: "+(t.convRate||"—")+"%"}/>
                <MetricCard label="Ingresos" value={"$"+(t.ingreso||"0")} highlight/>
              </div>
              <div className="grid3">
                <MetricCard label="Costo por compra" value={"$"+(t.cpp||"—")}/>
                <MetricCard label="ROAS" value={(t.roas||"—")+"x"} highlight/>
                <MetricCard label="CTR" value={(t.ctr||"—")+"%"}/>
              </div>
            </>}
            {rows.length>1&&<div className="card" style={{marginTop:"1.25rem"}}>
              <div className="card-title">Inversión diaria</div>
              <MiniChart rows={rows} field="inversion" color={client.color}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--muted)",marginTop:6}}>
                <span>{rows[0].date}</span><span>{rows[rows.length-1].date}</span>
              </div>
            </div>}
          </>}
          {tab==="detalle"&&<div className="card scroll-x">
            <div className="card-title">Datos diarios</div>
            <table className="tbl">
              <thead><tr>
                <th>Fecha</th><th>Inversión</th><th>CPM</th><th>CPC</th><th>CTR</th>
                {isWA?<><th>Leads</th><th>Contactados</th><th>Ventas</th><th>Ingresos</th></>:<><th>Sesiones</th><th>Carrito</th><th>Compras</th><th>Ingresos</th><th>ROAS</th></>}
              </tr></thead>
              <tbody>
                {rows.length===0&&<tr><td colSpan={10} style={{color:"var(--muted)",textAlign:"center",padding:"2rem"}}>Sin datos en este período</td></tr>}
                {rows.map((r,i)=><tr key={i}>
                  <td style={{fontFamily:"var(--mono)",fontSize:12}}>{r.date}</td>
                  <td>${fmt(r.inversion,0)}</td><td>${fmt(r.cpm,2)}</td><td>${fmt(r.cpc,2)}</td><td>{fmt(r.ctr,2)}%</td>
                  {isWA?<><td>{fmt(r.leads)}</td><td>{fmt(r.contactados)}</td><td>{fmt(r.ventas)}</td><td>${fmt(r.ingreso,0)}</td></>:<><td>{fmt(r.sesiones)}</td><td>{fmt(r.agregar_carrito)}</td><td>{fmt(r.compras)}</td><td>${fmt(r.ingreso,0)}</td><td>{fmt(r.roas,2)}x</td></>}
                </tr>)}
              </tbody>
            </table>
          </div>}
          {tab==="reporte"&&<div>
            <p style={{color:"var(--muted)",fontSize:13,marginBottom:"1.25rem"}}>Claude analiza tus métricas del período y genera un reporte ejecutivo personalizado.</p>
            <button className="btn btn-primary" disabled={loadingReport||rows.length===0} style={{marginBottom:"1.25rem"}} onClick={()=>generateReport(client,rows,setReport,setLoadingReport,apiKey)}>
              {loadingReport?"Generando...":"Generar reporte IA"}
            </button>
            {rows.length===0&&<p style={{color:"var(--red)",fontSize:12}}>Sin datos en el período seleccionado.</p>}
            {(report||loadingReport)&&<div className="ai-report">
              <div className="ai-report-header"><span style={{fontSize:14}}>✦</span> Reporte · {client.name}</div>
              <div className={`ai-report-body ${loadingReport&&!report?"streaming-cursor":""}`}>{report||" "}{loadingReport&&report&&<span className="streaming-cursor"/>}</div>
            </div>}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ clients, onLogout, onUpdate, onAddClient, onDeleteClient, apiKey }) {
  const [view, setView] = useState("clientes");
  const [selectedId, setSelectedId] = useState(null);
  const [addingClient, setAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const selected = clients.find(c => c.id === selectedId);

  const Sidebar = ({ extra }) => (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-badge">Admin</div>
        <div className="sidebar-logo-name">Jorge Falcones</div>
        <div className="sidebar-logo-role">Trafficker digital</div>
      </div>
      <div className="nav">
        <div className="nav-label">Panel</div>
        <div className={`nav-item ${view==="clientes"&&!selectedId?"active":""}`} onClick={()=>{setSelectedId(null);setView("clientes");setAddingClient(false);setEditingClient(null);}}>
          <div className="nav-dot" style={{background:view==="clientes"&&!selectedId?"var(--accent)":"var(--border)"}}/>Mis clientes
        </div>
        <div className={`nav-item ${view==="resumen"&&!selectedId?"active":""}`} onClick={()=>{setSelectedId(null);setView("resumen");setAddingClient(false);setEditingClient(null);}}>
          <div className="nav-dot" style={{background:view==="resumen"&&!selectedId?"var(--accent)":"var(--border)"}}/>Resumen general
        </div>
        {clients.length>0&&<>
          <div className="nav-label">Clientes</div>
          {clients.map(c=>(
            <div key={c.id} className={`nav-item ${selectedId===c.id?"active":""}`} onClick={()=>{setSelectedId(c.id);setAddingClient(false);setEditingClient(null);}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
            </div>
          ))}
        </>}
        {extra}
      </div>
      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  );

  if (selectedId && selected) return (
    <div className="app">
      <Sidebar extra={<div className="nav-item" onClick={()=>setSelectedId(null)} style={{marginTop:8}}><div className="nav-dot" style={{background:"var(--border)"}}/>← Volver</div>}/>
      <AdminClientDetail client={selected} onBack={()=>setSelectedId(null)} onUpdate={onUpdate} apiKey={apiKey}/>
    </div>
  );

  if (addingClient) return (
    <div className="app">
      <Sidebar/>
      <div className="main">
        <div className="topbar"><div className="topbar-title">Nuevo cliente</div></div>
        <div className="content"><ClientForm onSave={c=>{onAddClient(c);setAddingClient(false);}} onCancel={()=>setAddingClient(false)}/></div>
      </div>
    </div>
  );

  if (editingClient) return (
    <div className="app">
      <Sidebar/>
      <div className="main">
        <div className="topbar"><div className="topbar-title">Editar cliente</div></div>
        <div className="content"><ClientForm initial={editingClient} onSave={c=>{onUpdate({...editingClient,...c});setEditingClient(null);}} onCancel={()=>setEditingClient(null)}/></div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <Sidebar/>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{view==="clientes"?"Mis clientes":"Resumen general"}</div>
          {view==="clientes"&&<button className="btn btn-primary btn-sm" onClick={()=>setAddingClient(true)}>+ Nuevo cliente</button>}
        </div>
        <div className="content">
          {view==="clientes"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"1rem"}}>
              {clients.map(c=>(
                <div key={c.id} className="card" style={{cursor:"pointer",transition:"border-color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=c.color+"88"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div className="avatar" style={{background:c.color+"22",color:c.color}}>{c.logo||c.name.slice(0,2).toUpperCase()}</div>
                      <div><div style={{fontWeight:600,fontSize:14}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>@{c.username}</div></div>
                    </div>
                    <span className={`badge ${c.niche==="whatsapp"?"badge-wa":"badge-web"}`}>{c.niche==="whatsapp"?"WhatsApp":"Web"}</span>
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:12}}>{(c.records||[]).length} registros cargados</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>setSelectedId(c.id)}>Ver métricas</button>
                    <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setEditingClient(c);}}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar este cliente y todos sus datos?"))onDeleteClient(c.id);}}>×</button>
                  </div>
                </div>
              ))}
              {clients.length===0&&<div className="empty"><div style={{fontSize:32,marginBottom:12,opacity:.3}}>◎</div><div>Sin clientes aún. Crea el primero.</div></div>}
            </div>
          )}
          {view==="resumen"&&(
            <div>
              <div className="grid4" style={{marginBottom:"1.25rem"}}>
                <MetricCard label="Total clientes" value={clients.length}/>
                <MetricCard label="WhatsApp" value={clients.filter(c=>c.niche==="whatsapp").length}/>
                <MetricCard label="Sitio web" value={clients.filter(c=>c.niche==="web").length}/>
                <MetricCard label="Registros totales" value={clients.reduce((a,c)=>a+(c.records||[]).length,0)}/>
              </div>
              <div className="card">
                <div className="card-title">Inversión total por cliente</div>
                {clients.length===0&&<div style={{color:"var(--muted)",fontSize:13}}>Sin datos aún.</div>}
                {clients.map(c=>{
                  const total=sum(c.records||[],"inversion");
                  const maxInv=Math.max(...clients.map(cc=>sum(cc.records||[],"inversion")),1);
                  return(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:100,fontSize:12,color:"var(--muted)",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                      <div style={{flex:1,background:"var(--surface2)",borderRadius:4,height:8,overflow:"hidden"}}>
                        <div style={{width:`${(total/maxInv)*100}%`,height:"100%",background:c.color,borderRadius:4,transition:"width .3s"}}/>
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
        <div className="field"><label>Contraseña</label><input type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="••••••••"/></div>
        {err&&<div className="err">{err}</div>}
        <button className="btn btn-primary btn-full" style={{marginTop:"1rem"}} onClick={attempt}>Entrar</button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState(() => S.get("trafficker_clients_v2") || SEED_CLIENTS);

  function saveClients(c) { setClients(c); S.set("trafficker_clients_v2", c); }

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
      {!session && <LoginScreen onLogin={handleLogin} />}
      {session?.role === "admin" && (
        <AdminPanel clients={clients} onLogout={()=>setSession(null)} onUpdate={updateClient} onAddClient={addClient} onDeleteClient={deleteClient} apiKey={API_KEY}/>
      )}
      {session?.role === "client" && (() => {
        const client = clients.find(c => c.id === session.clientId);
        if (!client) { setSession(null); return null; }
        return <ClientDashboard client={client} onLogout={()=>setSession(null)} apiKey={API_KEY}/>;
      })()}
    </>
  );
}
