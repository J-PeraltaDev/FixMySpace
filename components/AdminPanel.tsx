"use client";

import { arrayUnion, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchAdminCollections, serviceRequestStatuses, timestampToText } from "@/lib/firebase-data";
import type { AdminWorkerProfile, Booking, Notification, Review, ServiceRequest, SupportReport, UserProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import { MetricCard } from "./ui/MetricCard";
import { SectionCard } from "./ui/SectionCard";

type AdminData = {
  users: UserProfile[];
  workers: AdminWorkerProfile[];
  serviceRequests: ServiceRequest[];
  bookings: Booking[];
  reviews: Review[];
  reports: SupportReport[];
  notifications: Notification[];
};

const emptyAdminData: AdminData = {
  users: [],
  workers: [],
  serviceRequests: [],
  bookings: [],
  reviews: [],
  reports: [],
  notifications: [],
};

export function AdminPanel() {
  const { profile } = useAuth();
  const [data, setData] = useState<AdminData>(emptyAdminData);
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminCollections());
    } catch {
      setError("No pudimos cargar el panel administrativo desde Firestore.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      try {
        const nextData = await fetchAdminCollections();
        if (!cancelled) setData(nextData);
      } catch {
        if (!cancelled) setError("No pudimos cargar el panel administrativo desde Firestore.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAdminData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function verifyWorker(worker: AdminWorkerProfile, nextStatus: "verified" | "rejected" | "pending") {
    if (!profile) return;
    setStatus("");
    setError("");
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "workerProfiles", worker.uid), {
        uid: worker.uid,
        role: "trabajador",
        fullName: worker.fullName,
        municipality: worker.municipality,
        avatarUrl: worker.avatarUrl,
        specialties: worker.specialties,
        coverageAreas: worker.coverageAreas,
        bio: worker.bio,
        experienceYears: worker.experienceYears,
        hourlyRate: worker.hourlyRate,
        verified: nextStatus === "verified",
        published: nextStatus === "verified",
        ratingAvg: worker.ratingAvg,
        completedJobs: worker.completedJobs,
        distanceKm: worker.distanceKm,
        responseTime: worker.responseTime,
      });
      batch.set(doc(db, "publicProfiles", worker.uid), {
        uid: worker.uid,
        role: "trabajador",
        fullName: worker.fullName,
        municipality: worker.municipality,
        avatarUrl: worker.avatarUrl,
      }, { merge: true });
      batch.set(doc(db, "workerVerifications", worker.uid), {
        status: nextStatus,
        notes: nextStatus === "verified" ? "Perfil revisado y aprobado por administración." : "Revisión actualizada por administración.",
        reviewedAt: serverTimestamp(),
        reviewedBy: profile.uid,
      }, { merge: true });
      await batch.commit();
      const notificationResult = await Promise.allSettled([createNotification({
        userId: worker.uid,
        type: "verification",
        title: nextStatus === "verified" ? "Perfil verificado" : "Verificación actualizada",
        message: nextStatus === "verified" ? "Tu perfil profesional fue aprobado." : "Administración actualizó el estado de tu verificación.",
        relatedEntityId: worker.uid,
        relatedEntityType: "workerProfile",
      })]);
      setStatus(notificationResult[0].status === "rejected"
        ? "Estado de verificación actualizado. No pudimos enviar la notificación."
        : "Estado de verificación actualizado.");
      await refresh();
    } catch {
      setError("No pudimos actualizar la verificación.");
    }
  }

  async function updateRequestStatus(request: ServiceRequest, nextStatus: string) {
    setStatus("");
    setError("");
    try {
      const batch = writeBatch(db);
      const updatedAt = serverTimestamp();
      batch.update(doc(db, "serviceRequests", request.id), { status: nextStatus, updatedAt });
      const relatedBookings = data.bookings.filter((booking) => booking.requestId === request.id);
      relatedBookings.forEach((booking) => {
        batch.update(doc(db, "bookings", booking.id), { status: nextStatus, updatedAt });
        const historyUpdate = {
          bookingId: booking.id,
          clientId: booking.clientId,
          workerId: booking.workerId,
          status: nextStatus,
          events: arrayUnion(`Estado actualizado por administración: ${nextStatus}`),
          updatedAt,
        };
        batch.set(doc(db, "jobHistory", `${booking.id}_${booking.clientId}`), { ...historyUpdate, userId: booking.clientId }, { merge: true });
        batch.set(doc(db, "jobHistory", `${booking.id}_${booking.workerId}`), { ...historyUpdate, userId: booking.workerId }, { merge: true });
      });
      await batch.commit();
      const notificationResult = await Promise.allSettled([createNotification({
        userId: request.clientId,
        type: "serviceRequest",
        title: "Solicitud actualizada",
        message: `Tu solicitud "${request.title}" ahora está en estado ${nextStatus}.`,
        relatedEntityId: request.id,
        relatedEntityType: "serviceRequest",
      })]);
      setStatus(notificationResult[0].status === "rejected"
        ? "Estado actualizado. No pudimos enviar la notificación."
        : "Estado de solicitud actualizado.");
      await refresh();
    } catch {
      setError("No pudimos actualizar la solicitud.");
    }
  }

  async function attendReport(report: SupportReport) {
    setStatus("");
    setError("");
    try {
      await updateDoc(doc(db, "supportReports", report.id), { status: "attended", updatedAt: serverTimestamp() });
      const notificationResult = await Promise.allSettled([createNotification({
        userId: report.userId,
        type: "support",
        title: "Reporte atendido",
        message: `Tu reporte "${report.subject}" fue marcado como atendido.`,
        relatedEntityId: report.id,
        relatedEntityType: "supportReport",
      })]);
      setStatus(notificationResult[0].status === "rejected"
        ? "Reporte atendido. No pudimos enviar la notificación."
        : "Reporte atendido.");
      await refresh();
    } catch {
      setError("No pudimos marcar el reporte como atendido.");
    }
  }

  const workersToReview = data.workers.filter((worker) => filter === "todos" || worker.verificationStatus === filter);

  return (
    <div className="grid gap-6">
      {(error || status) && <p aria-live="polite" role={error ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Usuarios", data.users.length],
          ["Trabajadores", data.workers.length],
          ["Solicitudes", data.serviceRequests.length],
          ["Reportes abiertos", data.reports.filter((report) => report.status !== "attended").length],
        ].map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} loading={loading} />
        ))}
      </div>

      <SectionCard
        title="Verificación de trabajadores"
        actions={
          <select aria-label="Filtrar verificaciones" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="verified">Verificados</option>
            <option value="rejected">Rechazados</option>
          </select>
        }
      >
        <div className="mt-4 grid gap-3">
          {workersToReview.length ? (
            workersToReview.map((worker) => (
              <article key={worker.uid} className="rounded-xl bg-[#f2f4f2] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#191c1b]">{worker.fullName}</h3>
                    <p className="mt-1 text-sm text-[#414845]">{worker.specialties.join(", ") || "Sin oficios registrados"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#5f5e5a]">{worker.municipality}</p>
                  </div>
                  <StatusBadge status={worker.verificationStatus || "pending"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="secondary-button" type="button" onClick={() => verifyWorker(worker, "verified")}>
                    Verificar
                  </button>
                  <button className="secondary-button" type="button" onClick={() => verifyWorker(worker, "rejected")}>
                    Rechazar
                  </button>
                  <button className="secondary-button" type="button" onClick={() => verifyWorker(worker, "pending")}>
                    Pendiente
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Sin trabajadores en este filtro" message="Cuando existan perfiles profesionales, aparecerán aquí para revisión." />
          )}
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card p-5">
          <h2 className="section-title">Solicitudes</h2>
          <div className="mt-4 grid gap-3">
            {data.serviceRequests.slice(0, 8).map((request) => (
              <article key={request.id} className="rounded-xl bg-[#f2f4f2] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#191c1b]">{request.title}</h3>
                    <p className="mt-1 text-sm text-[#414845]">{request.category} · {request.municipality}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <select aria-label={`Estado de ${request.title}`} className="mt-3 rounded-lg border border-[#c0c8c4] px-3 py-2 text-sm font-bold" value={request.status} onChange={(event) => updateRequestStatus(request, event.target.value)}>
                  {serviceRequestStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </article>
            ))}
            {!data.serviceRequests.length && <EmptyState title="Sin solicitudes" message="Las solicitudes creadas por clientes aparecerán en esta sección." />}
          </div>
        </div>

        <div className="soft-card p-5">
          <h2 className="section-title">Reportes y soporte</h2>
          <div className="mt-4 grid gap-3">
            {data.reports.map((report) => (
              <article key={report.id} className="rounded-xl bg-[#f2f4f2] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#191c1b]">{report.subject}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#414845]">{report.message}</p>
                    <p className="mt-2 text-xs font-semibold text-[#5f5e5a]">{timestampToText(report.createdAt)}</p>
                  </div>
                  <StatusBadge status={report.status === "attended" ? "completed" : "pending"} />
                </div>
                {report.status !== "attended" && (
                  <button className="secondary-button mt-3" type="button" onClick={() => attendReport(report)}>
                    Marcar atendido
                  </button>
                )}
              </article>
            ))}
            {!data.reports.length && <EmptyState title="Sin reportes" message="Los casos enviados desde ayuda aparecerán aquí." />}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="soft-card p-5">
          <h2 className="section-title">Bookings</h2>
          <p className="mt-3 text-4xl font-bold text-[#00261e]">{data.bookings.length}</p>
        </div>
        <div className="soft-card p-5">
          <h2 className="section-title">Calificaciones</h2>
          <p className="mt-3 text-4xl font-bold text-[#00261e]">{data.reviews.length}</p>
        </div>
        <div className="soft-card p-5">
          <h2 className="section-title">Notificaciones</h2>
          <p className="mt-3 text-4xl font-bold text-[#00261e]">{data.notifications.length}</p>
        </div>
      </section>
    </div>
  );
}
