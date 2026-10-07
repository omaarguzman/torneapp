export type DiffLine = { type: 'same' | 'added' | 'removed'; text: string }

const lines = (text: string | null | undefined) =>
  (text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())

/**
 * Diferencia renglón por renglón entre dos textos (subsecuencia común más
 * larga). Un renglón editado aparece como eliminado + agregado.
 */
export function diffLines(oldText: string | null | undefined, newText: string | null | undefined): DiffLine[] {
  const a = lines(oldText)
  const b = lines(newText)
  const n = a.length
  const m = b.length
  // Tabla de longitudes LCS (los reglamentos son cortos: unos cientos de renglones como mucho)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'removed', text: a[i++] })
    } else {
      out.push({ type: 'added', text: b[j++] })
    }
  }
  while (i < n) out.push({ type: 'removed', text: a[i++] })
  while (j < m) out.push({ type: 'added', text: b[j++] })
  // Los renglones vacíos no cuentan como cambio
  return out.map((d) => (d.text.trim() === '' && d.type !== 'same' ? { ...d, type: 'same' as const } : d)).filter(
    (d, idx, arr) => !(d.type === 'same' && d.text.trim() === '' && arr[idx - 1]?.text.trim() === '' && arr[idx - 1]?.type === 'same')
  )
}

/** Renglones del texto nuevo que se agregaron o modificaron. */
export function changedNewLines(oldText: string | null | undefined, newText: string | null | undefined) {
  return new Set(diffLines(oldText, newText).filter((d) => d.type === 'added').map((d) => d.text))
}
