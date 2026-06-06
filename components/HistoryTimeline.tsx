"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchUserBookings, fetchUserHistory, timestampToText } from "@/lib/firebase-data";
import type { Booking, JobHistory } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { EvidenceManager } from "./EvidenceManager";
import { StatusBadge } from "./StatusBadge";

export function HistoryTimeline({ focusBookingId = "" }: { focusBookingId?: string }) {
  const { profile } = useAuth();
  const [history, setHistory] = useState<JobHistory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!profile) return;
      setLoading(true);
      setError("");
      try {
        const [nextHistory, nextBookings] = await Promise.all([fetchUserHistory(profile.uid), fetchUserBookings(profile.uid, profile.role)]);
        if (!cancelled) {
          setHistory(nextHistory);
          setBookings(nextBookings);
        }
      } catch {
        if (!cancelled) setError("No pudimos cargar tu historial desde Firestore.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="grid gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="soft-card h-44 animate-pulse bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>;
  }

  const rows = history.length
    ? history
    : bookings.map(
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
