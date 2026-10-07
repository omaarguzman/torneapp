// Solo para el servidor (lo usa la ruta /api/rol): descarga fuentes y logos.

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 600 | 800; style: 'normal' }

/** Fuentes libres (OFL) de Google Fonts. Se descargan una vez por servidor y se reutilizan. */
const FONT_SOURCES: { name: string; family: string; weight: 400 | 600 | 800 }[] = [
  { name: 'Anton', family: 'Anton', weight: 400 },
  { name: 'Barlow', family: 'Barlow+Condensed:wght@600', weight: 600 },
  { name: 'Barlow', family: 'Barlow+Condensed:wght@800', weight: 800 },
]

async function loadFont(family: string) {
  // Sin User-Agent de navegador, Google entrega TTF (el formato que acepta el generador)
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`)).text()
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
  if (!url) throw new Error(`No se encontró la fuente ${family}`)
  return (await fetch(url)).arrayBuffer()
}

let fontsPromise: Promise<FontDef[]> | null = null

export function getFonts(): Promise<FontDef[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_SOURCES.map(async (f) => ({ name: f.name, data: await loadFont(f.family), weight: f.weight, style: 'normal' as const }))
    ).catch((err) => {
      // Sin fuentes propias la imagen sale con la fuente por defecto; se reintenta en la siguiente petición
      console.error('[rol] no se pudieron cargar las fuentes:', err)
      fontsPromise = null
      return []
    })
  }
  return fontsPromise
}

/**
 * Descarga un logo y lo convierte a PNG pequeño en data URL (el generador no
 * acepta WEBP). Regresa null si no se puede; en ese caso se dibujan iniciales.
 */
export async function loadLogo(url: string | null, size = 160): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const type = res.headers.get('content-type') ?? ''

    try {
      const sharp = (await import('sharp')).default
      const png = await sharp(input, { animated: false })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    } catch {
      // Sin sharp, solo PNG y JPG se pueden usar tal cual
      if (type.includes('png') || type.includes('jpeg')) {
        return `data:${type};base64,${input.toString('base64')}`
      }
      return null
    }
  } catch {
    return null
  }
}

const artCache = new Map<string, Promise<string>>()

/**
 * Convierte una ilustración SVG a PNG/JPG con sharp y la guarda en memoria.
 * El generador del rol solo pega la imagen ya hecha (mucho más rápido que
 * redibujar filtros y texturas en cada petición). Sin sharp, usa el SVG tal cual.
 */
export function rasterize(key: string, svg: string, format: 'png' | 'jpeg' = 'png'): Promise<string> {
  const cached = artCache.get(key)
  if (cached) return cached
  const job = (async () => {
    try {
      const sharp = (await import('sharp')).default
      const img = sharp(Buffer.from(svg))
      const out = format === 'jpeg' ? await img.jpeg({ quality: 86 }).toBuffer() : await img.png().toBuffer()
      return `data:image/${format};base64,${out.toString('base64')}`
    } catch {
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    }
  })()
  if (artCache.size > 200) artCache.clear()
  artCache.set(key, job)
  return job
}

/**
 * Fondo de una plantilla ajustado al lienzo (1122×1402, recortando lo que
 * sobre) y convertido a JPG. Las incluidas se leen del proyecto; las de cada
 * admin se descargan de Storage. Se guarda en memoria por plantilla.
 */
export function loadTemplateBackground(key: string, source: { file: string } | { url: string }): Promise<string | null> {
  const cacheKey = `tpl:${key}`
  const cached = artCache.get(cacheKey)
  if (cached) return cached
  const job = (async () => {
    try {
      let input: Buffer
      if ('file' in source) {
        const { readFile } = await import('node:fs/promises')
        const { join } = await import('node:path')
        input = await readFile(join(process.cwd(), 'public', 'rol', 'plantillas', source.file))
      } else {
        const res = await fetch(source.url)
        if (!res.ok) return null
        input = Buffer.from(await res.arrayBuffer())
      }
      const sharp = (await import('sharp')).default
      const out = await sharp(input).resize(1122, 1402, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer()
      return `data:image/jpeg;base64,${out.toString('base64')}`
    } catch (err) {
      console.error('[rol] no se pudo cargar la plantilla', key, err)
      artCache.delete(cacheKey)
      return null
    }
  })()
  artCache.set(cacheKey, job as Promise<string>)
  return job
}
