'use client'

/** Abre el diálogo de impresión: desde ahí se elige "Guardar como PDF". */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden bg-amber-400 hover:bg-amber-300 text-gray-950 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
    >
      ⬇ Descargar PDF
    </button>
  )
}
