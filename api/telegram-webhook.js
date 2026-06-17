// api/telegram-webhook.js — Trafficker Pro · Bot Inteligente
// Fusión: comandos clásicos + lenguaje natural con IA + nuevos comandos
// ─────────────────────────────────────────────────────────────────────────────

const SUPA_URL  = process.env.VITE_SUPABASE_URL;
const SUPA_KEY  = process.env.VITE_SUPABASE_KEY;
const ANTH_KEY  = process.env.VITE_ANTHROPIC_KEY;
const H_SUPA    = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function getAllClients() {
  try {
    const r    = await fetch(`${SUPA_URL}/rest/v1/clients?select=data`, { headers: H_SUPA });
    const rows = await r.json();
    return rows.map(row => row.data).filter(c => c && !c.id?.startsWith("__"));
  } catch { return []; }
}

async function getGlobalCommands() {
  try {
    const r    = await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.__commands__&select=data`, { headers: H_SUPA });
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
  return "$" + (parseFloat(n)||0).toLocaleString("es-EC", { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtN(n, d=0) {
  if (n===null||n===undefined||isNaN(n)) return "—";
  return Number(n).toLocaleString("es-EC", { minimumFractionDigits:d, maximumFractionDigits:d });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d+"T12:00:00").toLocaleDateString("es-EC",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function buildBar(pct) {
  const f = Math.round(Math.min(pct,100)/10);
  return "█".repeat(f)+"░".repeat(10-f);
}

// ─── FACEBOOK API ─────────────────────────────────────────────────────────────
function getFbToken(client) {
  return client.fbConfig?.token || null;
}
function getFbAccountId(client) {
  // Soporta nuevo campo cuentas[] y campo legacy adAccountId
  return client.fbConfig?.cuentas?.[0]?.adAccountId || client.fbConfig?.adAccountId || null;
}

async function getFbInsights(token, accId, since, until) {
  const url = `https://graph.facebook.com/v19.0/act_${accId}/insights?fields=spend,impressions,reach,cpm,cpc,ctr,clicks,actions,purchase_roas&time_range={"since":"${since}","until":"${until}"}&level=account&access_token=${token}`;
  const r    = await fetch(url);
  const data = await r.json();
  if (data.error) return null;
  return data.data?.[0] || null;
}

async function getFbActiveCampaigns(token, accId) {
  const url = `https://graph.facebook.com/v19.0/act_${accId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${token}`;
  const r   = await fetch(url);
  const d   = await r.json();
  return d.error ? [] : (d.data||[]);
}

async function getFbAdsets(token, campaignId) {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${token}`;
  const r   = await fetch(url);
  const d   = await r.json();
  return d.error ? [] : (d.data||[]);
}

// ─── COMANDOS POR DEFECTO ─────────────────────────────────────────────────────
const DEFAULT_COMMANDS = [
  { cmd:"/reporte",     label:"Reporte de hoy",        descripcion:"Métricas del día actual desde Facebook", activo:true },
  { cmd:"/ayer",        label:"Reporte de ayer",        descripcion:"Métricas del día anterior",              activo:true },
  { cmd:"/semana",      label:"Resumen semanal",        descripcion:"Últimos 7 días",                         activo:true },
  { cmd:"/mes",         label:"Resumen del mes",        descripcion:"Mes en curso con proyección",            activo:true },
  { cmd:"/presupuesto", label:"Presupuesto activo",     descripcion:"Campañas activas CBO/ABO",               activo:true },
  { cmd:"/mision",      label:"Estado de misión",       descripcion:"Avance, días y KPIs de la misión",       activo:true },
  { cmd:"/captura",     label:"Captura FB→WP",          descripcion:"% de personas que entraron a WhatsApp",  activo:true },
  { cmd:"/proyeccion",  label:"Proyección",             descripcion:"/proyeccion 150 — ¿qué pasa con $150/día?", activo:true },
  { cmd:"/contrato",    label:"Estado del contrato",    descripcion:"Cuotas y estado de pago",                activo:true },
  { cmd:"/kpis",        label:"Progreso de KPIs",       descripcion:"Avance de metas del período",            activo:true },
  { cmd:"/ayuda",       label:"Ayuda",                  descripcion:"Lista de comandos disponibles",          activo:true },
];

// ─── GENERADORES DE MENSAJES ──────────────────────────────────────────────────
function buildInsightsMessage(row, label, clientName) {
  if (!row) return `📊 *${label} — ${clientName}*\n\nSin datos disponibles.\n_Sincroniza Facebook desde la app._`;

  const spend  = parseFloat(row.spend||row.inversion||0);
  const reach  = parseInt(row.reach||row.alcance||0);
  const impr   = parseInt(row.impressions||row.impresiones||0);
  const clicks = parseInt(row.clicks||row.clics_enlace||0);
  const cpm    = parseFloat(row.cpm||0);
  const cpc    = parseFloat(row.cpc||0);
  const ctr    = parseFloat(row.ctr||0);
  const leads  = parseInt((row.actions||[]).find(a=>a.action_type==="lead"||a.action_type==="onsite_conversion.lead_grouped")?.value||row.leads||row.formularios||row.resultados||0);
  const ventas = parseInt((row.actions||[]).find(a=>a.action_type==="purchase")?.value||row.ventas||row.compras||0);
  const roas   = parseFloat(row.purchase_roas?.[0]?.value||row.roas||0);
  const ingreso= parseFloat(row.ingreso||0);
  const cpa    = leads>0&&spend>0 ? spend/leads : 0;

  let msg = `📊 *${label} — ${clientName}*\n\n`;
  if (spend>0||reach>0||impr>0) {
    msg += `💰 *Pauta*\n`;
    if (spend>0)  msg += `Gasto: ${fmtMoney(spend)}\n`;
    if (reach>0)  msg += `Alcance: ${fmtN(reach)}\n`;
    if (impr>0)   msg += `Impresiones: ${fmtN(impr)}\n`;
    if (cpm>0)    msg += `CPM: ${fmtMoney(cpm)}\n`;
    if (cpc>0)    msg += `CPC: ${fmtMoney(cpc)}\n`;
    if (ctr>0)    msg += `CTR: ${ctr.toFixed(2)}%\n`;
    if (clicks>0) msg += `Clics: ${fmtN(clicks)}\n`;
  }
  if (leads>0) {
    msg += `\n🎯 *Resultados*\n`;
    msg += `Leads/Formularios: ${leads}\n`;
    if (cpa>0) msg += `CPL: ${fmtMoney(cpa)}\n`;
  }
  if (ventas>0||ingreso>0||roas>0) {
    msg += `\n🛒 *Ventas*\n`;
    if (ventas>0)  msg += `Ventas: ${fmtN(ventas)}\n`;
    if (ingreso>0) msg += `Ingresos: ${fmtMoney(ingreso)}\n`;
    if (roas>0)    msg += `ROAS: ${roas.toFixed(2)}x\n`;
  }
  msg += `\n_Trafficker Pro · ${new Date().toLocaleDateString("es-EC")}_`;
  return msg;
}

async function buildPresupuestoMessage(token, accId, clientName) {
  const campaigns = await getFbActiveCampaigns(token, accId);
  if (!campaigns.length) return `📋 *Presupuesto — ${clientName}*\n\n⚠️ No hay campañas activas.`;

  let msg = `📋 *Presupuesto programado — ${clientName}*\n_${new Date().toLocaleDateString("es-EC")}_\n\n`;
  let cboCamps=[],aboCamps=[],totCBO=0,totABO=0;

  for (const camp of campaigns) {
    const db = parseFloat(camp.daily_budget||0)/100;
    if (db>0) { cboCamps.push({name:camp.name,budget:db}); totCBO+=db; }
    else {
      const adsets = await getFbAdsets(token, camp.id);
      let sub=0, details=[];
      for (const as of adsets) { const b=parseFloat(as.daily_budget||0)/100; sub+=b; details.push({name:as.name,budget:b}); }
      if (sub>0||adsets.length>0) { aboCamps.push({name:camp.name,budget:sub,adsets:details}); totABO+=sub; }
    }
  }
  if (cboCamps.length) {
    msg+=`🎯 *Campañas CBO*\n`;
    cboCamps.forEach(c=>{ msg+=`• ${c.name}\n  ${fmtMoney(c.budget)}/día\n`; });
    msg+=`Total CBO: *${fmtMoney(totCBO)}*\n\n`;
  }
  if (aboCamps.length) {
    msg+=`⚙️ *Campañas ABO*\n`;
    aboCamps.forEach(c=>{ msg+=`• ${c.name}\n`; c.adsets.forEach(a=>{msg+=`  ↳ ${a.name}: ${fmtMoney(a.budget)}\n`;}); msg+=`  Sub: ${fmtMoney(c.budget)}\n`; });
    msg+=`Total ABO: *${fmtMoney(totABO)}*\n\n`;
  }
  msg+=`━━━━━━━━━━━━━━━━━━\n💵 *TOTAL HOY: ${fmtMoney(totCBO+totABO)}*\n\n_Datos en tiempo real · Trafficker Pro_`;
  return msg;
}

function buildMisionMessage(client) {
  const duracion  = client.apolloData?.duracion || 21;
  const fechaBase = client.apolloData?.fechaInicioMision || client.contratos?.[0]?.fechaInicio || "";
  if (!fechaBase) return `🚀 *Misión — ${client.name}*\n\nSin misión activa configurada.`;

  const dias    = Math.max(0, Math.floor((new Date()-new Date(fechaBase+"T00:00:00"))/86400000));
  const rest    = Math.max(0, duracion-dias);
  const pct     = Math.min(100, dias/duracion*100);
  const records = client.records||[];
  const inv     = records.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
  const leads   = records.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
  const ventas  = records.reduce((a,r)=>a+(parseFloat(r.ventas)||0),0);
  const cpl     = leads>0 ? inv/leads : 0;
  const cap     = client.capturaConfig?.lastData;

  let msg = `🚀 *Estado de misión — ${client.name}*\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `${buildBar(pct)} ${fmtN(pct,1)}%\n`;
  msg += `📅 Día ${dias} de ${duracion} · *${rest} días restantes*\n\n`;
  msg += `💵 Inversión: ${fmtMoney(inv)}\n`;
  msg += `👥 Leads: ${fmtN(leads)}\n`;
  if (cpl>0) msg += `💰 CPL: ${fmtMoney(cpl)}\n`;
  if (ventas>0) msg += `🛒 Ventas: ${fmtN(ventas)}\n`;
  if (cap) {
    const pctCap = cap.total_form>0 ? cap.total_wp/cap.total_form*100 : 0;
    msg += `\n📱 Captura FB→WP: ${fmtN(pctCap,1)}%\n`;
    msg += `En WP: ${fmtN(cap.total_wp)} / FB: ${fmtN(cap.total_form)}\n`;
  }
  if (dias>0) msg += `\n📊 Prom/día: ${fmtMoney(inv/dias)} · ${fmtN(leads/dias,1)} leads\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n_Trafficker Pro · APOLLO_`;
  return msg;
}

function buildCapturaMessage(client) {
  const cap = client.capturaConfig?.lastData;
  if (!cap) return `📊 *Captura FB→WP — ${client.name}*\n\nSin datos de captura. Sincroniza desde la app.`;

  const pct   = cap.total_form>0 ? cap.total_wp/cap.total_form*100 : 0;
  const emoji = pct>=70?"🟢":pct>=50?"🟡":"🔴";
  const sync  = client.capturaConfig?.lastSync;

  let msg = `📊 *Captura FB → WhatsApp — ${client.name}*\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `${emoji} *${fmtN(pct,1)}%* de captura global\n\n`;
  msg += `✅ En WP: ${fmtN(cap.total_wp)}\n`;
  msg += `📋 FB: ${fmtN(cap.total_form)}\n`;
  msg += `⏳ Pendientes: ${fmtN(cap.total_remarketing||cap.total_form-cap.total_wp)}\n`;
  if (sync) msg += `\n_Actualizado: ${new Date(sync).toLocaleString("es-EC")}_\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n_Trafficker Pro_`;
  return msg;
}

function buildProyeccionMessage(client, presupuesto) {
  const records = client.records||[];
  if (!records.length) return "Sin historial para proyectar. Agrega registros primero.";

  const inv   = records.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
  const leads = records.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
  const n     = records.length;
  const cpl   = leads>0 ? inv/leads : 0;
  const invDia = inv/n;
  const pres  = presupuesto > 0 ? presupuesto : invDia;
  const leadsD = cpl>0 ? pres/cpl : leads/n*(pres/invDia);
  const cap   = client.capturaConfig?.lastData;
  const pctCap = cap?.total_form>0 ? cap.total_wp/cap.total_form : 0.6;

  let msg = `📈 *Proyección — ${client.name}*\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 Presupuesto: *${fmtMoney(pres)}/día*\n`;
  msg += `📊 CPL histórico: ${fmtMoney(cpl)} (${n} días)\n\n`;
  msg += `*Proyección estimada:*\n`;
  msg += `📅 Por día: ~${fmtN(leadsD,0)} leads · ${fmtMoney(pres)}\n`;
  msg += `📆 Por semana: ~${fmtN(leadsD*7,0)} leads · ${fmtMoney(pres*7)}\n`;
  msg += `🗓 Por mes (30d): ~${fmtN(leadsD*30,0)} leads · ${fmtMoney(pres*30)}\n`;
  if (pctCap>0) msg += `📱 WP proyectado/mes: ~${fmtN(leadsD*30*pctCap,0)} personas\n  _(${fmtN(pctCap*100,1)}% captura histórica)_\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n_Trafficker Pro_`;
  return msg;
}

function buildMesMessage(client) {
  const records = client.records||[];
  const hoy     = new Date();
  const inicioM = new Date(hoy.getFullYear(),hoy.getMonth(),1).toISOString().slice(0,10);
  const rows    = records.filter(r=>r.date>=inicioM);
  if (!rows.length) return `📅 *${hoy.toLocaleDateString("es-EC",{month:"long",year:"numeric"})} — ${client.name}*\n\nSin registros este mes.`;

  const inv    = rows.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
  const leads  = rows.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
  const ventas = rows.reduce((a,r)=>a+(parseFloat(r.ventas)||0),0);
  const ingreso= rows.reduce((a,r)=>a+(parseFloat(r.ingreso)||0),0);
  const cpl    = leads>0?inv/leads:0;
  const roas   = inv>0&&ingreso>0?ingreso/inv:0;
  const dias   = hoy.getDate();
  const diasMes= new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate();
  const invProy= inv/dias*diasMes;

  let msg = `📅 *${hoy.toLocaleDateString("es-EC",{month:"long",year:"numeric"})} — ${client.name}*\n`;
  msg += `📌 Día ${dias} de ${diasMes}\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 Inversión: ${fmtMoney(inv)}\n`;
  msg += `👥 Leads: ${fmtN(leads)}\n`;
  if (cpl>0) msg += `💰 CPL: ${fmtMoney(cpl)}\n`;
  if (ventas>0) msg += `🛒 Ventas: ${fmtN(ventas)}\n`;
  if (ingreso>0) msg += `💚 Ingresos: ${fmtMoney(ingreso)}\n`;
  if (roas>0) msg += `📊 ROAS: ${roas.toFixed(2)}x\n`;
  msg += `\n*Proyección al cierre:*\n`;
  msg += `Inversión: ~${fmtMoney(invProy)}\n`;
  if (cpl>0) msg += `Leads: ~${fmtN(invProy/cpl,0)}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n_Trafficker Pro_`;
  return msg;
}

function buildContratoMessage(client) {
  const contratos = client.contratos||[];
  if (!contratos.length) return `📄 *Contrato — ${client.name}*\n\nSin contratos registrados.`;

  let msg = `📄 *Estado del contrato — ${client.name}*\n\n`;
  const hoy = new Date();
  contratos.forEach((ct,ci)=>{
    const pag   = (ct.cuotas||[]).filter(c=>c.pagado).length;
    const total = (ct.cuotas||[]).length;
    msg += `*Contrato #${ci+1}*\n`;
    if (ct.fechaInicio) msg += `Inicio: ${ct.fechaInicio}\n`;
    if (ct.totalContrato) msg += `Total: ${fmtMoney(ct.totalContrato)}\n`;
    msg += `Pagos: ${pag}/${total} cuotas\n`;
    const pend = (ct.cuotas||[]).filter(c=>!c.pagado&&c.monto);
    if (pend.length) {
      msg+=`\n⏰ *Pendientes:*\n`;
      pend.forEach(c=>{
        const vence = c.fecha ? new Date(c.fecha+"T12:00:00") : null;
        const dias  = vence ? Math.ceil((vence-hoy)/86400000) : null;
        msg += `• ${fmtMoney(c.monto)}`;
        if (dias!==null) { if (dias<0) msg+=` ⚠️ VENCIDA`; else if (dias===0) msg+=` 🔴 HOY`; else if (dias<=5) msg+=` 🟡 en ${dias}d`; else msg+=` (${c.fecha})`; }
        msg+=`\n`;
      });
    }
    msg+=`\n`;
  });
  msg+=`_Trafficker Pro_`;
  return msg;
}

function buildKpisMessage(client) {
  const kpis = client.kpis||client.apolloData?.kpisApollo||[];
  if (!kpis.length) return `🎯 *KPIs — ${client.name}*\n\nSin KPIs definidos.`;

  let msg = `🎯 *Progreso de KPIs — ${client.name}*\n\n`;
  const records = client.records||[];

  kpis.forEach(kpi=>{
    const meta   = parseFloat(kpi.meta_valor||kpi.meta||0);
    if (!meta) return;
    const isAvg  = ["ctr","roas","cpc","cpm"].includes(kpi.metrica||kpi.id);
    const campo  = kpi.metrica || kpi.id;
    const total  = records.reduce((a,r)=>a+(Number(r[campo])||0),0);
    const actual = isAvg&&records.length ? Math.round(total/records.length*100)/100 : total;
    const pct    = Math.min(Math.round(actual/meta*100),999);
    const bar    = buildBar(pct);
    const emoji  = pct>=100?"✅":pct>=60?"🟡":pct>=30?"🟠":"🔴";
    msg += `${emoji} *${kpi.nombre||kpi.id}*\n${bar} ${pct}%\n`;
    msg += `Actual: ${actual} / Meta: ${meta} ${kpi.unidad||""}\n\n`;
  });
  msg+=`_Trafficker Pro_`;
  return msg;
}

function buildAyudaMessage(commands, clientName) {
  const activos = commands.filter(c=>c.activo);
  let msg = `🤖 *Trafficker Pro Bot*\n_Panel de ${clientName}_\n\n`;
  activos.forEach(c=>{ msg+=`${c.cmd} — ${c.label}\n_${c.descripcion}_\n\n`; });
  msg+=`💬 _También puedes escribirme en lenguaje natural:_\n"¿Cómo van mis leads hoy?"\n"¿Qué pasa si gasto $150 diarios?"\n"¿Cuántos días faltan para el cierre?"\n\n_Powered by Trafficker Pro_`;
  return msg;
}

// ─── IA — LENGUAJE NATURAL ────────────────────────────────────────────────────
async function respuestaIA(client, mensaje, fbRow) {
  if (!ANTH_KEY) return "No puedo procesar esa consulta. Usa los comandos: /ayuda";

  const records = client.records||[];
  const inv     = records.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
  const leads   = records.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
  const n       = records.length;
  const cpl     = leads>0?inv/leads:0;
  const cap     = client.capturaConfig?.lastData;
  const mision  = (() => {
    const dur  = client.apolloData?.duracion||21;
    const fb   = client.apolloData?.fechaInicioMision||client.contratos?.[0]?.fechaInicio||"";
    if (!fb) return null;
    const dias = Math.max(0,Math.floor((new Date()-new Date(fb+"T00:00:00"))/86400000));
    return { dias, restantes: Math.max(0,dur-dias), pct: Math.min(100,dias/dur*100) };
  })();

  const ctx = `Eres el asistente de campañas de ${client.name} (${client.producto||client.niche||"lanzamiento"}).
Responde en máximo 5 líneas, en español, directo y accionable. Usa *negrita* y _cursiva_ de Telegram.

DATOS:
- Inversión total: ${fmtMoney(inv)} (${n} días)
- Leads totales: ${fmtN(leads)}
- CPL promedio: ${fmtMoney(cpl)}
${fbRow?`- FB hoy: ${fmtMoney(parseFloat(fbRow.spend||0))} gastado, ${(fbRow.actions||[]).find(a=>a.action_type==="lead")?.value||0} leads`:""}
${cap?`- Captura WP: ${fmtN(cap.total_form>0?cap.total_wp/cap.total_form*100:0,1)}% (${fmtN(cap.total_wp)} en WP)`:""}
${mision?`- Misión: día ${mision.dias}, ${mision.restantes} días restantes, ${fmtN(mision.pct,1)}% avance`:""}

No inventes datos. Si no tienes el dato, dilo.`;

  try {
    const res  = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":ANTH_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:350, system:ctx, messages:[{role:"user",content:mensaje}] })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "No pude generar una respuesta. Prueba con /ayuda";
  } catch { return "Error al procesar. Prueba con los comandos: /ayuda"; }
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok:true });

  let body = req.body;
  if (typeof body==="string") { try { body=JSON.parse(body); } catch { return res.status(200).json({ok:true}); } }

  const message = body?.message || body?.edited_message;
  if (!message) return res.status(200).json({ ok:true });

  const chatId = String(message.chat?.id||"");
  const rawText = (message.text||"").trim();
  if (!chatId || !rawText) return res.status(200).json({ ok:true });

  // Buscar cliente — soporta chatId único y chatIds[]
  const clients = await getAllClients();
  const client  = clients.find(c => {
    if (String(c.tgConfig?.chatId)===chatId) return true;
    return (c.tgConfig?.chatIds||[]).some(d=>String(d.chatId)===chatId);
  });

  if (!client) return res.status(200).json({ ok:true });

  const token    = client.tgConfig?.token;
  if (!token) return res.status(200).json({ ok:true });

  const commands = await getGlobalCommands();
  const cmd      = rawText.split(" ")[0].toLowerCase();
  const args     = rawText.split(" ").slice(1).join(" ");
  const isCmd    = cmd.startsWith("/");
  const cmdConfig = commands.find(c=>c.cmd===cmd);

  if (isCmd && cmdConfig && !cmdConfig.activo) {
    await sendTelegram(token, chatId, "Este comando no está disponible ahora.");
    return res.status(200).json({ ok:true });
  }

  const fbToken = getFbToken(client);
  const accId   = getFbAccountId(client);

  try {
    let respuesta = "";

    if (cmd==="/reporte"||cmd==="/hoy") {
      const today = new Date().toISOString().slice(0,10);
      let row = fbToken&&accId ? await getFbInsights(fbToken,accId,today,today) : null;
      if (!row) {
        const r = (client.records||[]).find(r=>r.date===today)||(client.records||[]).slice(-1)[0];
        if (r) row={...r,spend:r.inversion,impressions:r.impresiones,reach:r.alcance,clicks:r.clics_enlace};
      }
      respuesta = buildInsightsMessage(row,"Reporte de hoy",client.name);
    }
    else if (cmd==="/ayer") {
      const ayer = new Date(Date.now()-86400000).toISOString().slice(0,10);
      let row = fbToken&&accId ? await getFbInsights(fbToken,accId,ayer,ayer) : null;
      if (!row) {
        const r = (client.records||[]).find(r=>r.date===ayer)||(client.records||[]).filter(r=>r.date<=ayer).slice(-1)[0];
        if (r) row={...r,spend:r.inversion,impressions:r.impresiones,reach:r.alcance,clicks:r.clics_enlace};
      }
      respuesta = buildInsightsMessage(row,`Reporte de ayer (${ayer})`,client.name);
    }
    else if (cmd==="/semana") {
      const hasta = new Date().toISOString().slice(0,10);
      const desde = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
      let row = fbToken&&accId ? await getFbInsights(fbToken,accId,desde,hasta) : null;
      if (!row) {
        const recs = (client.records||[]).filter(r=>r.date>=desde&&r.date<=hasta);
        if (recs.length) {
          const s=(f)=>recs.reduce((a,r)=>a+(parseFloat(r[f])||0),0);
          const inv2=s("inversion"),impr2=s("impresiones"),alc2=s("alcance"),cl2=s("clics_enlace");
          row={spend:inv2,impressions:impr2,reach:alc2,clicks:cl2,
            cpm:inv2>0&&impr2>0?inv2/impr2*1000:0,cpc:inv2>0&&cl2>0?inv2/cl2:0,ctr:impr2>0&&cl2>0?cl2/impr2*100:0,
            actions:[{action_type:"lead",value:s("resultados")||s("formularios")||s("leads")}],
            _diasConDatos:recs.length};
        }
      }
      respuesta = buildInsightsMessage(row,`Resumen 7 días${row?._diasConDatos?` (${row._diasConDatos}d)`:""}`,client.name);
    }
    else if (cmd==="/mes") {
      respuesta = buildMesMessage(client);
    }
    else if (cmd==="/presupuesto") {
      if (!fbToken||!accId) respuesta=`⚠️ Facebook no conectado para ${client.name}.`;
      else respuesta = await buildPresupuestoMessage(fbToken,accId,client.name);
    }
    else if (cmd==="/mision") {
      respuesta = buildMisionMessage(client);
    }
    else if (cmd==="/captura") {
      respuesta = buildCapturaMessage(client);
    }
    else if (cmd==="/proyeccion") {
      respuesta = buildProyeccionMessage(client, parseFloat(args)||0);
    }
    else if (cmd==="/contrato") {
      respuesta = buildContratoMessage(client);
    }
    else if (cmd==="/kpis") {
      respuesta = buildKpisMessage(client);
    }
    else if (cmd==="/ayuda"||cmd==="/start"||cmd==="/help") {
      respuesta = buildAyudaMessage(commands, client.name);
    }
    else if (isCmd) {
      respuesta = `Comando no reconocido. Escribe /ayuda para ver los disponibles.`;
    }
    else {
      // Lenguaje natural → IA
      const today = new Date().toISOString().slice(0,10);
      let fbRow = null;
      if (/hoy|ahora|vivo|momento|actual/i.test(rawText) && fbToken && accId) {
        fbRow = await getFbInsights(fbToken,accId,today,today).catch(()=>null);
      }
      respuesta = await respuestaIA(client, rawText, fbRow);
    }

    if (respuesta) await sendTelegram(token, chatId, respuesta);

  } catch(e) {
    console.error("Webhook error:", e);
    await sendTelegram(token, chatId, "⚠️ Error procesando tu solicitud. Intenta de nuevo.");
  }

  return res.status(200).json({ ok:true });
}
