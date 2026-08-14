import { useState, useEffect } from "react";
import { Search, FileText, ChevronRight, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const AVATAR_COLORS = ["#39a900","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#14b8a6"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const MOCK_NOTES = [
  { id:"n1", notes:"Sesión de seguimiento por ansiedad académica. La paciente muestra mejoría significativa en las técnicas de respiración aprendidas en sesiones anteriores. Continúa con ejercicios de mindfulness diarios.", updated_at:"2026-06-20T10:30:00Z", aprendiz:{ full_name:"Laura Gómez", program:"Desarrollo de Software" } },
  { id:"n2", notes:"Primera consulta. Motivo: dificultades de concentración y estrés por acumulación de proyectos. Se aplican técnicas cognitivo-conductuales básicas. Se programa seguimiento en 15 días.", updated_at:"2026-06-15T09:00:00Z", aprendiz:{ full_name:"Carlos Ruiz", program:"Contabilidad" } },
  { id:"n3", notes:"Consulta de cierre de ciclo semestral. La aprendiz finalizó satisfactoriamente el proceso de acompañamiento. Se sugiere continuidad en el próximo semestre según necesidad personal.", updated_at:"2026-05-30T14:00:00Z", aprendiz:{ full_name:"Ana Martínez", program:"Diseño Gráfico" } },
  { id:"n4", notes:"Consulta por orientación académica y vocacional. Manifiesta dudas sobre su programa de formación. Se orienta sobre opciones de cambio de programa y complementación académica disponibles.", updated_at:"2026-05-15T08:00:00Z", aprendiz:{ full_name:"Pedro Torres", program:"Electrónica" } },
];

export default function ProfessionalNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (IS_DEV) { setNotes(MOCK_NOTES); setLoading(false); return; }
    if (!user) { setLoading(false); return; }

    supabase
      .from("appointments")
      .select("id, notes, updated_at, reason, aprendiz:profiles!user_id(full_name, program)")
      .eq("professional_id", user.id)
      .not("notes", "is", null)
      .neq("notes", "")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error("Error al cargar las notas"); setLoading(false); return; }
        setNotes(data || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = notes.filter(n =>
    (n.aprendiz?.full_name || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Notas clínicas</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>Mis notas</h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>Historial de observaciones registradas</p>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "0.25rem 0.75rem", borderRadius: 20 }}>
              {notes.length} {notes.length === 1 ? "nota registrada" : "notas registradas"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "1.25rem" }}>
          <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre de aprendiz..."
            style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 0.875rem 0.7rem 2.5rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9375rem", color: "#111827", background: "white", outline: "none", fontFamily: "var(--font-sans)", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.15)"; }}
            onBlur={e =>  { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <FileText size={44} color="#e5e7eb" style={{ margin: "0 auto 1rem", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>No has registrado notas clínicas aún</div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.375rem" }}>Las notas aparecen al completar una atención</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <FileText size={44} color="#e5e7eb" style={{ margin: "0 auto 1rem", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>No se encontraron notas</div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.375rem" }}>Intenta con otro nombre de aprendiz</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {filtered.map(note => {
              const isExp  = expanded === note.id;
              const nombre = note.aprendiz?.full_name || "Aprendiz";
              const color  = avatarColor(nombre);
              return (
                <div
                  key={note.id}
                  style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s, border-color 0.15s, transform 0.12s", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#bbf7d0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "translateY(0)"; }}
                  onClick={() => setExpanded(isExp ? null : note.id)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "white", fontWeight: 800, fontSize: "1rem" }}>{nombre.charAt(0)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>{nombre}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {note.aprendiz?.program && (
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8b5cf6", background: "#f5f3ff", padding: "0.2rem 0.6rem", borderRadius: 20 }}>{note.aprendiz.program}</span>
                          )}
                          <ChevronRight size={15} color="#d1d5db" style={{ transform: isExp ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem" }}>
                        <CalendarDays size={12} color="#9ca3af" />
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          {format(parseISO(note.updated_at), "d 'de' MMMM yyyy · h:mm a", { locale: es })}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563", margin: "0.625rem 0 0", lineHeight: 1.6, overflow: isExp ? "visible" : "hidden", display: isExp ? "block" : "-webkit-box", WebkitLineClamp: isExp ? undefined : 2, WebkitBoxOrient: isExp ? undefined : "vertical" }}>
                        {note.notes}
                      </p>
                      {!isExp && (
                        <button
                          onClick={ev => { ev.stopPropagation(); setExpanded(note.id); }}
                          style={{ marginTop: "0.5rem", background: "none", border: "none", color: "#39a900", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          Ver completa <ChevronRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
