// api/telegram-webhook.js
// Webhook de Telegram - recibe mensajes y responde con datos en tiempo real
// Setup: ejecutar una vez → POST a https://api.telegram.org/bot{TOKEN}/setWebhook
//        con url: https://trafficker-app.vercel.app/api/telegram-webhook

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_KEY;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function getAllClients() {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const rows = await r.json();
    return rows.map(row => row.data).filter(c => c && !c.id?.startsWith("__"));
  } catch { return []; }
}

async function getGlobalCommands() {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.__commands__&select=data`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const rows = await r.json();
    return rows[0]?.data?.commands || DEFAULT_COMMANDS;
  } catch { return DEFAULT_COMMANDS; }
}

async function sendTelegram(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
}

function fmtMoney(n) {
  const num = parseFloat(n) || 0;
  return "$" + num.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── FACEBOOK API HELPERS ─────────────────────────────────────────────────────
async function getFbInsightsToday(token, adAccountId) {
  const today = new Date().toISOString().slice(0, 10);
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,impressions,reach,cpm,cpc,ctr,clicks,actions,purchase_roas&time_range={"since":"${today}","until":"${today}"}&level=account&access_token=${token}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.error) return null;
  return data.data?.[0] || null;
}

async function getFbInsightsRange(token, adAccountId, since, until) {
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,impressions,reach,cpm,cpc,ctr,clicks,actions&time_range={"since":"${since}","until":"${until}"}&level=account&access_token=${token}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.error) return null;
  return data.data?.[0] || null;
}

async function getFbActiveCampaigns(token, adAccountId) {
  // Campañas activas con presupuesto
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${token}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.error) return null;
  return data.data || [];
}

async function getFbAdsets(token, campaignId) {
  // Conjuntos de anuncios de una campaña
  const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,effective_status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${token}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.error) return [];
  return data.data || [];
}

// ─── COMANDOS POR DEFECTO ─────────────────────────────────────────────────────
const DEFAULT_COMMANDS = [
  { cmd: "/reporte", label: "Reporte del día", descripcion: "Métricas de hoy desde Facebook", activo: true },
  { cmd: "/ayer", label: "Reporte de ayer", descripcion: "Métricas del día anterior", activo: true },
  { cmd: "/semana", label: "Resumen semanal", descripcion: "Últimos 7 días", activo: true },
  { cmd: "/presupuesto", label: "Presupuesto activo", descripcion: "Campañas activas y presupuesto programado (CBO/ABO)", activo: true },
  { cmd: "/contrato", label: "Estado del contrato", descripcion: "Cuotas y estado de pago", activo: true },
  { cmd: "/kpis", label: "Progreso de KPIs", descripcion: "Avance de las metas del período", activo: true },
  { cmd: "/ayuda", label: "Ayuda", descripcion: "Lista de comandos disponibles", activo: true },
];

// ─── GENERADORES DE MENSAJES ──────────────────────────────────────────────────
function buildInsightsMessage(row, label, clientName) {
  if (!row) return `📊 *${label} — ${clientName}*\n\nSin datos disponibles para este período.`;
  const leads = (row.actions || []).find(a => a.action_type === "lead")?.value || 0;
  const compras = (row.actions || []).find(a => a.action_type === "purchase")?.value || 0;
  const roas = row.purchase_roas?.[0]?.value || 0;

  let msg = `📊 *${label} — ${clientName}*\n\n`;
  msg += `💰 *Pauta*\n`;
  msg += `Gasto: ${fmtMoney(row.spend)}\n`;
  msg += `Alcance: ${parseInt(row.reach || 0).toLocaleString("es-EC")}\n`;
  msg += `CPM: ${fmtMoney(row.cpm)} | CPC: ${fmtMoney(row.cpc)}\n`;
  msg += `CTR: ${parseFloat(row.ctr || 0).toFixed(2)}%\n`;
  msg += `Clics: ${parseInt(row.clicks || 0).toLocaleString("es-EC")}\n`;
  if (leads > 0) msg += `\n🎯 Leads: ${leads}\n`;
  if (compras > 0) msg += `\n🛒 Compras: ${compras}\n`;
  if (roas > 0) msg += `ROAS: ${parseFloat(roas).toFixed(2)}x\n`;
  msg += `\n_Trafficker Pro · ${new Date().toLocaleDateString("es-EC")}_`;
  return msg;
}

async function buildPresupuestoMessage(token, adAccountId, clientName) {
  const campaigns = await getFbActiveCampaigns(token, adAccountId);

  if (!campaigns || campaigns.length === 0) {
    return `📋 *Presupuesto programado — ${clientName}*\n\n⚠️ No hay campañas activas en este momento.`;
  }

  let msg = `📋 *Presupuesto programado — ${clientName}*\n`;
  msg += `_${new Date().toLocaleDateString("es-EC")}_\n\n`;

  let cboCampaigns = [];
  let aboCampaigns = [];
  let totalCBO = 0;
  let totalABO = 0;

  for (const camp of campaigns) {
    const hasCampBudget = camp.daily_budget && parseFloat(camp.daily_budget) > 0;

    if (hasCampBudget) {
      // CBO - presupuesto a nivel de campaña
      const budget = parseFloat(camp.daily_budget) / 100; // FB devuelve en centavos
      cboCampaigns.push({ name: camp.name, budget, objective: camp.objective });
      totalCBO += budget;
    } else {
      // ABO - buscar presupuesto en conjuntos de anuncios
      const adsets = await getFbAdsets(token, camp.id);
      let campTotal = 0;
      const adsetDetails = [];
      for (const adset of adsets) {
        const adsetBudget = parseFloat(adset.daily_budget || 0) / 100;
        campTotal += adsetBudget;
        adsetDetails.push({ name: adset.name, budget: adsetBudget });
      }
      if (campTotal > 0 || adsets.length > 0) {
        aboCampaigns.push({ name: camp.name, budget: campTotal, adsets: adsetDetails });
        totalABO += campTotal;
      }
    }
  }

  // Sección CBO
  if (cboCampaigns.length > 0) {
    msg += `🎯 *Campañas CBO* _(presupuesto por campaña)_\n`;
    cboCampaigns.forEach(c => {
      msg += `• ${c.name}\n  Presupuesto diario: ${fmtMoney(c.budget)}\n`;
    });
    msg += `Total CBO: *${fmtMoney(totalCBO)}*\n\n`;
  }

  // Sección ABO
  if (aboCampaigns.length > 0) {
    msg += `⚙️ *Campañas ABO* _(presupuesto por conjunto)_\n`;
    aboCampaigns.forEach(c => {
      msg += `• ${c.name}\n`;
      c.adsets.forEach(a => {
        msg += `  ↳ ${a.name}: ${fmtMoney(a.budget)}\n`;
      });
      msg += `  Subtotal: ${fmtMoney(c.budget)}\n`;
    });
    msg += `Total ABO: *${fmtMoney(totalABO)}*\n\n`;
  }

  // Totalizador
  const grandTotal = totalCBO + totalABO;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 *PRESUPUESTO TOTAL HOY*\n`;
  msg += `*${fmtMoney(grandTotal)}*\n`;
  msg += `\n_Trafficker Pro · Datos en tiempo real_`;

  return msg;
}

function buildContratoMessage(client) {
  const contratos = client.contratos || [];
  if (!contratos.length) return `📄 *Contrato — ${client.name}*\n\nSin contratos registrados.`;

  let msg = `📄 *Estado del contrato — ${client.name}*\n\n`;
  const hoy = new Date();

  contratos.forEach((ct, ci) => {
    const pagadas = (ct.cuotas || []).filter(c => c.pagado).length;
    const total = (ct.cuotas || []).length;
    msg += `*Contrato #${ci + 1}*\n`;
    if (ct.fechaInicio) msg += `Inicio: ${ct.fechaInicio}\n`;
    if (ct.fechaFin) msg += `Fin: ${ct.fechaFin}\n`;
    if (ct.totalContrato) msg += `Total: ${fmtMoney(ct.totalContrato)}\n`;
    msg += `Pagos: ${pagadas}/${total} cuotas\n`;

    const pendientes = (ct.cuotas || []).filter(c => !c.pagado && c.monto);
    if (pendientes.length > 0) {
      msg += `\n⏰ *Cuotas pendientes:*\n`;
      pendientes.forEach((c, i) => {
        const vence = c.fecha ? new Date(c.fecha + "T12:00:00") : null;
        const dias = vence ? Math.ceil((vence - hoy) / 86400000) : null;
        msg += `• Cuota por ${fmtMoney(c.monto)}`;
        if (c.fecha) msg += ` — vence ${c.fecha}`;
        if (dias !== null) {
          if (dias < 0) msg += ` ⚠️ VENCIDA`;
          else if (dias === 0) msg += ` 🔴 HOY`;
          else if (dias <= 5) msg += ` 🟡 en ${dias} días`;
        }
        msg += `\n`;
      });
    }
    msg += `\n`;
  });

  msg += `_Trafficker Pro_`;
  return msg;
}

function buildKpisMessage(client) {
  const kpis = client.kpis || [];
  if (!kpis.length) return `🎯 *KPIs — ${client.name}*\n\nSin KPIs definidos aún.`;

  let msg = `🎯 *Progreso de KPIs — ${client.name}*\n\n`;
  const records = client.records || [];

  kpis.forEach(kpi => {
    const { pct, actual, meta } = calcKpiProgressServer(kpi, records);
    const bar = buildProgressBar(pct);
    const emoji = pct >= 100 ? "✅" : pct >= 60 ? "🟡" : pct >= 30 ? "🟠" : "🔴";
    msg += `${emoji} *${kpi.nombre}*\n`;
    msg += `${bar} ${pct}%\n`;
    msg += `Actual: ${actual} / Meta: ${meta} ${kpi.unidad || ""}\n`;
    if (kpi.plazo) msg += `Plazo: ${kpi.plazo}\n`;
    msg += `\n`;
  });

  msg += `_Trafficker Pro · ${new Date().toLocaleDateString("es-EC")}_`;
  return msg;
}

function buildProgressBar(pct) {
  const filled = Math.round(Math.min(pct, 100) / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function calcKpiProgressServer(kpi, records) {
  if (!kpi.metrica || !records.length) return { pct: 0, actual: 0, meta: 0 };
  const meta = parseFloat(kpi.meta_valor) || 0;
  if (!meta) return { pct: 0, actual: 0, meta: 0 };
  let filtered = records;
  if (kpi.fechaInicio || kpi.fechaFin) {
    filtered = records.filter(r => {
      const d = new Date(r.date + "T12:00:00");
      const ok1 = !kpi.fechaInicio || d >= new Date(kpi.fechaInicio + "T00:00:00");
      const ok2 = !kpi.fechaFin || d <= new Date(kpi.fechaFin + "T23:59:59");
      return ok1 && ok2;
    });
  }
  const isAvg = ["ctr","roas","cpc","cpm"].includes(kpi.metrica);
  const total = filtered.reduce((a, r) => a + (Number(r[kpi.metrica]) || 0), 0);
  const actual = isAvg && filtered.length ? Math.round((total / filtered.length) * 100) / 100 : total;
  return { pct: Math.min(Math.round((actual / meta) * 100), 999), actual, meta };
}

function buildAyudaMessage(commands, clientName) {
  const activos = commands.filter(c => c.activo);
  let msg = `🤖 *GavicoBot — Comandos disponibles*\n`;
  msg += `_Panel de ${clientName}_\n\n`;
  activos.forEach(c => {
    msg += `${c.cmd} — ${c.label}\n`;
    msg += `_${c.descripcion}_\n\n`;
  });
  msg += `_Powered by Trafficker Pro_`;
  return msg;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  const body = req.body;
  const message = body?.message;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat?.id;
  const text = (message.text || "").trim().toLowerCase().split(" ")[0];

  if (!chatId || !text.startsWith("/")) return res.status(200).json({ ok: true });

  // Buscar cliente por Chat ID
  const clients = await getAllClients();
  const client = clients.find(c => String(c.tgConfig?.chatId) === String(chatId));

  if (!client) {
    // Chat ID no registrado
    const token = clients[0]?.tgConfig?.token;
    if (token) {
      await sendTelegram(token, chatId,
        "⚠️ No encontré tu cuenta registrada. Contacta a tu trafficker para vincularte."
      );
    }
    return res.status(200).json({ ok: true });
  }

  const token = client.tgConfig?.token;
  const commands = await getGlobalCommands();
  const cmdConfig = commands.find(c => c.cmd === text);

  // Verificar si el comando está activo
  if (cmdConfig && !cmdConfig.activo) {
    await sendTelegram(token, chatId, "Este comando no está disponible en este momento.");
    return res.status(200).json({ ok: true });
  }

  const fbToken = client.fbConfig?.token;
  const adAccountId = client.fbConfig?.adAccountId;

  try {
    let respuesta = "";

    if (text === "/reporte") {
      const today = new Date().toISOString().slice(0, 10);
      if (!fbToken || !adAccountId) {
        // Usar último registro local
        const last = (client.records || []).slice(-1)[0];
        respuesta = last ? buildInsightsMessage(last, "Reporte de hoy", client.name)
          : `📊 Sin datos de hoy para ${client.name}.`;
      } else {
        const row = await getFbInsightsToday(fbToken, adAccountId);
        respuesta = buildInsightsMessage(row, "Reporte de hoy", client.name);
      }
    }

    else if (text === "/ayer") {
      const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (!fbToken || !adAccountId) {
        const rec = (client.records || []).find(r => r.date === ayer);
        respuesta = rec ? buildInsightsMessage(rec, "Reporte de ayer", client.name)
          : `📊 Sin datos del ${ayer}.`;
      } else {
        const row = await getFbInsightsRange(fbToken, adAccountId, ayer, ayer);
        respuesta = buildInsightsMessage(row, "Reporte de ayer", client.name);
      }
    }

    else if (text === "/semana") {
      const hasta = new Date().toISOString().slice(0, 10);
      const desde = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      if (!fbToken || !adAccountId) {
        const recs = (client.records || []).filter(r => r.date >= desde && r.date <= hasta);
        if (!recs.length) { respuesta = `📊 Sin datos de los últimos 7 días.`; }
        else {
          const total = { spend: recs.reduce((a,r) => a + (r.inversion||0), 0), impressions: recs.reduce((a,r) => a + (r.impresiones||0), 0), reach: Math.max(...recs.map(r => r.alcance||0)), clicks: recs.reduce((a,r) => a + (r.clics_enlace||0), 0) };
          respuesta = buildInsightsMessage(total, "Resumen 7 días", client.name);
        }
      } else {
        const row = await getFbInsightsRange(fbToken, adAccountId, desde, hasta);
        respuesta = buildInsightsMessage(row, "Resumen 7 días", client.name);
      }
    }

    else if (text === "/presupuesto") {
      if (!fbToken || !adAccountId) {
        respuesta = `⚠️ Facebook Ads no está conectado para ${client.name}. Contacta a tu trafficker.`;
      } else {
        respuesta = await buildPresupuestoMessage(fbToken, adAccountId, client.name);
      }
    }

    else if (text === "/contrato") {
      respuesta = buildContratoMessage(client);
    }

    else if (text === "/kpis") {
      respuesta = buildKpisMessage(client);
    }

    else if (text === "/ayuda" || text === "/start") {
      respuesta = buildAyudaMessage(commands, client.name);
    }

    else {
      respuesta = `Comando no reconocido. Escribe /ayuda para ver los comandos disponibles.`;
    }

    await sendTelegram(token, chatId, respuesta);

  } catch (e) {
    console.error("Webhook error:", e);
    await sendTelegram(token, chatId, "⚠️ Ocurrió un error procesando tu solicitud. Intenta de nuevo.");
  }

  return res.status(200).json({ ok: true });
}
