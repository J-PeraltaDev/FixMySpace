"use client";

import { useMemo, useState } from "react";
import { useCollection } from "@/hooks/useCollection";
import { municipalities, serviceCategories, workers as fallbackWorkers } from "@/lib/mock-data";
import type { WorkerProfile } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { WorkerCard } from "./WorkerCard";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";

type CollectionWorkerProfile = Partial<WorkerProfile> & { id?: string };

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeWorkerProfile(profile: CollectionWorkerProfile): WorkerProfile {
  const uid = asString(profile.uid, asString(profile.id, ""));
  const fallback = fallbackWorkers.find((worker) => worker.uid === uid);
  const specialties = asStringArray(profile.specialties);
  const coverageAreas = asStringArray(profile.coverageAreas);

  return {
    uid,
    fullName: asString(profile.fullName, fallback?.fullName || "Trabajador FixMySpace"),
    municipality: asString(profile.municipality, fallback?.municipality || ""),
    avatarUrl: asString(profile.avatarUrl, fallback?.avatarUrl || ""),
    specialties: specialties.length ? specialties : fallback?.specialties || [],
    coverageAreas: coverageAreas.length ? coverageAreas : fallback?.coverageAreas || [],
    bio: asString(profile.bio, fallback?.bio || "Perfil profesional en construcción."),
    experienceYears: asNumber(profile.experienceYears, fallback?.experienceYears || 0),
    hourlyRate: asNumber(profile.hourlyRate, fallback?.hourlyRate || 0),
    verified: Boolean(profile.verified),
    verificationStatus: profile.verificationStatus ?? (profile.verified ? "verified" : "pending"),
    verificationNotes: asString(profile.verificationNotes),
    verifiedAt: profile.verifiedAt,
    verifiedBy: asString(profile.verifiedBy),
    ratingAvg: asNumber(profile.ratingAvg, fallback?.ratingAvg || 0),
    completedJobs: asNumber(profile.completedJobs, fallback?.completedJobs || 0),
    distanceKm: asNumber(profile.distanceKm, fallback?.distanceKm || 0),
    responseTime: asString(profile.responseTime, fallback?.responseTime || "Responde pronto"),
  };
}

export function SearchDirectory({ initialCategory = "", initialMunicipality = "" }: { initialCategory?: string; initialMunicipality?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [municipality, setMunicipality] = useState(initialMunicipality);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState("0");
  const [maxRate, setMaxRate] = useState("60000");
  const workerProfiles = useCollection<CollectionWorkerProfile>("workerProfiles");
  const loading = workerProfiles.loading;
  const error = workerProfiles.error
    ? "No pudimos leer Firestore. Mostramos perfiles de ejemplo mientras revisas la conexión."
    : "";
  const usingFallback = !loading && (Boolean(workerProfiles.error) || workerProfiles.data.length === 0);
  const workers = useMemo(() => {
    if (workerProfiles.error || workerProfiles.data.length === 0) return fallbackWorkers;

    return workerProfiles.data.map((profile) => mergeWorkerProfile(profile));
  }, [workerProfiles.data, workerProfiles.error]);

  const results = useMemo(() => {
    return workers.filter((worker) => {
      const categoryMatch = !category || worker.specialties.includes(category);
      const municipalityMatch = !municipality || worker.coverageAreas.includes(municipality) || worker.municipality === municipality;
      const verifiedMatch = !verifiedOnly || worker.verified;
      const ratingMatch = worker.ratingAvg >= Number(minRating);
      const rateMatch = worker.hourlyRate <= Number(maxRate);

      return categoryMatch && municipalityMatch && verifiedMatch && ratingMatch && rateMatch;
    });
  }, [category, municipality, verifiedOnly, minRating, maxRate, workers]);

  return (
    <div className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">Directorio local</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-[#191c1b]">Encuentra trabajadores por oficio, municipio y confianza.</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="soft-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-[#191c1b]">Filtros</h2>
          <div className="mt-5 grid gap-4">
            <label className="field">
              <span>Oficio</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Todos</option>
                {serviceCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Municipio</span>
              <select value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
                <option value="">Toda la zona</option>
                {municipalities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[#c0c8c4] px-4 py-3 text-sm font-semibold text-[#414845]">
              Solo verificados
              <input className="accent-[#00261e]" type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
            </label>
            <label className="field">
              <span>Calificación mínima</span>
              <select value={minRating} onChange={(event) => setMinRating(event.target.value)}>
                <option value="0">Cualquiera</option>
                <option value="4.5">4.5 o más</option>
                <option value="4.8">4.8 o más</option>
              </select>
            </label>
            <label className="field">
              <span>Precio máximo por hora</span>
              <input type="range" min="30000" max="70000" step="5000" value={maxRate} onChange={(event) => setMaxRate(event.target.value)} />
              <strong className="text-sm text-[#00261e]">${Number(maxRate).toLocaleString("es-CO")}</strong>
            </label>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-[#5f5e5a]">{loading ? "Buscando trabajadores..." : `${results.length} trabajadores encontrados`}</p>
            <span className="rounded-lg border border-[#c0c8c4] bg-white px-4 py-2 text-xs font-bold text-[#00261e] shadow-sm">
              {usingFallback ? "Fallback visual" : "Firestore"}
            </span>
          </div>
          {error && <p className="mb-4 rounded-lg bg-[#ffdcc0] px-4 py-3 text-sm font-semibold text-[#542d00]">{error}</p>}
          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <LoadingSkeleton className="h-56" count={2} />
            </div>
          ) : results.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {results.map((worker) => (
                <WorkerCard key={worker.uid} worker={worker} />
              ))}
            </div>
          ) : (
            <EmptyState title="No hay resultados con esos filtros" message="Prueba con otro municipio, baja la calificación mínima o amplía el precio máximo." />
          )}
        </section>
      </div>
    </div>
  );
}
