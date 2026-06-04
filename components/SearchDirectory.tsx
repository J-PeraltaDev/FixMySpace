"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWorkers } from "@/lib/firebase-data";
import { municipalities, serviceCategories, workers as fallbackWorkers } from "@/lib/mock-data";
import type { WorkerProfile } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { WorkerCard } from "./WorkerCard";

export function SearchDirectory({ initialCategory = "", initialMunicipality = "" }: { initialCategory?: string; initialMunicipality?: string }) {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [municipality, setMunicipality] = useState(initialMunicipality);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState("0");
  const [maxRate, setMaxRate] = useState("60000");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkers() {
      setLoading(true);
      setError("");
      try {
        const firestoreWorkers = await fetchWorkers();
        if (!cancelled) setWorkers(firestoreWorkers.length ? firestoreWorkers : fallbackWorkers);
      } catch {
        if (!cancelled) {
          setWorkers(fallbackWorkers);
          setError("No pudimos leer Firestore. Mostramos perfiles de ejemplo mientras revisas la conexión.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkers();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <h1 className="mt-3 text-4xl font-black text-slate-950">Encuentra trabajadores por oficio, municipio y confianza.</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="soft-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-black text-slate-950">Filtros</h2>
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
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
              Solo verificados
              <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
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
              <strong className="text-sm text-emerald-900">${Number(maxRate).toLocaleString("es-CO")}</strong>
            </label>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-slate-600">{loading ? "Buscando trabajadores..." : `${results.length} trabajadores encontrados`}</p>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-900 shadow-sm">
              {error ? "Fallback visual" : "Firestore"}
            </span>
          </div>
          {error && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</p>}
          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="soft-card h-56 animate-pulse bg-white" />
              ))}
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
