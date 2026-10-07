import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/Logo'
import NewPasswordForm from './NewPasswordForm'

/** Se llega aquí desde el enlace del correo, que deja una sesión temporal para cambiar la contraseña. */
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="auth-screen">
      <div className="w-full max-w-sm bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <LogoMark size={52} className="mx-auto" />
          <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-3">Nueva contraseña</h1>
          {user?.email && <p className="text-gray-400 text-sm mt-1">{user.email}</p>}
        </div>

        {user ? (
          <NewPasswordForm email={user.email ?? undefined} />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
              Este enlace ya expiró o ya se usó. Solicita uno nuevo.
            </p>
            <Link
              href="/recuperar"
              className="text-center bg-amber-400 hover:bg-amber-300 text-gray-950 font-semibold py-3 rounded-lg transition-colors"
            >
              Solicitar otro enlace
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
