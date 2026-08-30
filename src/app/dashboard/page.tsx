import { logout } from '@/app/actions/auth'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl">⚽</span>
        <h1 className="text-2xl font-black text-white mt-3">Panel de control</h1>
        <p className="text-gray-400 mt-2">Bienvenido a Torneapp</p>
        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm px-6 py-2 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  )
}