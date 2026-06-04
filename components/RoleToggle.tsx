"use client";

import type { UserRole } from "@/lib/types";

export function RoleToggle({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
      {(["cliente", "trabajador"] as UserRole[]).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`rounded-full px-4 py-3 text-sm font-black capitalize transition ${
            value === role ? "bg-emerald-950 text-white shadow-sm" : "text-slate-600 hover:text-emerald-950"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
