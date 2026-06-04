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
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-sky-50 text-sky-800 ring-sky-200",
  scheduled: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
  unread: "bg-emerald-700 text-white ring-emerald-700",
  read: "bg-slate-100 text-slate-600 ring-slate-200",
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  attended: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status] || statusStyles.read}`}>
      {statusLabels[status] || status}
    </span>
  );
}
