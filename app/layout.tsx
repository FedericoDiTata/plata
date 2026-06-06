import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plata — tus finanzas al día",
  description:
    "Registrá tus gastos e ingresos en 2 toques. Multimoneda, presupuestos, metas y deudas. Privado y gratis.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Plata",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0a16",
  width: "device-width",
  initialScale: 1,
  // Permite que el contenido use toda la pantalla incluyendo el notch
  viewportFit: "cover",
  // Evita el zoom accidental al tocar inputs en iOS (sensación de app)
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
