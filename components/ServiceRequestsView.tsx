"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchUserRequests } from "@/lib/firebase-data";
import type { ServiceRequest } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function ServiceRequestsView() {
    const { profile } = useAuth();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!profile) return;
        fetchUserRequests(profile.uid, profile.role)
            .then(setRequests)
            .catch(() => setError("No pudimos cargar tus solicitudes. Intenta más tarde."))
            .finally(() => setLoading(false));
    }, [profile]);

    const open = requests.filter((r) => !r.workerId && r.status === "pending");
    const assigned = requests.filter((r) => r.workerId || r.status !== "pending");

    return (
        <div className="page-shell">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="eyebrow">Mis solicitudes</p>
                    <h1 className="mt-3 text-4xl font-black text-slate-950">Gestiona tus solicitudes</h1>
                    <p className="mt-3 text-slate-600">
                        Revisa el estado de cada solicitud, ve los postulantes o coordina con tu trabajador.
                    </p>
                </div>
                <Link href="/solicitudes/nueva" className="primary-button">
                    Nueva solicitud
                </Link>
            </div>

            {error && (
                <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>
            )}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="soft-card h-44 animate-pulse bg-white" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <EmptyState
                    title="No tienes solicitudes"
                    message="Crea tu primera solicitud y conecta con trabajadores disponibles."
                    actionHref="/solicitudes/nueva"
                    actionLabel="Crear solicitud"
                />
            ) : (
                <div className="grid gap-8">
                    {/* Solicitudes abiertas */}
                    {open.length > 0 && (
                        <section className="grid gap-4">
                            <h2 className="section-title">Abiertas — esperando postulantes ({open.length})</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {open.map((request) => (
                                    <RequestCard key={request.id} request={request} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Solicitudes asignadas o en otro estado */}
                    {assigned.length > 0 && (
                        <section className="grid gap-4">
                            <h2 className="section-title">En curso o finalizadas ({assigned.length})</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {assigned.map((request) => (
                                    <RequestCard key={request.id} request={request} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

function RequestCard({ request }: { request: ServiceRequest }) {
    const isOpen = !request.workerId && request.status === "pending";

    return (
        <article className="soft-card flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#5f5e5a]">
                        {request.category} · {request.municipality}
                    </p>
                    <h3 className="mt-1 font-black text-[#191c1b]">{request.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[#414845]">{request.description}</p>
                </div>
                <StatusBadge status={request.status} />
            </div>

            <div className="grid gap-1 text-sm text-[#5f5e5a]">
                {request.preferredDate && (
                    <span>📅 {request.preferredDate}{request.preferredTime && ` a las ${request.preferredTime}`}</span>
                )}
                {request.price && (
                    <span>💰 ${request.price.toLocaleString("es-CO")} COP</span>
                )}
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/solicitudes/${request.id}`} className="primary-button">
                    {isOpen ? "Ver postulantes" : "Ver detalle"}
                </Link>
                {request.workerId && (
                    <Link href={`/chat/${request.workerId}`} className="secondary-button">
                        Mensaje al trabajador
                    </Link>
                )}
            </div>
        </article>
    );
}