// CSV Export Utility Functions

export function convertToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) return ''

  // Create header row
  const csvHeaders = headers.join(',')

  // Create data rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]

      // Handle null/undefined
      if (value === null || value === undefined) return ''

      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""')

      // Wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue}"`
      }

      return stringValue
    }).join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 support
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function exportToCSV(data: any[], headers: string[], filename: string): void {
  const csv = convertToCSV(data, headers)
  downloadCSV(csv, filename)
}
