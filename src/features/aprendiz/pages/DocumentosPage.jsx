import { useState, useRef } from "react";
import { Upload, FileText, Image, Download, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const MOCK_DOCS = [
  { id: "1", name: "Certificado médico - Jun 2026.pdf", type: "pdf",   size: "245 KB", date: "2026-06-10", category: "Certificado médico" },
  { id: "2", name: "Incapacidad - May 2026.pdf",        type: "pdf",   size: "189 KB", date: "2026-05-15", category: "Incapacidad" },
  { id: "3", name: "Foto carnet SENA.jpg",              type: "image", size: "1.2 MB", date: "2026-03-01", category: "Identificación" },
];

export default function DocumentosPage() {
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    toast.info("Función disponible en producción");
  };

  const handleDelete = (id) => {
    toast.success("Documento eliminado");
    setDocs(d => d.filter(doc => doc.id !== id));
  };

  const handleDownload = () => {
    toast.info("Descarga disponible en producción");
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
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
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(); }}
          style={{
            border: `2px dashed ${dragOver ? "#39a900" : "#d1fae5"}`,
            borderRadius: 14,
            padding: "2.5rem",
            textAlign: "center",
            background: dragOver ? "#f0fce4" : "white",
            marginBottom: "1.5rem",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Upload size={24} color="#39a900" />
          </div>
          <p style={{ fontSize: "0.9375rem", color: "#374151", margin: "0 0 0.5rem", fontWeight: 500 }}>
            Arrastra archivos aquí o{" "}
            <span style={{ color: "#39a900", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>
              selecciona un archivo
            </span>
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af", margin: 0 }}>
            PDF, JPG, PNG · Máx. 5 MB
          </p>
        </div>

        {/* Document grid */}
        {docs.length === 0 ? (
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
    </div>
  );
}

function DocCard({ doc, onDelete, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const isPdf = doc.type === "pdf";

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
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: isPdf ? "#fee2e2" : "#dbeafe",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isPdf
            ? <FileText size={18} color="#ef4444" />
            : <Image size={18} color="#3b82f6" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>
            {doc.size}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", background: "#f0fce4", padding: "0.2rem 0.5rem", borderRadius: 20 }}>
            {doc.category}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            Subido: {format(parseISO(doc.date), "d MMM yyyy", { locale: es })}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          <button
            onClick={onDownload}
            style={{ width: 32, height: 32, borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Download size={14} color="#6b7280" />
          </button>
          <button
            onClick={() => onDelete(doc.id)}
            style={{ width: 32, height: 32, borderRadius: 8, background: "#fff1f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Trash2 size={14} color="#ef4444" />
          </button>
        </div>
      </div>
    </div>
  );
}
