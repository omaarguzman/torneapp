import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Reveal from '@/components/landing/Reveal'
import RotatingWord from '@/components/landing/RotatingWord'
import LiveMatchPhone from '@/components/landing/LiveMatchPhone'
import ShowcaseTabs from '@/components/landing/ShowcaseTabs'
import { createClient } from '@/lib/supabase/server'

const MARQUEE = [
  '🗓️ Fixture automático',
  '📝 Cédula digital del árbitro',
  '🏆 Tabla en tiempo real',
  '🖼️ Rol de juegos para WhatsApp',
  '🚫 Suspensiones automáticas',
  '💰 Control de pagos',
  '🔔 Avisos a delegados',
  '🏳️ W.O. y partidos suspendidos',
  '📊 Exporta a PDF y Excel',
  '📜 Reglamento siempre a la mano',
]

const STATS = [
  { value: '6', label: 'plantillas de temporada' },
  { value: '3', label: 'papeles: admin, delegado y árbitro' },
  { value: '100%', label: 'desde el celular' },
]

const STEPS = [
  { n: '1', title: 'Crea tu torneo', text: 'Formato, reglas, canchas y horarios.' },
  { n: '2', title: 'Invita a los delegados', text: 'Cada uno registra a su equipo y jugadores.' },
  { n: '3', title: 'Genera el fixture y juega', text: 'Comparte el rol y deja que la tabla se actualice sola.' },
]

/** Haz de luz de estadio que se mueve lentamente. */
function Beam({ side, delay }: { side: 'left' | 'right'; delay: number }) {
  const from = side === 'left' ? '-28deg' : '28deg'
  const to = side === 'left' ? '-14deg' : '14deg'
  return (
    <div
      className="animate-beam absolute -top-24 w-40 sm:w-56 h-[130%] bg-gradient-to-b from-white/25 via-white/5 to-transparent blur-2xl"
      style={{ [side]: '6%', animationDelay: `${delay}s`, ['--from' as string]: from, ['--to' as string]: to }}
    />
  )
}

export default async function Home() {
  // Con sesión iniciada, los botones llevan a su panel
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let panel: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    panel = profile?.role === 'delegate' ? '/delegado' : '/dashboard'
  }
  const primaryCta = panel ? { href: panel, label: 'Ir a mi panel' } : { href: '/register', label: 'Crear mi torneo gratis' }

  return (
    <main className="flex-1 bg-gray-950 text-white overflow-x-hidden">
      {/* ---------- Portada ---------- */}
      <section className="relative min-h-[100svh] flex flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,58,138,0.45),transparent_60%)]" />
          <Beam side="left" delay={0} />
          <Beam side="right" delay={1.5} />
          <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-green-950/70 via-green-950/20 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-24 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0_80px,transparent_80px_160px)]" />
        </div>

        <header className="relative z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <Logo size={30} />
            <nav className="flex items-center gap-2 sm:gap-4">
              {panel ? (
                <Link href={panel} className="text-sm font-semibold text-amber-300 hover:text-amber-200">
                  Mi panel →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="whitespace-nowrap text-sm font-semibold text-gray-300 hover:text-white px-2 py-2">
                    <span className="sm:hidden">Entrar</span>
                    <span className="hidden sm:inline">Iniciar sesión</span>
                  </Link>
                  <Link
                    href="/register"
                    className="whitespace-nowrap text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-gray-950 px-3 sm:px-4 py-2 rounded-lg transition-colors"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center pb-10">
          <div>
            <p className="inline-flex items-center gap-2 font-condensed font-semibold text-sm tracking-widest uppercase text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-live" />
              Gestión de torneos de fútbol
            </p>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl xl:text-7xl leading-[1.02] uppercase">
              Lleva <RotatingWord words={['tu liga', 'tu torneo', 'tus jornadas', 'tu temporada']} />
              <br />
              como profesional
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-xl">
              Fixture automático, cédula digital del árbitro, tabla al momento y el rol de juegos listo para WhatsApp.
              Todo en una sola app, sin hojas de cálculo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryCta.href}
                className="group bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5"
              >
                {primaryCta.label} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#recorrido"
                className="border border-white/15 hover:border-white/40 bg-white/5 text-gray-100 font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                Ver la app en acción
              </a>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {STATS.map((s) => (
                <div key={s.label} className="border-l-2 border-amber-400/50 pl-3">
                  <dt className="font-display text-3xl text-gold">{s.value}</dt>
                  <dd className="text-xs text-gray-400 leading-snug mt-1">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative flex justify-center lg:justify-end min-h-[34rem]">
            <div className="hidden sm:block absolute left-0 top-16 w-44 animate-float" style={{ ['--r' as string]: '-10deg' }}>
              <Image
                src="/rol/plantillas/muertos.webp"
                alt="Rol de juegos con plantilla de Día de Muertos"
                width={1122}
                height={1402}
                priority
                sizes="180px"
                className="rounded-xl border border-white/10 shadow-2xl shadow-black/60 opacity-80"
              />
            </div>
            <div
              className="hidden sm:block absolute -right-4 bottom-4 w-40 animate-float"
              style={{ ['--r' as string]: '9deg', animationDelay: '-3s' }}
            >
              <Image
                src="/rol/plantillas/navidad.webp"
                alt="Rol de juegos con plantilla de Navidad"
                width={1122}
                height={1402}
                priority
                sizes="180px"
                className="rounded-xl border border-amber-400/30 shadow-2xl shadow-black/60 opacity-80"
              />
            </div>
            <div className="relative mt-24 lg:mt-16 lg:mr-16">
              <LiveMatchPhone />
            </div>
          </div>
        </div>

        {/* Cinta de funciones */}
        <div className="relative z-10 border-y border-white/10 bg-black/40 backdrop-blur py-3 overflow-hidden">
          <div className="flex w-max animate-marquee gap-10 pr-10">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="whitespace-nowrap font-condensed font-semibold uppercase tracking-wide text-gray-300 text-sm">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Recorrido por la app ---------- */}
      <section id="recorrido" className="relative py-20 scroll-mt-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(245,200,76,0.10),transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="font-display text-4xl sm:text-5xl uppercase text-center">
              Todo tu torneo <span className="text-gold">en una sola app</span>
            </h2>
            <p className="text-gray-400 text-center mt-3 max-w-2xl mx-auto">Así se ve por dentro. Cada quien ve lo que le toca.</p>
          </Reveal>
          <Reveal delay={150} className="mt-10">
            <ShowcaseTabs />
          </Reveal>
        </div>
      </section>

      {/* ---------- Pasos + llamado final ---------- */}
      <section className="relative py-20 border-t border-white/5 bg-gradient-to-b from-gray-950 via-green-950/25 to-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <Reveal>
            <h2 className="font-display text-4xl uppercase">
              Empieza en <span className="text-gold">3 pasos</span>
            </h2>
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 hover:border-amber-400/40 transition-colors">
                  <span className="w-10 h-10 rounded-full bg-amber-400 text-gray-950 font-display text-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    {s.n}
                  </span>
                  <h3 className="font-condensed font-bold text-lg mt-4">{s.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{s.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 via-gray-900 to-gray-950 p-8 text-center">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl" />
              <h3 className="relative font-display text-3xl uppercase leading-tight">
                ¿Listo para tu <span className="text-gold">próxima temporada</span>?
              </h3>
              <p className="relative text-gray-300 mt-3 text-sm">Gratis durante la etapa de pruebas.</p>
              <Link
                href={primaryCta.href}
                className="relative inline-block mt-6 bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:-translate-y-0.5"
              >
                {primaryCta.label}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size={24} />
          <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Torneapp · Gestión de torneos de fútbol</p>
        </div>
      </footer>
    </main>
  )
}
