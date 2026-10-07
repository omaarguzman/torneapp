import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DisciplinePanel from '@/components/DisciplinePanel'
import { loadDiscipline } from '@/lib/stats/disciplineData'
import { deadlineLabel, registrationOpen } from '@/lib/registration'
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
    supabase.from('tournaments').select('min_matches_required, player_registration_deadline').eq('id', team.tournament_id).single(),
  ])
  const attendanceCounts = countByPlayer(attendanceRows ?? [])

  // Con adeudos la base de datos oculta las cédulas y el reporte saldría vacío: no se muestra
  const discipline = !team.access_blocked && !isLocked ? await loadDiscipline(supabase, team.tournament_id, team.id) : null

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .is('read_at', null)
  const minRequired = tournamentRules?.min_matches_required ?? null
  const deadline = tournamentRules?.player_registration_deadline ?? null
  const canRegister = registrationOpen(deadline)

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/30 p-5 mb-8">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-condensed text-xs uppercase tracking-widest text-amber-300">Panel del delegado</p>
              <h1 className="font-display text-3xl uppercase tracking-wide text-white truncate">{team.name}</h1>
              <p className="text-gray-400 text-sm truncate">{team.tournament_name}</p>
            </div>
            {!team.access_blocked && (unreadCount ?? 0) > 0 && (
              <Link
                href="/delegado/avisos"
                className="shrink-0 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full"
              >
                🔔 {unreadCount} aviso{unreadCount === 1 ? '' : 's'}
              </Link>
            )}
          </div>
        </div>

        {team.access_blocked ? (
          <div className="flex flex-col gap-4">
            <div className="bg-red-950/60 border border-red-800 rounded-lg p-5">
              <p className="text-red-200 font-semibold">⛔ Acceso bloqueado por el administrador del torneo</p>
              <p className="text-red-200/80 text-sm mt-1">
                Mientras el bloqueo esté activo no puedes ver el calendario, la tabla ni las estadísticas, ni registrar
                jugadores. Ponte en contacto con el administrador del torneo para regularizar tu situación.
              </p>
            </div>
            {isLocked && (
              <PendingChargesNotice
                charges={pendingCharges ?? []}
                title="Pagos pendientes"
                message="Este es el detalle de lo que tu equipo debe actualmente:"
              />
            )}
          </div>
        ) : (
        <>
        {isLocked && (
          <div className="mb-6">
            <PendingChargesNotice
              charges={pendingCharges ?? []}
              title="Tienes pagos pendientes"
              message="Mientras tengas adeudos, la tabla de posiciones, las estadísticas y los marcadores del torneo estarán bloqueados para tu equipo."
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href={`/delegado/fixture`}
            className="bg-gray-900/70 border border-white/10 hover:border-amber-400/40 rounded-xl p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Calendario</p>
            <p className="font-condensed text-xl font-bold uppercase tracking-wide text-white mt-1">Ver fixture →</p>
          </Link>
          <Link
            href={`/delegado/estadisticas`}
            className="bg-gray-900/70 border border-white/10 hover:border-amber-400/40 rounded-xl p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Torneo</p>
            <p className="font-condensed text-xl font-bold uppercase tracking-wide text-white mt-1">{isLocked ? '🔒 Ver tabla' : 'Ver tabla →'}</p>
          </Link>
          <Link
            href="/delegado/reglamento"
            className="bg-gray-900/70 border border-white/10 hover:border-amber-400/40 rounded-xl p-5 transition-colors"
          >
            <p className="text-gray-500 text-sm">Reglas</p>
            <p className="font-condensed text-xl font-bold uppercase tracking-wide text-white mt-1">📜 Reglamento →</p>
          </Link>
        </div>

        {discipline && (
          <section className="mb-8">
            <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white mb-3">Disciplina de mi equipo</h2>
            <DisciplinePanel report={discipline} emptyText="Ningún jugador de tu equipo está suspendido ni amonestado." />
          </section>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-white">Mis jugadores</h2>
          {canRegister ? (
            <div className="flex flex-col items-end gap-1">
              <Link
                href="/delegado/jugadores/nuevo"
                className="bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                + Nuevo jugador
              </Link>
              {deadline && <span className="text-gray-500 text-[11px]">Puedes registrar hasta el {deadlineLabel(deadline)}</span>}
            </div>
          ) : (
            <span className="text-gray-500 text-xs text-right max-w-[14rem]">
              🔒 El registro de jugadores cerró el {deadlineLabel(deadline!)}. Para altas, contacta al administrador.
            </span>
          )}
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
              <div key={player.id} className="flex items-center gap-2.5 bg-gray-900/70 border border-white/10 rounded-xl px-3 py-2.5">
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
        </>
        )}
      </div>
    </main>
  )
}
