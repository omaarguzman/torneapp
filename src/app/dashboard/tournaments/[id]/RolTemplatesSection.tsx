'use client'

/* eslint-disable @next/next/no-img-element -- miniaturas de plantillas */
import { useActionState } from 'react'
import { deleteRolTemplate, setTournamentTemplate, uploadRolTemplate } from '@/app/actions/rolImage'
import { BUILTIN_TEMPLATES } from '@/lib/rol/templates'
import { IMAGE_ACCEPT } from '@/lib/uploads'

type Custom = { id: string; name: string; image_url: string }

function Choice({
  value,
  current,
  label,
  children,
}: {
  value: string
  current: string
  label: string
  children: React.ReactNode
}) {
  const selected = value === current
  return (
    <button
      type="submit"
      name="template"
      value={value}
      className={`flex flex-col text-left rounded-lg overflow-hidden border-2 transition-colors ${
        selected ? 'border-green-500 ring-2 ring-green-500/40' : 'border-gray-800 hover:border-gray-600'
      }`}
    >
      {children}
      <span className={`px-2 py-1.5 text-xs font-semibold ${selected ? 'bg-green-950 text-green-300' : 'bg-gray-900 text-gray-300'}`}>
        {selected ? '✓ ' : ''}
        {label}
      </span>
    </button>
  )
}

export default function RolTemplatesSection({
  tournamentId,
  current,
  customs,
}: {
  tournamentId: string
  current: string
  customs: Custom[]
}) {
  const [selectState, selectAction, selecting] = useActionState(setTournamentTemplate, null)
  const [uploadState, uploadAction, uploading] = useActionState(uploadRolTemplate, null)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-4">
      <div>
        <p className="text-white text-sm font-semibold">Plantilla del rol de juegos</p>
        <p className="text-gray-500 text-xs mt-0.5">
          Es la que ven los delegados en la imagen del rol (no la pueden cambiar). En el fixture puedes usar otra en una
          jornada específica.
        </p>
      </div>

      <form action={selectAction} className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <Choice value="auto" current={current} label="Automática">
          <div className="aspect-[4/5] bg-gray-950 flex flex-col items-center justify-center gap-1 p-2 text-center">
            <span className="text-2xl">🗓️</span>
            <span className="text-gray-400 text-[10px] leading-tight">
              Cambia sola: Año Nuevo, Primavera, Día del niño, Mes patrio, Muertos, Navidad
            </span>
          </div>
        </Choice>
        {BUILTIN_TEMPLATES.map((t) => (
          <Choice key={t.key} value={t.key} current={current} label={t.label}>
            <img src={`/rol/plantillas/${t.file}`} alt={t.label} className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </Choice>
        ))}
        {customs.map((c) => (
          <Choice key={c.id} value={`custom:${c.id}`} current={current} label={`🖼️ ${c.name}`}>
            <img src={c.image_url} alt={c.name} className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </Choice>
        ))}
      </form>
      {selecting && <p className="text-gray-500 text-xs">Guardando...</p>}
      {selectState && 'error' in selectState && <p className="text-red-400 text-xs">{selectState.error}</p>}
      {selectState && 'success' in selectState && !selecting && <p className="text-green-400 text-xs">✓ Plantilla del torneo guardada</p>}

      {customs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-gray-400 text-xs font-semibold">Tus plantillas</p>
          {customs.map((c) => (
            <form
              key={c.id}
              action={deleteRolTemplate}
              onSubmit={(e) => {
                if (!window.confirm(`¿Borrar la plantilla "${c.name}"? Donde se usaba, se volverá a la automática.`)) e.preventDefault()
              }}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <input type="hidden" name="tournament_id" value={tournamentId} />
              <input type="hidden" name="template_id" value={c.id} />
              <span className="text-gray-300 truncate">🖼️ {c.name}</span>
              <button className="text-gray-500 hover:text-red-400 text-xs whitespace-nowrap">Borrar</button>
            </form>
          ))}
        </div>
      )}

      <form action={uploadAction} className="border-t border-gray-800 pt-4 flex flex-col gap-2">
        <p className="text-gray-300 text-sm font-semibold">Subir una plantilla propia</p>
        <p className="text-gray-500 text-xs">
          Sube un <strong className="text-gray-300">fondo limpio</strong>, sin textos ni tarjetas: la app dibuja encima el
          escudo, &ldquo;JORNADA N&rdquo;, &ldquo;ROL DE JUEGOS&rdquo;, la fecha, los partidos, quién descansa y las notas.
          Vertical 4:5 (ideal 1122×1402 o 1080×1350), JPG, PNG o WEBP de hasta 2 MB. Deja libre la parte de arriba al
          centro y toda la zona central.
        </p>
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            name="name"
            maxLength={60}
            required
            placeholder="Nombre (ej. Final de temporada)"
            className="flex-1 min-w-[12rem] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
          />
          <input
            type="file"
            name="image"
            accept={IMAGE_ACCEPT}
            required
            className="text-gray-400 text-xs file:mr-2 file:bg-gray-800 file:border file:border-gray-700 file:text-gray-200 file:rounded-lg file:px-3 file:py-1.5"
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white text-xs font-semibold px-3 py-2 rounded-lg"
          >
            {uploading ? 'Subiendo...' : 'Subir plantilla'}
          </button>
        </div>
        {uploadState && 'error' in uploadState && <p className="text-red-400 text-xs">{uploadState.error}</p>}
        {uploadState && 'success' in uploadState && <p className="text-green-400 text-xs">✓ Plantilla subida; ya puedes elegirla arriba.</p>}
      </form>
    </div>
  )
}
