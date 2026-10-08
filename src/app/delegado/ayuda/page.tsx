import type { Metadata } from 'next'
import ManualView from '@/components/manual/ManualView'

export const metadata: Metadata = { title: 'Manual de uso' }

export default function HelpPage() {
  return <ManualView />
}
