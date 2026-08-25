import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileSpreadsheet, Trash2, Search, ChevronLeft,
  Users, CheckCircle2, AlertCircle, X, RefreshCw, Download, MapPin, Plus,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { normalizeDocNumber } from "../../../lib/normalizeDoc";
import { DEV_ROLE } from "../../../lib/devMode";
import { toast } from "sonner";

const MOCK_WHITELIST = [
  { id: "mock-1", document_number: "1001234567", ficha_number: "2847193", full_name: "Juan Pérez", program: "Desarrollo de Software", uploaded_at: "2026-07-01T10:00:00Z" },
  { id: "mock-2", document_number: "1009876543", ficha_number: "2851024", full_name: "María García", program: "Contabilidad", uploaded_at: "2026-07-01T10:00:00Z" },
];

const MOCK_SEDES = [
  { id: 1, name: "Maicao" },
  { id: 2, name: "Comercio y Servicios" },
  { id: 3, name: "Industrial" },
];
const MOCK_FICHAS_SEDE = [
  { ficha_number: "2847193", sede_id: 1, sedes: { name: "Maicao" } },
];

// Normaliza encabezados quitando tildes ("Cédula" → "cedula") para que las
// regex de detección de columnas no dependan de que el archivo use ASCII puro.
function normalizeHeader(h) {
  return String(h ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Detecta la columna de número de documento sin confundirla con "Tipo de Documento"
// ni con la columna de ficha (evita colisión cuando esta se llama "Número de Ficha").
// Prioridad: "numero"/"cedula" > "documento" sin "tipo"
function findDocCol(headers, excludeIdx = -1) {
  const candidates = headers.map((h, i) => (i === excludeIdx ? "" : h));
  // 1. columna que tenga "numero" o "cedula" (muy específico)
  let idx = candidates.findIndex(h => /numero|cedula/.test(h));
  if (idx !== -1) return idx;
  // 2. "documento" o "document" pero que NO sea "tipo de documento"
  idx = candidates.findIndex(h => /documento|document/.test(h) && !/tipo/.test(h));
  if (idx !== -1) return idx;
  // 3. columna llamada exactamente "cc"
  return candidates.findIndex(h => /^cc$/.test(h));
}

// Combina nombre y apellidos si vienen en columnas separadas
function buildFullName(cols, nameIdx, lastNameIdx) {
  const first = nameIdx >= 0 ? (cols[nameIdx]?.trim() || "") : "";
  const last  = lastNameIdx >= 0 ? (cols[lastNameIdx]?.trim() || "") : "";
  const full  = [first, last].filter(Boolean).join(" ");
  return full || null;
}

// Divide una línea CSV respetando campos entre comillas que contengan el
// delimitador (ej. `"Pérez, Juan"` en un archivo separado por comas).
function splitCSVLine(line, delim) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

// ─── CSV parser (nativo) ──────────────────────────────────────────────────────
function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("El archivo no tiene datos");

  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = splitCSVLine(lines[0], delim).map(normalizeHeader);

  const fichaIdx    = headers.findIndex(h => /ficha/.test(h));
  const docIdx      = findDocCol(headers, fichaIdx);
  const nameIdx     = headers.findIndex(h => /^nombre$|^name$|^nombres$/.test(h));
  const lastNameIdx = headers.findIndex(h => /apellido/.test(h));
  // si no hay columna "nombre" por separado, buscar "nombre completo"
  const fullNameIdx = nameIdx === -1 ? headers.findIndex(h => /nombre|name/.test(h)) : -1;
  const progIdx     = headers.findIndex(h => /programa|program/.test(h));

  if (docIdx === -1 || fichaIdx === -1) {
    throw new Error("El archivo debe tener columnas con el número de documento y la ficha");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols  = splitCSVLine(line, delim);
    const doc   = normalizeDocNumber(cols[docIdx]);
    const ficha = cols[fichaIdx]?.trim();
    if (!doc || !ficha) continue;

    const full_name = nameIdx !== -1 || lastNameIdx !== -1
      ? buildFullName(cols, nameIdx, lastNameIdx)
      : (fullNameIdx >= 0 ? cols[fullNameIdx]?.trim() || null : null);

    rows.push({
      document_number: doc,
      ficha_number:    ficha,
      full_name,
      program: progIdx >= 0 ? cols[progIdx]?.trim() || null : null,
    });
  }
  return rows;
}

// ─── Excel parser (SheetJS, dynamic import) ───────────────────────────────────
async function parseExcelBuffer(buffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const json     = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (json.length === 0) throw new Error("La hoja de cálculo está vacía");

  const sample   = json[0];
  const origKeys = Object.keys(sample);
  const keys     = origKeys.map(normalizeHeader);

  const fichaIdx    = keys.findIndex(k => /ficha/.test(k));
  const fichaKey    = origKeys[fichaIdx];
  const docKey      = origKeys[findDocCol(keys, fichaIdx)] ?? null;
  const nameKey     = origKeys.find((_, i) => /^nombre$|^name$|^nombres$/.test(keys[i]));
  const lastNameKey = origKeys.find((_, i) => /apellido/.test(keys[i]));
  const fullNameKey = !nameKey ? origKeys.find((_, i) => /nombre|name/.test(keys[i])) : null;
  const progKey     = origKeys.find((_, i) => /programa|program/.test(keys[i]));

  if (!docKey || !fichaKey) {
    throw new Error("El archivo debe tener columnas con el número de documento y la ficha");
  }

  return json.map(row => {
    const first    = nameKey     ? String(row[nameKey]     ?? "").trim() : "";
    const lastName = lastNameKey ? String(row[lastNameKey] ?? "").trim() : "";
    const full_name = (first || lastName)
      ? [first, lastName].filter(Boolean).join(" ")
      : fullNameKey ? String(row[fullNameKey] ?? "").trim() || null : null;

    return {
      document_number: normalizeDocNumber(row[docKey]),
      ficha_number:    String(row[fichaKey]  ?? "").trim(),
      full_name:       full_name || null,
      program:         progKey ? String(row[progKey] ?? "").trim() || null : null,
    };
  }).filter(r => r.document_number && r.ficha_number);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FichasPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const roleName = profile?.roles?.name;
  const canToggle = ["ADMINISTRADOR", "SUPERADMIN"].includes(roleName);
  const backRoute = canToggle ? "/admin" : "/coordination";

  const [whitelist, setWhitelist] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = sin búsqueda activa
  const [searching, setSearching] = useState(false);

  const [preview, setPreview]     = useState(null); // { rows, filename }
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [importSede, setImportSede] = useState("");

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing]         = useState(false);

  const [wlEnabled, setWlEnabled]       = useState(false);
  const [togglingWl, setTogglingWl]     = useState(false);

  const [sedes, setSedes]               = useState([]);
  const [fichaSedes, setFichaSedes]     = useState([]);
  const [loadingFichaSedes, setLoadingFichaSedes] = useState(true);
  const [newFicha, setNewFicha]         = useState({ ficha_number: "", sede_id: "" });
  const [savingFichaSede, setSavingFichaSede] = useState(null); // ficha_number en guardado, o "new"

  const fileInputRef = useRef(null);

  // ─── Sedes por ficha ─────────────────────────────────────────────────────
  const loadFichaSedes = useCallback(async () => {
    setLoadingFichaSedes(true);
    if (DEV_ROLE) {
      setSedes(MOCK_SEDES);
      setFichaSedes(MOCK_FICHAS_SEDE);
      setLoadingFichaSedes(false);
      return;
    }
    const [sedesRes, fichasRes] = await Promise.all([
      supabase.from("sedes").select("id, name").eq("active", true).order("name"),
      supabase.from("fichas").select("ficha_number, sede_id, sedes(name)").order("ficha_number"),
    ]);
    setSedes(sedesRes.data || []);
    setFichaSedes(fichasRes.data || []);
    setLoadingFichaSedes(false);
  }, []);

  useEffect(() => { loadFichaSedes(); }, [loadFichaSedes]);

  const saveFichaSede = async (ficha_number, sede_id) => {
    if (!ficha_number.trim() || !sede_id) { toast.error("Ficha y sede son obligatorias"); return; }
    setSavingFichaSede(ficha_number);
    if (DEV_ROLE) {
      toast.success("Sede asignada (demo)");
      setNewFicha({ ficha_number: "", sede_id: "" });
      setSavingFichaSede(null);
      return;
    }
    const { error } = await supabase
      .from("fichas")
      .upsert({ ficha_number: ficha_number.trim(), sede_id: parseInt(sede_id) }, { onConflict: "ficha_number" });
    if (error) { toast.error("No se pudo asignar la sede"); }
    else { toast.success("Sede asignada"); setNewFicha({ ficha_number: "", sede_id: "" }); await loadFichaSedes(); }
    setSavingFichaSede(null);
  };

  const removeFichaSede = async (ficha_number) => {
    setSavingFichaSede(ficha_number);
    if (DEV_ROLE) {
      setFichaSedes(prev => prev.filter(f => f.ficha_number !== ficha_number));
      toast.success("Eliminado (demo)");
      setSavingFichaSede(null);
      return;
    }
    const { error } = await supabase.from("fichas").delete().eq("ficha_number", ficha_number);
    if (error) { toast.error("No se pudo eliminar"); }
    else { toast.success("Eliminado"); await loadFichaSedes(); }
    setSavingFichaSede(null);
  };

  // ─── Load whitelist + setting ────────────────────────────────────────────
  const loadWhitelist = useCallback(async () => {
    setLoadingList(true);
    if (DEV_ROLE) {
      setWhitelist(MOCK_WHITELIST);
      setTotalCount(MOCK_WHITELIST.length);
      setWlEnabled(true);
      setLoadingList(false);
      return;
    }
    try {
      const [countRes, listRes, settingRes] = await Promise.all([
        supabase.from("aprendiz_whitelist").select("*", { count: "exact", head: true }),
        supabase.from("aprendiz_whitelist")
          .select("*")
          .order("uploaded_at", { ascending: false })
          .limit(200),
        supabase.from("system_settings").select("value").eq("key", "whitelist_enabled").single(),
      ]);
      if (countRes.error) throw countRes.error;
      if (listRes.error)  throw listRes.error;
      setTotalCount(countRes.count ?? 0);
      setWhitelist(listRes.data ?? []);
      // settingRes puede ser null si la clave aún no fue creada — no es error
      if (settingRes.error && settingRes.error.code !== "PGRST116") throw settingRes.error;
      setWlEnabled(settingRes.data?.value === "true");
    } catch {
      toast.error("Error al cargar la lista");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const toggleWhitelistEnabled = async (next) => {
    setTogglingWl(true);
    if (DEV_ROLE) {
      setWlEnabled(next);
      toast.success(next ? "Validación activada (demo)" : "Validación desactivada (demo)");
      setTogglingWl(false);
      return;
    }
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "whitelist_enabled", value: next ? "true" : "false" }, { onConflict: "key" });
    if (error) {
      toast.error("No se pudo cambiar el estado de la validación");
    } else {
      setWlEnabled(next);
      toast.success(next
        ? "Validación activada — solo aprendices del padrón pueden registrarse"
        : "Validación desactivada — registro abierto para todos");
    }
    setTogglingWl(false);
  };

  useEffect(() => { loadWhitelist(); }, [loadWhitelist]);

  // ─── Búsqueda server-side ────────────────────────────────────────────────
  // `whitelist` solo trae los últimos 200 registros — filtrar la búsqueda
  // sobre ese array local dejaría fuera cualquier coincidencia más allá de
  // los primeros 200 (aunque totalCount muestre el número real). Cuando hay
  // un término de búsqueda se consulta directamente contra la tabla.
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    if (DEV_ROLE) {
      const ql = q.toLowerCase();
      setSearchResults(MOCK_WHITELIST.filter(r =>
        r.document_number.includes(ql) || r.ficha_number.includes(ql)
        || (r.full_name || "").toLowerCase().includes(ql)
        || (r.program   || "").toLowerCase().includes(ql)));
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const esc = q.replace(/[%,]/g, "");
      const { data, error } = await supabase
        .from("aprendiz_whitelist")
        .select("*")
        .or(`document_number.ilike.%${esc}%,ficha_number.ilike.%${esc}%,full_name.ilike.%${esc}%,program.ilike.%${esc}%`)
        .order("uploaded_at", { ascending: false })
        .limit(200);
      if (!error) setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // ─── File parsing ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const isCSV  = file.name.toLowerCase().endsWith(".csv");
    const isXLSX = file.name.toLowerCase().match(/\.xlsx?$/);
    if (!isCSV && !isXLSX) {
      toast.error("Formato no soportado. Usa archivos .csv o .xlsx");
      return;
    }

    try {
      let rows;
      if (isCSV) {
        const text = await file.text();
        rows = parseCSVText(text);
      } else {
        const buffer = await file.arrayBuffer();
        rows = await parseExcelBuffer(buffer);
      }

      if (rows.length === 0) {
        toast.error("No se encontraron filas válidas en el archivo");
        return;
      }

      setPreview({ rows, filename: file.name });
    } catch (err) {
      toast.error(err.message || "Error al leer el archivo");
    }
  }, []);

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  // ─── Import ──────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!preview) return;
    if (!importSede) { toast.error("Selecciona a qué sede pertenecen las fichas de este archivo"); return; }
    setImporting(true);
    if (DEV_ROLE) {
      toast.success(`Importación completa (demo): ${preview.rows.length} nuevos`);
      setPreview(null);
      setImportSede("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImporting(false);
      return;
    }
    try {
      const rawRows = preview.rows.map(r => ({
        ...r,
        uploaded_by: profile?.id ?? null,
        uploaded_at: new Date().toISOString(),
      }));

      // Deduplicar por clave única antes del upsert — PostgreSQL no puede
      // actualizar la misma fila dos veces en un mismo batch
      const seen = new Map();
      for (const r of rawRows) {
        seen.set(`${r.document_number}|${r.ficha_number}`, r);
      }
      const rows = Array.from(seen.values());

      // Verificar cuáles document_number+ficha_number ya existían, para poder
      // informar nuevos vs. actualizados (el upsert sobrescribe sin avisar)
      const docNumbers = [...new Set(rows.map(r => r.document_number))];
      const existingKeys = new Set();
      for (let i = 0; i < docNumbers.length; i += 500) {
        const chunk = docNumbers.slice(i, i + 500);
        const { data: existing, error: existErr } = await supabase
          .from("aprendiz_whitelist")
          .select("document_number, ficha_number")
          .in("document_number", chunk);
        if (existErr) throw existErr;
        existing?.forEach(e => existingKeys.add(`${e.document_number}|${e.ficha_number}`));
      }
      const updatedCount = rows.filter(r => existingKeys.has(`${r.document_number}|${r.ficha_number}`)).length;
      const newCount = rows.length - updatedCount;

      // Upsert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("aprendiz_whitelist")
          .upsert(batch, { onConflict: "document_number,ficha_number" });
        if (error) throw error;
      }

      // Asignar la sede elegida a todas las fichas distintas de este archivo
      const fichaNumbers = [...new Set(rows.map(r => r.ficha_number))];
      const fichaRows = fichaNumbers.map(ficha_number => ({ ficha_number, sede_id: parseInt(importSede) }));
      for (let i = 0; i < fichaRows.length; i += 500) {
        const batch = fichaRows.slice(i, i + 500);
        const { error: fichaErr } = await supabase.from("fichas").upsert(batch, { onConflict: "ficha_number" });
        if (fichaErr) throw fichaErr;
      }

      const dupes = rawRows.length - rows.length;
      const parts = [];
      if (newCount > 0)     parts.push(`${newCount} nuevos`);
      if (updatedCount > 0) parts.push(`${updatedCount} actualizados`);
      toast.success(
        `Importación completa: ${parts.join(", ")}, ${fichaNumbers.length} ficha${fichaNumbers.length !== 1 ? "s" : ""} asignada${fichaNumbers.length !== 1 ? "s" : ""} a su sede` +
        (dupes > 0 ? ` (${dupes} duplicados en el archivo ignorados)` : "")
      );
      setPreview(null);
      setImportSede("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadWhitelist();
      await loadFichaSedes();
    } catch (err) {
      toast.error("Error al importar: " + (err.message || "intenta de nuevo"));
    } finally {
      setImporting(false);
    }
  };

  // ─── Delete one ──────────────────────────────────────────────────────────
  const handleDeleteOne = async (id) => {
    if (DEV_ROLE) {
      setWhitelist(prev => prev.filter(r => r.id !== id));
      setTotalCount(prev => prev - 1);
      toast.success("Eliminado (demo)");
      return;
    }
    const { error } = await supabase.from("aprendiz_whitelist").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    setWhitelist(prev => prev.filter(r => r.id !== id));
    setTotalCount(prev => prev - 1);
  };

  // ─── Clear all ───────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    setClearing(true);
    if (DEV_ROLE) {
      toast.success("Lista borrada (demo).");
      setWhitelist([]);
      setTotalCount(0);
      setConfirmClear(false);
      setClearing(false);
      return;
    }
    const { error } = await supabase.from("aprendiz_whitelist").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Error al borrar la lista"); setClearing(false); return; }
    toast.success("Lista borrada. Todos los aprendices pueden registrarse libremente.");
    setWhitelist([]);
    setTotalCount(0);
    setConfirmClear(false);
    setClearing(false);
  };

  // ─── Download template ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv = "cedula,ficha,nombre,programa\n1001234567,2847193,Juan Pérez,Desarrollo de Software\n1009876543,2851024,María García,Contabilidad\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "plantilla_fichas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Lista a mostrar ─────────────────────────────────────────────────────
  // Con búsqueda activa se muestran los resultados server-side (searchResults);
  // sin búsqueda, los últimos 200 registros cargados (whitelist).
  const filtered = search.trim() ? (searchResults ?? []) : whitelist;

  return (
    <>
      <style>{`
        .fichas-page { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 3rem; font-family: var(--font-sans, 'DM Sans', system-ui, sans-serif); }
        .drop-zone { border: 2px dashed #d0d7de; border-radius: 14px; padding: 2.5rem 1.5rem; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .drop-zone:hover, .drop-zone.drag { border-color: #39a900; background: #f0fce4; }
        .wl-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .wl-table th { background: #f6f8fa; padding: 0.625rem 0.875rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6e7681; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
        .wl-table td { padding: 0.625rem 0.875rem; border-bottom: 1px solid #f3f4f6; color: #24292f; vertical-align: middle; }
        .wl-table tr:last-child td { border-bottom: none; }
        .wl-table tr:hover td { background: #f9fafb; }
        .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
      `}</style>

      <div className="fichas-page">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.75rem" }}>
          <button
            onClick={() => navigate(backRoute)}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontWeight: 600, color: "#6e7681", cursor: "pointer" }}
          >
            <ChevronLeft size={15} /> {canToggle ? "Admin" : "Inicio"}
          </button>
          <div>
            <h1 style={{ fontFamily: "'Sora', system-ui", fontWeight: 800, fontSize: "1.375rem", color: "#0d1117", margin: 0, letterSpacing: "-0.02em" }}>
              Control de Fichas Activas
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>
              Lista de aprendices habilitados para registrarse en la plataforma
            </p>
          </div>
        </div>

        {/* Toggle de validación — solo ADMIN y SUPERADMIN */}
        {canToggle && <div style={{ background: "white", border: `1.5px solid ${wlEnabled ? "#86efac" : "#e5e7eb"}`, borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", transition: "border-color 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                {wlEnabled
                  ? <CheckCircle2 size={16} color="#16a34a" />
                  : <AlertCircle  size={16} color="#f59e0b" />}
                <span style={{ fontFamily: "'Sora',system-ui", fontWeight: 700, fontSize: "0.9375rem", color: "#0d1117" }}>
                  Validación de registro
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#6e7681", margin: 0, lineHeight: 1.5 }}>
                {wlEnabled
                  ? "Activa — solo aprendices que aparezcan en el padrón pueden crear cuenta o iniciar sesión."
                  : "Inactiva — cualquier persona puede registrarse sin restricción."}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              onClick={() => toggleWhitelistEnabled(!wlEnabled)}
              disabled={togglingWl}
              title={wlEnabled ? "Desactivar validación" : "Activar validación"}
              style={{
                position: "relative", width: 52, height: 28, borderRadius: 9999,
                background: wlEnabled ? "#39a900" : "#d1d5db",
                border: "none", cursor: togglingWl ? "not-allowed" : "pointer",
                transition: "background 0.2s", flexShrink: 0, opacity: togglingWl ? 0.6 : 1,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: wlEnabled ? 27 : 3,
                width: 22, height: 22, borderRadius: "50%", background: "white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
              }} />
            </button>
          </div>

          {/* Advertencia: activa pero lista vacía */}
          {wlEnabled && totalCount === 0 && (
            <div style={{ marginTop: "0.875rem", display: "flex", alignItems: "flex-start", gap: "0.625rem", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "0.75rem 1rem" }}>
              <AlertCircle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: "0.8125rem", color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                <strong>Atención:</strong> La validación está activa pero la lista de fichas está vacía — ningún aprendiz podrá registrarse ni iniciar sesión. Sube un archivo con las fichas activas.
              </p>
            </div>
          )}
        </div>}

        {/* Sedes por ficha */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <MapPin size={16} color="#0ea5e9" />
            <h2 style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "1rem", color: "#0d1117", margin: 0 }}>
              Sede por ficha
            </h2>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: "0 0 1rem" }}>
            Cada aprendiz hereda automáticamente la sede de su ficha al registrarse. Normalmente esto se asigna solo
            al <strong>subir el archivo</strong> más abajo (eliges la sede una vez para todas las fichas del documento).
            Usa esto solo para corregir o agregar una ficha suelta.
          </p>

          {/* Agregar / asignar */}
          <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Número de ficha"
              value={newFicha.ficha_number}
              onChange={e => setNewFicha(f => ({ ...f, ficha_number: e.target.value }))}
              style={{ flex: "1 1 160px", padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontFamily: "monospace", outline: "none" }}
            />
            <select
              value={newFicha.sede_id}
              onChange={e => setNewFicha(f => ({ ...f, sede_id: e.target.value }))}
              style={{ flex: "1 1 180px", padding: "0.5rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", color: newFicha.sede_id ? "#0d1117" : "#9ca3af", background: "white", outline: "none" }}
            >
              <option value="">Seleccionar sede…</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              onClick={() => saveFichaSede(newFicha.ficha_number, newFicha.sede_id)}
              disabled={savingFichaSede === newFicha.ficha_number}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", background: "#39a900", color: "white", border: "none", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}
            >
              <Plus size={14} /> Asignar
            </button>
          </div>

          {/* Lista de fichas asignadas */}
          {loadingFichaSedes ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>Cargando…</div>
          ) : fichaSedes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>Ninguna ficha tiene sede asignada todavía</div>
          ) : (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <table className="wl-table">
                <thead>
                  <tr>
                    <th>Ficha</th>
                    <th>Sede</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fichaSedes.map(f => (
                    <tr key={f.ficha_number}>
                      <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{f.ficha_number}</td>
                      <td>{f.sedes?.name || <span style={{ color: "#6b7280" }}>—</span>}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => removeFichaSede(f.ficha_number)}
                          disabled={savingFichaSede === f.ficha_number}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", padding: "0.25rem", display: "inline-flex", borderRadius: 6 }}
                          onMouseOver={e => e.currentTarget.style.color = "#dc2626"}
                          onMouseOut={e => e.currentTarget.style.color = "#e5e7eb"}
                          title="Quitar asignación"
                          aria-label={`Quitar sede de la ficha ${f.ficha_number}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.875rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <Users size={15} color="#39a900" />
              <span style={{ fontSize: "0.75rem", color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Aprendices en lista</span>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0d1117", letterSpacing: "-0.03em" }}>
              {loadingList ? "—" : totalCount.toLocaleString("es-CO")}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
              {totalCount > 0 ? `${totalCount} registros cargados` : "Lista vacía"}
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <FileSpreadsheet size={15} color="#3b82f6" />
              <span style={{ fontSize: "0.75rem", color: "#6e7681", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Estado del registro</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              {wlEnabled ? (
                <span className="badge" style={{ background: "#dafbe1", color: "#1a7f37" }}>
                  <CheckCircle2 size={12} /> Validación activa
                </span>
              ) : (
                <span className="badge" style={{ background: "#fff8e1", color: "#b45309" }}>
                  <AlertCircle size={12} /> Registro abierto
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
              {wlEnabled ? "Solo aprendices del padrón" : "Sin restricción de acceso"}
            </div>
          </div>
        </div>

        {/* Upload section */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "1rem", color: "#0d1117", margin: 0 }}>
              Importar archivo
            </h2>
            <button
              onClick={downloadTemplate}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4rem 0.75rem", background: "white", border: "1.5px solid #d0d7de", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600, color: "#6e7681", cursor: "pointer" }}
            >
              <Download size={13} /> Plantilla CSV
            </button>
          </div>

          {/* Sede del archivo — se aplica a todas las fichas que traiga */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
              Sede de este archivo
            </label>
            <select
              value={importSede}
              onChange={e => setImportSede(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", color: importSede ? "#0d1117" : "#9ca3af", background: "white", outline: "none", boxSizing: "border-box" }}
            >
              <option value="">Seleccionar sede…</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.375rem 0 0" }}>
              Todas las fichas de este archivo quedarán asignadas a esta sede.
            </p>
          </div>

          {/* Drop zone */}
          {!preview && (
            <div
              className={`drop-zone${dragging ? " drag" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={32} color="#39a900" style={{ marginBottom: "0.75rem" }} />
              <p style={{ fontWeight: 600, color: "#24292f", margin: "0 0 0.375rem", fontSize: "0.9375rem" }}>
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p style={{ color: "#6b7280", fontSize: "0.8125rem", margin: "0 0 0.75rem" }}>
                Formatos soportados: <strong>.csv</strong> y <strong>.xlsx</strong>
              </p>
              <div style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                {["cedula (requerida)", "ficha (requerida)", "nombre (opcional)", "programa (opcional)"].map(col => (
                  <span key={col} className="badge" style={{ background: "#f3f4f6", color: "#6e7681" }}>{col}</span>
                ))}
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleInputChange}
            style={{ display: "none" }}
          />

          {/* Preview */}
          {preview && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <FileSpreadsheet size={16} color="#39a900" />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0d1117" }}>{preview.filename}</span>
                  <span className="badge" style={{ background: "#dafbe1", color: "#1a7f37" }}>{preview.rows.length} filas válidas</span>
                </div>
                <button
                  onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}
                  aria-label="Cancelar importación"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preview table */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: "1rem", maxHeight: 260, overflowY: "auto" }}>
                <table className="wl-table">
                  <thead>
                    <tr>
                      <th>Cédula</th>
                      <th>Ficha</th>
                      <th>Nombre</th>
                      <th>Programa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.document_number}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.ficha_number}</td>
                        <td>{r.full_name || <span style={{ color: "#6b7280" }}>—</span>}</td>
                        <td>{r.program || <span style={{ color: "#6b7280" }}>—</span>}</td>
                      </tr>
                    ))}
                    {preview.rows.length > 20 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic", padding: "0.75rem" }}>
                          … y {preview.rows.length - 20} filas más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "#39a900", color: "white", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.7 : 1 }}
                >
                  {importing ? <RefreshCw size={15} style={{ animation: "spin 0.6s linear infinite" }} /> : <Upload size={15} />}
                  {importing ? "Importando…" : `Importar ${preview.rows.length} aprendices`}
                </button>
                <button
                  onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ padding: "0.75rem 1rem", background: "white", border: "1.5px solid #d0d7de", borderRadius: 10, fontSize: "0.9rem", fontWeight: 600, color: "#6e7681", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current list */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "1rem", color: "#0d1117", margin: 0 }}>
              Lista actual
              {totalCount > 0 && <span className="badge" style={{ background: "#f3f4f6", color: "#6e7681", marginLeft: "0.5rem" }}>{totalCount}</span>}
            </h2>
            <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                <input
                  type="text"
                  placeholder="Buscar cédula, ficha, nombre…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: "2rem", paddingRight: "0.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.8125rem", outline: "none", width: 220, fontFamily: "inherit" }}
                />
              </div>
              {totalCount > 0 && !confirmClear && (
                <button
                  onClick={() => setConfirmClear(true)}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "white", border: "1.5px solid #fca5a5", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600, color: "#dc2626", cursor: "pointer" }}
                >
                  <Trash2 size={13} /> Borrar todo
                </button>
              )}
              {confirmClear && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#dc2626", fontWeight: 600 }}>¿Seguro?</span>
                  <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    style={{ padding: "0.5rem 0.875rem", background: "#dc2626", color: "white", border: "none", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    {clearing ? "Borrando…" : "Sí, borrar"}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    style={{ padding: "0.5rem 0.75rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.8125rem", fontWeight: 600, color: "#6e7681", cursor: "pointer" }}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {loadingList || searching ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
              <RefreshCw size={20} style={{ animation: "spin 0.6s linear infinite", marginBottom: "0.5rem" }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>{searching ? "Buscando…" : "Cargando lista…"}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <Users size={32} color="#e5e7eb" style={{ marginBottom: "0.75rem" }} />
              <p style={{ fontWeight: 600, color: "#6e7681", margin: "0 0 0.25rem" }}>
                {totalCount === 0 ? "La lista está vacía" : "Sin resultados"}
              </p>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>
                {totalCount === 0
                  ? "Sube un archivo CSV o Excel para habilitar la validación de registro"
                  : "Prueba con otro término de búsqueda"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="wl-table">
                <thead>
                  <tr>
                    <th>Cédula</th>
                    <th>Ficha</th>
                    <th>Nombre</th>
                    <th>Programa</th>
                    <th>Importado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", fontWeight: 600, color: "#0d1117" }}>{r.document_number}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.ficha_number}</td>
                      <td>{r.full_name || <span style={{ color: "#6b7280" }}>—</span>}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.program || <span style={{ color: "#6b7280" }}>—</span>}
                      </td>
                      <td style={{ color: "#6e7681", fontSize: "0.8rem" }}>
                        {new Date(r.uploaded_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteOne(r.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", padding: "0.25rem", display: "flex", borderRadius: 6, transition: "color 0.15s" }}
                          onMouseOver={e => e.currentTarget.style.color = "#dc2626"}
                          onMouseOut={e => e.currentTarget.style.color = "#e5e7eb"}
                          title="Eliminar"
                          aria-label={`Eliminar ${r.full_name || r.document_number}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!search.trim() && totalCount > 200 && (
                <p style={{ textAlign: "center", padding: "0.75rem", color: "#6b7280", fontSize: "0.8125rem", margin: 0, borderTop: "1px solid #f3f4f6" }}>
                  Mostrando los primeros 200 registros. Usa la búsqueda para encontrar registros específicos.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
