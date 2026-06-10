import Link from "next/link";
import type { Booking, UserRole } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function BookingCard({ booking, role, counterpartName }: { booking: Booking; role?: UserRole; counterpartName?: string }) {
  const chatTarget = role === "trabajador" ? booking.clientId : booking.workerId;
  const chatLabel = role === "trabajador" ? "Mensaje al cliente" : "Mensaje al trabajador";

  return (
    <article className="soft-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#191c1b]">{counterpartName || "Perfil no disponible"}</h3>
          <p className="mt-1 text-sm text-[#5f5e5a]">{booking.scheduledAt}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-4 rounded-lg bg-[#f2f4f2] p-4 text-sm leading-6 text-[#414845]">{booking.notes}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/historial?booking=${booking.id}`} className="secondary-button">
          Ver historial
        </Link>
        {chatTarget && (
          <Link href={`/chat/${chatTarget}`} className="primary-button">
            {chatLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
