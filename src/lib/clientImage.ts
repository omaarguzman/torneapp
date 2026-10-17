/**
 * Reduce en el navegador la imagen elegida en un <input type="file"> antes de
 * enviarla: una foto de cámara de varios MB queda en unas decenas de KB y ya
 * no choca con el límite de 2 MB. Si el navegador no puede, se deja tal cual
 * (el servidor la vuelve a optimizar de todos modos).
 */
export async function shrinkImageInput(input: HTMLInputElement, maxSide: number) {
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 300 * 1024) return

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return

    const shrunk = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
    const transfer = new DataTransfer()
    transfer.items.add(shrunk)
    input.files = transfer.files
  } catch {
    // Sin soporte (navegador viejo): se envía la original
  }
}
