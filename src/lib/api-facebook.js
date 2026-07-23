// Trafficker Pro — motor de Meta Ads (Facebook / Instagram)
// IMPORTANTE: /insights ignora since/until como parametros sueltos.
// Siempre usar time_range={"since":...,"until":...} como JSON.
// Extraído de App.jsx (Fase 2 de modularización)

// ─── FACEBOOK ADS INTEGRATION ────────────────────────────────────────────────

// Métricas disponibles de Facebook Ads API
export const FB_METRICAS_DISPONIBLES = [
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

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISIS POR PAÍS — gasto real (breakdowns) + presupuesto programado (targeting)
// ═══════════════════════════════════════════════════════════════════════════

// Códigos ISO-3166 alpha-2 → nombre en español + bandera emoji (los mas comunes en LATAM/pauta)
export const PAISES_INFO = {
  EC:{n:"Ecuador",f:"🇪🇨"}, MX:{n:"México",f:"🇲🇽"}, CO:{n:"Colombia",f:"🇨🇴"},
  PE:{n:"Perú",f:"🇵🇪"}, AR:{n:"Argentina",f:"🇦🇷"}, CL:{n:"Chile",f:"🇨🇱"},
  US:{n:"Estados Unidos",f:"🇺🇸"}, ES:{n:"España",f:"🇪🇸"}, BO:{n:"Bolivia",f:"🇧🇴"},
  VE:{n:"Venezuela",f:"🇻🇪"}, PA:{n:"Panamá",f:"🇵🇦"}, GT:{n:"Guatemala",f:"🇬🇹"},
  CR:{n:"Costa Rica",f:"🇨🇷"}, DO:{n:"Rep. Dominicana",f:"🇩🇴"}, HN:{n:"Honduras",f:"🇭🇳"},
  SV:{n:"El Salvador",f:"🇸🇻"}, NI:{n:"Nicaragua",f:"🇳🇮"}, PY:{n:"Paraguay",f:"🇵🇾"},
  UY:{n:"Uruguay",f:"🇺🇾"}, BR:{n:"Brasil",f:"🇧🇷"}, PR:{n:"Puerto Rico",f:"🇵🇷"},
  CA:{n:"Canadá",f:"🇨🇦"}, IT:{n:"Italia",f:"🇮🇹"}, FR:{n:"Francia",f:"🇫🇷"},
  DE:{n:"Alemania",f:"🇩🇪"}, GB:{n:"Reino Unido",f:"🇬🇧"},
};
export function paisNombre(code){ return PAISES_INFO[code]?.n || code || "Desconocido"; }
export function paisBandera(code){ return PAISES_INFO[code]?.f || "🌐"; }

// ── GASTO REAL por país: usa breakdowns=country (lo que ya se ejecutó) ──
// Suma sobre todas las cuentas activas. Devuelve { ok, porPais:{CODE:{inv,leads,impr,reach}} }
// ── MÉTRICAS REALES POR CAMPAÑA: level=campaign (datos exactos de cada una) ──
// Devuelve { ok, campanas:[{id,nombre,cuenta,inv,leads,impr,reach,clicks,cpm,ctr,cpl,estado}] }
// ── MÉTRICAS REALES POR NIVEL (campaign | adset | ad) — motor unificado ──────
// Trae datos exactos desde FB para cualquier nivel de la jerarquía. Devuelve
// también estado (activo/pausado) y un objeto de "salud" de la conexión.
// nivel: "campaign" | "adset" | "ad"
export async function fetchMetricasPorNivel(token, cuentas, since, until, nivel, soloActivas = false) {
  const activas = (cuentas||[]).filter(c => c.adAccountId);
  if (!activas.length) return { ok:false, error:"Sin cuentas configuradas", salud:{estado:"sin_config"} };

  const LEAD_TYPES = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
  const LEAD_EXCLUIR = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);

  // Config por nivel: campos de id/nombre, edge de estado, y campo padre
  const cfg = {
    campaign: { idF:"campaign_id", nameF:"campaign_name", edge:"campaigns", parentF:null, parentName:null },
    adset:    { idF:"adset_id",    nameF:"adset_name",    edge:"adsets",    parentF:"campaign_id", parentName:"campaign_name" },
    ad:       { idF:"ad_id",       nameF:"ad_name",       edge:"ads",       parentF:"adset_id",    parentName:"adset_name" },
  }[nivel];
  if (!cfg) return { ok:false, error:"Nivel inválido", salud:{estado:"error"} };

  const out = [];
  const estadoPorId = {};
  let algunError = null;
  let algunOk = false;

  for (const cuenta of activas) {
    try {
      // 1) Estado (active/paused) de cada objeto del nivel
      try {
        const eUrl = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/${cfg.edge}`);
        eUrl.searchParams.set("fields", "id,effective_status");
        eUrl.searchParams.set("limit", "500");
        eUrl.searchParams.set("access_token", token);
        let en = eUrl.toString();
        while (en) {
          const ej = await fetch(en).then(r=>r.json());
          if (ej.error) break;
          (ej.data||[]).forEach(o => { estadoPorId[o.id] = o.effective_status; });
          en = ej.paging?.next || null;
        }
      } catch {}

      // 2) Insights al nivel pedido
      const campos = [cfg.idF, cfg.nameF, "spend","actions","impressions","reach","inline_link_clicks","cpm","ctr","frequency"];
      if (cfg.parentF)    campos.push(cfg.parentF);
      if (cfg.parentName) campos.push(cfg.parentName);
      const url = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights`);
      url.searchParams.set("fields", campos.join(","));
      url.searchParams.set("time_range", JSON.stringify({ since, until }));
      url.searchParams.set("level", nivel);
      // Filtrar solo activos desde el origen acelera mucho la consulta
      if (soloActivas) {
        const statusField = nivel === "campaign" ? "campaign.effective_status"
          : nivel === "adset" ? "adset.effective_status" : "ad.effective_status";
        url.searchParams.set("filtering", JSON.stringify([{ field: statusField, operator: "IN", value: ["ACTIVE"] }]));
      }
      url.searchParams.set("limit", "500");
      url.searchParams.set("access_token", token);
      let next = url.toString();
      while (next) {
        const json = await fetch(next).then(r=>r.json());
        if (json.error) {
          algunError = json.error;
          console.warn(`[${nivel}]`, cuenta.nombre, json.error.message);
          break;
        }
        algunOk = true;
        for (const d of (json.data||[])) {
          const inv = parseFloat(d.spend)||0;
          const acts = d.actions||[];
          let nl = 0;
          for (const t of LEAD_TYPES) { if(LEAD_EXCLUIR.has(t))continue; const a=acts.find(x=>x.action_type===t); if(a){const v=parseFloat(a.value)||0;if(v>nl)nl=v;} }
          if (nl===0) acts.filter(x=>!LEAD_EXCLUIR.has(x.action_type)&&x.action_type?.includes("registration")).forEach(x=>{const v=parseFloat(x.value)||0;if(v>nl)nl=v;});
          const id = d[cfg.idF];
          out.push({
            id,
            nombre: d[cfg.nameF] || "(sin nombre)",
            padre: cfg.parentName ? (d[cfg.parentName]||"") : "",
            padreId: cfg.parentF ? (d[cfg.parentF]||"") : "",
            cuenta: cuenta.nombre,
            inv,
            leads: nl,
            impr: parseFloat(d.impressions)||0,
            reach: parseFloat(d.reach)||0,
            clicks: parseFloat(d.inline_link_clicks)||0,
            cpm: parseFloat(d.cpm)||0,
            ctr: parseFloat(d.ctr)||0,
            frequency: parseFloat(d.frequency)||0,
            cpl: nl>0 ? inv/nl : 0,
            estado: estadoPorId[id] || "UNKNOWN",
          });
        }
        next = json.paging?.next || null;
      }
    } catch(e) {
      algunError = { message: e.message, code: "NETWORK" };
      console.error(`[${nivel}]`, cuenta.nombre, e.message);
    }
  }

  // Diagnóstico de salud de la conexión con FB
  const salud = diagnosticarSaludFB(algunOk, algunError);
  return { ok: algunOk || !algunError, campanas: out, salud, errorFB: algunError };
}

// Interpreta el resultado de FB para dar un estado de salud legible
export function diagnosticarSaludFB(algunOk, err) {
  if (algunOk && !err) return { estado:"ok", mensaje:"Conexión con Facebook OK", ts: Date.now() };
  if (!err) return { estado:"sin_datos", mensaje:"Sin datos en el rango (puede ser normal)", ts: Date.now() };
  const code = err.code;
  // Códigos típicos de token expirado / permisos
  if (code === 190) return { estado:"token_expirado", mensaje:"El token de Facebook expiró o fue revocado. Genera uno nuevo en la tab 📘 Facebook.", ts: Date.now(), code };
  if (code === 200 || code === 10 || code === 803) return { estado:"permisos", mensaje:"Faltan permisos en el token de Facebook (ads_read). Revisa la configuración.", ts: Date.now(), code };
  if (code === 17 || code === 4 || code === 613) return { estado:"rate_limit", mensaje:"Facebook limitó las consultas temporalmente. Espera unos minutos.", ts: Date.now(), code };
  if (code === "NETWORK") return { estado:"red", mensaje:"Error de red al conectar con Facebook.", ts: Date.now() };
  return { estado:"error", mensaje: err.message || "Error desconocido de Facebook", ts: Date.now(), code };
}

// Wrapper de compatibilidad (por si algo aún llama al nombre viejo)
export async function fetchMetricasPorCampana(token, cuentas, since, until) {
  return fetchMetricasPorNivel(token, cuentas, since, until, "campaign");
}

export async function fetchGastoPorPais(token, cuentas, since, until) {
  const activas = (cuentas||[]).filter(c => c.adAccountId);
  if (!activas.length) return { ok:false, error:"Sin cuentas configuradas" };
  const porPais = {};
  const porCuenta = {};      // nombre cuenta → { inv, leads, impr, adAccountId }
  const porPaisCuenta = {};  // "CODE|cuenta" → { inv, leads } para filtrar por cuenta
  const LEAD_TYPES = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
  const LEAD_EXCLUIR = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);
  for (const cuenta of activas) {
    try {
      const url = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights`);
      url.searchParams.set("fields", "spend,actions,impressions,reach");
      url.searchParams.set("breakdowns", "country");
      url.searchParams.set("time_range", JSON.stringify({ since, until }));
      url.searchParams.set("level", "account");
      url.searchParams.set("limit", "500");
      url.searchParams.set("access_token", token);
      let next = url.toString();
      while (next) {
        const json = await fetch(next).then(r=>r.json());
        if (json.error) { console.warn("[Países]", cuenta.nombre, json.error.message); break; }
        for (const d of (json.data||[])) {
          const code = d.country || "??";
          if (!porPais[code]) porPais[code] = { inv:0, leads:0, impr:0, reach:0 };
          const _inv = parseFloat(d.spend)||0;
          porPais[code].inv   += _inv;
          porPais[code].impr  += parseFloat(d.impressions)||0;
          porPais[code].reach += parseFloat(d.reach)||0;
          // Acumulado por cuenta publicitaria
          if (!porCuenta[cuenta.nombre]) porCuenta[cuenta.nombre] = { inv:0, leads:0, impr:0, adAccountId: cuenta.adAccountId };
          porCuenta[cuenta.nombre].inv  += _inv;
          porCuenta[cuenta.nombre].impr += parseFloat(d.impressions)||0;
          // Cruce país × cuenta: permite ver "cuánto gasté en México, solo en Perú"
          const kPC = `${code}|${cuenta.nombre}`;
          if (!porPaisCuenta[kPC]) porPaisCuenta[kPC] = { inv:0, leads:0, impr:0, reach:0 };
          porPaisCuenta[kPC].inv   += _inv;
          porPaisCuenta[kPC].impr  += parseFloat(d.impressions)||0;
          porPaisCuenta[kPC].reach += parseFloat(d.reach)||0;
          const acts = d.actions||[];
          let nl = 0;
          for (const t of LEAD_TYPES) { if(LEAD_EXCLUIR.has(t))continue; const a=acts.find(x=>x.action_type===t); if(a){const v=parseFloat(a.value)||0;if(v>nl)nl=v;} }
          if (nl===0) acts.filter(x=>!LEAD_EXCLUIR.has(x.action_type)&&x.action_type?.includes("registration")).forEach(x=>{const v=parseFloat(x.value)||0;if(v>nl)nl=v;});
          porPais[code].leads += nl;
          if (porCuenta[cuenta.nombre]) porCuenta[cuenta.nombre].leads += nl;
          if (porPaisCuenta[kPC]) porPaisCuenta[kPC].leads += nl;
        }
        next = json.paging?.next || null;
      }
    } catch(e) { console.error("[Países]", cuenta.nombre, e.message); }
  }
  return { ok:true, porPais, porCuenta, porPaisCuenta };
}

// ── PRESUPUESTO PROGRAMADO por país: lee adsets activos + su targeting ──
// Clasifica cada adset por los países a los que apunta. Los que apuntan a
// varios países (ej. remarketing mundial) NO se pueden dividir por país:
// se reportan aparte como "compartido/multi-país".
export async function fetchPresupuestoPorPais(token, cuentas) {
  const activas = (cuentas||[]).filter(c => c.adAccountId);
  if (!activas.length) return { ok:false, error:"Sin cuentas configuradas" };

  const monoPais = {};        // CODE → presupuesto diario (solo de un país)
  const monoPaisCuenta = {};  // "CODE|cuenta" → presupuesto (filtro por cuenta)
  const compartidos = [];     // multi-país / mundial (no divisible por país)
  const presupPorCuenta = {}; // nombre cuenta → { diario, adsets, campanasCBO, adAccountId }
  let totalDiario = 0;

  for (const cuenta of activas) {
    if (!presupPorCuenta[cuenta.nombre]) {
      presupPorCuenta[cuenta.nombre] = { diario:0, adsets:0, campanasCBO:0, adAccountId: cuenta.adAccountId };
    }
    try {
      // ── PASO 1: Campañas activas con presupuesto a nivel campaña (CBO) ──
      // Algunas cuentas usan CBO/Advantage: el presupuesto vive en la campaña,
      // no en los adsets. Sin esto el presupuesto aparecía vacío.
      const cboPorCampana = {}; // campaignId → { daily, life, nombre }
      const cUrl = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/campaigns`);
      cUrl.searchParams.set("fields", "id,name,daily_budget,lifetime_budget,effective_status");
      cUrl.searchParams.set("effective_status", JSON.stringify(["ACTIVE"]));
      cUrl.searchParams.set("limit", "500");
      cUrl.searchParams.set("access_token", token);
      let cNext = cUrl.toString();
      while (cNext) {
        const cj = await fetch(cNext).then(r=>r.json());
        if (cj.error) { console.warn("[Presup campañas]", cuenta.nombre, cj.error.message); break; }
        for (const c of (cj.data||[])) {
          if (c.effective_status !== "ACTIVE") continue;
          const d = parseFloat(c.daily_budget||0)/100;
          const l = parseFloat(c.lifetime_budget||0)/100;
          if (d > 0 || l > 0) cboPorCampana[c.id] = { daily:d, life:l, nombre: c.name || "(sin nombre)" };
        }
        cNext = cj.paging?.next || null;
      }

      // ── PASO 2: Adsets activos (con su campaign_id para saber si hay CBO) ──
      const url = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/adsets`);
      url.searchParams.set("fields", "name,campaign_id,daily_budget,lifetime_budget,effective_status,targeting{geo_locations}");
      url.searchParams.set("effective_status", JSON.stringify(["ACTIVE"]));
      url.searchParams.set("limit", "500");
      url.searchParams.set("access_token", token);
      // Países que toca cada campaña CBO (para poder asignar su presupuesto)
      const paisesPorCampanaCBO = {}; // campaignId → Set(paises)
      let next = url.toString();
      while (next) {
        const json = await fetch(next).then(r=>r.json());
        if (json.error) { console.warn("[Presup adsets]", cuenta.nombre, json.error.message); break; }
        for (const a of (json.data||[])) {
          if (a.effective_status !== "ACTIVE") continue;
          const geo = a.targeting?.geo_locations || {};
          let paises = (geo.countries || []).slice();
          (geo.regions||[]).forEach(r=>{ if(r.country&&!paises.includes(r.country))paises.push(r.country); });
          (geo.cities||[]).forEach(c=>{ if(c.country&&!paises.includes(c.country))paises.push(c.country); });

          const esCBO = !!cboPorCampana[a.campaign_id];
          if (esCBO) {
            // El presupuesto lo maneja la campaña: registramos los países que cubre
            if (!paisesPorCampanaCBO[a.campaign_id]) paisesPorCampanaCBO[a.campaign_id] = new Set();
            paises.forEach(p => paisesPorCampanaCBO[a.campaign_id].add(p));
            continue; // no sumar el adset (evita duplicar)
          }

          const daily = parseFloat(a.daily_budget||0)/100;
          const life  = parseFloat(a.lifetime_budget||0)/100;
          const budget = daily || life;
          if (budget <= 0) continue;

          totalDiario += daily;
          presupPorCuenta[cuenta.nombre].diario += daily;
          presupPorCuenta[cuenta.nombre].adsets += 1;

          if (paises.length === 1) {
            monoPais[paises[0]] = (monoPais[paises[0]]||0) + budget;
            const kPC = `${paises[0]}|${cuenta.nombre}`;
            monoPaisCuenta[kPC] = (monoPaisCuenta[kPC]||0) + budget;
          } else {
            compartidos.push({
              nombre: a.name || "(sin nombre)",
              cuenta: cuenta.nombre,
              paises: paises.length ? paises : ["WW"],
              budget, tipo: daily ? "diario" : "total", nivel: "adset",
            });
          }
        }
        next = json.paging?.next || null;
      }

      // ── PASO 3: Asignar el presupuesto de las campañas CBO ──
      for (const [campId, info] of Object.entries(cboPorCampana)) {
        const paises = Array.from(paisesPorCampanaCBO[campId] || []);
        const budget = info.daily || info.life;
        totalDiario += info.daily;
        presupPorCuenta[cuenta.nombre].diario += info.daily;
        presupPorCuenta[cuenta.nombre].campanasCBO += 1;
        if (paises.length === 1) {
          monoPais[paises[0]] = (monoPais[paises[0]]||0) + budget;
          const kPC = `${paises[0]}|${cuenta.nombre}`;
          monoPaisCuenta[kPC] = (monoPaisCuenta[kPC]||0) + budget;
        } else {
          compartidos.push({
            nombre: info.nombre,
            cuenta: cuenta.nombre,
            paises: paises.length ? paises : ["WW"],
            budget, tipo: info.daily ? "diario" : "total", nivel: "campaña (CBO)",
          });
        }
      }
    } catch(e) { console.error("[Presup]", cuenta.nombre, e.message); }
  }
  return { ok:true, monoPais, monoPaisCuenta, compartidos, totalDiario, presupPorCuenta };
}
