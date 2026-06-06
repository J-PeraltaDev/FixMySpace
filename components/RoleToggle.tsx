"use client";

import type { UserRole } from "@/lib/types";

export function RoleToggle({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#eceeec] p-1">
      {(["cliente", "trabajador"] as UserRole[]).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`rounded-md px-4 py-3 text-sm font-bold capitalize transition ${
            value === role ? "bg-white text-[#00261e] shadow-sm" : "text-[#5f5e5a] hover:text-[#00261e]"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
