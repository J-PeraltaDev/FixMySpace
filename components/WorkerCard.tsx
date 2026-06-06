import Link from "next/link";
import type { WorkerProfile } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function WorkerAvatar({ worker, size = "md" }: { worker: WorkerProfile; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-24 w-24 text-2xl" : size === "sm" ? "h-12 w-12 text-sm" : "h-16 w-16 text-lg";

  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-[#00261e] font-bold text-white shadow-sm ring-4 ring-[#f8faf8]`}>
      {initials(worker.fullName)}
    </div>
  );
}

export function WorkerCard({ worker }: { worker: WorkerProfile }) {
  const mainSpecialties = worker.specialties.length ? worker.specialties.slice(0, 2).join(" · ") : "Oficios por completar";

  return (
    <article className="soft-card p-4 transition hover:-translate-y-0.5">
      <div className="flex gap-4">
        <WorkerAvatar worker={worker} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#191c1b]">{worker.fullName}</h3>
            {worker.verified && <span className="rounded-md bg-[#bfecdd] px-2.5 py-1 text-xs font-bold text-[#00261e]">Verificado</span>}
          </div>
          <p className="mt-1 text-sm font-semibold text-[#5f5e5a]">{mainSpecialties}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#414845]">{worker.bio}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#f2f4f2] p-3 text-center">
        <div>
          <p className="text-sm font-bold text-[#191c1b]">{worker.ratingAvg ? worker.ratingAvg.toFixed(1) : "Nuevo"}</p>
          <p className="text-xs text-[#5f5e5a]">Calificacion</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[#191c1b]">{worker.distanceKm ? `${worker.distanceKm} km` : "Local"}</p>
          <p className="text-xs text-[#5f5e5a]">Distancia</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[#191c1b]">{worker.hourlyRate ? `$${worker.hourlyRate.toLocaleString("es-CO")}` : "Por acordar"}</p>
          <p className="text-xs text-[#5f5e5a]">Hora</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#00261e]">{worker.responseTime}</p>
        <Link href={`/trabajador/${worker.uid}`} className="secondary-button">
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
