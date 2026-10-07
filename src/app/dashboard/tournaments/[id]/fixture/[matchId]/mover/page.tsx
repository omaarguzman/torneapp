import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScheduleMatchForm from '../../ScheduleMatchForm'
import SwapMatchForm from './SwapMatchForm'
import { matchScheduleLabel } from '@/lib/fixtures/matchLabel'

export default async function MoveMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>
}) {
  const { id, matchId } = await params
  const supabase = await createClient()

  const [{ data: match }, { data: teams }, { data: venues }, { data: matches }, { data: matchdays }, { data: closures }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('id, status, home_team_id, away_team_id, match_date, start_time, end_time, venue_id, matchday_id')
        .eq('id', matchId)
        .eq('tournament_id', id)
        .maybeSingle(),
      supabase.from('teams').select('id, name').eq('tournament_id', id),
      supabase.from('venues').select('id, name, venue_slots(day_of_week, start_time, end_time)').eq('tournament_id', id).order('name'),
      supabase
        .from('matches')
        .select('id, status, home_team_id, away_team_id, match_date, start_time, venue_id, matchday_id')
        .eq('tournament_id', id)
        .neq('status', 'pending'),
      supabase.from('matchdays').select('id, number, week_start').eq('tournament_id', id).order('number'),
      supabase.from('venue_closures').select('venue_id, closed_on').eq('tournament_id', id),
    ])

  if (!match) notFound()

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]))
  const venueName = new Map((venues ?? []).map((v) => [v.id, v.name]))
  const matchdayNumber = new Map((matchdays ?? []).map((md) => [md.id, md.number]))
  const title = `${teamName.get(match.home_team_id) ?? '—'} vs ${teamName.get(match.away_team_id) ?? '—'}`
  const backHref = `/dashboard/tournaments/${id}/fixture`

  if (match.status !== 'scheduled') {
    return (
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <Link href={backHref} className="text-gray-500 text-sm hover:text-gray-300">← Volver al fixture</Link>
          <h1 className="font-display text-2xl uppercase tracking-wide text-white mt-4 mb-4">{title}</h1>
          <p className="text-yellow-400 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
            {match.status === 'played'
              ? 'Este partido ya se jugó, así que no se puede mover.'
              : 'Este partido está en Pendientes: prográmalo desde esa pestaña del fixture.'}
          </p>
        </div>
      </main>
    )
  }

  const slots = (venues ?? []).flatMap((v) =>
    (v.venue_slots ?? []).map((s: { day_of_week: number; start_time: string; end_time: string }) => ({ venue_id: v.id, ...s }))
  )

  const swapOptions = (matches ?? [])
    .filter((m) => m.id !== match.id && m.status === 'scheduled')
    .sort((a, b) => `${a.match_date}${a.start_time}`.localeCompare(`${b.match_date}${b.start_time}`))
    .map((m) => ({
      id: m.id,
      group: m.matchday_id ? `Jornada ${matchdayNumber.get(m.matchday_id)}` : 'Sin jornada',
      label: `${teamName.get(m.home_team_id) ?? '—'} vs ${teamName.get(m.away_team_id) ?? '—'} · ${matchScheduleLabel({
        status: m.status,
        match_date: m.match_date,
        start_time: m.start_time,
        venue_name: m.venue_id ? (venueName.get(m.venue_id) ?? null) : null,
      })}`,
    }))
    .sort((a, b) => {
      const na = parseInt(a.group.replace(/\D/g, '') || '0', 10)
      const nb = parseInt(b.group.replace(/\D/g, '') || '0', 10)
      return na - nb
    })

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href={backHref} className="text-gray-500 text-sm hover:text-gray-300">← Volver al fixture</Link>

        <h1 className="font-display text-2xl uppercase tracking-wide text-white mt-4 mb-1">{title}</h1>
        <p className="text-gray-500 text-sm capitalize mb-6">
          {match.matchday_id && `J${matchdayNumber.get(match.matchday_id)} · `}
          {matchScheduleLabel({
            status: match.status,
            match_date: match.match_date,
            start_time: match.start_time,
            venue_name: match.venue_id ? (venueName.get(match.venue_id) ?? null) : null,
          })}
        </p>

        <section className="bg-gray-900/70 border border-white/10 rounded-xl p-4 mb-6">
          <h2 className="font-condensed text-lg font-bold uppercase tracking-wide text-white">✏️ Cambiar fecha, cancha u horario</h2>
          <p className="text-gray-500 text-xs mt-1">
            Al cambiar la fecha, el partido pasa a la jornada de esa semana (puedes elegir otra). Su link de árbitro no
            cambia.
          </p>
          <ScheduleMatchForm
            mode="move"
            tournamentId={id}
            matchId={match.id}
            venues={(venues ?? []).map((v) => ({ id: v.id, name: v.name }))}
            slots={slots}
            scheduled={matches ?? []}
            matchdays={matchdays ?? []}
            closures={closures ?? []}
            initial={{
              date: match.match_date!,
              venueId: match.venue_id!,
              startTime: match.start_time!,
              endTime: match.end_time!,
            }}
          />
        </section>

        <section className="bg-gray-900/70 border border-white/10 rounded-xl p-4">
          <h2 className="font-condensed text-lg font-bold uppercase tracking-wide text-white mb-1">⇄ Intercambiar con otro partido</h2>
          <p className="text-gray-500 text-xs mb-3">
            Los dos partidos se cambian fecha, cancha, horario y jornada entre sí. Útil cuando un equipo pide otro horario
            y otro partido acepta el cambio.
          </p>
          <SwapMatchForm tournamentId={id} matchId={match.id} options={swapOptions} />
        </section>
      </div>
    </main>
  )
}
