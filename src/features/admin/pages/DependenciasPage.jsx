import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, ToggleLeft, ToggleRight, Edit2, Check, X, Users } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { DEV_ROLE } from "../../../lib/devMode";

const ICON_MAP = { "🧠": "🧠", "🩺": "🩺", "🤝": "🤝", "📋": "📋", "❤️": "❤️" };

const MOCK_DEPS = [
  { id: 1, name: "Psicología", icon: "🧠", active: true, staffCount: 3 },
  { id: 2, name: "Enfermería", icon: "🩺", active: true, staffCount: 2 },
  { id: 3, name: "Trabajo Social", icon: "🤝", active: true, staffCount: 1 },
];

export default function DependenciasPage() {
  const navigate = useNavigate();
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    if (DEV_ROLE) { setDeps(MOCK_DEPS); setLoading(false); return; }
    const { data, error } = await supabase
      .from("dependencies")
      .select("*")
      .order("id");
    if (error) {
      toast.error("No se pudieron cargar las dependencias");
      setLoading(false);
      return;
    }
    // count staff per dep
    const withCount = await Promise.all((data || []).map(async (d) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("dependency_id", d.id);
      return { ...d, staffCount: count || 0 };
    }));
    setDeps(withCount);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (dep) => {
    setSaving(dep.id);
    if (DEV_ROLE) {
      setDeps(prev => prev.map(d => d.id === dep.id ? { ...d, active: !d.active } : d));
      toast.success(`Dependencia ${!dep.active ? "activada" : "desactivada"} (demo)`);
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from("dependencies")
      .update({ active: !dep.active, updated_at: new Date().toISOString() })
      .eq("id", dep.id);
    if (error) { toast.error("Error al actualizar"); }
    else { toast.success(`Dependencia ${!dep.active ? "activada" : "desactivada"}`); await load(); }
    setSaving(null);
  };

  const saveEdit = async (dep) => {
    if (!editName.trim()) return;
    setSaving(dep.id);
    if (DEV_ROLE) {
      setDeps(prev => prev.map(d => d.id === dep.id ? { ...d, name: editName.trim() } : d));
      toast.success("Nombre actualizado (demo)");
      setEditId(null);
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from("dependencies")
      .update({ name: editName.trim(), updated_at: new Date().toISOString() })
      .eq("id", dep.id);
    if (error) { toast.error("Error al guardar"); }
    else { toast.success("Nombre actualizado"); setEditId(null); await load(); }
    setSaving(null);
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "linear-gradient(to bottom, #f0fce4, #f5f7fa)", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 2rem 1.5rem" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "1rem", padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={20} color="#8b5cf6" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Dependencias</h1>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>Áreas de bienestar del SENA</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem 2rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Cargando...</div>
        ) : deps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.875rem" }}>Sin dependencias</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {deps.map((dep) => (
              <div key={dep.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", opacity: dep.active ? 1 : 0.6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: dep.active ? "#f0fce4" : "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
                  {dep.icon || "🏥"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === dep.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(dep); if (e.key === "Escape") setEditId(null); }}
                        autoFocus
                        style={{ flex: 1, padding: "0.375rem 0.625rem", border: "1.5px solid #39a900", borderRadius: 6, fontSize: "0.9375rem", fontWeight: 700, fontFamily: "var(--font-sans)", outline: "none" }}
                      />
                      <button onClick={() => saveEdit(dep)} disabled={saving === dep.id} style={{ padding: "0.375rem", background: "#f0fce4", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}><Check size={15} color="#39a900" /></button>
                      <button onClick={() => setEditId(null)} style={{ padding: "0.375rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={15} color="#6b7280" /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>{dep.name}</span>
                      {!dep.active && <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9ca3af", background: "#f3f4f6", padding: "0.1rem 0.5rem", borderRadius: 20 }}>Inactiva</span>}
                      <button onClick={() => { setEditId(dep.id); setEditName(dep.name); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem", color: "#d1d5db", display: "flex", alignItems: "center" }}>
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Users size={11} /> {dep.staffCount} profesional{dep.staffCount !== 1 ? "es" : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(dep)}
                  disabled={saving === dep.id}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", fontWeight: 600, color: dep.active ? "#39a900" : "#9ca3af", padding: "0.5rem 0.75rem", borderRadius: 8, transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  {dep.active
                    ? <><ToggleRight size={22} color="#39a900" /> Activa</>
                    : <><ToggleLeft size={22} color="#9ca3af" /> Inactiva</>
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
