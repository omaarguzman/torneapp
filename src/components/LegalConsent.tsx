import Link from 'next/link'

/** Nota bajo los formularios de registro: al crear la cuenta se aceptan las condiciones y el aviso de privacidad. */
export default function LegalConsent({ action = 'crear tu cuenta' }: { action?: string }) {
  return (
    <p className="text-xs text-gray-500 text-center">
      Al {action} aceptas las{' '}
      <Link href="/terminos" target="_blank" className="text-amber-300 hover:text-amber-200">
        Condiciones del servicio
      </Link>{' '}
      y el{' '}
      <Link href="/privacidad" target="_blank" className="text-amber-300 hover:text-amber-200">
        Aviso de privacidad
      </Link>
      .
    </p>
  )
}
