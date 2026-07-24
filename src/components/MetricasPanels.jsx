// Trafficker Pro — paneles de metricas de Meta Ads
// Tabla reutilizable por nivel, panel de campanas/conjuntos/anuncios,
// comparativa de CPL por dia y panel de presupuesto por pais y cuenta.
// Extraído de App.jsx (Fase 3 de modularización)

import { useState, useEffect, useRef } from "react";
import { fmtNum, localDateStr, getCuentasFBActivas, getTokenFB, fbListo } from "../lib/utils.js";
import {
  PAISES_INFO, paisNombre, paisBandera, fetchMetricasPorNivel,
  fetchGastoPorPais, fetchPresupuestoPorPais,
  fetchBitacoraFB, describirEventoFB,
} from "../lib/api-facebook.js";

// ─── INDICADORES DE CARGA (reutilizables) ─────────────────────────────────────
// El usuario necesita saber si la app esta consultando o ya termino.

// Barra delgada que aparece sobre el contenido mientras se consulta.
// Ocupa altura fija para que la vista no salte al aparecer/desaparecer.
export function BarraCarga({ activo, texto }) {
  return (
    <div style={{ height: activo ? "auto" : 0, overflow: "hidden", transition: "height .2s" }}>
      {activo && (
        <div style={{ marginBottom: 10 }}>
          <div className="load-bar" />
          {texto && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5, display: "flex", alignItems: "center" }}>
              <span className="load-dot" />{texto}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Boton que muestra spinner y cambia de texto mientras trabaja.
export function BotonCarga({ cargando, onClick, disabled, children, textoCargando, className, style }) {
  return (
    <button
      className={className || "btn btn-primary btn-sm"}
      onClick={onClick}
      disabled={disabled || cargando}
      style={{ ...style, opacity: cargando ? .85 : 1, cursor: cargando ? "wait" : undefined }}>
      {cargando ? (<><span className="spin-sm" />{textoCargando || "Consultando..."}</>) : children}
    </button>
  );
}

// Placeholder con forma de tabla mientras llegan los datos.
// Da sensacion de progreso, en vez de una pantalla vacia.
export function SkeletonTabla({ filas = 6, columnas = 5 }) {
  return (
    <div style={{ padding: "4px 0" }}>
      {/* Cabecera */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        {Array.from({ length: columnas }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 11, flex: i === 0 ? 2.5 : 1 }} />
        ))}
      </div>
      {/* Filas */}
      {Array.from({ length: filas }, (_, r) => (
        <div key={r} style={{ display: "flex", gap: 10, marginBottom: 8, opacity: 1 - r * 0.11 }}>
          {Array.from({ length: columnas }, (_, c) => (
            <div key={c} className="skeleton" style={{ height: 13, flex: c === 0 ? 2.5 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Placeholder con forma de grafica.
export function SkeletonGrafica({ alto = 130 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: alto, padding: "8px 0" }}>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} className="skeleton"
          style={{ flex: 1, height: `${35 + Math.sin(i / 2.5) * 25 + (i % 3) * 8}%`, borderRadius: "3px 3px 0 0" }} />
      ))}
    </div>
  );
}

// ─── TABLA REUTILIZABLE DE MÉTRICAS FB (sirve para campañas/conjuntos/anuncios) ─
// Ordenamiento asc/desc por cualquier columna, scroll propio, resaltado de CPL.
export function TablaMetricasFB({ filas, cplGlobal, mostrarPadre, mostrarCuenta, padreLabel, maxHeight = 440 }) {
  const [sortCol, setSortCol] = useState("inv");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const sorted = [...filas].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol];
    const cmp = typeof va === "number" ? va - vb : String(va || "").localeCompare(String(vb || ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const fmt = (n) => "$" + fmtNum(n, 2);
  const Th = ({ col, label, num }) => (
    <th onClick={() => handleSort(col)}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: num ? "right" : "left",
        position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
      {label} {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : <span style={{ opacity: .4 }}>⇅</span>}
    </th>
  );

  const estadoDot = (estado) => {
    const activo = estado === "ACTIVE";
    const pausado = estado === "PAUSED" || estado === "ADSET_PAUSED" || estado === "CAMPAIGN_PAUSED" || estado === "AD_PAUSED";
    const color = activo ? "var(--green)" : pausado ? "var(--amber)" : "var(--muted)";
    const titulo = activo ? "Activo" : pausado ? "Pausado" : "Inactivo/Archivado";
    return <span title={titulo} style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: color, marginRight: 7, flexShrink: 0 }} />;
  };

  const totales = sorted.reduce((a, c) => ({
    inv: a.inv + c.inv, leads: a.leads + c.leads, impr: a.impr + c.impr, clicks: a.clicks + c.clicks
  }), { inv: 0, leads: 0, impr: 0, clicks: 0 });
  const cplTot = totales.leads > 0 ? totales.inv / totales.leads : 0;

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight, border: "1px solid var(--border)", borderRadius: 10 }}>
      <table className="tbl" style={{ width: "100%", fontSize: 12, minWidth: 720 }}>
        <thead>
          <tr>
            <Th col="nombre" label="Nombre" />
            <Th col="leads" label="Registros" num />
            <Th col="inv" label="Monto gastado" num />
            <Th col="cpl" label="CPL" num />
            <Th col="ctr" label="CTR" num />
            <Th col="cpm" label="CPM" num />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={c.id + "_" + i}>
              <td style={{ maxWidth: 320 }}>
                <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                  {estadoDot(c.estado)}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }} title={c.nombre}>{c.nombre}</div>
                    {mostrarPadre && c.padre && <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>↳ {c.padre}</div>}
                    {mostrarCuenta && c.cuenta && <div style={{ fontSize: 9, color: "var(--accent)", opacity: .8 }}>🏢 {c.cuenta}</div>}
                  </div>
                </div>
              </td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtNum(c.leads, 0)}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700 }}>{fmt(c.inv)}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700,
                color: c.cpl > 0 && cplGlobal > 0 ? (c.cpl <= cplGlobal ? "var(--green)" : "var(--red)") : "var(--text)" }}>
                {c.cpl > 0 ? fmt(c.cpl) : "—"}
              </td>
              <td style={{ textAlign: "right" }}>{fmtNum(c.ctr, 2)}%</td>
              <td style={{ textAlign: "right" }}>{fmt(c.cpm)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)", position: "sticky", bottom: 0, background: "var(--surface)" }}>
            <td>TOTAL ({sorted.length})</td>
            <td style={{ textAlign: "right" }}>{fmtNum(totales.leads, 0)}</td>
            <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{fmt(totales.inv)}</td>
            <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{cplTot > 0 ? fmt(cplTot) : "—"}</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── PANEL DE RENDIMIENTO FB: Campañas / Conjuntos / Anuncios ─────────────────
export function CampanasFBPanel({ client, onUpdate }) {
  // Fuente única de verdad para las cuentas (soporta multicuenta y formato viejo)
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  const hayConfig = fbListo(client);

  const [nivel, setNivel] = useState("campaign"); // campaign | adset | ad
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return localDateStr(d); });
  const [hasta, setHasta] = useState(localDateStr());
  const [preset, setPreset] = useState("30d");
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(true); // por defecto solo activos = consulta más rápida
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salud, setSalud] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoMsg, setGuardadoMsg] = useState(null);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsTSV, setSheetsTSV] = useState("");
  const [sheetsCopiado, setSheetsCopiado] = useState(false);

  // Cache por nivel para no re-consultar al cambiar de tab
  const [datos, setDatos] = useState({ campaign: null, adset: null, ad: null });

  // Filtro por cuenta (multicuenta): "todas" = consolidado, o el id de una cuenta
  const [cuentaFiltro, setCuentaFiltro] = useState("todas");

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
    if (!hayConfig) { setError("Configura Facebook Ads en la tab 📘 Facebook primero."); return; }
    if (!forzar && datos[n]) return; // ya en cache
    setLoading(true); setError(null);
    const r = await fetchMetricasPorNivel(token, cuentas, desde, hasta, n, soloActivas);
    setSalud(r.salud);
    persistirSalud(r.salud);
    if (!r.ok) { setError(r.error || r.salud?.mensaje || "Error al consultar Facebook"); setLoading(false); return; }
    setDatos(prev => ({ ...prev, [n]: r.campanas }));
    setLoading(false);
  }

  // Guarda el último estado de salud en el cliente (para la campana de notificaciones).
  // Solo persiste cambios significativos para no escribir en cada consulta.
  function persistirSalud(s) {
    if (!s || !onUpdate) return;
    const prev = client.fbSaludUltima?.estado;
    if (prev === s.estado) return; // sin cambio
    const nuevo = { estado: s.estado, mensaje: s.mensaje, ts: s.ts || Date.now() };
    client.fbSaludUltima = nuevo;
    onUpdate({ ...client, fbSaludUltima: nuevo });
  }

  // Al cambiar rango, invalidar cache y recargar el nivel actual
  function recargarTodo() {
    setDatos({ campaign: null, adset: null, ad: null });
    setLoading(true);
    (async () => {
      const r = await fetchMetricasPorNivel(token, cuentas, desde, hasta, nivel, soloActivas);
      setSalud(r.salud);
      persistirSalud(r.salud);
      if (!r.ok) { setError(r.error || r.salud?.mensaje); setLoading(false); return; }
      setDatos({ campaign: null, adset: null, ad: null, [nivel]: r.campanas });
      setError(null); setLoading(false);
    })();
  }

  useEffect(() => { if (hayConfig) cargar("campaign"); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (hayConfig) cargar(nivel); /* eslint-disable-next-line */ }, [nivel]);

  const NIVELES = [
    ["campaign", "📡 Campañas"],
    ["adset", "🎯 Conjuntos"],
    ["ad", "🖼️ Anuncios"],
  ];

  const filasRaw = datos[nivel] || [];
  const filas = filasRaw
    .filter(c => cuentaFiltro === "todas" || c.cuenta === cuentaFiltro)
    .filter(c => !soloActivas || c.estado === "ACTIVE")
    .filter(c => !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.padre || "").toLowerCase().includes(busqueda.toLowerCase()));
  const totalInv = filas.reduce((s, c) => s + c.inv, 0);
  const totalLeads = filas.reduce((s, c) => s + c.leads, 0);
  const cplGlobal = totalLeads > 0 ? totalInv / totalLeads : 0;

  // ── Exportar CSV ──
  function exportarCSV() {
    const cab = ["Nombre", nivel === "campaign" ? "" : "Pertenece a", "Estado", "Registros", "Monto gastado", "CPL", "CTR", "CPM"].filter(Boolean);
    const filasCSV = [cab];
    filas.forEach(c => {
      const row = [c.nombre];
      if (nivel !== "campaign") row.push(c.padre || "");
      row.push(c.estado, Math.round(c.leads), c.inv.toFixed(2), c.cpl > 0 ? c.cpl.toFixed(2) : "", c.ctr.toFixed(2) + "%", c.cpm.toFixed(2));
      filasCSV.push(row);
    });
    const csv = filasCSV.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nivelN = { campaign: "campanas", adset: "conjuntos", ad: "anuncios" }[nivel];
    a.href = url; a.download = `${nivelN}_${(client.nombre || "cliente").replace(/[^a-z0-9]/gi, "_")}_${desde}_${hasta}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Exportar a Google Sheets (abre un Sheet nuevo con los datos vía URL) ──
  // Construye el TSV de las filas actuales (para copiar a Sheets)
  function construirTSV() {
    const cab = ["Nombre", nivel === "campaign" ? null : "Pertenece a", "Estado", "Registros", "Monto gastado", "CPL", "CTR", "CPM"].filter(Boolean);
    const filasT = [cab];
    filas.forEach(c => {
      const row = [c.nombre];
      if (nivel !== "campaign") row.push(c.padre || "");
      row.push(c.estado, Math.round(c.leads), c.inv.toFixed(2), c.cpl > 0 ? c.cpl.toFixed(2) : "", c.ctr.toFixed(2) + "%", c.cpm.toFixed(2));
      filasT.push(row);
    });
    return filasT.map(f => f.join("\t")).join("\n");
  }

  // Abre el modal de exportación a Sheets (copia confiable con clic directo)
  function exportarGoogleSheets() {
    setSheetsTSV(construirTSV());
    setShowSheetsModal(true);
  }

  // ── Guardar snapshot para histórico/predicción ──
  async function guardarSnapshot() {
    if (!onUpdate || !filasRaw.length) return;
    setGuardando(true);
    const hoy = localDateStr();
    const snapshots = { ...(client.fbSnapshots || {}) };
    // Estructura: fbSnapshots[fecha][nivel] = [filas ligeras]
    if (!snapshots[hoy]) snapshots[hoy] = {};
    snapshots[hoy][nivel] = filasRaw.map(c => ({
      id: c.id, nombre: c.nombre, padre: c.padre, cuenta: c.cuenta,
      inv: +c.inv.toFixed(2), leads: Math.round(c.leads), cpl: +c.cpl.toFixed(4),
      ctr: +c.ctr.toFixed(3), cpm: +c.cpm.toFixed(3), impr: Math.round(c.impr),
      clicks: Math.round(c.clicks), reach: Math.round(c.reach), frequency: +c.frequency.toFixed(2),
      estado: c.estado,
    }));
    snapshots[hoy]._meta = { desde, hasta, ts: Date.now() };
    // Retención: 180 días
    const limite = new Date(); limite.setDate(limite.getDate() - 180);
    const limStr = localDateStr(limite);
    Object.keys(snapshots).forEach(k => { if (k < limStr) delete snapshots[k]; });
    const r = await onUpdate({ ...client, fbSnapshots: snapshots });
    client.fbSnapshots = snapshots;
    setGuardando(false);
    setGuardadoMsg(`💾 Snapshot de ${NIVELES.find(n => n[0] === nivel)[1]} guardado (${filasRaw.length} filas)`);
    setTimeout(() => setGuardadoMsg(null), 5000);
  }

  const nDias = Object.keys(client.fbSnapshots || {}).length;

  return (
    <div>
      {/* Header con salud de conexión */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Rendimiento por nivel</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Datos reales de Facebook — identifica lo ganador para escalar</div>
        </div>
        <SaludFBBadge salud={salud} />
      </div>

      {/* Sub-tabs de nivel + selector de cuenta (multicuenta) */}
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
              {cuentas.map(c => <option key={c.id || c.adAccountId} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Controles de rango */}
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

      {/* Filtros + acciones */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 260 }}>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder={nivel === "adset" ? "Buscar conjunto o público..." : nivel === "ad" ? "Buscar anuncio..." : "Buscar campaña..."}
              style={{ width: "100%", paddingLeft: 30, fontSize: 12 }} />
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>🔍</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={soloActivas} onChange={e => { setSoloActivas(e.target.checked); setTimeout(recargarTodo, 0); }} style={{ width: "auto", margin: 0 }} />
            Solo activos
          </label>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={guardarSnapshot} disabled={guardando || !filasRaw.length} style={{ fontSize: 11 }}>
            {guardando ? "⟳" : "💾"} Guardar snapshot {nDias > 0 && <span style={{ color: "var(--muted)" }}>({nDias}d)</span>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportarCSV} disabled={!filas.length} style={{ fontSize: 11 }}>📥 CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={exportarGoogleSheets} disabled={!filas.length} style={{ fontSize: 11 }}>📊 Sheets</button>
        </div>
      </div>

      {guardadoMsg && <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 10, padding: "6px 12px", background: "rgba(16,185,129,.08)", borderRadius: 8 }}>{guardadoMsg}</div>}
      {error && <div className="card" style={{ padding: "12px 14px", marginBottom: 12, borderColor: "var(--red)", color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {/* Refrescando con datos ya en pantalla */}
      <BarraCarga activo={loading && filasRaw.length > 0} texto="Actualizando datos..." />

      {/* Tabla */}
      {!hayConfig ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Configura Facebook Ads en la tab 📘 Facebook para activar esta vista.</div>
      ) : loading && !filasRaw.length ? (
        <div>
          <BarraCarga activo texto={`Consultando ${nivel === "campaign" ? "campañas" : nivel === "adset" ? "conjuntos" : "anuncios"} en Facebook...`} />
          <SkeletonTabla filas={7} columnas={6} />
        </div>
      ) : filas.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Sin datos en el rango seleccionado.</div>
      ) : (
        <TablaMetricasFB filas={filas} cplGlobal={cplGlobal} mostrarPadre={nivel !== "campaign"}
          mostrarCuenta={cuentas.length > 1 && cuentaFiltro === "todas"}
          padreLabel={nivel === "adset" ? "Campaña" : "Conjunto"} />
      )}

      {/* Modal de exportación a Google Sheets — copia confiable con clic directo */}
      {showSheetsModal && (
        <div onClick={() => { setShowSheetsModal(false); setSheetsCopiado(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="card"
            style={{ maxWidth: 560, width: "100%", padding: "20px 22px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Exportar a Google Sheets</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowSheetsModal(false); setSheetsCopiado(false); }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              {filas.length} filas listas. Sigue estos 3 pasos:
            </div>
            <ol style={{ fontSize: 13, paddingLeft: 20, margin: "0 0 14px", lineHeight: 1.8 }}>
              <li>Presiona <strong>Copiar datos</strong> abajo.</li>
              <li>Presiona <strong>Abrir Google Sheets</strong> (se abre una hoja nueva).</li>
              <li>Haz clic en la celda <strong>A1</strong> y pega con <strong>Ctrl+V</strong> (o Cmd+V en Mac).</li>
            </ol>
            <textarea readOnly value={sheetsTSV}
              style={{ width: "100%", height: 120, fontSize: 10, fontFamily: "var(--mono)", resize: "none", marginBottom: 14, background: "var(--surface2)" }}
              onClick={e => e.target.select()} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, minWidth: 130 }}
                onClick={async () => {
                  let ok = false;
                  try { await navigator.clipboard.writeText(sheetsTSV); ok = true; }
                  catch {
                    try {
                      const ta = document.createElement("textarea");
                      ta.value = sheetsTSV; ta.style.position = "fixed"; ta.style.opacity = "0";
                      document.body.appendChild(ta); ta.focus(); ta.select();
                      ok = document.execCommand("copy"); document.body.removeChild(ta);
                    } catch {}
                  }
                  setSheetsCopiado(ok);
                }}>
                {sheetsCopiado ? "✓ Copiado" : "📋 Copiar datos"}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, minWidth: 130 }}
                onClick={() => window.open("https://sheets.new", "_blank")}>
                📊 Abrir Google Sheets
              </button>
              <button className="btn btn-ghost btn-sm" style={{ minWidth: 100 }}
                onClick={() => { exportarCSV(); }}>
                📥 O bajar CSV
              </button>
            </div>
            {sheetsCopiado && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 10 }}>✓ Datos en el portapapeles. Ahora abre Sheets y pega en A1.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BADGE DE SALUD DE CONEXIÓN FACEBOOK ──────────────────────────────────────
export function SaludFBBadge({ salud }) {
  if (!salud) return null;
  const map = {
    ok: { c: "var(--green)", bg: "rgba(16,185,129,.12)", icon: "●", txt: "Facebook conectado" },
    sin_datos: { c: "var(--muted)", bg: "var(--surface2)", icon: "○", txt: "Sin datos en rango" },
    token_expirado: { c: "var(--red)", bg: "rgba(239,68,68,.12)", icon: "⚠", txt: "Token expirado" },
    permisos: { c: "var(--red)", bg: "rgba(239,68,68,.12)", icon: "⚠", txt: "Faltan permisos" },
    rate_limit: { c: "var(--amber)", bg: "rgba(255,222,89,.1)", icon: "⏳", txt: "Límite temporal" },
    red: { c: "var(--red)", bg: "rgba(239,68,68,.12)", icon: "⚠", txt: "Error de red" },
    error: { c: "var(--red)", bg: "rgba(239,68,68,.12)", icon: "⚠", txt: "Error FB" },
    sin_config: { c: "var(--muted)", bg: "var(--surface2)", icon: "○", txt: "Sin configurar" },
  };
  const s = map[salud.estado] || map.error;
  return (
    <div title={salud.mensaje} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 10px",
      borderRadius: 12, color: s.c, background: s.bg, fontWeight: 600, cursor: "help" }}>
      <span>{s.icon}</span> {s.txt}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARATIVA DE CPL POR DÍA — tablas y gráficas horarias para análisis
// Reconstruye las 24h de cualquier fecha usando el breakdown horario de FB,
// así funciona incluso para días en que la app estuvo cerrada.
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchCplHorarioPorDia(token, cuentas, fecha) {
  const activas = (cuentas || []).filter(c => c.adAccountId);
  if (!activas.length) return { ok: false, error: "Sin cuentas configuradas" };
  const LEAD_TYPES = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
  const LEAD_EXCLUIR = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);
  const porHora = {}; // 0..23 → { inv, leads }
  for (const cuenta of activas) {
    try {
      const url = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights`);
      url.searchParams.set("fields", "spend,actions");
      url.searchParams.set("time_range", JSON.stringify({ since: fecha, until: fecha }));
      url.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
      url.searchParams.set("level", "account");
      url.searchParams.set("limit", "500");
      url.searchParams.set("access_token", token);
      // PAGINAR: sin esto se pierden filas y los totales salen distorsionados
      let next = url.toString();
      while (next) {
        const json = await fetch(next).then(r => r.json());
        if (json.error) { console.warn("[CPL horario]", cuenta.nombre, json.error.message); break; }
        (json.data || []).forEach(d => {
          const franja = d.hourly_stats_aggregated_by_advertiser_time_zone || "";
          const hh = parseInt(franja.slice(0, 2));
          if (isNaN(hh)) return;
          const acts = d.actions || [];
          let nl = 0;
          for (const t of LEAD_TYPES) { if (LEAD_EXCLUIR.has(t)) continue; const a = acts.find(x => x.action_type === t); if (a) { const v = parseFloat(a.value) || 0; if (v > nl) nl = v; } }
          if (nl === 0) acts.filter(x => !LEAD_EXCLUIR.has(x.action_type) && x.action_type?.includes("registration")).forEach(x => { const v = parseFloat(x.value) || 0; if (v > nl) nl = v; });
          if (!porHora[hh]) porHora[hh] = { inv: 0, leads: 0 };
          porHora[hh].inv += parseFloat(d.spend) || 0;
          porHora[hh].leads += nl;
        });
        next = json.paging?.next || null;
      }
    } catch (e) { console.error("[CPL horario]", cuenta.nombre, e.message); }
  }
  // Serie de 24 horas con CPL de la hora y CPL acumulado
  let accInv = 0, accLeads = 0;
  const horas = [];
  for (let h = 0; h < 24; h++) {
    const d = porHora[h];
    if (d) { accInv += d.inv; accLeads += d.leads; }
    horas.push({
      hora: h,
      label: String(h).padStart(2, "0") + ":00",
      inv: d ? +d.inv.toFixed(2) : 0,
      leads: d ? Math.round(d.leads) : 0,
      cplHora: d && d.leads > 0 ? +(d.inv / d.leads).toFixed(4) : 0,
      invAcum: +accInv.toFixed(2),
      leadsAcum: Math.round(accLeads),
      cplAcum: accLeads > 0 ? +(accInv / accLeads).toFixed(4) : 0,
      sinDatos: !d,
    });
  }
  return { ok: true, horas, totalInv: +accInv.toFixed(2), totalLeads: Math.round(accLeads), cplDia: accLeads > 0 ? +(accInv / accLeads).toFixed(4) : 0 };
}

export function ComparativaCplPanel({ client }) {
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  const hayConfig = fbListo(client);

  // Por defecto: últimos 7 días (una semana permite decisiones sólidas)
  const [fechas, setFechas] = useState(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(localDateStr(d)); }
    return out;
  });
  const [datos, setDatos] = useState({});   // fecha → { horas, totalInv, ... }
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState("apilada"); // apilada | overlay | tabla
  const [metrica, setMetrica] = useState("cplAcum"); // cplAcum | cplHora
  const [nuevaFecha, setNuevaFecha] = useState(localDateStr());
  const [copiado, setCopiado] = useState(false);
  // Filtro por cuenta publicitaria: "todas" = consolidado
  const [cuentaFiltro, setCuentaFiltro] = useState("todas");
  // Cuentas que realmente se consultan segun el filtro
  const cuentasConsulta = cuentaFiltro === "todas" ? cuentas : cuentas.filter(c => c.nombre === cuentaFiltro);

  const PALETA = ["#FFDE59", "#4D9FFF", "#10B981", "#EF4444", "#A855F7", "#F59E0B", "#EC4899"];

  async function cargar(lista = fechas, cuentasUsar = cuentasConsulta, reiniciar = false) {
    if (!hayConfig) return;
    setLoading(true);
    const out = reiniciar ? {} : { ...datos };
    for (const f of lista) {
      if (out[f]) continue; // ya cargada
      const r = await fetchCplHorarioPorDia(token, cuentasUsar, f);
      if (r.ok) out[f] = r;
    }
    setDatos(out);
    setLoading(false);
  }
  useEffect(() => { if (hayConfig) cargar(); /* eslint-disable-next-line */ }, []);

  // Al cambiar de cuenta hay que descartar el cache y volver a consultar:
  // los datos guardados corresponden a la seleccion anterior.
  function cambiarCuenta(nombre) {
    setCuentaFiltro(nombre);
    const nuevas = nombre === "todas" ? cuentas : cuentas.filter(c => c.nombre === nombre);
    setDatos({});
    cargar(fechas, nuevas, true);
  }

  function agregarFecha() {
    if (!nuevaFecha || fechas.includes(nuevaFecha)) return;
    if (fechas.length >= 7) return;
    const nuevas = [...fechas, nuevaFecha].sort();
    setFechas(nuevas);
    cargar([nuevaFecha]);
  }
  function quitarFecha(f) {
    setFechas(p => p.filter(x => x !== f));
  }

  const nombreDia = (f) => {
    const d = new Date(f + "T12:00:00");
    return d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "short" });
  };
  const fmt = (n) => "$" + fmtNum(n, 2);

  // ── Exportar a Sheets/CSV: filas por hora, columnas por día ──
  function construirTSV() {
    const vista = cuentaFiltro === "todas" ? "Consolidado (todas las cuentas)" : `Cuenta: ${cuentaFiltro}`;
    const metricaTxt = metrica === "cplAcum" ? "CPL acumulado" : "CPL por hora";
    const filas = [];
    // Encabezado informativo: deja claro que vista se exporto
    filas.push([vista, metricaTxt]);
    filas.push([]);
    filas.push(["Hora", ...fechas.map(f => nombreDia(f))]);
    for (let h = 0; h < 24; h++) {
      const fila = [String(h).padStart(2, "0") + ":00"];
      fechas.forEach(f => {
        const d = datos[f]?.horas?.[h];
        fila.push(d && d[metrica] > 0 ? d[metrica].toFixed(2) : "");
      });
      filas.push(fila);
    }
    // Fila de totales
    filas.push(["TOTAL DÍA", ...fechas.map(f => datos[f]?.cplDia ? datos[f].cplDia.toFixed(2) : "")]);
    return filas.map(r => r.join("\t")).join("\n");
  }
  // Abre el modal de exportación (copia confiable con clic directo del usuario)
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsTSV, setSheetsTSV] = useState("");
  function copiarParaSheets() {
    setSheetsTSV(construirTSV());
    setShowSheetsModal(true);
    setCopiado(false);
  }
  function descargarCSV() {
    const csv = construirTSV().split("\n").map(l => l.split("\t").map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const sufijo = cuentaFiltro === "todas" ? "consolidado" : cuentaFiltro.replace(/[^a-z0-9]/gi, "_");
    a.href = url; a.download = `cpl_horario_${(client.name || "cliente").replace(/[^a-z0-9]/gi, "_")}_${sufijo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Ancho real del contenedor: se usa en el viewBox para NO deformar el texto.
  // (preserveAspectRatio="none" estiraba los números y se veían alargados)
  const anchoRef = useRef(null);
  const [anchoPx, setAnchoPx] = useState(900);
  useEffect(() => {
    const el = anchoRef.current;
    if (!el) return;
    const medir = () => {
      // clientWidth incluye el padding del card (1.25rem = 20px por lado)
      const w = el.clientWidth - 40;
      if (w > 0) setAnchoPx(w);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escala común para las gráficas
  const todosValores = fechas.flatMap(f => (datos[f]?.horas || []).map(h => h[metrica]).filter(v => v > 0));
  const maxV = todosValores.length ? Math.max(...todosValores) : 1;
  const minV = todosValores.length ? Math.min(...todosValores) : 0;
  const rangoV = (maxV - minV) || 1;

  // Mini gráfica de un día (SVG)
  const GraficaDia = ({ fecha, color, alto = 130, mostrarEje = true }) => {
    const [hov, setHov] = useState(null);
    const d = datos[fecha];
    // Mientras se consulta este dia, mostrar el esqueleto de la grafica
    if (!d) return loading
      ? <SkeletonGrafica alto={alto} />
      : <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>Sin datos</div>;
    const W = Math.max(anchoPx, 320), H = alto, PAD = { t: 10, r: 14, b: mostrarEje ? 22 : 6, l: 52 };
    const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
    const pts = d.horas.filter(h => h[metrica] > 0);
    if (!pts.length) return <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>Sin gasto ese día</div>;
    const x = (h) => PAD.l + (h / 23) * cW;
    const y = (v) => PAD.t + cH - ((v - minV) / rangoV) * cH;
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.hora).toFixed(1)},${y(p[metrica]).toFixed(1)}`).join(" ");
    const area = `${path} L${x(pts[pts.length - 1].hora).toFixed(1)},${PAD.t + cH} L${x(pts[0].hora).toFixed(1)},${PAD.t + cH} Z`;
    const gid = `gcmp_${fecha.replace(/-/g, "")}`;

    // Punto más cercano al mouse (tabla de control estilo CPL en vivo)
    function onMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      let mejor = null, dist = Infinity;
      pts.forEach(p => { const dd = Math.abs(x(p.hora) - relX); if (dd < dist) { dist = dd; mejor = p; } });
      setHov(mejor);
    }

    return (
      <div style={{ position: "relative" }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}
          onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, .5, 1].map((t, i) => {
            const v = minV + rangoV * (1 - t);
            return (<g key={i}>
              <line x1={PAD.l} y1={PAD.t + cH * t} x2={PAD.l + cW} y2={PAD.t + cH * t} stroke="var(--border)" strokeWidth=".5" strokeDasharray="3 4" />
              <text x={PAD.l - 6} y={PAD.t + cH * t + 3} textAnchor="end" fontSize="8" fill="var(--muted)" fontFamily="var(--mono)">${fmtNum(v, 2)}</text>
            </g>);
          })}
          <path d={area} fill={`url(#${gid})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => <circle key={i} cx={x(p.hora)} cy={y(p[metrica])} r="2.5" fill={color} />)}
          {/* Línea guía + punto resaltado del hover */}
          {hov && <>
            <line x1={x(hov.hora)} y1={PAD.t} x2={x(hov.hora)} y2={PAD.t + cH} stroke={color} strokeWidth=".8" strokeDasharray="3 3" strokeOpacity=".6" />
            <circle cx={x(hov.hora)} cy={y(hov[metrica])} r="5" fill={color} stroke="var(--bg)" strokeWidth="2" />
          </>}
          {mostrarEje && [0, 6, 12, 18, 23].map(h => (
            <text key={h} x={x(h)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--muted)">{String(h).padStart(2, "0")}h</text>
          ))}
        </svg>
        {/* TABLA DE CONTROL (tooltip) — igual que en el CPL en vivo */}
        {hov && (
          <div style={{
            position: "absolute", pointerEvents: "none",
            left: `${Math.min(Math.max((x(hov.hora) / W) * 100, 4), 74)}%`, top: 4,
            background: "var(--surface)", border: `1px solid ${color}66`, borderRadius: 8,
            padding: "8px 11px", fontSize: 11, minWidth: 150, zIndex: 5,
            boxShadow: "0 4px 18px rgba(0,0,0,.45)"
          }}>
            <div style={{ color: "var(--muted)", fontSize: 10, marginBottom: 3, textTransform: "capitalize" }}>
              {hov.label} · {nombreDia(fecha)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "var(--mono)", color, marginBottom: 4 }}>
              {fmt(hov[metrica])}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>/lead</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 10px", fontSize: 10, color: "var(--muted)" }}>
              <span>Leads hora:</span><span style={{ textAlign: "right", color: "var(--text)", fontFamily: "var(--mono)" }}>{hov.leads}</span>
              <span>Gasto hora:</span><span style={{ textAlign: "right", color: "var(--text)", fontFamily: "var(--mono)" }}>{fmt(hov.inv)}</span>
              <span>Leads acum.:</span><span style={{ textAlign: "right", color: "var(--text)", fontFamily: "var(--mono)" }}>{hov.leadsAcum}</span>
              <span>Gasto acum.:</span><span style={{ textAlign: "right", color: "var(--text)", fontFamily: "var(--mono)" }}>{fmt(hov.invAcum)}</span>
            </div>
            {/* Comparación contra el CPL del día */}
            {d.cplDia > 0 && hov[metrica] > 0 && (() => {
              const diff = ((hov[metrica] - d.cplDia) / d.cplDia) * 100;
              if (Math.abs(diff) < 1) return null;
              return (
                <div style={{ marginTop: 5, paddingTop: 5, borderTop: "1px solid var(--border)", fontSize: 10, color: diff > 0 ? "var(--red)" : "var(--green)" }}>
                  {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(0)}% vs CPL del día ({fmt(d.cplDia)})
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={anchoRef} className="card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Comparativa de CPL por día</div>
            {/* Filtro de cuenta: consolidado o una cuenta especifica */}
            {cuentas.length > 1 && (
              <select value={cuentaFiltro} onChange={e => cambiarCuenta(e.target.value)}
                title="Ver el consolidado o filtrar por una cuenta publicitaria"
                style={{
                  width: "auto", fontSize: 12, padding: "3px 8px", fontWeight: 600,
                  borderColor: cuentaFiltro !== "todas" ? "var(--accent)" : "var(--border)",
                  color: cuentaFiltro !== "todas" ? "var(--accent)" : "var(--text)",
                }}>
                <option value="todas">🏢 Todas ({cuentas.length}) — consolidado</option>
                {cuentas.map(c => <option key={c.id || c.adAccountId} value={c.nombre}>🏢 {c.nombre}</option>)}
              </select>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {cuentaFiltro === "todas"
              ? "Evolución horaria del costo por lead — compara hasta 7 días para detectar patrones"
              : `Mostrando solo la cuenta: ${cuentaFiltro}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={copiarParaSheets} disabled={!fechas.length}>
            {copiado ? "✓ Copiado" : "📊 Copiar para Sheets"}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={descargarCSV} disabled={!fechas.length}>📥 CSV</button>
        </div>
      </div>

      {!hayConfig ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Configura Facebook Ads en la tab 📘 Facebook para usar la comparativa.
        </div>
      ) : (<>
        {/* Controles */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div className="period-pills">
            {[["apilada", "▤ Apiladas"], ["overlay", "◈ Superpuestas"], ["tabla", "▦ Tabla"]].map(([k, l]) => (
              <button key={k} className={"pill " + (vista === k ? "active" : "")} onClick={() => setVista(k)}>{l}</button>
            ))}
          </div>
          <div className="period-pills">
            {[["cplAcum", "CPL acumulado (real)"], ["cplHora", "CPL por hora (volátil)"]].map(([k, l]) => (
              <button key={k} className={"pill " + (metrica === k ? "active" : "")} onClick={() => setMetrica(k)}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginLeft: "auto" }}>
            <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} max={localDateStr()} style={{ width: "auto", fontSize: 12 }} />
            <button className="btn btn-sm" onClick={agregarFecha} disabled={fechas.length >= 7 || fechas.includes(nuevaFecha)}>+ Añadir día</button>
          </div>
        </div>

        {/* Chips de fechas activas */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {fechas.map((f, i) => (
            <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 10px", borderRadius: 14, background: "var(--surface2)", border: `1px solid ${PALETA[i % PALETA.length]}55` }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: PALETA[i % PALETA.length] }} />
              {nombreDia(f)}
              {datos[f]
                ? <span style={{ color: "var(--muted)", fontFamily: "var(--mono)" }}>{fmt(datos[f].cplDia)}</span>
                : loading && <span className="spin-sm" style={{ borderTopColor: PALETA[i % PALETA.length], marginRight: 0 }} />}
              <button onClick={() => quitarFecha(f)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, fontSize: 13 }}>×</button>
            </span>
          ))}

        </div>

        {/* Progreso de carga: cuantos dias van consultados */}
        <BarraCarga activo={loading}
          texto={`Consultando Facebook... ${Object.keys(datos).length} de ${fechas.length} día(s) listos`} />

        {/* VISTA APILADA */}
        {vista === "apilada" && (
          <div>
            {fechas.map((f, i) => (
              <div key={f} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: PALETA[i % PALETA.length], marginRight: 7 }} />
                    {nombreDia(f)}
                  </div>
                  {datos[f] && (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      CPL día: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--text)" }}>{fmt(datos[f].cplDia)}</span>
                      {" · "}{datos[f].totalLeads} leads · {fmt(datos[f].totalInv)}
                    </div>
                  )}
                </div>
                <GraficaDia fecha={f} color={PALETA[i % PALETA.length]} />
              </div>
            ))}
          </div>
        )}

        {/* VISTA OVERLAY */}
        {vista === "overlay" && (() => {
          const W = Math.max(anchoPx, 320), H = 300, PAD = { t: 14, r: 16, b: 26, l: 54 };
          const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
          const x = (h) => PAD.l + (h / 23) * cW;
          const y = (v) => PAD.t + cH - ((v - minV) / rangoV) * cH;
          return (
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
              {[0, .25, .5, .75, 1].map((t, i) => {
                const v = minV + rangoV * (1 - t);
                return (<g key={i}>
                  <line x1={PAD.l} y1={PAD.t + cH * t} x2={PAD.l + cW} y2={PAD.t + cH * t} stroke="var(--border)" strokeWidth=".5" strokeDasharray="3 4" />
                  <text x={PAD.l - 6} y={PAD.t + cH * t + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--mono)">${fmtNum(v, 2)}</text>
                </g>);
              })}
              {[0, 3, 6, 9, 12, 15, 18, 21, 23].map(h => (
                <text key={h} x={x(h)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">{String(h).padStart(2, "0")}h</text>
              ))}
              {fechas.map((f, i) => {
                const d = datos[f];
                if (!d) return null;
                const pts = d.horas.filter(h => h[metrica] > 0);
                if (!pts.length) return null;
                const path = pts.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.hora).toFixed(1)},${y(p[metrica]).toFixed(1)}`).join(" ");
                return <path key={f} d={path} fill="none" stroke={PALETA[i % PALETA.length]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity=".9" />;
              })}
            </svg>
          );
        })()}

        {/* VISTA TABLA */}
        {vista === "tabla" && (
          <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
            <table className="tbl" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>Hora</th>
                  {fechas.map((f, i) => (
                    <th key={f} style={{ textAlign: "right", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: PALETA[i % PALETA.length], marginRight: 5 }} />
                      {nombreDia(f)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }, (_, h) => (
                  <tr key={h}>
                    <td style={{ fontFamily: "var(--mono)", color: "var(--muted)" }}>{String(h).padStart(2, "0")}:00</td>
                    {fechas.map(f => {
                      const d = datos[f]?.horas?.[h];
                      const v = d ? d[metrica] : 0;
                      return <td key={f} style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{v > 0 ? fmt(v) : <span style={{ color: "var(--border)" }}>—</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)", position: "sticky", bottom: 0, background: "var(--surface)" }}>
                  <td>CPL DÍA</td>
                  {fechas.map(f => <td key={f} style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{datos[f]?.cplDia ? fmt(datos[f].cplDia) : "—"}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>
          <strong>CPL acumulado (real)</strong>: gasto total del día ÷ leads totales hasta esa hora. Es el mismo cálculo del panel en vivo y refleja el costo real de la operación.{" "}
          <strong>CPL por hora (volátil)</strong>: gasto de esa hora ÷ leads de esa hora. Sirve para detectar franjas caras o baratas, pero da picos extremos porque los leads no siempre llegan en la misma hora en que se gastó — no lo uses como referencia de costo real.
        </div>
      </>)}

      {/* Modal de exportación a Google Sheets */}
      {showSheetsModal && (
        <div onClick={() => setShowSheetsModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: "100%", padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Exportar CPL por hora a Sheets</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSheetsModal(false)}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              {fechas.length} día(s) · 24 horas · métrica: {metrica === "cplAcum" ? "CPL acumulado" : "CPL por hora"}
            </div>
            <ol style={{ fontSize: 13, paddingLeft: 20, margin: "0 0 14px", lineHeight: 1.8 }}>
              <li>Presiona <strong>Copiar datos</strong>.</li>
              <li>Presiona <strong>Abrir Google Sheets</strong>.</li>
              <li>Clic en la celda <strong>A1</strong> y pega con <strong>Ctrl+V</strong>.</li>
            </ol>
            <textarea readOnly value={sheetsTSV} onClick={e => e.target.select()}
              style={{ width: "100%", height: 110, fontSize: 10, fontFamily: "var(--mono)", resize: "none", marginBottom: 14, background: "var(--surface2)" }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, minWidth: 130 }} onClick={async () => {
                let ok = false;
                try { await navigator.clipboard.writeText(sheetsTSV); ok = true; }
                catch {
                  try {
                    const ta = document.createElement("textarea");
                    ta.value = sheetsTSV; ta.style.position = "fixed"; ta.style.opacity = "0";
                    document.body.appendChild(ta); ta.focus(); ta.select();
                    ok = document.execCommand("copy"); document.body.removeChild(ta);
                  } catch {}
                }
                setCopiado(ok);
              }}>{copiado ? "✓ Copiado" : "📋 Copiar datos"}</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, minWidth: 130 }}
                onClick={() => window.open("https://sheets.new", "_blank")}>📊 Abrir Google Sheets</button>
              <button className="btn btn-ghost btn-sm" style={{ minWidth: 100 }} onClick={descargarCSV}>📥 O bajar CSV</button>
            </div>
            {copiado && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 10 }}>✓ Datos copiados. Abre Sheets y pega en A1.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL POR PAÍS — gasto real ejecutado + presupuesto activo programado
// ═══════════════════════════════════════════════════════════════════════════
export function PaisesPanel({ client, onUpdate }) {
  // Fuente única de verdad para las cuentas (soporta multicuenta y formato viejo)
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  const hayConfig = fbListo(client);

  // Países principales definidos por el usuario (guardados en el perfil del cliente)
  const paisesPrincipales = client.paisesPrincipales || [];
  // Filtro por cuenta publicitaria: "todas" = consolidado
  const [cuentaFiltro, setCuentaFiltro] = useState("todas");

  // Rango de fechas
  const [desde, setDesde] = useState(() => { const d=new Date(); d.setDate(d.getDate()-30); return localDateStr(d); });
  const [hasta, setHasta] = useState(localDateStr());
  const [preset, setPreset] = useState("30d");

  const [gasto, setGasto] = useState(null);       // { porPais }
  const [presup, setPresup] = useState(null);     // { monoPais, compartidos, totalDiario }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfigPaises, setShowConfigPaises] = useState(false);
  const [nuevoPais, setNuevoPais] = useState("");

  function aplicarPreset(p) {
    setPreset(p);
    const hoy = new Date();
    let d = new Date();
    if (p === "hoy") { d = hoy; }
    else if (p === "7d") d.setDate(d.getDate()-6);
    else if (p === "30d") d.setDate(d.getDate()-29);
    else if (p === "90d") d.setDate(d.getDate()-89);
    if (p !== "custom") { setDesde(localDateStr(d)); setHasta(localDateStr(hoy)); }
  }

  async function cargar() {
    if (!hayConfig) { setError("Configura Facebook Ads en la tab 📘 Facebook primero."); return; }
    setLoading(true); setError(null);
    const [g, p] = await Promise.all([
      fetchGastoPorPais(token, cuentas, desde, hasta),
      fetchPresupuestoPorPais(token, cuentas),
    ]);
    if (!g.ok && !p.ok) { setError(g.error || p.error || "Error al consultar Facebook"); setLoading(false); return; }
    setGasto(g.ok ? g : null);
    setPresup(p.ok ? p : null);
    setLoading(false);
  }

  useEffect(() => { if (hayConfig) cargar(); /* eslint-disable-next-line */ }, []);

  // Auto-refresco del presupuesto cada 60s (solo la config, es liviano) para
  // que apagar/encender adsets en Facebook se refleje casi en vivo.
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ultimoRefresh, setUltimoRefresh] = useState(null);
  useEffect(() => {
    if (!hayConfig || !autoRefresh) return;
    const id = setInterval(async () => {
      const p = await fetchPresupuestoPorPais(token, cuentas);
      if (p.ok) { setPresup(p); setUltimoRefresh(new Date()); }
    }, 60000);
    return () => clearInterval(id);
    /* eslint-disable-next-line */
  }, [autoRefresh, hayConfig]);

  // Añadir/quitar país principal
  async function togglePaisPrincipal(code) {
    const actual = client.paisesPrincipales || [];
    const nuevos = actual.includes(code) ? actual.filter(c=>c!==code) : [...actual, code];
    await onUpdate({ ...client, paisesPrincipales: nuevos });
  }
  async function agregarPaisManual() {
    const code = nuevoPais.trim().toUpperCase();
    if (code.length !== 2) return;
    const actual = client.paisesPrincipales || [];
    if (!actual.includes(code)) await onUpdate({ ...client, paisesPrincipales: [...actual, code] });
    setNuevoPais("");
  }

  // Procesar datos de gasto
  // ── Datos filtrados por cuenta ──────────────────────────────────────────
  // Si hay una cuenta seleccionada, reconstruimos los mapas usando el cruce
  // país×cuenta; si es "todas", usamos los consolidados.
  const porPais = (() => {
    if (cuentaFiltro === "todas") return gasto?.porPais || {};
    const cruce = gasto?.porPaisCuenta || {};
    const out = {};
    Object.entries(cruce).forEach(([k, v]) => {
      const [code, cta] = k.split("|");
      if (cta !== cuentaFiltro) return;
      if (!out[code]) out[code] = { inv:0, leads:0, impr:0, reach:0 };
      out[code].inv += v.inv; out[code].leads += v.leads;
      out[code].impr += v.impr || 0; out[code].reach += v.reach || 0;
    });
    return out;
  })();
  const codigosConGasto = Object.keys(porPais).sort((a,b) => porPais[b].inv - porPais[a].inv);
  const totalInv = codigosConGasto.reduce((s,c)=>s+porPais[c].inv,0);
  const totalLeads = codigosConGasto.reduce((s,c)=>s+porPais[c].leads,0);

  // Separar principales vs otros
  const conGastoPrincipales = codigosConGasto.filter(c => paisesPrincipales.includes(c));
  const conGastoOtros = codigosConGasto.filter(c => !paisesPrincipales.includes(c));
  const [showOtros, setShowOtros] = useState(false);

  // Presupuesto (también filtrado por cuenta)
  const monoPais = (() => {
    if (cuentaFiltro === "todas") return presup?.monoPais || {};
    const cruce = presup?.monoPaisCuenta || {};
    const out = {};
    Object.entries(cruce).forEach(([k, v]) => {
      const [code, cta] = k.split("|");
      if (cta !== cuentaFiltro) return;
      out[code] = (out[code] || 0) + v;
    });
    return out;
  })();
  const compartidos = (presup?.compartidos || []).filter(c => cuentaFiltro === "todas" || c.cuenta === cuentaFiltro);
  const totalMonoDiario = Object.values(monoPais).reduce((s,v)=>s+v,0);
  // Presupuesto diario total según el filtro
  const presupDiarioVista = cuentaFiltro === "todas"
    ? (presup?.totalDiario || 0)
    : (presup?.presupPorCuenta?.[cuentaFiltro]?.diario || 0);

  const fmt = (n) => "$" + fmtNum(n, 2);
  const pct = (n) => totalInv>0 ? ((n/totalInv)*100).toFixed(1) + "%" : "—";

  // Fila de país (barra de gasto)
  const FilaPais = ({ code, data, destacado }) => {
    const cpl = data.leads>0 ? data.inv/data.leads : 0;
    const ancho = totalInv>0 ? (data.inv/totalInv)*100 : 0;
    return (
      <div style={{padding:"10px 12px", borderRadius:10, background:destacado?"rgba(77,159,255,.06)":"var(--surface2)",
        border:destacado?"1px solid rgba(77,159,255,.25)":"1px solid var(--border)", marginBottom:8}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{fontSize:20}}>{paisBandera(code)}</span>
            <div>
              <div style={{fontWeight:700, fontSize:14}}>{paisNombre(code)} {destacado && <span style={{fontSize:9, color:"var(--accent)", marginLeft:4}}>★ principal</span>}</div>
              <div style={{fontSize:11, color:"var(--muted)"}}>{Math.round(data.leads)} leads · CPL {cpl>0?fmt(cpl):"—"}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:800, fontSize:16, fontFamily:"var(--mono)"}}>{fmt(data.inv)}</div>
            <div style={{fontSize:11, color:"var(--muted)"}}>{pct(data.inv)}</div>
          </div>
        </div>
        <div style={{height:6, borderRadius:3, background:"var(--border)", overflow:"hidden"}}>
          <div style={{height:"100%", width:ancho+"%", borderRadius:3, background:destacado?"var(--accent)":"var(--accent2)", transition:"width .5s ease-out"}}/>
        </div>
      </div>
    );
  };

  // ── Exportar el desglose por país a CSV ──
  function exportarCSV() {
    const filas = [["Vista", "Pais","Codigo","Inversion","Leads","CPL","% del total","Presupuesto diario"]];
    const vista = cuentaFiltro === "todas" ? "Consolidado" : cuentaFiltro;
    codigosConGasto.forEach(code => {
      const d = porPais[code];
      const cpl = d.leads>0 ? d.inv/d.leads : 0;
      const presDiario = monoPais[code] || 0;
      filas.push([
        vista, paisNombre(code), code,
        d.inv.toFixed(2), Math.round(d.leads),
        cpl>0?cpl.toFixed(2):"", totalInv>0?((d.inv/totalInv)*100).toFixed(1)+"%":"",
        presDiario>0?presDiario.toFixed(2):""
      ]);
    });
    // Fila de compartidos (informativa)
    compartidos.forEach(c => {
      filas.push([
        c.cuenta || vista, "[Compartido] "+c.nombre, c.paises[0]==="WW"?"Mundial":c.paises.join("+"),
        "","","","", c.budget.toFixed(2)+" ("+c.tipo+")"
      ]);
    });
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const sufijo = cuentaFiltro === "todas" ? "consolidado" : cuentaFiltro.replace(/[^a-z0-9]/gi,"_");
    a.download = `presupuesto_${(client.name||client.nombre||"cliente").replace(/[^a-z0-9]/gi,"_")}_${sufijo}_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header + configuración de países principales */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:12}}>
        <div>
          <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
            <div style={{fontWeight:700, fontSize:16}}>💰 Presupuesto e inversión</div>
            {/* Selector de cuenta junto al título: consolidado o una cuenta */}
            {cuentas.length > 1 && (
              <select value={cuentaFiltro} onChange={e=>setCuentaFiltro(e.target.value)}
                title="Ver el consolidado o filtrar por una cuenta publicitaria"
                style={{width:"auto", fontSize:12, padding:"3px 8px",
                  borderColor: cuentaFiltro!=="todas" ? "var(--accent)" : "var(--border)",
                  color: cuentaFiltro!=="todas" ? "var(--accent)" : "var(--text)", fontWeight:600}}>
                <option value="todas">🏢 Todas ({cuentas.length}) — consolidado</option>
                {cuentas.map(c => <option key={c.id||c.adAccountId} value={c.nombre}>🏢 {c.nombre}</option>)}
              </select>
            )}
          </div>
          <div style={{fontSize:11, color:"var(--muted)", marginTop:2}}>
            {cuentaFiltro === "todas"
              ? "Gasto ejecutado y presupuesto activo, consolidado de todas las cuentas"
              : `Mostrando solo la cuenta: ${cuentaFiltro}`}
          </div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <label style={{display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--muted)", cursor:"pointer"}}>
            <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} style={{width:"auto", margin:0}} />
            Auto 60s {ultimoRefresh && <span style={{color:"var(--green)"}}>●</span>}
          </label>
          <button className="btn btn-ghost btn-sm" onClick={exportarCSV} disabled={codigosConGasto.length===0} style={{fontSize:11}}>
            📥 Exportar CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowConfigPaises(v=>!v)} style={{fontSize:11}}>
            ⚙️ Países principales ({paisesPrincipales.length})
          </button>
        </div>
      </div>

      {/* Configuración de países principales */}
      {showConfigPaises && (
        <div className="card" style={{marginBottom:12, padding:"12px 14px"}}>
          <div style={{fontSize:12, fontWeight:600, marginBottom:8}}>Marca los países donde principalmente llevas pauta para este cliente</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:10}}>
            {Object.keys(PAISES_INFO).map(code => (
              <button key={code} onClick={()=>togglePaisPrincipal(code)}
                style={{fontSize:11, padding:"4px 10px", borderRadius:14, cursor:"pointer",
                  border:paisesPrincipales.includes(code)?"1px solid var(--accent)":"1px solid var(--border)",
                  background:paisesPrincipales.includes(code)?"rgba(77,159,255,.15)":"transparent",
                  color:paisesPrincipales.includes(code)?"var(--accent)":"var(--muted)", fontWeight:paisesPrincipales.includes(code)?700:400}}>
                {paisBandera(code)} {code}
              </button>
            ))}
          </div>
          <div style={{display:"flex", gap:6, alignItems:"center"}}>
            <input type="text" value={nuevoPais} onChange={e=>setNuevoPais(e.target.value)} maxLength={2}
              placeholder="Otro código ISO (ej: JP)" style={{width:160, fontSize:12, textTransform:"uppercase"}}
              onKeyDown={e=>e.key==="Enter"&&agregarPaisManual()} />
            <button className="btn btn-sm" onClick={agregarPaisManual}>Agregar</button>
          </div>
        </div>
      )}

      {/* Controles de rango + refrescar */}
      <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:14}}>
        <div className="period-pills">
          {[["hoy","Hoy"],["7d","7 días"],["30d","30 días"],["90d","90 días"]].map(([k,l])=>(
            <button key={k} className={"pill "+(preset===k?"active":"")} onClick={()=>aplicarPreset(k)}>{l}</button>
          ))}
        </div>
        <input type="date" value={desde} onChange={e=>{setDesde(e.target.value);setPreset("custom");}} max={hasta} style={{width:"auto",fontSize:12}} />
        <span style={{fontSize:12,color:"var(--muted)"}}>→</span>
        <input type="date" value={hasta} onChange={e=>{setHasta(e.target.value);setPreset("custom");}} max={localDateStr()} style={{width:"auto",fontSize:12}} />
        <BotonCarga cargando={loading} onClick={cargar} disabled={!hayConfig}
          textoCargando="Consultando...">🔄 Actualizar</BotonCarga>
      </div>

      <BarraCarga activo={loading} texto="Consultando gasto y presupuesto en Facebook..." />

      {error && <div className="card" style={{padding:"12px 14px", marginBottom:12, borderColor:"var(--red)", color:"var(--red)", fontSize:13}}>{error}</div>}

      {!hayConfig ? (
        <div style={{padding:40, textAlign:"center", color:"var(--muted)", fontSize:13}}>
          Configura Facebook Ads en la tab 📘 Facebook para activar el análisis por país.
        </div>
      ) : (<>

        {/* ─── DESGLOSE POR CUENTA PUBLICITARIA ─── */}
        {(() => {
          const gastoCuentas = gasto?.porCuenta || {};
          const presupCuentas = presup?.presupPorCuenta || {};
          const nombres = Array.from(new Set([...Object.keys(gastoCuentas), ...Object.keys(presupCuentas)]));
          if (!nombres.length) return null;
          const totInvC = nombres.reduce((s,n)=>s+(gastoCuentas[n]?.inv||0),0);
          const totPresC = nombres.reduce((s,n)=>s+(presupCuentas[n]?.diario||0),0);
          return (
            <div className="card" style={{padding:"14px 16px", marginBottom:16}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12, flexWrap:"wrap", gap:6}}>
                <div style={{fontWeight:700, fontSize:14}}>🏢 Por cuenta publicitaria</div>
                <div style={{fontSize:11, color:"var(--muted)"}}>
                  Gastado: <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)"}}>{fmt(totInvC)}</span>
                  {totPresC>0 && <> · Presupuesto activo: <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--green)"}}>{fmt(totPresC)}/día</span></>}
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:`repeat(auto-fit, minmax(240px, 1fr))`, gap:10}}>
                {nombres.map(n => {
                  const g = gastoCuentas[n] || { inv:0, leads:0 };
                  const p = presupCuentas[n] || { diario:0, adsets:0 };
                  const cplC = g.leads>0 ? g.inv/g.leads : 0;
                  const pctInv = totInvC>0 ? (g.inv/totInvC)*100 : 0;
                  // Días de runway estimados con el presupuesto diario actual
                  return (
                    <div key={n} onClick={()=>setCuentaFiltro(cuentaFiltro===n?"todas":n)}
                      title={cuentaFiltro===n?"Clic para ver todas las cuentas":`Clic para filtrar solo ${n}`}
                      style={{padding:"12px 14px", borderRadius:10, cursor:"pointer",
                        background: cuentaFiltro===n ? "rgba(77,159,255,.08)" : "var(--surface2)",
                        border: cuentaFiltro===n ? "1px solid var(--accent)" : "1px solid var(--border)",
                        transition:"background .2s, border-color .2s"}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:6}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>🏢 {n}</div>
                          {(g.adAccountId || p.adAccountId) && <div style={{fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)"}}>act_{g.adAccountId || p.adAccountId}</div>}
                        </div>
                        <span style={{fontSize:10, color:"var(--muted)", whiteSpace:"nowrap"}}>{pctInv.toFixed(0)}%</span>
                      </div>
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11}}>
                        <div>
                          <div style={{color:"var(--muted)", fontSize:9, textTransform:"uppercase", letterSpacing:.4}}>Gastado</div>
                          <div style={{fontWeight:800, fontSize:15, fontFamily:"var(--mono)"}}>{fmt(g.inv)}</div>
                        </div>
                        <div>
                          <div style={{color:"var(--muted)", fontSize:9, textTransform:"uppercase", letterSpacing:.4}}>Presup./día</div>
                          <div style={{fontWeight:800, fontSize:15, fontFamily:"var(--mono)", color: p.diario>0?"var(--green)":"var(--muted)"}}>
                            {p.diario>0 ? fmt(p.diario) : "—"}
                          </div>
                        </div>
                      </div>
                      <div style={{marginTop:8, paddingTop:8, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--muted)", gap:6, flexWrap:"wrap"}}>
                        <span>{Math.round(g.leads)} leads · CPL {cplC>0?fmt(cplC):"—"}</span>
                        <span>
                          {p.adsets>0 && `${p.adsets} adset${p.adsets!==1?"s":""}`}
                          {p.adsets>0 && p.campanasCBO>0 && " · "}
                          {p.campanasCBO>0 && `${p.campanasCBO} CBO`}
                        </span>
                      </div>
                      <div style={{height:5, borderRadius:3, background:"var(--border)", overflow:"hidden", marginTop:8}}>
                        <div style={{height:"100%", width:pctInv+"%", borderRadius:3, background:"var(--accent)", transition:"width .5s ease-out"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ─── CPL COMPARATIVO ENTRE PAÍSES ─── */}
        {(() => {
          const conLeads = codigosConGasto.filter(c => porPais[c].leads > 0);
          if (conLeads.length < 1) return null;
          const cplPorPais = conLeads.map(c => ({ code:c, cpl: porPais[c].inv/porPais[c].leads, leads: porPais[c].leads, inv: porPais[c].inv }))
            .sort((a,b) => a.cpl - b.cpl);
          const maxCpl = Math.max(...cplPorPais.map(x=>x.cpl));
          const cplGlobal = totalLeads>0 ? totalInv/totalLeads : 0;
          const mejor = cplPorPais[0], peor = cplPorPais[cplPorPais.length-1];
          return (
            <div className="card" style={{padding:"14px 16px", marginBottom:16}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12, flexWrap:"wrap", gap:6}}>
                <div style={{fontWeight:700, fontSize:14}}>⚖️ CPL comparativo por país</div>
                <div style={{fontSize:11, color:"var(--muted)"}}>
                  CPL global: <span style={{fontFamily:"var(--mono)", fontWeight:700, color:"var(--text)"}}>${fmtNum(cplGlobal,2)}</span>
                  {cplPorPais.length>1 && <> · Mejor: {paisBandera(mejor.code)} <span style={{color:"var(--green)",fontFamily:"var(--mono)"}}>${fmtNum(mejor.cpl,2)}</span> · Más caro: {paisBandera(peor.code)} <span style={{color:"var(--red)",fontFamily:"var(--mono)"}}>${fmtNum(peor.cpl,2)}</span></>}
                </div>
              </div>
              {cplPorPais.map(({code, cpl, leads}) => {
                const ancho = maxCpl>0 ? (cpl/maxCpl)*100 : 0;
                // Verde si está por debajo del CPL global, rojo si arriba
                const bueno = cplGlobal>0 && cpl <= cplGlobal;
                const barColor = bueno ? "var(--green)" : "var(--red)";
                const vsGlobal = cplGlobal>0 ? ((cpl-cplGlobal)/cplGlobal)*100 : 0;
                return (
                  <div key={code} style={{marginBottom:10}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3}}>
                      <span style={{fontSize:13, fontWeight:600}}>{paisBandera(code)} {paisNombre(code)} <span style={{fontSize:10, color:"var(--muted)", fontWeight:400}}>· {Math.round(leads)} leads</span></span>
                      <span style={{display:"flex", alignItems:"center", gap:8}}>
                        {cplGlobal>0 && Math.abs(vsGlobal)>=1 && (
                          <span style={{fontSize:10, color:bueno?"var(--green)":"var(--red)"}}>
                            {bueno?"▼":"▲"} {Math.abs(vsGlobal).toFixed(0)}% vs global
                          </span>
                        )}
                        <span style={{fontWeight:800, fontSize:15, fontFamily:"var(--mono)", color:barColor}}>${fmtNum(cpl,2)}</span>
                      </span>
                    </div>
                    <div style={{height:8, borderRadius:4, background:"var(--border)", overflow:"hidden"}}>
                      <div style={{height:"100%", width:ancho+"%", borderRadius:4, background:barColor, transition:"width .5s ease-out"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{fontSize:10, color:"var(--muted)", marginTop:6}}>Barras más cortas = CPL más bajo (mejor). Verde: por debajo del CPL global · Rojo: por encima.</div>
            </div>
          );
        })()}

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start"}}>

          {/* ─── COLUMNA 1: GASTO REAL EJECUTADO ─── */}
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10}}>
              <div style={{fontWeight:700, fontSize:14}}>💸 Invertido por país</div>
              <div style={{fontSize:11, color:"var(--muted)"}}>Total: <span style={{fontFamily:"var(--mono)", fontWeight:700, color:"var(--text)"}}>{fmt(totalInv)}</span></div>
            </div>
            <div style={{fontSize:10, color:"var(--muted)", marginBottom:10}}>Dato real de dónde cayó el gasto (funciona aunque las campañas apunten a varios países)</div>

            {loading && !gasto ? (
              <SkeletonTabla filas={4} columnas={3} />
            ) : codigosConGasto.length === 0 ? (
              <div style={{padding:20, textAlign:"center", color:"var(--muted)", fontSize:12}}>Sin gasto en el rango seleccionado.</div>
            ) : (<>
              {/* Principales primero */}
              {conGastoPrincipales.map(code => <FilaPais key={code} code={code} data={porPais[code]} destacado={true} />)}
              {/* Otros */}
              {conGastoOtros.length > 0 && (
                paisesPrincipales.length > 0 ? (<>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11, marginBottom:8}} onClick={()=>setShowOtros(v=>!v)}>
                    {showOtros?"▼":"▶"} Otros países ({conGastoOtros.length}) · {fmt(conGastoOtros.reduce((s,c)=>s+porPais[c].inv,0))}
                  </button>
                  {showOtros && conGastoOtros.map(code => <FilaPais key={code} code={code} data={porPais[code]} destacado={false} />)}
                </>) : (
                  conGastoOtros.map(code => <FilaPais key={code} code={code} data={porPais[code]} destacado={false} />)
                )
              )}
            </>)}
          </div>

          {/* ─── COLUMNA 2: PRESUPUESTO PROGRAMADO ─── */}
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10}}>
              <div style={{fontWeight:700, fontSize:14}}>📋 Presupuesto activo</div>
              <div style={{fontSize:11, color:"var(--muted)"}}>Diario: <span style={{fontFamily:"var(--mono)", fontWeight:700, color:"var(--text)"}}>{fmt(presupDiarioVista)}</span>{cuentaFiltro!=="todas" && <span style={{marginLeft:5,color:"var(--accent)"}}>({cuentaFiltro})</span>}</div>
            </div>
            <div style={{fontSize:10, color:"var(--muted)", marginBottom:10}}>Lo que está programado ahora en adsets activos, según a qué países apuntan</div>

            {loading && !presup ? (
              <SkeletonTabla filas={4} columnas={2} />
            ) : (<>
              {/* Mono-país */}
              {Object.keys(monoPais).sort((a,b)=>monoPais[b]-monoPais[a]).map(code => (
                <div key={code} style={{padding:"8px 12px", borderRadius:10, background:paisesPrincipales.includes(code)?"rgba(16,185,129,.06)":"var(--surface2)",
                  border:paisesPrincipales.includes(code)?"1px solid rgba(16,185,129,.25)":"1px solid var(--border)", marginBottom:8,
                  display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span style={{fontSize:18}}>{paisBandera(code)}</span>
                    <span style={{fontWeight:600, fontSize:13}}>{paisNombre(code)}</span>
                  </div>
                  <span style={{fontWeight:800, fontSize:15, fontFamily:"var(--mono)", color:"var(--green)"}}>{fmt(monoPais[code])}<span style={{fontSize:10, color:"var(--muted)", fontWeight:400}}>/día</span></span>
                </div>
              ))}
              {Object.keys(monoPais).length === 0 && compartidos.length === 0 && (
                <div style={{padding:20, textAlign:"center", color:"var(--muted)", fontSize:12}}>Sin adsets activos con presupuesto propio. (Puede que uses presupuesto a nivel campaña/CBO.)</div>
              )}

              {/* Compartidos / multi-país */}
              {compartidos.length > 0 && (
                <div style={{marginTop:12, padding:"10px 12px", borderRadius:10, background:"rgba(255,222,89,.05)", border:"1px solid rgba(255,222,89,.2)"}}>
                  <div style={{fontSize:12, fontWeight:700, color:"var(--amber)", marginBottom:2}}>⚠️ Presupuesto compartido (multi-país)</div>
                  <div style={{fontSize:10, color:"var(--muted)", marginBottom:8}}>Estos adsets apuntan a varios países a la vez (ej. remarketing). Facebook reparte el presupuesto solo, no se puede dividir por país.</div>
                  {compartidos.map((c,i) => (
                    <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderTop:i>0?"1px solid var(--border)":"none"}}>
                      <div style={{fontSize:12, minWidth:0, flex:1}}>
                        <div style={{fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.nombre}</div>
                        <div style={{fontSize:10, color:"var(--muted)"}}>
                          {c.paises[0]==="WW" ? "🌐 Todo el mundo" : c.paises.map(p=>paisBandera(p)+" "+p).join("  ")}
                          {c.nivel && <span style={{marginLeft:6, opacity:.7}}>· {c.nivel}</span>}
                        </div>
                      </div>
                      <span style={{fontWeight:700, fontSize:13, fontFamily:"var(--mono)", color:"var(--amber)", marginLeft:8}}>{fmt(c.budget)}<span style={{fontSize:9, color:"var(--muted)", fontWeight:400}}>/{c.tipo==="diario"?"día":"total"}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </div>
        </div>
      </>)}
    </div>
  );
}

// ─── BITÁCORA DE CAMBIOS (registro de actividad de Meta) ──────────────────────
// Responde: "vi una caida del CPL a las 3pm, que cambio a esa hora?".
// Optimizada para no pesar: no carga sola, trae maximo 300 eventos y solo
// pinta 50 a la vez (el resto con "ver mas").
export function BitacoraPanel({ client }) {
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  const hayConfig = fbListo(client);

  const [abierto, setAbierto] = useState(false);   // colapsado por defecto
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return localDateStr(d); });
  const [hasta, setHasta] = useState(localDateStr());
  const [preset, setPreset] = useState("7d");
  const [eventos, setEventos] = useState(null);
  const [truncado, setTruncado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cuentaFiltro, setCuentaFiltro] = useState("todas");
  const [vista, setVista] = useState("compacta"); // compacta | horas | tabla
  // Filtro por franja horaria: permite ir directo a la hora donde se movio el CPL
  const [horaIni, setHoraIni] = useState("");  // "" = sin filtro
  const [horaFin, setHoraFin] = useState("");
  const [limite, setLimite] = useState(50);       // cuantos pintar
  const [crudo, setCrudo] = useState(null);
  const [verCrudo, setVerCrudo] = useState(false);

  function aplicarPreset(p) {
    setPreset(p);
    const hoy = new Date();
    if (p === "ayer") {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const s = localDateStr(d);
      setDesde(s); setHasta(s);
      return;
    }
    let d = new Date();
    if (p === "hoy") d = hoy;
    else if (p === "7d") d.setDate(d.getDate() - 6);
    else if (p === "30d") d.setDate(d.getDate() - 29);
    setDesde(localDateStr(d));
    setHasta(localDateStr(hoy));
  }

  async function cargar(rangoDesde = desde, rangoHasta = hasta) {
    if (!hayConfig) { setError("Configura Facebook Ads en Métricas FB para usar la bitácora."); return; }
    setLoading(true); setError(null); setLimite(50);
    const r = await fetchBitacoraFB(token, cuentas, rangoDesde, rangoHasta);
    if (!r.ok) { setError(r.error || r.salud?.mensaje || "Error al consultar Facebook"); setLoading(false); return; }
    setEventos(r.eventos);
    setTruncado(!!r.truncado);
    setCrudo(r.muestraCruda);
    setLoading(false);
  }

  // Al aplicar un preset queremos consultar con las fechas nuevas, no las viejas
  function presetYCargar(p) {
    const hoy = new Date();
    let s, h;
    if (p === "ayer") { const d = new Date(); d.setDate(d.getDate() - 1); s = h = localDateStr(d); }
    else if (p === "hoy") { s = h = localDateStr(hoy); }
    else {
      const d = new Date();
      d.setDate(d.getDate() - (p === "7d" ? 6 : 29));
      s = localDateStr(d); h = localDateStr(hoy);
    }
    setPreset(p); setDesde(s); setHasta(h);
    cargar(s, h);
  }

  const TIPOS = [
    ["todos", "Todos"], ["presupuesto", "💰 Presupuesto"], ["estado", "⏯️ Pausas"],
    ["creacion", "➕ Creaciones"], ["puja", "🎯 Pujas"],
    ["segmentacion", "👥 Público"], ["creativo", "🖼️ Creativos"],
    ["programacion", "📅 Fechas"], ["facturacion", "💳 Pagos"], ["otro", "• Otros"],
  ];

  const lista = (eventos || [])
    .filter(e => cuentaFiltro === "todas" || e.cuenta === cuentaFiltro)
    .filter(e => filtroTipo === "todos" || e.tipo === filtroTipo)
    // Franja horaria: si se define, solo eventos dentro de esas horas
    .filter(e => {
      if (horaIni === "" && horaFin === "") return true;
      const h = new Date(e.ts).getHours();
      const ini = horaIni === "" ? 0 : parseInt(horaIni);
      const fin = horaFin === "" ? 23 : parseInt(horaFin);
      return h >= ini && h <= fin;
    })
    .filter(e => {
      if (!busqueda) return true;
      const q = busqueda.toLowerCase();
      return (e.objeto || "").toLowerCase().includes(q)
        || (e.texto || "").toLowerCase().includes(q)
        || (e.actor || "").toLowerCase().includes(q);
    });

  const visibles = lista.slice(0, limite);

  const conteo = {};
  (eventos || []).forEach(e => { conteo[e.tipo] = (conteo[e.tipo] || 0) + 1; });

  const nombreDia = (f) => {
    const hoy = localDateStr();
    const ayerD = new Date(); ayerD.setDate(ayerD.getDate() - 1);
    if (f === hoy) return "Hoy";
    if (f === localDateStr(ayerD)) return "Ayer";
    return new Date(f + "T12:00:00").toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" });
  };

  const colorTipo = (t) => ({
    presupuesto: "var(--green)", estado: "var(--amber)", creacion: "var(--accent)",
    puja: "#A855F7", segmentacion: "#EC4899", creativo: "#F59E0B",
    programacion: "var(--accent2)", facturacion: "var(--red)",
  }[t] || "var(--muted)");

  // Antes → despues, cuando extra_data lo trae
  // Formatea el antes → despues de extra_data.
  // Meta a veces manda valores planos ("5000") y a veces objetos anidados
  // ({daily_budget:"5000", lifetime_budget:null}). Hay que aplanarlos o se
  // imprime "[object Object]".
  function textoCambio(extra) {
    if (!extra || typeof extra !== "object") return null;

    // Campos de presupuesto conocidos, en orden de preferencia
    const CAMPOS_MONEDA = ["daily_budget", "lifetime_budget", "budget", "bid_amount", "spend_cap"];

    // Extrae un valor legible de lo que sea que venga
    function aplanar(v) {
      if (v === undefined || v === null || v === "") return null;
      if (typeof v === "object") {
        // Buscar primero un campo de dinero con valor
        for (const k of CAMPOS_MONEDA) {
          if (v[k] !== undefined && v[k] !== null && v[k] !== "") {
            return { valor: v[k], esMoneda: true };
          }
        }
        // Si no, tomar el primer campo con valor útil
        for (const [k, val] of Object.entries(v)) {
          if (val !== undefined && val !== null && val !== "" && typeof val !== "object") {
            return { valor: val, esMoneda: /budget|amount|cap|spend|cost/i.test(k) };
          }
        }
        return null;
      }
      return { valor: v, esMoneda: false };
    }

    const rawAntes = extra.old_value ?? extra.old_budget ?? extra.old_status ?? extra.old;
    const rawDespues = extra.new_value ?? extra.new_budget ?? extra.new_status ?? extra.new;
    const a = aplanar(rawAntes), d = aplanar(rawDespues);
    if (!a && !d) return null;

    const fmt = (x) => {
      if (!x) return "—";
      const n = Number(x.valor);
      // Los presupuestos de Meta vienen en centavos
      if (!isNaN(n) && (x.esMoneda || n > 1000)) return "$" + fmtNum(n / 100, 2);
      if (!isNaN(n)) return String(n);
      return String(x.valor);
    };
    return `${fmt(a)} → ${fmt(d)}`;
  }

  function exportarCSV() {
    const filas = [["Fecha y hora", "Tipo", "Cambio", "Detalle", "Objeto", "Autor", "Cuenta"]];
    lista.forEach(e => filas.push([
      new Date(e.ts).toLocaleString("es-EC"), e.tipo, e.texto,
      textoCambio(e.extra) || "", e.objeto || "", e.actor || "", e.cuenta || "",
    ]));
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // El nombre refleja la franja horaria si hay filtro activo
    const fr = (horaIni !== "" || horaFin !== "")
      ? `_${String(horaIni || 0).padStart(2, "0")}h-${String(horaFin || 23).padStart(2, "0")}h` : "";
    a.href = url; a.download = `bitacora_${(client.name || "cliente").replace(/[^a-z0-9]/gi, "_")}_${desde}_${hasta}${fr}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Cabecera colapsable: sin cargar nada hasta que el usuario abra ──
  if (!abierto) {
    return (
      <div className="card" style={{ marginBottom: "1rem", padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>📋 Bitácora de cambios</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Qué se modificó y cuándo — cruza con la gráfica de CPL para entender subidas o caídas
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setAbierto(true); cargar(); }} disabled={!hayConfig}>
            Abrir bitácora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📋 Bitácora de cambios</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {eventos ? `${lista.length} cambio${lista.length !== 1 ? "s" : ""}${truncado ? " (tope alcanzado)" : ""}` : "Cargando..."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {cuentas.length > 1 && (
            <select value={cuentaFiltro} onChange={e => setCuentaFiltro(e.target.value)} style={{ width: "auto", fontSize: 11, padding: "3px 8px" }}>
              <option value="todas">🏢 Todas ({cuentas.length})</option>
              {cuentas.map(c => <option key={c.id || c.adAccountId} value={c.nombre}>{c.nombre}</option>)}
            </select>
          )}
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={exportarCSV} disabled={!lista.length}>📥 CSV</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setAbierto(false)}>✕ Cerrar</button>
        </div>
      </div>

      {/* Rango */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div className="period-pills">
          {[["hoy", "Hoy"], ["ayer", "Ayer"], ["7d", "7 días"], ["30d", "30 días"]].map(([k, l]) => (
            <button key={k} className={"pill " + (preset === k ? "active" : "")} onClick={() => presetYCargar(k)}>{l}</button>
          ))}
        </div>
        <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPreset("custom"); }} max={hasta} style={{ width: "auto", fontSize: 12 }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>→</span>
        <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPreset("custom"); }} max={localDateStr()} style={{ width: "auto", fontSize: 12 }} />
        <BotonCarga cargando={loading} onClick={() => cargar()}
          textoCargando="Consultando...">🔄 Actualizar</BotonCarga>
      </div>

      <BarraCarga activo={loading} texto="Leyendo el registro de actividad de Facebook..." />

      {/* Vista + filtros */}
      {eventos && eventos.length > 0 && (<>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div className="period-pills">
            {[["compacta", "☰ Compacta"], ["horas", "🕐 Por hora"], ["tabla", "▦ Tabla"]].map(([k, l]) => (
              <button key={k} className={"pill " + (vista === k ? "active" : "")} onClick={() => setVista(k)}>{l}</button>
            ))}
          </div>
          <div style={{ position: "relative", width: 200 }}>
            <input type="text" value={busqueda} onChange={e => { setBusqueda(e.target.value); setLimite(50); }}
              placeholder="Buscar..." style={{ width: "100%", paddingLeft: 28, fontSize: 12 }} />
            <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 12 }}>🔍</span>
          </div>
        </div>

        {/* Filtro por franja horaria: ir directo a la hora donde se movio el CPL */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10,
          padding: "7px 10px", background: (horaIni !== "" || horaFin !== "") ? "rgba(77,159,255,.07)" : "var(--surface2)",
          borderRadius: 8, border: (horaIni !== "" || horaFin !== "") ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>🕐 Franja horaria:</span>
          <select value={horaIni} onChange={e => { setHoraIni(e.target.value); setLimite(50); }}
            style={{ width: "auto", fontSize: 11, padding: "2px 6px" }}>
            <option value="">Desde…</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>→</span>
          <select value={horaFin} onChange={e => { setHoraFin(e.target.value); setLimite(50); }}
            style={{ width: "auto", fontSize: 11, padding: "2px 6px" }}>
            <option value="">Hasta…</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:59</option>
            ))}
          </select>
          {/* Atajos a las franjas mas consultadas */}
          <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
            {[["Mañana", 6, 11], ["Tarde", 12, 17], ["Noche", 18, 23]].map(([l, a, b]) => (
              <button key={l} onClick={() => { setHoraIni(String(a)); setHoraFin(String(b)); setLimite(50); }}
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
                  border: (horaIni === String(a) && horaFin === String(b)) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: (horaIni === String(a) && horaFin === String(b)) ? "rgba(77,159,255,.15)" : "transparent",
                  color: (horaIni === String(a) && horaFin === String(b)) ? "var(--accent)" : "var(--muted)",
                }}>{l}</button>
            ))}
          </div>
          {(horaIni !== "" || horaFin !== "") && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "1px 8px", marginLeft: "auto" }}
              onClick={() => { setHoraIni(""); setHoraFin(""); setLimite(50); }}>✕ Quitar</button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          {TIPOS.filter(([k]) => k === "todos" || conteo[k]).map(([k, l]) => (
            <button key={k} onClick={() => { setFiltroTipo(k); setLimite(50); }}
              style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 11, cursor: "pointer",
                border: filtroTipo === k ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: filtroTipo === k ? "rgba(77,159,255,.12)" : "transparent",
                color: filtroTipo === k ? "var(--accent)" : "var(--muted)",
                fontWeight: filtroTipo === k ? 700 : 400,
              }}>
              {l} {k === "todos" ? eventos.length : conteo[k]}
            </button>
          ))}
        </div>
      </>)}

      {error && <div style={{ padding: "10px 14px", marginBottom: 12, borderRadius: 8, border: "1px solid var(--red)", color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {/* Contenido */}
      {loading && !eventos ? (
        <SkeletonTabla filas={8} columnas={4} />
      ) : !lista.length ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          {eventos && eventos.length ? "Sin cambios que coincidan con los filtros." : "Sin cambios registrados en este rango."}
        </div>
      ) : vista === "compacta" ? (
        // ── COMPACTA: una linea por cambio, lo mas liviano ──
        <div style={{ maxHeight: 420, overflowY: "auto", fontSize: 12 }}>
          {visibles.map((e, i) => {
            const d = new Date(e.ts);
            const cambio = textoCambio(e.extra);
            return (
              <div key={i} style={{
                display: "flex", gap: 8, padding: "4px 8px", alignItems: "baseline",
                background: i % 2 ? "transparent" : "var(--surface2)", borderRadius: 5,
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", flexShrink: 0, minWidth: 82 }}>
                  {nombreDia(localDateStr(d))} {d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ flexShrink: 0 }}>{e.icon}</span>
                <span style={{ color: colorTipo(e.tipo), whiteSpace: "nowrap", flexShrink: 0 }}>{e.texto}</span>
                {cambio && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text)", flexShrink: 0 }}>{cambio}</span>}
                {e.objeto && (
                  <span style={{ color: "var(--muted)", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} title={e.objeto}>
                    · {e.objeto}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : vista === "horas" ? (
        // ── POR HORA: agrupada, para ir directo a la hora de una caida ──
        (() => {
          const grupos = {};
          visibles.forEach(e => {
            const d = new Date(e.ts);
            const k = `${localDateStr(d)}|${String(d.getHours()).padStart(2, "0")}:00`;
            if (!grupos[k]) grupos[k] = [];
            grupos[k].push(e);
          });
          return (
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {Object.keys(grupos).sort().reverse().map(k => {
                const [dia, hora] = k.split("|");
                const evs = grupos[k];
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{nombreDia(dia)}</span>
                      <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{hora}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>· {evs.length}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                    {evs.map((e, i) => {
                      const cambio = textoCambio(e.extra);
                      return (
                        <div key={i} style={{ display: "flex", gap: 7, padding: "3px 8px 3px 14px", fontSize: 12, alignItems: "baseline" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                            {new Date(e.ts).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span style={{ flexShrink: 0 }}>{e.icon}</span>
                          <span style={{ color: colorTipo(e.tipo), flexShrink: 0 }}>{e.texto}</span>
                          {cambio && <span style={{ fontFamily: "var(--mono)", fontSize: 10, flexShrink: 0 }}>{cambio}</span>}
                          {e.objeto && <span style={{ color: "var(--muted)", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} title={e.objeto}>· {e.objeto}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        // ── TABLA ──
        <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          <table className="tbl" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", top: 0, background: "var(--surface)" }}>Fecha</th>
                <th style={{ position: "sticky", top: 0, background: "var(--surface)" }}>Cambio</th>
                <th style={{ position: "sticky", top: 0, background: "var(--surface)" }}>Objeto</th>
                <th style={{ position: "sticky", top: 0, background: "var(--surface)" }}>Autor</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e, i) => {
                const cambio = textoCambio(e.extra);
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 11 }}>
                      {new Date(e.ts).toLocaleString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <span style={{ marginRight: 4 }}>{e.icon}</span>
                      <span style={{ color: colorTipo(e.tipo) }}>{e.texto}</span>
                      {cambio && <span style={{ fontFamily: "var(--mono)", fontSize: 10, marginLeft: 6 }}>{cambio}</span>}
                    </td>
                    <td style={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={e.objeto}>
                      {e.objeto || <span style={{ color: "var(--border)" }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--muted)" }}>{e.actor || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ver más */}
      {lista.length > visibles.length && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setLimite(l => l + 100)}>
            Ver más ({lista.length - visibles.length} restantes)
          </button>
        </div>
      )}

      {/* Cobertura real: si el tope corto, avisar hasta que hora se alcanzo */}
      {eventos && eventos.length > 0 && (() => {
        const masViejo = eventos[eventos.length - 1];
        const masNuevo = eventos[0];
        if (!masViejo || !masNuevo) return null;
        const fmtT = (ts) => new Date(ts).toLocaleString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        // Detectar si Meta devolvio eventos fuera del rango pedido
        const iniPedido = new Date(desde + "T00:00:00").getTime();
        const finPedido = new Date(hasta + "T23:59:59").getTime();
        const fueraRango = eventos.filter(e => e.ts < iniPedido || e.ts > finPedido).length;
        return (
          <div style={{ fontSize: 10, color: truncado ? "var(--amber)" : "var(--muted)", marginTop: 8, textAlign: "center" }}>
            {truncado && "⚠️ "}
            Cobertura: {fmtT(masViejo.ts)} → {fmtT(masNuevo.ts)}
            {fueraRango > 0 && (
              <span style={{ color: "var(--amber)" }}> · {fueraRango} evento(s) fuera del rango pedido</span>
            )}
            {truncado && ` · Se alcanzó el tope de ${eventos.length} cambios; acota el rango de fechas para ver los más antiguos.`}
          </div>
        );
      })()}

      {/* Diagnóstico */}
      {crudo && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: "var(--muted)" }} onClick={() => setVerCrudo(v => !v)}>
            {verCrudo ? "▼" : "▶"} Respuesta cruda de la API (diagnóstico)
          </button>
          {verCrudo && (
            <pre style={{ marginTop: 6, padding: 9, background: "var(--surface2)", borderRadius: 7, fontSize: 10, overflowX: "auto", color: "var(--muted)", maxHeight: 180 }}>
              {JSON.stringify(crudo, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
        Meta conserva el registro aproximadamente 180 días.
      </div>
    </div>
  );
}
