import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const sportLabels: Record<string, string> = {
  futbol_11: 'Fútbol 11',
  futbol_7: 'Fútbol 7',
  futbol_5: 'Fútbol 5',
  futbol_salon: 'Fútbol Salón',
}

const dateLabel = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : null

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, sport_type, start_date, end_date, double_round, logo_url, teams(count), matches(count)')
    .order('created_at', { ascending: false })

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="font-condensed text-sm uppercase tracking-widest text-amber-300">Panel del administrador</p>
            <h1 className="font-display text-4xl uppercase tracking-wide text-white mt-1">Mis torneos</h1>
          </div>
          <Link
            href="/dashboard/tournaments/new"
            className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:-translate-y-0.5"
          >
            + Nuevo torneo
          </Link>
        </div>

        {tournaments && tournaments.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {tournaments.map((t) => {
              const teams = (t.teams as { count: number }[] | null)?.[0]?.count ?? 0
              const matches = (t.matches as { count: number }[] | null)?.[0]?.count ?? 0
              const start = dateLabel(t.start_date)
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 hover:border-amber-400/50 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl group-hover:bg-amber-400/20 transition-colors" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {t.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">🏆</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-condensed text-xl font-bold text-white truncate">{t.name}</p>
                      <p className="text-gray-500 text-sm">
                        {sportLabels[t.sport_type] ?? t.sport_type} · {t.double_round ? 'Ida y vuelta' : 'Una vuelta'}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg py-2">
                      <p className="font-display text-xl text-white">{teams}</p>
                      <p className="text-[11px] text-gray-500 uppercase font-condensed tracking-wide">Equipos</p>
                    </div>
                    <div className="bg-white/5 rounded-lg py-2">
                      <p className="font-display text-xl text-white">{matches}</p>
                      <p className="text-[11px] text-gray-500 uppercase font-condensed tracking-wide">Partidos</p>
                    </div>
                    <div className="bg-white/5 rounded-lg py-2">
                      <p className="font-condensed font-bold text-sm text-white mt-1">{start ?? '—'}</p>
                      <p className="text-[11px] text-gray-500 uppercase font-condensed tracking-wide">Inicio</p>
                    </div>
                  </div>
                  <p className="relative mt-4 text-sm font-semibold text-amber-300 group-hover:text-amber-200">Administrar →</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="border border-dashed border-white/15 rounded-2xl p-12 text-center">
            <p className="text-4xl">🏆</p>
            <p className="font-condensed text-xl font-bold text-white mt-3">Aún no tienes torneos</p>
            <p className="text-gray-500 text-sm mt-1">Crea el primero: define reglas, canchas y equipos, y genera el fixture.</p>
            <Link
              href="/dashboard/tournaments/new"
              className="inline-block mt-6 bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-5 py-2.5 rounded-xl"
            >
              + Crear mi primer torneo
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
