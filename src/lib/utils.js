// Trafficker Pro — utilidades compartidas
// Formatters, fechas y normalizadores de cuentas publicitarias.
// Extraído de App.jsx (Fase 1 de modularización)

export const fmtNum = (n, dec = 0) => {
  if (n === "" || n === null || n === undefined || isNaN(Number(n))) return "—";
  const num = Number(n);
  // Para valores con decimales (precios unitarios como CPL, CPC, CPM):
  // usar punto decimal sin separador de miles para evitar ambigüedad
  // Ej: 1434.44 → "1434.44" no "1.434,44"
  if (dec >= 2) {
    return num.toFixed(dec);
  }
  return num.toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};
export const fmtUSD = (n) => n && !isNaN(n) ? "$" + fmtNum(n, 2) : "—";
export const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
export const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;
// Formato de fecha compacto: "2026-06-04" → "04/06/26"
export const fmtDate = (d) => { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y.slice(2)}`; };
export const parseNum = (v) => v === "" ? "" : parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0;

// ── Fecha local del dispositivo (no UTC) ──────────────────────────────────────
// Usa siempre la fecha/hora local del usuario, sin importar su zona horaria
// Soluciona el bug donde a las 7pm en Ecuador (UTC-5) se mostraba el día siguiente
// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZADOR DE CUENTAS FB — fuente única de verdad para multicuenta
// Devuelve SIEMPRE un array de cuentas normalizado, sin importar el formato
// en que esté guardado el cliente (viejo singular o nuevo array). Esto evita
// tener que reescribir código o reconfigurar cada cliente nuevo.
// ═══════════════════════════════════════════════════════════════════════════
export function getCuentasFB(client) {
  const fb = client?.fbConfig || {};
  let cuentas = [];
  // Formato nuevo: array de cuentas
  if (Array.isArray(fb.cuentas) && fb.cuentas.length) {
    cuentas = fb.cuentas;
  }
  // Formato viejo: adAccountId singular → migrar en caliente
  else if (fb.adAccountId) {
    cuentas = [{ id: 1, nombre: "Cuenta principal", adAccountId: fb.adAccountId }];
  }
  // Normalizar cada cuenta: garantizar id, nombre y adAccountId limpio
  return cuentas
    .filter(c => c && (c.adAccountId || c.id))
    .map((c, i) => ({
      id: c.id ?? (i + 1),
      nombre: (c.nombre || "").trim() || `Cuenta ${i + 1}`,
      // Limpiar el adAccountId: quitar "act_" si viene incluido, y espacios
      adAccountId: String(c.adAccountId || "").replace(/^act_/, "").trim(),
    }))
    .filter(c => c.adAccountId); // solo cuentas con ID real
}

// Devuelve solo las cuentas con adAccountId válido (listas para consultar FB)
export function getCuentasFBActivas(client) {
  return getCuentasFB(client).filter(c => c.adAccountId);
}

// El token de FB del cliente (formato único)
export function getTokenFB(client) {
  return client?.fbConfig?.token || "";
}

// ¿El cliente tiene FB configurado y listo para consultar?
export function fbListo(client) {
  return !!(getTokenFB(client) && getCuentasFBActivas(client).length);
}

export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function localDateTimeStr(date = new Date()) {
  return `${localDateStr(date)}T${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
}

// Input numérico - solución definitiva con input type=number
// Maneja su propio string interno para no perder el cursor ni el punto decimal
