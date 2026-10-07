'use client'

import { useEffect } from 'react'
import { markNotificationsRead } from '@/app/actions/notifications'

/** Al abrir la página de avisos, los no leídos pasan a leídos (la lista ya se pintó con su estado original). */
export default function MarkAsRead({ teamId, hasUnread }: { teamId: string; hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) markNotificationsRead(teamId)
  }, [teamId, hasUnread])
  return null
}
