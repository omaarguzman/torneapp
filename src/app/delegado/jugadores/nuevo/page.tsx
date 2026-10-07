import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PlayerForm from '@/app/dashboard/tournaments/[id]/teams/[teamId]/players/new/PlayerForm'
import { resolveCurrentTeam } from '@/lib/delegateTeam'
import { registrationOpen } from '@/lib/registration'

export default async function NewDelegatePlayerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { team } = await resolveCurrentTeam(supabase, user.id)
  if (!team || team.access_blocked) redirect('/delegado')

  // Fuera de plazo no se muestra el formulario (la base de datos tampoco permitiría guardar)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('player_registration_deadline')
    .eq('id', team.tournament_id)
    .single()
  if (!registrationOpen(tournament?.player_registration_deadline)) redirect('/delegado')

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>

        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4 mb-1">Nuevo jugador</h1>
        <p className="text-gray-500 text-sm mb-6">{team.name}</p>

        <PlayerForm tournamentId={team.tournament_id} teamId={team.id} backHref="/delegado" />
      </div>
    </main>
  )
}
