import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchReportForm from '@/app/partido/[token]/MatchReportForm'
import type { MatchData } from '@/app/partido/[token]/page'
import ValidationControls from './ValidationControls'
import AttendanceEditor from './AttendanceEditor'

export default async function AdminMatchReportPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>
}) {
  const { id, matchId } = await params
  const supabase = await createClient()

  // match_tokens solo lo puede leer el admin del torneo: si no lo es, no hay token y no hay página.
  // Reutilizar el token evita abrir una segunda vía de acceso a la cédula.
  const { data: tokenRow } = await supabase
    .from('match_tokens')
    .select('token')
    .eq('match_id', matchId)
    .eq('tournament_id', id)
    .maybeSingle()

  if (!tokenRow) notFound()

  const { data } = await supabase.rpc('get_match_by_token', { p_token: tokenRow.token })
  const match = data as MatchData | null
  if (!match) notFound()

  const { data: validation } = await supabase
    .from('matches')
    .select('validated_at')
    .eq('id', matchId)
    .single()

  const dateLabel = new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href={`/dashboard/tournaments/${id}/fixture`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al fixture
        </Link>

        <h1 className="text-xl font-black text-white mt-4 mb-1">
          {match.home_team.name} vs {match.away_team.name}
        </h1>
        <p className="text-gray-500 text-sm capitalize mb-6">
          {dateLabel} · {match.start_time.slice(0, 5)} · {match.venue_name}
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Estado</p>
            <p className="text-white text-sm font-semibold mt-0.5">
              {match.validated
                ? `✓ Validada${validation?.validated_at ? ` el ${new Date(validation.validated_at).toLocaleDateString('es-MX')}` : ''}`
                : match.status === 'played'
                  ? 'Capturada, por validar'
                  : 'Sin cédula'}
            </p>
          </div>
          <ValidationControls
            tournamentId={id}
            matchId={matchId}
            validated={match.validated}
            hasReport={match.status === 'played'}
          />
        </div>

        <MatchReportForm
          key={String(match.validated)}
          token={tokenRow.token}
          match={match}
          readOnly={match.validated}
          showAttendance={false}
        />

        <div className="mt-8">
          <AttendanceEditor tournamentId={id} match={match} />
        </div>
      </div>
    </main>
  )
}
