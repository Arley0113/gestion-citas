// Normaliza número de documento para comparación contra aprendiz_whitelist:
// quita puntos, guiones y espacios (formatos comunes en exportes colombianos,
// ej. "1.001.234.567") para que import/registro/login comparen el mismo valor.
export function normalizeDocNumber(value) {
  return String(value ?? "").trim().replace(/[.\-\s]/g, "");
}
