import { Link, useLocation } from "react-router-dom";

export default function Unauthorized() {
  const location = useLocation();

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>403 - Acceso Denegado</h1>
      <p>No tienes permisos para ver esta página.</p>
      <Link to={`/${location.search || ""}`}>Volver al inicio</Link>
    </div>
  );
}
