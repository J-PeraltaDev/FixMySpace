import { ChatThread } from "@/components/ChatThread";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <ChatThread conversationId={id} />
    </ProtectedRoute>
  );
}
