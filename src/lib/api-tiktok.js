// Trafficker Pro — motor de TikTok Ads
// Espejo del motor de Meta, adaptado a las diferencias de su API:
// token en header Access-Token, advertiser_id, niveles AUCTION_*.
// Extraído de App.jsx (Fase 2 de modularización)

// ═══════════════════════════════════════════════════════════════════════════
// TIKTOK ADS — motor de métricas (espejo del de Facebook)
// ═══════════════════════════════════════════════════════════════════════════
// Diferencias con Meta que maneja este módulo:
//  · El token va en el header "Access-Token", no en la URL.
//  · Se usa advertiser_id (no act_<id>).
//  · Los niveles son AUCTION_CAMPAIGN / AUCTION_ADGROUP / AUCTION_AD.
//  · Las métricas se piden por nombre dentro de un array JSON.

export const TT_API = "https://business-api.tiktok.com/open_api/v1.3";

// ── Normalizador de cuentas TikTok (misma filosofía que getCuentasFB) ──────
export function getCuentasTT(client) {
  const tt = client?.ttConfig || {};
  let cuentas = [];
  if (Array.isArray(tt.cuentas) && tt.cuentas.length) cuentas = tt.cuentas;
  else if (tt.advertiserId) cuentas = [{ id: 1, nombre: "Cuenta principal", advertiserId: tt.advertiserId }];
  return cuentas
    .filter(c => c && (c.advertiserId || c.id))
    .map((c, i) => ({
      id: c.id ?? (i + 1),
      nombre: (c.nombre || "").trim() || `Cuenta ${i + 1}`,
      advertiserId: String(c.advertiserId || "").trim(),
    }))
    .filter(c => c.advertiserId);
}
export function getCuentasTTActivas(client) { return getCuentasTT(client).filter(c => c.advertiserId); }
export function getTokenTT(client) { return client?.ttConfig?.token || ""; }
export function ttListo(client) { return !!(getTokenTT(client) && getCuentasTTActivas(client).length); }

// Métricas que pedimos a TikTok (equivalentes a las de Meta)
export const TT_METRICAS = [
  "spend", "impressions", "reach", "clicks", "cpc", "cpm", "ctr", "frequency",
  "conversion", "cost_per_conversion", "conversion_rate",
  "complete_payment", "total_purchase_value",
];

// Llamada base a la API de TikTok con el token en el header
export async function ttFetch(path, params, token) {
  const url = new URL(TT_API + path);
  Object.entries(params || {}).forEach(([k, v]) => {
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  });
  const r = await fetch(url.toString(), { headers: { "Access-Token": token, "Content-Type": "application/json" } });
  const json = await r.json();
  // TikTok devuelve code=0 cuando todo va bien
  if (json.code !== 0) {
    const err = { message: json.message || "Error de TikTok", code: json.code };
    return { ok: false, error: err };
  }
  return { ok: true, data: json.data };
}

// Interpreta errores de TikTok para el badge de salud
export function diagnosticarSaludTT(algunOk, err) {
  if (algunOk && !err) return { estado: "ok", mensaje: "Conexión con TikTok OK", ts: Date.now() };
  if (!err) return { estado: "sin_datos", mensaje: "Sin datos en el rango (puede ser normal)", ts: Date.now() };
  const c = err.code;
  if (c === 40001 || c === 40100 || c === 40105) return { estado: "token_expirado", mensaje: "El token de TikTok expiró o es inválido. Genera uno nuevo en la tab 🎵 TikTok.", ts: Date.now(), code: c };
  if (c === 40002 || c === 40101) return { estado: "permisos", mensaje: "Faltan permisos en el token de TikTok. Revisa los scopes de la app.", ts: Date.now(), code: c };
  if (c === 50002 || c === 40016) return { estado: "rate_limit", mensaje: "TikTok limitó las consultas temporalmente. Espera unos minutos.", ts: Date.now(), code: c };
  if (c === "NETWORK") return { estado: "red", mensaje: "Error de red al conectar con TikTok.", ts: Date.now() };
  return { estado: "error", mensaje: err.message || "Error desconocido de TikTok", ts: Date.now(), code: c };
}

// Extrae los leads/conversiones de la respuesta de TikTok
export function ttLeads(m) {
  // "conversion" es la métrica principal de conversiones en TikTok
  const conv = parseFloat(m.conversion) || 0;
  if (conv > 0) return conv;
  // Fallback: registros completados si el objetivo es lead gen
  const reg = parseFloat(m.total_registration) || parseFloat(m.registration) || 0;
  return reg;
}

// ── MÉTRICAS POR NIVEL (campaign | adgroup | ad) ──────────────────────────
export async function fetchMetricasTTPorNivel(token, cuentas, since, until, nivel, soloActivas = false) {
  const activas = (cuentas || []).filter(c => c.advertiserId);
  if (!activas.length) return { ok: false, error: "Sin cuentas configuradas", salud: { estado: "sin_config" } };

  const cfg = {
    campaign: { dataLevel: "AUCTION_CAMPAIGN", dim: "campaign_id", nameF: "campaign_name", parentName: null },
    adgroup:  { dataLevel: "AUCTION_ADGROUP",  dim: "adgroup_id",  nameF: "adgroup_name",  parentName: "campaign_name" },
    ad:       { dataLevel: "AUCTION_AD",       dim: "ad_id",       nameF: "ad_name",       parentName: "adgroup_name" },
  }[nivel];
  if (!cfg) return { ok: false, error: "Nivel inválido", salud: { estado: "error" } };

  const out = [];
  let algunError = null, algunOk = false;

  for (const cuenta of activas) {
    try {
      // Campos de nombre: TikTok los entrega si se piden como métricas
      const metricas = [...TT_METRICAS, cfg.nameF];
      if (cfg.parentName) metricas.push(cfg.parentName);

      let page = 1, totalPages = 1;
      do {
        const params = {
          advertiser_id: cuenta.advertiserId,
          report_type: "BASIC",
          data_level: cfg.dataLevel,
          dimensions: [cfg.dim],
          metrics: metricas,
          start_date: since,
          end_date: until,
          page, page_size: 200,
        };
        if (soloActivas) {
          params.filtering = [{ field_name: "campaign_status", filter_type: "IN", filter_value: JSON.stringify(["STATUS_DELIVERY_OK"]) }];
        }
        const r = await ttFetch("/report/integrated/get/", params, token);
        if (!r.ok) { algunError = r.error; break; }
        algunOk = true;
        const lista = r.data?.list || [];
        totalPages = r.data?.page_info?.total_page || 1;
        for (const row of lista) {
          const m = row.metrics || {};
          const dims = row.dimensions || {};
          const inv = parseFloat(m.spend) || 0;
          const leads = ttLeads(m);
          out.push({
            id: String(dims[cfg.dim] || ""),
            nombre: m[cfg.nameF] || "(sin nombre)",
            padre: cfg.parentName ? (m[cfg.parentName] || "") : "",
            cuenta: cuenta.nombre,
            inv,
            leads,
            impr: parseFloat(m.impressions) || 0,
            reach: parseFloat(m.reach) || 0,
            clicks: parseFloat(m.clicks) || 0,
            cpm: parseFloat(m.cpm) || 0,
            ctr: parseFloat(m.ctr) || 0,
            frequency: parseFloat(m.frequency) || 0,
            cpl: leads > 0 ? inv / leads : 0,
            estado: "ACTIVE", // TikTok no devuelve estado en el reporte básico
          });
        }
        page++;
      } while (page <= totalPages && page <= 20); // tope de seguridad
    } catch (e) {
      algunError = { message: e.message, code: "NETWORK" };
      console.error(`[TikTok ${nivel}]`, cuenta.nombre, e.message);
    }
  }
  return { ok: algunOk || !algunError, campanas: out, salud: diagnosticarSaludTT(algunOk, algunError), errorFB: algunError };
}

// ── GASTO POR PAÍS (TikTok soporta el breakdown "country_code") ───────────
export async function fetchGastoPorPaisTT(token, cuentas, since, until) {
  const activas = (cuentas || []).filter(c => c.advertiserId);
  if (!activas.length) return { ok: false, error: "Sin cuentas configuradas" };
  const porPais = {}, porCuenta = {};
  for (const cuenta of activas) {
    try {
      const r = await ttFetch("/report/integrated/get/", {
        advertiser_id: cuenta.advertiserId,
        report_type: "AUDIENCE",
        data_level: "AUCTION_ADVERTISER",
        dimensions: ["country_code"],
        metrics: ["spend", "impressions", "conversion"],
        start_date: since, end_date: until,
        page: 1, page_size: 200,
      }, token);
      if (!r.ok) { console.warn("[TikTok países]", cuenta.nombre, r.error.message); continue; }
      for (const row of (r.data?.list || [])) {
        const code = row.dimensions?.country_code || "??";
        const m = row.metrics || {};
        const inv = parseFloat(m.spend) || 0;
        const leads = ttLeads(m);
        if (!porPais[code]) porPais[code] = { inv: 0, leads: 0, impr: 0, reach: 0 };
        porPais[code].inv += inv;
        porPais[code].leads += leads;
        porPais[code].impr += parseFloat(m.impressions) || 0;
        if (!porCuenta[cuenta.nombre]) porCuenta[cuenta.nombre] = { inv: 0, leads: 0, impr: 0, adAccountId: cuenta.advertiserId };
        porCuenta[cuenta.nombre].inv += inv;
        porCuenta[cuenta.nombre].leads += leads;
      }
    } catch (e) { console.error("[TikTok países]", cuenta.nombre, e.message); }
  }
  return { ok: true, porPais, porCuenta };
}

// ── PRESUPUESTO ACTIVO (campañas + adgroups, como en Meta) ────────────────
export async function fetchPresupuestoTT(token, cuentas) {
  const activas = (cuentas || []).filter(c => c.advertiserId);
  if (!activas.length) return { ok: false, error: "Sin cuentas configuradas" };
  const monoPais = {}, compartidos = [], presupPorCuenta = {};
  let totalDiario = 0;

  for (const cuenta of activas) {
    if (!presupPorCuenta[cuenta.nombre]) presupPorCuenta[cuenta.nombre] = { diario: 0, adsets: 0, campanasCBO: 0, adAccountId: cuenta.advertiserId };
    try {
      // Campañas con presupuesto propio (equivalente a CBO)
      const cboPorCampana = {};
      const rc = await ttFetch("/campaign/get/", {
        advertiser_id: cuenta.advertiserId,
        filtering: { primary_status: "STATUS_DELIVERY_OK" },
        page: 1, page_size: 200,
      }, token);
      if (rc.ok) {
        for (const c of (rc.data?.list || [])) {
          const b = parseFloat(c.budget) || 0;
          if (b > 0 && c.budget_mode !== "BUDGET_MODE_INFINITE") {
            cboPorCampana[c.campaign_id] = { daily: c.budget_mode === "BUDGET_MODE_DAY" ? b : 0, life: c.budget_mode === "BUDGET_MODE_TOTAL" ? b : 0, nombre: c.campaign_name };
          }
        }
      }
      // Grupos de anuncios
      const ra = await ttFetch("/adgroup/get/", {
        advertiser_id: cuenta.advertiserId,
        filtering: { primary_status: "STATUS_DELIVERY_OK" },
        page: 1, page_size: 200,
      }, token);
      const paisesPorCampanaCBO = {};
      if (ra.ok) {
        for (const a of (ra.data?.list || [])) {
          const paises = (a.location_ids || []).map(String); // TikTok usa IDs de ubicación
          const esCBO = !!cboPorCampana[a.campaign_id];
          if (esCBO) {
            if (!paisesPorCampanaCBO[a.campaign_id]) paisesPorCampanaCBO[a.campaign_id] = new Set();
            paises.forEach(p => paisesPorCampanaCBO[a.campaign_id].add(p));
            continue;
          }
          const b = parseFloat(a.budget) || 0;
          if (b <= 0) continue;
          const daily = a.budget_mode === "BUDGET_MODE_DAY" ? b : 0;
          totalDiario += daily;
          presupPorCuenta[cuenta.nombre].diario += daily;
          presupPorCuenta[cuenta.nombre].adsets += 1;
          compartidos.push({ nombre: a.adgroup_name || "(sin nombre)", cuenta: cuenta.nombre, paises: ["TT"], budget: b, tipo: daily ? "diario" : "total", nivel: "grupo" });
        }
      }
      // Presupuestos a nivel campaña
      for (const [id, info] of Object.entries(cboPorCampana)) {
        const b = info.daily || info.life;
        totalDiario += info.daily;
        presupPorCuenta[cuenta.nombre].diario += info.daily;
        presupPorCuenta[cuenta.nombre].campanasCBO += 1;
        compartidos.push({ nombre: info.nombre, cuenta: cuenta.nombre, paises: ["TT"], budget: b, tipo: info.daily ? "diario" : "total", nivel: "campaña" });
      }
    } catch (e) { console.error("[TikTok presup]", cuenta.nombre, e.message); }
  }
  return { ok: true, monoPais, compartidos, totalDiario, presupPorCuenta };
}
