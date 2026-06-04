import { AdminPanel } from "@/components/AdminPanel";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Administración</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Supervisión operativa de FixMySpace.</h1>
        </div>
        <AdminPanel />
      </div>
    </ProtectedRoute>
  );
}
