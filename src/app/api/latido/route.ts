import { createClient } from '@/lib/supabase/server'

/**
 * Latido diario (lo llama la tarea programada de Vercel, ver vercel.json):
 * hace una consulta mínima para que Supabase vea actividad y no pause el
 * proyecto gratis tras 7 días sin uso. No lee ni devuelve datos.
 * Si existe la variable CRON_SECRET en Vercel, solo responde a la tarea.
 *
 * Si además están LATIDO_DEV_SUPABASE_URL y LATIDO_DEV_SUPABASE_ANON_KEY,
 * también despierta el proyecto de desarrollo (torneapp-dev).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const supabase = await createClient()
  // Función pública que con un token inexistente solo regresa null
  const { error } = await supabase.rpc('get_tournament_claim_info', { p_token: 'latido' })
  if (error) console.error('[latido] error:', error)

  const devUrl = process.env.LATIDO_DEV_SUPABASE_URL
  const devKey = process.env.LATIDO_DEV_SUPABASE_ANON_KEY
  let dev: boolean | null = null
  if (devUrl && devKey) {
    try {
      const res = await fetch(`${devUrl}/rest/v1/rpc/get_tournament_claim_info`, {
        method: 'POST',
        headers: { apikey: devKey, Authorization: `Bearer ${devKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: 'latido' }),
        signal: AbortSignal.timeout(10000),
      })
      dev = res.ok
      if (!res.ok) console.error('[latido] desarrollo respondió', res.status)
    } catch (err) {
      dev = false
      console.error('[latido] no se pudo despertar desarrollo:', err)
    }
  }

  return Response.json({ ok: !error, dev, at: new Date().toISOString() }, { status: error ? 500 : 200 })
}
