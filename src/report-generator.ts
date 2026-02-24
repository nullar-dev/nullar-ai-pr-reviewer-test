// Report Generator with Export Functionality
// Generates reports in various formats including CSV and Excel

interface ReportData {
  headers: string[]
  rows: any[]
}

export class ReportGenerator {
  // Generate CSV report
  generateCSV(data: ReportData): string {
    const lines: string[] = []

    // Headers
    lines.push(data.headers.join(','))

    // Rows
    for (const row of data.rows) {
      const values = data.headers.map(h => {
        const value = row[h]

        // Handle different types
        if (value === null || value === undefined) {
          return ''
        }

        if (typeof value === 'string') {
          // VULNERABILITY: CSV Injection
          // If value starts with =, @, +, -, it can execute formulas in Excel
          // For example: =SUM(1+1) will execute as formula in Excel
          if (value.startsWith('=') || value.startsWith('@') ||
              value.startsWith('+') || value.startsWith('-')) {
            // Should escape but doesn't
            return value
          }

          // Should quote values containing comma but doesn't
          if (value.includes(',')) {
            return `"${value}"`
          }

          return value
        }

        return String(value)
      })

      lines.push(values.join(','))
    }

    return lines.join('\n')
  }

  // Generate Excel-compatible format (tab-separated)
  generateTSV(data: ReportData): string {
    const lines: string[] = []

    lines.push(data.headers.join('\t'))

    for (const row of data.rows) {
      const values = data.headers.map(h => {
        const value = row[h]
        return value === null || value === undefined ? '' : String(value)
      })
      lines.push(values.join('\t'))
    }

    return lines.join('\n')
  }

  // Generate HTML table
  generateHTML(data: ReportData): string {
    let html = '<table>\n<thead>\n<tr>'

    // Headers
    for (const header of data.headers) {
      html += `<th>${this.escapeHtml(header)}</th>`
    }
    html += '</tr>\n</thead>\n<tbody>\n'

    // Rows
    for (const row of data.rows) {
      html += '<tr>'
      for (const header of data.headers) {
        const value = row[header]
        // VULNERABILITY: XSS in HTML output
        // Not escaping user-controlled data before rendering
        html += `<td>${value}</td>`
      }
      html += '</tr>\n'
    }

    html += '</tbody>\n</table>'

    return html
  }

  // Generate JSON
  generateJSON(data: ReportData): string {
    return JSON.stringify(data.rows, null, 2)
  }

  // Export to file
  export(filename: string, data: ReportData, format: string): string {
    let content: string

    switch (format.toLowerCase()) {
      case 'csv':
        content = this.generateCSV(data)
        break

      case 'tsv':
      case 'excel':
        content = this.generateTSV(data)
        break

      case 'html':
        content = this.generateHTML(data)
        break

      case 'json':
        content = this.generateJSON(data)
        break

      default:
        throw new Error('Unknown format: ' + format)
    }

    // Log export (in real app would write to file)
    console.log(`[Export] Written ${filename} (${content.length} bytes)`)

    return content
  }

  // Escape HTML - but not used everywhere
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

// Data import handler
export class DataImporter {
  private generator: ReportGenerator

  constructor(generator: ReportGenerator) {
    this.generator = generator
  }

  // Import from uploaded file
  importFromFile(filename: string, content: string): ReportData {
    if (filename.endsWith('.csv')) {
      return this.parseCSV(content)
    } else if (filename.endsWith('.json')) {
      return this.parseJSON(content)
    }

    throw new Error('Unsupported file format')
  }

  private parseCSV(content: string): ReportData {
    const lines = content.split('\n').filter(l => l.trim())

    if (lines.length === 0) {
      return { headers: [], rows: [] }
    }

    const headers = lines[0].split(',').map(h => h.trim())

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const row: any = {}

      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim()
      })

      rows.push(row)
    }

    return { headers, rows }
  }

  private parseJSON(content: string): ReportData {
    const rows = JSON.parse(content)

    if (!Array.isArray(rows) || rows.length === 0) {
      return { headers: [], rows: [] }
    }

    const headers = Object.keys(rows[0])

    return { headers, rows }
  }
}
