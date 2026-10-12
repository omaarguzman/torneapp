'use client'

import { useSearchParams } from 'next/navigation'

/** Avisos en el login: contraseña restablecida o enlace de confirmación vencido. */
export default function ResetSuccessNotice() {
  const params = useSearchParams()
  if (params.get('error') === 'enlace') {
    return (
      <p className="mb-4 text-yellow-300 text-sm bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
        Ese enlace ya expiró o ya se usó. Si ya confirmaste tu cuenta, inicia sesión.
      </p>
    )
  }
  if (params.get('restablecida') !== '1') return null
  return (
    <p className="mb-4 text-green-300 text-sm bg-green-950 border border-green-800 rounded-lg px-4 py-3">
      ✓ Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.
    </p>
  )
}
