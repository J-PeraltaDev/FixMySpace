import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixMySpace",
  description: "Servicios domésticos y de mantenimiento con trabajadores locales.",
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
      <body className="min-h-full bg-[#f7faf7] text-slate-900">
        <AuthProvider>
          <AppHeader />
          <main className="min-h-screen pt-16 pb-24 lg:pb-0">{children}</main>
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
