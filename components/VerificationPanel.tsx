"use client";

import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { resolveVerificationStatus } from "@/lib/firebase-data";
import type { WorkerProfile, WorkerVerification } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function VerificationPanel() {
  const { profile } = useAuth();
  const [workerProfile, setWorkerProfile] = useState<Partial<WorkerProfile> | null>(null);
  const [verification, setVerification] = useState<Partial<WorkerVerification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
      if (!profile || profile.role !== "trabajador") {
        setLoading(false);
        return;
      }

      try {
        const [profileSnapshot, verificationSnapshot] = await Promise.all([
          getDoc(doc(db, "workerProfiles", profile.uid)),
          getDoc(doc(db, "workerVerifications", profile.uid)),
        ]);
        if (!cancelled) setWorkerProfile(profileSnapshot.exists() ? (profileSnapshot.data() as Partial<WorkerProfile>) : null);
        if (!cancelled) setVerification(verificationSnapshot.exists() ? (verificationSnapshot.data() as Partial<WorkerVerification>) : null);
      } catch {
        if (!cancelled) setError("No pudimos leer tu verificación.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVerification();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (profile?.role === "admin") {
    return (
      <div className="soft-card p-6">
        <h2 className="section-title">Revisión administrativa</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">La aprobación, rechazo y seguimiento de verificaciones se gestiona desde el panel administrativo.</p>
        <Link href="/admin" className="primary-button mt-5">
          Ir al panel admin
        </Link>
      </div>
    );
  }

  if (profile?.role !== "trabajador") {
    return <EmptyState title="Verificación solo para trabajadores" message="Los clientes no necesitan verificación profesional para solicitar servicios." actionHref="/dashboard" actionLabel="Ir al panel" />;
  }

  if (loading) return <div className="soft-card h-44 animate-pulse bg-white" />;
  if (error) return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>;

  const verificationStatus = resolveVerificationStatus(workerProfile, verification);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="soft-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Estado de verificación</h2>
          <StatusBadge status={verificationStatus} />
        </div>
        <p className="mt-4 text-sm leading-6 text-[#414845]">
          Completa tu perfil profesional con oficios, zonas de cobertura, experiencia, tarifa y biografía. Administración podrá revisar estos datos y aprobar tu perfil.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#f2f4f2] p-4">
            <p className="text-sm text-[#5f5e5a]">Oficios</p>
            <p className="mt-1 font-bold text-[#191c1b]">{workerProfile?.specialties?.join(", ") || "Pendiente"}</p>
          </div>
          <div className="rounded-xl bg-[#f2f4f2] p-4">
            <p className="text-sm text-[#5f5e5a]">Cobertura</p>
            <p className="mt-1 font-bold text-[#191c1b]">{workerProfile?.coverageAreas?.join(", ") || "Pendiente"}</p>
          </div>
        </div>
        {verification?.notes && <p className="mt-5 rounded-xl bg-[#bfecdd] p-4 text-sm font-semibold text-[#00261e]">{verification.notes}</p>}
      </section>

      <aside className="soft-card h-fit p-5">
        <h2 className="section-title">Siguiente paso</h2>
        <p className="mt-3 text-sm leading-6 text-[#414845]">Actualiza tu perfil si falta información o si tu verificación fue rechazada.</p>
        <Link href="/perfil" className="primary-button mt-5 w-full">
          Completar perfil
        </Link>
      </aside>
    </div>
  );
}
