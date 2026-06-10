"use client";

import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { db, storage } from "@/firebase";
import { createNotification, fetchWorkerById, uploadImage } from "@/lib/firebase-data";
import { municipalities, serviceCategories } from "@/lib/catalog";
import type { WorkerProfile } from "@/lib/types";
import { serviceRequestSchema, type ServiceRequestFormValues } from "@/lib/validation/service-request";
import { useAuth } from "./AuthProvider";
import { Field } from "./ui/Field";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function validateFiles(files: File[]) {
  if (files.length > MAX_FILES) return "Puedes adjuntar máximo 5 imágenes.";
  if (files.some((file) => !file.type.startsWith("image/"))) return "Solo puedes adjuntar archivos de imagen.";
  if (files.some((file) => file.size > MAX_FILE_SIZE)) return "Cada imagen debe pesar máximo 5 MB.";
  return "";
}

function workerCategory(worker?: WorkerProfile) {
  return worker?.specialties.find((specialty) => serviceCategories.includes(specialty)) || "";
}

export function ServiceRequestForm({ workerId }: { workerId?: string }) {
  const { profile } = useAuth();
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | undefined>();
  const [workerResolving, setWorkerResolving] = useState(Boolean(workerId));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    formState: { errors, isValid },
    getFieldState,
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<ServiceRequestFormValues>({
    resolver: zodResolver(serviceRequestSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      category: workerCategory(selectedWorker),
      municipality: profile?.municipality || "",
      address: "",
      preferredDate: "",
      preferredTime: "",
      price: undefined,
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function loadWorker() {
      setSelectedWorker(undefined);
      if (!workerId) {
        setWorkerResolving(false);
        return;
      }
      setWorkerResolving(true);
      try {
        const worker = await fetchWorkerById(workerId);
        if (!cancelled) setSelectedWorker(worker || undefined);
      } catch {
        if (!cancelled) setError("No pudimos leer el trabajador seleccionado desde Firestore.");
      } finally {
        if (!cancelled) setWorkerResolving(false);
      }
    }
    loadWorker();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  useEffect(() => {
    const category = workerCategory(selectedWorker);
    if (!getFieldState("category").isDirty && getValues("category") !== category) {
      setValue("category", category, { shouldValidate: true });
    }
  }, [getFieldState, getValues, selectedWorker, setValue]);

  useEffect(() => {
    const municipality = profile?.municipality || "";
    if (!getFieldState("municipality").isDirty && getValues("municipality") !== municipality) {
      setValue("municipality", municipality, { shouldValidate: true });
    }
  }, [getFieldState, getValues, profile?.municipality, setValue]);

  useEffect(() => {
    if (!files.length && fileInputRef.current) fileInputRef.current.value = "";
  }, [files]);

  async function submit(values: ServiceRequestFormValues) {
    setStatus("");
    setError("");

    if (!profile) {
      setError("Inicia sesión para guardar la solicitud en Firestore.");
      return;
    }

    const clientId = profile.uid;
    const payload = {
      clientId,
      ...values,
      photos: [] as string[],
      status: "pending",
      lastProposalBy: clientId,
      createdAt: serverTimestamp(),
      workerId: selectedWorker?.uid || "",
    };

    const uploadedUrls: string[] = [];
    let coreCommitted = false;

    try {
      setLoading(true);
      const fileError = validateFiles(files);
      if (fileError) {
        setError(fileError);
        return;
      }
      for (const file of files) {
        const url = await uploadImage(file, `serviceRequests/${clientId}`);
        uploadedUrls.push(url);
      }
      const photos = uploadedUrls;
      const requestRef = doc(collection(db, "serviceRequests"));
      const batch = writeBatch(db);
      batch.set(requestRef, { ...payload, photos });

      await batch.commit();
      coreCommitted = true;

      const notificationTasks = [
        Promise.resolve().then(() => createNotification({
          userId: clientId,
          type: "serviceRequest",
          title: "Solicitud enviada",
          message: selectedWorker ? "Tu solicitud fue enviada al trabajador para su revisión." : "Tu solicitud quedó guardada para revisión general.",
          relatedEntityId: requestRef.id,
          relatedEntityType: "serviceRequest",
        })),
      ];

      if (selectedWorker) {
        notificationTasks.push(
          Promise.resolve().then(() => createNotification({
            userId: selectedWorker.uid,
            type: "serviceRequest",
            title: "Nueva solicitud de servicio",
            message: `${profile.fullName} te envió una solicitud. Revisa el chat para negociar o aceptar.`,
            relatedEntityId: requestRef.id,
            relatedEntityType: "serviceRequest",
          })),
        );
      }

      const notificationResults = await Promise.allSettled(notificationTasks);
      const notificationWarning = notificationResults.some((result) => result.status === "rejected")
        ? " No pudimos enviar todas las notificaciones."
        : "";
      const photoMessage = photos.length
        ? ` Se ${photos.length === 1 ? "subió 1 imagen" : `subieron ${photos.length} imágenes`}.`
        : "";
      setStatus(`Solicitud enviada exitosamente.${photoMessage}${notificationWarning}`);
      reset({
        title: "",
        description: "",
        category: workerCategory(selectedWorker),
        municipality: profile.municipality || "",
        address: "",
        preferredDate: "",
        preferredTime: "",
        price: undefined,
      });
      setFiles([]);
    } catch {
      if (!coreCommitted && uploadedUrls.length) {
        await Promise.allSettled(
          uploadedUrls.filter(Boolean).map((url) => deleteObject(storageRef(storage, url))),
        );
      }
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

      <form onSubmit={handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-5">
          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Detalle del trabajo</h2>
            <Field label="Título" error={errors.title?.message}>
              <input {...register("title")} placeholder="Ej. Reparar fuga bajo lavaplatos" />
            </Field>
            <Field label="Descripción" error={errors.description?.message}>
              <textarea {...register("description")} rows={5} placeholder="Cuenta qué ocurre, desde cuándo y qué esperas resolver." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría" error={errors.category?.message}>
                <select {...register("category")}>
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                  {serviceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Municipio" error={errors.municipality?.message}>
                <select {...register("municipality")}>
                  <option value="" disabled>
                    Selecciona municipio
                  </option>
                  {municipalities.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                 </select>
              </Field>
            </div>
            <Field label="Dirección o referencia" error={errors.address?.message}>
              <input {...register("address")} placeholder="Conjunto, barrio o punto de referencia" />
            </Field>
          </div>

          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Agenda y Oferta</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha preferida" error={errors.preferredDate?.message}>
                <input {...register("preferredDate")} type="date" />
              </Field>
              <Field label="Hora preferida" error={errors.preferredTime?.message}>
                <input {...register("preferredTime")} type="time" />
              </Field>
            </div>
            <Field label="Precio propuesto (opcional)" error={errors.price?.message}>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#5f5e5a]">$</span>
                <input {...register("price")} type="number" min="0" step="1000" className="pl-8" placeholder="Ej. 50000" />
              </div>
            </Field>
          </div>

          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Fotos opcionales</h2>
            <label className="rounded-xl border border-dashed border-[#c0c8c4] bg-[#f2f4f2] p-5 text-center transition hover:border-[#00261e]">
              <span className="block font-bold text-[#00261e]">Adjuntar fotos</span>
              <span className="mt-1 block text-sm text-[#414845]">Puedes seleccionar varias imágenes como referencia.</span>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files || []);
                  const fileError = validateFiles(selectedFiles);
                  setStatus("");
                  setError(fileError);
                  setFiles(fileError ? [] : selectedFiles);
                  if (fileError) event.currentTarget.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {files.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="rounded-lg bg-[#f2f4f2] px-4 py-3 text-sm font-semibold text-[#414845]">
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
            <p className="mt-3 rounded-lg bg-[#bfecdd] p-4 text-sm text-[#00261e]">
              Solicitud dirigida a <strong>{selectedWorker.fullName}</strong>. El trabajador podrá responder por chat.
            </p>
          ) : (
            <p className="mt-3 rounded-lg bg-[#f2f4f2] p-4 text-sm text-[#414845]">Publica la solicitud para recibir respuestas de trabajadores disponibles.</p>
          )}
          {error ? (
            <p className="mt-4 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]" role="alert">{error}</p>
          ) : status ? (
            <p className="mt-4 rounded-lg bg-[#bfecdd] px-4 py-3 text-sm font-semibold text-[#00261e]" role="status" aria-live="polite">{status}</p>
          ) : null}
          <button type="submit" className="primary-button mt-5 min-h-12 w-full" disabled={loading || workerResolving || !isValid}>
            {loading ? "Publicando..." : "Publicar solicitud"}
          </button>
        </aside>
      </form>
    </div>
  );
}
