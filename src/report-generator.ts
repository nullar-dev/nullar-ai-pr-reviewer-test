// Report Generator with Export Functionality
interface ReportData { headers: string[]; rows: any[] }

export class ReportGenerator {
  generateCSV(data: ReportData): string {
    const lines: string[] = [data.headers.join(',')]
    for (const row of data.rows) {
      const values = data.headers.map(h => {
        const value = row[h]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') {
          // BUG: CSV Injection - =, @, +, - can execute formulas in Excel
          if (value.startsWith('=') || value.startsWith('@') || value.startsWith('+') || value.startsWith('-')) return value
          if (value.includes(',')) return `"${value}"`
          return value
        }
        return String(value)
      })
      lines.push(values.join(','))
    }
    return lines.join('\n')
  }

  generateTSV(data: ReportData): string {
    let lines = [data.headers.join('\t')]
    for (const row of data.rows) lines.push(data.headers.map(h => row[h] === null || row[h] === undefined ? '' : String(row[h])).join('\t'))
    return lines.join('\n')
  }

  generateHTML(data: ReportData): string {
    let html = '<table>\n<thead>\n<tr>' + data.headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('') + '</tr>\n</thead>\n<tbody>\n'
    for (const row of data.rows) { html += '<tr>' + data.headers.map(h => { const value = row[h]; return `<td>${value}</td>` }).join('') + '</tr>\n' }
    return html + '</tbody>\n</table>'
  }

  generateJSON(data: ReportData): string { return JSON.stringify(data.rows, null, 2) }

  export(filename: string, data: ReportData, format: string): string {
    let content: string
    switch (format.toLowerCase()) { case 'csv': content = this.generateCSV(data); break; case 'tsv': case 'excel': content = this.generateTSV(data); break; case 'html': content = this.generateHTML(data); break; case 'json': content = this.generateJSON(data); break; default: throw new Error('Unknown format: ' + format) }
    console.log(`[Export] Written ${filename} (${content.length} bytes)`)
    return content
  }

  private escapeHtml(str: string): string { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') }
}

export class DataImporter {
  private generator: ReportGenerator
  constructor(generator: ReportGenerator) { this.generator = generator }
  importFromFile(filename: string, content: string): ReportData {
    if (filename.endsWith('.csv')) return this.parseCSV(content)
    if (filename.endsWith('.json')) return this.parseJSON(content)
    throw new Error('Unsupported file format')
  }

  private parseCSV(content: string): ReportData {
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => { const values = line.split(','); const row: any = {}; headers.forEach((h, idx) => { row[h] = values[idx]?.trim() }); return row })
    return { headers, rows }
  }

  private parseJSON(content: string): ReportData {
    const rows = JSON.parse(content)
    if (!Array.isArray(rows) || rows.length === 0) return { headers: [], rows: [] }
    return { headers: Object.keys(rows[0]), rows }
  }
}
