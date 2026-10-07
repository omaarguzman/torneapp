import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import RequestResetForm from './RequestResetForm'

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams

  return (
    <main className="auth-screen">
      <div className="w-full max-w-sm bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <LogoMark size={52} className="mx-auto" />
          <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-3">Recuperar contraseña</h1>
          <p className="text-gray-400 text-sm mt-1">Te enviaremos un enlace para crear una nueva.</p>
        </div>

        {error === 'enlace' && (
          <p className="mb-4 text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
            Ese enlace ya expiró o ya se usó. Solicita uno nuevo.
          </p>
        )}

        <RequestResetForm />

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/login" className="text-amber-300 hover:text-amber-200">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
