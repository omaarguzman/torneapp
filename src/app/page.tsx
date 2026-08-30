import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚽</div>
        <h1 className="text-5xl font-black text-white tracking-tight mb-3">
          Torneapp
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Gestión de torneos de fútbol, simple y profesional.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" className="bg-green-500 hover:bg-green-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-center">
            Iniciar sesión
          </Link>
          <Link href="/register" className="border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-3 px-8 rounded-lg transition-colors text-center">
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  )
}