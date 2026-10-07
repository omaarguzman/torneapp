import type { NextConfig } from "next";

const securityHeaders = [
  // Nadie puede incrustar Torneapp en un iframe (evita clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // CSP mínima: sin plugins, sin cambiar la URL base y sin incrustarse en otros sitios.
  // Una CSP estricta de scripts requiere nonces por petición; queda para más adelante.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  // El navegador no "adivina" tipos de archivo distintos a los declarados
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al seguir un link externo no se filtra la URL completa (que puede llevar tokens)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Logos y fotos pueden pesar hasta 2 MB (src/lib/uploads.ts) + lo que agrega el formulario
      bodySizeLimit: "2.5mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
