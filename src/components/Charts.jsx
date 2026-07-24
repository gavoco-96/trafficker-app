// Trafficker Pro — graficas y visualizaciones
// CplTradingChart es el CPL en vivo: consulta FB cada 30s, persiste
// puntos, maneja zoom, alertas y linea fantasma del dia anterior.
// Extraído de App.jsx (Fase 4 de modularización)

import { useState, useEffect, useRef } from "react";
import { db, SUPA_URL, HL } from "../lib/db.js";
import {
  fmtNum, localDateStr, getCuentasFBActivas, getTokenFB, filterByPeriod,
} from "../lib/utils.js";

// ─── GRÁFICAS DE MÉTRICAS PRINCIPALES ─────────────────────────────────────────
export function GraficasMetricas({ client, period, from, to }) {
  const allRows = (client.records || []).filter(r => {
    const hoy = localDateStr();
    return r.date <= hoy;
  });
  const rows = filterByPeriod(allRows, period, from, to).sort((a,b) => a.date.localeCompare(b.date));
  const capturaData = client.capturaConfig?.lastData;

  if (!rows.length) return null;

  // Agrupar métricas por gráfica
  const GRAFICAS = [
    {
      id: "captacion",
      titulo: "Captación — Resultados vs Personas WP",
      metricas: [
        { key: "resultados",  label: "Registros FB",   color: "#004AAD", fn: r => parseFloat(r.resultados||r.formularios) || 0 },
        { key: "personas_wp", label: "Personas WP",    color: "#10B981", fn: r => parseFloat(r.personas_wp) || 0 },
      ]
    },
    {
      id: "costos",
      titulo: "Costos — CPA FB vs Costo WP",
      metricas: [
        { key: "cpa",      label: "Costo x Resultado", color: "#FF914D", fn: (r, i) => {
          const inv = parseFloat(r.inversion) || 0;
          const res = parseFloat(r.resultados||r.formularios) || 0;
          return res > 0 ? inv/res : 0;
        }},
        { key: "costo_wp", label: "Costo x WP",        color: "#FFDE59", fn: (r) => {
          const inv = parseFloat(r.inversion) || 0;
          const wp  = parseFloat(r.personas_wp) || 0;
          return wp > 0 ? inv/wp : 0;
        }},
      ]
    },
    {
      id: "captura_pct",
      titulo: "% de Captura FB → WP",
      metricas: [
        { key: "pct_cap", label: "% Captura", color: "#A855F7", fn: r => {
          const fb = parseFloat(r.resultados||r.formularios) || 0;
          const wp = parseFloat(r.personas_wp) || 0;
          return fb > 0 && wp > 0 ? (wp/fb*100) : 0;
        }},
      ]
    },
    {
      id: "inversion",
      titulo: "Inversión diaria",
      metricas: [
        { key: "inversion", label: "Inversión $", color: "#EF4444", fn: r => parseFloat(r.inversion) || 0 },
      ]
    },
  ];

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "1rem" }}>
        Gráficas de tendencia
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {GRAFICAS.map(g => (
          <MiniLineChart key={g.id} titulo={g.titulo} rows={rows} metricas={g.metricas} />
        ))}
      </div>
    </div>
  );
}

export function MiniLineChart({ titulo, rows, metricas }) {
  const [expandido, setExpandido] = useState(false);
  const [hovIdx, setHovIdx] = useState(null);
  const W = expandido ? 700 : 340;
  const H = expandido ? 200 : 120;
  const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Calcular datos
  const series = metricas.map(m => ({
    ...m,
    data: rows.map((r, i) => ({ fecha: r.date, val: m.fn(r, i) }))
  }));

  const allVals = series.flatMap(s => s.data.map(d => d.val)).filter(v => v > 0);
  if (!allVals.length) return null;

  const minVal = 0;
  const maxVal = Math.max(...allVals) * 1.1 || 1;
  const n = rows.length;

  function xPos(i) { return PAD.left + (i / Math.max(n-1, 1)) * chartW; }
  function yPos(v) { return PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH; }

  function makePath(data) {
    const pts = data.filter(d => d.val > 0);
    if (!pts.length) return "";
    const allPts = data.map((d, i) => ({ x: xPos(i), y: d.val > 0 ? yPos(d.val) : null }));
    let path = "";
    allPts.forEach((pt, i) => {
      if (pt.y === null) return;
      if (i === 0 || allPts[i-1].y === null) path += `M ${pt.x} ${pt.y}`;
      else path += ` L ${pt.x} ${pt.y}`;
    });
    return path;
  }

  function makeArea(data, color) {
    const baseline = PAD.top + chartH;
    const pts = data.map((d, i) => ({ x: xPos(i), y: d.val > 0 ? yPos(d.val) : baseline }));
    if (!pts.length) return "";
    let p = `M ${pts[0].x} ${baseline}`;
    pts.forEach(pt => { p += ` L ${pt.x} ${pt.y}`; });
    p += ` L ${pts[pts.length-1].x} ${baseline} Z`;
    return p;
  }

  // Ticks Y
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ pct: t, val: minVal + (maxVal - minVal) * t }));

  // Labels X (fechas simplificadas)
  const xLabels = rows.filter((_, i) => {
    const step = Math.max(1, Math.floor(n / (expandido ? 10 : 5)));
    return i % step === 0 || i === n-1;
  });

  return (
    <div className="card" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{titulo}</div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 8px" }}
          onClick={() => setExpandido(e => !e)}>
          {expandido ? "⊡ Reducir" : "⊞ Expandir"}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            {metricas.map((m, mi) => (
              <linearGradient key={mi} id={"area_"+titulo.replace(/\s/g,"_")+mi} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={yPos(t.val)} x2={PAD.left + chartW} y2={yPos(t.val)}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={yPos(t.val) + 4} textAnchor="end" fontSize="8" fill="var(--muted)">
                {t.val > 1000 ? (t.val/1000).toFixed(1)+"k" : t.val > 100 ? Math.round(t.val) : fmtNum(t.val, t.val < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
          {/* X labels */}
          {xLabels.map((r, i) => {
            const idx = rows.indexOf(r);
            return (
              <text key={i} x={xPos(idx)} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--muted)">
                {r.date.slice(5)} {/* MM-DD */}
              </text>
            );
          })}
          {/* Series */}
          {series.map((s, si) => (
            <g key={si}>
              <path d={makeArea(s.data, s.color)}
                fill={"url(#area_"+titulo.replace(/\s/g,"_")+si+")"}/>
              <path d={makePath(s.data)}
                fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" />
              {/* Puntos */}
              {s.data.map((d, i) => d.val > 0 ? (
                <circle key={i} cx={xPos(i)} cy={yPos(d.val)} r={2}
                  fill={s.color} fillOpacity="0.8" />
              ) : null)}
            </g>
          ))}
          {/* Zonas invisibles de hover por punto */}
          {rows.map((r, i) => (
            <rect key={i}
              x={xPos(i) - Math.max(chartW/Math.max(rows.length,1)/2, 6)}
              y={PAD.top} width={Math.max(chartW/Math.max(rows.length,1), 12)} height={chartH}
              fill="transparent" style={{cursor:"crosshair"}}
              onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(null)}
            />
          ))}

          {/* Tooltip al hover */}
          {hovIdx !== null && (() => {
            const r = rows[hovIdx];
            const cx = xPos(hovIdx);
            const tooltipX = hovIdx < rows.length * 0.65 ? cx + 8 : cx - 168;
            const vals = series.map(s => ({ label: s.label, color: s.color, val: s.data[hovIdx]?.val ?? 0 })).filter(v=>v.val>0);
            const tooltipH = 24 + vals.length * 18;
            const tooltipY = Math.max(PAD.top, PAD.top + chartH/2 - tooltipH/2);
            return (
              <g>
                {/* Línea vertical */}
                <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top+chartH}
                  stroke="rgba(255,255,255,.25)" strokeWidth="0.8" strokeDasharray="3 2"/>
                {/* Puntos resaltados */}
                {series.map((s,si)=>s.data[hovIdx]?.val>0&&(
                  <circle key={si} cx={cx} cy={yPos(s.data[hovIdx].val)} r={4}
                    fill={s.color} stroke="var(--bg)" strokeWidth="2"/>
                ))}
                {/* Caja tooltip */}
                <rect x={tooltipX} y={tooltipY} width={160} height={tooltipH}
                  rx="7" fill="rgba(10,15,30,.96)" stroke="rgba(255,255,255,.1)" strokeWidth="0.8"/>
                {/* Fecha */}
                <text x={tooltipX+10} y={tooltipY+15} fontSize="9" fill="rgba(255,255,255,.45)"
                  fontFamily="var(--mono)">{r.date}</text>
                {/* Valores por serie */}
                {vals.map((v,vi)=>(
                  <g key={vi}>
                    <circle cx={tooltipX+12} cy={tooltipY+24+vi*18+4} r="3" fill={v.color}/>
                    <text x={tooltipX+20} y={tooltipY+24+vi*18+8} fontSize="10" fill="rgba(255,255,255,.6)">{v.label}</text>
                    <text x={tooltipX+150} y={tooltipY+24+vi*18+8} fontSize="11" fontWeight="700"
                      fill={v.color} textAnchor="end" fontFamily="var(--mono)">
                      {v.val > 100 ? fmtNum(v.val, v.val>1000?0:1) : fmtNum(v.val, 2)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

        </svg>
      </div>
      {/* Leyenda */}
      {metricas.length > 1 && (
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {metricas.map((m, mi) => (
            <div key={mi} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
              <div style={{ width: 16, height: 2, background: m.color, borderRadius: 1 }} />
              {m.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GRÁFICA CPL EN TIEMPO REAL (estilo trading) ──────────────────────────────
// ─── GRÁFICA CPL ESTILO COINMARKETCAP ────────────────────────────────────────
// ─── CPL WHATSAPP EN TIEMPO REAL ─────────────────────────────────────────────
export function CplWAChart({ client }) {
  const [puntosRT,  setPuntosRT]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [modoVista, setModoVista] = useState("historial");
  const [hovIdx,    setHovIdx]    = useState(null);
  const intervalRef = useRef(null);

  const fechaHoyISO = (() => {
    const ec = new Date(Date.now() - 5*60*60*1000);
    return localDateStr(ec);
  })();

  // Historial desde records.personas_wp
  const historial = (client.records||[])
    .filter(r => (r.personas_wp||0) > 0 && (r.inversion||0) > 0)
    .map(r => ({
      fecha:   r.date,
      joins:   parseFloat(r.personas_wp)||0,
      cplWA:   parseFloat(r.inversion) / parseFloat(r.personas_wp),
      leadsFB: parseFloat(r.resultados||r.formularios||r.leads)||0,
    }))
    .sort((a,b) => a.fecha.localeCompare(b.fecha));

  // Tiempo real desde wa_eventos
  async function fetchPuntosRT() {
    if (!client.waConfig?.enabled) return;
    setLoading(true);
    try {
      const desde = `${fechaHoyISO}T00:00:00-05:00`;
      const hasta = new Date().toISOString();
      const r = await fetch(
        `${SUPA_URL}/rest/v1/wa_eventos?client_id=eq.${client.id}&tipo=eq.join&ts=gte.${encodeURIComponent(desde)}&ts=lte.${encodeURIComponent(hasta)}&select=ts&order=ts.asc`,
        { headers: HL }
      );
      const eventos = await r.json();
      if (!Array.isArray(eventos)||!eventos.length) { setLoading(false); return; }
      const porHora = {};
      eventos.forEach(ev => { const h=ev.ts.slice(0,13); porHora[h]=(porHora[h]||0)+1; });
      const gasto = parseFloat((client.records||[]).slice(-1)[0]?.inversion)||0;
      let acum = 0;
      setPuntosRT(Object.entries(porHora).sort().map(([hora,joins]) => {
        acum += joins;
        return { hora: hora.slice(11)+":00", joins: acum, cplWA: acum>0&&gasto>0?gasto/acum:null };
      }));
    } catch(e) { console.error("[CPL WA]", e.message); }
    setLoading(false);
  }

  useEffect(() => {
    fetchPuntosRT();
    if (client.waConfig?.enabled) {
      intervalRef.current = setInterval(fetchPuntosRT, 5*60*1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [client.id, fechaHoyISO]);

  const tieneHistorial = historial.length > 0;
  const tieneRT        = puntosRT.length > 0;
  if (!tieneHistorial && !tieneRT && !loading) return null;

  const usandoRT  = modoVista==="hoy" && tieneRT;
  const puntos    = usandoRT ? puntosRT : historial;
  const maxVal    = Math.max(...puntos.map(p=>p.joins||0), 1);
  const ultPunto  = puntos[puntos.length-1];
  const hov       = hovIdx!==null ? puntos[hovIdx] : null;
  const color     = "#25D366";
  const cplsV     = historial.filter(p=>p.cplWA>0).map(p=>p.cplWA);
  const cplProm   = cplsV.length ? cplsV.reduce((a,b)=>a+b,0)/cplsV.length : null;
  const cplAct    = ultPunto?.cplWA||null;
  const cplDelta  = cplAct&&cplProm ? ((cplAct-cplProm)/cplProm*100) : null;
  const totalWP   = historial.reduce((a,r)=>a+(r.joins||0),0);

  return (
    <div className="card" style={{marginBottom:"1rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div className="card-title" style={{margin:0}}>💬 CPL WhatsApp</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>
            {usandoRT ? "Tiempo real · cada 5 min" : `Historial · ${historial.length} días`}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div className="period-pills">
            {tieneHistorial && <button className={"pill "+(modoVista==="historial"?"active":"")} onClick={()=>setModoVista("historial")}>Historial</button>}
            {tieneRT && <button className={"pill "+(modoVista==="hoy"?"active":"")} onClick={()=>setModoVista("hoy")}>Hoy</button>}
          </div>
          {cplAct && (
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:18,color}}>${fmtNum(cplAct,2)}</div>
              {cplDelta!==null && <div style={{fontSize:10,color:cplDelta>0?"var(--red)":"var(--green)"}}>{cplDelta>0?"▲":"▼"} {fmtNum(Math.abs(cplDelta),1)}% vs prom.</div>}
            </div>
          )}
          {client.waConfig?.enabled && <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={fetchPuntosRT} disabled={loading}>{loading?"⟳":"↻"}</button>}
        </div>
      </div>

      {puntos.length > 0 && (() => {
        const W    = Math.max(puntos.length*40, 400);
        const step = W/Math.max(puntos.length-1,1);
        const pts  = puntos.map((p,i)=>`${i*step},${95-(((p.joins||0)/maxVal)*85)}`);
        return (
          <div style={{position:"relative",marginBottom:8}} onMouseLeave={()=>setHovIdx(null)}>
            <svg width="100%" height="100" viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>
              <defs>
                <linearGradient id="waHistGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${pts.join(" ")} ${(puntos.length-1)*step},100`} fill="url(#waHistGrad)"/>
              <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2"/>
              {puntos.map((p,i)=>(
                <circle key={i} cx={i*step} cy={95-((p.joins||0)/maxVal*85)}
                  r={hovIdx===i?5:3} fill={color} style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(null)}/>
              ))}
            </svg>
            {hov && (
              <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
                background:"var(--surface2)",border:"1px solid var(--border)",
                borderRadius:8,padding:"6px 12px",fontSize:11,pointerEvents:"none",zIndex:10,whiteSpace:"nowrap"}}>
                <div style={{color:"var(--muted)",marginBottom:2}}>{usandoRT?hov.hora:hov.fecha}</div>
                <div style={{color,fontWeight:700}}>{hov.joins} personas en WP</div>
                {hov.cplWA&&<div style={{color:"var(--accent2)"}}>CPL WA: ${fmtNum(hov.cplWA,2)}</div>}
                {!usandoRT&&hov.leadsFB>0&&<div style={{color:"var(--muted)"}}>Captura: {fmtNum(hov.joins/hov.leadsFB*100,1)}%</div>}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--muted)",marginTop:2}}>
              {[puntos[0],puntos[Math.floor(puntos.length/2)],puntos[puntos.length-1]]
                .filter(Boolean).map((p,i)=><span key={i}>{usandoRT?p.hora:p.fecha?.slice(5)}</span>)}
            </div>
          </div>
        );
      })()}

      {tieneHistorial && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:8}}>
          {[
            ["Total en WP", fmtNum(totalWP), color],
            ["CPL WA prom.", cplProm?`$${fmtNum(cplProm,2)}`:"—", "var(--accent2)"],
            ["Mejor CPL WA", cplsV.length?`$${fmtNum(Math.min(...cplsV),2)}`:"—", "var(--green)"],
            ["Días con data", historial.length, "var(--muted)"],
          ].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center",padding:"5px",background:"var(--surface2)",borderRadius:8}}>
              <div style={{fontSize:9,color:"var(--muted)",marginBottom:1}}>{l}</div>
              <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:12,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function CplTradingChart({ client, onUpdate, externalPuntos }) {
  // Fuente única de verdad para las cuentas (multicuenta)
  const token = getTokenFB(client);
  const cuentas = getCuentasFBActivas(client);
  const adAccountId = cuentas[0]?.adAccountId || "";

  // Filtro de cuenta para el CPL en vivo: "todas" = consolidado
  const [cuentaCPL, setCuentaCPL] = useState("todas");
  // Cuentas que realmente se consultan según el filtro
  const cuentasConsulta = cuentaCPL === "todas" ? cuentas : cuentas.filter(c => c.nombre === cuentaCPL);

  // ── ALERTAS DE CPL ────────────────────────────────────────────────────────
  // Config guardada en el cliente: { activo, umbral, modo, minutos }
  // modo: "porcentaje" (X% sobre la meta) | "absoluto" (CPL > $X)
  const alertaCfg = client.cplAlerta || { activo: false, umbral: 20, modo: "porcentaje", minutos: 10 };
  const [showAlertaForm, setShowAlertaForm] = useState(false);
  const [alertaLocal, setAlertaLocal] = useState(alertaCfg);
  const [alertaActiva, setAlertaActiva] = useState(null); // { desde, cpl, meta }
  const alertaNotificadaRef = useRef(false);

  const [rango, setRango]           = useState("24h");
  const [loading, setLoading]       = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [hovIdx, setHovIdx]         = useState(null);
  const [showAnotForm, setShowAnotForm] = useState(false);
  const [anotTexto, setAnotTexto]   = useState("");
  const [puntosRT, setPuntosRT]     = useState(() => {
    const hoy = localDateStr();
    return client.cplRtData?.[hoy] || [];
  });
  const fetchCount = useRef(0);
  const INTERVALO  = 30;

  // Ancho responsive: medir el contenedor real para ocupar todo el espacio
  const chartWrapRef = useRef(null);
  const [chartW, setChartW] = useState(980);
  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const medir = () => { const w = el.clientWidth; if (w > 0) setChartW(w); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    return () => { ro.disconnect(); window.removeEventListener("resize", medir); };
  }, []);

  // Pulso de animación: se incrementa en cada tick para disparar transiciones
  const [pulso, setPulso] = useState(0);

  // Reloj de avance: re-render cada 5s para que el borde derecho (ahora)
  // se deslice suavemente aunque no llegue un dato nuevo (estilo CoinMarketCap)
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Merge external puntos (from parent interval) with local
  useEffect(() => {
    if (!externalPuntos?.length) return;
    setPuntosRT(prev => {
      const mapa = {};
      [...prev, ...externalPuntos].forEach(p => { mapa[p.ts] = p; });
      return Object.values(mapa).sort((a,b) => a.ts-b.ts).slice(-2880);
    });
  }, [externalPuntos]);

  // Dispara el pulso de animacion cuando cambia el ultimo punto (hijo o padre)
  const ultimoTs = puntosRT.length ? puntosRT[puntosRT.length-1].ts : 0;
  useEffect(() => {
    if (ultimoTs) setPulso(p => p + 1);
  }, [ultimoTs]);

  // ── Historial diario ──────────────────────────────────────────────────────
  const histDiario = [
    ...(client.misiones||[]).flatMap(m => (m.records||[]).map(r => {
      const inv=parseFloat(r.inversion)||0, res=parseFloat(r.resultados||r.formularios)||0;
      return res>0 ? {fecha:r.date, cpl:inv/res, tipo:"mision", mision:m.nombre} : null;
    }).filter(Boolean)),
    ...(client.records||[]).filter(r => r.date<=localDateStr())
      .map(r => {
        const inv=parseFloat(r.inversion)||0, res=parseFloat(r.resultados||r.formularios)||0;
        return res>0 ? {fecha:r.date, cpl:inv/res, tipo:"dia"} : null;
      }).filter(Boolean)
  ].sort((a,b)=>a.fecha.localeCompare(b.fecha));

  // ── Anotaciones ───────────────────────────────────────────────────────────
  const anotaciones = client.cplAnotaciones || [];

  async function guardarAnotacion() {
    if (!anotTexto.trim()) return;
    const nueva = {
      id: "anot_" + Date.now(),
      ts: Date.now(),
      hora: new Date().toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}),
      fecha: localDateStr(),
      texto: anotTexto.trim(),
      cpl: puntosRT.length ? puntosRT[puntosRT.length-1].cpl : null,
    };
    const nuevas = [...anotaciones, nueva];
    const r = await db.upsert({ ...client, cplAnotaciones: nuevas });
    if (!r.ok) { console.error("[CPL] Error guardando anotacion:", r.error); return; }
    client.cplAnotaciones = nuevas;
    setAnotTexto(""); setShowAnotForm(false);
  }

  // ── Guardar puntos ────────────────────────────────────────────────────────
  async function guardarPuntos(nuevosPuntos) {
    if (!onUpdate || !nuevosPuntos.length) return;
    // Guardia de aislamiento: no escribir si el componente ya es de otro cliente
    const idAlGuardar = client.id;
    const hoy = localDateStr();
    const cplRtData = {...(client.cplRtData||{})};
    const existing = cplRtData[hoy] || [];
    const mapa = {};
    [...existing, ...nuevosPuntos].forEach(p => { mapa[p.ts] = p; });
    cplRtData[hoy] = Object.values(mapa).sort((a,b)=>a.ts-b.ts).slice(-2880);
    const limite = new Date(); limite.setDate(limite.getDate()-90);
    Object.keys(cplRtData).forEach(k => { if(k < localDateStr(limite)) delete cplRtData[k]; });
    try {
      if (idAlGuardar !== client.id) return; // cambió de cliente: descartar
      // La tabla clients guarda todo dentro del jsonb "data" → usar db.upsert
      // (ademas: aqui H esta shadowed por la altura del SVG, no usar fetch directo)
      const r = await db.upsert({ ...client, cplRtData });
      if (!r.ok) { console.error("[CPL] Error guardando puntos RT:", r.error); return; }
      client.cplRtData = cplRtData;
    } catch(e) { console.error("[CPL] Error guardando puntos RT:", e.message); }
  }

  // ── Fetch histórico por hora (estilo CoinMarketCap) ──────────────────────
  // Usa el breakdown horario de FB para reconstruir la curva del dia completo
  // con CPL ACUMULADO hora a hora, aunque la app no haya estado abierta.
  async function fetchHistoricoHoy() {
    if (!token || !adAccountId) return;
    setLoadingHist(true);
    const hoy = localDateStr();
    try {
      // Acumular inv/leads POR HORA sumando todas las cuentas
      const porHora = {}; // hora (0-23) → { inv, nl }
      const activas = cuentasConsulta; // respeta el filtro de cuenta seleccionado
      for (const cuenta of activas) {
        const histUrl = new URL(`https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights`);
        histUrl.searchParams.set("fields", "spend,actions");
        histUrl.searchParams.set("date_preset", "today");
        histUrl.searchParams.set("level", "account");
        histUrl.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
        histUrl.searchParams.set("limit", "48");
        histUrl.searchParams.set("access_token", token);
        const json = await fetch(histUrl.toString()).then(r=>r.json());
        if (json.error) { console.warn("[CPL hist]", cuenta.nombre, json.error.message); continue; }
        (json.data||[]).forEach(d => {
          // d.hourly_stats_...: "13:00:00 - 13:59:59" → hora local del anunciante
          const franja = d.hourly_stats_aggregated_by_advertiser_time_zone || "";
          const hh = parseInt(franja.slice(0,2));
          if (isNaN(hh)) return;
          const inv = parseFloat(d.spend)||0;
          const _a = d.actions||[];
          const _T = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
          const _EX = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);
          let nl = 0;
          for (const t of _T) { const x=_a.find(a=>a.action_type===t); if(x){const v=parseFloat(x.value)||0;if(v>nl)nl=v;} }
          if (nl===0) for (const a of _a) { if(!_EX.has(a.action_type)&&a.action_type?.includes("registration")){const v=parseFloat(a.value)||0;if(v>nl)nl=v;} }
          if (!porHora[hh]) porHora[hh] = { inv:0, nl:0 };
          porHora[hh].inv += inv;
          porHora[hh].nl  += nl;
        });
      }
      const horas = Object.keys(porHora).map(Number).sort((a,b)=>a-b);
      if (!horas.length) { setLoadingHist(false); return; }
      // Curva de CPL ACUMULADO: cada punto = totales del dia hasta esa hora
      let accInv = 0, accNl = 0;
      const puntosPorHora = [];
      for (const hh of horas) {
        accInv += porHora[hh].inv;
        accNl  += porHora[hh].nl;
        if (accInv <= 0 || accNl <= 0) continue;
        // Timestamp LOCAL al cierre de la hora (nunca UTC — evita puntos fantasma)
        const dLoc = new Date();
        dLoc.setHours(hh, 59, 0, 0);
        const ts = Math.min(dLoc.getTime(), Date.now());
        puntosPorHora.push({
          ts,
          hora: new Date(ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}),
          cpl: parseFloat((accInv/accNl).toFixed(4)),
          inv: parseFloat(accInv.toFixed(2)),
          leads: accNl,
          tipo: "hist_hora"
        });
      }
      if (puntosPorHora.length > 0) {
        setPuntosRT(prev => {
          const mapa = {};
          [...prev, ...puntosPorHora].forEach(p => { mapa[p.ts]=p; });
          return Object.values(mapa).sort((a,b)=>a.ts-b.ts);
        });
        await guardarPuntos(puntosPorHora);
        console.log(`[CPL hist] ✅ ${puntosPorHora.length} puntos horarios reconstruidos (${horas[0]}h → ${horas[horas.length-1]}h)`);
      }
    } catch(e) { console.error("[CPL hist]", e.message); }
    setLoadingHist(false);
  }

  // ── Fetch CPL en tiempo real cada 30s ────────────────────────────────────
  async function fetchCplActual() {
    if (!token) return;
    const cuentasActivas = cuentasConsulta; // respeta el filtro de cuenta
    if (!cuentasActivas.length) return;

    setLoading(true);
    const hoy = localDateStr();
    let totalInv = 0, totalLeads = 0;

    for (const cuenta of cuentasActivas) {
      try {
        // Construir URL manualmente — control total del formato
        // since/until sueltos son ignorados por /insights → date_preset=today
        const rtUrlStr = `https://graph.facebook.com/v19.0/act_${cuenta.adAccountId}/insights?fields=spend%2Cactions&date_preset=today&level=account&access_token=${encodeURIComponent(token)}`;
        console.log("[CPL RT] URL:", rtUrlStr.replace(token, "TOKEN..."));
        const json = await fetch(rtUrlStr).then(r=>r.json());
        if (json.error) { console.warn(`[CPL RT] ${cuenta.nombre}:`, json.error.message); continue; }
        const row = json.data?.[0];
        if (!row) continue;
        totalInv += parseFloat(row.spend)||0;
        // Tipos reales de conversión — tomar el mayor, excluir engagement
        const acts = row.actions||[];
        const REALES  = ["offsite_complete_registration_add_meta_leads","omni_complete_registration","complete_registration","offsite_conversion.fb_pixel_complete_registration","offsite_conversion.fb_pixel_lead","lead"];
        const IGNORAR = new Set(["onsite_conversion.lead","onsite_web_lead","offsite_search_add_meta_leads","offsite_content_view_add_meta_leads"]);
        let nl = 0;
        for (const t of REALES) { const a=acts.find(x=>x.action_type===t); if(a){const v=parseFloat(a.value)||0;if(v>nl)nl=v;} }
        if (nl===0) for (const a of acts) { if(!IGNORAR.has(a.action_type)&&a.action_type.includes("registration")){const v=parseFloat(a.value)||0;if(v>nl)nl=v;} }
        totalLeads += nl;
        console.log(`[CPL RT] ${cuenta.nombre}: $${parseFloat(row.spend||0).toFixed(2)} | leads=${nl} | CPL=${nl>0?(parseFloat(row.spend||0)/nl).toFixed(2):"?"}`);
      } catch(e) { console.error(`[CPL RT] ${cuenta.nombre}:`, e.message); }
    }

    if (totalInv>0 && totalLeads>0) {
      const cpl=totalInv/totalLeads, ahora=Date.now();
      const punto={ ts:ahora, hora:new Date().toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit",second:"2-digit"}), fecha:hoy, esHoy:true, cpl:parseFloat(cpl.toFixed(4)), inv:parseFloat(totalInv.toFixed(2)), leads:totalLeads };
      setPuntosRT(prev => { const m={}; [...prev,punto].forEach(p=>{m[p.ts]=p;}); return Object.values(m).sort((a,b)=>a.ts-b.ts).slice(-2880); });
      fetchCount.current++;
      if (fetchCount.current%5===0) guardarPuntos([punto]);
      console.log(`[CPL RT] ✅ CPL=$${cpl.toFixed(2)} | ${totalLeads} leads | $${totalInv.toFixed(2)} invertidos`);
    } else {
      console.warn(`[CPL RT] ⚠️ inv=$${totalInv.toFixed(2)} leads=${totalLeads} — sin datos suficientes`);
    }
    setLoading(false);
  }

  useEffect(() => {
    const hayConfig = token && ((cuentas||[]).some(c=>c.adAccountId) || adAccountId);
    if (!hayConfig) return;
    // Si el componente padre ya maneja el interval (externalPuntos), solo cargar histórico
    fetchHistoricoHoy();
    if (externalPuntos !== undefined) return; // padre maneja el fetch en tiempo real
    fetchCplActual();
    // Intervalo 30s — persistente entre cambios de tab
    const t = setInterval(fetchCplActual, INTERVALO * 1000);
    window.__cplInterval = t;
    return () => {
      clearInterval(t);
      if (window.__cplInterval === t) delete window.__cplInterval;
    };
  }, [token, adAccountId]);

  // ── Construir datos según rango ────────────────────────────────────────────
  const hoy = localDateStr();
  let datosVista = [], datosAyer = [], modoRT = false;
  // Zooms en vivo: ventanas cortas donde SÍ se aprecia el avance de cada lectura
  const ZOOM_MIN = { "15m": 15, "30m": 30, "1h": 60 };

  if (rango === "24h" || ZOOM_MIN[rango]) {
    const ahora = Date.now();
    const ahoraDate = new Date(ahora);
    const ayer = new Date(ahora); ayer.setDate(ayer.getDate()-1);
    const ayerStr = localDateStr(ayer);

    // ── Ventana deslizante sincronizada ────────────────────────────────────
    // Inicio de ventana = ayer a la misma hora exacta que ahora
    // Fin de ventana   = ahora (tiempo real)
    // → la gráfica siempre cubre exactamente 24h y avanza con el tiempo
    // Ventana variable: zoom en vivo (15/30/60 min) o 24h completas.
    // Con zoom corto cada lectura ocupa mucho espacio → SE VE avanzar el punto.
    const minutosVentana = ZOOM_MIN[rango] || (24*60);
    const tsVentanaInicio = ahora - minutosVentana*60*1000;

    // Datos de hoy (línea principal) — solo puntos cuyo ts cae en HOY (hora local)
    // Esto descarta puntos fantasma con medianoche UTC (= 7pm de ayer en UTC-5)
    const esDeHoy = p => localDateStr(new Date(p.ts)) === hoy;
    // Si hay filtro de cuenta activo, recalcular el CPL solo con esa cuenta
    // (usa el desglose porCuenta que guarda el padre en cada punto)
    const aplicarFiltroCuenta = (p) => {
      if (cuentaCPL === "todas" || !p.porCuenta) return p;
      const d = p.porCuenta[cuentaCPL];
      if (!d || !d.leads) return null; // sin datos de esa cuenta en ese punto
      return { ...p, inv: d.inv, leads: d.leads, cpl: +(d.inv / d.leads).toFixed(4) };
    };
    const ptsHoyGuardados = (client.cplRtData?.[hoy]||[]).filter(esDeHoy);
    const mapa={};
    [...ptsHoyGuardados, ...puntosRT.filter(esDeHoy)]
      .map(aplicarFiltroCuenta).filter(Boolean)
      .forEach(p=>{mapa[p.ts]=p;});
    datosVista = Object.values(mapa)
      .sort((a,b)=>a.ts-b.ts)
      .filter(p => p.ts >= tsVentanaInicio && p.ts <= ahora)
      .map(p=>({...p, fecha:new Date(p.ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}), esHoy:true}));

    // Datos de ayer (línea de referencia gris) — misma ventana horaria
    // Tomamos los puntos de ayer cuyo timestamp original cae en [tsVentanaInicio-24h, ahora-24h]
    // es decir, los de ayer entre "ayer a la hora de inicio de ventana" y "ayer a la hora actual"
    const ptsAyer = client.cplRtData?.[ayerStr]||[];
    datosAyer = ptsAyer
      .filter(p => {
        // el punto de ayer está dentro de la misma franja horaria del día
        const horaAyer = p.ts - ayer.setHours(0,0,0,0); // ms desde medianoche de ayer
        const horaInicio = tsVentanaInicio - new Date(tsVentanaInicio).setHours(0,0,0,0);
        const horaFin = ahora - ahoraDate.setHours(0,0,0,0);
        return horaAyer >= horaInicio && horaAyer <= horaFin;
      })
      .map(p=>({
        ...p,
        tsOriginal: p.ts,
        ts: p.ts + 24*60*60*1000, // desplazar +1 día → eje X compartido con hoy
        fecha: new Date(p.ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}),
        esAyer: true
      })).sort((a,b)=>a.ts-b.ts);

    modoRT = true;
  } else if (rango==="1W") {
    for (let i=6; i>=0; i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=localDateStr(d);
      const pts=client.cplRtData?.[ds]||[];
      if (pts.length>0) {
        const avgCpl = pts.reduce((a,p)=>a+p.cpl,0)/pts.length;
        datosVista.push({fecha:ds.slice(5), cpl:avgCpl, tipo:"dia_rt"});
      } else {
        const hist = histDiario.find(h=>h.fecha===ds);
        if (hist) datosVista.push({...hist, fecha:ds.slice(5)});
      }
    }
  } else if (rango==="1M") {
    datosVista = histDiario.slice(-30).map(d=>({...d, fecha:d.fecha.slice(5)}));
  } else if (rango==="1Y") {
    datosVista = histDiario.slice(-365).map(d=>({...d, fecha:d.fecha.slice(5)}));
  } else {
    datosVista = histDiario.map(d=>({...d, fecha:d.fecha.slice(5)}));
  }

  // ── CPL acumulado de la misión (referencia cuando hoy está distorsionado) ──
  const _allRecs = [...(client.misiones||[]).flatMap(m=>m.records||[]), ...(client.records||[])];
  const _totalInv = _allRecs.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
  const _totalRes = _allRecs.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
  const cplAcumGlobal = _totalInv>0&&_totalRes>0 ? _totalInv/_totalRes : 0;

  // ── DETECCIÓN DE ALERTA DE CPL ────────────────────────────────────────────
  // Vigila el CPL en vivo y avisa si supera el umbral configurado de forma
  // sostenida (evita falsas alarmas por un pico momentáneo).
  const _ultPunto = datosVista.length>0 ? datosVista[datosVista.length-1] : null;
  useEffect(() => {
    if (!alertaCfg.activo || !_ultPunto || !_ultPunto.cpl) { setAlertaActiva(null); return; }
    const meta = alertaCfg.modo === "absoluto" ? parseFloat(alertaCfg.umbral)
      : cplAcumGlobal > 0 ? cplAcumGlobal * (1 + parseFloat(alertaCfg.umbral)/100) : 0;
    if (!meta || meta <= 0) return;
    const excedido = _ultPunto.cpl > meta;
    if (!excedido) {
      // Volvió a la normalidad → limpiar
      if (alertaActiva) { setAlertaActiva(null); alertaNotificadaRef.current = false; }
      return;
    }
    // Excedido: iniciar o mantener el conteo
    if (!alertaActiva) {
      setAlertaActiva({ desde: Date.now(), cpl: _ultPunto.cpl, meta });
    } else {
      const minutosExcedido = (Date.now() - alertaActiva.desde) / 60000;
      const sostenido = minutosExcedido >= (parseFloat(alertaCfg.minutos) || 0);
      // Persistir la alerta en el cliente para que la campana la muestre
      if (sostenido && !alertaNotificadaRef.current && onUpdate) {
        alertaNotificadaRef.current = true;
        const alertaData = {
          ts: Date.now(),
          cpl: +_ultPunto.cpl.toFixed(2),
          meta: +meta.toFixed(2),
          minutos: Math.round(minutosExcedido),
          cuenta: cuentaCPL === "todas" ? null : cuentaCPL,
        };
        client.cplAlertaActiva = alertaData;
        onUpdate({ ...client, cplAlertaActiva: alertaData });
      }
      // Mantener actualizado el CPL mostrado en la alerta
      if (Math.abs(alertaActiva.cpl - _ultPunto.cpl) > 0.001) {
        setAlertaActiva(a => a ? { ...a, cpl: _ultPunto.cpl } : a);
      }
    }
    /* eslint-disable-next-line */
  }, [_ultPunto?.cpl, _ultPunto?.ts, alertaCfg.activo, alertaCfg.umbral, alertaCfg.modo, alertaCfg.minutos, cplAcumGlobal]);

  // Limpiar la alerta persistida cuando el CPL vuelve a la normalidad
  useEffect(() => {
    if (!alertaActiva && client.cplAlertaActiva && onUpdate) {
      client.cplAlertaActiva = null;
      onUpdate({ ...client, cplAlertaActiva: null });
    }
    /* eslint-disable-next-line */
  }, [alertaActiva]);

  // Detectar distorsión ANTES de construir la gráfica
  const _ultimoRaw = datosVista.length>0 ? datosVista[datosVista.length-1] : null;
  const _leadsHoy = _ultimoRaw?.leads || 0;
  const _graficaDistorsionada = _leadsHoy < 50 && cplAcumGlobal > 0 &&
    _ultimoRaw && _ultimoRaw.cpl > 0 && Math.abs(_ultimoRaw.cpl - cplAcumGlobal)/cplAcumGlobal > 0.5;

  // Si está distorsionada, mostrar cplAcum pero mantener el punto para que la gráfica tenga datos
  const datosVistaFinal = _graficaDistorsionada && cplAcumGlobal > 0
    ? [{ ..._ultimoRaw, cpl: cplAcumGlobal }]
    : datosVista.filter(d => d.cpl > 0); // filtrar puntos con cpl=0

  // Combinar hoy+ayer para calcular escala Y
  const todosLosVals = [
    ...datosVistaFinal.map(d=>d.cpl),
    ...datosAyer.map(d=>d.cpl)
  ].filter(v=>v>0);

  const n=datosVistaFinal.length, hasData=todosLosVals.length>0;
  const ultimo=datosVistaFinal.length>0?datosVistaFinal[datosVistaFinal.length-1]:null;
  const primero=datosVistaFinal.length>0?datosVistaFinal[0]:null;
  const minCpl=hasData?Math.min(...todosLosVals):0;
  const maxCpl=hasData?Math.max(...todosLosVals):0;
  const cambio=hasData&&primero&&ultimo?((ultimo.cpl-primero.cpl)/primero.cpl*100):0;
  const tend=cambio<-0.1?"baja":cambio>0.1?"sube":"igual";
  const color=tend==="baja"?"#10B981":tend==="sube"?"#EF4444":"#FFDE59";

  const W = Math.max(chartW || 980, 320);  // ancho real del contenedor (responsive)
  const H = 300;                            // un poco mas alto para aprovechar el espacio
  const PAD = {top:20, right:90, bottom:60, left:60};
  const cW=W-PAD.left-PAD.right, cH=H-PAD.top-PAD.bottom;
  const maxV=hasData?maxCpl*1.1:1, minV=hasData?Math.max(0,minCpl*0.9):0, rngV=maxV-minV||1;

  // Para el eje X en modo 24h usamos timestamps; en otros modos usamos índices
  function xP(i, arr){ return PAD.left+(i/Math.max((arr||datosVistaFinal).length-1,1))*cW; }
  function xPts(ts, allPts) {
    if (!allPts.length) return PAD.left;
    const minTs = allPts[0].ts, maxTs = allPts[allPts.length-1].ts;
    const rng = maxTs - minTs || 1;
    return PAD.left + ((ts - minTs) / rng) * cW;
  }
  function yP(v){ return PAD.top+cH-((v-minV)/rngV)*cH; }

  // En modo 24h mezclar ayer y hoy para eje X compartido.
  // Incluimos un ancla invisible en "ahora" (pulso lo refresca) para que el
  // eje X avance con el reloj aunque el ultimo dato tenga unos segundos —
  // esto da la sensacion de scroll continuo estilo CoinMarketCap.
  const nowAnchor = Date.now();
  const allPts24h = modoRT
    ? (() => {
        const base = [...datosAyer, ...datosVistaFinal].sort((a,b)=>a.ts-b.ts);
        if (!base.length) return base;
        const maxTs = base[base.length-1].ts;
        // Solo extendemos si "ahora" es posterior al ultimo punto real
        return nowAnchor > maxTs
          ? [...base, { ts: nowAnchor, _anchor: true }]
          : base;
      })()
    : [];

  const pathHoy = modoRT && datosVistaFinal.length>0
    ? datosVistaFinal.map((d,i)=>(i===0?"M ":"L ")+xPts(d.ts, allPts24h)+" "+yP(d.cpl)).join(" ")
    : !modoRT && datosVistaFinal.length>0
      ? datosVistaFinal.map((d,i)=>(i===0?"M ":"L ")+xP(i)+" "+yP(d.cpl)).join(" ")
      : "";

  const areaHoy = modoRT && datosVistaFinal.length>0
    ? `M ${xPts(datosVistaFinal[0].ts, allPts24h)} ${PAD.top+cH} `+datosVistaFinal.map(d=>`L ${xPts(d.ts,allPts24h)} ${yP(d.cpl)}`).join(" ")+` L ${xPts(datosVistaFinal[datosVistaFinal.length-1].ts,allPts24h)} ${PAD.top+cH} Z`
    : !modoRT && datosVistaFinal.length>0
      ? `M ${xP(0)} ${PAD.top+cH} `+datosVistaFinal.map((d,i)=>`L ${xP(i)} ${yP(d.cpl)}`).join(" ")+` L ${xP(n-1)} ${PAD.top+cH} Z`
      : "";

  const pathAyer = datosAyer.length>0
    ? datosAyer.map((d,i)=>(i===0?"M ":"L ")+xPts(d.ts,allPts24h)+" "+yP(d.cpl)).join(" ")
    : "";

  const yTicks=[0,0.2,0.4,0.6,0.8,1].map(t=>minV+rngV*t);
  const xStep=Math.max(1,Math.floor(n/8));
  const xLabels=datosVistaFinal.filter((_,i)=>i%xStep===0||i===n-1);

  // Sparkline inferior
  const sparkD=histDiario.slice(-60), sN=sparkD.length;
  const sVals=sparkD.map(d=>d.cpl), sMax=sVals.length?Math.max(...sVals):1, sMin=Math.max(0,sVals.length?Math.min(...sVals)*0.9:0), sRng=sMax-sMin||1;
  function sxP(i){return(i/Math.max(sN-1,1))*(W-4)+2;}
  function syP(v){return 28-((v-sMin)/sRng)*24;}
  const sparkPath=sparkD.map((d,i)=>(i===0?"M ":"L ")+sxP(i)+" "+syP(d.cpl)).join(" ");

  // Anotaciones del día visible
  const anotHoy = anotaciones.filter(a => a.fecha === hoy);

  const RANGOS=["15m","30m","1h","24h","1W","1M","1Y","Todo"];

  return (
    <div className="card" style={{marginBottom:"1rem",padding:"1.25rem"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontWeight:700,fontSize:16}}>Costo por Lead (CPL)</div>
            {modoRT && puntosRT.length>0 && (() => {
              // Segundos desde la última lectura → cuenta regresiva a la próxima
              const ultTs = puntosRT.length ? puntosRT[puntosRT.length-1].ts : 0;
              const seg = Math.max(0, INTERVALO - Math.floor((Date.now()-ultTs)/1000));
              return (
                <span style={{fontSize:10,background:"rgba(16,185,129,.15)",color:"var(--green)",padding:"2px 8px",borderRadius:10,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"var(--green)",animation:"pulse 2s infinite"}}/>
                  EN VIVO <span style={{opacity:.65,fontVariantNumeric:"tabular-nums"}}>· {seg}s</span>
                </span>
              );
            })()}
            {(loading||loadingHist) && <span style={{fontSize:10,color:"var(--muted)"}}>{loadingHist?"Cargando...":"⟳"}</span>}
          </div>
          {hasData && ultimo && (() => {
            // CPL acumulado de todos los registros guardados (referencia de la misión)
            const allRecs = [...(client.misiones||[]).flatMap(m=>m.records||[]), ...(client.records||[])];
            const totalInv = allRecs.reduce((a,r)=>a+(parseFloat(r.inversion)||0),0);
            const totalRes = allRecs.reduce((a,r)=>a+(parseFloat(r.resultados||r.formularios||r.leads)||0),0);
            const cplAcum  = totalInv>0&&totalRes>0 ? totalInv/totalRes : 0;
            const leadsHoy = ultimo.leads || 0;
            // Distorsionado = pocos leads hoy y CPL muy diferente al acumulado
            const distorsionado = leadsHoy < 50 && cplAcum > 0 && Math.abs(ultimo.cpl - cplAcum)/cplAcum > 0.5;
            // Si está distorsionado, mostrar el CPL acumulado como número principal
            const cplMostrar = distorsionado && cplAcum > 0 ? cplAcum : ultimo.cpl;
            const colorMostrar = distorsionado && cplAcum > 0 ? "var(--accent2)" : color;
            return (
              <>
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:4}}>
                  <span style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color:colorMostrar}}>${fmtNum(cplMostrar,2)}</span>
                  {!distorsionado && <span style={{fontSize:13,color,fontWeight:600}}>{tend==="baja"?"▼":"▲"} {Math.abs(cambio).toFixed(2)}% ({rango})</span>}
                  {distorsionado && <span style={{fontSize:10,color:"var(--amber)",background:"rgba(255,222,89,.1)",padding:"2px 8px",borderRadius:8}}>⚠️ Pocos leads hoy · CPL misión</span>}
                </div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                  {distorsionado
                    ? <>CPL hoy: <span style={{fontFamily:"var(--mono)",color:"var(--amber)"}}>${fmtNum(ultimo.cpl,2)}</span> ({leadsHoy} leads hoy) · Misión: {totalRes.toFixed(0)} leads</>
                    : <>Min: <span style={{fontFamily:"var(--mono)",color:"var(--green)"}}>${fmtNum(minCpl,2)}</span>{" · "}Max: <span style={{fontFamily:"var(--mono)",color:"var(--red)"}}>${fmtNum(maxCpl,2)}</span>{cplAcum>0&&<span style={{marginLeft:8}}>· Misión: <span style={{fontFamily:"var(--mono)",fontWeight:700}}>${fmtNum(cplAcum,2)}</span></span>}</>
                  }
                  {modoRT && datosAyer.length>0 && <span style={{marginLeft:8,color:"rgba(255,255,255,.3)"}}>— Gris: ayer</span>}
                </div>
              </>
            );
          })()}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          {cuentas.length > 1 && (
            <select value={cuentaCPL} onChange={e=>setCuentaCPL(e.target.value)}
              title="Filtrar el CPL en vivo por cuenta publicitaria"
              style={{width:"auto",fontSize:11,padding:"3px 8px",marginRight:4}}>
              <option value="todas">🏢 Todas ({cuentas.length})</option>
              {cuentas.map(c => <option key={c.id||c.adAccountId} value={c.nombre}>{c.nombre}</option>)}
            </select>
          )}
          {modoRT && (
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:"3px 10px",color:"var(--amber)"}}
              onClick={()=>setShowAnotForm(v=>!v)}>📌 Anotar</button>
          )}
          <button className="btn btn-ghost btn-sm"
            title={alertaCfg.activo ? "Alerta de CPL activa — clic para configurar" : "Configurar alerta de CPL"}
            style={{fontSize:11,padding:"3px 10px",color: alertaCfg.activo ? "var(--green)" : "var(--muted)"}}
            onClick={()=>{ setAlertaLocal(client.cplAlerta || alertaCfg); setShowAlertaForm(v=>!v); }}>
            {alertaCfg.activo ? "🔔" : "🔕"} Alerta
          </button>
          {RANGOS.map(r=>(
            <button key={r} className="btn btn-ghost btn-sm"
              style={{fontSize:11,padding:"3px 10px",background:rango===r?"var(--accent)":"transparent",color:rango===r?"#fff":"var(--muted)",borderRadius:6,fontWeight:rango===r?700:400}}
              onClick={()=>setRango(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* ── BANNER DE ALERTA DE CPL ── */}
      {alertaActiva && (() => {
        const mins = Math.round((Date.now() - alertaActiva.desde)/60000);
        const sostenido = mins >= (parseFloat(alertaCfg.minutos)||0);
        const exceso = alertaActiva.meta>0 ? ((alertaActiva.cpl-alertaActiva.meta)/alertaActiva.meta)*100 : 0;
        return (
          <div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,
            background: sostenido ? "rgba(239,68,68,.1)" : "rgba(255,222,89,.08)",
            border: `1px solid ${sostenido ? "rgba(239,68,68,.35)" : "rgba(255,222,89,.3)"}`,
            display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:18}}>{sostenido ? "🚨" : "⚠️"}</span>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:700,fontSize:13,color: sostenido ? "var(--red)" : "var(--amber)"}}>
                {sostenido ? "CPL sobre el umbral" : "CPL subiendo"} — ${fmtNum(alertaActiva.cpl,2)}
                <span style={{fontWeight:400,fontSize:11,color:"var(--muted)",marginLeft:6}}>
                  (umbral ${fmtNum(alertaActiva.meta,2)} · +{exceso.toFixed(0)}%)
                </span>
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>
                {sostenido
                  ? `Sostenido ${mins} min. Revisa campañas o pausa las de peor rendimiento.`
                  : `Excedido hace ${mins} min — se avisará si supera ${alertaCfg.minutos} min.`}
                {cuentaCPL !== "todas" && ` · Cuenta: ${cuentaCPL}`}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}}
              onClick={()=>{ setAlertaActiva(null); alertaNotificadaRef.current=false; }}>Descartar</button>
          </div>
        );
      })()}

      {/* ── CONFIGURACIÓN DE ALERTA ── */}
      {showAlertaForm && (
        <div style={{marginBottom:12,padding:"12px 14px",borderRadius:10,background:"var(--surface2)",border:"1px solid var(--border)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:13}}>🔔 Alerta de CPL</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowAlertaForm(false)}>×</button>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={alertaLocal.activo}
                onChange={e=>setAlertaLocal(a=>({...a,activo:e.target.checked}))} style={{width:"auto",margin:0}} />
              Activar alerta
            </label>
            <div>
              <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>Avisar cuando el CPL</div>
              <select value={alertaLocal.modo} onChange={e=>setAlertaLocal(a=>({...a,modo:e.target.value}))}
                style={{width:"auto",fontSize:12}}>
                <option value="porcentaje">supere la misión en %</option>
                <option value="absoluto">supere un valor fijo</option>
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>{alertaLocal.modo==="absoluto"?"CPL máximo ($)":"Exceso (%)"}</div>
              <input type="number" min="0" step={alertaLocal.modo==="absoluto"?"0.05":"1"} value={alertaLocal.umbral}
                onChange={e=>setAlertaLocal(a=>({...a,umbral:e.target.value}))} style={{width:100,fontSize:12}} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>Sostenido (min)</div>
              <input type="number" min="0" step="1" value={alertaLocal.minutos}
                onChange={e=>setAlertaLocal(a=>({...a,minutos:e.target.value}))} style={{width:80,fontSize:12}} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={async ()=>{
              const cfg = { ...alertaLocal, umbral: parseFloat(alertaLocal.umbral)||0, minutos: parseFloat(alertaLocal.minutos)||0 };
              client.cplAlerta = cfg;
              if (onUpdate) await onUpdate({ ...client, cplAlerta: cfg });
              setShowAlertaForm(false);
            }}>Guardar</button>
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:8}}>
            {alertaLocal.modo==="porcentaje"
              ? `Avisará si el CPL supera ${cplAcumGlobal>0?"$"+fmtNum(cplAcumGlobal*(1+(parseFloat(alertaLocal.umbral)||0)/100),2):"la misión + "+alertaLocal.umbral+"%"} durante ${alertaLocal.minutos} min seguidos.`
              : `Avisará si el CPL supera $${fmtNum(parseFloat(alertaLocal.umbral)||0,2)} durante ${alertaLocal.minutos} min seguidos.`}
            {" "}La alerta aparece aquí y en la campana 🔔.
          </div>
        </div>
      )}

      {/* Panel de anotación */}
      {showAnotForm && (
        <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
          <input type="text" value={anotTexto} onChange={e=>setAnotTexto(e.target.value)}
            placeholder="Ej: Subí presupuesto $50, cambié creativos, pausé campaña..."
            style={{flex:1,fontSize:13}} onKeyDown={e=>e.key==="Enter"&&guardarAnotacion()} />
          <button className="btn btn-sm" onClick={guardarAnotacion}>Guardar</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAnotForm(false)}>×</button>
        </div>
      )}

      {/* Anotaciones del día */}
      {modoRT && anotHoy.length>0 && (
        <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:4}}>
          {anotHoy.map(a=>(
            <div key={a.id} style={{fontSize:11,padding:"2px 10px",background:"rgba(255,222,89,.1)",border:"1px solid rgba(255,222,89,.2)",borderRadius:10,color:"var(--amber)"}}>
              📌 {a.hora} — {a.texto}
            </div>
          ))}
        </div>
      )}

      {/* Gráfica */}
      {!hasData ? (
        <div style={{height:160,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:12,gap:8}}>
          {token&&adAccountId ? <>
            <div>Cargando datos de hoy desde Facebook...</div>
            <div style={{fontSize:10}}>Se actualizan automáticamente cada 30 segundos</div>
          </> : "Configura Facebook Ads para activar el monitoreo en tiempo real"}
        </div>
      ) : (
        <div ref={chartWrapRef} style={{width:"100%"}}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block"}} onMouseLeave={()=>setHovIdx(null)}>
            <defs>
              <linearGradient id={"cplG_"+client.id} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
                <stop offset="90%" stopColor={color} stopOpacity="0.02"/>
              </linearGradient>
            </defs>

            {/* Grid Y */}
            {yTicks.map((v,i)=>(
              <g key={i}>
                <line x1={PAD.left} y1={yP(v)} x2={PAD.left+cW} y2={yP(v)} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
                <text x={PAD.left-4} y={yP(v)+4} textAnchor="end" fontSize="9" fill="var(--muted)">${fmtNum(v,2)}</text>
              </g>
            ))}

            {/* Labels X — ticks de hora distribuidos uniformemente (estilo CoinMarketCap) */}
            {modoRT ? (
              (() => {
                if (!allPts24h.length) return null;
                const t0 = allPts24h[0].ts, t1 = allPts24h[allPts24h.length-1].ts;
                const NT = Math.min(6, Math.max(2, Math.floor((t1-t0)/(60*60*1000)))); // ~1 tick/hora, max 6
                return Array.from({length: NT+1}, (_,i) => t0 + (t1-t0)*i/NT).map((ts,i)=>(
                  <text key={i} x={xPts(ts,allPts24h)} y={PAD.top+cH+16} textAnchor="middle" fontSize="8" fill="var(--muted)">
                    {new Date(ts).toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"})}
                  </text>
                ));
              })()
            ) : (
              xLabels.map((d,i)=>(
                <text key={i} x={xP(datosVistaFinal.indexOf(d))} y={PAD.top+cH+16} textAnchor="middle" fontSize="8" fill="var(--muted)">{d.fecha}</text>
              ))
            )}

            {/* Línea de ayer (referencia gris) */}
            {pathAyer && (
              <path d={pathAyer} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" strokeDasharray="4 2" strokeLinejoin="round"/>
            )}

            {/* Área y línea de hoy — con transicion suave en el trazo */}
            {areaHoy && <path d={areaHoy} fill={`url(#cplG_${client.id})`} style={{transition:"d .8s ease-out"}}/>}
            {pathHoy && <path d={pathHoy} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{transition:"d .8s ease-out"}}/>}

            {/* Anotaciones en la gráfica */}
            {modoRT && anotHoy.map(a=>{
              const ptCercano = datosVistaFinal.reduce((prev,curr)=>Math.abs(curr.ts-a.ts)<Math.abs(prev.ts-a.ts)?curr:prev, datosVistaFinal[0]);
              if (!ptCercano) return null;
              const cx = xPts(ptCercano.ts, allPts24h);
              const cy = yP(ptCercano.cpl);
              return (
                <g key={a.id}>
                  <line x1={cx} y1={cy-4} x2={cx} y2={PAD.top+cH} stroke="rgba(255,222,89,.3)" strokeWidth="0.8" strokeDasharray="2 2"/>
                  <circle cx={cx} cy={cy-4} r="5" fill="rgba(255,222,89,.2)" stroke="var(--amber)" strokeWidth="1"/>
                  <text x={cx} y={cy-8} textAnchor="middle" fontSize="8" fill="var(--amber)">📌</text>
                </g>
              );
            })}

            {/* Punto actual — con halo pulsante y desplazamiento suave */}
            {hasData && ultimo && (() => {
              const px = modoRT?xPts(ultimo.ts,allPts24h):xP(n-1);
              const py = yP(ultimo.cpl);
              return (<>
                {/* Halo que late (respiracion en vivo) */}
                <circle cx={px} cy={py} r="13" fill={color} fillOpacity="0.12"
                  style={{transition:"cx .8s ease-out, cy .8s ease-out"}}>
                  <animate attributeName="r" values="9;17;9" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="fill-opacity" values="0.20;0.05;0.20" dur="2s" repeatCount="indefinite"/>
                </circle>
                {/* FLASH: anillo que estalla en cada lectura nueva (key=pulso lo reinicia) */}
                <circle key={`flash-${pulso}`} cx={px} cy={py} r="6" fill="none" stroke={color} strokeWidth="2.5">
                  <animate attributeName="r" from="6" to="30" dur="1.1s" fill="freeze"/>
                  <animate attributeName="stroke-opacity" from="0.9" to="0" dur="1.1s" fill="freeze"/>
                  <animate attributeName="stroke-width" from="2.5" to="0.5" dur="1.1s" fill="freeze"/>
                </circle>
                {/* Punto solido que se desliza a la nueva posicion */}
                <circle cx={px} cy={py} r="6" fill={color} stroke="var(--bg)" strokeWidth="2"
                  style={{transition:"cx .8s ease-out, cy .8s ease-out"}}/>
              </>);
            })()}

            {/* Línea de precio actual con badge — se desliza vertical al cambiar el CPL */}
            {hasData && ultimo && <>
              <line x1={PAD.left} x2={PAD.left+cW} y1={yP(ultimo.cpl)} y2={yP(ultimo.cpl)} stroke={color} strokeWidth="0.5" strokeDasharray="4 3" strokeOpacity="0.5"
                style={{transition:"y1 .8s ease-out, y2 .8s ease-out"}}/>
              <g style={{transition:"transform .8s ease-out"}} transform={`translate(0, ${yP(ultimo.cpl)})`}>
                <rect x={PAD.left+cW+4} y={-13} width={76} height={26} rx="6" fill={color}/>
                <text x={PAD.left+cW+42} y={5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#000" fontFamily="var(--mono)">${fmtNum(ultimo.cpl,2)}</text>
              </g>
            </>}

            {/* Watermark */}
            <text x={PAD.left+cW-10} y={PAD.top+cH-10} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.06)" fontWeight="700" letterSpacing="1">📊 TRAFFICK PRO</text>

            {/* Hover areas */}
            {datosVistaFinal.map((d,i)=>(
              <rect key={i}
                x={(modoRT?xPts(d.ts,allPts24h):xP(i))-Math.max(cW/Math.max(n,1)/2,3)}
                y={PAD.top} width={Math.max(cW/Math.max(n,1),6)} height={cH}
                fill="transparent" style={{cursor:"crosshair"}} onMouseEnter={()=>setHovIdx(i)}/>
            ))}

            {/* Tooltip mejorado */}
            {hovIdx!==null && hovIdx<datosVistaFinal.length && (()=>{
              const d=datosVistaFinal[hovIdx];
              const cx=modoRT?xPts(d.ts,allPts24h):xP(hovIdx);
              const tx=hovIdx<datosVistaFinal.length*0.65?cx+8:cx-165;
              const ty=Math.max(yP(d.cpl)-80,PAD.top);
              // Buscar dato de ayer a la misma hora
              const dAyer = datosAyer.find(a=>a.hora===d.fecha);
              const tooltipH = dAyer ? 90 : 70;
              return (
                <g>
                  <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top+cH} stroke="rgba(255,255,255,.3)" strokeWidth="0.8" strokeDasharray="3 2"/>
                  <circle cx={cx} cy={yP(d.cpl)} r="5" fill={color} stroke="var(--bg)" strokeWidth="2"/>
                  {dAyer && <circle cx={cx} cy={yP(dAyer.cpl)} r="4" fill="rgba(255,255,255,.3)" stroke="var(--bg)" strokeWidth="2"/>}
                  <rect x={tx} y={ty} width={158} height={tooltipH} rx="8" fill="rgba(15,20,40,.95)" stroke={color} strokeWidth="0.8"/>
                  <text x={tx+10} y={ty+16} fontSize="10" fill="rgba(255,255,255,.5)">{d.fecha}{d.esHoy?" · HOY":""}</text>
                  <text x={tx+10} y={ty+34} fontSize="15" fontWeight="800" fill={color} fontFamily="var(--mono)">${fmtNum(d.cpl,2)}/lead</text>
                  {d.leads&&<text x={tx+10} y={ty+50} fontSize="9" fill="rgba(255,255,255,.5)">{Math.round(d.leads)} leads · ${fmtNum(d.inv||0,2)} invertido</text>}
                  {dAyer&&<>
                    <line x1={tx+8} y1={ty+60} x2={tx+150} y2={ty+60} stroke="rgba(255,255,255,.08)" strokeWidth="0.5"/>
                    <text x={tx+10} y={ty+74} fontSize="9" fill="rgba(255,255,255,.35)">Ayer {dAyer.hora}: ${fmtNum(dAyer.cpl,2)}/lead</text>
                    <text x={tx+10} y={ty+86} fontSize="9" fill={d.cpl<dAyer.cpl?"#10B981":"#EF4444"}>
                      {d.cpl<dAyer.cpl?"▼ Mejor que ayer":"▲ Peor que ayer"} {Math.abs(((d.cpl-dAyer.cpl)/dAyer.cpl)*100).toFixed(1)}%
                    </text>
                  </>}
                  {d.mision&&<text x={tx+10} y={ty+50} fontSize="9" fill="rgba(255,255,255,.5)">{d.mision}</text>}
                </g>
              );
            })()}
            <line x1={PAD.left} y1={PAD.top+cH} x2={PAD.left+cW} y2={PAD.top+cH} stroke="var(--border)" strokeWidth="1"/>
          </svg>
        </div>
      )}

      {/* Sparkline histórico inferior */}
      {sN>3 && (
        <div style={{marginTop:8,borderTop:"1px solid var(--border)",paddingTop:8}}>
          <div style={{fontSize:9,color:"var(--muted)",marginBottom:4}}>Historial CPL — últimos {sN} días</div>
          <svg width="100%" height={32} viewBox={`0 0 ${W} 32`} preserveAspectRatio="none" style={{display:"block",opacity:.6}}>
            <defs>
              <linearGradient id={"spkG_"+client.id} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4d9fff" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.02"/>
              </linearGradient>
            </defs>
            <path d={sparkPath+` L ${sxP(sN-1)} 30 L ${sxP(0)} 30 Z`} fill={`url(#spkG_${client.id})`}/>
            <path d={sparkPath} fill="none" stroke="#4d9fff" strokeWidth="1"/>
            {(()=>{
              const dias=rango==="1W"?7:rango==="1M"?30:rango==="1Y"?365:0;
              if(!dias||sN<=dias) return null;
              const x=sxP(sN-dias);
              return <rect x={x} y={0} width={sxP(sN-1)-x} height={30} fill="rgba(77,159,255,.1)" rx="2"/>;
            })()}
          </svg>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"var(--muted)"}}>
        <span>{client.cplRtData?`${Object.keys(client.cplRtData).length} días guardados · ${Object.values(client.cplRtData).reduce((a,v)=>a+v.length,0)} puntos total`:"Sin historial RT aún"}</span>
        {ultimo && Math.round(ultimo.leads||0) <= 2 && (
          <span style={{marginLeft:8,color:"var(--amber)",fontSize:10}}>⚠️ Solo {Math.round(ultimo.leads||0)} leads RT detectados — abre DevTools Console para ver log [CPL RT]</span>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {modoRT && datosAyer.length>0 && <span style={{color:"rgba(255,255,255,.25)"}}>— ayer</span>}
          {client.cplRtData && Object.keys(client.cplRtData).length>0 && onUpdate && (
            <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"1px 8px",color:"var(--red)"}}
              title="Borra el historial de CPL en vivo de este cliente. Úsalo si los datos se ven cruzados con otro cliente."
              onClick={async ()=>{
                if(!window.confirm(`¿Borrar el historial de CPL en vivo de ${client.name}?\n\nEsto elimina ${Object.values(client.cplRtData).reduce((a,v)=>a+v.length,0)} puntos guardados. Úsalo solo si los datos están cruzados con otro cliente. Se empezará a registrar de nuevo desde ahora.`)) return;
                setPuntosRT([]);
                client.cplRtData = {};
                await onUpdate({ ...client, cplRtData: {} });
              }}>🗑️ Limpiar historial</button>
          )}
          {token&&adAccountId&&<button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"1px 8px"}} onClick={()=>{fetchHistoricoHoy();fetchCplActual();}} disabled={loading||loadingHist}>🔄</button>}
        </div>
      </div>
    </div>
  );
}
