import type { ReactNode } from 'react'
import { FAQ, GUIDES } from './content'
import PrintButton from './PrintButton'

/** Convierte **texto** en negritas. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} className="text-white font-semibold print:text-black">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  )
}

/**
 * Manual de uso (guías por papel + preguntas frecuentes). Solo se muestra
 * dentro de los paneles con sesión; al imprimir sale en blanco, una guía por página.
 */
export default function ManualView() {
  return (
    <main className="flex-1 text-gray-300 print:text-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10 print:block print:py-0">
        {/* Índice */}
        <aside className="print:hidden mb-10 lg:mb-0">
          <nav className="lg:sticky lg:top-24 flex flex-col gap-5 text-sm">
            {GUIDES.map((g) => (
              <div key={g.id}>
                <a href={`#${g.id}`} className="font-condensed font-bold uppercase tracking-wide text-amber-300 hover:text-amber-200">
                  {g.icon} {g.title}
                </a>
                <ul className="mt-2 flex flex-col gap-1.5 border-l border-white/10 pl-3">
                  {g.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-gray-400 hover:text-white">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <a href="#preguntas" className="font-condensed font-bold uppercase tracking-wide text-amber-300 hover:text-amber-200">
              ❓ Preguntas frecuentes
            </a>
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-condensed text-sm uppercase tracking-widest text-amber-300 print:text-amber-700">
                <span className="hidden print:inline">Torneapp · </span>Ayuda
              </p>
              <h1 className="font-display text-4xl sm:text-5xl uppercase text-white mt-1 print:text-black">Manual de uso</h1>
            </div>
            <PrintButton />
          </div>
          <p className="mt-3 max-w-2xl text-gray-400 print:text-gray-600">
            Todo lo que necesitas para organizar tu torneo con Torneapp, paso a paso. Elige tu papel:
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-3 print:hidden">
            {GUIDES.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 hover:border-amber-400/50 rounded-2xl p-4 transition-colors"
              >
                <span className="text-3xl">{g.icon}</span>
                <p className="font-condensed text-lg font-bold text-white mt-2">{g.title}</p>
                <p className="text-xs text-gray-500 mt-1">{g.summary}</p>
              </a>
            ))}
          </div>

          {GUIDES.map((g) => (
            <section key={g.id} id={g.id} className="mt-14 scroll-mt-24 print:mt-8 print:break-before-page">
              <div className="flex items-center gap-3 border-b border-amber-400/30 pb-3 print:border-amber-600">
                <span className="text-3xl">{g.icon}</span>
                <div>
                  <h2 className="font-display text-3xl uppercase text-white print:text-black">{g.title}</h2>
                  <p className="text-sm text-gray-500">{g.summary}</p>
                </div>
              </div>

              {g.sections.map((s) => (
                <article key={s.id} id={s.id} className="mt-8 scroll-mt-24 print:break-inside-avoid">
                  <h3 className="font-condensed text-xl font-bold uppercase tracking-wide text-white print:text-black">{s.title}</h3>
                  {s.intro && <p className="mt-1 text-sm text-gray-400 print:text-gray-600">{s.intro}</p>}
                  <ol className="mt-3 flex flex-col gap-2.5">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 leading-relaxed">
                        <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-amber-400 text-gray-950 font-display text-sm flex items-center justify-center print:border print:border-amber-600 print:bg-white">
                          {i + 1}
                        </span>
                        <span>{rich(step)}</span>
                      </li>
                    ))}
                  </ol>
                  {s.tip && (
                    <p className="mt-3 text-sm bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2.5 text-amber-100 print:bg-amber-50 print:text-amber-900 print:border-amber-300">
                      💡 {rich(s.tip)}
                    </p>
                  )}
                </article>
              ))}
            </section>
          ))}

          <section id="preguntas" className="mt-14 scroll-mt-24 print:break-before-page">
            <h2 className="font-display text-3xl uppercase text-white border-b border-amber-400/30 pb-3 print:text-black">
              ❓ Preguntas frecuentes
            </h2>
            <dl className="mt-6 flex flex-col gap-5">
              {FAQ.map((f) => (
                <div key={f.q} className="print:break-inside-avoid">
                  <dt className="font-condensed text-lg font-bold text-white print:text-black">{f.q}</dt>
                  <dd className="mt-1 text-gray-400 print:text-gray-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="mt-16 text-xs text-gray-600 print:mt-8">Manual de Torneapp · Gestión de torneos de fútbol</p>
        </div>
      </div>
    </main>
  )
}
