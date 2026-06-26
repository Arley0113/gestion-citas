import { useState } from "react";
import { Search, Calendar, User, Heart, ChevronDown, Mail, Phone, Clock } from "lucide-react";

const FAQS = [
  {
    category: "Citas",
    icon: Calendar,
    color: "#39a900",
    bg: "#f0fce4",
    items: [
      { q: "¿Cómo agendo una cita?", a: "Haz clic en el botón 'Agendar cita' en tu panel principal. Selecciona la dependencia, fecha y hora disponible. Recibirás una confirmación por correo." },
      { q: "¿Puedo cancelar una cita?", a: "Sí, puedes cancelar hasta 2 horas antes de la hora programada. Ve a 'Mis citas' y selecciona la opción 'Cancelar' en la cita correspondiente." },
      { q: "¿Qué pasa si no asisto?", a: "Se registrará como 'No asistió' en tu expediente. Tres inasistencias consecutivas sin justificación pueden requerir una explicación al coordinador de bienestar." },
      { q: "¿Cómo se confirma una cita?", a: "Las citas las confirma el profesional asignado. Recibirás una notificación en la app y por correo cuando tu cita sea confirmada." },
    ],
  },
  {
    category: "Mi cuenta",
    icon: User,
    color: "#3b82f6",
    bg: "#eff6ff",
    items: [
      { q: "¿Cómo actualizo mis datos?", a: "Ve a 'Mi perfil' en el menú lateral. Allí puedes editar tu nombre, número de documento, número de ficha y programa de formación." },
      { q: "¿Puedo cambiar mi correo electrónico?", a: "El correo está vinculado a tu cuenta institucional SENA. Para cambios, contacta directamente al administrador del sistema de bienestar." },
      { q: "¿Cómo cambio mi contraseña?", a: "Ve a 'Configuración' en el menú y selecciona 'Cambiar contraseña'. Si olvidaste tu contraseña, usa la opción '¿Olvidaste?' en la pantalla de inicio de sesión." },
    ],
  },
  {
    category: "Bienestar",
    icon: Heart,
    color: "#ef4444",
    bg: "#fee2e2",
    items: [
      { q: "¿Qué servicios ofrece Bienestar?", a: "El área de Bienestar SENA ofrece atención en Psicología, Enfermería y Trabajo Social. Cada dependencia tiene horarios de atención específicos disponibles al agendar tu cita." },
      { q: "¿Es confidencial mi información?", a: "Sí, toda tu información clínica y personal es estrictamente confidencial. Solo el personal autorizado de Bienestar tiene acceso a tus datos, bajo protección de la ley de habeas data." },
      { q: "¿Con qué frecuencia puedo agendar citas?", a: "Puedes agendar según la disponibilidad del calendario. Para procesos de seguimiento, el equipo profesional determinará la frecuencia de sesiones recomendada." },
    ],
  },
];

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid #f3f4f6" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", gap: "1rem" }}
      >
        <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827", flex: 1 }}>{question}</span>
        <ChevronDown size={16} color="#9ca3af" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontSize: "0.9375rem", color: "#6b7280", lineHeight: 1.65, margin: "0 0 1rem", paddingRight: "1.5rem" }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function AyudaPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (key) => setOpenItems(p => ({ ...p, [key]: !p[key] }));

  const filtered = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Soporte
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Centro de ayuda
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Respuestas a las preguntas más frecuentes
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la ayuda..."
            style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem 0.875rem 0.75rem 2.5rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9375rem", color: "#111827", outline: "none", fontFamily: "var(--font-sans)", background: "white" }}
            onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* FAQ categories */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
            <Search size={40} color="#e5e7eb" style={{ margin: "0 auto 0.75rem", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>Sin resultados</div>
            <p style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>Intenta con otra búsqueda</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.category} style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} color={cat.color} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{cat.category}</span>
                  </div>
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      question={item.q}
                      answer={item.a}
                      isOpen={!!openItems[`${cat.category}-${i}`]}
                      onToggle={() => toggleItem(`${cat.category}-${i}`)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact card */}
        <div style={{ marginTop: "1.5rem", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #bbf7d0", borderRadius: 14, padding: "1.5rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#166534", marginBottom: "1rem" }}>
            ¿No encontraste lo que buscas?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <a href="mailto:bienestar@sena.edu.co" style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.9375rem", color: "#166534", textDecoration: "none", fontWeight: 500 }}>
              <Mail size={15} /> bienestar@sena.edu.co
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.9375rem", color: "#166534", fontWeight: 500 }}>
              <Phone size={15} /> (57) 601 546 0707
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.8125rem", color: "#4ade80" }}>
              <Clock size={14} /> Lunes a viernes · 7:00 a.m. – 5:00 p.m.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
