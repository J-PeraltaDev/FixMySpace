import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ServiceRequestForm } from "@/components/ServiceRequestForm";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ worker?: string }>;
}) {
  const params = await searchParams;

  return (
    <ProtectedRoute allowedRoles={["cliente", "admin"]}>
      <ServiceRequestForm workerId={params.worker} />
    </ProtectedRoute>
  );
}
