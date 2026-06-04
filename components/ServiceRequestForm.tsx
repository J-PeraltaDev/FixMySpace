"use client";

import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchWorkerById, uploadImage } from "@/lib/firebase-data";
import { municipalities, serviceCategories, workers } from "@/lib/mock-data";
import type { WorkerProfile } from "@/lib/types";
import { useAuth } from "./AuthProvider";

export function ServiceRequestForm({ workerId }: { workerId?: string }) {
  const { profile } = useAuth();
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | undefined>(() => workers.find((worker) => worker.uid === workerId));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadWorker() {
      if (!workerId) return;
      try {
        const worker = await fetchWorkerById(workerId);
        if (!cancelled && worker) setSelectedWorker(worker);
      } catch {
        if (!cancelled) setSelectedWorker(workers.find((worker) => worker.uid === workerId));
      }
    }
    loadWorker();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    const data = new FormData(event.currentTarget);
    if (!profile) {
      setError("Inicia sesión para guardar la solicitud en Firestore.");
      return;
    }

    const clientId = profile.uid;
    const payload = {
      clientId,
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim(),
      category: String(data.get("category") || ""),
      municipality: String(data.get("municipality") || ""),
      address: String(data.get("address") || "").trim(),
      preferredDate: String(data.get("preferredDate") || ""),
      preferredTime: String(data.get("preferredTime") || ""),
      photos: [] as string[],
      status: "pending",
      createdAt: serverTimestamp(),
      workerId: selectedWorker?.uid || "",
    };

    if (!payload.title || !payload.description || !payload.category || !payload.municipality || !payload.address || !payload.preferredDate || !payload.preferredTime) {
      setError("Completa título, descripción, ubicación, fecha y hora para publicar la solicitud.");
      return;
    }

    try {
      setLoading(true);
      const photos = await Promise.all(files.map((file) => uploadImage(file, `serviceRequests/${clientId}`)));
      const requestRef = await addDoc(collection(db, "serviceRequests"), { ...payload, photos });

      if (selectedWorker) {
        const scheduledAt = `${payload.preferredDate} ${payload.preferredTime}`;
        const bookingRef = await addDoc(collection(db, "bookings"), {
          requestId: requestRef.id,
          clientId,
          workerId: selectedWorker.uid,
          scheduledAt,
          status: "scheduled",
          notes: payload.description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await Promise.all([
          setDoc(doc(db, "jobHistory", `${bookingRef.id}_${clientId}`), {
            bookingId: bookingRef.id,
            userId: clientId,
            clientId,
            workerId: selectedWorker.uid,
            service: payload.title,
            status: "scheduled",
            events: ["Solicitud creada", "Servicio agendado"],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          setDoc(doc(db, "jobHistory", `${bookingRef.id}_${selectedWorker.uid}`), {
            bookingId: bookingRef.id,
            userId: selectedWorker.uid,
            clientId,
            workerId: selectedWorker.uid,
            service: payload.title,
            status: "scheduled",
            events: ["Nueva reserva asignada"],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          createNotification({
            userId: selectedWorker.uid,
            type: "booking",
            title: "Nueva solicitud asignada",
            message: `${profile.fullName} agendó ${payload.title}.`,
            relatedEntityId: bookingRef.id,
            relatedEntityType: "booking",
          }),
        ]);
      }

      await createNotification({
        userId: clientId,
        type: "serviceRequest",
        title: "Solicitud publicada",
        message: selectedWorker ? "Tu solicitud quedó agendada con el trabajador seleccionado." : "Tu solicitud quedó guardada para revisión.",
        relatedEntityId: requestRef.id,
        relatedEntityType: "serviceRequest",
      });

      setStatus("Solicitud publicada. Fotos, solicitud y agenda quedaron guardadas en Firebase.");
      event.currentTarget.reset();
      setFiles([]);
    } catch {
      setError("No pudimos guardar en Firestore. Revisa la configuración o intenta más tarde.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Nueva solicitud</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Describe el servicio y agenda una visita.</h1>
        <p className="mt-3 text-slate-600">Las fotos son opcionales en esta primera versión y ayudan a que el trabajador llegue mejor preparado.</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-5">
          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Detalle del trabajo</h2>
            <label className="field">
              <span>Título</span>
              <input name="title" placeholder="Ej. Reparar fuga bajo lavaplatos" />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea name="description" rows={5} placeholder="Cuenta qué ocurre, desde cuándo y qué esperas resolver." />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Categoría</span>
                <select name="category" defaultValue={selectedWorker?.specialties[0] || ""}>
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                  {serviceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Municipio</span>
                <select name="municipality" defaultValue={profile?.municipality || ""}>
                  <option value="" disabled>
                    Selecciona municipio
                  </option>
                  {municipalities.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Dirección o referencia</span>
              <input name="address" placeholder="Conjunto, barrio o punto de referencia" />
            </label>
          </div>

          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Agenda preferida</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Fecha</span>
                <input name="preferredDate" type="date" />
              </label>
              <label className="field">
                <span>Hora</span>
                <input name="preferredTime" type="time" />
              </label>
            </div>
          </div>

          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Fotos opcionales</h2>
            <label className="rounded-3xl border border-dashed border-emerald-900/30 bg-emerald-50/50 p-5 text-center">
              <span className="block font-black text-emerald-950">Adjuntar fotos</span>
              <span className="mt-1 block text-sm text-slate-600">Puedes seleccionar varias imágenes como referencia.</span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>
            {files.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {files.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="soft-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="section-title">Resumen</h2>
          {selectedWorker ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              Solicitud dirigida a <strong>{selectedWorker.fullName}</strong>. El trabajador podrá responder por chat.
            </p>
          ) : (
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Publica la solicitud para recibir respuestas de trabajadores disponibles.</p>
          )}
          {(error || status) && (
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>
          )}
          <button type="submit" className="primary-button mt-5 min-h-12 w-full" disabled={loading}>
            {loading ? "Publicando..." : "Publicar solicitud"}
          </button>
        </aside>
      </form>
    </div>
  );
}
