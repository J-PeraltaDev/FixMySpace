"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { municipalities, serviceCategories } from "@/lib/catalog";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [municipality, setMunicipality] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("oficio", category);
    if (municipality) params.set("municipio", municipality);
    router.push(`/buscar${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={submit} className={`search-panel ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <label className="field">
        <span>Oficio</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Todos los servicios</option>
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
      <button className="primary-button min-h-12" type="submit">
        Buscar trabajadores
      </button>
    </form>
  );
}
