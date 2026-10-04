// Debe coincidir con Authentication → Email → Password requirements en Supabase.
export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_RULES = [
  { id: 'length', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'lower', label: 'Una letra minúscula', test: (p: string) => /[a-záéíóúñü]/.test(p) },
  { id: 'upper', label: 'Una letra mayúscula', test: (p: string) => /[A-ZÁÉÍÓÚÑÜ]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p: string) => /\d/.test(p) },
] as const

const COMMON_FRAGMENTS = ['password', 'contraseña', 'contrasena', 'qwerty', '123456', 'abcdef', 'torneapp', 'futbol', 'fútbol']

/** Reglas que no se pueden ver en un checklist simple: patrones obvios. */
function weakPatternIssue(password: string, email?: string) {
  const lower = password.toLowerCase()

  if (COMMON_FRAGMENTS.some((f) => lower.includes(f))) {
    return 'No uses palabras o secuencias muy comunes (como "password", "123456" o "futbol").'
  }
  if (/(.)\1{3,}/.test(password)) {
    return 'No repitas el mismo carácter muchas veces seguidas.'
  }
  const emailUser = email?.split('@')[0]?.toLowerCase()
  if (emailUser && emailUser.length >= 4 && lower.includes(emailUser)) {
    return 'La contraseña no debe contener tu correo.'
  }
  return null
}

/** Regresa el primer problema encontrado, o null si la contraseña es aceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password))
  if (failed) return `La contraseña necesita: ${failed.label.toLowerCase()}.`
  return weakPatternIssue(password, email)
}

export function passwordWarning(password: string, email?: string) {
  return password ? weakPatternIssue(password, email) : null
}
