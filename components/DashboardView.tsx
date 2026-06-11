"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";
import type { Booking, Notification, PublicProfile, ServiceRequest } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { BookingCard } from "./BookingCard";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import { MetricCard } from "./ui/MetricCard";

export function DashboardView() {
  const { profile } = useAuth();
  const role = profile?.role || "cliente";
  const userId = profile?.uid || "";
  const userField = role === "trabajador" ? "workerId" : "clientId";
  const collectionEnabled = Boolean(profile);
  const {
    data: bookings,
    loading: bookingsLoading,
    error: bookingsError,
  } = useCollection<Booking>(
    "bookings",
    [{ field: userField, op: "==", value: userId }],
    { enabled: collectionEnabled },
  );
  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
  } = useCollection<ServiceRequest>(
    "serviceRequests",
    [{ field: userField, op: "==", value: userId }],
    { enabled: collectionEnabled },
  );
  const {
    data: notifications,
    loading: notificationsLoading,
    error: notificationsError,
  } = useCollection<Notification>(
    "notifications",
    [{ field: "userId", op: "==", value: userId }],
    { enabled: collectionEnabled },
  );
  const { data: publicProfiles } = useCollection<PublicProfile>("publicProfiles", [], { enabled: collectionEnabled });
  const publicNameById = new Map(publicProfiles.map((item) => [item.uid, item.fullName]));

  const unread = notifications.filter((item) => !item.read).length;
  const activeServices = bookings.filter((booking) => !["completed", "cancelled"].includes(booking.status)).length;

  function historyHrefForRequest(request: ServiceRequest) {
    const booking = bookings.find((item) => item.requestId === request.id);
    return booking ? `/historial?booking=${booking.id}` : "/historial";
  }

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Panel {role}</p>
          <h1 className="mt-3 text-4xl font-bold text-[#191c1b]">
            {profile ? `Hola, ${profile.fullName.split(" ")[0]}` : "Gestiona tu actividad en FixMySpace"}
          </h1>
          <p className="mt-3 max-w-2xl text-[#414845]">Resumen de servicios, agenda, mensajes y notificaciones internas.</p>
        </div>
        <Link href={role === "admin" ? "/admin" : role === "trabajador" ? "/perfil" : "/solicitudes/nueva"} className="primary-button">
          {role === "admin" ? "Administrar" : role === "trabajador" ? "Completar perfil" : "Nueva solicitud"}
        </Link>
      </div>

      <div className="grid gap-6">
        <section className="grid gap-6">
          {notificationsError && <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">No pudimos leer tus notificaciones desde Firestore.</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Servicios activos" value={activeServices} loading={bookingsLoading} />
            <MetricCard label="Notificaciones nuevas" value={unread} loading={notificationsLoading} />
            <MetricCard label="Solicitudes" value={requests.length} loading={requestsLoading} />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              <h2 className="section-title">Próximos servicios</h2>
              {bookingsError ? (
                <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">No pudimos cargar tus servicios desde Firestore.</p>
              ) : bookingsLoading ? (
                <div className="soft-card h-36 animate-pulse bg-white" />
              ) : bookings.length ? (
                bookings.map((booking) => {
                  const counterpartId = role === "trabajador" ? booking.clientId : booking.workerId;
                  return <BookingCard key={booking.id} booking={booking} role={profile?.role} counterpartName={publicNameById.get(counterpartId)} />;
                })
              ) : (
                <EmptyState title="No tienes servicios agendados" message="Cuando crees o aceptes una solicitud, aparecerá aquí con su estado." />
              )}
            </div>

            <div className="grid gap-4">
              <h2 className="section-title">Solicitudes recientes</h2>
              {requestsError ? (
                <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">No pudimos cargar tus solicitudes desde Firestore.</p>
              ) : requestsLoading ? (
                <div className="soft-card h-36 animate-pulse bg-white" />
              ) : requests.length ? (
                requests.map((request) => {
                  const assignedWorkerHref = request.workerId
                    ? `/chat/${request.workerId}`
                    : `/solicitudes/${request.id}`;
                  const assignedWorkerLabel = request.workerId ? "Mensaje al trabajador" : "Ver postulantes";
                  const workerClientHref = request.clientId ? `/chat/${request.clientId}` : "";

                  return (
                    <article key={request.id} className="soft-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-[#191c1b]">{request.title}</h3>
                          <p className="mt-1 text-sm text-[#5f5e5a]">
                            {request.category} · {request.municipality}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {role === "trabajador" ? (
                          <>
                            <Link href={historyHrefForRequest(request)} className="secondary-button">
                              Ver historial
                            </Link>
                            {workerClientHref && (
                              <Link href={workerClientHref} className="primary-button">
                                Mensaje al cliente
                              </Link>
                            )}
                          </>
                        ) : (
                          <>
                            <Link href={assignedWorkerHref} className="primary-button">
                              {assignedWorkerLabel}
                            </Link>
                            <Link href={historyHrefForRequest(request)} className="secondary-button">
                              Ver historial
                            </Link>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyState title="Sin solicitudes todavía" message="Publica una solicitud o revisa las asignadas para empezar a mover tu agenda." actionHref="/solicitudes/nueva" actionLabel="Crear solicitud" />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
