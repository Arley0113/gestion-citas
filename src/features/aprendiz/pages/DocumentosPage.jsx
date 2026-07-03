import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, FileText, Image, Download, Trash2, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("certif")) return "Certificado médico";
  if (n.includes("incapac")) return "Incapacidad";
  if (n.includes("carnet") || n.includes("foto")) return "Identificación";
  return "Documento";
}

function isPdfFile(mimeType, name) {
  return mimeType === "application/pdf" || name?.toLowerCase().endsWith(".pdf");
}

export default function DocumentosPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setDocs(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleFile = async (file) => {
    if (!file || !user) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error("El archivo supera los 5 MB"); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { toast.error("Formato no permitido. Usa PDF, JPG o PNG"); return; }

    setUploading(true);
    try {
      const fileName = `${crypto.randomUUID()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(filePath, file);

      if (uploadError) { toast.error("Error al subir el archivo"); return; }

      const { error: dbError } = await supabase.from("user_documents").insert({
        user_id:   user.id,
        name:      file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        category:  detectCategory(file.name),
      });

      if (dbError) {
        await supabase.storage.from("user-documents").remove([filePath]);
        toast.error("Error al registrar el documento");
        return;
      }

      toast.success("Documento subido correctamente");
      await fetchDocs();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (doc) => {
    const { error: storageError } = await supabase.storage
      .from("user-documents")
      .remove([doc.file_path]);
    if (storageError) { toast.error("Error al eliminar el archivo"); return; }
    const { error: dbError } = await supabase.from("user_documents").delete().eq("id", doc.id);
    if (dbError) { toast.error("Error al eliminar el registro"); return; }
    toast.success("Documento eliminado");
    setDocs(d => d.filter(x => x.id !== doc.id));
  };

  const handleDownload = async (doc) => {
    const { data, error } = await supabase.storage
      .from("user-documents")
      .createSignedUrl(doc.file_path, 300);
    if (error || !data?.signedUrl) { toast.error("No se pudo generar el enlace"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Documentos
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Mis documentos
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Certificados médicos, incapacidades y documentos de apoyo
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#39a900" : "#d1fae5"}`,
            borderRadius: 14,
            padding: "2.5rem",
            textAlign: "center",
            background: dragOver ? "#f0fce4" : "white",
            marginBottom: "1.5rem",
            transition: "all 0.15s",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            {uploading
              ? <Loader2 size={24} color="#39a900" style={{ animation: "spin 0.8s linear infinite" }} />
              : <Upload size={24} color="#39a900" />
            }
          </div>
          <p style={{ fontSize: "0.9375rem", color: "#374151", margin: "0 0 0.5rem", fontWeight: 500 }}>
            {uploading ? "Subiendo archivo…" : (
              <>Arrastra archivos aquí o{" "}
                <span style={{ color: "#39a900", fontWeight: 700, textDecoration: "underline" }}>selecciona un archivo</span>
              </>
            )}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af", margin: 0 }}>
            PDF, JPG, PNG · Máx. 5 MB
          </p>
        </div>

        {/* Document grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <FolderOpen size={48} color="#e5e7eb" style={{ margin: "0 auto 1rem", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>Aún no has subido documentos</div>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "0.375rem" }}>
              Usa el área de arriba para subir tu primer documento
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.875rem" }}>
              {docs.length} documento{docs.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} onDelete={handleDelete} onDownload={handleDownload} />
              ))}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DocCard({ doc, onDelete, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPdf = isPdfFile(doc.mime_type, doc.name);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(doc);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "1.25rem",
        transition: "box-shadow 0.15s, transform 0.12s",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "0.875rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isPdf ? "#fee2e2" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isPdf ? <FileText size={18} color="#ef4444" /> : <Image size={18} color="#3b82f6" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>
            {formatSize(doc.file_size)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", background: "#f0fce4", padding: "0.2rem 0.5rem", borderRadius: 20 }}>
            {doc.category}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            Subido: {doc.created_at ? format(parseISO(doc.created_at), "d MMM yyyy", { locale: es }) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>¿Eliminar?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: "0.25rem 0.625rem", borderRadius: 7, background: "#ef4444", border: "none", color: "white", fontSize: "0.75rem", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}
              >{deleting ? "…" : "Sí"}</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: "0.25rem 0.625rem", borderRadius: 7, background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
              >No</button>
            </>
          ) : (
            <>
              <button
                onClick={() => onDownload(doc)}
                title="Descargar"
                style={{ width: 32, height: 32, borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Download size={14} color="#6b7280" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                title="Eliminar"
                style={{ width: 32, height: 32, borderRadius: 8, background: "#fff1f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Trash2 size={14} color="#ef4444" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
