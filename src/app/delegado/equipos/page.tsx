import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { selectDelegateTeam } from '@/app/actions/delegate'
import { getDelegateTeams } from '@/lib/delegateTeam'

export default async function DelegateTeamPicker() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const teams = await getDelegateTeams(supabase, user.id)
  if (teams.length <= 1) redirect('/delegado')

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚽</span>
          <h1 className="text-2xl font-black text-white mt-2">Elige tu equipo</h1>
          <p className="text-gray-400 text-sm mt-1">Eres delegado de {teams.length} equipos.</p>
        </div>

        <div className="flex flex-col gap-2">
          {teams.map((team) => (
            <form key={team.id} action={selectDelegateTeam}>
              <input type="hidden" name="team_id" value={team.id} />
              <button className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-green-700 rounded-lg p-4 text-left transition-colors">
                <div className="w-11 h-11 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">⚽</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{team.name}</p>
                  <p className="text-gray-500 text-sm truncate">{team.tournament_name}</p>
                </div>
                <span className="ml-auto text-gray-600">→</span>
              </button>
            </form>
          ))}
        </div>

        <form action={logout} className="text-center mt-8">
          <button className="text-gray-500 hover:text-white text-sm transition-colors">Cerrar sesión</button>
        </form>
      </div>
    </main>
  )
}
