import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { deletePlayer } from '@/app/actions/players'
import PendingChargesNotice from './PendingChargesNotice'
import { resolveCurrentTeam } from '@/lib/delegateTeam'
import { attendanceStatus, attendanceToneClass, countByPlayer } from '@/lib/attendance'

export default async function DelegateDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { team, teams } = await resolveCurrentTeam(supabase, user.id)

  if (!team && teams.length > 1) redirect('/delegado/equipos')

  if (!team) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Tu cuenta no está vinculada a ningún equipo todavía. Contacta al administrador de tu torneo.
          </p>
          <form action={logout}>
            <button className="text-gray-500 hover:text-white text-sm underline">Cerrar sesión</button>
          </form>
        </div>
      </main>
    )
  }

  const { data: playerRows } = await supabase
    .from('players')
    .select('id, full_name, jersey_number, position, photo_url')
    .eq('team_id', team.id)

  const { data: pendingCharges } = await supabase
    .from('team_charges')
    .select('id, concept, description, amount')
    .eq('team_id', team.id)
    .eq('paid', false)
    .order('created_at')

  const isLocked = (pendingCharges?.length ?? 0) > 0

  const players = (playerRows ?? []).sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))

  const [{ data: attendanceRows }, { data: tournamentRules }] = await Promise.all([
    supabase.from('match_attendance').select('player_id').eq('team_id', team.id),
    supabase.from('tournaments').select('min_matches_required').eq('id', team.tournament_id).single(),
  ])
  const attendanceCounts = countByPlayer(attendanceRows ?? [])
  const minRequired = tournamentRules?.min_matches_required ?? null

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">⚽</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-black text-white">{team.name}</h1>
              <p className="text-gray-500 text-sm">{team.tournament_name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {teams.length > 1 && (
              <Link href="/delegado/equipos" className="text-green-400 hover:text-green-300 text-sm transition-colors">
                Cambiar equipo
              </Link>
            )}
            <form action={logout}>
              <button className="text-gray-500 hover:text-white text-sm transition-colors">Cerrar sesión</button>
            </form>
          </div>
        </div>

        {isLocked && (
          <div className="mb-6">
            <PendingChargesNotice
              charges={pendingCharges ?? []}
              title="Tienes pagos pendientes"
              message="Mientras tengas adeudos, la tabla de posiciones, las estadísticas y los marcadores del torneo estarán bloqueados para tu equipo."
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            href={`/delegado/fixture`}
            className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Calendario</p>
            <p className="text-lg font-bold text-white mt-1">Ver fixture →</p>
          </Link>
          <Link
            href={`/delegado/estadisticas`}
            className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Torneo</p>
            <p className="text-lg font-bold text-white mt-1">{isLocked ? '🔒 Ver tabla' : 'Ver tabla →'}</p>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Mis jugadores</h2>
          <Link
            href="/delegado/jugadores/nuevo"
            className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo jugador
          </Link>
        </div>

        {players.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {players.map((player: {
              id: string
              full_name: string
              jersey_number: number | null
              position: string | null
              photo_url: string | null
            }) => (
              <div key={player.id} className="flex items-center gap-2.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden text-xs text-gray-400 font-semibold">
                  {player.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
                  ) : (
                    player.jersey_number ?? '—'
                  )}
                </div>
                <span className="text-gray-200 text-sm flex-1 truncate">{player.full_name}</span>
                {player.position && <span className="text-gray-500 text-xs">{player.position}</span>}
                {(() => {
                  const status = attendanceStatus(attendanceCounts.get(player.id) ?? 0, minRequired)
                  return (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${attendanceToneClass[status.tone]}`}>
                      {status.label}
                    </span>
                  )
                })()}
                <form action={deletePlayer}>
                  <input type="hidden" name="player_id" value={player.id} />
                  <input type="hidden" name="tournament_id" value={team.tournament_id} />
                  <button className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">Aún no has registrado jugadores.</p>
          </div>
        )}
      </div>
    </main>
  )
}
