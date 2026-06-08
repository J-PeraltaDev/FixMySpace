"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
import { getNavigationForRole, getPrimaryActionForRole, isNavItemActive } from "@/lib/navigation";
import type { Notification } from "@/lib/types";
import { useAuth } from "./AuthProvider";

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
  const visibleNavItems = useMemo(() => getNavigationForRole(profile?.role), [profile?.role]);
  const primaryAction = useMemo(() => getPrimaryActionForRole(profile?.role), [profile?.role]);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#c0c8c4] bg-[#f8faf8]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="FixMySpace inicio">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#00261e] text-sm font-bold text-white shadow-sm">
            FM
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-[#00261e]">
              {profile ? profile.fullName : "FixMySpace"}
            </span>

            <span className="hidden text-xs font-semibold capitalize text-[#5f5e5a] sm:inline">
              {profile ? profile.role : "Urabá Antioqueño"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {visibleNavItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-[#00261e] text-white" : "text-[#414845] hover:bg-[#eceeec] hover:text-[#00261e]"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {profile && (
            <>
              <Link
                href="/mensajes"
                className="hidden h-10 items-center rounded-lg border border-[#c0c8c4] px-3 text-sm font-semibold text-[#00261e] transition hover:bg-[#eceeec] sm:inline-flex"
              >
                Mensajes
              </Link>
              <Link
                href="/notificaciones"
                className="relative hidden h-10 items-center rounded-lg border border-[#c0c8c4] px-3 text-sm font-semibold text-[#00261e] transition hover:bg-[#eceeec] sm:inline-flex"
              >
                Avisos
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#123d33] text-[11px] text-white">
                    {unread}
                  </span>
                )}
              </Link>
            </>
          )}

          {loading ? (
            <span className="h-10 w-24 animate-pulse rounded-lg bg-[#eceeec]" />
          ) : profile ? (
            <div className="flex items-center gap-2">
              <button className="secondary-button hidden sm:inline-flex" onClick={logout}>
                Salir
              </button>
            </div>
          ) : (
            <Link href={primaryAction.href} className="primary-button">
              {primaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
