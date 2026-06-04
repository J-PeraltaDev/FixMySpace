import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { WorkerCard } from "@/components/WorkerCard";
import { serviceCategories, workers } from "@/lib/mock-data";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#063f32_0%,#0f5c47_52%,#f7faf7_52%)]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="eyebrow text-emerald-100">FixMySpace</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Servicios locales para cuidar tu hogar sin vueltas.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-50">
              Encuentra trabajadores independientes, publica solicitudes, agenda visitas, conversa por chat y conserva tu historial de trabajos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="light-button">
                Registrarme
              </Link>
              <Link href="/buscar" className="outline-light-button">
                Explorar trabajadores
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-4 shadow-2xl sm:p-5">
            <SearchBar />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {serviceCategories.slice(0, 6).map((category) => (
                <Link key={category} href={`/buscar?oficio=${encodeURIComponent(category)}`} className="rounded-3xl bg-slate-50 p-4 font-black text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-950">
                  {category}
                  <span className="mt-2 block text-xs font-semibold text-slate-500">Disponibilidad local</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Trabajadores destacados</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Perfiles listos para contratar</h2>
          </div>
          <Link href="/buscar" className="secondary-button w-fit">
            Ver directorio
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {workers.slice(0, 3).map((worker) => (
            <WorkerCard key={worker.uid} worker={worker} />
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["1", "Publica la solicitud"],
            ["2", "Compara perfiles"],
            ["3", "Agenda y conversa"],
            ["4", "Califica el trabajo"],
          ].map(([number, label]) => (
            <div key={number} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-950 font-black text-white">{number}</span>
              <h3 className="mt-4 text-lg font-black text-slate-950">{label}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
