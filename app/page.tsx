import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { FeaturedWorkers } from "@/components/FeaturedWorkers";
import { serviceCategories } from "@/lib/catalog";

export default function Home() {
  return (
    <div>
      <section className="border-b border-[#c0c8c4] bg-[#f8faf8]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
          <div className="max-w-2xl">
            <p className="eyebrow">FixMySpace Uraba</p>
            <h1 className="mt-4 font-sans text-4xl font-bold leading-tight text-[#191c1b] sm:text-5xl lg:text-6xl">
              Tu espacio, en manos expertas del Uraba.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#414845]">
              Conecta con trabajadores locales verificados para plomeria, electricidad, pintura, limpieza y mantenimiento del hogar.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/buscar" className="primary-button">
                Explorar trabajadores
              </Link>
              <Link href="/login" className="secondary-button">
                Crear cuenta
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Identidad", "Perfiles verificados"],
                ["Agenda", "Solicitudes y citas"],
                ["Soporte", "Historial y evidencias"],
              ].map(([label, value]) => (
                <div key={label} className="surface-panel">
                  <p className="text-xs font-bold uppercase text-[#5f5e5a]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#191c1b]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-card p-4 sm:p-5">
            <SearchBar />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {serviceCategories.slice(0, 6).map((category) => (
                <Link key={category} href={`/buscar?oficio=${encodeURIComponent(category)}`} className="rounded-lg border border-[#c0c8c4] bg-[#f2f4f2] p-4 font-bold text-[#191c1b] transition hover:border-[#00261e] hover:bg-[#eceeec] hover:text-[#00261e]">
                  {category}
                  <span className="mt-2 block text-xs font-semibold text-[#5f5e5a]">Disponibilidad local</span>
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
            <h2 className="mt-3 text-3xl font-bold text-[#191c1b]">Perfiles listos para contratar</h2>
          </div>
          <Link href="/buscar" className="secondary-button w-fit">
            Ver directorio
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <FeaturedWorkers />
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
            <div key={number} className="rounded-xl border border-[#c0c8c4] bg-[#f2f4f2] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#00261e] font-bold text-white">{number}</span>
              <h3 className="mt-4 text-lg font-bold text-[#191c1b]">{label}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
