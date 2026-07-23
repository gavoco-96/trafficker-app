// Trafficker Pro — cliente de Supabase
// Toda la persistencia pasa por aqui. La tabla `clients` guarda cada
// cliente completo dentro de la columna jsonb `data`.
// Extraído de App.jsx (Fase 1 de modularización)

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://rckcrrdkxmdeexkuuqie.supabase.co";
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja2NycmRreG1kZWV4a3V1cWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1MTEsImV4cCI6MjA5NTk3ODUxMX0.I5MSkDM16EqNJYYUsgoyOfrcbvAwKXlSTVyQYHd86b4";
export const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

export const db = {
  async getAll() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=*`, { headers: H });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows = await r.json();
      return { ok: true, data: rows.map(row => row.data) };
    } catch (e) { return { ok: false, data: [], error: e.message }; }
  },
  async upsert(client) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: client.id, data: client })
      });
      if (!r.ok) { const txt = await r.text(); throw new Error(`HTTP ${r.status}: ${txt}`); }
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async delete(id) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${id}`, { method: "DELETE", headers: H });
      return { ok: r.ok };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async deleteAll() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?id=neq.IMPOSSIBLE_MATCH_XYZ`, { method: "DELETE", headers: H });
      return { ok: r.ok };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async verify() {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/clients?select=id&limit=1`, { headers: H });
      return { ok: r.ok, status: r.status };
    } catch (e) { return { ok: false, error: e.message }; }
  }
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const ADMIN = { username: "jorge", password: "admin2024" };

const SERVICIOS_DEFAULT = [
  { id: "estrategia", nombre: "Estrategia", subetapas: ["Briefing", "Investigación de mercado", "Definición de audiencia", "Plan de acción"] },
  { id: "contenido", nombre: "Contenido", subetapas: ["Investigación", "Guionización", "Grabación", "Edición", "Primera Entrega", "Entrega Final"] },
  { id: "pauta", nombre: "Pauta", subetapas: ["Test de Anuncios", "Test de Públicos", "Campañas Ganadoras", "Escala"] },
  { id: "ventas", nombre: "Ventas", subetapas: ["Configuración CRM", "Capacitación equipo", "Seguimiento", "Optimización"] },
  { id: "remarketing", nombre: "Remarketing", subetapas: ["Segmentación", "Creatividades", "Activación", "Análisis"] },
  { id: "analisis", nombre: "Análisis", subetapas: ["Reporte semanal", "Reporte mensual", "Optimizaciones", "Presentación de resultados"] },
];

const REDES_SOCIALES = [
  { id: "facebook", label: "Facebook" }, { id: "instagram", label: "Instagram" },
  { id: "tiktok_personal", label: "TikTok Personal" }, { id: "tiktok_empresarial", label: "TikTok Empresarial" },
  { id: "tiktok_ads", label: "TikTok Ads" }, { id: "gmail", label: "Gmail" },
  { id: "youtube", label: "YouTube" }, { id: "linkedin", label: "LinkedIn" },
  { id: "spotify", label: "Spotify" }, { id: "pinterest", label: "Pinterest" },
];

const REDES_PAUTA = ["Facebook / Instagram", "TikTok Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "Pinterest Ads"];

// Campos manuales vs calculados en antecedentes
const ANT_MANUALES = [
  { key: "inversion", label: "Inversión", prefix: "$" },
  { key: "ventas_ant", label: "Ventas", prefix: "" },
  { key: "resultados", label: "Resultados", prefix: "" },
  { key: "clics_enlace", label: "Clics en el Enlace", prefix: "" },
  { key: "alcance", label: "Alcance", prefix: "" },
  { key: "impresiones", label: "Impresiones", prefix: "" },
  { key: "ticket_promedio", label: "Ticket Promedio", prefix: "$" },
];

const ANT_CALCULADOS = [
  { key: "ganancia_bruta", label: "Ganancia Bruta", prefix: "$", tipo: "beneficio" },
  { key: "ganancia_neta", label: "Ganancia Neta", prefix: "$", tipo: "beneficio" },
  { key: "roas_marketing", label: "ROAS Marketing", suffix: "x", tipo: "beneficio" },
  { key: "roas_empresarial", label: "ROAS Empresarial", suffix: "x", tipo: "beneficio" },
  { key: "cpa", label: "CPA", prefix: "$", tipo: "costo" },
  { key: "cpr", label: "CPR", prefix: "$", tipo: "costo" },
  { key: "cpc", label: "CPC", prefix: "$", tipo: "costo" },
];

const ANT_TODOS = [...ANT_MANUALES, ...ANT_CALCULADOS];

