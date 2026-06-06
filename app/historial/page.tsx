import { HistoryTimeline } from "@/components/HistoryTimeline";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const params = await searchParams;

  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Historial</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Servicios pasados y actividad reciente.</h1>
        </div>
        <HistoryTimeline focusBookingId={params.booking || ""} />
      </div>
    </ProtectedRoute>
  );
}
