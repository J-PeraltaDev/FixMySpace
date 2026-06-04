"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import type { Notification } from "@/lib/types";
import { useAuth } from "./AuthProvider";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Servicios" },
  { href: "/solicitudes/nueva", label: "Solicitar" },
  { href: "/dashboard", label: "Panel" },
  { href: "/ayuda", label: "Ayuda" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { profile, loading, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;

    return onSnapshot(query(collection(db, "notifications"), where("userId", "==", profile.uid)), (snapshot) => {
      setNotifications(snapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Notification));
    });
  }, [profile]);

  const unread = profile ? notifications.filter((item) => !item.read).length : 0;
  const visibleNavItems = useMemo(() => {
    if (profile?.role === "admin") return [...navItems, { href: "/admin", label: "Admin" }];
    return navItems;
  }, [profile?.role]);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-emerald-950/10 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="FixMySpace inicio">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-950 text-sm font-black text-white shadow-sm">
            FM
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-black text-emerald-950">FixMySpace</span>
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">Servicios locales confiables</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {visibleNavItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-emerald-950 text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/notificaciones"
            className="relative hidden rounded-full border border-emerald-950/10 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 sm:inline-flex"
          >
            Avisos
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-700 text-[11px] text-white">
                {unread}
              </span>
            )}
          </Link>

          {loading ? (
            <span className="h-10 w-24 animate-pulse rounded-full bg-slate-100" />
          ) : profile ? (
            <div className="flex items-center gap-2">
              <Link href="/perfil" className="hidden text-right text-sm sm:block">
                <span className="block font-bold text-slate-900">{profile.fullName}</span>
                <span className="block text-xs capitalize text-slate-500">{profile.role}</span>
              </Link>
              <button className="secondary-button hidden sm:inline-flex" onClick={logout}>
                Salir
              </button>
            </div>
          ) : (
            <Link href="/login" className="primary-button">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
