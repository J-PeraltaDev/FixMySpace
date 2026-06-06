const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  scheduled: "Agendada",
  completed: "Completada",
  cancelled: "Cancelada",
  unread: "Nuevo",
  read: "Leído",
  verified: "Verificado",
  rejected: "Rechazado",
  attended: "Atendido",
};

const statusStyles: Record<string, string> = {
  pending: "bg-[#ffdcc0] text-[#542d00] ring-[#ffb876]",
  accepted: "bg-[#e5e2dc] text-[#1c1c18] ring-[#c9c6c1]",
  scheduled: "bg-[#bfecdd] text-[#00261e] ring-[#a4d0c1]",
  completed: "bg-[#eceeec] text-[#414845] ring-[#c0c8c4]",
  cancelled: "bg-[#ffdad6] text-[#93000a] ring-[#ba1a1a]/20",
  unread: "bg-[#00261e] text-white ring-[#00261e]",
  read: "bg-[#eceeec] text-[#5f5e5a] ring-[#c0c8c4]",
  verified: "bg-[#bfecdd] text-[#00261e] ring-[#a4d0c1]",
  rejected: "bg-[#ffdad6] text-[#93000a] ring-[#ba1a1a]/20",
  attended: "bg-[#eceeec] text-[#414845] ring-[#c0c8c4]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status] || statusStyles.read}`}>
      {statusLabels[status] || status}
    </span>
  );
}
