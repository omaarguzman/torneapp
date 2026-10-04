export function friendlyLoginError(message: string, status?: number): string {
  const lower = message.toLowerCase()

  if (status && status >= 500) {
    return 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado. Revisa tu bandeja (y la carpeta de spam) y abre el enlace de confirmación antes de iniciar sesión.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.'
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos.'
  }

  return 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.'
}

export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Ya existe una cuenta con este correo. Si ya te habías registrado antes, cierra esta ventana e inicia sesión normalmente en vez de registrarte de nuevo.'
  }
  if (lower.includes('rate limit')) {
    return 'Se alcanzó el límite de correos de confirmación por ahora. Espera unos minutos e inténtalo de nuevo.'
  }
  if (lower.includes('password')) {
    return 'La contraseña no es lo bastante segura: usa al menos 10 caracteres con mayúsculas, minúsculas y números.'
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return 'El correo electrónico no es válido. Revísalo e inténtalo de nuevo.'
  }

  return 'No se pudo crear la cuenta. Verifica tus datos e inténtalo de nuevo.'
}
