"use client";

import { useCollection } from "@/hooks/useCollection";
import { normalizeWorkerProfile } from "@/lib/worker-profile";
import type { WorkerProfile } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
import { WorkerCard } from "./WorkerCard";

type WorkerDocument = Partial<WorkerProfile> & { id?: string };

export function FeaturedWorkers() {
  const { data, loading, error } = useCollection<WorkerDocument>(
    "workerProfiles",
    [{ field: "published", op: "==", value: true }],
    { limit: 3 },
  );
  const workers = data.map((worker) =>
    normalizeWorkerProfile(String(worker.uid || worker.id || ""), worker as Record<string, unknown>),
  );

  if (loading) return <LoadingSkeleton className="h-56" count={3} />;
  if (error) return <p className="rounded-lg bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">No pudimos cargar los perfiles destacados desde Firebase.</p>;
  if (!workers.length) return <EmptyState title="Aún no hay trabajadores destacados" message="Los perfiles verificados y publicados aparecerán aquí." actionHref="/buscar" actionLabel="Ver directorio" />;

  return workers.map((worker) => <WorkerCard key={worker.uid} worker={worker} />);
}
