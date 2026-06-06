"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/firebase";
import { createNotification, fetchEvidencesByBooking, timestampToText, uploadImage } from "@/lib/firebase-data";
import type { JobEvidence, UserRole } from "@/lib/types";
import { useAuth } from "./AuthProvider";

const phaseLabels = {
  before: "Antes",
  during: "Durante",
  after: "Después",
};

export function EvidenceManager({
  bookingId,
  workerId,
  clientId,
}: {
  bookingId: string;
  workerId?: string;
  clientId?: string;
}) {
  const { profile } = useAuth();
  const [evidences, setEvidences] = useState<JobEvidence[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const role: UserRole | undefined = profile?.role;
  const canUpload = Boolean(profile && (role === "trabajador" || role === "admin") && (!workerId || profile.uid === workerId || role === "admin"));

  useEffect(() => {
    let cancelled = false;

    async function loadEvidences() {
      setLoading(true);
      try {
        const nextEvidences = await fetchEvidencesByBooking(bookingId);
        if (!cancelled) setEvidences(nextEvidences);
      } catch {
        if (!cancelled) setError("No pudimos cargar evidencias.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvidences();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (!profile) {
      setError("Inicia sesión para guardar evidencia.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const phase = String(data.get("phase") || "before") as JobEvidence["phase"];
    const description = String(data.get("description") || "").trim();
    let imageUrl = "";
    let uploadFailed = false;

    try {
      setSaving(true);
      if (file) {
        try {
          imageUrl = await uploadImage(file, `jobEvidences/${bookingId}`);
        } catch {
          uploadFailed = true;
        }
      }

      const evidenceRef = await addDoc(collection(db, "jobEvidences"), {
        bookingId,
        workerId: workerId || profile.uid,
        phase,
        imageUrl,
        description,
        createdAt: serverTimestamp(),
      });

      if (clientId) {
        await createNotification({
          userId: clientId,
          type: "evidence",
          title: imageUrl ? "Nueva evidencia fotográfica" : "Nueva evidencia",
          message: `Se agregó evidencia de fase ${phaseLabels[phase].toLowerCase()} a tu servicio.`,
          relatedEntityId: evidenceRef.id,
          relatedEntityType: "jobEvidence",
        });
      }

      setEvidences((current) => [
        {
          id: evidenceRef.id,
          bookingId,
          workerId: workerId || profile.uid,
          phase,
          imageUrl,
          description,
          createdAt: new Date(),
        },
        ...current,
      ]);
      setFile(null);
      setStatus(uploadFailed ? "Evidencia guardada en Firestore, pero la foto no pudo subirse a Storage." : imageUrl ? "Evidencia guardada con foto." : "Evidencia guardada sin foto.");
      event.currentTarget.reset();
    } catch {
      setError("No pudimos guardar la evidencia en Firestore.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-black text-slate-950">Evidencias</h4>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-900">{loading ? "Cargando" : `${evidences.length} fotos`}</span>
      </div>

      {canUpload && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-3xl bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <label className="field">
              <span>Fase</span>
              <select name="phase" defaultValue="before">
                <option value="before">Antes</option>
                <option value="during">Durante</option>
                <option value="after">Después</option>
              </select>
            </label>
            <label className="field">
              <span>Imagen opcional</span>
              <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
          </div>
          <label className="field">
            <span>Descripción opcional</span>
            <input name="description" placeholder="Ej. Estado inicial del lavaplatos" />
          </label>
          {(error || status) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>}
          <button className="secondary-button w-fit" type="submit" disabled={saving}>
            {saving ? "Subiendo..." : "Guardar evidencia"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {evidences.map((evidence) => (
          <article key={evidence.id} className="overflow-hidden rounded-3xl bg-white">
            {evidence.imageUrl ? (
              <div className="relative h-36 bg-slate-100">
                <Image src={evidence.imageUrl} alt={`Evidencia ${phaseLabels[evidence.phase]}`} fill className="object-cover" sizes="(min-width: 640px) 33vw, 100vw" />
              </div>
            ) : (
              <div className="grid h-24 place-items-center bg-[#f2f4f2] px-4 text-center text-sm font-semibold text-[#5f5e5a]">Evidencia sin foto</div>
            )}
            <div className="p-3">
              <p className="text-sm font-black text-emerald-900">{phaseLabels[evidence.phase]}</p>
              {evidence.description && <p className="mt-1 text-sm text-slate-600">{evidence.description}</p>}
              <p className="mt-2 text-xs font-semibold text-slate-400">{timestampToText(evidence.createdAt)}</p>
            </div>
          </article>
        ))}
      </div>

      {!loading && evidences.length === 0 && <p className="mt-4 rounded-3xl bg-white p-4 text-sm font-semibold text-slate-500">Aún no hay evidencias para este servicio.</p>}
    </section>
  );
}
