// Trafficker Pro — motor de sincronizacion automatica diaria
// Cierra el dia anterior a partir de las 8am y refresca el dia en curso.
// Corre en el navegador mientras la app este abierta; si estuvo cerrada
// varios dias, recupera los faltantes al volver.
// Extraído de App.jsx (Fase 2 de modularización)

import { useEffect, useRef } from "react";
import { getCuentasFBActivas, getTokenFB, fbListo, localDateStr } from "./utils.js";

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-SYNC DIARIO — sincroniza métricas de FB sin intervención manual
// ═══════════════════════════════════════════════════════════════════════════
// Diseño:
//  · Corre al abrir la app y luego cada 30 min mientras esté abierta.
//  · A partir de la HORA_CIERRE (8am por defecto) sincroniza el DÍA ANTERIOR
//    completo ("día caído"), que es el dato definitivo.
//  · Durante el día también refresca HOY cada cierto tiempo (dato parcial).
//  · Registra en el cliente qué días ya cerró para no repetir trabajo.
//  · Blindado: no corre dos veces a la vez, respeta errores de FB, no pisa
//    datos si la respuesta viene vacía, y cada cliente lleva su propio estado.

export const AUTOSYNC_HORA_CIERRE = 8;        // a partir de las 8am cierra el día anterior
export const AUTOSYNC_INTERVALO_MS = 30 * 60 * 1000; // revisar cada 30 min
export const AUTOSYNC_REFRESCO_HOY_MIN = 60;  // refrescar "hoy" como máximo cada 60 min

// Construye el registro diario a partir de la respuesta de FB (misma lógica
// que la sincronización manual, para que los datos sean idénticos).
export function construirRegistroDesdeFB(data, fecha, metricas) {
  if (!data) return null;
  const inv = parseFloat(data.spend) || 0;
  const acts = data.actions || [];
  const LEAD_TYPES = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
  const LEAD_EXCLUIR = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);
  let leads = 0;
  for (const t of LEAD_TYPES) {
    if (LEAD_EXCLUIR.has(t)) continue;
    const a = acts.find(x => x.action_type === t);
    if (a) { const v = parseFloat(a.value) || 0; if (v > leads) leads = v; }
  }
  if (leads === 0) {
    acts.filter(x => !LEAD_EXCLUIR.has(x.action_type) && x.action_type?.includes("registration"))
      .forEach(x => { const v = parseFloat(x.value) || 0; if (v > leads) leads = v; });
  }
  let ventas = 0;
  const compra = acts.find(a => a.action_type === "purchase" || a.action_type === "omni_purchase");
  if (compra) ventas = parseFloat(compra.value) || 0;

  return {
    date: fecha,
    inversion: +inv.toFixed(2),
    alcance: Math.round(parseFloat(data.reach) || 0),
    impresiones: Math.round(parseFloat(data.impressions) || 0),
    cpm: +(parseFloat(data.cpm) || 0).toFixed(2),
    cpc: +(parseFloat(data.cpc) || 0).toFixed(2),
    ctr: +(parseFloat(data.ctr) || 0).toFixed(2),
    clics_enlace: Math.round(parseFloat(data.inline_link_clicks) || 0),
    leads: Math.round(leads),
    resultados: Math.round(leads),
    ventas: Math.round(ventas),
    cpa: leads > 0 ? +(inv / leads).toFixed(2) : 0,
    frecuencia: +(parseFloat(data.frequency) || 0).toFixed(2),
  };
}

// Sincroniza UNA fecha para UN cliente sumando todas sus cuentas.
// Devuelve { ok, registro, error }
export async function autoSyncFechaCliente(client, fecha) {
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  if (!token || !cuentas.length) return { ok: false, error: "sin_config" };

  const campos = "spend,reach,impressions,cpm,cpc,ctr,inline_link_clicks,actions,frequency";
  let acumulado = null;
  let huboError = null;
  let huboDatos = false;

  for (const cuenta of cuentas) {
    try {
      const url = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights`);
      url.searchParams.set("fields", campos);
      // time_range como JSON: since/until sueltos son ignorados por /insights
      url.searchParams.set("time_range", JSON.stringify({ since: fecha, until: fecha }));
      url.searchParams.set("level", "account");
      url.searchParams.set("access_token", token);
      const json = await fetch(url.toString()).then(r => r.json());
      if (json.error) { huboError = json.error; continue; }
      const d = (json.data || [])[0];
      if (!d) continue; // sin gasto ese día en esta cuenta
      huboDatos = true;
      const reg = construirRegistroDesdeFB(d, fecha);
      if (!acumulado) { acumulado = reg; }
      else {
        // Sumar cuentas: aditivos se suman, promedios se recalculan
        acumulado.inversion   = +(acumulado.inversion + reg.inversion).toFixed(2);
        acumulado.alcance     += reg.alcance;
        acumulado.impresiones += reg.impresiones;
        acumulado.clics_enlace += reg.clics_enlace;
        acumulado.leads       += reg.leads;
        acumulado.resultados  += reg.resultados;
        acumulado.ventas      += reg.ventas;
        acumulado.cpm = acumulado.impresiones > 0 ? +((acumulado.inversion / acumulado.impresiones) * 1000).toFixed(2) : 0;
        acumulado.cpc = acumulado.clics_enlace > 0 ? +(acumulado.inversion / acumulado.clics_enlace).toFixed(2) : 0;
        acumulado.ctr = acumulado.impresiones > 0 ? +((acumulado.clics_enlace / acumulado.impresiones) * 100).toFixed(2) : 0;
        acumulado.cpa = acumulado.leads > 0 ? +(acumulado.inversion / acumulado.leads).toFixed(2) : 0;
      }
    } catch (e) {
      huboError = { message: e.message, code: "NETWORK" };
    }
  }

  if (!huboDatos) {
    // Sin datos: puede ser normal (no hubo pauta) o un error real
    return { ok: !huboError, registro: null, error: huboError, vacio: true };
  }
  return { ok: true, registro: acumulado, error: huboError };
}

// Decide qué fechas hay que sincronizar para un cliente y las ejecuta.
// Se apoya en client.autoSyncEstado = { ultimoCierre, ultimoRefrescoHoy, errores }
export async function ejecutarAutoSyncCliente(client, onUpdate, opts = {}) {
  const estado = client.autoSyncEstado || {};
  const ahora = new Date();
  const hoy = localDateStr(ahora);
  const ayerD = new Date(ahora); ayerD.setDate(ayerD.getDate() - 1);
  const ayer = localDateStr(ayerD);

  const tareas = [];

  // 1) Cierre de días pasados (dato definitivo) — pasada la hora de cierre.
  // Si la app estuvo cerrada varios días, recupera los faltantes (hasta 7)
  // para no dejar huecos en la tabla de métricas diarias.
  if (ahora.getHours() >= AUTOSYNC_HORA_CIERRE && estado.ultimoCierre !== ayer) {
    const faltantes = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(ahora); d.setDate(d.getDate() - i);
      const f = localDateStr(d);
      if (estado.ultimoCierre && f <= estado.ultimoCierre) break; // ya cerrado
      faltantes.push(f);
    }
    // De más antiguo a más reciente, para que ultimoCierre quede correcto
    faltantes.reverse().forEach(f => tareas.push({ fecha: f, tipo: "cierre" }));
  }

  // 2) Refresco del día en curso (dato parcial) — con throttle
  const ultRefresco = estado.ultimoRefrescoHoy ? new Date(estado.ultimoRefrescoHoy) : null;
  const minsDesde = ultRefresco ? (ahora - ultRefresco) / 60000 : Infinity;
  if (opts.forzarHoy || minsDesde >= AUTOSYNC_REFRESCO_HOY_MIN) {
    tareas.push({ fecha: hoy, tipo: "hoy" });
  }

  if (!tareas.length) return { ok: true, sinTareas: true };

  const registros = [...(client.records || [])];
  let cambios = 0;
  const nuevoEstado = { ...estado };
  let ultimoError = null;

  for (const t of tareas) {
    const r = await autoSyncFechaCliente(client, t.fecha);
    if (!r.ok) { ultimoError = r.error; continue; }
    if (r.registro) {
      const idx = registros.findIndex(x => x.date === t.fecha);
      if (idx >= 0) {
        // Preservar campos manuales (WhatsApp, notas, campañas) al actualizar
        const previo = registros[idx];
        registros[idx] = {
          ...previo, ...r.registro,
          personas_wp: previo.personas_wp, costo_wp: previo.costo_wp,
          notas_dia: previo.notas_dia, campanas: previo.campanas,
          conjuntos: previo.conjuntos, anuncios: previo.anuncios,
        };
      } else {
        registros.push(r.registro);
      }
      cambios++;
    }
    if (t.tipo === "cierre") nuevoEstado.ultimoCierre = t.fecha;
    if (t.tipo === "hoy") nuevoEstado.ultimoRefrescoHoy = ahora.toISOString();
  }

  nuevoEstado.ultimaEjecucion = ahora.toISOString();
  if (ultimoError) {
    nuevoEstado.ultimoError = { mensaje: ultimoError.message, code: ultimoError.code, ts: Date.now() };
  } else {
    delete nuevoEstado.ultimoError;
  }

  if (cambios > 0 || JSON.stringify(nuevoEstado) !== JSON.stringify(estado)) {
    registros.sort((a, b) => a.date.localeCompare(b.date));
    const actualizado = { ...client, records: registros, autoSyncEstado: nuevoEstado };
    await onUpdate(actualizado);
    return { ok: true, cambios, estado: nuevoEstado };
  }
  return { ok: true, cambios: 0, estado: nuevoEstado };
}

// Hook: corre el auto-sync para TODOS los clientes con FB configurado.
// Se monta una sola vez en el nivel superior de la app.
export function useAutoSyncDiario(clients, onUpdateClient, habilitado = true) {
  const corriendoRef = useRef(false);
  const clientsRef = useRef(clients);
  clientsRef.current = clients;

  useEffect(() => {
    if (!habilitado) return;

    async function ciclo() {
      // Blindaje: nunca dos ejecuciones simultáneas
      if (corriendoRef.current) return;
      corriendoRef.current = true;
      try {
        const lista = (clientsRef.current || []).filter(c =>
          c && !String(c.id).startsWith("__") && fbListo(c) && c.fbConfig?.autoSync !== false
        );
        for (const c of lista) {
          try {
            const r = await ejecutarAutoSyncCliente(c, onUpdateClient);
            if (r.cambios > 0) console.log(`[AutoSync] ${c.name}: ${r.cambios} día(s) actualizados`);
          } catch (e) {
            console.error(`[AutoSync] ${c?.name}:`, e.message);
          }
        }
      } finally {
        corriendoRef.current = false;
      }
    }

    // Primera corrida poco después de abrir (deja respirar a la UI)
    const t0 = setTimeout(ciclo, 4000);
    const iv = setInterval(ciclo, AUTOSYNC_INTERVALO_MS);
    return () => { clearTimeout(t0); clearInterval(iv); };
    /* eslint-disable-next-line */
  }, [habilitado]);
}
