export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Ya existe una cuenta con este correo. Si ya te habías registrado antes, cierra esta ventana e inicia sesión normalmente en vez de registrarte de nuevo.'
  }
  if (lower.includes('rate limit')) {
    return 'Se alcanzó el límite de correos de confirmación por ahora. Espera unos minutos e inténtalo de nuevo.'
  }
  if (lower.includes('password')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return 'El correo electrónico no es válido. Revísalo e inténtalo de nuevo.'
  }

  return 'No se pudo crear la cuenta. Verifica tus datos e inténtalo de nuevo.'
}
