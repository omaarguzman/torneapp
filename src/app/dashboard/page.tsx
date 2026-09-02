import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-2xl">⚽</span>
            <h1 className="text-xl font-black text-white inline ml-2">Torneapp</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
          <form action={logout}>
            <button className="text-gray-500 hover:text-white text-sm transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Mis torneos</h2>
          <Link
            href="/dashboard/tournaments/new"
            className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo torneo
          </Link>
        </div>

        {tournaments && tournaments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tournaments/${t.id}`}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors block"
              >
                <p className="text-white font-semibold">{t.name}</p>
                <p className="text-gray-500 text-sm mt-1">{t.sport_type}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">Aún no tienes torneos creados.</p>
          </div>
        )}
      </div>
    </main>
  )
}