import type { TeamStat } from './standings'

export type StatsExportData = {
  tournamentName: string
  standings: TeamStat[]
  scorers: { name: string; team: string; goals: number }[]
  cards?: { name: string; team: string; yellows: number; reds: number }[]
  bestDefense?: { teamName: string; goalsAgainst: number } | null
}

const STANDINGS_HEADERS = ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DIF', 'PTS']

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
    s.goalDiff,
    s.points,
  ])
}

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

export async function buildStatsExcel(data: StatsExportData): Promise<Blob> {
  const mod = await import('exceljs')
  const ExcelJS = 'default' in mod ? (mod as unknown as { default: typeof mod }).default : mod
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Torneapp'

  function addSheet(name: string, headers: string[], rows: (string | number)[][], widths: number[]) {
    const sheet = workbook.addWorksheet(name)
    sheet.addRow([data.tournamentName]).font = { bold: true, size: 14 }
    sheet.addRow([])
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
    })
    rows.forEach((r) => sheet.addRow(r))
    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w
    })
    return sheet
  }

  const standingsSheet = addSheet(
    'Posiciones',
    STANDINGS_HEADERS,
    standingsRows(data.standings),
    [5, 28, 6, 6, 6, 6, 6, 6, 7, 7]
  )

  if (data.bestDefense) {
    standingsSheet.addRow([])
    standingsSheet.addRow([
      'Mejor defensa:',
      `${data.bestDefense.teamName} (${data.bestDefense.goalsAgainst} goles recibidos)`,
    ]).font = { italic: true }
  }

  addSheet(
    'Goleadores',
    ['#', 'Jugador', 'Equipo', 'Goles'],
    data.scorers.map((s, i) => [i + 1, s.name, s.team, s.goals]),
    [5, 28, 24, 8]
  )

  if (data.cards) {
    addSheet(
      'Tarjetas',
      ['Jugador', 'Equipo', 'Amarillas', 'Rojas'],
      data.cards.map((c) => [c.name, c.team, c.yellows, c.reds]),
      [28, 24, 10, 8]
    )
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function buildStatsPdf(data: StatsExportData): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const green: [number, number, number] = [22, 163, 74]
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0

  doc.setFontSize(18)
  doc.text(data.tournamentName, 40, 50)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Estadísticas generadas el ${new Date().toLocaleDateString('es-MX')} · Torneapp`, 40, 68)
  doc.setTextColor(0)

  doc.setFontSize(13)
  doc.text('Tabla de posiciones', 40, 100)
  autoTable(doc, {
    startY: 108,
    head: [STANDINGS_HEADERS],
    body: standingsRows(data.standings),
    headStyles: { fillColor: green },
    styles: { fontSize: 9 },
    columnStyles: { 1: { cellWidth: 150 } },
  })

  if (data.bestDefense) {
    doc.setFontSize(10)
    doc.text(
      `Mejor defensa: ${data.bestDefense.teamName} (${data.bestDefense.goalsAgainst} goles recibidos)`,
      40,
      lastY() + 20
    )
  }

  doc.setFontSize(13)
  doc.text('Goleadores', 40, lastY() + 50)
  autoTable(doc, {
    startY: lastY() + 58,
    head: [['#', 'Jugador', 'Equipo', 'Goles']],
    body: data.scorers.map((s, i) => [i + 1, s.name, s.team, s.goals]),
    headStyles: { fillColor: green },
    styles: { fontSize: 9 },
  })

  if (data.cards && data.cards.length > 0) {
    doc.setFontSize(13)
    doc.text('Tarjetas', 40, lastY() + 30)
    autoTable(doc, {
      startY: lastY() + 38,
      head: [['Jugador', 'Equipo', 'Amarillas', 'Rojas']],
      body: data.cards.map((c) => [c.name, c.team, c.yellows, c.reds]),
      headStyles: { fillColor: green },
      styles: { fontSize: 9 },
    })
  }

  return doc.output('blob')
}
