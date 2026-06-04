"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Servicios" },
  { href: "/notificaciones", label: "Avisos" },
  { href: "/perfil", label: "Perfil" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-950/10 bg-white/95 px-2 py-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-2 py-2 text-center text-xs font-bold transition ${
                isActive ? "bg-emerald-950 text-white" : "text-slate-500"
              }`}
            >
              <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-current" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
