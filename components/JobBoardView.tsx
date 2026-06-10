"use client";

import { useEffect, useState } from "react";
import { fetchOpenServiceRequests, createJobApplication, fetchApplicationsByWorker } from "@/lib/firebase-data";
import { serviceCategories, municipalities } from "@/lib/catalog";
import { createNotification } from "@/lib/firebase-data";
import type { ServiceRequest, JobApplication } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";

export function JobBoardView() {
    const { profile } = useAuth();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [myApplications, setMyApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filtros
    const [categoryFilter, setCategoryFilter] = useState("");
    const [municipalityFilter, setMunicipalityFilter] = useState("");

    // Modal de postulación
    const [applying, setApplying] = useState<ServiceRequest | null>(null);
    const [message, setMessage] = useState("");
    const [applyLoading, setApplyLoading] = useState(false);
    const [applyError, setApplyError] = useState("");
    const [applySuccess, setApplySuccess] = useState("");

    useEffect(() => {
        if (!profile) return;
        loadData();
    }, [profile]);

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const [openRequests, applications] = await Promise.all([
                fetchOpenServiceRequests(),
                fetchApplicationsByWorker(profile!.uid),
            ]);
            setRequests(openRequests);
            setMyApplications(applications);
        } catch {
            setError("No pudimos cargar la bolsa de trabajos. Intenta más tarde.");
        } finally {
            setLoading(false);
        }
    }

    function alreadyApplied(requestId: string) {
        return myApplications.some((a) => a.requestId === requestId);
    }

    const filtered = requests.filter((r) => {
        if (categoryFilter && r.category !== categoryFilter) return false;
        if (municipalityFilter && r.municipality !== municipalityFilter) return false;
        return true;
    });

    async function handleApply() {
        if (!applying || !profile) return;
        setApplyLoading(true);
        setApplyError("");
        setApplySuccess("");
        try {
            await createJobApplication({
                requestId: applying.id,
                clientId: applying.clientId,
                message,
            });

            // Notificar al cliente
            await createNotification({
                userId: applying.clientId,
                type: "jobApplication",
                title: "Nuevo postulante",
                message: `${profile.fullName} se postuló para tu solicitud "${applying.title}".`,
                relatedEntityId: applying.id,
                relatedEntityType: "serviceRequest",
            });

            setApplySuccess("¡Te postulaste exitosamente! El cliente revisará tu perfil.");
            // Refrescar mis postulaciones
            const updated = await fetchApplicationsByWorker(profile.uid);
            setMyApplications(updated);
        } catch (err) {
            setApplyError(err instanceof Error ? err.message : "No pudimos enviar la postulación.");
        } finally {
            setApplyLoading(false);
        }
    }

    function closeModal() {
        setApplying(null);
        setMessage("");
        setApplyError("");
        setApplySuccess("");
    }

    return (
        <div className="page-shell">
            <div className="mb-8 max-w-3xl">
                <p className="eyebrow">Bolsa de trabajos</p>
                <h1 className="mt-3 text-4xl font-black text-slate-950">Trabajos disponibles</h1>
                <p className="mt-3 text-slate-600">
                    Solicitudes publicadas por clientes sin trabajador asignado. Postúlate y el cliente te contactará.
                </p>
            </div>

            {/* Filtros */}
            <div className="mb-6 flex flex-wrap gap-3">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-[#c0c8c4] bg-white px-3 py-2 text-sm font-semibold text-[#414845]"
                >
                    <option value="">Todas las categorías</option>
                    {serviceCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <select
                    value={municipalityFilter}
                    onChange={(e) => setMunicipalityFilter(e.target.value)}
                    className="rounded-lg border border-[#c0c8c4] bg-white px-3 py-2 text-sm font-semibold text-[#414845]"
                >
                    <option value="">Todos los municipios</option>
                    {municipalities.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                {(categoryFilter || municipalityFilter) && (
                    <button
                        type="button"
                        onClick={() => { setCategoryFilter(""); setMunicipalityFilter(""); }}
                        className="secondary-button"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Lista */}
            {error && (
                <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{error}</p>
            )}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="soft-card h-48 animate-pulse bg-white" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    title="No hay trabajos disponibles"
                    message="Aún no hay solicitudes abiertas con estos filtros. Vuelve pronto."
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((request) => {
                        const applied = alreadyApplied(request.id);
                        return (
                            <article key={request.id} className="soft-card flex flex-col gap-4 p-5">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#5f5e5a]">
                                        {request.category} · {request.municipality}
                                    </p>
                                    <h2 className="mt-1 text-lg font-black text-[#191c1b]">{request.title}</h2>
                                    <p className="mt-2 line-clamp-3 text-sm text-[#414845]">{request.description}</p>
                                </div>

                                <div className="mt-auto grid gap-1 text-sm text-[#5f5e5a]">
                                    {request.preferredDate && (
                                        <span>📅 {request.preferredDate} {request.preferredTime && `a las ${request.preferredTime}`}</span>
                                    )}
                                    {request.price && (
                                        <span>💰 ${request.price.toLocaleString("es-CO")} COP</span>
                                    )}
                                    {request.address && (
                                        <span>📍 {request.address}</span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={applied}
                                    onClick={() => { setApplying(request); setApplySuccess(""); }}
                                    className={applied ? "secondary-button cursor-not-allowed opacity-60" : "primary-button"}
                                >
                                    {applied ? "Ya te postulaste" : "Postularme"}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Modal de postulación */}
            {applying && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="soft-card w-full max-w-md p-6">
                        <h2 className="text-xl font-black text-[#191c1b]">Postularse al trabajo</h2>
                        <p className="mt-1 text-sm text-[#5f5e5a]">{applying.title}</p>

                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-[#191c1b]">
                                Mensaje al cliente <span className="font-normal text-[#5f5e5a]">(opcional)</span>
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                placeholder="Preséntate brevemente, menciona tu experiencia con este tipo de trabajo..."
                                className="mt-2 w-full rounded-xl border border-[#c0c8c4] bg-[#f2f4f2] px-4 py-3 text-sm text-[#191c1b] placeholder:text-[#9e9e9e] focus:border-[#00261e] focus:outline-none"
                            />
                        </div>

                        {applyError && (
                            <p className="mt-3 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{applyError}</p>
                        )}
                        {applySuccess && (
                            <p className="mt-3 rounded-lg bg-[#bfecdd] px-4 py-3 text-sm font-semibold text-[#00261e]">{applySuccess}</p>
                        )}

                        <div className="mt-5 flex gap-3">
                            {!applySuccess ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={applyLoading}
                                        className="primary-button flex-1"
                                    >
                                        {applyLoading ? "Enviando..." : "Confirmar postulación"}
                                    </button>
                                    <button type="button" onClick={closeModal} className="secondary-button">
                                        Cancelar
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={closeModal} className="primary-button flex-1">
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}