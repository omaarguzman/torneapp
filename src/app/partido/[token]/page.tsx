import { createClient } from '@/lib/supabase/server'
import MatchReportForm from './MatchReportForm'
import { matchScheduleLabel, walkoverLabel } from '@/lib/fixtures/matchLabel'

export type MatchPlayer = { id: string; full_name: string; jersey_number: number | null }

export type MatchEvent = {
  id: string
  player_id: string
  team_id: string
  type: 'goal' | 'yellow_card' | 'red_card'
  minute: number | null
}

export type MatchData = {
  id: string
  match_date: string | null
  start_time: string | null
  status: string
  score_home: number | null
  score_away: number | null
  referee_notes: string | null
  validated: boolean
  walkover: string | null
  venue_name: string | null
  tournament_name: string
  home_team: { id: string; name: string; logo_url: string | null; players: MatchPlayer[] }
  away_team: { id: string; name: string; logo_url: string | null; players: MatchPlayer[] }
  events: MatchEvent[]
  attendance: string[]
}

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_match_by_token', { p_token: token })
  const match = data as MatchData | null

  if (!match) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <p className="text-gray-400 text-center">
          Este enlace no corresponde a ningún partido. Verifica que lo hayas copiado completo.
        </p>
      </main>
    )
  }

  const pending = match.status === 'pending'

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{match.tournament_name}</p>
        <h1 className="text-xl font-black text-white mb-1">
          {match.home_team.name} vs {match.away_team.name}
        </h1>
        <p className="text-gray-500 text-sm capitalize mb-6">
          {matchScheduleLabel(match)}
        </p>

        {match.walkover ? (
          <div className="bg-orange-950/50 border border-orange-900 rounded-lg px-4 py-3">
            <p className="text-orange-300 text-sm">
              🏳️ Este partido se declaró default / W.O.: {walkoverLabel(match.walkover, match.home_team.name, match.away_team.name)}.
              No hay cédula que capturar.
            </p>
          </div>
        ) : pending ? (
          <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
            <p className="text-yellow-400 text-sm">
              ⏸ Este partido fue aplazado y todavía no tiene nueva fecha. La cédula se podrá capturar cuando el
              administrador del torneo lo vuelva a programar.
            </p>
          </div>
        ) : (
          <MatchReportForm token={token} match={match} readOnly={match.validated} />
        )}
      </div>
    </main>
  )
}
