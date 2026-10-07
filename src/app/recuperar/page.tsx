import Link from 'next/link'
import RequestResetForm from './RequestResetForm'

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-black text-white mt-2">Recuperar contraseña</h1>
          <p className="text-gray-400 text-sm mt-1">Te enviaremos un enlace para crear una nueva.</p>
        </div>

        {error === 'enlace' && (
          <p className="mb-4 text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
            Ese enlace ya expiró o ya se usó. Solicita uno nuevo.
          </p>
        )}

        <RequestResetForm />

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/login" className="text-green-400 hover:text-green-300">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
