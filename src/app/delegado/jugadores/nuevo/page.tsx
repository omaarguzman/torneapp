import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PlayerForm from '@/app/dashboard/tournaments/[id]/teams/[teamId]/players/new/PlayerForm'

export default async function NewDelegatePlayerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, tournament_id')
    .eq('delegate_id', user.id)
    .single()

  if (!team) redirect('/delegado')

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-1">Nuevo jugador</h1>
        <p className="text-gray-500 text-sm mb-6">{team.name}</p>

        <PlayerForm tournamentId={team.tournament_id} teamId={team.id} backHref="/delegado" />
      </div>
    </main>
  )
}
