import { MessagesInbox } from "@/components/MessagesInbox";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function MessagesPage() {
  return (
    <ProtectedRoute allowedRoles={["cliente", "trabajador", "admin"]}>
      <div className="page-shell">
        <div className="mb-8">
          <p className="eyebrow">Mensajes</p>
          <h1 className="mt-3 text-4xl font-bold text-[#191c1b]">Conversaciones de servicio.</h1>
          <p className="mt-3 max-w-2xl text-[#414845]">Centraliza los chats con clientes, trabajadores y solicitudes activas.</p>
        </div>
        <MessagesInbox />
      </div>
    </ProtectedRoute>
  );
}
