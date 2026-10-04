const MESSAGES: Record<string, string> = {
  GOOGLE: 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.',
  CANCELLED: 'Cancelaste el inicio de sesión con Google.',
  INVALID_LINK: 'Este enlace de invitación ya no es válido. Pide al administrador del torneo uno nuevo.',
  ALREADY_CLAIMED: 'Este equipo ya tiene un delegado registrado. Si es un error, contacta al administrador del torneo.',
  ADMIN_ACCOUNT:
    'Esa cuenta ya administra torneos en Torneapp, así que no puede ser también delegado. Usa otra cuenta de Google o regístrate con otro correo.',
  INVALID_ACCOUNT: 'No pudimos verificar tu cuenta para vincularla al equipo. Inténtalo de nuevo.',
  NOT_AUTHENTICATED: 'Tu sesión expiró antes de terminar el registro. Inténtalo de nuevo.',
}

export function oauthErrorMessage(code: string | null | undefined) {
  if (!code) return null
  return MESSAGES[code] ?? MESSAGES.GOOGLE
}

/** Extrae el código (ej. ADMIN_ACCOUNT) que lanzan las funciones claim_team_delegate*. */
export function claimErrorCode(message: string | undefined) {
  const known = ['INVALID_LINK', 'ALREADY_CLAIMED', 'ADMIN_ACCOUNT', 'INVALID_ACCOUNT', 'NOT_AUTHENTICATED']
  return known.find((code) => message?.includes(code)) ?? 'GOOGLE'
}
