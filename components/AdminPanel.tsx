"use client";

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchAdminCollections, serviceRequestStatuses, timestampToText } from "@/lib/firebase-data";
import type { Booking, Notification, Review, ServiceRequest, SupportReport, UserProfile, WorkerProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

type AdminData = {
  users: UserProfile[];
  workers: WorkerProfile[];
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

  async function verifyWorker(worker: WorkerProfile, nextStatus: "verified" | "rejected" | "pending") {
    if (!profile) return;
    setStatus("");
    try {
      await updateDoc(doc(db, "workerProfiles", worker.uid), {
        verified: nextStatus === "verified",
        verificationStatus: nextStatus,
        verificationNotes: nextStatus === "verified" ? "Perfil revisado y aprobado por administración." : "Revisión actualizada por administración.",
        verifiedAt: nextStatus === "verified" ? serverTimestamp() : null,
        verifiedBy: profile.uid,
      });
      await createNotification({
        userId: worker.uid,
        type: "verification",
        title: nextStatus === "verified" ? "Perfil verificado" : "Verificación actualizada",
        message: nextStatus === "verified" ? "Tu perfil profesional fue aprobado." : "Administración actualizó el estado de tu verificación.",
        relatedEntityId: worker.uid,
        relatedEntityType: "workerProfile",
      });
      setStatus("Estado de verificación actualizado.");
      await refresh();
    } catch {
      setError("No pudimos actualizar la verificación.");
    }
  }

  async function updateRequestStatus(request: ServiceRequest, nextStatus: string) {
    try {
      await updateDoc(doc(db, "serviceRequests", request.id), { status: nextStatus, updatedAt: serverTimestamp() });
      await createNotification({
        userId: request.clientId,
        type: "serviceRequest",
        title: "Solicitud actualizada",
        message: `Tu solicitud "${request.title}" ahora está en estado ${nextStatus}.`,
        relatedEntityId: request.id,
        relatedEntityType: "serviceRequest",
      });
      await refresh();
    } catch {
      setError("No pudimos actualizar la solicitud.");
    }
  }

  async function attendReport(report: SupportReport) {
    try {
      await updateDoc(doc(db, "supportReports", report.id), { status: "attended", updatedAt: serverTimestamp() });
      await createNotification({
        userId: report.userId,
        type: "support",
        title: "Reporte atendido",
        message: `Tu reporte "${report.subject}" fue marcado como atendido.`,
        relatedEntityId: report.id,
        relatedEntityType: "supportReport",
      });
      await refresh();
    } catch {
      setError("No pudimos marcar el reporte como atendido.");
    }
  }

  const workersToReview = data.workers.filter((worker) => filter === "todos" || worker.verificationStatus === filter);

  return (
    <div className="grid gap-6">
      {(error || status) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Usuarios", data.users.length],
          ["Trabajadores", data.workers.length],
          ["Solicitudes", data.serviceRequests.length],
          ["Reportes abiertos", data.reports.filter((report) => report.status !== "attended").length],
        ].map(([label, value]) => (
          <div key={label} className="metric-card">
            <span>{label}</span>
            <strong>{loading ? "..." : value}</strong>
          </div>
        ))}
      </div>

      <section className="soft-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Verificación de trabajadores</h2>
          <select className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="verified">Verificados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
        <div className="mt-4 grid gap-3">
          {workersToReview.length ? (
            workersToReview.map((worker) => (
              <article key={worker.uid} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">{worker.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-600">{worker.specialties.join(", ") || "Sin oficios registrados"}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{worker.municipality}</p>
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="soft-card p-5">
          <h2 className="section-title">Solicitudes</h2>
          <div className="mt-4 grid gap-3">
            {data.serviceRequests.slice(0, 8).map((request) => (
              <article key={request.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">{request.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{request.category} · {request.municipality}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <select className="mt-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold" value={request.status} onChange={(event) => updateRequestStatus(request, event.target.value)}>
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
              <article key={report.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">{report.subject}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{report.message}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">{timestampToText(report.createdAt)}</p>
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
          <p className="mt-3 text-4xl font-black text-emerald-950">{data.bookings.length}</p>
        </div>
        <div className="soft-card p-5">
          <h2 className="section-title">Calificaciones</h2>
          <p className="mt-3 text-4xl font-black text-emerald-950">{data.reviews.length}</p>
        </div>
        <div className="soft-card p-5">
          <h2 className="section-title">Notificaciones</h2>
          <p className="mt-3 text-4xl font-black text-emerald-950">{data.notifications.length}</p>
        </div>
      </section>
    </div>
  );
}
