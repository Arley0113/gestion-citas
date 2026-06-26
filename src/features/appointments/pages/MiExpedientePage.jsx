import { useState, useEffect } from "react";
import { ShieldCheck, FileText, CalendarDays, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const MOCK_NOTAS = [
  {
    id:"1", created_at:"2026-06-15T10:30:00Z",
    professional_name:"Carolina Ruiz", dependency:"Psicología",
    color:"#8b5cf6", bg:"#f5f3ff",
    content:"El/la aprendiz muestra señales de estrés académico relacionadas con la carga del semestre. Se recomienda establecer rutinas de autocuidado y técnicas de respiración. Se programa seguimiento en 2 semanas.",
  },
  {
    id:"2", created_at:"2026-05-20T09:00:00Z",
    professional_name:"Dr. Carlos Gómez", dependency:"Enfermería",
    color:"#0ea5e9", bg:"#e0f2fe",
    content:"Control médico general. Signos vitales dentro de parámetros normales. Tensión arterial 120/80. Peso adecuado para la talla. Se recomienda mayor ingesta de agua y actividad física mínima 30 min diarios.",
  },
  {
    id:"3", created_at:"2026-04-10T14:00:00Z",
    professional_name:"María Torres", dependency:"Trabajo Social",
    color:"#f59e0b", bg:"#fef3c7",
    content:"Se realizó orientación vocacional. El/la estudiante presenta interés en continuar estudios superiores. Se le brindó información sobre programas de apoyo financiero disponibles en el SENA. Seguimiento en próximo semestre.",
  },
];

function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

export default function MiExpedientePage() {
  const { user } = useAuth();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEV) { setNotas(MOCK_NOTAS); setLoading(false); return; }
    if (!user) return;
    supabase
      .from("appointment_notes")
      .select("*, profiles(full_name), dependencies(name)")
      .eq("aprendiz_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setNotas(data || []); setLoading(false); });
  }, [user]);

  return (
    <div style={{ background:"#f5f7fa", minHeight:"100vh", fontFamily:"var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #e5e7eb" }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"1.75rem 2rem" }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"#39a900", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.25rem" }}>
            Mi expediente
          </div>
          <h1 style={{ fontSize:"1.625rem", fontWeight:800, color:"#111827", letterSpacing:"-0.025em", margin:"0 0 0.25rem", fontFamily:"var(--font-display)" }}>
            Mi expediente clínico
          </h1>
          <p style={{ fontSize:"0.875rem", color:"#6b7280", margin:0 }}>
            Solo tú y el equipo de Bienestar SENA pueden ver esta información.
          </p>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"1.5rem 2rem" }}>

        {/* Banner confidencialidad */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #bbf7d0", borderRadius:12, padding:"0.875rem 1.125rem", marginBottom:"1.25rem" }}>
          <ShieldCheck size={18} color="#16a34a" style={{ flexShrink:0 }} />
          <p style={{ fontSize:"0.8125rem", color:"#166534", margin:0, lineHeight:1.55 }}>
            <strong>Tu información es confidencial.</strong> Solo el personal autorizado de Bienestar SENA tiene acceso a tu expediente.
          </p>
        </div>

        {/* Contenido */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}>
            <div style={{ width:28, height:28, border:"2.5px solid #e5e7eb", borderTopColor:"#39a900", borderRadius:"50%", animation:"spin 0.6s linear infinite" }} />
          </div>
        ) : notas.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" }}>
              <FileText size={28} color="#d1d5db" />
            </div>
            <div style={{ fontWeight:600, fontSize:"1rem", color:"#374151" }}>Aún no hay notas en tu expediente</div>
            <p style={{ fontSize:"0.875rem", color:"#9ca3af", maxWidth:280, margin:"0.375rem auto 0" }}>
              Aquí aparecerán las observaciones de tu equipo de Bienestar tras cada atención.
            </p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.25rem" }}>
              {notas.length} {notas.length === 1 ? "registro" : "registros"}
            </div>

            {notas.map(nota => (
              <div
                key={nota.id}
                style={{ background:"white", borderRadius:14, border:"1px solid #e5e7eb", padding:"1.375rem 1.5rem", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}
              >
                {/* Header nota */}
                <div style={{ display:"flex", alignItems:"center", gap:"0.875rem", marginBottom:"0.875rem" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:nota.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:"1rem", fontWeight:800, color:nota.color }}>
                      {getInitial(nota.professional_name)}
                    </span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:"0.9375rem", color:"#111827" }}>
                      {nota.professional_name}
                    </div>
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af", marginTop:"0.125rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span style={{ color:nota.color, fontWeight:600 }}>{nota.dependency}</span>
                      <span>·</span>
                      <span style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}>
                        <CalendarDays size={11} />
                        {format(parseISO(nota.created_at), "d 'de' MMMM 'de' yyyy", { locale:es })}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize:"0.6875rem", fontWeight:700, color:nota.color, background:nota.bg, padding:"0.2rem 0.625rem", borderRadius:20, flexShrink:0 }}>
                    {nota.dependency}
                  </span>
                </div>

                {/* Divisor */}
                <div style={{ height:1, background:"#f3f4f6", marginBottom:"0.875rem" }} />

                {/* Contenido */}
                <p style={{ fontSize:"0.9375rem", color:"#374151", lineHeight:1.7, margin:0 }}>
                  {nota.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Nota de privacidad */}
        {notas.length > 0 && (
          <div style={{ marginTop:"1.5rem", display:"flex", gap:"0.75rem", background:"#f9fafb", border:"1px solid #f3f4f6", borderRadius:12, padding:"0.875rem 1.125rem" }}>
            <Info size={15} color="#9ca3af" style={{ flexShrink:0, marginTop:"0.125rem" }} />
            <p style={{ fontSize:"0.8125rem", color:"#6b7280", margin:0, lineHeight:1.6 }}>
              Tienes derecho a conocer tu historial clínico. Para solicitar correcciones o aclaraciones, contacta al coordinador de Bienestar SENA.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
