import { chargeLabel, formatMoney, totalAmount, type Charge } from '@/lib/charges'

export default function PendingChargesNotice({
  charges,
  title,
  message,
}: {
  charges: Pick<Charge, 'id' | 'concept' | 'description' | 'amount'>[]
  title: string
  message: string
}) {
  return (
    <div className="bg-red-950/40 border border-red-900 rounded-lg p-5">
      <p className="text-red-300 font-semibold">🔒 {title}</p>
      <p className="text-red-200/80 text-sm mt-1">{message}</p>

      <div className="flex flex-col gap-1.5 mt-4">
        {charges.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 bg-red-950/60 rounded-md px-3 py-2">
            <span className="text-red-100 text-sm truncate">{chargeLabel(c)}</span>
            <span className="text-red-100 text-sm tabular-nums">{formatMoney(Number(c.amount))}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-red-900">
        <span className="text-red-300 text-sm">Total pendiente</span>
        <span className="text-white font-bold tabular-nums">{formatMoney(totalAmount(charges))}</span>
      </div>

      <p className="text-red-200/60 text-xs mt-3">
        Cuando el administrador del torneo registre tu pago, el acceso se habilitará automáticamente.
      </p>
    </div>
  )
}
