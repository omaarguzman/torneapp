import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { deleteVenueTemplate } from '@/app/actions/venueTemplates'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default async function SavedVenuesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('venue_templates')
    .select('id, name, location, venue_template_slots(day_of_week, start_time, end_time)')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300">
          ← Volver al panel
        </Link>

        <h1 className="text-2xl font-black text-white mt-4 mb-6">Canchas guardadas</h1>

        {templates && templates.length > 0 ? (
          <div className="flex flex-col gap-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold">{t.name}</p>
                    {t.location && <p className="text-gray-500 text-sm">{t.location}</p>}
                  </div>
                  <form action={deleteVenueTemplate}>
                    <input type="hidden" name="template_id" value={t.id} />
                    <button className="text-gray-600 hover:text-red-400 text-sm transition-colors">
                      Eliminar
                    </button>
                  </form>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {t.venue_template_slots.map((s, i) => (
                    <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full">
                      {dayNames[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-800 rounded-lg p-10 text-center">
            <p className="text-gray-500">Aún no tienes canchas guardadas.</p>
          </div>
        )}
      </div>
    </main>
  )
}