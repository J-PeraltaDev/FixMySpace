"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationForRole, isNavItemActive } from "@/lib/navigation";
import { useAuth } from "./AuthProvider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const items = getNavigationForRole(profile?.role).slice(0, 4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#c0c8c4] bg-white/95 px-2 py-2 shadow-[0_-8px_20px_rgba(0,38,30,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-2 py-2 text-center text-xs font-bold transition ${
                isActive ? "bg-[#00261e] text-white" : "text-[#5f5e5a]"
              }`}
            >
              <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-current" />
              {item.shortLabel || item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
