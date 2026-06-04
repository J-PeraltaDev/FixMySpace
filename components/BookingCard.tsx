import { workers } from "@/lib/mock-data";
import type { Booking } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function BookingCard({ booking }: { booking: Booking }) {
  const worker = workers.find((item) => item.uid === booking.workerId);

  return (
    <article className="soft-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{worker?.fullName || "Trabajador asignado"}</h3>
          <p className="mt-1 text-sm text-slate-600">{booking.scheduledAt}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{booking.notes}</p>
    </article>
  );
}
