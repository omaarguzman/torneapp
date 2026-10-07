'use client'

import { useSearchParams } from 'next/navigation'

/** Aviso en el login después de restablecer la contraseña. */
export default function ResetSuccessNotice() {
  const params = useSearchParams()
  if (params.get('restablecida') !== '1') return null
  return (
    <p className="mb-4 text-green-300 text-sm bg-green-950 border border-green-800 rounded-lg px-4 py-3">
      ✓ Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.
    </p>
  )
}
