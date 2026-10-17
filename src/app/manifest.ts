import type { MetadataRoute } from 'next'

/** Permite instalar Torneapp como app (ícono en la pantalla de inicio, sin barra del navegador). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Torneapp · Gestión de torneos de fútbol',
    short_name: 'Torneapp',
    description: 'Organiza tu torneo de fútbol: fixture, cédulas, tabla y avisos desde el celular.',
    lang: 'es-MX',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#030712',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
