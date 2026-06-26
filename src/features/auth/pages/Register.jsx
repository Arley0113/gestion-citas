import { Navigate } from "react-router-dom";

// El registro ahora se hace via OAuth en Login.jsx.
// El onboarding (completar datos) vive en Onboarding.jsx.
export default function Register() {
  return <Navigate to="/login" replace />;
}
