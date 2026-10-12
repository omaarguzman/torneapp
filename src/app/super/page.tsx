import { createClient } from '@/lib/supabase/server'
import SuperTournaments, { type SuperTournament } from './SuperTournaments'

export default async function SuperPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('super_tournaments')
  if (error) console.error('[super] super_tournaments error:', error)
  const tournaments = (data ?? []) as SuperTournament[]

  const paused = tournaments.filter((t) => t.disabled_at).length
  const admins = new Set(tournaments.map((t) => t.admin_id)).size
  const tiles = [
    { value: tournaments.length, label: 'Torneos' },
    { value: tournaments.length - paused, label: 'Activos' },
    { value: paused, label: 'Pausados' },
    { value: admins, label: 'Admins con torneo' },
  ]

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <p className="font-condensed text-sm uppercase tracking-widest text-violet-300">Soporte de Torneapp</p>
        <h1 className="font-display text-4xl uppercase tracking-wide text-white mt-1">Portal general</h1>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="bg-gray-900/70 border border-white/10 rounded-xl px-4 py-3">
              <p className="font-display text-3xl text-white tabular-nums">{t.value}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t.label}</p>
            </div>
          ))}
        </div>

        <SuperTournaments tournaments={tournaments} />
      </div>
    </main>
  )
}
