export type AttendanceStatus = { label: string; tone: 'ok' | 'pending' | 'none' }

export function attendanceStatus(count: number, minRequired: number | null): AttendanceStatus {
  if (!minRequired) return { label: `${count} PJ`, tone: 'none' }
  if (count >= minRequired) return { label: `${count}/${minRequired} · Cumple`, tone: 'ok' }
  const missing = minRequired - count
  return { label: `${count}/${minRequired} · Le falta${missing === 1 ? '' : 'n'} ${missing}`, tone: 'pending' }
}

export const attendanceToneClass: Record<AttendanceStatus['tone'], string> = {
  ok: 'bg-green-950 text-green-400',
  pending: 'bg-yellow-950 text-yellow-500',
  none: 'bg-gray-800 text-gray-400',
}

export function countByPlayer(rows: { player_id: string }[]) {
  const counts = new Map<string, number>()
  rows.forEach((r) => counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1))
  return counts
}
