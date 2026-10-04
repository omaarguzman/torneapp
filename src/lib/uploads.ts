// Debe coincidir con allowed_mime_types / file_size_limit del bucket "logos" en Supabase.
export const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(',')
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** Regresa un mensaje de error, o null si la imagen es válida. */
export function imageProblem(file: File, label: string): string | null {
  if (!(file.type in IMAGE_TYPES)) {
    return `${label} debe ser una imagen PNG, JPG, WEBP o GIF.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} no debe pesar más de 2 MB.`
  }
  return null
}

/** La extensión sale del tipo real del archivo, no de su nombre (que controla el usuario). */
export function imageExtension(file: File) {
  return IMAGE_TYPES[file.type]
}
