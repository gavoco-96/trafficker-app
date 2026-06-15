// ============================================================
// TRAFFICKER PRO — Google Apps Script v4
// Instalar en: Extensions > Apps Script del Google Sheet
// Incluye: Captura WP + Calidad de Lead
// ============================================================

const HOJA_FORM      = "FORM L1-> IMCH";     // Registros Facebook
const HOJA_WP        = "Miembros WP";         // Números del grupo
const HOJA_ENCUESTA  = "Encuesta Calidad";    // Respuestas del Google Form
const HOJA_RESULT    = "Analisis Captura";
const HOJA_CALIDAD   = "Analisis Calidad";
const HOJA_REMARK    = "Remarketing FB→WP";

const COL_TELEFONO   = "numero de telefono";
const COL_CAMPAÑA    = "campaign_name";
const COL_CONJUNTO   = "adset_name";
const COL_ANUNCIO    = "ad_name";

// Columnas de la encuesta — AJUSTA estos nombres a los de tu sheet
const COL_TEL_ENC    = "telefono";           // Columna teléfono en encuesta
const COL_EMAIL_ENC  = "email";              // Columna email en encuesta
const COL_SCORE      = "score";              // Columna con puntuación (0-100)
const COL_TIMESTAMP  = "Marca temporal";     // Columna de fecha/hora Google Forms

// Umbrales de calidad
// Umbrales de calidad — ajusta según tu criterio
// Estos se aplican sobre el score ya convertido a porcentaje (0-100)
const SCORE_ALTO     = 60;   // >= 60% = Alta calidad
const SCORE_MEDIO    = 30;   // >= 30% = Media, < 30% = Baja

// ─── LIMPIAR TELÉFONO ─────────────────────────────────────────
function limpiarTelefono(tel) {
  try {
    if (tel === undefined || tel === null) return "";
    if (tel === 0) return "";
    tel = String(tel).trim();
    if (!tel || tel === "undefined" || tel === "null" || tel === "0") return "";
    tel = tel.replace(/^p:/i, "").replace(/^'/, "").replace(/[\s\-\(\)\.]/g, "");
  tel = tel.replace(/^00/, "+");
  tel = tel.replace(/[^\d+]/g, "");
  if (/^0[0-9]{9}$/.test(tel)) tel = "+593" + tel.slice(1);
  if (/^\d{10,}$/.test(tel)) tel = "+" + tel;
  return tel.length >= 8 ? tel : "";
  } catch(e) { return ""; }
}

function detectarPais(tel) {
  if (!tel) return "🌍 Otro";
  const t = String(tel).replace(/^\+/, "");
  if (t.startsWith("593")) return "🇪🇨 Ecuador";
  if (t.startsWith("57"))  return "🇨🇴 Colombia";
  if (t.startsWith("51"))  return "🇵🇪 Perú";
  if (t.startsWith("52"))  return "🇲🇽 México";
  if (t.startsWith("54"))  return "🇦🇷 Argentina";
  if (t.startsWith("56"))  return "🇨🇱 Chile";
  if (t.startsWith("58"))  return "🇻🇪 Venezuela";
  return "🌍 Otro";
}

// Genera variantes de un teléfono para búsqueda flexible
function variantesTelefono(tel) {
  const limpio = limpiarTelefono(tel);
  if (!limpio) return [];
  const vars = new Set([limpio]);
  const soloDigitos = limpio.replace(/[^\d]/g, "");
  vars.add(soloDigitos);
  if (soloDigitos.length >= 9)  vars.add(soloDigitos.slice(-9));
  if (soloDigitos.length >= 10) vars.add(soloDigitos.slice(-10));
  if (soloDigitos.startsWith("593") && soloDigitos.length > 3)
    vars.add("0" + soloDigitos.slice(3)); // +593987... → 0987...
  return [...vars].filter(Boolean);
}

function clasificarScore(score) {
  if (score >= SCORE_ALTO)  return { label: "Alta",  emoji: "🟢", pct: "alta"  };
  if (score >= SCORE_MEDIO) return { label: "Media", emoji: "🟡", pct: "media" };
  return                           { label: "Baja",  emoji: "🔴", pct: "baja"  };
}

// ─── LEER HOJA CON HEADERS ────────────────────────────────────

// Parsear score en cualquier formato y convertir a porcentaje 0-100
function parsearScore(valor, maxScore) {
  if (valor === undefined || valor === null || valor === "") return 0;
  const s = String(valor).trim();
  if (!s || s === "undefined") return 0;
  
  let n = 0;
  // Formato "8 / 20" o "8/20" → porcentaje directo
  if (s.includes("/")) {
    const parts = s.split("/").map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && parts[1] > 0)
      return Math.round((parts[0] / parts[1]) * 100);
    n = parts[0] || 0;
  } else if (s.endsWith("%")) {
    return parseFloat(s) || 0;
  } else {
    n = parseFloat(s) || 0;
  }
  
  // Convertir usando el máximo detectado
  if (maxScore && maxScore > 0 && maxScore !== 100) {
    return Math.round((n / maxScore) * 100);
  }
  // Si ya viene como porcentaje (0-100)
  return Math.min(100, Math.max(0, n));
}

function leerHoja(ss, nombre) {
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) return null;
  const data = hoja.getDataRange().getValues();
  if (data.length < 2) return { hoja, headers: data[0] || [], rows: [] };
  const headers = data[0].map(h => h.toString().trim().toLowerCase());
  const rows = data.slice(1);
  return { hoja, headers, rows };
}

function getCol(headers, nombre) {
  return headers.indexOf(nombre.toLowerCase());
}

// ─── FUNCIÓN PRINCIPAL: ANÁLISIS COMPLETO ─────────────────────
function analizarTodo() {
  analizarCaptura();
  Utilities.sleep(500);
  analizarCalidad();
  exportarParaTrafficker();
  SpreadsheetApp.getUi().alert("✓ Análisis completo finalizado.\nRevisa las hojas:\n• Analisis Captura\n• Analisis Calidad");
}

// ─── CAPTURA WP ───────────────────────────────────────────────
function analizarCaptura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const form = leerHoja(ss, HOJA_FORM);
  if (!form) { SpreadsheetApp.getUi().alert("No se encontró: " + HOJA_FORM); return; }

  const iTel  = getCol(form.headers, COL_TELEFONO);
  const iCamp = getCol(form.headers, COL_CAMPAÑA);
  const iConj = getCol(form.headers, COL_CONJUNTO);
  const iAd   = getCol(form.headers, COL_ANUNCIO);
  const iNom  = form.headers.findIndex(h => h.includes("nombre") || h.includes("name"));
  const iEmail= form.headers.findIndex(h => h.includes("email") || h.includes("correo"));

  if (iTel < 0) { SpreadsheetApp.getUi().alert("Columna no encontrada: " + COL_TELEFONO); return; }

  const mapaForm = {};
  form.rows.forEach(fila => {
    const tel = limpiarTelefono(String(fila[iTel] || ""));
    if (!tel) return;
    mapaForm[tel] = {
      tel,
      telOriginal: String(fila[iTel] || ""),
      campaña:  iCamp >= 0 ? (String(fila[iCamp] || "").trim() || "(Sin campaña identificada)") : "(Sin campaña identificada)",
      conjunto: iConj >= 0 ? (String(fila[iConj] || "").trim() || "(Sin conjunto identificado)") : "(Sin conjunto identificado)",
      anuncio:  iAd   >= 0 ? (String(fila[iAd]   || "").trim() || "(Sin anuncio identificado)")  : "(Sin anuncio identificado)",
      nombre:   iNom  >= 0 ? String(fila[iNom] || "").trim() : "",
      email:    iEmail>= 0 ? String(fila[iEmail] || "").trim() : "",
      pais:     tel ? detectarPais(tel) : "—",
    };
  });

  // WP
  let hojaWP = ss.getSheetByName(HOJA_WP);
  if (!hojaWP) {
    hojaWP = ss.insertSheet(HOJA_WP);
    hojaWP.getRange("A1").setValue("numero_whatsapp").setFontWeight("bold");
    SpreadsheetApp.getUi().alert("Se creó la hoja '" + HOJA_WP + "'.\nPega los números de WhatsApp en columna A.");
    return;
  }

  const dataWP = hojaWP.getDataRange().getValues();
  const telesWP = new Set();
  for (let i = 1; i < dataWP.length; i++) {
    const tel = limpiarTelefono(String(dataWP[i][0] || ""));
    if (tel) telesWP.add(tel);
  }
  if (telesWP.size === 0) { SpreadsheetApp.getUi().alert("La hoja '" + HOJA_WP + "' está vacía."); return; }

  const conMatch = [], sinMatch = [], noLlegaronWP = [];
  telesWP.forEach(tel => {
    const reg = mapaForm[tel];
    if (reg) conMatch.push({ ...reg, enWP: true });
    else sinMatch.push(tel);
  });
  Object.values(mapaForm).forEach(reg => {
    if (!telesWP.has(reg.tel)) noLlegaronWP.push(reg);
  });

  // Stats por nivel
  const stats = {};
  const agregarStats = (nivel, nombre, tipo) => {
    if (nombre.startsWith("(Sin ")) return;
    const key = nivel + "||" + nombre;
    if (!stats[key]) stats[key] = { nivel, nombre, total_wp: 0, total_form: 0 };
    if (tipo === "wp") stats[key].total_wp++;
    else stats[key].total_form++;
  };
  conMatch.forEach(r => { ["campaña","conjunto","anuncio"].forEach(n => agregarStats(n, r[n], "wp")); });
  Object.values(mapaForm).forEach(r => { ["campaña","conjunto","anuncio"].forEach(n => agregarStats(n, r[n], "form")); });

  // Stats por país
  const statsPais = {};
  Object.values(mapaForm).forEach(reg => {
    if (!statsPais[reg.pais]) statsPais[reg.pais] = { pais: reg.pais, total_form: 0, total_wp: 0 };
    statsPais[reg.pais].total_form++;
  });
  conMatch.forEach(r => { if (statsPais[r.pais]) statsPais[r.pais].total_wp++; });

  // Escribir hoja de resultados
  let hojaRes = ss.getSheetByName(HOJA_RESULT);
  if (!hojaRes) hojaRes = ss.insertSheet(HOJA_RESULT);
  hojaRes.clearContents();
  let fila = 1;
  const now = new Date().toLocaleString("es-EC");
  hojaRes.getRange(fila,1).setValue("ANÁLISIS DE CAPTURA — Trafficker Pro").setFontWeight("bold").setFontSize(13); fila++;
  hojaRes.getRange(fila,1).setValue("Actualizado: " + now); fila++;
  hojaRes.getRange(fila,1).setValue("WP: "+telesWP.size+" | Con origen FB: "+conMatch.length+" | Sin match: "+sinMatch.length+" | Remarketing: "+noLlegaronWP.length); fila+=2;

  ["campaña","conjunto","anuncio"].forEach(nivel => {
    const items = Object.values(stats).filter(s=>s.nivel===nivel&&s.total_form>0)
      .map(s=>({...s, pct:(s.total_form>0?(s.total_wp/s.total_form*100).toFixed(1):0)}))
      .sort((a,b)=>parseFloat(b.pct)-parseFloat(a.pct));
    if (!items.length) return;
    hojaRes.getRange(fila,1).setValue("Por "+nivel.toUpperCase()).setFontWeight("bold"); fila++;
    const hdr=["Nombre","Reg. FB","Pers. WP","% Captura","Pendientes"];
    hojaRes.getRange(fila,1,1,hdr.length).setValues([hdr]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
    items.forEach(item => {
      const pct=parseFloat(item.pct), color=pct>=70?"#0a3d0a":pct>=50?"#3d3a00":"#3d0a0a";
      hojaRes.getRange(fila,1,1,5).setValues([[item.nombre,item.total_form,item.total_wp,pct+"%",item.total_form-item.total_wp]]);
      hojaRes.getRange(fila,4).setBackground(color).setFontColor("#fff"); fila++;
    });
    fila+=2;
  });

  // Remarketing
  let hojaRem = ss.getSheetByName(HOJA_REMARK);
  if (!hojaRem) hojaRem = ss.insertSheet(HOJA_REMARK);
  hojaRem.clearContents();
  const remHdr=["Teléfono","Teléfono limpio","País","Campaña","Conjunto","Anuncio","Nombre","Email"];
  hojaRem.getRange(1,1,1,remHdr.length).setValues([remHdr]).setFontWeight("bold").setBackground("#3d0a0a").setFontColor("#fff");
  noLlegaronWP.forEach((r,i)=>hojaRem.getRange(i+2,1,1,8).setValues([[r.telOriginal,r.tel,r.pais,r.campaña,r.conjunto,r.anuncio,r.nombre,r.email]]));
  hojaRem.autoResizeColumns(1,8);

  // Guardar resultados para exportar
  ss.getRangeByName || null;
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(hojaRes);
}

// ─── CALIDAD DE LEAD ──────────────────────────────────────────
function analizarCalidad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Leer encuesta
  const enc = leerHoja(ss, HOJA_ENCUESTA);
  if (!enc) {
    SpreadsheetApp.getUi().alert(
      "No se encontró la hoja '" + HOJA_ENCUESTA + "'.\n\n" +
      "Para crearla:\n1. Abre tu Google Form\n2. Respuestas → Ver en Hojas de cálculo\n" +
      "3. Renombra la hoja creada a '" + HOJA_ENCUESTA + "'"
    );
    return;
  }

  const iTelEnc   = getCol(enc.headers, COL_TEL_ENC);
  const iScore    = getCol(enc.headers, COL_SCORE);
  const iTs       = getCol(enc.headers, COL_TIMESTAMP);
  const iEmailEnc = getCol(enc.headers, COL_EMAIL_ENC);

  if (iTelEnc < 0 && iEmailEnc < 0) {
    SpreadsheetApp.getUi().alert("No se encontró columna de teléfono ni email en la encuesta.\nColumnas disponibles: " + enc.headers.join(", "));
    return;
  }
  if (iScore < 0) {
    SpreadsheetApp.getUi().alert("No se encontró columna '" + COL_SCORE + "' en la encuesta.\nColumnas: " + enc.headers.join(", "));
    return;
  }

  // Leer formulario Facebook para cruce
  const form = leerHoja(ss, HOJA_FORM);
  const iTelForm = form ? getCol(form.headers, COL_TELEFONO) : -1;
  const iCamp    = form ? getCol(form.headers, COL_CAMPAÑA)  : -1;
  const iConj    = form ? getCol(form.headers, COL_CONJUNTO) : -1;
  const iAd      = form ? getCol(form.headers, COL_ANUNCIO)  : -1;

  const mapaForm = {};
  if (form && iTelForm >= 0) {
    form.rows.forEach(fila => {
      const tel = limpiarTelefono(String(fila[iTelForm] || ""));
      if (!tel) return;
      mapaForm[tel] = {
        campaña:  iCamp>=0?(String(fila[iCamp]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
        conjunto: iConj>=0?(String(fila[iConj]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
        anuncio:  iAd  >=0?(String(fila[iAd]  ||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      };
    });
  }

  // Detectar el máximo del score dinámicamente
  // Estrategia: buscar el denominador en el header de la columna score
  // Google Forms pone el máximo en el encabezado: "score [max: 20]" o similar
  const maxScoreDetectado = (() => {
    // 1. Intentar extraer del header de score
    const headerScore = enc.headers[iScore] || "";
    const matchHeader = headerScore.match(/[\/\-]\s*(\d+)/);
    if (matchHeader) return parseFloat(matchHeader[1]);

    // 2. Buscar denominadores en los valores (formato "8 / 20")
    const denominadores = enc.rows.map(f => {
      if (!f || f[iScore] === undefined || f[iScore] === "") return 0;
      const s = String(f[iScore]).trim();
      if (s.includes("/")) {
        const p = s.split("/");
        return parseFloat((p[1]||"").trim()) || 0;
      }
      return 0;
    }).filter(v => v > 0);
    if (denominadores.length > 0) return Math.max(...denominadores);

    // 3. Si los valores son números directos, el máximo observado ES el denominador
    const vals = enc.rows
      .map(f => parseFloat(String(f && f[iScore] || "0")) || 0)
      .filter(v => v > 0);
    if (!vals.length) return 100;
    const maxObservado = Math.max(...vals);
    // Si el máximo observado es <= 25, asumir que es la escala (ej: 20 puntos)
    if (maxObservado <= 25) return maxObservado;
    // Si es mayor, asumir que ya viene en porcentaje (0-100)
    return 100;
  })();
  Logger.log("Max score detectado: " + maxScoreDetectado);

  // Procesar encuesta
  const respuestas = [];
  Logger.log("iTelEnc="+iTelEnc+" iScore="+iScore+" iEmailEnc="+iEmailEnc+" iTs="+iTs);
  Logger.log("Total filas encuesta: " + enc.rows.length);

  enc.rows.forEach((fila, idx) => {
    // Saltar filas sin ningún valor
    if (!fila || !fila.length) return;
    const primerValor = fila.find(c => c !== null && c !== undefined && c !== "");
    if (!primerValor) return;

    const telRaw = iTelEnc >= 0 ? String(fila[iTelEnc] || "") : "";
    const tel    = limpiarTelefono(telRaw);
    const score = parsearScore(fila[iScore], maxScoreDetectado);
    const ts     = iTs >= 0 ? fila[iTs] : "";
    const email  = iEmailEnc >= 0 ? String(fila[iEmailEnc] || "") : "";

    Logger.log("Fila "+idx+": tel="+telRaw+" → "+tel+" | score="+score+" | email="+email);

    if (!tel && !email) {
      Logger.log("  SALTADA: sin tel ni email");
      return;
    }

    // Buscar con todas las variantes del teléfono
    let origen = null;
    const telVariantes = variantesTelefono(telRaw || tel);
    for (const v of telVariantes) {
      if (mapaForm[v]) { origen = mapaForm[v]; break; }
    }
    // Si no encontró por teléfono, intentar por email
    if (!origen && email) {
      origen = Object.values(mapaForm).find(r => r.email && r.email.toLowerCase() === email.toLowerCase());
    }
    origen = origen || { campaña:"(Sin cruce)", conjunto:"(Sin cruce)", anuncio:"(Sin cruce)" };
    const calif  = clasificarScore(score);

    respuestas.push({ tel, email, score, ts, calif, ...origen });
  });

  Logger.log("Total respuestas procesadas: " + respuestas.length);

  if (respuestas.length === 0) {
    const logUrl = "Ver logs en: Extensiones → Apps Script → Ejecutar → Ver logs";
    SpreadsheetApp.getUi().alert(
      "Se encontraron " + enc.rows.length + " filas en la hoja '" + HOJA_ENCUESTA + "' pero 0 fueron procesadas.\n\n" +
      "Verifica en el log de Apps Script qué está pasando.\n" +
      "Extensiones → Apps Script → ícono de ▶ junto a 'analizarCalidad' → Ver logs"
    );
    return;
  }

  // Estadísticas por anuncio
  const statsCal = {};
  respuestas.forEach(r => {
    const key = r.anuncio;
    if (!statsCal[key]) statsCal[key] = { anuncio:key, total:0, alta:0, media:0, baja:0, sumScore:0, scores:[] };
    statsCal[key].total++;
    statsCal[key].sumScore += r.score;
    statsCal[key].scores.push(r.score);
    if (r.calif.pct==="alta")  statsCal[key].alta++;
    else if (r.calif.pct==="media") statsCal[key].media++;
    else statsCal[key].baja++;
  });

  // Escribir hoja de calidad
  let hojaCal = ss.getSheetByName(HOJA_CALIDAD);
  if (!hojaCal) hojaCal = ss.insertSheet(HOJA_CALIDAD);
  hojaCal.clearContents();
  let fila = 1;
  const now = new Date().toLocaleString("es-EC");

  hojaCal.getRange(fila,1).setValue("ANÁLISIS DE CALIDAD DE LEADS — Trafficker Pro").setFontWeight("bold").setFontSize(13); fila++;
  hojaCal.getRange(fila,1).setValue("Actualizado: "+now+" | Total respuestas: "+respuestas.length); fila+=2;

  // Resumen general
  const totalAlta  = respuestas.filter(r=>r.calif.pct==="alta").length;
  const totalMedia = respuestas.filter(r=>r.calif.pct==="media").length;
  const totalBaja  = respuestas.filter(r=>r.calif.pct==="baja").length;
  const scoreGlobal = respuestas.reduce((a,r)=>a+r.score,0)/respuestas.length;
  hojaCal.getRange(fila,1).setValue("RESUMEN GENERAL").setFontWeight("bold"); fila++;
  hojaCal.getRange(fila,1,1,4).setValues([["Score promedio","Leads Alta","Leads Media","Leads Baja"]]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
  hojaCal.getRange(fila,1,1,4).setValues([[scoreGlobal.toFixed(1)+"%",totalAlta+" ("+((totalAlta/respuestas.length)*100).toFixed(0)+"%)",totalMedia+" ("+((totalMedia/respuestas.length)*100).toFixed(0)+"%)",totalBaja+" ("+((totalBaja/respuestas.length)*100).toFixed(0)+"%)"]]);
  const colorGlobal = scoreGlobal>=SCORE_ALTO?"#0a3d0a":scoreGlobal>=SCORE_MEDIO?"#3d3a00":"#3d0a0a";
  hojaCal.getRange(fila,1).setBackground(colorGlobal).setFontColor("#fff");
  fila+=3;

  // Por anuncio
  hojaCal.getRange(fila,1).setValue("POR ANUNCIO").setFontWeight("bold"); fila++;
  const hdr=["Anuncio","Respuestas","Score Prom.","🟢 Alta","🟡 Media","🔴 Baja","% Alta","Ranking"];
  hojaCal.getRange(fila,1,1,hdr.length).setValues([hdr]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;

  Object.values(statsCal)
    .sort((a,b)=>(b.sumScore/b.total)-(a.sumScore/a.total))
    .forEach((s,idx) => {
      const avg = s.sumScore/s.total;
      const pctAlta = (s.alta/s.total*100).toFixed(0)+"%";
      const ranking = idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":"#"+(idx+1);
      const color = avg>=SCORE_ALTO?"#0a3d0a":avg>=SCORE_MEDIO?"#3d3a00":"#3d0a0a";
      hojaCal.getRange(fila,1,1,8).setValues([[s.anuncio,s.total,avg.toFixed(1)+"%",s.alta,s.media,s.baja,pctAlta,ranking]]);
      hojaCal.getRange(fila,3).setBackground(color).setFontColor("#fff");
      fila++;
    });
  fila+=2;

  // Detalle individual
  hojaCal.getRange(fila,1).setValue("DETALLE — Respuestas individuales").setFontWeight("bold"); fila++;
  const detHdr=["Teléfono","Score","Calidad","Campaña","Conjunto","Anuncio","Email","Fecha respuesta"];
  hojaCal.getRange(fila,1,1,detHdr.length).setValues([detHdr]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
  respuestas.sort((a,b)=>b.score-a.score).forEach(r => {
    hojaCal.getRange(fila,1,1,8).setValues([[r.tel,r.score+"%",r.calif.emoji+" "+r.calif.label,r.campaña,r.conjunto,r.anuncio,r.email,r.ts]]);
    const c=r.calif.pct==="alta"?"#0a3d0a":r.calif.pct==="media"?"#3d3a00":"#3d0a0a";
    hojaCal.getRange(fila,3).setBackground(c).setFontColor("#fff");
    fila++;
  });

  hojaCal.autoResizeColumns(1,8);
  ss.setActiveSheet(hojaCal);
}

// ─── EXPORTAR PARA TRAFFICKER PRO ─────────────────────────────
function exportarParaTrafficker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const form = leerHoja(ss, HOJA_FORM);
  const enc  = leerHoja(ss, HOJA_ENCUESTA);

  if (!form) { SpreadsheetApp.getUi().alert("Ejecuta el análisis primero."); return; }

  const iTelForm = getCol(form.headers, COL_TELEFONO);
  const iCamp    = getCol(form.headers, COL_CAMPAÑA);
  const iConj    = getCol(form.headers, COL_CONJUNTO);
  const iAd      = getCol(form.headers, COL_ANUNCIO);

  // Mapa formulario
  const mapaForm = {};
  form.rows.forEach(fila => {
    const tel = limpiarTelefono(String(fila[iTelForm]||""));
    if (!tel) return;
    mapaForm[tel] = {
      campaña:  iCamp>=0?(String(fila[iCamp]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      conjunto: iConj>=0?(String(fila[iConj]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      anuncio:  iAd  >=0?(String(fila[iAd]  ||"").trim()||"(Sin identificar)"):"(Sin identificar)",
    };
  });

  // Mapa WP
  const hojaWP = ss.getSheetByName(HOJA_WP);
  const telesWP = new Set();
  if (hojaWP) {
    const d = hojaWP.getDataRange().getValues();
    for (let i=1;i<d.length;i++) { const t=limpiarTelefono(String(d[i][0]||"")); if(t) telesWP.add(t); }
  }

  // Stats captura
  const statsCaptura = {};
  const agregarStat = (nivel, nombre, tipo) => {
    if (nombre.startsWith("(Sin ")) return;
    const key = nivel+"||"+nombre;
    if (!statsCaptura[key]) statsCaptura[key] = { nivel, nombre, total_wp:0, total_form:0 };
    if (tipo==="wp") statsCaptura[key].total_wp++;
    else statsCaptura[key].total_form++;
  };
  Object.values(mapaForm).forEach(r => ["campaña","conjunto","anuncio"].forEach(n=>agregarStat(n,r[n],"form")));
  telesWP.forEach(tel => { const r=mapaForm[tel]; if(r) ["campaña","conjunto","anuncio"].forEach(n=>agregarStat(n,r[n],"wp")); });

  // Stats calidad
  const statsCalidad = {};
  if (enc) {
    const iTelEnc = getCol(enc.headers, COL_TEL_ENC);
    const iScore  = getCol(enc.headers, COL_SCORE);
    if (iTelEnc>=0 && iScore>=0) {
      enc.rows.forEach(fila => {
        const tel   = limpiarTelefono(String(fila[iTelEnc]||""));
        const scoreMaxExp = enc.rows.filter(f=>f&&f[iScore]).map(f=>{const s=String(f[iScore]);if(s.includes("/")){const p=s.split("/");return parseFloat(p[1])||0;}return 0;}).filter(v=>v>0);
        const maxScExp = scoreMaxExp.length ? Math.max(...scoreMaxExp) : 100;
        const score = parsearScore(fila[iScore], maxScExp);
        const origen = (tel&&mapaForm[tel])||{anuncio:"(Sin cruce)"};
        const key   = origen.anuncio;
        if (!statsCalidad[key]) statsCalidad[key] = { anuncio:key, total:0, alta:0, media:0, baja:0, sumScore:0 };
        statsCalidad[key].total++;
        statsCalidad[key].sumScore += score;
        const c = clasificarScore(score);
        statsCalidad[key][c.pct]++;
      });
    }
  }

  // Pendientes remarketing
  const telsPendientes = Object.values(mapaForm).filter(r=>!telesWP.has(r.tel)).map(r=>r.tel).filter(Boolean);

  // Sin anuncio identificado
  const sinAnuncio = [];
  telesWP.forEach(tel => {
    const r = mapaForm[tel];
    if (r && r.anuncio.startsWith("(Sin ")) sinAnuncio.push({ tel, pais:detectarPais(tel), nombre:r.nombre||"" });
  });

  // Construir resultado
  const resultCaptura = {
    fecha: new Date().toISOString(),
    total_wp: telesWP.size,
    total_form: Object.keys(mapaForm).length,
    total_con_match: [...telesWP].filter(t=>mapaForm[t]).length,
    total_remarketing: telsPendientes.length,
    telefonosPendientes: telsPendientes,
    sinAnuncioIdentificado: sinAnuncio,
    paises: [],
    niveles: {}
  };

  // Paises
  const statsPaises = {};
  Object.values(mapaForm).forEach(r => {
    const pais = detectarPais(r.tel);
    if (!statsPaises[pais]) statsPaises[pais] = { pais, total_form:0, total_wp:0 };
    statsPaises[pais].total_form++;
  });
  telesWP.forEach(tel => { const r=mapaForm[tel]; if(r){ const p=detectarPais(tel); if(statsPaises[p]) statsPaises[p].total_wp++; } });
  resultCaptura.paises = Object.values(statsPaises).sort((a,b)=>b.total_form-a.total_form);

  ["campaña","conjunto","anuncio"].forEach(n => {
    resultCaptura.niveles[n] = Object.values(statsCaptura)
      .filter(s=>s.nivel===n&&s.total_form>0)
      .map(s=>({ nombre:s.nombre, total_form:s.total_form, total_wp:s.total_wp,
        pendientes:s.total_form-s.total_wp,
        pct_captura:s.total_form>0?parseFloat((s.total_wp/s.total_form*100).toFixed(1)):0,
        pct_del_total:telesWP.size>0?parseFloat((s.total_wp/telesWP.size*100).toFixed(1)):0 }))
      .sort((a,b)=>b.pct_captura-a.pct_captura);
  });

  // Resultado calidad
  const totalEnc = Object.values(statsCalidad).reduce((a,v)=>a+v.total,0);
  const scoreGlobal = totalEnc > 0 ? Object.values(statsCalidad).reduce((a,v)=>a+v.sumScore,0)/totalEnc : 0;
  const resultCalidad = {
    total_respuestas: totalEnc,
    score_promedio: parseFloat(scoreGlobal.toFixed(1)),
    distribucion: {
      alta:  Object.values(statsCalidad).reduce((a,v)=>a+v.alta,0),
      media: Object.values(statsCalidad).reduce((a,v)=>a+v.media,0),
      baja:  Object.values(statsCalidad).reduce((a,v)=>a+v.baja,0),
    },
    por_anuncio: Object.values(statsCalidad)
      .map(s=>({ anuncio:s.anuncio, total:s.total, score_prom:s.total>0?parseFloat((s.sumScore/s.total).toFixed(1)):0,
        alta:s.alta, media:s.media, baja:s.baja,
        pct_alta:s.total>0?parseFloat((s.alta/s.total*100).toFixed(1)):0 }))
      .sort((a,b)=>b.score_prom-a.score_prom)
  };

  // Guardar en hojas ocultas
  const guardar = (nombre, valor) => {
    let h = ss.getSheetByName(nombre);
    if (!h) h = ss.insertSheet(nombre);
    h.getRange("A1").setValue(JSON.stringify(valor));
    h.hideSheet();
  };
  guardar("__trafficker_api__", resultCaptura);
  guardar("__trafficker_calidad__", resultCalidad);

  SpreadsheetApp.getUi().alert(
    "✓ Exportado para Trafficker Pro\n\n" +
    "📊 Captura: "+resultCaptura.total_wp+" en WP · "+resultCaptura.total_con_match+" identificados\n" +
    "⭐ Calidad: "+totalEnc+" respuestas · Score "+scoreGlobal.toFixed(1)+"%\n" +
    "🎯 Remarketing: "+telsPendientes.length+" pendientes"
  );
}


// ─── DIAGNÓSTICO — ejecuta esto para ver qué está pasando ─────
function diagnosticar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let msg = "=== DIAGNÓSTICO TRAFFICKER PRO ===\n\n";

  // Listar todas las hojas
  const hojas = ss.getSheets().map(h => h.getName());
  msg += "📋 Hojas encontradas:\n" + hojas.map(h => "  • " + h).join("\n") + "\n\n";

  // Verificar hoja de encuesta
  const hojaEnc = ss.getSheetByName(HOJA_ENCUESTA);
  if (!hojaEnc) {
    msg += "❌ NO se encontró la hoja: '" + HOJA_ENCUESTA + "'\n";
    msg += "   Renombra la hoja de respuestas a exactamente: " + HOJA_ENCUESTA + "\n\n";
  } else {
    const data = hojaEnc.getDataRange().getValues();
    msg += "✅ Hoja '" + HOJA_ENCUESTA + "' encontrada\n";
    msg += "   Filas totales: " + data.length + "\n";
    if (data.length > 0) {
      msg += "   Headers: " + data[0].join(" | ") + "\n";
      const headers = data[0].map(h => h.toString().trim().toLowerCase());
      msg += "\n   Buscando columnas:\n";
      msg += "   • telefono → columna " + (headers.indexOf("telefono") + 1) + "\n";
      msg += "   • email → columna " + (headers.indexOf("email") + 1) + "\n";
      msg += "   • score → columna " + (headers.indexOf("score") + 1) + "\n";
      if (data.length > 1) {
        msg += "\n   Primera fila de datos:\n";
        data[1].forEach((v, i) => {
          if (v) msg += "   Col "+(i+1)+": " + String(v).substring(0,50) + "\n";
        });
      }
    }
  }

  SpreadsheetApp.getUi().alert(msg);
}

// ─── MENÚ ─────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Trafficker Pro")
    .addItem("📊 Analizar captura FB → WP", "analizarCaptura")
    .addItem("⭐ Analizar calidad de leads", "analizarCalidad")
    .addItem("🔍 Diagnóstico / Debug", "diagnosticar")
    .addSeparator()
    .addItem("🔄 Análisis completo + Exportar", "analizarTodo")
    .addSeparator()
    .addItem("📤 Exportar para Trafficker Pro", "exportarParaTrafficker")
    .addToUi();
}
