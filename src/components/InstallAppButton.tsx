'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const noop = () => () => {}
/** ¿Ya se está usando como app instalada? */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

/**
 * "Instalar app": en Android y computadora usa el aviso de instalación del
 * navegador; en iPhone explica cómo agregarla a la pantalla de inicio (Apple
 * no permite instalar con un botón). No aparece si ya está instalada.
 */
export default function InstallAppButton({ className = '' }: { className?: string }) {
  const standalone = useSyncExternalStore(noop, isStandalone, () => true)
  const ios = useSyncExternalStore(noop, isIOS, () => false)
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (standalone || (!prompt && !ios)) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt()
            await prompt.userChoice
            setPrompt(null)
          } else {
            setShowHelp((v) => !v)
          }
        }}
        className={`text-sm font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap ${className}`}
      >
        📲 Instalar app
      </button>
      {showHelp && (
        <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-gray-900 border border-white/15 rounded-xl p-4 text-sm text-gray-300 shadow-xl">
          <p className="font-semibold text-white">Instalar en iPhone</p>
          <ol className="mt-2 list-decimal pl-5 flex flex-col gap-1">
            <li>Abre Torneapp en <strong className="text-white">Safari</strong>.</li>
            <li>
              Toca <strong className="text-white">Compartir</strong> (el cuadro con la flecha hacia arriba).
            </li>
            <li>
              Elige <strong className="text-white">Agregar a inicio</strong>.
            </li>
          </ol>
          <button type="button" onClick={() => setShowHelp(false)} className="mt-3 text-xs text-gray-500 hover:text-white">
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
