import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, CheckCircle2, X, UserX, Check, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const MOCK_CITAS = [
  { id:"1", status:"confirmed",  scheduled_date:"2026-06-30", scheduled_time:"09:00:00", dependencies:{name:"Psicología"},    professional_name:"Carolina Ruiz",  reason:"Ansiedad académica" },
  { id:"2", status:"pending",    scheduled_date:"2026-07-05", scheduled_time:"10:00:00", dependencies:{name:"Enfermería"},     professional_name:"Dr. Gómez",      reason:"Control médico" },
  { id:"3", status:"completed",  scheduled_date:"2026-06-15", scheduled_time:"08:00:00", dependencies:{name:"Trabajo Social"}, professional_name:"María Torres",   reason:"Orientación vocacional" },
  { id:"4", status:"completed",  scheduled_date:"2026-05-20", scheduled_time:"14:00:00", dependencies:{name:"Psicología"},    professional_name:"Carolina Ruiz",  reason:"Seguimiento" },
  { id:"5", status:"cancelled",  scheduled_date:"2026-05-10", scheduled_time:"11:00:00", dependencies:{name:"Enfermería"},     professional_name:"Dr. Gómez",      reason:"" },
  { id:"6", status:"no_show",    scheduled_date:"2026-04-22", scheduled_time:"09:00:00", dependencies:{name:"Psicología"},    professional_name:"Carolina Ruiz",  reason:"Estrés" },
];

const STATUS_CFG = {
  pending:   { label:"Pendiente",    color:"#d97706", bg:"#fef3c7", borderColor:"#f59e0b", icon:Clock },
  confirmed: { label:"Confirmada",   color:"#2563eb", bg:"#dbeafe", borderColor:"#3b82f6", icon:Check },
  completed: { label:"Completada",   color:"#16a34a", bg:"#dcfce7", borderColor:"#39a900", icon:CheckCircle2 },
  cancelled: { label:"Cancelada",    color:"#6b7280", bg:"#f3f4f6", borderColor:"#9ca3af", icon:X },
  no_show:   { label:"No asistió",   color:"#dc2626", bg:"#fee2e2", borderColor:"#ef4444", icon:UserX },
};

const TABS = [
  { key:"proximas",   label:"Próximas" },
  { key:"pasadas",    label:"Pasadas" },
  { key:"canceladas", label:"Canceladas" },
];

function timeLabel(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "a.m." : "p.m.";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,"0")} ${suffix}`;
}

export default function MisCitasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("proximas");
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEV) { setCitas(MOCK_CITAS); setLoading(false); return; }
    if (!user) { setLoading(false); return; }
    supabase
      .from("appointments")
      .select("*, dependencies(name, color), professional:profiles!professional_id(full_name)")
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error("Error cargando citas"); setLoading(false); return; }
        setCitas(data || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = citas.filter(c => {
    if (activeTab === "proximas")   return ["pending","confirmed"].includes(c.status);
    if (activeTab === "pasadas")    return ["completed","no_show"].includes(c.status);
    if (activeTab === "canceladas") return c.status === "cancelled";
    return false;
  });

  const EMPTY_MSG = {
    proximas:   { title:"No tienes citas próximas", sub:"Agenda una cita desde el botón de inicio." },
    pasadas:    { title:"Sin citas pasadas",         sub:"Tu historial de atenciones aparecerá aquí." },
    canceladas: { title:"Sin citas canceladas",      sub:"No has cancelado ninguna cita hasta ahora." },
  };

  return (
    <div style={{ background:"#f5f7fa", minHeight:"100vh", fontFamily:"var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #e5e7eb" }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"1.75rem 2rem" }}>
          <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"#39a900", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.25rem" }}>
            Mis citas
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <h1 style={{ fontSize:"1.625rem", fontWeight:800, color:"#111827", letterSpacing:"-0.025em", margin:0, fontFamily:"var(--font-display)" }}>
              Historial de citas
            </h1>
            <div style={{ display:"flex", alignItems:"center", gap:"0.375rem", padding:"0.25rem 0.75rem", background:"#f0fce4", borderRadius:20, border:"1px solid #bbf7d0" }}>
              <CalendarDays size={12} color="#16a34a" />
              <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#166534" }}>{citas.length} total</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"1.5rem 2rem" }}>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem", background:"white", border:"1px solid #e5e7eb", borderRadius:12, padding:"0.375rem" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex:1, padding:"0.5rem 0", border:"none", borderRadius:9, cursor:"pointer",
                fontSize:"0.875rem", fontWeight:600, fontFamily:"var(--font-sans)",
                background: activeTab === tab.key ? "#39a900" : "transparent",
                color:      activeTab === tab.key ? "white"   : "#6b7280",
                transition:"all 0.15s",
              }}
            >
              {tab.label}
              {activeTab === tab.key && filtered.length > 0 && (
                <span style={{ marginLeft:"0.375rem", fontSize:"0.6875rem", background:"rgba(255,255,255,0.25)", padding:"0.0625rem 0.375rem", borderRadius:10 }}>
                  {filtered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}>
            <div style={{ width:28, height:28, border:"2.5px solid #e5e7eb", borderTopColor:"#39a900", borderRadius:"50%", animation:"spin 0.6s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
            <CalendarDays size={40} color="#e5e7eb" style={{ margin:"0 auto 0.875rem" }} />
            <div style={{ fontWeight:600, fontSize:"1rem", color:"#374151" }}>{EMPTY_MSG[activeTab].title}</div>
            <p style={{ fontSize:"0.875rem", color:"#9ca3af", marginTop:"0.375rem", maxWidth:260, margin:"0.375rem auto 0" }}>{EMPTY_MSG[activeTab].sub}</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {filtered.map(cita => {
              const cfg = STATUS_CFG[cita.status] || STATUS_CFG.pending;
              const Ic  = cfg.icon;
              const dateObj = parseISO(cita.scheduled_date + "T12:00:00");
              return (
                <div
                  key={cita.id}
                  style={{
                    background:"white", borderRadius:12, border:"1px solid #e5e7eb",
                    borderLeft:`4px solid ${cfg.borderColor}`,
                    padding:"1.125rem 1.25rem", display:"flex", alignItems:"center", gap:"1rem",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                    transition:"box-shadow 0.12s",
                    cursor:"pointer",
                  }}
                  onClick={() => navigate(`/cita/${cita.id}${IS_DEV ? `?preview=${IS_DEV}` : ""}`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}
                >
                  {/* Ícono estado */}
                  <div style={{ width:40, height:40, borderRadius:10, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ic size={18} color={cfg.color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:"0.9375rem", color:"#111827" }}>
                      {cita.dependencies?.name}
                    </div>
                    <div style={{ fontSize:"0.8125rem", color:"#6b7280", marginTop:"0.125rem", display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}>
                        <CalendarDays size={11} />
                        {format(dateObj, "d MMM yyyy", { locale:es })} · {timeLabel(cita.scheduled_time)}
                      </span>
                      {(cita.professional?.full_name || cita.professional_name) && <span>{cita.professional?.full_name || cita.professional_name}</span>}
                    </div>
                    {cita.reason && (
                      <div style={{ fontSize:"0.75rem", color:"#9ca3af", marginTop:"0.25rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {cita.reason}
                      </div>
                    )}
                  </div>

                  {/* Badge + chevron */}
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 }}>
                    <span style={{ fontSize:"0.6875rem", fontWeight:700, color:cfg.color, background:cfg.bg, padding:"0.2rem 0.5rem", borderRadius:20 }}>
                      {cfg.label}
                    </span>
                    <ChevronRight size={15} color="#d1d5db" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
