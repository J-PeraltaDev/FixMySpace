"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { municipalities } from "@/lib/mock-data";
import type { UserRole } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { RoleToggle } from "./RoleToggle";

export function LoginPanel() {
  const router = useRouter();
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [role, setRole] = useState<UserRole>("cliente");
  const [status, setStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setStatus("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    if (!email || !password) {
      setFormError("Escribe tu correo y contraseña.");
      return;
    }

    if (mode === "register") {
      const fullName = String(data.get("fullName") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const municipality = String(data.get("municipality") || "").trim();

      if (!fullName || !phone || !municipality) {
        setFormError("Completa nombre, teléfono y municipio para crear tu perfil.");
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({
          fullName: String(data.get("fullName") || ""),
          phone: String(data.get("phone") || ""),
          municipality: String(data.get("municipality") || ""),
          email,
          password,
          role,
        });
      }
      setStatus("Listo. Te llevamos al panel.");
      router.push("/dashboard");
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "No pudimos completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <section className="rounded-[2rem] bg-emerald-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-black uppercase text-emerald-200">Cuenta FixMySpace</p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">Un perfil para contratar, trabajar y mantener todo en orden.</h1>
          <div className="mt-8 grid gap-3">
            {["Solicitudes con estado y fotos opcionales.", "Perfiles por rol para cliente o trabajador.", "Historial, chat y calificaciones en el mismo lugar."].map((item) => (
              <div key={item} className="rounded-3xl bg-white/10 p-4 text-sm font-semibold text-emerald-50">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="soft-card p-5 sm:p-7">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-3 text-sm font-black ${mode === "register" ? "bg-white text-emerald-950 shadow-sm" : "text-slate-500"}`}
            >
              Registro
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-3 text-sm font-black ${mode === "login" ? "bg-white text-emerald-950 shadow-sm" : "text-slate-500"}`}
            >
              Inicio de sesión
            </button>
          </div>

          <form onSubmit={submit} className="grid gap-5">
            {mode === "register" && (
              <>
                <RoleToggle value={role} onChange={setRole} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field">
                    <span>Nombre completo</span>
                    <input name="fullName" placeholder="Ej. Ana Rodríguez" />
                  </label>
                  <label className="field">
                    <span>Teléfono</span>
                    <input name="phone" placeholder="Ej. 300 123 4567" />
                  </label>
                </div>
                <label className="field">
                  <span>Municipio</span>
                  <select name="municipality" defaultValue="">
                    <option value="" disabled>
                      Selecciona tu municipio
                    </option>
                    {municipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="field">
              <span>Correo electrónico</span>
              <input name="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input name="password" type="password" minLength={6} placeholder="Mínimo 6 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>

            {(formError || error) && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError || error}</p>}
            {status && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{status}</p>}

            <button className="primary-button min-h-12 w-full" type="submit" disabled={loading}>
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            También puedes explorar antes de registrarte en{" "}
            <Link href="/buscar" className="font-black text-emerald-950">
              búsqueda de trabajadores
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
