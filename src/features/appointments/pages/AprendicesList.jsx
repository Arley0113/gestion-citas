import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, ChevronRight, ChevronLeft, Calendar, Clock, AlertCircle, Trash2, Check, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const DEV_DATA = [
  { id: "a1", full_name: "Ana García",       document_number: "1001234", program: "Desarrollo de Software",   last_date: "2026-06-20", total: 3 },
  { id: "a2", full_name: "Carlos López",     document_number: "1005678", program: "Diseño Gráfico",           last_date: "2026-06-15", total: 1 },
  { id: "a3", full_name: "María Rodríguez",  document_number: "1009012", program: "Contabilidad",             last_date: "2026-06-18", total: 2 },
  { id: "a4", full_name: "Pedro Martínez",   document_number: "1003456", program: "Desarrollo de Software",   last_date: null,         total: 0 },
  { id: "a5", full_name: "Laura Sánchez",    document_number: "1007890", program: "Administración Empresas",  last_date: "2026-06-22", total: 4 },
  { id: "a6", full_name: "Diego Torres",     document_number: "1002345", program: "Mantenimiento Industrial", last_date: "2026-06-10", total: 1 },
];

const AVATAR_COLORS = ["#39a900","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#14b8a6"];

const PROGRAM_COLORS = {
  "Desarrollo de Software":   { bg: "#eff6ff", color: "#1e40af" },
  "Diseño Gráfico":           { bg: "#f5f3ff", color: "#6d28d9" },
  "Contabilidad":             { bg: "#fef3c7", color: "#92400e" },
  "Administración Empresas":  { bg: "#f0fce4", color: "#166534" },
  "Mantenimiento Industrial": { bg: "#fef2f2", color: "#991b1b" },
};
const DEFAULT_PROGRAM_COLOR = { bg: "#f3f4f6", color: "#374151" };

const PAGE_SIZE = 20;

const normalize = (str) =>
  str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const isAtRisk = (aprendiz) => {
  if (!aprendiz.total || aprendiz.total === 0) return true;
  if (!aprendiz.last_date) return true;
  return differenceInDays(new Date(), parseISO(aprendiz.last_date)) > 30;
};

const FILTERS = [
  { key: "todos",     label: "Todos" },
  { key: "activos",   label: "Con citas" },
  { key: "sin_citas", label: "Sin citas" },
  { key: "riesgo",    label: "Sin actividad reciente" },
];

export default function AprendicesList() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [aprendices, setAprendices]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [page, setPage]               = useState(0);

  const canDelete = can(P.USERS_DELETE);

  const handleDelete = async (id) => {
    if (DEV_ROLE) { setAprendices(prev => prev.filter(a => a.id !== id)); toast.success("Aprendiz eliminado (demo)"); return; }
    const { error } = await supabase.rpc("delete_aprendiz", { target_id: id });
    if (error) { toast.error("Error al eliminar: " + error.message); return; }
    setAprendices(prev => prev.filter(a => a.id !== id));
    toast.success("Aprendiz eliminado correctamente");
  };

  const fetchAprendices = useCallback(async (searchTerm = "") => {
    if (DEV_ROLE) {
      setAprendices(DEV_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: roleRow } = await supabase
        .from("roles").select("id").eq("name", "APRENDIZ").single();
      if (!roleRow) return;

      const isAdminLike = ["COORDINACION", "ADMINISTRADOR", "SUPERADMIN"].includes(profile?.roles?.name);
      let profileIds = null;

      // Profesionales solo ven aprendices con citas en su dependencia
      if (!isAdminLike && profile?.dependency_id) {
        const { data: depApts } = await supabase
          .from("appointments")
          .select("user_id")
          .eq("dependency_id", profile.dependency_id);
        profileIds = [...new Set((depApts || []).map(a => a.user_id))];
        if (profileIds.length === 0) { setAprendices([]); setLoading(false); return; }
      }

      // Sin búsqueda: se muestran los primeros 200 (orden alfabético) para no
      // cargar el padrón completo de una institución grande de una sola vez.
      // Con búsqueda: el filtro se aplica en la propia query (server-side) para
      // no dejar fuera coincidencias más allá de esos primeros 200 — antes el
      // buscador filtraba sobre el array ya capado y "perdía" resultados reales.
      let profileQuery = supabase
        .from("profiles")
        .select("id, full_name, document_number, program")
        .eq("role_id", roleRow.id)
        .order("full_name");

      const q = searchTerm.trim();
      if (q) {
        const esc = q.replace(/[%,]/g, "");
        profileQuery = profileQuery
          .or(`full_name.ilike.%${esc}%,document_number.ilike.%${esc}%,program.ilike.%${esc}%`)
          .limit(500);
      } else {
        profileQuery = profileQuery.limit(200);
      }

      if (profileIds) profileQuery = profileQuery.in("id", profileIds);

      const { data: profiles } = await profileQuery;

      if (!profiles?.length) { setAprendices([]); return; }

      const ids = profiles.map(p => p.id);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: apts } = await supabase
        .from("appointments")
        .select("user_id, scheduled_date")
        .in("user_id", ids)
        .gte("scheduled_date", sixMonthsAgo.toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: false });

      const aptsByUser = {};
      for (const a of (apts || [])) {
        if (!aptsByUser[a.user_id]) aptsByUser[a.user_id] = [];
        aptsByUser[a.user_id].push(a.scheduled_date);
      }

      const mapped = profiles.map(p => {
        const dates = aptsByUser[p.id] || [];
        return {
          id:              p.id,
          full_name:       p.full_name,
          document_number: p.document_number,
          program:         p.program,
          last_date:       dates[0] || null,
          total:           dates.length,
        };
      });
      setAprendices(mapped);
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    setPage(0);
    const handle = setTimeout(() => fetchAprendices(search), search ? 300 : 0);
    return () => clearTimeout(handle);
  }, [fetchAprendices, search]);

  const byFilter = aprendices.filter(a => {
    if (activeFilter === "activos")   return a.total > 0;
    if (activeFilter === "sin_citas") return a.total === 0;
    if (activeFilter === "riesgo")    return isAtRisk(a);
    return true;
  });

  // En producción la búsqueda ya se aplicó server-side en fetchAprendices();
  // en modo demo (DEV_ROLE) los datos son un mock fijo, se filtran aquí.
  const filtered = !DEV_ROLE ? byFilter : byFilter.filter(a => {
    if (!search) return true;
    const q = normalize(search);
    return normalize(a.full_name || "").includes(q)
      || (a.document_number || "").includes(q)
      || normalize(a.program || "").includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Aprendices
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.2, fontFamily: "var(--font-display)", margin: 0 }}>
              Mis aprendices
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#f0fce4", borderRadius: "8px", border: "1px solid #bbf7d0", flexShrink: 0 }}>
              <Users size={14} color="#39a900" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#166534" }}>
                {activeFilter !== "todos" || search
                  ? `${filtered.length} de ${aprendices.length}`
                  : aprendices.length} registrados
              </span>
            </div>
          </div>

          {/* Búsqueda */}
          <div style={{ marginTop: "1.25rem", position: "relative" }}>
            <Search size={15} color="#9ca3af" style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o programa..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ width: "100%", boxSizing: "border-box", paddingLeft: "2.5rem", paddingRight: "1rem", paddingTop: "0.65rem", paddingBottom: "0.65rem", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "0.9375rem", color: "#111827", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "var(--font-sans)" }}
              onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.15)"; }}
              onBlur={e =>  { e.target.style.borderColor = "#e5e7eb";  e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Filtros */}
          <div style={{ marginTop: "0.875rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setActiveFilter(f.key); setPage(0); }}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: 20,
                  border: activeFilter === f.key ? "1.5px solid #39a900" : "1.5px solid #e5e7eb",
                  background: activeFilter === f.key ? "#39a900" : "white",
                  color: activeFilter === f.key ? "white" : "#6b7280",
                  fontSize: "0.8125rem",
                  fontWeight: activeFilter === f.key ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: 32, height: 32, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <Users size={48} color="#e5e7eb" style={{ margin: "0 auto 1rem", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>
              No se encontraron aprendices
            </div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.375rem" }}>
              Intenta con otro término de búsqueda o filtro
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {paginated.map(a => (
                <AprendizCard
                  key={a.id}
                  aprendiz={a}
                  canDelete={canDelete}
                  onDelete={handleDelete}
                  onClick={() => navigate(`/aprendiz/${a.id}/historial${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "1.5rem", paddingBottom: "0.5rem" }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontWeight: 600, color: page === 0 ? "#d1d5db" : "#374151", cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" }}
                >
                  <ChevronLeft size={15} /> Anterior
                </button>
                <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>
                  Página {page + 1} de {totalPages} · {filtered.length} aprendices
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontWeight: 600, color: page >= totalPages - 1 ? "#d1d5db" : "#374151", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" }}
                >
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AprendizCard({ aprendiz, onClick, canDelete, onDelete }) {
  const [hovered, setHovered]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const initial   = aprendiz.full_name?.charAt(0).toUpperCase() || "?";
  const avatarColor = AVATAR_COLORS[aprendiz.full_name?.charCodeAt(0) % AVATAR_COLORS.length] || "#9ca3af";
  const progColor = PROGRAM_COLORS[aprendiz.program] || DEFAULT_PROGRAM_COLOR;
  const atRisk    = isAtRisk(aprendiz);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        borderRadius: 14,
        border: `1px solid ${hovered ? "#d1d5db" : "#e5e7eb"}`,
        padding: "1.25rem",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s, transform 0.12s",
        boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      {/* Top row: avatar + info + risk */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: `${avatarColor}18`,
          border: `1.5px solid ${avatarColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.25rem", fontWeight: 800, color: avatarColor,
          fontFamily: "var(--font-display)",
        }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {aprendiz.full_name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.125rem" }}>
            CC · {aprendiz.document_number || "—"}
          </div>
        </div>
        {atRisk && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 20, padding: "0.2rem 0.5rem", flexShrink: 0 }}>
            <AlertCircle size={11} color="#d97706" />
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#92400e" }}>Sin actividad</span>
          </div>
        )}
      </div>

      {/* Programa badge */}
      {aprendiz.program && (
        <div style={{ display: "inline-flex" }}>
          <span style={{
            fontSize: "0.75rem", fontWeight: 600,
            background: progColor.bg, color: progColor.color,
            padding: "0.25rem 0.625rem", borderRadius: 20,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
          }}>
            {aprendiz.program}
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.8125rem" }}>
          <Calendar size={13} color="#9ca3af" />
          <span><strong style={{ color: "#111827" }}>{aprendiz.total}</strong> {aprendiz.total === 1 ? "cita" : "citas"}</span>
        </div>
        {aprendiz.last_date && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.75rem" }}>
            <Clock size={12} />
            <span>Última: {format(parseISO(aprendiz.last_date), "d MMM", { locale: es })}</span>
          </div>
        )}
      </div>

      {/* Footer button */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "0.75rem",
          borderTop: "1px solid #f3f4f6",
        }}
      >
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>Ver historial</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          {canDelete && !confirming && (
            <button
              onClick={e => { e.stopPropagation(); setConfirming(true); }}
              title="Eliminar aprendiz"
              aria-label="Eliminar aprendiz"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", borderRadius: 6, padding: "0.25rem", transition: "color 0.15s" }}
              onMouseOver={e => e.currentTarget.style.color = "#dc2626"}
              onMouseOut={e => e.currentTarget.style.color = "#d1d5db"}
            >
              <Trash2 size={14} />
            </button>
          )}
          {canDelete && confirming && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.2rem 0.5rem" }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: "0.6875rem", color: "#dc2626", fontWeight: 600 }}>¿Eliminar?</span>
              <button
                disabled={deleting}
                onClick={async e => { e.stopPropagation(); setDeleting(true); await onDelete(aprendiz.id); setDeleting(false); setConfirming(false); }}
                style={{ background: "#dc2626", border: "none", borderRadius: 5, padding: "0.15rem 0.3rem", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <Check size={11} color="white" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirming(false); }}
                style={{ background: "#e5e7eb", border: "none", borderRadius: 5, padding: "0.15rem 0.3rem", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={11} color="#374151" />
              </button>
            </div>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: hovered ? "#f0fce4" : "#f9fafb",
            border: `1px solid ${hovered ? "#bbf7d0" : "#e5e7eb"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            <ChevronRight size={14} color={hovered ? "#39a900" : "#9ca3af"} />
          </div>
        </div>
      </div>
    </div>
  );
}
