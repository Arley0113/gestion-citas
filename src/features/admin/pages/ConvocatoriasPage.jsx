import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, ArrowLeft, ToggleLeft, ToggleRight, Edit2, Trash2, Check, X, Plus, Link as LinkIcon } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { DEV_ROLE } from "../../../lib/devMode";

const MOCK_CONVOCATORIAS = [
  { id: "1", titulo: "Convocatoria de apoyo de sostenimiento", descripcion: "Abierta la convocatoria trimestral de apoyo de sostenimiento para aprendices en formación titulada.", link_externo: "https://www.sena.edu.co", activa: true, created_at: "2026-08-01T00:00:00Z" },
  { id: "2", titulo: "Jornada de salud mental", descripcion: "Actividades de bienestar psicológico durante toda la semana.", link_externo: "", activa: false, created_at: "2026-07-15T00:00:00Z" },
];

const EMPTY_FORM = { titulo: "", descripcion: "", link_externo: "" };

export default function ConvocatoriasPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    if (DEV_ROLE) { setItems(MOCK_CONVOCATORIAS); setLoading(false); return; }
    const { data, error } = await supabase
      .from("convocatorias")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No se pudieron cargar las convocatorias");
      setLoading(false);
      return;
    }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (item) => {
    setSaving(item.id);
    if (DEV_ROLE) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activa: !i.activa } : i));
      toast.success(`Convocatoria ${!item.activa ? "activada" : "desactivada"} (demo)`);
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from("convocatorias")
      .update({ activa: !item.activa })
      .eq("id", item.id);
    if (error) { toast.error("Error al actualizar"); }
    else { toast.success(`Convocatoria ${!item.activa ? "activada" : "desactivada"}`); await load(); }
    setSaving(null);
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({ titulo: item.titulo, descripcion: item.descripcion || "", link_externo: item.link_externo || "" });
  };

  const saveEdit = async (item) => {
    if (!editForm.titulo.trim()) { toast.error("El título es obligatorio"); return; }
    setSaving(item.id);
    if (DEV_ROLE) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...editForm } : i));
      toast.success("Convocatoria actualizada (demo)");
      setEditId(null);
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from("convocatorias")
      .update({
        titulo: editForm.titulo.trim(),
        descripcion: editForm.descripcion.trim() || null,
        link_externo: editForm.link_externo.trim() || null,
      })
      .eq("id", item.id);
    if (error) { toast.error("Error al guardar"); }
    else { toast.success("Convocatoria actualizada"); setEditId(null); await load(); }
    setSaving(null);
  };

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar la convocatoria "${item.titulo}"? Esta acción no se puede deshacer.`)) return;
    setSaving(item.id);
    if (DEV_ROLE) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Convocatoria eliminada (demo)");
      setSaving(null);
      return;
    }
    const { error } = await supabase.from("convocatorias").delete().eq("id", item.id);
    if (error) { toast.error("Error al eliminar"); }
    else { toast.success("Convocatoria eliminada"); await load(); }
    setSaving(null);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.titulo.trim()) { toast.error("El título es obligatorio"); return; }
    setSaving("new");
    if (DEV_ROLE) {
      setItems(prev => [{ id: String(Date.now()), ...createForm, activa: true, created_at: new Date().toISOString() }, ...prev]);
      toast.success("Convocatoria creada (demo)");
      setCreateForm(EMPTY_FORM);
      setCreating(false);
      setSaving(null);
      return;
    }
    const { error } = await supabase.from("convocatorias").insert({
      titulo: createForm.titulo.trim(),
      descripcion: createForm.descripcion.trim() || null,
      link_externo: createForm.link_externo.trim() || null,
    });
    if (error) { toast.error("Error al crear la convocatoria"); }
    else { toast.success("Convocatoria publicada"); setCreateForm(EMPTY_FORM); setCreating(false); await load(); }
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={20} color="#d97706" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Convocatorias</h1>
                <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>Anuncios visibles para todos los aprendices en su Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setCreating(c => !c)}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.625rem 1rem", background: "#39a900", color: "white", border: "none", borderRadius: 9, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              <Plus size={15} /> Nueva convocatoria
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem 2rem" }}>
        {creating && (
          <form onSubmit={submitCreate} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>Título *</label>
                <input
                  value={createForm.titulo}
                  onChange={e => setCreateForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Convocatoria de apoyo de sostenimiento"
                  autoFocus
                  style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>Descripción</label>
                <textarea
                  value={createForm.descripcion}
                  onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={3}
                  placeholder="Detalles de la convocatoria..."
                  style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none", resize: "vertical" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>Link externo (opcional)</label>
                <input
                  value={createForm.link_externo}
                  onChange={e => setCreateForm(f => ({ ...f, link_externo: e.target.value }))}
                  placeholder="https://..."
                  style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
                <button type="submit" disabled={saving === "new"} style={{ padding: "0.5rem 1rem", background: "#39a900", color: "white", border: "none", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}>
                  Publicar
                </button>
                <button type="button" onClick={() => { setCreating(false); setCreateForm(EMPTY_FORM); }} style={{ padding: "0.5rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", color: "#6b7280" }}>
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", fontSize: "0.875rem" }}>Sin convocatorias publicadas</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item) => (
              <div key={item.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", opacity: item.activa ? 1 : 0.6 }}>
                {editId === item.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    <input
                      value={editForm.titulo}
                      onChange={e => setEditForm(f => ({ ...f, titulo: e.target.value }))}
                      autoFocus
                      style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #39a900", borderRadius: 8, fontSize: "0.9375rem", fontWeight: 700, fontFamily: "var(--font-sans)", outline: "none" }}
                    />
                    <textarea
                      value={editForm.descripcion}
                      onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                      rows={2}
                      style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.8125rem", fontFamily: "var(--font-sans)", outline: "none", resize: "vertical" }}
                    />
                    <input
                      value={editForm.link_externo}
                      onChange={e => setEditForm(f => ({ ...f, link_externo: e.target.value }))}
                      placeholder="Link externo (opcional)"
                      style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.8125rem", fontFamily: "var(--font-sans)", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => saveEdit(item)} disabled={saving === item.id} style={{ padding: "0.375rem 0.75rem", background: "#f0fce4", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "#166534" }}><Check size={14} /> Guardar</button>
                      <button onClick={() => setEditId(null)} style={{ padding: "0.375rem 0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}><X size={14} /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>{item.titulo}</span>
                        {!item.activa && <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "0.1rem 0.5rem", borderRadius: 20 }}>Inactiva</span>}
                      </div>
                      {item.descripcion && <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.375rem", lineHeight: 1.5 }}>{item.descripcion}</p>}
                      {item.link_externo && (
                        <a href={item.link_externo} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#39a900", marginTop: "0.5rem", fontWeight: 600, textDecoration: "none" }}>
                          <LinkIcon size={12} /> {item.link_externo}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                      <button onClick={() => startEdit(item)} disabled={saving === item.id} aria-label="Editar" style={{ padding: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}><Edit2 size={15} /></button>
                      <button onClick={() => toggleActive(item)} disabled={saving === item.id} aria-label="Activar o desactivar" style={{ padding: "0.375rem", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                        {item.activa ? <ToggleRight size={20} color="#39a900" /> : <ToggleLeft size={20} color="#9ca3af" />}
                      </button>
                      <button onClick={() => remove(item)} disabled={saving === item.id} aria-label="Eliminar" style={{ padding: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
