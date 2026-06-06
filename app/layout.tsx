import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixMySpace Urabá",
  description: "Servicios domésticos confiables con trabajadores verificados del Urabá.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <AppHeader />
          <main className="min-h-screen pt-16 pb-24 lg:pb-0">{children}</main>
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
