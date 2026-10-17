import { createClient } from '@/lib/supabase/server'

/**
 * Latido diario (lo llama la tarea programada de Vercel, ver vercel.json):
 * hace una consulta mínima para que Supabase vea actividad y no pause el
 * proyecto gratis tras 7 días sin uso. No lee ni devuelve datos.
 * Si existe la variable CRON_SECRET en Vercel, solo responde a la tarea.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const supabase = await createClient()
  // Función pública que con un token inexistente solo regresa null
  const { error } = await supabase.rpc('get_tournament_claim_info', { p_token: 'latido' })
  if (error) {
    console.error('[latido] error:', error)
    return Response.json({ ok: false }, { status: 500 })
  }
  return Response.json({ ok: true, at: new Date().toISOString() })
}
