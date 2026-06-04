import { DashboardView } from "@/components/DashboardView";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <DashboardView />
    </ProtectedRoute>
  );
}
