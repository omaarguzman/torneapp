/**
 * Arma un PDF con una imagen por página (las páginas del rol o de las
 * estadísticas que genera el servidor). Cada página mide lo mismo que su imagen.
 */
export async function pdfFromImages(urls: string[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')

  const images = await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`No se pudo generar la página (${res.status})`)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const img = new Image()
      img.src = dataUrl
      await img.decode()
      // JPG de buena calidad: el PDF pesa mucho menos que con PNG (mejor para WhatsApp)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.88), w: img.naturalWidth, h: img.naturalHeight }
    })
  )

  // 1 px = 0.75 pt: una imagen de 1122×1402 da una página de ~29.7×37 cm
  const first = images[0]
  const doc = new jsPDF({ unit: 'pt', format: [first.w * 0.75, first.h * 0.75], orientation: 'portrait', compress: true })
  images.forEach((img, i) => {
    if (i > 0) doc.addPage([img.w * 0.75, img.h * 0.75], 'portrait')
    doc.addImage(img.dataUrl, 'JPEG', 0, 0, img.w * 0.75, img.h * 0.75)
  })
  return doc.output('blob')
}

/** Comparte un archivo con el menú del celular; si no se puede (computadora), lo descarga. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: blob.type || 'application/pdf' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
