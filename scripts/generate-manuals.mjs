import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { resolve } from "path";

// ── Paleta ───────────────────────────────────────────────────────────────────
const GREEN       = "#39a900";
const GREEN_DARK  = "#2d7a00";
const GREEN_LIGHT = "#f0fce4";
const GRAY_900    = "#0d1117";
const GRAY_700    = "#374151";
const GRAY_500    = "#6b7280";
const GRAY_200    = "#e5e7eb";
const WHITE       = "#ffffff";
const AMBER       = "#f59e0b";

// ── Helpers ───────────────────────────────────────────────────────────────────
function newDoc() {
  return new PDFDocument({
    size: "A4",
    margins: { top: 72, bottom: 72, left: 64, right: 64 },
    info: { Author: "Bienestar SENA", Creator: "Sistema de Gestión de Citas" },
  });
}

function coverPage(doc, title, subtitle) {
  // Fondo verde oscuro superior
  doc.rect(0, 0, doc.page.width, 280).fill(GREEN_DARK);

  // Logo / nombre sistema
  doc.fontSize(11).fillColor(GREEN_LIGHT).font("Helvetica")
    .text("SENA — BIENESTAR INSTITUCIONAL", 64, 60, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(32).fillColor(WHITE).font("Helvetica-Bold")
    .text("Bienestar SENA", { align: "center" });
  doc.fontSize(14).fillColor(GREEN_LIGHT).font("Helvetica")
    .text("Sistema de Gestión de Citas", { align: "center" });

  // Línea separadora blanca
  const midX = doc.page.width / 2;
  doc.moveTo(midX - 60, 195).lineTo(midX + 60, 195).lineWidth(1.5).strokeColor(WHITE).stroke();

  // Título del manual
  doc.fontSize(22).fillColor(WHITE).font("Helvetica-Bold")
    .text(title, 64, 215, { align: "center" });

  // Franja verde media
  doc.rect(0, 280, doc.page.width, 6).fill(GREEN);

  // Subtítulo / descripción
  doc.fontSize(13).fillColor(GRAY_700).font("Helvetica")
    .text(subtitle, 80, 310, { align: "center", width: doc.page.width - 160 });

  // Metadata
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  doc.fontSize(10).fillColor(GRAY_500).font("Helvetica")
    .text(`Versión 1.0  ·  ${fecha}`, { align: "center" });

  // Pie de portada
  doc.rect(0, doc.page.height - 54, doc.page.width, 54).fill(GRAY_900);
  doc.fontSize(9).fillColor(GRAY_500).font("Helvetica")
    .text("Documento generado automáticamente · Uso interno SENA", 64, doc.page.height - 34, { align: "center" });
}

function addPage(doc) { doc.addPage(); }

function header(doc, text) {
  // Línea verde lateral + texto
  const y = doc.y;
  doc.rect(64, y, 4, 26).fill(GREEN);
  doc.fontSize(17).fillColor(GRAY_900).font("Helvetica-Bold")
    .text(text, 76, y + 3, { lineGap: 2 });
  doc.moveDown(0.6);
  doc.moveTo(64, doc.y).lineTo(doc.page.width - 64, doc.y)
    .lineWidth(0.5).strokeColor(GRAY_200).stroke();
  doc.moveDown(0.7);
}

function subheader(doc, text) {
  doc.fontSize(12).fillColor(GREEN_DARK).font("Helvetica-Bold").text(text);
  doc.moveDown(0.3);
}

function body(doc, text, opts = {}) {
  doc.fontSize(10).fillColor(GRAY_700).font("Helvetica")
    .text(text, { lineGap: 3, ...opts });
  doc.moveDown(0.4);
}

function bullet(doc, text, level = 0) {
  const indent = 64 + level * 16;
  const dot = level === 0 ? "•" : "–";
  doc.fontSize(10).fillColor(GRAY_700).font("Helvetica")
    .text(`${dot}  ${text}`, indent, doc.y, {
      width: doc.page.width - indent - 64,
      lineGap: 2,
    });
  doc.moveDown(0.2);
}

function note(doc, text) {
  const y = doc.y;
  doc.rect(64, y, doc.page.width - 128, 1).fill(GRAY_200);
  doc.moveDown(0.3);
  doc.rect(64, doc.y, 3, 30).fill(AMBER);
  doc.fontSize(9).fillColor(GRAY_500).font("Helvetica-Oblique")
    .text(text, 74, doc.y + 2, { width: doc.page.width - 138, lineGap: 2 });
  doc.moveDown(1);
}

function infoBox(doc, label, value) {
  const y = doc.y;
  doc.rect(64, y, doc.page.width - 128, 22).fill("#f9fafb");
  doc.rect(64, y, 3, 22).fill(GREEN);
  doc.fontSize(9).fillColor(GRAY_500).font("Helvetica-Bold")
    .text(label.toUpperCase(), 74, y + 4);
  doc.fontSize(10).fillColor(GRAY_900).font("Helvetica")
    .text(value, 200, y + 4, { width: doc.page.width - 264 });
  doc.moveDown(0.15);
  doc.y = y + 26;
}

function table(doc, headers, rows) {
  const colW  = (doc.page.width - 128) / headers.length;
  const x0    = 64;
  let   y     = doc.y;

  // Header row
  doc.rect(x0, y, doc.page.width - 128, 20).fill(GREEN_DARK);
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
      .text(h, x0 + i * colW + 6, y + 5, { width: colW - 12 });
  });
  y += 20;

  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? WHITE : "#f6f8fa";
    const rowH = 18;
    doc.rect(x0, y, doc.page.width - 128, rowH).fill(bg);
    row.forEach((cell, ci) => {
      doc.fontSize(9).fillColor(GRAY_700).font("Helvetica")
        .text(String(cell), x0 + ci * colW + 6, y + 4, { width: colW - 12 });
    });
    y += rowH;
  });

  // Border
  doc.rect(x0, doc.y - (rows.length * 18 + 20), doc.page.width - 128, rows.length * 18 + 20)
    .lineWidth(0.5).strokeColor(GRAY_200).stroke();
  doc.y = y + 8;
  doc.moveDown(0.5);
}

function pageFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    if (i === range.start) continue; // Skip cover
    doc.switchToPage(i);
    const bottom = doc.page.height - 40;
    doc.moveTo(64, bottom).lineTo(doc.page.width - 64, bottom)
      .lineWidth(0.4).strokeColor(GRAY_200).stroke();
    doc.fontSize(8).fillColor(GRAY_500).font("Helvetica")
      .text("Bienestar SENA — Sistema de Gestión de Citas", 64, bottom + 6);
    doc.text(`Página ${i - range.start + 1}`, 64, bottom + 6,
      { align: "right", width: doc.page.width - 128 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL TÉCNICO
// ═══════════════════════════════════════════════════════════════════════════════
function buildTechnical() {
  const doc  = newDoc();
  const path = resolve("F:/gestion-citas/Manual_Tecnico_Bienestar_SENA.pdf");
  const out  = createWriteStream(path);
  doc.pipe(out);

  // ── Portada ───────────────────────────────────────────────────────────────
  coverPage(doc,
    "Manual Técnico",
    "Documentación técnica completa del sistema: arquitectura, base de datos,\nseguridad RBAC, Edge Functions y guía de despliegue."
  );

  // ── 1. Descripción del Sistema ────────────────────────────────────────────
  addPage(doc);
  header(doc, "1. Descripción del Sistema");
  body(doc,
    "Bienestar SENA es una aplicación web SaaS para la gestión de citas de bienestar institucional " +
    "del SENA. Permite a aprendices agendar citas con los profesionales de Psicología, Enfermería y " +
    "Trabajo Social, y ofrece herramientas de coordinación, reportes y administración para el personal."
  );
  subheader(doc, "Características principales");
  bullet(doc, "Agendamiento de citas en línea con validación de disponibilidad en tiempo real");
  bullet(doc, "Control de acceso por roles (RBAC) con 7 roles y 26 permisos granulares");
  bullet(doc, "Notificaciones por correo electrónico al confirmar y recordar citas");
  bullet(doc, "Recordatorios automáticos 24 horas antes de cada cita");
  bullet(doc, "Panel de reportes con estadísticas de atención por dependencia y período");
  bullet(doc, "Control de fichas activas: el administrador sube el padrón del SENA y valida el registro de aprendices");
  bullet(doc, "Encuesta de satisfacción al finalizar cada atención");
  bullet(doc, "Exportación del historial de citas a PDF");

  // ── 2. Arquitectura ────────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "2. Arquitectura General");
  body(doc,
    "El sistema sigue una arquitectura SPA + BaaS (Single Page Application + Backend as a Service). " +
    "No requiere servidor Node.js propio en producción."
  );

  subheader(doc, "Capas del sistema");
  infoBox(doc, "Frontend", "React 19 + Vite 6 — SPA servida por Vercel CDN");
  infoBox(doc, "Backend", "Supabase: PostgreSQL 15 + Auth + Storage + Edge Functions (Deno)");
  infoBox(doc, "Despliegue", "Vercel (frontend) + Supabase cloud (backend)");
  infoBox(doc, "Correo", "Resend API — envío de emails transaccionales");
  infoBox(doc, "Repositorio", "GitHub — CI/CD automático con Vercel en cada push a main");
  doc.moveDown(0.5);

  subheader(doc, "Flujo de datos");
  bullet(doc, "El navegador carga la SPA desde Vercel CDN");
  bullet(doc, "La SPA se comunica directamente con Supabase usando la API REST y realtime");
  bullet(doc, "Las RLS (Row Level Security) de PostgreSQL garantizan que cada usuario solo acceda a sus datos");
  bullet(doc, "Las Edge Functions (Deno) corren en los servidores de Supabase para lógica server-side (emails)");
  bullet(doc, "Vercel no ejecuta código server-side — es puramente CDN para archivos estáticos");

  // ── 3. Stack Tecnológico ──────────────────────────────────────────────────
  addPage(doc);
  header(doc, "3. Stack Tecnológico");

  subheader(doc, "Frontend");
  table(doc,
    ["Tecnología", "Versión", "Uso"],
    [
      ["React",                "19.x",   "Framework UI — componentes y estado"],
      ["Vite",                 "8.x",    "Bundler y servidor de desarrollo"],
      ["React Router DOM",     "7.x",    "Enrutamiento del lado del cliente (SPA)"],
      ["@supabase/supabase-js","2.x",    "Cliente oficial de Supabase"],
      ["Lucide React",         "1.x",    "Iconografía"],
      ["Recharts",             "3.x",    "Gráficas y reportes"],
      ["Sonner",               "2.x",    "Toast notifications"],
      ["SheetJS (xlsx)",       "0.18.x", "Parsing de Excel para el padrón de fichas"],
      ["date-fns",             "4.x",    "Formateo y cálculo de fechas"],
    ]
  );

  subheader(doc, "Backend / Infraestructura");
  table(doc,
    ["Tecnología", "Rol"],
    [
      ["Supabase PostgreSQL 15", "Base de datos relacional con RLS"],
      ["Supabase Auth",          "Autenticación — JWT, email/password"],
      ["Supabase Edge Functions","Lógica server-side en Deno (emails)"],
      ["Supabase Storage",       "Almacenamiento de archivos adjuntos"],
      ["Resend",                 "Servicio de envío de emails transaccionales"],
      ["Vercel",                 "Hosting y CDN del frontend"],
      ["GitHub",                 "Control de versiones y CI/CD"],
    ]
  );

  subheader(doc, "Testing");
  table(doc,
    ["Herramienta", "Uso"],
    [
      ["Vitest 4.x",                    "Test runner (147 tests — todos pasan)"],
      ["@testing-library/react 16.x",   "Tests de componentes React"],
      ["@testing-library/jest-dom 6.x", "Matchers DOM extendidos"],
      ["jsdom 29.x",                    "Entorno DOM simulado en Node.js"],
    ]
  );

  // ── 4. Estructura del Proyecto ────────────────────────────────────────────
  addPage(doc);
  header(doc, "4. Estructura de Carpetas");

  body(doc, "El proyecto sigue arquitectura Feature-Based — cada módulo tiene su propia carpeta con componentes, páginas y lógica relacionada.");
  doc.moveDown(0.3);

  const estructura = [
    ["src/features/auth/",         "Login, registro, onboarding, perfil"],
    ["src/features/appointments/", "Dashboard, detalle, historial, atención"],
    ["src/features/admin/",        "Panel admin, usuarios, roles, fichas"],
    ["src/features/dashboard/",    "Dashboard de coordinación"],
    ["src/features/reports/",      "Reportes y estadísticas"],
    ["src/features/professional/", "Agenda, notas y estadísticas profesional"],
    ["src/shared/",                "Layout, componentes reutilizables"],
    ["src/providers/",             "AuthProvider, AppointmentModalContext"],
    ["src/routes/",                "AppRoutes, ProtectedRoute"],
    ["src/lib/",                   "Cliente Supabase, notificaciones, permisos"],
    ["src/test/",                  "Suites de pruebas automatizadas"],
    ["supabase/functions/",        "Edge Functions: notify-appointment, send-reminders"],
    ["scripts/",                   "Generadores de documentos (manuales, testing)"],
  ];
  table(doc, ["Carpeta", "Contenido"], estructura);

  // ── 5. Base de Datos ──────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "5. Base de Datos");
  body(doc, "PostgreSQL 15 en Supabase. Todas las tablas tienen Row Level Security (RLS) habilitado.");

  subheader(doc, "Tablas principales");
  table(doc,
    ["Tabla", "Descripción"],
    [
      ["profiles",             "Datos de perfil de cada usuario (extiende auth.users)"],
      ["roles",                "Catálogo de roles: APRENDIZ, PSICOLOGIA, ENFERMERIA, etc."],
      ["permissions",          "Catálogo de 26 permisos granulares del sistema"],
      ["role_permissions",     "Relación N:M entre roles y permisos"],
      ["dependencies",         "Dependencias de Bienestar: Psicología, Enfermería, Trabajo Social"],
      ["appointments",         "Citas: estado, fecha, motivo, profesional, notas clínicas"],
      ["system_settings",      "Configuración global: ubicación, whitelist_enabled, etc."],
      ["aprendiz_whitelist",   "Padrón de aprendices activos (cédula + ficha)"],
      ["satisfaction_surveys", "Encuestas de satisfacción post-atención (rating 1-5)"],
      ["programs",             "44 programas de formación SENA activos"],
    ]
  );

  subheader(doc, "Ciclo de vida de una cita (campo status)");
  table(doc,
    ["Estado", "Descripción"],
    [
      ["pending",   "Cita creada por el aprendiz, esperando confirmación del profesional"],
      ["confirmed", "Profesional confirmó la cita — aparece en su agenda"],
      ["in_progress","Atención iniciada — el cronómetro está corriendo"],
      ["completed", "Atención finalizada — el aprendiz puede dejar encuesta"],
      ["cancelled", "Cancelada por aprendiz o coordinación"],
      ["no_show",   "El aprendiz no se presentó a la cita"],
    ]
  );

  note(doc, "Las citas solo las puede crear el APRENDIZ. El profesional confirma, inicia y completa. La coordinación puede cancelar cualquier cita activa.");

  // ── 6. Sistema RBAC ───────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "6. Sistema RBAC (Control de Acceso por Roles)");
  body(doc, "El sistema implementa RBAC con 7 roles y 26 permisos. Los permisos se verifican tanto en el frontend (UI condicional) como en el backend (RLS de PostgreSQL).");

  subheader(doc, "Roles y acceso");
  table(doc,
    ["Rol", "Home", "Permisos clave"],
    [
      ["APRENDIZ",       "/dashboard",    "Ver y cancelar sus propias citas, agendar citas"],
      ["PSICOLOGIA",     "/professional", "Confirmar, iniciar, completar citas, notas clínicas"],
      ["ENFERMERIA",     "/professional", "Idéntico a PSICOLOGIA"],
      ["TRABAJO_SOCIAL", "/professional", "Idéntico a PSICOLOGIA"],
      ["COORDINACION",   "/coordination", "Ver todas las citas, cancelar cualquiera, exportar, fichas"],
      ["ADMINISTRADOR",  "/admin",        "CRUD usuarios, gestionar dependencias, fichas, toggle whitelist"],
      ["SUPERADMIN",     "/admin",        "Todos los permisos — acceso total al sistema"],
    ]
  );

  subheader(doc, "Implementación técnica");
  bullet(doc, "Los permisos se definen en src/lib/permissions.js como constantes (P.APPOINTMENTS_CREATE, etc.)");
  bullet(doc, "El hook useCan() verifica si el rol actual tiene un permiso específico");
  bullet(doc, "Las RLS de PostgreSQL implementan la misma lógica en el servidor como segunda capa de defensa");
  bullet(doc, "Las rutas protegidas usan ProtectedRoute con requiredRoles");

  // ── 7. Edge Functions ─────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "7. Edge Functions (Deno)");
  body(doc, "Las Edge Functions corren en los servidores de Supabase usando el runtime Deno. No requieren Node.js.");

  subheader(doc, "notify-appointment");
  bullet(doc, "Trigger: el frontend la llama al confirmar una cita");
  bullet(doc, "Función: envía email de confirmación al aprendiz vía Resend");
  bullet(doc, "Resolución de email: usa la service-role key para leer auth.users.email (profiles no tiene email)");
  bullet(doc, "Versión activa: v6");

  doc.moveDown(0.3);
  subheader(doc, "send-reminders");
  bullet(doc, "Trigger: llamada externa (cron manual o programado)");
  bullet(doc, "Función: envía recordatorios 24h antes a aprendices con cita al día siguiente");
  bullet(doc, "Autenticación: acepta service-role Bearer o header x-cron-secret");
  bullet(doc, "Prevención de duplicados: columna appointments.reminder_sent = true");
  bullet(doc, "Versión activa: v1");

  note(doc, "Para activar los emails en producción se debe configurar el secret RESEND_API_KEY en Supabase Dashboard → Edge Functions → Secrets.");

  // ── 8. Control de Acceso — Whitelist ─────────────────────────────────────
  addPage(doc);
  header(doc, "8. Sistema de Control de Fichas (Whitelist)");
  body(doc,
    "El administrador puede cargar el padrón oficial del SENA con los aprendices activos. " +
    "Cuando la validación está activada, solo los aprendices que aparezcan en el padrón pueden registrarse e iniciar sesión."
  );

  subheader(doc, "Tabla aprendiz_whitelist");
  table(doc,
    ["Columna", "Tipo", "Descripción"],
    [
      ["id",              "UUID",        "Clave primaria"],
      ["document_number", "TEXT",        "Número de cédula del aprendiz"],
      ["ficha_number",    "TEXT",        "Número de ficha del programa"],
      ["full_name",       "TEXT",        "Nombre completo (opcional)"],
      ["program",         "TEXT",        "Programa de formación (opcional)"],
      ["uploaded_at",     "TIMESTAMPTZ", "Fecha de importación"],
      ["uploaded_by",     "UUID",        "Usuario que importó el registro"],
    ]
  );

  subheader(doc, "Flujo de validación");
  bullet(doc, "1. ADMIN/COORDINACION sube CSV o Excel con columnas: cedula, ficha, nombre (opc), programa (opc)");
  bullet(doc, "2. El sistema importa en lotes de 500 con upsert (sin duplicados)");
  bullet(doc, "3. ADMIN activa el toggle whitelist_enabled en system_settings");
  bullet(doc, "4. Al registrarse: se valida cédula + ficha antes del signUp");
  bullet(doc, "5. Al hacer login: si el rol es APRENDIZ, se valida contra el padrón activo");
  bullet(doc, "6. Si no aparece → se hace signOut inmediato y se muestra mensaje de error");

  subheader(doc, "RLS aplicadas");
  bullet(doc, "whitelist_read_public: lectura pública (necesario para validar antes del signUp)");
  bullet(doc, "whitelist_write_staff: escritura solo para COORDINACION, ADMINISTRADOR y SUPERADMIN");
  bullet(doc, "public_read_whitelist_setting: solo la clave whitelist_enabled es legible sin sesión");

  // ── 9. Despliegue ─────────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "9. Despliegue en Producción");

  subheader(doc, "Frontend — Vercel");
  bullet(doc, "Repositorio: github.com/Arley0113/gestion-citas");
  bullet(doc, "Rama de producción: main");
  bullet(doc, "CI/CD: cada push a main dispara un deploy automático en Vercel");
  bullet(doc, "URL de producción: https://gestion-citas-nu.vercel.app");
  bullet(doc, "Framework preset: Vite (Vercel lo detecta automáticamente)");

  doc.moveDown(0.3);
  subheader(doc, "Variables de entorno en Vercel");
  table(doc,
    ["Variable", "Descripción"],
    [
      ["VITE_SUPABASE_URL",      "URL del proyecto Supabase"],
      ["VITE_SUPABASE_ANON_KEY", "Llave anónima pública de Supabase"],
    ]
  );

  subheader(doc, "Backend — Supabase");
  infoBox(doc, "Proyecto ID", "hopjfppngueuhwuakzwf");
  infoBox(doc, "Región",      "sa-east-1 (São Paulo)");
  infoBox(doc, "Plan",        "Free tier");
  doc.moveDown(0.3);

  subheader(doc, "Secrets de Edge Functions (Supabase Dashboard)");
  table(doc,
    ["Secret", "Uso"],
    [
      ["RESEND_API_KEY",       "Envío de emails — requerido para que los emails funcionen"],
      ["CRON_SECRET",          "Autenticación del cron de recordatorios (opcional)"],
      ["SUPABASE_SERVICE_ROLE_KEY", "Auto-disponible en Edge Functions"],
    ]
  );

  note(doc, "Sin RESEND_API_KEY configurado, las Edge Functions corren sin error pero no envían emails. Configurarlo en Dashboard → Edge Functions → Secrets.");

  // ── 10. Testing ───────────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "10. Testing Automatizado");
  body(doc, "El proyecto cuenta con 147 tests automatizados organizados en 4 suites. Todos pasan en el entorno de CI.");

  table(doc,
    ["Archivo", "Tests", "Qué cubre"],
    [
      ["rbac/permissions.test.js",       "59", "Permisos por rol, escalación de privilegios, exclusividad SUPERADMIN"],
      ["utils/formatters.test.js",       "33", "formatTime, timeLabel, duración de citas, estados"],
      ["business/appointments.test.js",  "38", "Filtros, mood, onboarding, encuesta de satisfacción, cronómetro"],
      ["security/notifications.test.js", "17", "Sanitización XSS, autenticación de send-reminders"],
    ]
  );

  subheader(doc, "Comandos");
  bullet(doc, "npm test — ejecuta todos los tests una vez");
  bullet(doc, "npm run test:watch — modo watch, re-ejecuta al guardar");
  bullet(doc, "npm run test:coverage — genera reporte de cobertura en /coverage");

  note(doc, "Los tests no requieren variables de entorno ni conexión a Supabase. Se ejecutan offline.");

  // ── Footers ───────────────────────────────────────────────────────────────
  pageFooter(doc);
  doc.end();

  return new Promise((res, rej) => {
    out.on("finish", () => { console.log("✅  Manual Técnico → Manual_Tecnico_Bienestar_SENA.pdf"); res(); });
    out.on("error", rej);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL DE USUARIO
// ═══════════════════════════════════════════════════════════════════════════════
function buildUser() {
  const doc  = newDoc();
  const path = resolve("F:/gestion-citas/Manual_Usuario_Bienestar_SENA.pdf");
  const out  = createWriteStream(path);
  doc.pipe(out);

  // ── Portada ───────────────────────────────────────────────────────────────
  coverPage(doc,
    "Manual de Usuario",
    "Guía completa para aprendices, profesionales de bienestar,\ncoordinadores y administradores del sistema."
  );

  // ── 1. Introducción ───────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "1. Introducción");
  body(doc,
    "Bienestar SENA es el sistema digital para agendar y gestionar citas de bienestar institucional. " +
    "Permite a los aprendices solicitar atención de Psicología, Enfermería y Trabajo Social de forma " +
    "rápida y desde cualquier dispositivo con internet."
  );
  body(doc, "URL de acceso:  https://gestion-citas-nu.vercel.app");

  subheader(doc, "¿Quién usa el sistema?");
  table(doc,
    ["Perfil", "¿Qué puede hacer?"],
    [
      ["Aprendiz",        "Agendar, ver y cancelar sus propias citas"],
      ["Profesional",     "Confirmar, iniciar y completar atenciones, registrar notas clínicas"],
      ["Coordinación",    "Ver todas las citas, exportar reportes, gestionar padrón de fichas"],
      ["Administrador",   "Gestionar usuarios, dependencias, fichas y configuración general"],
      ["Super Administrador", "Acceso total al sistema"],
    ]
  );

  // ── 2. Acceso al Sistema ──────────────────────────────────────────────────
  addPage(doc);
  header(doc, "2. Acceso al Sistema");

  subheader(doc, "2.1 Registro de aprendiz");
  body(doc, "Solo los aprendices se registran por cuenta propia. El personal recibe una invitación por correo.");
  bullet(doc, "1. Ir a https://gestion-citas-nu.vercel.app y hacer clic en 'Regístrate aquí'");
  bullet(doc, "2. Paso 1: ingresar correo electrónico y contraseña (mínimo 8 caracteres)");
  bullet(doc, "3. Paso 2: ingresar nombre, apellido, tipo y número de documento, ficha y programa de formación");
  bullet(doc, "4. Si el administrador tiene activa la validación de fichas, la cédula y ficha deben aparecer en el padrón activo del SENA");
  bullet(doc, "5. Revisar el correo y hacer clic en el enlace de verificación para activar la cuenta");

  doc.moveDown(0.3);
  subheader(doc, "2.2 Inicio de sesión");
  bullet(doc, "Ingresar correo electrónico y contraseña");
  bullet(doc, "Si se olvidó la contraseña, usar '¿Olvidaste?' para recibir un enlace de restablecimiento");
  bullet(doc, "El sistema redirige automáticamente según el rol del usuario");

  note(doc, "Si el sistema muestra 'Tu cédula o número de ficha no aparecen en la base de datos del SENA', contacta al equipo de Bienestar para verificar que tu ficha esté activa.");

  // ── 3. Rol Aprendiz ───────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "3. Guía para Aprendices");

  subheader(doc, "3.1 Dashboard principal");
  body(doc, "Al iniciar sesión, el aprendiz ve su panel personal con:");
  bullet(doc, "Indicador de estado de ánimo (¿cómo te sientes hoy?)");
  bullet(doc, "Próxima cita programada con cuenta regresiva");
  bullet(doc, "Historial reciente de citas");
  bullet(doc, "Acceso rápido para agendar una nueva cita");

  doc.moveDown(0.3);
  subheader(doc, "3.2 Agendar una cita");
  bullet(doc, "1. Hacer clic en el botón verde 'Agendar cita' en el menú lateral o en el dashboard");
  bullet(doc, "2. Seleccionar la dependencia: Psicología, Enfermería o Trabajo Social");
  bullet(doc, "3. Elegir fecha disponible (el sistema muestra solo días hábiles con cupos)");
  bullet(doc, "4. Seleccionar hora disponible");
  bullet(doc, "5. Describir el motivo de la consulta");
  bullet(doc, "6. Confirmar — se envía un correo de confirmación automáticamente");

  doc.moveDown(0.3);
  subheader(doc, "3.3 Ver y gestionar mis citas");
  body(doc, "En la sección 'Mis citas' del menú lateral:");
  bullet(doc, "Pestaña 'Próximas': citas con estado Pendiente o Confirmada");
  bullet(doc, "Pestaña 'Pasadas': citas completadas o con inasistencia");
  bullet(doc, "Pestaña 'Canceladas': citas canceladas");
  bullet(doc, "Filtros por dependencia y búsqueda por motivo o profesional");
  bullet(doc, "Botón 'Exportar PDF' para descargar el historial completo");

  doc.moveDown(0.3);
  subheader(doc, "3.4 Cancelar una cita");
  bullet(doc, "Entrar al detalle de la cita (clic sobre la cita)");
  bullet(doc, "Sección 'Gestionar cita' → botón 'Cancelar esta cita'");
  bullet(doc, "Se pueden cancelar citas con estado Pendiente o Confirmada");
  bullet(doc, "Ingresar el motivo de cancelación (opcional) y confirmar");
  note(doc, "Una vez cancelada, la cita no puede reactivarse. El aprendiz puede agendar una nueva cita.");

  doc.moveDown(0.3);
  subheader(doc, "3.5 Encuesta de satisfacción");
  body(doc, "Al completarse una atención, el aprendiz puede dejar una encuesta:");
  bullet(doc, "Calificación de 1 a 5 estrellas");
  bullet(doc, "Comentario opcional (máximo 400 caracteres)");
  bullet(doc, "La encuesta solo está disponible en citas completadas y se puede enviar una sola vez");

  // ── 4. Rol Profesional ────────────────────────────────────────────────────
  addPage(doc);
  header(doc, "4. Guía para Profesionales de Bienestar");
  body(doc, "Aplica a los roles de Psicología, Enfermería y Trabajo Social.");

  subheader(doc, "4.1 Dashboard profesional");
  bullet(doc, "Vista de citas del día con estado y datos del aprendiz");
  bullet(doc, "Estadísticas rápidas: total atendidas, pendientes, confirmadas");
  bullet(doc, "Acceso a la agenda semanal y mensual");

  doc.moveDown(0.3);
  subheader(doc, "4.2 Gestionar citas");
  table(doc,
    ["Acción", "Estado requerido", "Descripción"],
    [
      ["Confirmar",  "Pendiente",    "Acepta la cita del aprendiz — le llega email de confirmación"],
      ["Iniciar",    "Confirmada",   "Marca el inicio de la atención — activa el cronómetro"],
      ["Completar",  "En progreso",  "Finaliza la atención — el aprendiz puede dejar encuesta"],
      ["No asistió", "Confirmada",   "Marca que el aprendiz no se presentó"],
    ]
  );

  doc.moveDown(0.3);
  subheader(doc, "4.3 Notas clínicas");
  bullet(doc, "En el detalle de cada cita, sección 'Notas clínicas'");
  bullet(doc, "Las notas son visibles solo para el profesional y coordinación");
  bullet(doc, "Se pueden editar mientras la cita no esté completada");
  bullet(doc, "El aprendiz no tiene acceso a las notas clínicas");

  doc.moveDown(0.3);
  subheader(doc, "4.4 Agenda y horarios");
  bullet(doc, "Menú lateral → 'Mi agenda': vista semanal de todas sus citas");
  bullet(doc, "Menú lateral → 'Horarios': configurar disponibilidad horaria");
  bullet(doc, "Menú lateral → 'Mis estadísticas': gráficas de atenciones por período");

  // ── 5. Rol Coordinación ───────────────────────────────────────────────────
  addPage(doc);
  header(doc, "5. Guía para Coordinación");

  subheader(doc, "5.1 Dashboard de coordinación");
  bullet(doc, "Vista global de todas las citas del sistema (todos los departamentos)");
  bullet(doc, "Filtros por estado, dependencia, profesional y rango de fechas");
  bullet(doc, "KPIs: total de citas, tasa de asistencia, tiempo promedio de atención");

  doc.moveDown(0.3);
  subheader(doc, "5.2 Cancelar cualquier cita");
  bullet(doc, "La coordinación puede cancelar citas activas (Pendiente o Confirmada) de cualquier dependencia");
  bullet(doc, "Entrar al detalle de la cita → sección 'Gestión administrativa' → 'Cancelar esta cita'");
  bullet(doc, "Se requiere registrar el motivo de la cancelación");

  doc.moveDown(0.3);
  subheader(doc, "5.3 Reportes");
  bullet(doc, "Menú lateral → 'Reportes'");
  bullet(doc, "Gráficas por dependencia, por estado, por período");
  bullet(doc, "Exportación de datos para informes institucionales");

  doc.moveDown(0.3);
  subheader(doc, "5.4 Gestión de fichas activas");
  bullet(doc, "Menú lateral → 'Fichas activas'");
  bullet(doc, "Subir el archivo Excel o CSV exportado del sistema SENA con las fichas del período");
  bullet(doc, "Columnas requeridas: cedula, ficha — Opcionales: nombre, programa");
  bullet(doc, "La coordinación puede importar, buscar y eliminar registros del padrón");
  bullet(doc, "El toggle de activar/desactivar la validación es exclusivo del Administrador");
  note(doc, "Descargar la plantilla CSV desde el botón 'Plantilla CSV' para conocer el formato correcto del archivo.");

  // ── 6. Rol Administrador ──────────────────────────────────────────────────
  addPage(doc);
  header(doc, "6. Guía para Administradores");

  subheader(doc, "6.1 Panel de administración");
  body(doc, "Accesible desde el menú lateral → 'Panel admin'. Contiene accesos directos a todos los módulos administrativos.");

  doc.moveDown(0.3);
  subheader(doc, "6.2 Gestión de usuarios");
  bullet(doc, "Menú → 'Usuarios': ver todos los usuarios del sistema con su rol");
  bullet(doc, "Buscar por nombre, correo o rol");
  bullet(doc, "Ver perfil completo de cualquier usuario");
  bullet(doc, "Módulo → 'Invitar staff': enviar invitación por correo a nuevos profesionales");

  doc.moveDown(0.3);
  subheader(doc, "6.3 Dependencias");
  bullet(doc, "Menú → 'Dependencias': gestionar Psicología, Enfermería y Trabajo Social");
  bullet(doc, "Crear, editar o desactivar dependencias");
  bullet(doc, "Configurar el profesional asignado a cada dependencia");

  doc.moveDown(0.3);
  subheader(doc, "6.4 Control de fichas (whitelist)");
  bullet(doc, "Menú → 'Fichas activas'");
  bullet(doc, "Subir el padrón de aprendices activos en CSV o Excel");
  bullet(doc, "Toggle 'Validación de registro': cuando está activo, solo aprendices del padrón pueden registrarse e iniciar sesión");
  bullet(doc, "Si se activa con lista vacía, el sistema muestra advertencia y ningún aprendiz podrá acceder");
  bullet(doc, "Recomendación: subir el padrón antes de activar la validación");

  doc.moveDown(0.3);
  subheader(doc, "6.5 Configuración del sistema");
  bullet(doc, "Menú → 'Configuración': establecer la ubicación de las citas (bloque, piso, sala)");
  bullet(doc, "Esta ubicación aparece en los emails de confirmación y en el detalle de cada cita");

  // ── 7. Preguntas Frecuentes ───────────────────────────────────────────────
  addPage(doc);
  header(doc, "7. Preguntas Frecuentes");

  subheader(doc, "¿Por qué no puedo registrarme?");
  body(doc,
    "Si aparece el mensaje 'Tu cédula o número de ficha no aparecen en la base de datos del SENA', " +
    "el administrador tiene activa la validación de fichas. Tu cédula y número de ficha deben estar " +
    "en el padrón activo. Contacta al equipo de Bienestar para verificar tu registro."
  );

  subheader(doc, "¿Por qué no me llegan los correos de confirmación?");
  body(doc,
    "Verifica la carpeta de spam o correo no deseado. Si el problema persiste, comunícate con el administrador del sistema — " +
    "es posible que la clave RESEND_API_KEY no esté configurada en el servidor."
  );

  subheader(doc, "¿Puedo cancelar una cita confirmada?");
  body(doc,
    "Sí. Los aprendices pueden cancelar citas con estado Pendiente o Confirmada desde el detalle de la cita. " +
    "No se pueden cancelar citas completadas, en progreso o ya canceladas."
  );

  subheader(doc, "¿Cómo recupero mi contraseña?");
  body(doc,
    "En la pantalla de login, hacer clic en '¿Olvidaste?' e ingresar el correo. " +
    "Se recibirá un enlace para crear una nueva contraseña."
  );

  subheader(doc, "¿Quién puede ver mis notas clínicas?");
  body(doc,
    "Solo el profesional que atendió la cita y la coordinación tienen acceso a las notas clínicas. " +
    "El aprendiz no puede ver las notas de su expediente."
  );

  subheader(doc, "¿Cómo exporto mi historial de citas?");
  body(doc,
    "Ir a 'Mis citas' en el menú lateral y hacer clic en el botón 'Exportar PDF' en la parte superior. " +
    "Se abrirá una ventana de impresión para guardar el historial como PDF."
  );

  pageFooter(doc);
  doc.end();

  return new Promise((res, rej) => {
    out.on("finish", () => { console.log("✅  Manual de Usuario → Manual_Usuario_Bienestar_SENA.pdf"); res(); });
    out.on("error", rej);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
await buildTechnical();
await buildUser();
console.log("\n✅  Ambos manuales generados en F:/gestion-citas/");
