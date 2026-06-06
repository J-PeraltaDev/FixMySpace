import type { UserRole } from "./types";

export type NavAudience = UserRole | "visitante";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

const visitorNav: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Servicios" },
  { href: "/ayuda", label: "Ayuda" },
];

const clientNav: NavItem[] = [
  { href: "/buscar", label: "Buscar" },
  { href: "/solicitudes/nueva", label: "Solicitar" },
  { href: "/mensajes", label: "Mensajes" },
  { href: "/historial", label: "Historial" },
  { href: "/dashboard", label: "Panel" },
];

const workerNav: NavItem[] = [
  { href: "/dashboard", label: "Solicitudes" },
  { href: "/mensajes", label: "Mensajes" },
  { href: "/historial", label: "Historial" },
  { href: "/verificacion", label: "Verificacion" },
  { href: "/perfil", label: "Perfil" },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin" },
  { href: "/dashboard", label: "Panel" },
  { href: "/verificacion", label: "Verificacion" },
  { href: "/notificaciones", label: "Avisos" },
  { href: "/ayuda", label: "Soporte" },
];

export function getNavigationForRole(role?: UserRole | null): NavItem[] {
  if (role === "admin") return adminNav;
  if (role === "trabajador") return workerNav;
  if (role === "cliente") return clientNav;
  return visitorNav;
}

export function getPrimaryActionForRole(role?: UserRole | null): NavItem {
  if (role === "admin") return { href: "/admin", label: "Supervisar" };
  if (role === "trabajador") return { href: "/dashboard", label: "Ver agenda" };
  if (role === "cliente") return { href: "/solicitudes/nueva", label: "Nueva solicitud" };
  return { href: "/login", label: "Entrar" };
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/mensajes") return pathname.startsWith("/mensajes") || pathname.startsWith("/chat");
  return pathname === href || pathname.startsWith(`${href}/`);
}
