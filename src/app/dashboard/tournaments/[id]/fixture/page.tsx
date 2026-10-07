import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GenerateFixtureButton from './GenerateFixtureButton'
import CopyLinkButton from '@/components/CopyLinkButton'
import SectionTabs from '@/components/SectionTabs'
import { currentMatchdayId } from '@/lib/fixtures/currentMatchday'
import { computeSuspensions, type SuspensionReason } from '@/lib/stats/suspensions'
import PostponeButton from './PostponeButton'
import ScheduleMatchForm from './ScheduleMatchForm'
import UndoPostponeButton from './UndoPostponeButton'
import { matchScheduleLabel } from '@/lib/fixtures/matchLabel'

const suspensionLabels: Record<SuspensionReason, string> = {
  yellow_accumulation: 'acumulación de amarillas',
  red_card: 'roja directa',
  double_yellow: 'doble amarilla',
}

type MatchRow = {
  id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  start_time: string
  end_time: string
  status: string
  score_home: number | null
  score_away: number | null
  validated_at: string | null
  home_team: { name: string; logo_url: string | null } | null
  away_team: { name: string; logo_url: string | null } | null
  venue: { name: string } | null
}

type MatchdayRow = {
  id: string
  number: number
  week_start: string
  matches: MatchRow[]
}

export default async function FixturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, yellow_card_suspension_threshold, red_card_suspension_matches')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', id)

  const teamNames: Record<string, string> = {}
  teams?.forEach((t) => {
    teamNames[t.id] = t.name
  })

  const { data: players } = await supabase
    .from('players')
    .select('id, full_name, team_id')
    .eq('tournament_id', id)

  const playerNames = new Map<string, string>()
  const rosterByTeam = new Map<string, string[]>()
  players?.forEach((p) => {
    playerNames.set(p.id, p.full_name)
    if (!rosterByTeam.has(p.team_id)) rosterByTeam.set(p.team_id, [])
    rosterByTeam.get(p.team_id)!.push(p.id)
  })

  const { data: allMatches } = await supabase
    .from('matches')
    .select(
      'id, home_team_id, away_team_id, match_date, start_time, venue_id, status, postponed_from, original_match_date, original_start_time, original_venue_id'
    )
    .eq('tournament_id', id)

  const pendingMatches = (allMatches ?? [])
    .filter((m) => m.status === 'pending')
    .sort((a, b) => (a.postponed_from ?? 999) - (b.postponed_from ?? 999))
  const scheduledMatches = (allMatches ?? []).filter((m) => m.status !== 'pending')
  const hasPlayedMatches = scheduledMatches.some((m) => m.status === 'played')

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, venue_slots(day_of_week, start_time, end_time)')
    .eq('tournament_id', id)
    .order('name')

  const venueSlots = (venues ?? []).flatMap((v) =>
    (v.venue_slots ?? []).map((s: { day_of_week: number; start_time: string; end_time: string }) => ({
      venue_id: v.id,
      ...s,
    }))
  )

  const { data: allEvents } = await supabase
    .from('match_events')
    .select('match_id, player_id, type, match:matches!inner(tournament_id)')
    .eq('match.tournament_id', id)

  const suspensions = computeSuspensions({
    // Los pendientes no tienen fecha: no cuentan para cumplir suspensiones hasta que se programen
    matches: scheduledMatches.map((m) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      matchDate: m.match_date!,
      startTime: m.start_time!,
      status: m.status,
    })),
    events: (allEvents ?? []).map((e) => ({ matchId: e.match_id, playerId: e.player_id, type: e.type })),
    rosterByTeam,
    yellowThreshold: tournament.yellow_card_suspension_threshold,
    redSuspensionMatches: tournament.red_card_suspension_matches,
  })

  const suspensionsByMatch = new Map<string, typeof suspensions>()
  suspensions.forEach((s) => {
    if (!suspensionsByMatch.has(s.matchId)) suspensionsByMatch.set(s.matchId, [])
    suspensionsByMatch.get(s.matchId)!.push(s)
  })

  const { data: matchdays } = await supabase
    .from('matchdays')
    .select(
      `id, number, week_start,
       matches!matchday_id (
         id, home_team_id, away_team_id, match_date, start_time, end_time,
         status, score_home, score_away, validated_at,
         home_team:teams!matches_home_team_id_fkey(name, logo_url),
         away_team:teams!matches_away_team_id_fkey(name, logo_url),
         venue:venues!venue_id(name)
       )`
    )
    .eq('tournament_id', id)
    .order('number') as { data: MatchdayRow[] | null }

  // Los links de árbitro viven en match_tokens, que solo puede leer el admin
  const { data: tokens } = await supabase.from('match_tokens').select('match_id, token').eq('tournament_id', id)
  const tokenByMatch = new Map((tokens ?? []).map((t) => [t.match_id, t.token]))

  matchdays?.forEach((md) => {
    md.matches.sort((a, b) => (a.match_date + a.start_time).localeCompare(b.match_date + b.start_time))
  })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>

        <div className="flex items-center justify-between mt-4 mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Fixture</h1>
            <p className="text-gray-500 text-sm">{tournament.name}</p>
          </div>
          <GenerateFixtureButton
            tournamentId={id}
            teamNames={teamNames}
            hasExistingFixture={(matchdays?.length ?? 0) > 0}
            hasPlayedMatches={hasPlayedMatches}
          />
        </div>

        {matchdays && matchdays.length > 0 ? (
          <SectionTabs
            defaultKey={currentMatchdayId(matchdays)}
            tabs={[
              ...matchdays.map((md) => {
              // Un equipo con partido aplazado de esta jornada no "descansa": tiene un pendiente
              const playingTeamIds = new Set([
                ...md.matches.flatMap((m) => [m.home_team_id, m.away_team_id]),
                ...pendingMatches
                  .filter((p) => p.postponed_from === md.number)
                  .flatMap((p) => [p.home_team_id, p.away_team_id]),
              ])
              const restingTeam = teams?.find((t) => !playingTeamIds.has(t.id))

              return {
                key: md.id,
                label: `J${md.number}`,
                content: (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-bold">Jornada {md.number}</h2>
                  {restingTeam && (
                    <span className="text-gray-500 text-xs">
                      Descansa: <span className="text-gray-300">{restingTeam.name}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {md.matches.map((m) => {
                    const dateLabel = new Date(m.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })
                    const played = m.status === 'played'
                    const matchSuspensions = suspensionsByMatch.get(m.id) ?? []
                    return (
                      <div
                        key={m.id}
                        className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-white text-sm font-medium truncate">
                              {m.home_team?.name ?? '—'}
                            </span>
                            {played ? (
                              <span className="text-white text-sm font-bold bg-gray-800 px-2 py-0.5 rounded">
                                {m.score_home} – {m.score_away}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">vs</span>
                            )}
                            <span className="text-white text-sm font-medium truncate">
                              {m.away_team?.name ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs text-gray-500">
                              <p className="capitalize">{dateLabel} · {m.start_time.slice(0, 5)}</p>
                              <p>{m.venue?.name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Link
                                href={`/dashboard/tournaments/${id}/fixture/${m.id}`}
                                className="text-green-400 hover:text-green-300 text-[11px] font-semibold whitespace-nowrap"
                              >
                                {played ? 'Ver cédula' : 'Capturar cédula'}
                              </Link>
                              {tokenByMatch.get(m.id) && !m.validated_at && (
                                <CopyLinkButton path={`/partido/${tokenByMatch.get(m.id)}`} label="📋 Link árbitro" />
                              )}
                              {m.status === 'scheduled' && (
                                <PostponeButton
                                  tournamentId={id}
                                  matchId={m.id}
                                  label={`${m.home_team?.name ?? '—'} vs ${m.away_team?.name ?? '—'}`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        {played && (
                          <div className="mt-2">
                            {m.validated_at ? (
                              <span className="bg-green-950 text-green-400 text-[10px] px-2 py-0.5 rounded-full">✓ Cédula validada</span>
                            ) : (
                              <span className="bg-yellow-950 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full">Cédula por validar</span>
                            )}
                          </div>
                        )}
                        {matchSuspensions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-1.5">
                            {matchSuspensions.map((s, i) => (
                              <span
                                key={i}
                                className="bg-red-950 text-red-400 text-[11px] px-2 py-1 rounded-full"
                              >
                                🚫 {playerNames.get(s.playerId) ?? 'Jugador'} ({teamNames[s.teamId]}) — {suspensionLabels[s.reason]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
                ),
              }
              }),
              {
                key: 'pendientes',
                label: 'Pendientes',
                badge: pendingMatches.length > 0 ? String(pendingMatches.length) : undefined,
                content: (
                  <div>
                    <h2 className="text-white font-bold mb-1">Partidos pendientes</h2>
                    <p className="text-gray-500 text-xs mb-4">
                      Partidos aplazados que aún no tienen fecha. Al programarlos se acomodan en la jornada que
                      corresponda a la fecha elegida.
                    </p>
                    {pendingMatches.length === 0 ? (
                      <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
                        <p className="text-gray-500 text-sm">No hay partidos pendientes. 👌</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {pendingMatches.map((p) => (
                          <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                            <p className="text-white text-sm font-medium truncate">
                              {teamNames[p.home_team_id] ?? '—'} <span className="text-gray-600 text-xs">vs</span>{' '}
                              {teamNames[p.away_team_id] ?? '—'}
                            </p>
                            <span className="inline-block mt-1 bg-yellow-950 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full">
                              ⏸ {p.postponed_from ? `Aplazado de J${p.postponed_from}` : 'Por programar'}
                            </span>
                            {p.original_match_date && p.original_start_time && (
                              <UndoPostponeButton
                                tournamentId={id}
                                matchId={p.id}
                                originalLabel={matchScheduleLabel({
                                  status: 'scheduled',
                                  match_date: p.original_match_date,
                                  start_time: p.original_start_time,
                                  venue_name: venues?.find((v) => v.id === p.original_venue_id)?.name ?? null,
                                })}
                              />
                            )}
                            <details className="mt-3 group">
                              <summary className="cursor-pointer list-none text-green-400 text-xs font-semibold">
                                <span className="group-open:hidden">📅 Programar en otra fecha ▾</span>
                                <span className="hidden group-open:inline text-gray-500">Cerrar ▴</span>
                              </summary>
                              <ScheduleMatchForm
                                tournamentId={id}
                                matchId={p.id}
                                venues={(venues ?? []).map((v) => ({ id: v.id, name: v.name }))}
                                slots={venueSlots}
                                scheduled={scheduledMatches}
                                matchdays={(matchdays ?? []).map((md) => ({
                                  id: md.id,
                                  number: md.number,
                                  week_start: md.week_start,
                                }))}
                              />
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">Aún no se ha generado el fixture de este torneo.</p>
          </div>
        )}
      </div>
    </main>
  )
}
