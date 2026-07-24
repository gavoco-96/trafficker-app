// Trafficker Pro — paneles de TikTok Ads
// Configuracion de cuentas y panel de metricas por nivel.
// Reutiliza TablaMetricasFB y SaludFBBadge de MetricasPanels.
// Extraído de App.jsx (Fase 3 de modularización)

import { useState, useEffect } from "react";
import { fmtNum, localDateStr } from "../lib/utils.js";
import {
  getCuentasTT, getCuentasTTActivas, getTokenTT, ttListo,
  ttFetch, fetchMetricasTTPorNivel,
} from "../lib/api-tiktok.js";
import {
  TablaMetricasFB, SaludFBBadge, BarraCarga, BotonCarga, SkeletonTabla,
} from "./MetricasPanels.jsx";

// ─── PANEL DE CONFIGURACIÓN DE TIKTOK ADS ─────────────────────────────────
export function TikTokConfigPanel({ client, onUpdate, show }) {
  const ttConfig = client.ttConfig || {};
  const [token, setToken] = useState(ttConfig.token || "");
  const [cuentas, setCuentas] = useState(() => {
    const c = getCuentasTT(client);
    return c.length ? c : [{ id: 1, nombre: "", advertiserId: "" }];
  });
  const [saving, setSaving] = useState(false);
  const [verify, setVerify] = useState(null);
  const [showGuia, setShowGuia] = useState(false);

  function addCuenta() { setCuentas(p => [...p, { id: Date.now(), nombre: "", advertiserId: "" }]); }
  function removeCuenta(id) { setCuentas(p => p.filter(c => c.id !== id)); }
  function updateCuenta(id, campo, val) { setCuentas(p => p.map(c => c.id === id ? { ...c, [campo]: val } : c)); }

  async function guardar() {
    setSaving(true);
    const limpias = cuentas
      .map((c, i) => ({ id: c.id ?? (i + 1), nombre: (c.nombre || "").trim() || `Cuenta ${i + 1}`, advertiserId: String(c.advertiserId || "").trim() }))
      .filter(c => c.advertiserId);
    await onUpdate({ ...client, ttConfig: { ...ttConfig, token: token.trim(), cuentas: limpias, savedAt: new Date().toISOString() } });
    show?.("✓ Configuración de TikTok guardada", "ok");
    setSaving(false);
  }

  async function verificarToken() {
    if (!token.trim()) { show?.("Ingresa el token primero", "err"); return; }
    const primera = cuentas.find(c => c.advertiserId);
    if (!primera) { show?.("Agrega al menos un Advertiser ID", "err"); return; }
    setVerify("loading");
    const r = await ttFetch("/advertiser/info/", { advertiser_ids: [primera.advertiserId] }, token.trim());
    if (r.ok) {
      const info = r.data?.list?.[0];
      setVerify({ ok: true, nombre: info?.name || "Cuenta verificada", moneda: info?.currency });
    } else {
      setVerify({ ok: false, error: r.error?.message || "Token inválido" });
    }
  }

  return (
    <>
      {/* Token */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>🎵 Conexión con TikTok Ads</div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShowGuia(v => !v)}>
            {showGuia ? "Ocultar guía" : "❓ ¿Cómo obtengo el acceso?"}
          </button>
        </div>

        {showGuia && (
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--amber)" }}>Cómo conseguir el Access Token de TikTok</div>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li>Entra a <b>business-api.tiktok.com</b> e inicia sesión con tu cuenta de TikTok Business.</li>
              <li>Ve a <b>My Apps → Create an App</b>. Llena nombre, descripción y una URL de redirección (puede ser la de tu app).</li>
              <li>En <b>Scope of Permission</b> marca al menos: <i>Ad Account Management</i>, <i>Reporting</i>, <i>Campaign Management (lectura)</i>.</li>
              <li>Envía la app a revisión. TikTok suele aprobarla en 1-3 días hábiles.</li>
              <li>Una vez aprobada, usa el flujo de autorización para generar el <b>Access Token</b> de larga duración.</li>
              <li>El <b>Advertiser ID</b> lo encuentras en TikTok Ads Manager, arriba a la derecha junto al nombre de la cuenta.</li>
            </ol>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
              A diferencia de Meta, TikTok exige que la app pase revisión antes de dar acceso a datos reales. Mientras tanto puedes usar el modo sandbox para probar la integración.
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Access Token de TikTok</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={token} onChange={e => setToken(e.target.value)}
            placeholder="Pega aquí el Access Token de TikTok Business" style={{ flex: 1, fontSize: 12, fontFamily: "var(--mono)" }} />
          <button className="btn btn-ghost btn-sm" onClick={verificarToken} disabled={verify === "loading"}>
            {verify === "loading" ? "⟳" : "🔍"} Verificar
          </button>
        </div>
        {verify && verify !== "loading" && (
          <div style={{ marginTop: 8, fontSize: 12, color: verify.ok ? "var(--green)" : "var(--red)" }}>
            {verify.ok ? `✓ Conectado: ${verify.nombre}${verify.moneda ? ` (${verify.moneda})` : ""}` : `✕ ${verify.error}`}
          </div>
        )}
      </div>

      {/* Cuentas */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>📊 Cuentas de anunciante TikTok</div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={addCuenta}>+ Agregar cuenta</button>
        </div>
        {cuentas.map(c => (
          <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>Nombre de la cuenta</div>
              <input type="text" value={c.nombre} onChange={e => updateCuenta(c.id, "nombre", e.target.value)}
                placeholder="Ej: Ecuador TikTok" style={{ width: "100%", fontSize: 12 }} />
            </div>
            <div style={{ flex: 1.4 }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>Advertiser ID</div>
              <input type="text" value={c.advertiserId} onChange={e => updateCuenta(c.id, "advertiserId", e.target.value)}
                placeholder="Ej: 7012345678901234567" style={{ width: "100%", fontSize: 12, fontFamily: "var(--mono)" }} />
            </div>
            {cuentas.length > 1 && (
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => removeCuenta(c.id)}>×</button>
            )}
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          💡 Al consultar, los datos de todas las cuentas se consolidan. También puedes filtrar por cuenta en cada vista.
        </div>
      </div>

      <button className="btn btn-green btn-sm" disabled={saving} onClick={guardar}>
        {saving ? "Guardando..." : "💾 Guardar configuración"}
      </button>
    </>
  );
}

// ─── PANEL DE MÉTRICAS TIKTOK (espejo del de Facebook) ────────────────────
export function TikTokMetricasPanel({ client, onUpdate }) {
  const token = getTokenTT(client);
  const cuentas = getCuentasTTActivas(client);
  const hayConfig = ttListo(client);

  const [nivel, setNivel] = useState("campaign");
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return localDateStr(d); });
  const [hasta, setHasta] = useState(localDateStr());
  const [preset, setPreset] = useState("30d");
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salud, setSalud] = useState(null);
  const [datos, setDatos] = useState({ campaign: null, adgroup: null, ad: null });
  const [cuentaFiltro, setCuentaFiltro] = useState("todas");
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsTSV, setSheetsTSV] = useState("");
  const [sheetsCopiado, setSheetsCopiado] = useState(false);

  const NIVELES = [["campaign", "📡 Campañas"], ["adgroup", "🎯 Grupos"], ["ad", "🖼️ Anuncios"]];

  function aplicarPreset(p) {
    setPreset(p);
    const hoy = new Date(); let d = new Date();
    if (p === "hoy") d = hoy;
    else if (p === "7d") d.setDate(d.getDate() - 6);
    else if (p === "30d") d.setDate(d.getDate() - 29);
    else if (p === "90d") d.setDate(d.getDate() - 89);
    if (p !== "custom") { setDesde(localDateStr(d)); setHasta(localDateStr(hoy)); }
  }

  async function cargar(n = nivel, forzar = false) {
    if (!hayConfig) { setError("Configura TikTok Ads abajo para activar esta vista."); return; }
    if (!forzar && datos[n]) return;
    setLoading(true); setError(null);
    const r = await fetchMetricasTTPorNivel(token, cuentas, desde, hasta, n, soloActivas);
    setSalud(r.salud);
    if (!r.ok) { setError(r.error || r.salud?.mensaje || "Error al consultar TikTok"); setLoading(false); return; }
    setDatos(prev => ({ ...prev, [n]: r.campanas }));
    setLoading(false);
  }
  function recargarTodo() {
    setDatos({ campaign: null, adgroup: null, ad: null });
    setLoading(true);
    (async () => {
      const r = await fetchMetricasTTPorNivel(token, cuentas, desde, hasta, nivel, soloActivas);
      setSalud(r.salud);
      if (!r.ok) { setError(r.error || r.salud?.mensaje); setLoading(false); return; }
      setDatos({ campaign: null, adgroup: null, ad: null, [nivel]: r.campanas });
      setError(null); setLoading(false);
    })();
  }
  useEffect(() => { if (hayConfig) cargar("campaign"); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (hayConfig) cargar(nivel); /* eslint-disable-next-line */ }, [nivel]);

  const filasRaw = datos[nivel] || [];
  const filas = filasRaw
    .filter(c => cuentaFiltro === "todas" || c.cuenta === cuentaFiltro)
    .filter(c => !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.padre || "").toLowerCase().includes(busqueda.toLowerCase()));
  const totalInv = filas.reduce((s, c) => s + c.inv, 0);
  const totalLeads = filas.reduce((s, c) => s + c.leads, 0);
  const cplGlobal = totalLeads > 0 ? totalInv / totalLeads : 0;

  function construirTSV() {
    const cab = ["Nombre", nivel === "campaign" ? null : "Pertenece a", "Registros", "Monto gastado", "CPL", "CTR", "CPM"].filter(Boolean);
    const f = [cab];
    filas.forEach(c => {
      const row = [c.nombre];
      if (nivel !== "campaign") row.push(c.padre || "");
      row.push(Math.round(c.leads), c.inv.toFixed(2), c.cpl > 0 ? c.cpl.toFixed(2) : "", c.ctr.toFixed(2) + "%", c.cpm.toFixed(2));
      f.push(row);
    });
    return f.map(r => r.join("\t")).join("\n");
  }
  function exportarCSV() {
    const csv = construirTSV().split("\n").map(l => l.split("\t").map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nivelN = { campaign: "campanas", adgroup: "grupos", ad: "anuncios" }[nivel];
    a.href = url; a.download = `tiktok_${nivelN}_${(client.name || "cliente").replace(/[^a-z0-9]/gi, "_")}_${desde}_${hasta}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🎵 Rendimiento TikTok Ads</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Datos reales de TikTok — identifica lo ganador para escalar</div>
        </div>
        <SaludFBBadge salud={salud} />
      </div>

      {/* Niveles + cuenta */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12, justifyContent: "space-between" }}>
        <div className="period-pills">
          {NIVELES.map(([k, l]) => (
            <button key={k} className={"pill " + (nivel === k ? "active" : "")} onClick={() => setNivel(k)}>{l}</button>
          ))}
        </div>
        {cuentas.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Cuenta:</span>
            <select value={cuentaFiltro} onChange={e => setCuentaFiltro(e.target.value)} style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}>
              <option value="todas">Todas ({cuentas.length}) — consolidado</option>
              {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Rango */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div className="period-pills">
          {[["hoy", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["90d", "90 días"]].map(([k, l]) => (
            <button key={k} className={"pill " + (preset === k ? "active" : "")} onClick={() => { aplicarPreset(k); setTimeout(recargarTodo, 0); }}>{l}</button>
          ))}
        </div>
        <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPreset("custom"); }} max={hasta} style={{ width: "auto", fontSize: 12 }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>→</span>
        <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPreset("custom"); }} max={localDateStr()} style={{ width: "auto", fontSize: 12 }} />
        <BotonCarga cargando={loading} onClick={recargarTodo} disabled={!hayConfig}
          textoCargando="Consultando...">🔄 Actualizar</BotonCarga>
      </div>

      {/* Filtros + export */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 260 }}>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..." style={{ width: "100%", paddingLeft: 30, fontSize: 12 }} />
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>🔍</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={soloActivas} onChange={e => { setSoloActivas(e.target.checked); setTimeout(recargarTodo, 0); }} style={{ width: "auto", margin: 0 }} />
            Solo activos
          </label>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportarCSV} disabled={!filas.length} style={{ fontSize: 11 }}>📥 CSV</button>
          <button className="btn btn-ghost btn-sm" disabled={!filas.length} style={{ fontSize: 11 }}
            onClick={() => { setSheetsTSV(construirTSV()); setShowSheetsModal(true); setSheetsCopiado(false); }}>📊 Sheets</button>
        </div>
      </div>

      {error && <div className="card" style={{ padding: "12px 14px", marginBottom: 12, borderColor: "var(--red)", color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {/* Refrescando con datos ya en pantalla */}
      <BarraCarga activo={loading && filasRaw.length > 0} texto="Actualizando datos..." />

      {!hayConfig ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Configura tu cuenta de TikTok Ads abajo para ver las métricas.
        </div>
      ) : loading && !filasRaw.length ? (
        <div>
          <BarraCarga activo texto="Consultando TikTok Ads..." />
          <SkeletonTabla filas={7} columnas={6} />
        </div>
      ) : filas.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Sin datos en el rango seleccionado.</div>
      ) : (
        <TablaMetricasFB filas={filas} cplGlobal={cplGlobal} mostrarPadre={nivel !== "campaign"}
          mostrarCuenta={cuentas.length > 1 && cuentaFiltro === "todas"} />
      )}

      {/* Modal Sheets */}
      {showSheetsModal && (
        <div onClick={() => setShowSheetsModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: "100%", padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Exportar a Google Sheets</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSheetsModal(false)}>×</button>
            </div>
            <ol style={{ fontSize: 13, paddingLeft: 20, margin: "0 0 14px", lineHeight: 1.8 }}>
              <li>Presiona <strong>Copiar datos</strong>.</li>
              <li>Presiona <strong>Abrir Google Sheets</strong>.</li>
              <li>Clic en <strong>A1</strong> y pega con <strong>Ctrl+V</strong>.</li>
            </ol>
            <textarea readOnly value={sheetsTSV} onClick={e => e.target.select()}
              style={{ width: "100%", height: 110, fontSize: 10, fontFamily: "var(--mono)", resize: "none", marginBottom: 14, background: "var(--surface2)" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={async () => {
                let ok = false;
                try { await navigator.clipboard.writeText(sheetsTSV); ok = true; }
                catch {
                  try {
                    const ta = document.createElement("textarea");
                    ta.value = sheetsTSV; ta.style.position = "fixed"; ta.style.opacity = "0";
                    document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy");
                    document.body.removeChild(ta);
                  } catch {}
                }
                setSheetsCopiado(ok);
              }}>{sheetsCopiado ? "✓ Copiado" : "📋 Copiar datos"}</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => window.open("https://sheets.new", "_blank")}>📊 Abrir Sheets</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
