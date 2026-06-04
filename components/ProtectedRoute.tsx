"use client";

import type { UserRole } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { EmptyState } from "./EmptyState";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="page-shell">
        <div className="soft-card grid gap-4 p-6">
          <span className="h-5 w-36 animate-pulse rounded-full bg-slate-100" />
          <span className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Inicia sesión para continuar"
          message="Esta sección guarda información personal de solicitudes, agenda, perfil o conversaciones."
          actionHref="/login"
          actionLabel="Entrar o registrarme"
        />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Tu rol no tiene acceso a esta sección"
          message="FixMySpace separa las herramientas de cliente, trabajador y administración para mantener cada flujo ordenado."
          actionHref="/dashboard"
          actionLabel="Ir al panel"
        />
      </div>
    );
  }

  return <>{children}</>;
}
