import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TeamForm from '../../new/TeamForm'

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>
}) {
  const { id, teamId } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('allow_schedule_priority')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, delegate_email, delegate_name, has_scheduling_priority, preferred_slot_id, logo_url')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, venue_slots(id, day_of_week, start_time, end_time)')
    .eq('tournament_id', id)

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href={`/dashboard/tournaments/${id}`} className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al torneo
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-6">Editar equipo</h1>

        <TeamForm
          tournamentId={id}
          venues={venues ?? []}
          allowSchedulePriority={tournament.allow_schedule_priority}
          team={team}
        />
      </div>
    </main>
  )
}
