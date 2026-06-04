import { NotificationsCenter } from "@/components/NotificationsCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Notificaciones</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Centro de avisos internos.</h1>
        </div>
        <NotificationsCenter />
      </div>
    </ProtectedRoute>
  );
}
