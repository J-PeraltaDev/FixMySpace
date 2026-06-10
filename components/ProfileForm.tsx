"use client";

import { doc, getDoc, writeBatch } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/firebase";
import { municipalities, serviceCategories } from "@/lib/catalog";
import { buildPublicProfile, createNotification, ensureWorkerProfile, resolveVerificationStatus } from "@/lib/firebase-data";
import type { UserProfile, WorkerProfile, WorkerVerification } from "@/lib/types";
import { useAuth } from "./AuthProvider";

export function ProfileForm() {
  const { profile, updateLocalProfile } = useAuth();
  const [workerProfile, setWorkerProfile] = useState<Partial<WorkerProfile> | null>(null);
  const [verification, setVerification] = useState<Partial<WorkerVerification> | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkerProfile() {
      if (!profile || profile.role !== "trabajador") return;
      try {
        const [snapshot, verificationSnapshot] = await Promise.all([
          getDoc(doc(db, "workerProfiles", profile.uid)),
          getDoc(doc(db, "workerVerifications", profile.uid)),
        ]);
        if (!snapshot.exists()) await ensureWorkerProfile(profile.uid, profile.municipality, profile);
        const freshSnapshot = snapshot.exists() ? snapshot : await getDoc(doc(db, "workerProfiles", profile.uid));
        if (!cancelled) setWorkerProfile(freshSnapshot.data() as Partial<WorkerProfile>);
        if (!cancelled) setVerification(verificationSnapshot.exists() ? verificationSnapshot.data() as Partial<WorkerVerification> : null);
      } catch {
        if (!cancelled) setError("No pudimos leer tu perfil profesional.");
      }
    }

    loadWorkerProfile();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setStatus("");
    setError("");
    const data = new FormData(event.currentTarget);

    const nextProfile: UserProfile = {
      ...profile,
      fullName: String(data.get("fullName") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      municipality: String(data.get("municipality") || "").trim(),
      avatarUrl: String(data.get("avatarUrl") || "").trim(),
    };

    if (!nextProfile.fullName || !nextProfile.phone || !nextProfile.municipality) {
      setError("Completa nombre, teléfono y municipio.");
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(db);
      batch.set(doc(db, "users", profile.uid), nextProfile, { merge: true });
      batch.set(doc(db, "publicProfiles", profile.uid), buildPublicProfile(nextProfile), { merge: true });

      if (profile.role === "trabajador") {
        const specialties = String(data.get("specialties") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const coverageAreas = String(data.get("coverageAreas") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        batch.set(
          doc(db, "workerProfiles", profile.uid),
          {
            uid: profile.uid,
            role: "trabajador",
            fullName: nextProfile.fullName,
            municipality: nextProfile.municipality,
            avatarUrl: nextProfile.avatarUrl || "",
            specialties,
            coverageAreas,
            bio: String(data.get("bio") || "").trim(),
            experienceYears: Number(data.get("experienceYears") || 0),
            hourlyRate: Number(data.get("hourlyRate") || 0),
          },
          { merge: true },
        );
      }

      await batch.commit();
      updateLocalProfile(nextProfile);
      let notificationWarning = "";
      if (profile.role === "trabajador") {
        const [notificationResult] = await Promise.allSettled([createNotification({
          userId: profile.uid,
          type: "verification",
          title: "Perfil profesional actualizado",
          message: "Tus datos quedaron guardados. Administración puede revisar tu verificación.",
          relatedEntityId: profile.uid,
          relatedEntityType: "workerProfile",
        })]);
        if (notificationResult.status === "rejected") notificationWarning = " No pudimos enviar la notificación.";
      }
      setStatus(`Perfil actualizado correctamente.${notificationWarning}`);
    } catch {
      setError("No pudimos guardar los cambios en Firestore.");
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">Perfil</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Mantén tus datos listos para cada servicio.</h1>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="grid gap-5">
          <div className="soft-card grid gap-4 p-5 sm:p-6">
            <h2 className="section-title">Información básica</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Nombre completo</span>
                <input name="fullName" defaultValue={profile.fullName} />
              </label>
              <label className="field">
                <span>Teléfono</span>
                <input name="phone" defaultValue={profile.phone} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Correo</span>
                <input value={profile.email} disabled />
              </label>
              <label className="field">
                <span>Municipio</span>
                <select name="municipality" defaultValue={profile.municipality}>
                  {municipalities.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Avatar URL</span>
              <input name="avatarUrl" defaultValue={profile.avatarUrl || ""} placeholder="Opcional" />
            </label>
          </div>

          {profile.role === "trabajador" && (
            <div className="soft-card grid gap-4 p-5 sm:p-6">
              <h2 className="section-title">Perfil profesional</h2>
              <label className="field">
                <span>Oficios</span>
                <input name="specialties" defaultValue={workerProfile?.specialties?.join(", ") || ""} placeholder={serviceCategories.slice(0, 3).join(", ")} />
              </label>
              <label className="field">
                <span>Zonas de cobertura</span>
                <input name="coverageAreas" defaultValue={workerProfile?.coverageAreas?.join(", ") || profile.municipality} placeholder={municipalities.slice(0, 3).join(", ")} />
              </label>
              <label className="field">
                <span>Biografía</span>
                <textarea name="bio" rows={4} defaultValue={workerProfile?.bio || ""} placeholder="Describe tu experiencia, enfoque y tipo de trabajos que atiendes." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field">
                  <span>Años de experiencia</span>
                  <input name="experienceYears" type="number" min="0" defaultValue={workerProfile?.experienceYears || 0} />
                </label>
                <label className="field">
                  <span>Tarifa por hora</span>
                  <input name="hourlyRate" type="number" min="0" defaultValue={workerProfile?.hourlyRate || 0} />
                </label>
              </div>
            </div>
          )}
        </section>

        <aside className="soft-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="section-title">Estado de cuenta</h2>
          <div className="mt-4 rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Rol</p>
            <p className="mt-1 text-xl font-black capitalize text-emerald-950">{profile.role}</p>
          </div>
          {profile.role === "trabajador" && (
            <div className="mt-4 rounded-3xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">Verificación</p>
              <p className="mt-1 text-xl font-black capitalize text-emerald-950">{resolveVerificationStatus(workerProfile, verification)}</p>
              {verification?.notes && <p className="mt-2 text-sm text-emerald-900">{verification.notes}</p>}
            </div>
          )}
          {(error || status) && (
            <p
              aria-live="polite"
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}
              role={error ? "alert" : "status"}
            >
              {error || status}
            </p>
          )}
          <button className="primary-button mt-5 min-h-12 w-full" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar perfil"}
          </button>
        </aside>
      </form>
    </div>
  );
}
