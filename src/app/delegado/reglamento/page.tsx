import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveCurrentTeam } from '@/lib/delegateTeam'
import { changedNewLines } from '@/lib/textDiff'
import { changedSettings, ruleSettings, type RulesSnapshot } from '@/lib/rulesSnapshot'

/** Reglamento del torneo, solo lectura para el delegado. Marca lo que cambió en la última actualización. */
export default async function DelegateRulesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { team } = await resolveCurrentTeam(supabase, user.id)
  if (!team || team.access_blocked) redirect('/delegado')

  const [{ data: t }, { data: lastChange }] = await Promise.all([
    supabase
      .from('tournaments')
      .select(
        'name, rules, yellow_card_suspension_threshold, red_card_suspension_matches, walkover_goals, double_walkover_rule, player_registration_deadline'
      )
      .eq('id', team.tournament_id)
      .single(),
    supabase
      .from('notifications')
      .select('old, new, created_at')
      .eq('team_id', team.id)
      .eq('kind', 'rules')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const current: RulesSnapshot = {
    rules: t?.rules ?? null,
    yellow: t?.yellow_card_suspension_threshold ?? null,
    red: t?.red_card_suspension_matches ?? null,
    wo_goals: t?.walkover_goals ?? null,
    double_wo: t?.double_walkover_rule ?? null,
    deadline: t?.player_registration_deadline ?? null,
  }

  // Lo que cambió en la última actualización (si el texto sigue igual a como quedó entonces)
  const prev = (lastChange?.old ?? null) as RulesSnapshot | null
  const updatedLines = prev ? changedNewLines(prev.rules, current.rules) : new Set<string>()
  const updatedSettings = new Set(changedSettings(prev, current).map((s) => s.key))
  const updatedOn = lastChange
    ? new Date(lastChange.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })
    : null

  const paragraphs = (current.rules ?? '').replace(/\r\n/g, '\n').split('\n')

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/delegado" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver a mi equipo
        </Link>
        <h1 className="font-display text-3xl uppercase tracking-wide text-white mt-4 mb-1">📜 Reglamento</h1>
        <p className="text-gray-500 text-sm mb-6">
          {t?.name}
          {updatedOn && (updatedLines.size > 0 || updatedSettings.size > 0) && (
            <span className="ml-2 text-yellow-400">· Actualizado el {updatedOn}</span>
          )}
        </p>

        <section className="bg-gray-900/70 border border-white/10 rounded-xl p-5 mb-6 min-h-32">
          {current.rules?.trim() ? (
            <div className="flex flex-col">
              {paragraphs.map((line, i) =>
                line.trim() === '' ? (
                  <div key={i} className="h-3" />
                ) : updatedLines.has(line.trimEnd()) ? (
                  <p key={i} className="text-gray-100 text-sm leading-relaxed bg-yellow-950/50 border-l-4 border-yellow-500 pl-3 py-0.5 -ml-1">
                    <span className="mr-2 bg-yellow-500 text-gray-950 text-[10px] font-bold px-1.5 py-0.5 rounded align-middle">🆕 Actualizado</span>
                    {line}
                  </p>
                ) : (
                  <p key={i} className="text-gray-300 text-sm leading-relaxed">
                    {line}
                  </p>
                )
              )}
            </div>
          ) : null}
        </section>

        <h2 className="font-condensed text-lg font-bold uppercase tracking-wide text-white mb-3">Reglas configuradas</h2>
        <ul className="bg-gray-900/70 border border-white/10 rounded-xl divide-y divide-gray-800">
          {ruleSettings(current).map((r) => (
            <li key={r.key} className={`px-4 py-3 ${updatedSettings.has(r.key) ? 'bg-yellow-950/40' : ''}`}>
              <p className="text-gray-500 text-xs">
                {r.label}
                {updatedSettings.has(r.key) && <span className="ml-2 text-yellow-400 font-semibold">🆕 Actualizado</span>}
              </p>
              <p className="text-white text-sm mt-0.5">{r.value}</p>
            </li>
          ))}
        </ul>
        <p className="text-gray-600 text-xs mt-4">Solo el administrador del torneo puede modificar el reglamento.</p>
      </div>
    </main>
  )
}
