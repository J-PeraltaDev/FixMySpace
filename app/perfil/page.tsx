import { ProfileForm } from "@/components/ProfileForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function PerfilPage() {
  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <ProfileForm />
    </ProtectedRoute>
  );
}
