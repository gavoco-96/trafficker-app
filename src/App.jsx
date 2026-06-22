// ============================================================
// TRAFFICKER PRO — Google Apps Script v5
// Fixes: búsqueda flexible de columnas + optimización de tiempo
// ============================================================

const HOJA_FORM      = "FORM L1-> IMCH";
const HOJA_WP        = "Miembros WP";
const HOJA_ENCUESTA  = "Encuesta Calidad";
const HOJA_RESULT    = "Analisis Captura";
const HOJA_CALIDAD   = "Analisis Calidad";
const HOJA_REMARK    = "Remarketing FB→WP";

const COL_TELEFONO   = "numero de telefono";
const COL_CAMPAÑA    = "campaign_name";
const COL_CONJUNTO   = "adset_name";
const COL_ANUNCIO    = "ad_name";

// ── Búsqueda flexible de columna ──────────────────────────────
// Busca por coincidencia parcial o palabras clave
// Esto soluciona el problema de Google Forms que pone la pregunta completa como header
const PALABRAS_TELEFONO = ["numero de telefono", "teléfono", "telefono", "phone", "celular", "móvil", "movil", "whatsapp"];
const PALABRAS_EMAIL    = ["email", "correo", "e-mail", "gmail"];
const PALABRAS_SCORE    = ["puntuación", "puntuacion", "score", "puntaje", "calificacion", "calificación", "resultado"];
const PALABRAS_TIMESTAMP= ["marca temporal", "timestamp", "fecha"];

const SCORE_ALTO  = 60;
const SCORE_MEDIO = 30;

// ─── UTILS ───────────────────────────────────────────────────
function limpiarTelefono(tel) {
  try {
    if (!tel && tel !== 0) return "";
    tel = String(tel).trim();
    if (!tel || tel === "undefined" || tel === "null" || tel === "0") return "";
    tel = tel.replace(/^p:/i, "").replace(/^'/, "").replace(/[\s\-\(\)\.]/g, "");
    tel = tel.replace(/^00/, "+").replace(/[^\d+]/g, "");
    if (/^0[0-9]{9}$/.test(tel)) tel = "+593" + tel.slice(1);
    if (/^\d{10,}$/.test(tel)) tel = "+" + tel;
    return tel.length >= 8 ? tel : "";
  } catch { return ""; }
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

function variantesTelefono(tel) {
  const limpio = limpiarTelefono(tel);
  if (!limpio) return [];
  const vars = new Set([limpio]);
  const soloDigitos = limpio.replace(/[^\d]/g, "");
  vars.add(soloDigitos);
  if (soloDigitos.length >= 9)  vars.add(soloDigitos.slice(-9));
  if (soloDigitos.length >= 10) vars.add(soloDigitos.slice(-10));
  if (soloDigitos.startsWith("593") && soloDigitos.length > 3)
    vars.add("0" + soloDigitos.slice(3));
  return [...vars].filter(Boolean);
}

function clasificarScore(score) {
  // score ya debe llegar en escala 0-100
  if (score >= SCORE_ALTO)  return { label:"Alta",  emoji:"🟢", pct:"alta"  };
  if (score >= SCORE_MEDIO) return { label:"Media", emoji:"🟡", pct:"media" };
  return                           { label:"Baja",  emoji:"🔴", pct:"baja"  };
}

// Normalizar score a escala 0-100 siempre
function normalizarScore(valor, maxScore) {
  let s = parsearScore(valor, maxScore);
  // Si parsearScore devolvió fracción (0-1), multiplicar × 100
  if (s > 0 && s <= 1) s = Math.round(s * 100);
  return Math.min(100, Math.max(0, s));
}

function parsearScore(valor, maxScore) {
  if (valor === undefined || valor === null || valor === "") return 0;
  const s = String(valor).trim();
  if (!s || s === "undefined") return 0;
  let n = 0;
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
  if (maxScore && maxScore > 0 && maxScore !== 100)
    return Math.round((n / maxScore) * 100);
  return Math.min(100, Math.max(0, n));
}

function leerHoja(ss, nombre) {
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) return null;
  const data = hoja.getDataRange().getValues();
  if (data.length < 2) return { hoja, headers: data[0] || [], rows: [] };
  const headers = data[0].map(h => h.toString().trim().toLowerCase());
  return { hoja, headers, rows: data.slice(1) };
}

// ── Búsqueda flexible — el fix principal ────────────────────
// Busca una columna por lista de palabras clave (coincidencia parcial)
function getColFlex(headers, palabrasClave) {
  // 1. Coincidencia exacta primero
  for (const palabra of palabrasClave) {
    const idx = headers.indexOf(palabra.toLowerCase());
    if (idx >= 0) return idx;
  }
  // 2. Coincidencia parcial — el header contiene la palabra clave
  for (const palabra of palabrasClave) {
    const idx = headers.findIndex(h => h.includes(palabra.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function getCol(headers, nombre) {
  return headers.indexOf(nombre.toLowerCase());
}

// ─── ANÁLISIS COMPLETO ───────────────────────────────────────
function analizarTodo() {
  analizarCaptura();
  Utilities.sleep(300);
  analizarCalidad();
  exportarParaTrafficker();
  SpreadsheetApp.getUi().alert("✓ Análisis completo finalizado.");
}

// ─── CAPTURA WP ──────────────────────────────────────────────
function analizarCaptura() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
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
      campaña:  iCamp >= 0 ? (String(fila[iCamp]||"").trim()||"(Sin campaña)") : "(Sin campaña)",
      conjunto: iConj >= 0 ? (String(fila[iConj]||"").trim()||"(Sin conjunto)") : "(Sin conjunto)",
      anuncio:  iAd   >= 0 ? (String(fila[iAd]  ||"").trim()||"(Sin anuncio)")  : "(Sin anuncio)",
      nombre:   iNom  >= 0 ? String(fila[iNom]||"").trim() : "",
      email:    iEmail>= 0 ? String(fila[iEmail]||"").trim() : "",
      pais:     detectarPais(tel),
    };
  });

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
    if (reg) conMatch.push({ ...reg, enWP:true });
    else sinMatch.push(tel);
  });
  Object.values(mapaForm).forEach(reg => {
    if (!telesWP.has(reg.tel)) noLlegaronWP.push(reg);
  });

  const stats = {};
  const agregarStats = (nivel, nombre, tipo) => {
    if (nombre.startsWith("(Sin ")) return;
    const key = nivel+"||"+nombre;
    if (!stats[key]) stats[key] = { nivel, nombre, total_wp:0, total_form:0 };
    if (tipo==="wp") stats[key].total_wp++;
    else stats[key].total_form++;
  };
  conMatch.forEach(r => ["campaña","conjunto","anuncio"].forEach(n=>agregarStats(n,r[n],"wp")));
  Object.values(mapaForm).forEach(r => ["campaña","conjunto","anuncio"].forEach(n=>agregarStats(n,r[n],"form")));

  // Escribir hoja resultado
  let hojaRes = ss.getSheetByName(HOJA_RESULT);
  if (!hojaRes) hojaRes = ss.insertSheet(HOJA_RESULT);
  hojaRes.clearContents();
  const now = new Date().toLocaleString("es-EC");
  let fila = 1;
  const pct = telesWP.size>0?((conMatch.length/telesWP.size)*100).toFixed(1):0;

  hojaRes.getRange(fila,1).setValue("ANÁLISIS DE CAPTURA — Trafficker Pro").setFontWeight("bold").setFontSize(13); fila++;
  hojaRes.getRange(fila,1).setValue("Actualizado: "+now); fila++;
  hojaRes.getRange(fila,1).setValue(
    "WP: "+telesWP.size+" | Con origen FB: "+conMatch.length+" | Sin match: "+sinMatch.length+" | Remarketing: "+noLlegaronWP.length
  ); fila+=2;

  ["campaña","conjunto","anuncio"].forEach(nivel => {
    hojaRes.getRange(fila,1).setValue("Por "+nivel.toUpperCase()).setFontWeight("bold"); fila++;
    hojaRes.getRange(fila,1,1,4).setValues([["Nombre","Reg. FB","Pers. WP","% Captura"]]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
    Object.values(stats).filter(s=>s.nivel===nivel&&s.total_form>0)
      .sort((a,b)=>b.total_wp-a.total_wp).slice(0,30)
      .forEach(s => {
        const p = s.total_form>0?(s.total_wp/s.total_form*100).toFixed(1)+"%":"0%";
        hojaRes.getRange(fila,1,1,4).setValues([[s.nombre,s.total_form,s.total_wp,p]]);
        fila++;
      });
    fila+=2;
  });

  hojaRes.autoResizeColumns(1,4);
  ss.setActiveSheet(hojaRes);
  SpreadsheetApp.getUi().alert("✓ Captura analizada: "+telesWP.size+" en WP · "+conMatch.length+" identificados ("+pct+"%)");
}

// ─── CALIDAD DE LEADS ────────────────────────────────────────
function analizarCalidad() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const enc = leerHoja(ss, HOJA_ENCUESTA);

  if (!enc) {
    SpreadsheetApp.getUi().alert(
      "No se encontró la hoja: '" + HOJA_ENCUESTA + "'\n\n" +
      "Hojas disponibles:\n" + ss.getSheets().map(h=>"• "+h.getName()).join("\n")
    );
    return;
  }

  Logger.log("Headers encuesta: " + enc.headers.join(" | "));

  // ── Búsqueda FLEXIBLE de columnas ─────────────────────────
  const iTelEnc   = getColFlex(enc.headers, PALABRAS_TELEFONO);
  const iEmailEnc = getColFlex(enc.headers, PALABRAS_EMAIL);
  const iScore    = getColFlex(enc.headers, PALABRAS_SCORE);
  const iTs       = getColFlex(enc.headers, PALABRAS_TIMESTAMP);

  Logger.log("Columnas detectadas — tel:"+iTelEnc+" email:"+iEmailEnc+" score:"+iScore+" ts:"+iTs);

  if (iScore < 0) {
    SpreadsheetApp.getUi().alert(
      "No se encontró columna de puntuación en la encuesta.\n\n" +
      "Columnas disponibles:\n" + enc.headers.join("\n") +
      "\n\nAsegúrate que la columna de puntaje se llame 'score', 'puntuacion', 'puntaje' o similar."
    );
    return;
  }

  if (iTelEnc < 0 && iEmailEnc < 0) {
    // Mostrar columnas disponibles para que el usuario sepa qué cambiar
    SpreadsheetApp.getUi().alert(
      "No se encontró columna de teléfono ni email en la encuesta.\n\n" +
      "Columnas disponibles: " + enc.headers.join(", ") + "\n\n" +
      "Edita las constantes PALABRAS_TELEFONO y PALABRAS_EMAIL en el script para que coincidan con tus headers."
    );
    return;
  }

  // Obtener mapa de formulario para cruce
  const form = leerHoja(ss, HOJA_FORM);
  const mapaForm = {};
  if (form) {
    const iTelForm = getCol(form.headers, COL_TELEFONO);
    const iCamp    = getCol(form.headers, COL_CAMPAÑA);
    const iConj    = getCol(form.headers, COL_CONJUNTO);
    const iAd      = getCol(form.headers, COL_ANUNCIO);
    const iEmail   = form.headers.findIndex(h=>h.includes("email")||h.includes("correo"));
    form.rows.forEach(fila => {
      const tel = limpiarTelefono(String(fila[iTelForm]||""));
      if (!tel) return;
      const entry = {
        tel,
        campaña:  iCamp>=0?(String(fila[iCamp]||"").trim()||"(Sin campaña)"):"(Sin campaña)",
        conjunto: iConj>=0?(String(fila[iConj]||"").trim()||"(Sin conjunto)"):"(Sin conjunto)",
        anuncio:  iAd  >=0?(String(fila[iAd]  ||"").trim()||"(Sin anuncio)") :"(Sin anuncio)",
        email:    iEmail>=0?String(fila[iEmail]||"").trim():"",
      };
      mapaForm[tel] = entry;
      // También indexar por email si existe
      if (entry.email) mapaForm["email:"+entry.email.toLowerCase()] = entry;
    });
  }

  // Detectar máximo score
  const maxScoreDetectado = (() => {
    const headerScore = enc.headers[iScore] || "";
    const matchHeader = headerScore.match(/[\/\-]\s*(\d+)/);
    if (matchHeader) return parseFloat(matchHeader[1]);
    const denominadores = enc.rows.map(f => {
      if (!f || f[iScore] === undefined || f[iScore] === "") return 0;
      const s = String(f[iScore]).trim();
      if (s.includes("/")) { const p=s.split("/"); return parseFloat((p[1]||"").trim())||0; }
      return 0;
    }).filter(v=>v>0);
    if (denominadores.length > 0) return Math.max(...denominadores);
    const vals = enc.rows.map(f=>parseFloat(String(f&&f[iScore]||"0"))||0).filter(v=>v>0);
    if (!vals.length) return 100;
    const mx = Math.max(...vals);
    return mx <= 25 ? mx : 100;
  })();
  Logger.log("Max score detectado: " + maxScoreDetectado);

  // Procesar respuestas — en lotes para evitar timeout
  const respuestas = [];
  const LOTE = 200;

  for (let i = 0; i < enc.rows.length; i++) {
    const fila = enc.rows[i];
    if (!fila || !fila.length) continue;
    if (!fila.find(c=>c!==null&&c!==undefined&&c!=="")) continue;

    const telRaw = iTelEnc >= 0 ? String(fila[iTelEnc]||"") : "";
    const email  = iEmailEnc >= 0 ? String(fila[iEmailEnc]||"").trim().toLowerCase() : "";
    // Parsear y normalizar score a 0-100
    const score  = normalizarScore(fila[iScore], maxScoreDetectado);
    const ts     = iTs >= 0 ? fila[iTs] : "";

    if (!telRaw && !email) continue;

    // Buscar origen por teléfono y email
    let origen = null;
    if (telRaw) {
      for (const v of variantesTelefono(telRaw)) {
        if (mapaForm[v]) { origen = mapaForm[v]; break; }
      }
    }
    if (!origen && email) origen = mapaForm["email:"+email];
    origen = origen || { campaña:"(Sin cruce)", conjunto:"(Sin cruce)", anuncio:"(Sin cruce)" };

    const tel = limpiarTelefono(telRaw);
    respuestas.push({ tel, email, score, ts, calif:clasificarScore(score), ...origen });

    // Pausar cada 200 filas para evitar timeout
    if (i > 0 && i % LOTE === 0) Utilities.sleep(100);
  }

  Logger.log("Respuestas procesadas: " + respuestas.length);
  if (respuestas.length === 0) {
    SpreadsheetApp.getUi().alert(
      "Se procesaron "+enc.rows.length+" filas pero 0 resultaron válidas.\n\n"+
      "Verifica que la encuesta tenga datos y que las columnas se detectaron bien.\n"+
      "Abre Apps Script → Ejecutar → Ver logs para más detalles."
    );
    return;
  }

  // Stats por anuncio
  const statsCal = {};
  respuestas.forEach(r => {
    const key = r.anuncio;
    if (!statsCal[key]) statsCal[key]={anuncio:key,total:0,alta:0,media:0,baja:0,sumScore:0};
    statsCal[key].total++;
    statsCal[key].sumScore += r.score;
    statsCal[key][r.calif.pct]++;
  });

  // Escribir hoja de calidad
  let hojaCal = ss.getSheetByName(HOJA_CALIDAD);
  if (!hojaCal) hojaCal = ss.insertSheet(HOJA_CALIDAD);
  hojaCal.clearContents();
  let fila = 1;
  const now = new Date().toLocaleString("es-EC");

  const totalAlta  = respuestas.filter(r=>r.calif.pct==="alta").length;
  const totalMedia = respuestas.filter(r=>r.calif.pct==="media").length;
  const totalBaja  = respuestas.filter(r=>r.calif.pct==="baja").length;
  const scoreGlobal = respuestas.reduce((a,r)=>a+r.score,0)/respuestas.length;

  hojaCal.getRange(fila,1).setValue("ANÁLISIS DE CALIDAD DE LEADS — Trafficker Pro").setFontWeight("bold").setFontSize(13); fila++;
  hojaCal.getRange(fila,1).setValue("Actualizado: "+now+" | Total: "+respuestas.length+" respuestas"); fila+=2;

  hojaCal.getRange(fila,1).setValue("RESUMEN GENERAL").setFontWeight("bold"); fila++;
  hojaCal.getRange(fila,1,1,4).setValues([["Score promedio","🟢 Alta","🟡 Media","🔴 Baja"]]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
  hojaCal.getRange(fila,1,1,4).setValues([[
    scoreGlobal.toFixed(1)+"%",
    totalAlta+" ("+((totalAlta/respuestas.length)*100).toFixed(0)+"%)",
    totalMedia+" ("+((totalMedia/respuestas.length)*100).toFixed(0)+"%)",
    totalBaja+" ("+((totalBaja/respuestas.length)*100).toFixed(0)+"%)"
  ]]);
  hojaCal.getRange(fila,1).setBackground(scoreGlobal>=SCORE_ALTO?"#0a3d0a":scoreGlobal>=SCORE_MEDIO?"#3d3a00":"#3d0a0a").setFontColor("#fff");
  fila+=3;

  hojaCal.getRange(fila,1).setValue("POR ANUNCIO").setFontWeight("bold"); fila++;
  hojaCal.getRange(fila,1,1,7).setValues([["Anuncio","Resp.","Score Prom.","🟢 Alta","🟡 Media","🔴 Baja","% Alta"]]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;
  Object.values(statsCal).sort((a,b)=>(b.sumScore/b.total)-(a.sumScore/a.total)).forEach((s,idx) => {
    const avg = s.sumScore/s.total;
    hojaCal.getRange(fila,1,1,7).setValues([[s.anuncio,s.total,avg.toFixed(1)+"%",s.alta,s.media,s.baja,(s.alta/s.total*100).toFixed(0)+"%"]]);
    hojaCal.getRange(fila,3).setBackground(avg>=SCORE_ALTO?"#0a3d0a":avg>=SCORE_MEDIO?"#3d3a00":"#3d0a0a").setFontColor("#fff");
    fila++;
  });
  fila+=2;

  // Detalle individual — escribir en lotes para evitar timeout
  hojaCal.getRange(fila,1).setValue("DETALLE — Respuestas individuales").setFontWeight("bold"); fila++;
  hojaCal.getRange(fila,1,1,7).setValues([["Teléfono","Score","Calidad","Campaña","Conjunto","Anuncio","Email"]]).setFontWeight("bold").setBackground("#1a2744").setFontColor("#fff"); fila++;

  // Escribir en un solo batch para velocidad
  const detData = respuestas.sort((a,b)=>b.score-a.score).map(r =>
    [r.tel, r.score+"%", r.calif.emoji+" "+r.calif.label, r.campaña, r.conjunto, r.anuncio, r.email]
  );
  if (detData.length > 0) {
    hojaCal.getRange(fila,1,detData.length,7).setValues(detData);
    // Colorear columna calidad en lotes de 50
    for (let i=0; i<respuestas.length; i+=50) {
      const batch = respuestas.slice(i, i+50);
      batch.forEach((r,j) => {
        const c=r.calif.pct==="alta"?"#0a3d0a":r.calif.pct==="media"?"#3d3a00":"#3d0a0a";
        hojaCal.getRange(fila+i+j,3).setBackground(c).setFontColor("#fff");
      });
      if (i+50 < respuestas.length) Utilities.sleep(50);
    }
  }

  hojaCal.autoResizeColumns(1,7);
  ss.setActiveSheet(hojaCal);
}

// ─── EXPORTAR PARA TRAFFICKER PRO ────────────────────────────
function exportarParaTrafficker() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const form = leerHoja(ss, HOJA_FORM);
  const enc  = leerHoja(ss, HOJA_ENCUESTA);
  if (!form) { SpreadsheetApp.getUi().alert("Ejecuta el análisis primero."); return; }

  const iTelForm = getCol(form.headers, COL_TELEFONO);
  const iCamp    = getCol(form.headers, COL_CAMPAÑA);
  const iConj    = getCol(form.headers, COL_CONJUNTO);
  const iAd      = getCol(form.headers, COL_ANUNCIO);
  const iEmail   = form.headers.findIndex(h=>h.includes("email")||h.includes("correo"));

  const mapaForm = {};
  form.rows.forEach(fila => {
    const tel = limpiarTelefono(String(fila[iTelForm]||""));
    if (!tel) return;
    const entry = {
      tel,
      campaña:  iCamp>=0?(String(fila[iCamp]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      conjunto: iConj>=0?(String(fila[iConj]||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      anuncio:  iAd  >=0?(String(fila[iAd]  ||"").trim()||"(Sin identificar)"):"(Sin identificar)",
      email:    iEmail>=0?String(fila[iEmail]||"").trim():"",
    };
    mapaForm[tel] = entry;
    if (entry.email) mapaForm["email:"+entry.email.toLowerCase()] = entry;
  });

  const hojaWP = ss.getSheetByName(HOJA_WP);
  const telesWP = new Set();
  if (hojaWP) {
    const d = hojaWP.getDataRange().getValues();
    for (let i=1;i<d.length;i++) { const t=limpiarTelefono(String(d[i][0]||"")); if(t) telesWP.add(t); }
  }

  // Stats captura
  const statsCaptura = {};
  const agregarStat = (nivel,nombre,tipo) => {
    if (nombre.startsWith("(Sin ")) return;
    const key = nivel+"||"+nombre;
    if (!statsCaptura[key]) statsCaptura[key]={nivel,nombre,total_wp:0,total_form:0};
    if (tipo==="wp") statsCaptura[key].total_wp++;
    else statsCaptura[key].total_form++;
  };
  Object.values(mapaForm).filter(r=>!r.campaña?.includes("email:")).forEach(r =>
    ["campaña","conjunto","anuncio"].forEach(n=>agregarStat(n,r[n],"form"))
  );
  telesWP.forEach(tel => {
    const r=mapaForm[tel]; if(r) ["campaña","conjunto","anuncio"].forEach(n=>agregarStat(n,r[n],"wp"));
  });

  // Stats calidad
  const statsCalidad = {};
  if (enc) {
    const iTelEnc   = getColFlex(enc.headers, PALABRAS_TELEFONO);
    const iEmailEnc = getColFlex(enc.headers, PALABRAS_EMAIL);
    const iScore    = getColFlex(enc.headers, PALABRAS_SCORE);
    if (iScore >= 0 && (iTelEnc >= 0 || iEmailEnc >= 0)) {
      const denominadores = enc.rows.map(f=>{
        if(!f||f[iScore]===undefined||f[iScore]==="")return 0;
        const s=String(f[iScore]).trim();
        if(s.includes("/")){const p=s.split("/");return parseFloat((p[1]||"").trim())||0;}
        return 0;
      }).filter(v=>v>0);
      const maxSc = denominadores.length?Math.max(...denominadores):100;
      Logger.log("exportar — maxSc="+maxSc+" | denominadores encontrados: "+denominadores.length);
      // Log primeras 3 filas para debug
      enc.rows.slice(0,3).forEach((f,i)=>{
        if(f&&f[iScore]!==undefined) Logger.log("  Fila "+i+": raw='"+f[iScore]+"' → normalizado="+normalizarScore(f[iScore],maxSc));
      });

      enc.rows.forEach(fila => {
        const telRaw = iTelEnc>=0?String(fila[iTelEnc]||""):"";
        const email  = iEmailEnc>=0?String(fila[iEmailEnc]||"").trim().toLowerCase():"";
        const score  = normalizarScore(fila[iScore], maxSc); // ya retorna 0-100
        let origen = null;
        if (telRaw) { for (const v of variantesTelefono(telRaw)) { if(mapaForm[v]){origen=mapaForm[v];break;} } }
        if (!origen && email) origen = mapaForm["email:"+email];
        origen = origen || { anuncio:"(Sin cruce)" };
        const key = origen.anuncio;
        if (!statsCalidad[key]) statsCalidad[key]={anuncio:key,total:0,alta:0,media:0,baja:0,sumScore:0};
        statsCalidad[key].total++;
        statsCalidad[key].sumScore+=score;
        statsCalidad[key][clasificarScore(score).pct]++;
      });
    }
  }

  const telsPendientes = Object.values(mapaForm).filter(r=>r.tel&&!r.campaña?.includes("email:")&&!telesWP.has(r.tel)).map(r=>r.tel);

  const resultCaptura = {
    fecha: new Date().toISOString(),
    total_wp: telesWP.size,
    total_form: Object.values(mapaForm).filter(r=>!r.campaña?.includes("email:")).length,
    total_con_match: [...telesWP].filter(t=>mapaForm[t]).length,
    total_remarketing: telsPendientes.length,
    telefonosPendientes: telsPendientes.slice(0,500),
    paises: [],
    niveles: {}
  };

  // Países
  const statsPaises = {};
  Object.values(mapaForm).filter(r=>r.tel&&!r.campaña?.includes("email:")).forEach(r => {
    const p=detectarPais(r.tel);
    if(!statsPaises[p])statsPaises[p]={pais:p,total_form:0,total_wp:0};
    statsPaises[p].total_form++;
  });
  telesWP.forEach(tel=>{const r=mapaForm[tel];if(r){const p=detectarPais(tel);if(statsPaises[p])statsPaises[p].total_wp++;}});
  resultCaptura.paises=Object.values(statsPaises).sort((a,b)=>b.total_form-a.total_form);

  ["campaña","conjunto","anuncio"].forEach(n => {
    resultCaptura.niveles[n]=Object.values(statsCaptura).filter(s=>s.nivel===n&&s.total_form>0)
      .map(s=>({nombre:s.nombre,total_form:s.total_form,total_wp:s.total_wp,
        pendientes:s.total_form-s.total_wp,
        pct_captura:s.total_form>0?parseFloat((s.total_wp/s.total_form*100).toFixed(1)):0,
        pct_del_total:telesWP.size>0?parseFloat((s.total_wp/telesWP.size*100).toFixed(1)):0}))
      .sort((a,b)=>b.pct_captura-a.pct_captura);
  });

  const totalEnc=Object.values(statsCalidad).reduce((a,v)=>a+v.total,0);
  const scoreGlobal=totalEnc>0?Object.values(statsCalidad).reduce((a,v)=>a+v.sumScore,0)/totalEnc:0;
  const resultCalidad = {
    total_respuestas: totalEnc,
    score_promedio: parseFloat(scoreGlobal.toFixed(1)),
    distribucion: {
      alta: Object.values(statsCalidad).reduce((a,v)=>a+v.alta,0),
      media:Object.values(statsCalidad).reduce((a,v)=>a+v.media,0),
      baja: Object.values(statsCalidad).reduce((a,v)=>a+v.baja,0),
    },
    por_anuncio: Object.values(statsCalidad).map(s=>({
      anuncio:s.anuncio,total:s.total,
      score_prom:s.total>0?parseFloat((s.sumScore/s.total).toFixed(1)):0,
      alta:s.alta,media:s.media,baja:s.baja,
      pct_alta:s.total>0?parseFloat((s.alta/s.total*100).toFixed(1)):0
    })).sort((a,b)=>b.score_prom-a.score_prom)
  };

  // Guardar en hojas ocultas para que Trafficker Pro las lea
  const guardar = (nombre, valor) => {
    let h = ss.getSheetByName(nombre);
    if (!h) h = ss.insertSheet(nombre);
    h.getRange("A1").setValue(JSON.stringify(valor));
    h.hideSheet();
  };
  guardar("__trafficker_api__",     resultCaptura);
  guardar("__trafficker_calidad__", resultCalidad);

  SpreadsheetApp.getUi().alert(
    "✓ Exportado para Trafficker Pro\n\n" +
    "📊 Captura: "+resultCaptura.total_wp+" en WP · "+resultCaptura.total_con_match+" identificados\n"+
    "⭐ Calidad: "+totalEnc+" respuestas · Score "+scoreGlobal.toFixed(1)+"%\n"+
    "🎯 Remarketing: "+telsPendientes.length+" pendientes"
  );
}

// ─── DIAGNÓSTICO ─────────────────────────────────────────────
function diagnosticar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let msg = "=== DIAGNÓSTICO TRAFFICKER PRO v5 ===\n\n";
  const hojas = ss.getSheets().map(h=>h.getName());
  msg += "📋 Hojas: "+hojas.join(", ")+"\n\n";

  const hojaEnc = ss.getSheetByName(HOJA_ENCUESTA);
  if (!hojaEnc) {
    msg += "❌ NO encontré: '"+HOJA_ENCUESTA+"'\n";
  } else {
    const data = hojaEnc.getDataRange().getValues();
    const headers = data[0]||[];
    msg += "✅ '"+HOJA_ENCUESTA+"' — "+data.length+" filas\n";
    msg += "Headers:\n"+headers.map((h,i)=>"  "+(i+1)+". "+h).join("\n")+"\n\n";
    msg += "Detección automática:\n";
    const hs = headers.map(h=>h.toString().trim().toLowerCase());
    msg += "  Teléfono → col "+(getColFlex(hs,PALABRAS_TELEFONO)+1)+"\n";
    msg += "  Email    → col "+(getColFlex(hs,PALABRAS_EMAIL)+1)+"\n";
    msg += "  Score    → col "+(getColFlex(hs,PALABRAS_SCORE)+1)+"\n";
  }

  SpreadsheetApp.getUi().alert(msg);
}

// ─── MENÚ ────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Trafficker Pro")
    .addItem("📊 Analizar captura FB → WP", "analizarCaptura")
    .addItem("⭐ Analizar calidad de leads", "analizarCalidad")
    .addItem("🔍 Diagnóstico", "diagnosticar")
    .addSeparator()
    .addItem("🔄 Análisis completo + Exportar", "analizarTodo")
    .addItem("📤 Exportar para Trafficker Pro", "exportarParaTrafficker")
    .addToUi();
}
