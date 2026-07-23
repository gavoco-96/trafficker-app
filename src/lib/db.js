// Trafficker Pro — cliente de Supabase
// Toda la persistencia pasa por aqui. La tabla `clients` guarda
// cada cliente completo dentro de la columna jsonb `data`.
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
