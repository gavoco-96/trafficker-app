// api/cron-send-reports.js
// Vercel Cron Job — 8am Ecuador (13:00 UTC)
// 1. Cuenta joins de WA del día anterior desde wa_eventos
// 2. Sincroniza métricas de Facebook
// 3. Guarda personas_wp en records
// 4. Envía reporte completo a Telegram

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_KEY;
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

function fmtNum(n, dec = 0) {
  if (!n || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function toEcuador(date) {
  return new Date(date.getTime() - 5 * 60 * 60 * 1000);
}

async function getAllClients() {
  const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, { headers: H });
  const rows = await r.json();
  return rows.map(row => row.data).filter(c => c && !c.id?.startsWith("__"));
}

async function upsertClient(client) {
  await fetch(`${SUPA_URL}/rest/v1/clients`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: client.id, data: client })
  });
}

// ── Contar joins de WA del día para un cliente ────────────────
async function contarJoinsWA(clientId, fecha) {
  try {
    // wa_eventos tiene ts en formato ISO — filtramos el día completo en Ecuador
    const desde = `${fecha}T00:00:00-05:00`;
    const hasta = `${fecha}T23:59:59-05:00`;
    const r = await fetch(
      `${SUPA_URL}/rest/v1/wa_eventos?client_id=eq.${clientId}&tipo=eq.join&ts=gte.${encodeURIComponent(desde)}&ts=lte.${encodeURIComponent(hasta)}&select=id`,
      { headers: { ...H, "Prefer": "count=exact" } }
    );
    // Supabase devuelve el conteo en el header Content-Range
    const contentRange = r.headers.get("content-range");
    if (contentRange) {
      const total = contentRange.split("/")[1];
      if (total && total !== "*") return parseInt(total) || 0;
    }
    // Fallback: contar el array
    const data = await r.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (e) {
    console.error(`[WA COUNT] ${clientId}:`, e.message);
    return 0;
  }
}

// ── Fetch Facebook día ────────────────────────────────────────
async function fetchFbDay(token, adAccountId, date) {
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,impressions,reach,cpm,cpc,ctr,clicks,actions,purchase_roas&time_range={"since":"${date}","until":"${date}"}&level=account&access_token=${token}`;
  const r   = await fetch(url);
  const d   = await r.json();
  if (d.error || !d.data?.[0]) return null;
  const row = d.data[0];
  return {
    date,
    inversion:    parseFloat(row.spend) || 0,
    impresiones:  parseInt(row.impressions) || 0,
    alcance:      parseInt(row.reach) || 0,
    cpm:          parseFloat(row.cpm) || 0,
    cpc:          parseFloat(row.cpc) || 0,
    ctr:          parseFloat(row.ctr) || 0,
    clics_enlace: parseInt(row.clicks) || 0,
    leads:        parseFloat((row.actions||[]).find(a=>a.action_type==="lead"||a.action_type==="onsite_conversion.lead_grouped")?.value||0),
    ventas:       parseFloat((row.actions||[]).find(a=>a.action_type==="purchase")?.value||0),
    roas:         parseFloat(row.purchase_roas?.[0]?.value||0),
  };
}

async function fetchFbDayMulti(token, cuentas, date) {
  const activas = cuentas.filter(c => c.adAccountId);
  if (!activas.length) return null;
  if (activas.length === 1) return fetchFbDay(token, activas[0].adAccountId, date);
  const resultados = await Promise.all(activas.map(c => fetchFbDay(token, c.adAccountId, date).catch(() => null)));
  const validos = resultados.filter(Boolean);
  if (!validos.length) return null;
  const sum = f => validos.reduce((a, r) => a + (r[f] || 0), 0);
  const inv = sum("inversion");
  return {
    date,
    inversion:    parseFloat(inv.toFixed(2)),
    impresiones:  sum("impresiones"),
    alcance:      sum("alcance"),
    cpm:          inv > 0 && sum("impresiones") > 0 ? inv / sum("impresiones") * 1000 : 0,
    cpc:          inv > 0 && sum("clics_enlace") > 0 ? inv / sum("clics_enlace") : 0,
    ctr:          sum("impresiones") > 0 ? sum("clics_enlace") / sum("impresiones") * 100 : 0,
    clics_enlace: sum("clics_enlace"),
    leads:        sum("leads"),
    ventas:       sum("ventas"),
    roas:         sum("roas") / validos.length,
  };
}

// ── Construir mensaje Telegram ────────────────────────────────
function buildMessage(client, record, fechaAyer) {
  const inv        = record.inversion || 0;
  const leadsFB    = record.leads || record.formularios || record.resultados || 0;
  const personasWP = record.personas_wp || 0;
  const cplFb      = leadsFB > 0 && inv > 0 ? inv / leadsFB : 0;
  const cplWp      = personasWP > 0 && inv > 0 ? inv / personasWP : 0;
  const pctCap     = leadsFB > 0 && personasWP > 0 ? personasWP / leadsFB * 100 : 0;

  // Formato exacto del reporte
  let msg = `📊 *Reporte diario — ${client.name}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 Fecha: ${fechaAyer}\n\n`;
  msg += `💵 *GASTO DIARIO*\n`;
  msg += `Gasto: $${fmtNum(inv, 2)}\n`;
  msg += `Personas en FB: ${fmtNum(leadsFB)}\n`;
  msg += `Personas en WP: ${fmtNum(personasWP)}\n`;
  if (cplFb > 0)  msg += `Costo en FB: $${fmtNum(cplFb, 2)}\n`;
  if (cplWp > 0)  msg += `Costo en WP: $${fmtNum(cplWp, 2)}\n`;
  if (pctCap > 0) msg += `% de Captura: ${fmtNum(pctCap, 2)}%\n`;
  if (record.alcance > 0) msg += `\n📡 Alcance: ${fmtNum(record.alcance)}\n`;
  if (record.cpm > 0)     msg += `CPM: $${fmtNum(record.cpm, 2)}\n`;
  if (record.ctr > 0)     msg += `CTR: ${fmtNum(record.ctr, 2)}%\n`;
  if (record.ventas > 0)  msg += `\n🛒 Ventas: ${fmtNum(record.ventas)}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Trafficker Pro · Reporte automático 8am_`;
  return msg;
}

async function sendTelegram(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now       = new Date();
  const ecuador   = toEcuador(now);
  const fechaHoy  = ecuador.toISOString().slice(0, 10);
  const fechaAyer = new Date(ecuador.getTime() - 86400000).toISOString().slice(0, 10);
  const diaSemana = ecuador.getDay();

  const clients    = await getAllClients();
  const resultados = [];

  for (const client of clients) {
    const tg = client.tgConfig;
    if (!tg?.token) continue;

    const chatIds = tg.chatIds?.map(d => d.chatId).filter(Boolean) || (tg.chatId ? [tg.chatId] : []);
    if (!chatIds.length) continue;

    // Verificar schedule
    const sched = client.schedConfig;
    if (sched?.enabled) {
      if (!sched.dias?.includes(diaSemana)) continue;
      if (sched.fechaInicio && fechaHoy < sched.fechaInicio) continue;
      if (sched.fechaFin    && fechaHoy > sched.fechaFin)   continue;
    }

    // Verificar misión activa
    const fechaInicio = client.apolloData?.fechaInicioMision || client.contratos?.[0]?.fechaInicio;
    const duracion    = client.apolloData?.duracion || 21;
    if (fechaInicio) {
      const dias = Math.floor((now - new Date(fechaInicio + "T00:00:00")) / 86400000);
      if (dias > duracion + 2) continue;
    }

    try {
      // ── 1. Contar joins de WA del día anterior ────────────
      const joinsWA = await contarJoinsWA(client.id, fechaAyer);
      console.log(`[${client.name}] Joins WA ${fechaAyer}: ${joinsWA}`);

      // ── 2. Fetch métricas de Facebook ─────────────────────
      let record = null;
      const fbToken = client.fbConfig?.token;
      const cuentas = client.fbConfig?.cuentas?.filter(c => c.adAccountId) || [];
      const legacy  = client.fbConfig?.adAccountId;

      if (fbToken && (cuentas.length > 0 || legacy)) {
        const efectivas = cuentas.length > 0 ? cuentas : [{ adAccountId: legacy }];
        const fbData    = await fetchFbDayMulti(fbToken, efectivas, fechaAyer);

        if (fbData && fbData.inversion > 0) {
          // ── 3. Combinar FB + WA en el registro ────────────
          const records = [...(client.records || [])];
          const idx     = records.findIndex(r => r.date === fechaAyer);
          const base    = idx >= 0 ? records[idx] : {};
          const nuevoRecord = {
            ...base,
            ...fbData,
            // personas_wp: usar el conteo de WA si > 0, si no mantener el manual
            personas_wp: joinsWA > 0 ? joinsWA : (base.personas_wp || 0),
          };

          if (idx >= 0) records[idx] = nuevoRecord;
          else records.push(nuevoRecord);
          records.sort((a, b) => a.date.localeCompare(b.date));

          client.records  = records;
          client.fbConfig = { ...client.fbConfig,
            lastSync: ecuador.toLocaleString("es-EC"),
            lastAutoSync: now.toISOString()
          };
          await upsertClient(client);
          record = nuevoRecord;
        }
      }

      // Fallback: si no hay datos de FB, igual guardar WA
      if (!record) {
        const records = [...(client.records || [])];
        const idx     = records.findIndex(r => r.date === fechaAyer);
        if (idx >= 0 && joinsWA > 0) {
          records[idx] = { ...records[idx], personas_wp: joinsWA };
          client.records = records;
          await upsertClient(client);
          record = records[idx];
        } else {
          record = records.find(r => r.date === fechaAyer) || records.slice(-1)[0];
        }
      }

      if (!record) {
        resultados.push({ client: client.name, status: "sin_datos" });
        continue;
      }

      // ── 4. Enviar reporte a Telegram ──────────────────────
      const msg = buildMessage(client, record, fechaAyer);
      for (const chatId of chatIds) {
        await sendTelegram(tg.token, chatId, msg);
        await new Promise(r => setTimeout(r, 300));
      }

      resultados.push({
        client:      client.name,
        status:      "ok",
        fecha:       fechaAyer,
        joins_wa:    joinsWA,
        leads_fb:    record.leads || 0,
        destinatarios: chatIds.length
      });

    } catch (e) {
      console.error(`[${client.name}]`, e.message);
      resultados.push({ client: client.name, status: "error", error: e.message });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return res.status(200).json({
    ok: true, fecha: fechaAyer,
    procesados: resultados.length, resultados
  });
}
