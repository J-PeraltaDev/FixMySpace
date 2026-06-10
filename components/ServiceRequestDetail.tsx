"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import {
    fetchApplicationsByRequest,
    acceptJobApplication,
    fetchWorkerById,
    createNotification,
} from "@/lib/firebase-data";
import type { ServiceRequest, JobApplication, WorkerProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

type ApplicationWithWorker = JobApplication & {
    workerProfile?: WorkerProfile;
};

export function ServiceRequestDetail({ requestId }: { requestId: string }) {
    const { profile } = useAuth();
    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [applications, setApplications] = useState<ApplicationWithWorker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [accepting, setAccepting] = useState<string | null>(null); // applicationId en proceso
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    useEffect(() => {
        if (!profile) return;
        loadData();
    }, [profile, requestId]);

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            // Cargar la solicitud
            const requestSnap = await getDoc(doc(db, "serviceRequests", requestId));
            if (!requestSnap.exists()) {
                setError("Esta solicitud no existe.");
                return;
            }
            const requestData = { id: requestSnap.id, ...requestSnap.data() } as ServiceRequest;
            setRequest(requestData);

            // Cargar postulaciones con perfil de cada trabajador
            const apps = await fetchApplicationsByRequest(requestId);
            const appsWithWorkers = await Promise.all(
                apps.map(async (app) => {
                    const workerProfile = await fetchWorkerById(app.workerId);
                    return { ...app, workerProfile: workerProfile ?? undefined };
                }),
            );
            setApplications(appsWithWorkers);
        } catch {
            setError("No pudimos cargar la información. Intenta más tarde.");
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept(application: ApplicationWithWorker) {
        if (!profile || !request) return;
        setAccepting(application.id);
        setActionError("");
        setActionSuccess("");
        try {
            await acceptJobApplication(application, applications);

            // Notificar al trabajador aceptado
            await createNotification({
                userId: application.workerId,
                type: "jobApplication",
                title: "¡Postulación aceptada!",
                message: `${profile.fullName} aceptó tu postulación para "${request.title}". Ya puedes coordinar los detalles.`,
                relatedEntityId: requestId,
                relatedEntityType: "serviceRequest",
            });

            // Notificar a los rechazados
            const rejected = applications.filter((a) => a.id !== application.id);
            await Promise.allSettled(
                rejected.map((a) =>
                    createNotification({
                        userId: a.workerId,
                        type: "jobApplication",
                        title: "Postulación no seleccionada",
                        message: `El cliente eligió a otro trabajador para "${request.title}".`,
                        relatedEntityId: requestId,
                        relatedEntityType: "serviceRequest",
                    }),
                ),
            );

            setActionSuccess(`Aceptaste a ${application.workerProfile?.fullName ?? "el trabajador"}. Ya puede ver la solicitud y coordinar contigo por chat.`);

            // Refrescar datos
            await loadData();
        } catch {
            setActionError("No pudimos procesar la aceptación. Intenta de nuevo.");
        } finally {
            setAccepting(null);
        }
    }

    if (loading) {
        return (
            <div className="page-shell">
                <div className="grid gap-4">
                    <div className="soft-card h-36 animate-pulse bg-white" />
                    <div className="soft-card h-48 animate-pulse bg-white" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-shell">
                <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>
            </div>
        );
    }

    if (!request) return null;

    const isOwner = profile?.uid === request.clientId;
    const isOpen = !request.workerId;
    const pendingApps = applications.filter((a) => a.status === "pending");
    const acceptedApp = applications.find((a) => a.status === "accepted");

    return (
        <div className="page-shell">
            {/* Encabezado */}
            <div className="mb-8 max-w-3xl">
                <p className="eyebrow">Detalle de solicitud</p>
                <h1 className="mt-3 text-4xl font-black text-slate-950">{request.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <StatusBadge status={request.status} />
                    <span className="text-sm text-[#5f5e5a]">{request.category} · {request.municipality}</span>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Columna principal */}
                <div className="grid gap-5">

                    {/* Info de la solicitud */}
                    <section className="soft-card p-5 sm:p-6">
                        <h2 className="section-title">Descripción</h2>
                        <p className="mt-3 text-sm leading-6 text-[#414845]">{request.description}</p>
                        <div className="mt-4 grid gap-2 text-sm text-[#5f5e5a] sm:grid-cols-2">
                            {request.address && <span>📍 {request.address}</span>}
                            {request.preferredDate && (
                                <span>📅 {request.preferredDate}{request.preferredTime && ` a las ${request.preferredTime}`}</span>
                            )}
                            {request.price && (
                                <span>💰 ${request.price.toLocaleString("es-CO")} COP</span>
                            )}
                        </div>
                    </section>

                    {/* Postulantes — solo visible para el dueño con solicitud abierta */}
                    {isOwner && (
                        <section className="soft-card p-5 sm:p-6">
                            <h2 className="section-title">
                                {isOpen ? `Postulantes (${pendingApps.length})` : "Trabajador asignado"}
                            </h2>

                            {actionError && (
                                <p className="mt-3 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{actionError}</p>
                            )}
                            {actionSuccess && (
                                <p className="mt-3 rounded-lg bg-[#bfecdd] px-4 py-3 text-sm font-semibold text-[#00261e]">{actionSuccess}</p>
                            )}

                            {/* Solicitud ya asignada */}
                            {!isOpen && acceptedApp && (
                                <div className="mt-4 rounded-xl bg-[#bfecdd] p-4">
                                    <p className="text-sm font-semibold text-[#00261e]">
                                        Trabajador aceptado: <strong>{acceptedApp.workerProfile?.fullName ?? acceptedApp.workerId}</strong>
                                    </p>
                                    {acceptedApp.message && (
                                        <p className="mt-2 text-sm text-[#414845]">{acceptedApp.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Lista de postulantes pendientes */}
                            {isOpen && pendingApps.length === 0 && (
                                <EmptyState
                                    title="Sin postulantes aún"
                                    message="Cuando un trabajador se postule, aparecerá aquí para que puedas elegir."
                                />
                            )}

                            {isOpen && pendingApps.length > 0 && (
                                <div className="mt-4 grid gap-4">
                                    {pendingApps.map((app) => (
                                        <article key={app.id} className="rounded-xl border border-[#c0c8c4] p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-bold text-[#191c1b]">
                                                        {app.workerProfile?.fullName ?? "Trabajador"}
                                                    </p>
                                                    <p className="mt-0.5 text-sm text-[#5f5e5a]">
                                                        {app.workerProfile?.specialties?.join(", ") || "Sin especialidades registradas"}
                                                    </p>
                                                    {app.workerProfile && (
                                                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#5f5e5a]">
                                                            {app.workerProfile.experienceYears > 0 && (
                                                                <span>⭐ {app.workerProfile.ratingAvg.toFixed(1)} · {app.workerProfile.completedJobs} trabajos</span>
                                                            )}
                                                            {app.workerProfile.municipality && (
                                                                <span>📍 {app.workerProfile.municipality}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {app.message && (
                                                        <p className="mt-3 rounded-lg bg-[#f2f4f2] px-3 py-2 text-sm text-[#414845]">
                                                            "{app.message}"
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={accepting !== null}
                                                    onClick={() => handleAccept(app)}
                                                    className="primary-button shrink-0"
                                                >
                                                    {accepting === app.id ? "Aceptando..." : "Aceptar"}
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="soft-card h-fit p-5 lg:sticky lg:top-24">
                    <h2 className="section-title">Estado</h2>
                    <div className="mt-3 grid gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#5f5e5a]">Estado</span>
                            <StatusBadge status={request.status} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#5f5e5a]">Trabajador</span>
                            <span className="font-semibold text-[#191c1b]">
                                {request.workerId ? "Asignado" : "Sin asignar"}
                            </span>
                        </div>
                        {applications.length > 0 && (
                            <div className="flex justify-between">
                                <span className="text-[#5f5e5a]">Postulantes</span>
                                <span className="font-semibold text-[#191c1b]">{applications.length}</span>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}