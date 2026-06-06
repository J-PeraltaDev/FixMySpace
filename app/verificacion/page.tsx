import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VerificationPanel } from "@/components/VerificationPanel";

export default function VerificationPage() {
  return (
    <ProtectedRoute allowedRoles={["trabajador", "admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Verificación</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Estado y revisión de perfiles profesionales.</h1>
        </div>
        <VerificationPanel />
      </div>
    </ProtectedRoute>
  );
}
