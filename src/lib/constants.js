// Trafficker Pro — constantes de dominio
// Credenciales de admin, servicios, redes y campos de antecedentes.
// Extraído de App.jsx (Fase 1 de modularización)

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
export const ADMIN = { username: "jorge", password: "admin2024" };

export const SERVICIOS_DEFAULT = [
  { id: "estrategia", nombre: "Estrategia", subetapas: ["Briefing", "Investigación de mercado", "Definición de audiencia", "Plan de acción"] },
  { id: "contenido", nombre: "Contenido", subetapas: ["Investigación", "Guionización", "Grabación", "Edición", "Primera Entrega", "Entrega Final"] },
  { id: "pauta", nombre: "Pauta", subetapas: ["Test de Anuncios", "Test de Públicos", "Campañas Ganadoras", "Escala"] },
  { id: "ventas", nombre: "Ventas", subetapas: ["Configuración CRM", "Capacitación equipo", "Seguimiento", "Optimización"] },
  { id: "remarketing", nombre: "Remarketing", subetapas: ["Segmentación", "Creatividades", "Activación", "Análisis"] },
  { id: "analisis", nombre: "Análisis", subetapas: ["Reporte semanal", "Reporte mensual", "Optimizaciones", "Presentación de resultados"] },
];

export const REDES_SOCIALES = [
  { id: "facebook", label: "Facebook" }, { id: "instagram", label: "Instagram" },
  { id: "tiktok_personal", label: "TikTok Personal" }, { id: "tiktok_empresarial", label: "TikTok Empresarial" },
  { id: "tiktok_ads", label: "TikTok Ads" }, { id: "gmail", label: "Gmail" },
  { id: "youtube", label: "YouTube" }, { id: "linkedin", label: "LinkedIn" },
  { id: "spotify", label: "Spotify" }, { id: "pinterest", label: "Pinterest" },
];

export const REDES_PAUTA = ["Facebook / Instagram", "TikTok Ads", "Google Ads", "YouTube Ads", "LinkedIn Ads", "Pinterest Ads"];

// Campos manuales vs calculados en antecedentes
export const ANT_MANUALES = [
  { key: "inversion", label: "Inversión", prefix: "$" },
  { key: "ventas_ant", label: "Ventas", prefix: "" },
  { key: "resultados", label: "Resultados", prefix: "" },
  { key: "clics_enlace", label: "Clics en el Enlace", prefix: "" },
  { key: "alcance", label: "Alcance", prefix: "" },
  { key: "impresiones", label: "Impresiones", prefix: "" },
  { key: "ticket_promedio", label: "Ticket Promedio", prefix: "$" },
];

export const ANT_CALCULADOS = [
  { key: "ganancia_bruta", label: "Ganancia Bruta", prefix: "$", tipo: "beneficio" },
  { key: "ganancia_neta", label: "Ganancia Neta", prefix: "$", tipo: "beneficio" },
  { key: "roas_marketing", label: "ROAS Marketing", suffix: "x", tipo: "beneficio" },
  { key: "roas_empresarial", label: "ROAS Empresarial", suffix: "x", tipo: "beneficio" },
  { key: "cpa", label: "CPA", prefix: "$", tipo: "costo" },
  { key: "cpr", label: "CPR", prefix: "$", tipo: "costo" },
  { key: "cpc", label: "CPC", prefix: "$", tipo: "costo" },
];

export const ANT_TODOS = [...ANT_MANUALES, ...ANT_CALCULADOS];

