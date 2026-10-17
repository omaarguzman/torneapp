// Solo para el servidor (acciones que suben imágenes): usa sharp.
export type ImageKind = 'photo' | 'logo' | 'template'

/** Tamaño máximo por tipo: fotos y logos se ven chicos; las plantillas, al tamaño del rol. */
const SIZES: Record<ImageKind, { width: number; height: number; fit: 'inside' | 'cover' }> = {
  photo: { width: 480, height: 480, fit: 'inside' },
  logo: { width: 512, height: 512, fit: 'inside' },
  template: { width: 1122, height: 1402, fit: 'cover' },
}

/**
 * Ajusta la imagen antes de guardarla en Storage (WEBP, que conserva la
 * transparencia de los logos). Los GIF se dejan tal cual. Si algo falla,
 * se guarda la original: ya pasó la validación de tipo y tamaño.
 */
export async function optimizeImage(file: File, kind: ImageKind): Promise<{ body: Blob | Buffer; contentType: string; ext: string }> {
  const original = { body: file as Blob, contentType: file.type, ext: file.type.split('/')[1].replace('jpeg', 'jpg') }
  if (file.type === 'image/gif') return original
  try {
    const sharp = (await import('sharp')).default
    const size = SIZES[kind]
    const body = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ ...size, withoutEnlargement: true })
      .webp({ quality: kind === 'template' ? 85 : 82 })
      .toBuffer()
    return { body, contentType: 'image/webp', ext: 'webp' }
  } catch (err) {
    console.error('[optimizeImage] no se pudo optimizar, se guarda la original:', err)
    return original
  }
}
