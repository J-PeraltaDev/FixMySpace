"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { fetchUserBookings, fetchUserRequests } from "@/lib/firebase-data";
import type { Booking, Notification, ServiceRequest } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { BookingCard } from "./BookingCard";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function DashboardView() {
  const { profile } = useAuth();
  const role = profile?.role || "cliente";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!profile) return;
      setLoading(true);
      setError("");
      try {
        const [nextBookings, nextRequests] = await Promise.all([fetchUserBookings(profile.uid, profile.role), fetchUserRequests(profile.uid, profile.role)]);
        if (!cancelled) {
          setBookings(nextBookings);
          setRequests(nextRequests);
        }
      } catch {
        if (!cancelled) setError("No pudimos cargar tu panel desde Firestore.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(query(collection(db, "notifications"), where("userId", "==", profile.uid)), (snapshot) => {
      setNotifications(snapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Notification));
    });
  }, [profile]);

  const quickActions = useMemo(() => {
    if (role === "admin") {
      return [
        { href: "/admin", label: "Panel administrativo" },
        { href: "/verificacion", label: "Verificación" },
        { href: "/mensajes", label: "Mensajes" },
        { href: "/notificaciones", label: "Notificaciones" },
      ];
    }

    if (role === "trabajador") {
      return [
        { href: "/dashboard", label: "Solicitudes y bookings" },
        { href: "/mensajes", label: "Mensajes" },
        { href: "/perfil", label: "Editar perfil profesional" },
        { href: "/verificacion", label: "Estado de verificación" },
        { href: "/historial", label: "Ver historial" },
      ];
    }

    return [
      { href: "/buscar", label: "Buscar trabajadores" },
      { href: "/solicitudes/nueva", label: "Crear solicitud" },
      { href: "/mensajes", label: "Mensajes" },
      { href: "/historial", label: "Ver historial" },
    ];
  }, [role]);

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

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="soft-card h-fit p-4 lg:sticky lg:top-24">
          <nav className="grid gap-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-lg px-4 py-3 text-sm font-bold text-[#414845] transition hover:bg-[#eceeec] hover:text-[#00261e]">
                {action.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="grid gap-6">
          {error && <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <span>Servicios activos</span>
              <strong>{loading ? "..." : activeServices}</strong>
            </div>
            <div className="metric-card">
              <span>Notificaciones nuevas</span>
              <strong>{unread}</strong>
            </div>
            <div className="metric-card">
              <span>Solicitudes</span>
              <strong>{loading ? "..." : requests.length}</strong>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              <h2 className="section-title">Próximos servicios</h2>
              {loading ? (
                <div className="soft-card h-36 animate-pulse bg-white" />
              ) : bookings.length ? (
                bookings.map((booking) => <BookingCard key={booking.id} booking={booking} role={profile?.role} />)
              ) : (
                <EmptyState title="No tienes servicios agendados" message="Cuando crees o aceptes una solicitud, aparecerá aquí con su estado." />
              )}
            </div>

            <div className="grid gap-4">
              <h2 className="section-title">Solicitudes recientes</h2>
              {loading ? (
                <div className="soft-card h-36 animate-pulse bg-white" />
              ) : requests.length ? (
                requests.map((request) => {
                  const assignedWorkerHref = request.workerId ? `/chat/${request.workerId}` : `/buscar?oficio=${encodeURIComponent(request.category)}&municipio=${encodeURIComponent(request.municipality)}`;
                  const assignedWorkerLabel = request.workerId ? "Mensaje al trabajador" : "Buscar trabajador";
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
