"use client";

import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import { timestampToText } from "@/lib/firebase-data";
import type { Booking, JobHistory } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { EvidenceManager } from "./EvidenceManager";
import { StatusBadge } from "./StatusBadge";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";

export function HistoryTimeline({ focusBookingId = "" }: { focusBookingId?: string }) {
  const { profile } = useAuth();
  const userId = profile?.uid || "";
  const userField = profile?.role === "trabajador" ? "workerId" : "clientId";
  const collectionEnabled = Boolean(profile);
  const {
    data: history,
    loading: historyLoading,
    error: historyError,
  } = useCollection<JobHistory>(
    "jobHistory",
    [{ field: "userId", op: "==", value: userId }],
    { enabled: collectionEnabled },
  );
  const {
    data: bookings,
    loading: bookingsLoading,
    error: bookingsError,
  } = useCollection<Booking>(
    "bookings",
    [{ field: userField, op: "==", value: userId }],
    { enabled: collectionEnabled },
  );

  if (historyLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton className="h-44" count={2} />
      </div>
    );
  }

  if (historyError) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">No pudimos cargar tu historial desde Firestore.</p>;
  }

  if (!history.length && bookingsLoading) {
    return (
      <div className="grid gap-4">
        <LoadingSkeleton className="h-44" count={2} />
      </div>
    );
  }

  if (!history.length && bookingsError) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">No pudimos cargar tu historial desde Firestore.</p>;
  }

  const fallbackRows = bookings.map(
    (booking) =>
      ({
        id: booking.id,
        bookingId: booking.id,
        userId: profile?.uid || "",
        service: booking.notes || "Servicio agendado",
        status: booking.status,
        workerId: booking.workerId,
        clientId: booking.clientId,
        events: [booking.notes || "Servicio registrado"],
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt || booking.createdAt,
      }) satisfies JobHistory,
  );
  const rows = history.length ? history : fallbackRows;

  const visibleRows = focusBookingId ? rows.filter((item) => item.bookingId === focusBookingId) : rows;

  if (!visibleRows.length) {
    if (focusBookingId) {
      return <EmptyState title="No encontramos ese servicio en tu historial" message="Revisa el historial completo o vuelve al panel para abrir otro servicio." actionHref="/historial" actionLabel="Ver historial completo" />;
    }
    return <EmptyState title="Tu historial está vacío" message="Los servicios agendados, completados o cancelados aparecerán aquí junto con sus eventos y evidencias." />;
  }

  return (
    <div className="grid gap-4">
      {visibleRows.map((item) => {
        const counterpartId = profile?.role === "trabajador" ? item.clientId : item.workerId;
        const counterpartLabel = profile?.role === "trabajador" ? "Mensaje al cliente" : "Mensaje al trabajador";

        return (
        <article key={item.id} className="soft-card p-5">
          <div className="flex gap-4">
            <div className="mt-1 h-4 w-4 rounded-full bg-emerald-800 ring-8 ring-emerald-50" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{item.service || "Servicio registrado"}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{timestampToText(item.updatedAt || item.createdAt)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Booking: {item.bookingId}</p>
                </div>
                <StatusBadge status={item.status || "completed"} />
              </div>
              {counterpartId && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/chat/${counterpartId}`} className="primary-button">
                    {counterpartLabel}
                  </Link>
                  {focusBookingId && (
                    <Link href="/historial" className="secondary-button">
                      Ver todo el historial
                    </Link>
                  )}
                </div>
              )}
              <div className="mt-4 grid gap-2">
                {item.events.map((event) => (
                  <p key={event} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {event}
                  </p>
                ))}
              </div>
              <EvidenceManager bookingId={item.bookingId} workerId={item.workerId} clientId={item.clientId} />
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}
