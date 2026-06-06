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
      {error && <p className="mb-4 rounded-lg bg-[#ffdcc0] px-4 py-3 text-sm font-semibold text-[#542d00]">{error}</p>}
      <section className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="soft-card h-fit p-6 text-center lg:sticky lg:top-24">
          <div className="flex flex-col items-center">
            <WorkerAvatar worker={worker} size="lg" />
            <h1 className="mt-4 text-3xl font-bold text-[#191c1b]">{worker.fullName}</h1>
            <p className="mt-2 text-sm font-semibold text-[#5f5e5a]">{worker.specialties.length ? worker.specialties.join(" · ") : "Oficios por completar"}</p>
            <span className={`mt-4 rounded-lg px-3 py-2 text-xs font-bold ${worker.verified ? "bg-[#bfecdd] text-[#00261e]" : "bg-[#ffdcc0] text-[#542d00]"}`}>
              {worker.verified ? "Identidad verificada" : "Verificacion pendiente"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#f2f4f2] p-3">
              <span className="block text-2xl font-bold text-[#00261e]">{worker.experienceYears}+</span>
              <span className="text-xs font-semibold text-[#5f5e5a]">Años exp.</span>
            </div>
            <div className="rounded-lg bg-[#f2f4f2] p-3">
              <span className="block text-2xl font-bold text-[#00261e]">{worker.completedJobs}</span>
              <span className="text-xs font-semibold text-[#5f5e5a]">Trabajos</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#c0c8c4] bg-[#bfecdd]/30 p-5 text-left">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#414845]">Garantia FixMySpace</h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-[#191c1b]">
              <p>Identidad y perfil revisados</p>
              <p>Historial de trabajos visible</p>
              <p>Calificaciones de clientes</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link href={`/solicitudes/nueva?worker=${worker.uid}`} className="primary-button">
              Crear solicitud
            </Link>
            <Link href={`/chat/${worker.uid}`} className="secondary-button justify-center">
              Abrir chat
            </Link>
          </div>
        </aside>

        <div className="grid gap-8">
          <div>
            <p className="eyebrow">Perfil profesional</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight text-[#191c1b]">Sobre mi trabajo</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#414845]">{worker.bio}</p>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Calificación", worker.ratingAvg ? worker.ratingAvg.toFixed(1) : "Nuevo"],
                ["Trabajos", worker.completedJobs],
                ["Experiencia", `${worker.experienceYears} años`],
                ["Tarifa", worker.hourlyRate ? `$${worker.hourlyRate.toLocaleString("es-CO")}` : "Por acordar"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#c0c8c4] bg-[#f2f4f2] p-4">
                  <p className="text-sm text-[#5f5e5a]">{label}</p>
                  <p className="mt-1 text-xl font-bold text-[#191c1b]">{value}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="section-title">Cobertura</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(worker.coverageAreas.length ? worker.coverageAreas : [worker.municipality]).map((area) => (
                  <span key={area} className="trust-chip">
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
                    <article key={review.id} className="rounded-xl border border-[#c0c8c4] bg-white p-4">
                      <p className="font-bold text-[#191c1b]">{review.rating} de 5</p>
                      <p className="mt-1 text-sm leading-6 text-[#414845]">{review.comment}</p>
                      <p className="mt-2 text-xs font-semibold text-[#5f5e5a]">{timestampToText(review.createdAt)}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-[#c0c8c4] bg-[#f2f4f2] p-4 text-sm text-[#414845]">Este perfil aún no tiene reseñas visibles.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <RatingForm workerId={worker.uid} />
      </div>
    </div>
  );
}
