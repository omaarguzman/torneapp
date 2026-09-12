import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { deletePlayer } from '@/app/actions/players'

export default async function DelegateDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, logo_url, tournament_id, players(*), tournament:tournaments(name)')
    .eq('delegate_id', user.id)
    .single()

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

  const tournamentInfo = Array.isArray(team.tournament) ? team.tournament[0] : team.tournament

  const players = (team.players ?? []).sort(
    (a: { jersey_number: number | null }, b: { jersey_number: number | null }) =>
      (a.jersey_number ?? 999) - (b.jersey_number ?? 999)
  )

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
              <p className="text-gray-500 text-sm">{tournamentInfo?.name}</p>
            </div>
          </div>
          <form action={logout}>
            <button className="text-gray-500 hover:text-white text-sm transition-colors">Cerrar sesión</button>
          </form>
        </div>

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
            <p className="text-lg font-bold text-white mt-1">Ver tabla →</p>
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
