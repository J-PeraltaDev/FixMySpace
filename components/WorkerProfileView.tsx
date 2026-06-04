"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchReviewsByWorker, fetchWorkerById, timestampToText } from "@/lib/firebase-data";
import { workers as fallbackWorkers } from "@/lib/mock-data";
import type { Review, WorkerProfile } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { RatingForm } from "./RatingForm";
import { WorkerAvatar } from "./WorkerCard";

export function WorkerProfileView({ workerId }: { workerId: string }) {
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorker() {
      setLoading(true);
      setError("");
      try {
        const [firestoreWorker, firestoreReviews] = await Promise.all([fetchWorkerById(workerId), fetchReviewsByWorker(workerId)]);
        if (!cancelled) {
          setWorker(firestoreWorker || fallbackWorkers.find((item) => item.uid === workerId) || null);
          setReviews(firestoreReviews);
        }
      } catch {
        if (!cancelled) {
          setWorker(fallbackWorkers.find((item) => item.uid === workerId) || null);
          setError("No pudimos leer Firestore. Mostramos información de respaldo si existe.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorker();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="soft-card h-96 animate-pulse bg-white" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="page-shell">
        <EmptyState title="Trabajador no encontrado" message="El perfil solicitado no existe o aún no está publicado." actionHref="/buscar" actionLabel="Volver a búsqueda" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      {error && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</p>}
      <section className="soft-card overflow-hidden">
        <div className="bg-emerald-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <WorkerAvatar worker={worker} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl font-black">{worker.fullName}</h1>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${worker.verified ? "bg-white text-emerald-950" : "bg-amber-100 text-amber-900"}`}>
                  {worker.verified ? "Verificado" : "Verificación pendiente"}
                </span>
              </div>
              <p className="mt-2 text-emerald-100">{worker.specialties.length ? worker.specialties.join(" · ") : "Oficios por completar"}</p>
              <p className="mt-4 max-w-3xl text-emerald-50">{worker.bio}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Calificación", worker.ratingAvg ? worker.ratingAvg.toFixed(1) : "Nuevo"],
                ["Trabajos", worker.completedJobs],
                ["Experiencia", `${worker.experienceYears} años`],
                ["Tarifa", worker.hourlyRate ? `$${worker.hourlyRate.toLocaleString("es-CO")}` : "Por acordar"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="section-title">Cobertura</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(worker.coverageAreas.length ? worker.coverageAreas : [worker.municipality]).map((area) => (
                  <span key={area} className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900">
                    {area}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="section-title">Reseñas</h2>
              <div className="mt-3 grid gap-3">
                {reviews.length ? (
                  reviews.map((review) => (
                    <article key={review.id} className="rounded-3xl bg-slate-50 p-4">
                      <p className="font-black text-slate-950">{review.rating} de 5</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{review.comment}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">{timestampToText(review.createdAt)}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">Este perfil aún no tiene reseñas visibles.</p>
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5">
            <h2 className="section-title">Contratar</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Agenda una visita o abre una conversación para aclarar detalles antes del servicio.</p>
            <div className="mt-5 grid gap-3">
              <Link href={`/solicitudes/nueva?worker=${worker.uid}`} className="primary-button">
                Crear solicitud
              </Link>
              <Link href={`/chat/${worker.uid}`} className="secondary-button justify-center">
                Abrir chat
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-6">
        <RatingForm workerId={worker.uid} />
      </div>
    </div>
  );
}
