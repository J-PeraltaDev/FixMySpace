import { ServiceRequestDetail } from "@/components/ServiceRequestDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceRequestDetailPage({ params }: Props) {
  const { id } = await params;
  return <ServiceRequestDetail requestId={id} />;
}