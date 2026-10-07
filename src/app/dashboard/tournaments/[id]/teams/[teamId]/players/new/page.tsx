import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PlayerForm from './PlayerForm'

export default async function NewPlayerPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>
}) {
  const { id, teamId } = await params
  const supabase = await createClient()

  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>

        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4 mb-1">Nuevo jugador</h1>
        <p className="text-gray-500 text-sm mb-6">Equipo: {team.name}</p>

        <PlayerForm tournamentId={id} teamId={teamId} />
      </div>
    </main>
  )
}
