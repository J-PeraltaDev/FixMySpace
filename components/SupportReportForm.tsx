"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FormEvent, useState } from "react";
import { db } from "@/firebase";
import { createNotification } from "@/lib/firebase-data";
import { useAuth } from "./AuthProvider";

export function SupportReportForm() {
  const { profile } = useAuth();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!profile) {
      setError("Inicia sesión para crear un reporte.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const category = String(data.get("category") || "");
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!category || !subject || !message) {
      setError("Completa categoría, asunto y descripción.");
      return;
    }

    try {
      setLoading(true);
      const reportRef = await addDoc(collection(db, "supportReports"), {
        userId: profile.uid,
        category,
        subject,
        message,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await createNotification({
        userId: profile.uid,
        type: "support",
        title: "Reporte recibido",
        message: "Tu caso quedó registrado para revisión administrativa.",
        relatedEntityId: reportRef.id,
        relatedEntityType: "supportReport",
      });
      setStatus("Reporte guardado. Administración podrá revisarlo desde el panel.");
      event.currentTarget.reset();
    } catch {
      setError("No pudimos guardar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="soft-card grid gap-4 p-5 sm:p-6">
      <h2 className="section-title">Crear reporte de soporte</h2>
      <label className="field">
        <span>Categoría</span>
        <select name="category" defaultValue="">
          <option value="" disabled>
            Selecciona una categoría
          </option>
          <option value="booking">Servicio o agenda</option>
          <option value="payment">Pago o cobro</option>
          <option value="worker">Trabajador</option>
          <option value="client">Cliente</option>
          <option value="platform">Uso de la plataforma</option>
        </select>
      </label>
      <label className="field">
        <span>Asunto</span>
        <input name="subject" placeholder="Ej. No puedo contactar al trabajador" />
      </label>
      <label className="field">
        <span>Descripción</span>
        <textarea name="message" rows={5} placeholder="Explica qué ocurrió y qué necesitas resolver." />
      </label>
      {(error || status) && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || status}</p>}
      <button className="primary-button w-fit" type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar reporte"}
      </button>
    </form>
  );
}
