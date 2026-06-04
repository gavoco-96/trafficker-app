// api/cron-send-reports.js
// Vercel Cron Job - se ejecuta según el schedule en vercel.json
// Hora Ecuador (UTC-5): configurar el cron en UTC → 8am Quito = 13:00 UTC

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_KEY;

async function getAllClients() {
  const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  const rows = await r.json();
  return rows.map(row => row.data).filter(c => c && !c.id?.startsWith("__"));
}

async function upsertClient(client) {
  await fetch(`${SUPA_URL}/rest/v1/clients`, {
    method: "POST",
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: client.id, data: client })
  });
}

async function fetchFbDay(token, adAccountId, date) {
  const fields = "spend,impressions,reach,cpm,cpc,ctr,clicks,actions,purchase_roas";
  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=${fields}&time_range={"since":"${date}","until":"${date}"}&level=account&access_token=${token}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.error || !data.data?.[0]) return null;
  const row = data.data[0];
  return {
    date,
    inversion: parseFloat(row.spend) || 0,
    impresiones: parseFloat(row.impressions) || 0,
    alcance: parseFloat(row.reach) || 0,
    cpm: parseFloat(row.cpm) || 0,
    cpc: parseFloat(row.cpc) || 0,
    ctr: parseFloat(row.ctr) || 0,
    clics_enlace: parseFloat(row.clicks) || 0,
    leads: parseFloat((row.actions || []).find(a => a.action_type === "lead")?.value || 0),
    ventas: parseFloat((row.actions || []).find(a => a.action_type === "purchase")?.value || 0),
    roas: parseFloat(row.purchase_roas?.[0]?.value || 0),
  };
}

function buildMessage(client, record) {
  const hoy = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" });
  let msg = `📊 Reporte diario - ${client.name}\n📅 ${hoy}\n\n`;
  msg += `💰 Pauta\nInversión: $${record.inversion || "—"}\nAlcance: ${record.alcance || "—"}\nCPM: $${record.cpm || "—"} | CPC: $${record.cpc || "—"} | CTR: ${record.ctr || "—"}%\n\n`;
  if (client.niche === "whatsapp") {
    msg += `📱 Ventas WhatsApp\nLeads: ${record.leads || "—"} | Ventas: ${record.ventas || "—"}\n`;
  } else if (client.niche === "web") {
    msg += `🛒 E-commerce\nCompras: ${record.ventas || "—"} | ROAS: ${record.roas || "—"}x\n`;
  } else {
    msg += `🎯 Resultados\nLeads: ${record.leads || "—"} | Formularios: ${record.leads || "—"}\n`;
  }
  msg += `\n_Enviado automaticamente desde Trafficker Pro_`;
  return msg;
}

async function sendTelegram(token, chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
  return r.json();
}

export default async function handler(req, res) {
  // Verificar que es una llamada autorizada de Vercel Cron
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  // Hora Ecuador = UTC - 5
  const horaEcuador = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const diaSemana = horaEcuador.getDay();
  const fechaHoy = horaEcuador.toISOString().slice(0, 10);
  const fechaAyer = new Date(horaEcuador.getTime() - 86400000).toISOString().slice(0, 10);

  const clients = await getAllClients();
  const resultados = [];

  for (const client of clients) {
    const sched = client.schedConfig;
    if (!sched?.enabled) continue;
    if (!sched.dias?.includes(diaSemana)) continue;
    if (sched.fechaInicio && fechaHoy < sched.fechaInicio) continue;
    if (sched.fechaFin && fechaHoy > sched.fechaFin) continue;

    const tg = client.tgConfig;
    if (!tg?.token || !tg?.chatId) continue;

    try {
      // Sincronizar datos de Facebook si está configurado
      let record = null;
      if (client.fbConfig?.token && client.fbConfig?.adAccountId) {
        record = await fetchFbDay(client.fbConfig.token, client.fbConfig.adAccountId, fechaAyer);
        if (record) {
          const records = [...(client.records || [])];
          const idx = records.findIndex(r => r.date === fechaAyer);
          if (idx >= 0) records[idx] = { ...records[idx], ...record };
          else records.push(record);
          records.sort((a, b) => a.date.localeCompare(b.date));
          client.records = records;
          await upsertClient(client);
        }
      }

      // Usar último registro si no hay datos de Facebook
      if (!record) {
        record = (client.records || []).slice(-1)[0];
      }

      if (!record) continue;

      // Obtener plantilla configurada
      const plantilla = tg.plantillas?.find(p => p.id === sched.plantillaId) || tg.plantillas?.[0];
      let mensaje = buildMessage(client, record);
      if (plantilla?.tipo === "custom" && plantilla.texto) mensaje = plantilla.texto;

      await sendTelegram(tg.token, tg.chatId, mensaje);
      resultados.push({ client: client.name, status: "enviado" });
    } catch (e) {
      resultados.push({ client: client.name, status: "error", error: e.message });
    }
  }

  return res.status(200).json({
    fecha: fechaHoy,
    procesados: resultados.length,
    resultados
  });
}
