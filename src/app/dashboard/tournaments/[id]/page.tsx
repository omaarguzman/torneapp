import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const sportLabels: Record<string, string> = {
  futbol_11: 'Fútbol 11',
  futbol_7: 'Fútbol 7',
  futbol_5: 'Fútbol 5',
  futbol_salon: 'Fútbol Salón',
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al panel
        </Link>

        <div className="mt-4 mb-8">
          <span className="text-xs uppercase tracking-wide text-green-400 font-semibold">
            {sportLabels[tournament.sport_type] || tournament.sport_type}
          </span>
          <h1 className="text-3xl font-black text-white mt-1">{tournament.name}</h1>
          {tournament.start_date && (
            <p className="text-gray-500 text-sm mt-1">
              {tournament.start_date} — {tournament.end_date || 'sin fecha de fin'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Equipos</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Canchas</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-500 text-sm">Jornadas</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mt-8">
          Próximamente: registro de equipos, canchas y jugadores en esta misma pantalla.
        </p>
      </div>
    </main>
  )
}