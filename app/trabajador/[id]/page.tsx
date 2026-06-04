import { WorkerProfileView } from "@/components/WorkerProfileView";

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <WorkerProfileView workerId={id} />;
}
