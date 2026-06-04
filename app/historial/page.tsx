import { HistoryTimeline } from "@/components/HistoryTimeline";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function HistorialPage() {
  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Historial</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Servicios pasados y actividad reciente.</h1>
        </div>
        <HistoryTimeline />
      </div>
    </ProtectedRoute>
  );
}
