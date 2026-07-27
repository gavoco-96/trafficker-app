// Trafficker Pro — Brief de Cliente
// Diagnóstico del cliente colgado del tenant. Vive dentro de client.brief
// (jsonb "data" de la tabla clients), igual que funnel/kpis/records.
// Se guarda con db.upsert. Borrador resiliente a F5 en sessionStorage.
//
// 10 secciones: 1-8 visibles para el cliente, 9-10 SOLO uso interno.
// El toggle "Vista cliente / Vista interna" es exclusivo del admin, y este
// panel solo se monta dentro de AdminClientDetail (vista admin), así que las
// secciones internas nunca llegan a la vista del cliente.

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../lib/db.js";
import { localDateStr } from "../lib/utils.js";

// ═══════════════════════════════════════════════════════════════════════════
// ESTRUCTURA DEL BRIEF — 10 secciones declarativas
// ═══════════════════════════════════════════════════════════════════════════
// interno: true  → sección de uso interno (9, 10), solo en Vista interna.
// Tipos de campo: text, textarea, tel, email, url, number, select,
//                 multi (checkboxes), check (checklist de accesos).

export const BRIEF_SECCIONES = [
  {
    id: "empresa", num: 1, titulo: "La empresa", icono: "🏢", interno: false,
    campos: [
      { key: "nombre", label: "Nombre del negocio", tipo: "text" },
      { key: "contacto", label: "Persona de contacto", tipo: "text" },
      { key: "correo", label: "Correo", tipo: "email" },
      { key: "whatsapp", label: "WhatsApp", tipo: "tel" },
      { key: "ciudad", label: "Ciudad", tipo: "text" },
      { key: "web", label: "Sitio web", tipo: "url" },
      { key: "descripcion", label: "Descripción del negocio", tipo: "textarea" },
    ],
  },
  {
    id: "producto", num: 2, titulo: "Producto y oferta", icono: "📦", interno: false,
    campos: [
      { key: "que_promociona", label: "¿Qué se va a promocionar?", tipo: "textarea" },
      { key: "precio", label: "Precio", tipo: "text" },
      { key: "tipo_venta", label: "Tipo de venta", tipo: "select", opciones: ["Venta única", "Recurrente / suscripción"] },
      { key: "diferencial", label: "Diferencial (¿por qué a ti?)", tipo: "textarea" },
      { key: "promocion", label: "¿Promoción activa?", tipo: "textarea" },
    ],
  },
  {
    id: "cliente_ideal", num: 3, titulo: "Cliente ideal", icono: "🎯", interno: false,
    campos: [
      { key: "perfil", label: "Perfil del cliente ideal", tipo: "textarea" },
      { key: "problema_deseo", label: "Problema que resuelve / deseo que cumple", tipo: "textarea" },
      { key: "objeciones", label: "Objeciones frecuentes", tipo: "textarea" },
    ],
  },
  {
    id: "objetivo", num: 4, titulo: "Objetivo y metas", icono: "📈", interno: false,
    campos: [
      { key: "objetivo_principal", label: "Objetivo principal", tipo: "multi",
        opciones: ["Generar leads", "Ventas directas", "Reconocimiento de marca", "Tráfico al sitio", "Mensajes de WhatsApp", "Registros / inscripciones", "Agendar citas"] },
      { key: "meta_ventas_mes", label: "Meta de ventas / mes", tipo: "text" },
      { key: "valor_cliente", label: "Valor promedio por cliente", tipo: "text" },
      { key: "definicion_exito", label: "¿Cómo se ve el éxito?", tipo: "textarea" },
    ],
  },
  {
    id: "competencia", num: 5, titulo: "Competencia y mercado", icono: "⚔️", interno: false,
    campos: [
      { key: "competidores", label: "Competidores principales", tipo: "textarea" },
      { key: "pauta_antes", label: "¿Ha hecho pauta antes?", tipo: "select", opciones: ["No", "Sí"] },
      { key: "que_funciono", label: "¿Qué funcionó?", tipo: "textarea" },
      { key: "que_no_funciono", label: "¿Qué no funcionó?", tipo: "textarea" },
    ],
  },
  {
    id: "marca", num: 6, titulo: "Marca y material", icono: "🎨", interno: false,
    campos: [
      { key: "material_disponible", label: "Material disponible", tipo: "multi",
        opciones: ["Logo", "Fotos de producto", "Videos", "Manual de marca", "Testimonios", "Casos de éxito", "Catálogo", "Nada aún"] },
      { key: "manual_marca", label: "¿Tiene manual de marca?", tipo: "select", opciones: ["No", "Sí"] },
      { key: "tono", label: "Tono de comunicación", tipo: "textarea" },
      { key: "restricciones", label: "Restricciones (qué NO usar / decir)", tipo: "textarea" },
    ],
  },
  {
    id: "ventas", num: 7, titulo: "Ventas y seguimiento", icono: "🤝", interno: false,
    campos: [
      { key: "como_atiende", label: "¿Cómo atiende hoy los contactos?", tipo: "textarea" },
      { key: "equipo_ventas", label: "¿Tiene equipo de ventas?", tipo: "select", opciones: ["No, solo yo", "Sí, 1 persona", "Sí, equipo de 2+"] },
      { key: "tiempo_respuesta", label: "Tiempo de respuesta a un lead", tipo: "text" },
      { key: "seguimiento", label: "¿Cómo hace seguimiento?", tipo: "textarea" },
    ],
  },
  {
    id: "presupuesto", num: 8, titulo: "Presupuesto y plazos", icono: "💰", interno: false,
    campos: [
      { key: "presupuesto_mensual", label: "Presupuesto mensual de pauta", tipo: "text" },
      { key: "fecha_inicio", label: "Fecha de inicio deseada", tipo: "text" },
      { key: "tipo_campana", label: "Tipo de campaña", tipo: "select", opciones: ["Siempre activa", "Por temporada", "Lanzamiento puntual", "Aún no lo sé"] },
      { key: "fechas_clave", label: "Fechas clave (eventos, promos, temporadas)", tipo: "textarea" },
    ],
  },
  // ── SECCIONES INTERNAS (solo admin, Vista interna) ──────────────────────
  {
    id: "accesos", num: 9, titulo: "Accesos técnicos", icono: "🔑", interno: true,
    campos: [
      { key: "checklist_accesos", label: "Checklist de accesos", tipo: "check",
        opciones: ["Business Manager Meta", "TikTok Ads", "YouTube Ads", "Redes sociales", "Píxel / API de conversiones", "Método de pago", "Sitio web / dominio", "CRM"] },
      { key: "id_cuenta", label: "ID de cuenta publicitaria", tipo: "text" },
      { key: "destino_leads", label: "Destino de los leads (WhatsApp / CRM / formulario)", tipo: "textarea" },
      { key: "notas_accesos", label: "Notas de accesos", tipo: "textarea" },
    ],
  },
  {
    id: "media_buyer", num: 10, titulo: "Notas del media buyer", icono: "🧠", interno: true,
    campos: [
      { key: "objetivo_recomendado", label: "Objetivo de campaña recomendado", tipo: "textarea" },
      { key: "plataformas", label: "Plataformas", tipo: "multi",
        opciones: ["Meta (FB/IG)", "TikTok Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads"] },
      { key: "cpl_objetivo", label: "CPL / CPA objetivo", tipo: "text" },
      { key: "roas_objetivo", label: "ROAS objetivo", tipo: "text" },
      { key: "paquete_sugerido", label: "Paquete sugerido", tipo: "select", opciones: ["Starter", "Growth", "Launch"] },
      { key: "riesgos", label: "Riesgos detectados", tipo: "textarea" },
      { key: "precio_proponer", label: "Precio a proponer", tipo: "text" },
    ],
  },
];

// Todos los campos aplanados, para cálculo de progreso y exportación.
const CAMPOS_CLIENTE = BRIEF_SECCIONES.filter(s => !s.interno).flatMap(s => s.campos.map(c => ({ ...c, seccion: s.titulo })));
const CAMPOS_TODOS = BRIEF_SECCIONES.flatMap(s => s.campos.map(c => ({ ...c, seccion: s.titulo })));

// ─── Helpers de valor ─────────────────────────────────────────────────────
// Un campo cuenta como "lleno" si tiene texto no vacío, o al menos una opción
// marcada en multi/check.
function campoLleno(tipo, v) {
  if (tipo === "multi" || tipo === "check") return Array.isArray(v) && v.length > 0;
  return v != null && String(v).trim() !== "";
}

function valorTexto(tipo, v) {
  if (tipo === "multi" || tipo === "check") return Array.isArray(v) ? v.join(", ") : "";
  return v == null ? "" : String(v);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN A SHEETS — mismo patrón copiar/pegar TSV de los paneles de campañas
// ═══════════════════════════════════════════════════════════════════════════
function ModalSheets({ titulo, tsv, onClose }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    let ok = false;
    try { await navigator.clipboard.writeText(tsv); ok = true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = tsv; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        ok = document.execCommand("copy"); document.body.removeChild(ta);
      } catch {}
    }
    setCopiado(ok);
  }

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: "100%", padding: "20px 22px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📊 {titulo}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
        </div>
        <ol style={{ fontSize: 13, paddingLeft: 20, margin: "0 0 14px", lineHeight: 1.8 }}>
          <li>Presiona <strong>Copiar datos</strong>.</li>
          <li>Presiona <strong>Abrir Google Sheets</strong>.</li>
          <li>Clic en la celda <strong>A1</strong> y pega con <strong>Ctrl+V</strong>.</li>
        </ol>
        <textarea readOnly value={tsv} onClick={e => e.target.select()}
          style={{ width: "100%", height: 120, fontSize: 10, fontFamily: "var(--mono)", resize: "none", marginBottom: 14, background: "var(--surface2)" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1, minWidth: 130 }} onClick={copiar}>
            {copiado ? "✓ Copiado" : "📋 Copiar datos"}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1, minWidth: 130 }}
            onClick={() => window.open("https://sheets.new", "_blank")}>📊 Abrir Google Sheets</button>
        </div>
        {copiado && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 10 }}>✓ Datos en el portapapeles.</div>}
      </div>
    </div>
  );
}

// Construye el TSV a partir de un conjunto de campos y las respuestas.
function construirTSV(campos, respuestas) {
  const filas = [["Sección", "Campo", "Respuesta"]];
  campos.forEach(c => {
    filas.push([c.seccion, c.label, valorTexto(c.tipo, respuestas[c.key])]);
  });
  return filas.map(f => f.map(v => String(v ?? "")).join("\t")).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPO — renderiza un input según su tipo
// ═══════════════════════════════════════════════════════════════════════════
function CampoBrief({ campo, valor, onChange }) {
  const { tipo, label, opciones } = campo;

  if (tipo === "textarea") {
    return (
      <div className="field" style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
        <textarea value={valor || ""} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", minHeight: 70, fontSize: 13, resize: "vertical", background: "var(--surface2)" }} />
      </div>
    );
  }

  if (tipo === "select") {
    return (
      <div className="field" style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
        <select value={valor || ""} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", fontSize: 13, background: "var(--surface2)" }}>
          <option value="">— Seleccionar —</option>
          {opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (tipo === "multi" || tipo === "check") {
    const arr = Array.isArray(valor) ? valor : [];
    const toggle = (op) => {
      onChange(arr.includes(op) ? arr.filter(x => x !== op) : [...arr, op]);
    };
    return (
      <div className="field" style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>{label}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {opciones.map(op => {
            const on = arr.includes(op);
            return (
              <button key={op} type="button" onClick={() => toggle(op)}
                className={"servicio-chip" + (on ? " selected" : "")}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
                  background: on ? "rgba(0,74,173,.2)" : "var(--surface2)",
                  color: on ? "#4d9fff" : "var(--text)" }}>
                {tipo === "check" ? (on ? "☑ " : "☐ ") : ""}{op}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // text, tel, email, url, number
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      <input type={tipo === "number" ? "number" : tipo === "tel" ? "tel" : tipo === "email" ? "email" : tipo === "url" ? "url" : "text"}
        value={valor || ""} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", fontSize: 13, background: "var(--surface2)" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export function BriefPanel({ client, onUpdate }) {
  // Clave de borrador por cliente, para no mezclar entre tenants.
  const draftKey = "tp_brief_draft_" + client.id;

  // Estado inicial: borrador de sessionStorage si existe (resiliencia F5),
  // si no, lo persistido en client.brief.
  const [respuestas, setRespuestas] = useState(() => {
    try {
      const draft = sessionStorage.getItem(draftKey);
      if (draft) return JSON.parse(draft);
    } catch {}
    return client.brief?.respuestas || {};
  });
  const [vista, setVista] = useState("cliente"); // "cliente" | "interna"
  const [guardando, setGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(client.brief?.updated_at || null);
  const [modalSheets, setModalSheets] = useState(null); // { titulo, tsv }
  const [dirty, setDirty] = useState(false);

  const debounceRef = useRef(null);
  const clienteIdRef = useRef(client.id);

  // ── AISLAMIENTO POR CLIENTE ──────────────────────────────────────────────
  // El componente se monta con key={client.id} desde App.jsx, así que un
  // cambio de cliente lo remonta y este bloque no debería dispararse. Se deja
  // como guardia defensiva: si la instancia se reutilizara, recarga el estado.
  useEffect(() => {
    if (clienteIdRef.current !== client.id) {
      clienteIdRef.current = client.id;
      let inicial = client.brief?.respuestas || {};
      try {
        const draft = sessionStorage.getItem("tp_brief_draft_" + client.id);
        if (draft) inicial = JSON.parse(draft);
      } catch {}
      setRespuestas(inicial);
      setDirty(false);
      setUltimoGuardado(client.brief?.updated_at || null);
    }
  }, [client.id, client.brief]);

  // ── Persistir a Supabase ─────────────────────────────────────────────────
  const guardarBD = useCallback(async (resp, estadoForzado) => {
    setGuardando(true);
    const completoCliente = CAMPOS_CLIENTE.every(c => campoLleno(c.tipo, resp[c.key]));
    const estado = estadoForzado || (completoCliente ? "completo" : "borrador");
    const ahora = localDateStr() + " " + new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
    const brief = {
      id: client.brief?.id || ("brief_" + client.id),
      cliente_id: client.id,
      estado,
      created_at: client.brief?.created_at || ahora,
      updated_at: ahora,
      respuestas: resp,
    };
    // La tabla clients guarda todo el cliente en el jsonb "data" → db.upsert.
    const r = await db.upsert({ ...client, brief });
    setGuardando(false);
    if (r.ok) {
      client.brief = brief;          // reflejar en el objeto en memoria
      if (onUpdate) onUpdate({ ...client, brief });
      setUltimoGuardado(ahora);
      setDirty(false);
      try { sessionStorage.removeItem(draftKey); } catch {}
    } else {
      console.error("[Brief] Error guardando:", r.error);
    }
    return r;
  }, [client, onUpdate, draftKey]);

  // ── onChange de un campo: actualiza estado, borrador y agenda autosave ────
  function setCampo(key, valor) {
    setRespuestas(prev => {
      const next = { ...prev, [key]: valor };
      // Borrador inmediato en sessionStorage (sobrevive a F5 antes de guardar).
      try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch {}
      // Autosave con debounce ~2s.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const idAlEditar = client.id;
      debounceRef.current = setTimeout(() => {
        if (idAlEditar === client.id) guardarBD(next);
      }, 2000);
      return next;
    });
    setDirty(true);
  }

  // Limpiar el timer al desmontar.
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Progreso ─────────────────────────────────────────────────────────────
  // Se mide sobre el conjunto visible en la vista activa.
  const camposVista = vista === "interna" ? CAMPOS_TODOS : CAMPOS_CLIENTE;
  const llenos = camposVista.filter(c => campoLleno(c.tipo, respuestas[c.key])).length;
  const total = camposVista.length;
  const pct = total > 0 ? Math.round((llenos / total) * 100) : 0;

  const seccionesVisibles = BRIEF_SECCIONES.filter(s => vista === "interna" || !s.interno);

  const estadoActual = CAMPOS_CLIENTE.every(c => campoLleno(c.tipo, respuestas[c.key])) ? "completo" : "borrador";

  return (
    <div>
      {/* ── Cabecera con toggle de vista, estado y exportación ─────────────── */}
      <div className="card" style={{ padding: "16px 18px", marginBottom: "1rem", position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>📝 Brief del cliente</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
              <span className={"badge " + (estadoActual === "completo" ? "badge-wa" : "badge-web")}
                style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8 }}>
                {estadoActual === "completo" ? "✓ Completo" : "● Borrador"}
              </span>
              {ultimoGuardado && <span style={{ marginLeft: 10 }}>Guardado: {ultimoGuardado}</span>}
              {guardando && <span style={{ marginLeft: 10, color: "var(--accent2)" }}>Guardando…</span>}
              {dirty && !guardando && <span style={{ marginLeft: 10, color: "var(--muted)" }}>Cambios sin guardar…</span>}
            </div>
          </div>

          {/* Toggle de vista (solo admin — este panel solo se monta en vista admin) */}
          <div style={{ display: "flex", gap: 4 }}>
            <button className={`tab ${vista === "cliente" ? "active" : ""}`} onClick={() => setVista("cliente")}>👤 Vista cliente</button>
            <button className={`tab ${vista === "interna" ? "active" : ""}`} onClick={() => setVista("interna")}>🔒 Vista interna</button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
            <span>Completado {vista === "interna" ? "(todas las secciones)" : "(secciones del cliente)"}</span>
            <span>{llenos}/{total} · {pct}%</span>
          </div>
          <div style={{ height: 8, background: "var(--surface2)", borderRadius: 6, overflow: "hidden" }}>
            <div className="kpi-progress-fill" style={{ width: pct + "%", height: "100%", background: pct === 100 ? "var(--green)" : "var(--accent)", transition: "width .3s" }} />
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={() => guardarBD(respuestas)} disabled={guardando}>
            {guardando ? "Guardando…" : "💾 Guardar ahora"}
          </button>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setModalSheets({ titulo: "Exportar brief (cliente)", tsv: construirTSV(CAMPOS_CLIENTE, respuestas) })}>
            📊 Exportar cliente
          </button>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setModalSheets({ titulo: "Exportar brief (completo)", tsv: construirTSV(CAMPOS_TODOS, respuestas) })}>
            📊 Exportar completo
          </button>
        </div>
      </div>

      {/* ── Secciones ──────────────────────────────────────────────────────── */}
      {seccionesVisibles.map(sec => (
        <div key={sec.id} className="card" style={{ padding: "18px 20px", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>{sec.icono}</span>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{sec.num}. {sec.titulo}</div>
            {sec.interno && (
              <span className="badge badge-launch" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, marginLeft: 4 }}>
                Uso interno
              </span>
            )}
          </div>
          {sec.campos.map(campo => (
            <CampoBrief key={campo.key} campo={campo}
              valor={respuestas[campo.key]}
              onChange={v => setCampo(campo.key, v)} />
          ))}
        </div>
      ))}

      {modalSheets && (
        <ModalSheets titulo={modalSheets.titulo} tsv={modalSheets.tsv} onClose={() => setModalSheets(null)} />
      )}
    </div>
  );
}
