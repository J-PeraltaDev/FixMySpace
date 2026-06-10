"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FormEvent, useState } from "react";
import { db } from "@/firebase";
import { createNotification } from "@/lib/firebase-data";
import { useAuth } from "./AuthProvider";

export function RatingForm({ workerId, bookingId = "" }: { workerId?: string; bookingId?: string }) {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!profile || !workerId || !bookingId) {
      setError("Solo puedes calificar un servicio completado desde su historial.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const comment = String(data.get("comment") || "").trim();
    if (comment.length < 3 || comment.length > 1000) {
      setError("El comentario debe tener entre 3 y 1000 caracteres.");
      return;
    }

    try {
      setLoading(true);
      await setDoc(doc(db, "reviews", bookingId), {
        bookingId,
        clientId: profile.uid,
        workerId,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });
      await createNotification({
        userId: workerId,
        type: "review",
        title: "Nueva calificación",
        message: `${profile.fullName} dejó una calificación de ${rating} de 5.`,
        relatedEntityId: bookingId || workerId,
        relatedEntityType: bookingId ? "booking" : "workerProfile",
      });
      setStatus("Reseña guardada en Firestore.");
      event.currentTarget.reset();
      setRating(5);
    } catch {
      setError("No pudimos guardar la reseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="soft-card grid gap-4 p-5">
      <h2 className="section-title">Dejar calificación</h2>
      <label className="field">
        <span>Calificación</span>
        <input type="range" min="1" max="5" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
        <strong className="text-emerald-900">{rating} de 5</strong>
      </label>
      <label className="field">
        <span>Comentario</span>
        <textarea name="comment" rows={4} maxLength={1001} placeholder="Cuenta cómo fue el servicio" />
      </label>
      {(error || status) && <p role={error ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>}
      <button className="secondary-button w-fit" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar reseña"}
      </button>
    </form>
  );
}
