import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImportForm from './ImportForm'

export const metadata: Metadata = { title: 'Importar jornadas jugadas' }

export default async function ImportMatchdaysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tournament }, { data: teams }, { data: venues }, { data: matches }] = await Promise.all([
    supabase.from('tournaments').select('name, double_round, playoff_started_at').eq('id', id).single(),
    supabase.from('teams').select('id, name').eq('tournament_id', id).order('name'),
    supabase.from('venues').select('id, name, venue_slots(start_time)').eq('tournament_id', id).order('created_at'),
    supabase.from('matches').select('status, suspended_minute').eq('tournament_id', id),
  ])
  if (!tournament) notFound()

  const hasPlayed = (matches ?? []).some((m) => m.status === 'played' || m.status === 'suspended' || m.suspended_minute !== null)
  const hasFixture = (matches ?? []).length > 0
  const n = teams?.length ?? 0
  const maxRounds = (n % 2 === 0 ? n - 1 : n) * (tournament.double_round ? 2 : 1)

  let blocker: string | null = null
  if (tournament.playoff_started_at) blocker = 'La liguilla ya empezó; ya no se pueden importar jornadas.'
  else if (hasPlayed) blocker = 'Este torneo ya tiene partidos jugados en Torneapp. Para seguir, usa "Actualizar fixture".'
  else if (n < 3) blocker = 'Primero da de alta a todos los equipos del torneo (al menos 3).'
  else if ((venues ?? []).length === 0) blocker = 'Primero agrega las canchas del torneo con sus horarios.'

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/tournaments/${id}/fixture`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al fixture
        </Link>
        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4">Importar jornadas jugadas</h1>
        <p className="text-gray-500 text-sm mb-4">{tournament.name}</p>

        <p className="text-gray-400 text-sm mb-6">
          ¿Tu torneo empezó antes de usar Torneapp? Captura aquí las jornadas que ya se jugaron: quién jugó contra quién y el
          marcador. Después la app arma el resto del fixture sin repetir cruces.
        </p>

        {blocker ? (
          <p className="text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">{blocker}</p>
        ) : (
          <>
            {hasFixture && (
              <p className="mb-6 text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
                Este torneo ya tiene un fixture generado. Al importar se reemplaza por completo (no tiene partidos jugados, así
                que no se pierde ningún resultado).
              </p>
            )}
            <ImportForm
              tournamentId={id}
              teams={teams ?? []}
              venues={(venues ?? []).map((v) => ({
                id: v.id,
                name: v.name,
                defaultTime: ((v.venue_slots as { start_time: string }[] | null)?.[0]?.start_time ?? '09:00').slice(0, 5),
              }))}
              maxRounds={maxRounds}
            />
          </>
        )}
      </div>
    </main>
  )
}
