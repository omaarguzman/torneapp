import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Títulos tipo estadio
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

// Texto general
const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Números, etiquetas y nombres en tarjetas
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Torneapp — Gestión de torneos de fútbol",
    template: "%s · Torneapp",
  },
  description:
    "Organiza tu torneo de fútbol: fixture automático, cédula digital del árbitro, tabla de posiciones, rol de juegos para compartir, pagos y avisos para los delegados.",
  // Instalada como app en iPhone: pantalla completa y nombre bajo el ícono
  appleWebApp: { capable: true, title: "Torneapp", statusBarStyle: "black" },
};

// Color de la barra del sistema al usarla como app
export const viewport: Viewport = {
  themeColor: "#030712",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
