import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewPasswordForm from './NewPasswordForm'

/** Se llega aquí desde el enlace del correo, que deja una sesión temporal para cambiar la contraseña. */
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔒</span>
          <h1 className="text-2xl font-black text-white mt-2">Nueva contraseña</h1>
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
              className="text-center bg-green-500 hover:bg-green-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Solicitar otro enlace
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
