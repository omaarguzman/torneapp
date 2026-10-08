import type { TeamStat } from './standings'

export type StatsExportData = {
  tournamentName: string
  /** Logo del torneo (si no hay, se usa el escudo de Torneapp) */
  tournamentLogo?: string | null
  standings: TeamStat[]
  scorers: { name: string; team: string; goals: number }[]
  cards?: { name: string; team: string; yellows: number; reds: number }[]
  bestDefense?: { teamName: string; goalsAgainst: number } | null
}

const STANDINGS_HEADERS = ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DIF', 'PTS']

// Paleta de Torneapp
const DARK: [number, number, number] = [11, 11, 14]
const DARK_2: [number, number, number] = [23, 23, 28]
const GOLD: [number, number, number] = [245, 200, 76]
const GOLD_DEEP: [number, number, number] = [212, 160, 23]
const LIGHT_GOLD: [number, number, number] = [254, 243, 199]
const ZEBRA: [number, number, number] = [247, 247, 249]

function standingsRows(standings: TeamStat[]) {
  return standings.map((s, i) => [
    i + 1,
    s.teamName,
    s.played,
    s.won,
    s.drawn,
    s.lost,
    s.goalsFor,
    s.goalsAgainst,
    s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff,
    s.points,
  ])
}

const today = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

export function exportFileName(tournamentName: string, extension: string) {
  const slug = tournamentName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  return `estadisticas-${slug || 'torneo'}-${date}.${extension}`
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------- Excel

export async function buildStatsExcel(data: StatsExportData): Promise<Blob> {
  const mod = await import('exceljs')
  const ExcelJS = 'default' in mod ? (mod as unknown as { default: typeof mod }).default : mod
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Torneapp'
  workbook.created = new Date()

  const argb = (c: [number, number, number]) => `FF${c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`
  const thin = { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  function addSheet(
    name: string,
    subtitle: string,
    headers: string[],
    rows: (string | number)[][],
    widths: number[],
    highlight: (rowIndex: number) => string | null
  ) {
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
    const lastCol = String.fromCharCode(64 + headers.length)

    sheet.mergeCells(`A1:${lastCol}1`)
    const title = sheet.getCell('A1')
    title.value = data.tournamentName.toUpperCase()
    title.font = { bold: true, size: 16, color: { argb: argb(GOLD) } }
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(DARK) } }
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    sheet.getRow(1).height = 32

    sheet.mergeCells(`A2:${lastCol}2`)
    const sub = sheet.getCell('A2')
    sub.value = `${subtitle} · Generado el ${today()} con Torneapp`
    sub.font = { size: 10, color: { argb: 'FF9CA3AF' } }
    sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(DARK) } }
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    sheet.getRow(2).height = 20

    sheet.mergeCells(`A3:${lastCol}3`)
    sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(GOLD_DEEP) } }
    sheet.getRow(3).height = 4

    const headerRow = sheet.addRow(headers)
    headerRow.height = 22
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: argb(GOLD) } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(DARK_2) } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = border
    })

    rows.forEach((r, i) => {
      const row = sheet.addRow(r)
      row.height = 20
      const fill = highlight(i) ?? (i % 2 === 1 ? argb(ZEBRA) : null)
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = border
        cell.alignment = { vertical: 'middle', horizontal: typeof r[col - 1] === 'number' || /^[+-]?\d+$/.test(String(r[col - 1])) ? 'center' : 'left', indent: 1 }
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
        if (highlight(i)) cell.font = { bold: true }
      })
    })

    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } }
    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w
    })
    return sheet
  }

  const standingsSheet = addSheet(
    'Posiciones',
    'Tabla de posiciones',
    STANDINGS_HEADERS,
    standingsRows(data.standings),
    [6, 30, 7, 7, 7, 7, 7, 7, 8, 8],
    (i) => (i === 0 ? argb(LIGHT_GOLD) : null)
  )
  // Puntos en negritas
  standingsSheet.getColumn(10).eachCell((cell, rowNumber) => {
    if (rowNumber > 4) cell.font = { bold: true }
  })

  if (data.bestDefense) {
    standingsSheet.addRow([])
    const r = standingsSheet.addRow(['', `🛡️ Mejor defensa: ${data.bestDefense.teamName} (${data.bestDefense.goalsAgainst} goles recibidos)`])
    r.getCell(2).font = { bold: true, color: { argb: argb(GOLD_DEEP) } }
  }

  const medalFills = ['FFFEF3C7', 'FFF3F4F6', 'FFFDE7D9']
  addSheet(
    'Goleadores',
    'Tabla de goleadores',
    ['#', 'Jugador', 'Equipo', 'Goles'],
    data.scorers.map((s, i) => [i + 1, s.name, s.team, s.goals]),
    [6, 30, 26, 9],
    (i) => medalFills[i] ?? null
  )

  if (data.cards) {
    addSheet(
      'Tarjetas',
      'Tarjetas por jugador',
      ['Jugador', 'Equipo', 'Amarillas', 'Rojas'],
      data.cards.map((c) => [c.name, c.team, c.yellows, c.reds]),
      [30, 26, 11, 9],
      () => null
    )
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
