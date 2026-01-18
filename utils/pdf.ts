import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatCurrency } from './date'

interface ServiceItem {
  name: string
  amount: number
}

interface InvoiceData {
  invoiceNumber: string
  date: string
  memberName: string
  memberPhone: string
  amount: number
  planType?: string
  planAmount?: number
  services?: ServiceItem[]
  gymName: string
  gymEmail: string
  gymPhone?: string | null
  gymAddress?: string | null
  gymGstNumber?: string | null
  gymLogo?: string | null
  primaryColor: string
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Header background with primary color
  doc.setFillColor(data.primaryColor)
  doc.rect(0, 0, pageWidth, 50, 'F')

  // Add gym logo if available
  if (data.gymLogo) {
    try {
      doc.addImage(data.gymLogo, 'PNG', 15, 10, 30, 30)
    } catch (error) {
      console.error('Error adding logo:', error)
    }
  }

  // Gym name and details (white text on colored background)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(data.gymName, data.gymLogo ? 50 : 15, 22)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let yPos = 30

  // Email
  doc.text(data.gymEmail, data.gymLogo ? 50 : 15, yPos)
  yPos += 6

  // Phone if available
  if (data.gymPhone) {
    doc.text(`Phone: ${data.gymPhone}`, data.gymLogo ? 50 : 15, yPos)
    yPos += 6
  }

  // Address if available
  if (data.gymAddress) {
    // Split address if too long
    const maxWidth = 80
    const addressLines = doc.splitTextToSize(data.gymAddress, maxWidth)
    doc.text(addressLines, data.gymLogo ? 50 : 15, yPos)
    yPos += addressLines.length * 5
  }

  // GST number if available
  if (data.gymGstNumber) {
    doc.text(`GST: ${data.gymGstNumber}`, data.gymLogo ? 50 : 15, yPos)
  }

  // Invoice title (white text)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - 15, 30, { align: 'right' })

  // Invoice details box
  doc.setFillColor(245, 245, 245)
  doc.rect(pageWidth - 75, 55, 60, 25, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Invoice Number:', pageWidth - 72, 62)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(data.invoiceNumber, pageWidth - 72, 68)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('Date:', pageWidth - 72, 74)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(data.date), pageWidth - 72, 80)

  // Bill To section with box
  doc.setFillColor(245, 245, 245)
  doc.rect(15, 55, 100, 25, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BILL TO', 18, 62)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(data.memberName, 18, 70)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Phone: ${data.memberPhone}`, 18, 76)

  // Invoice items table with better spacing
  const tableData = []

  // Add membership plan
  if (data.planType && data.planAmount) {
    tableData.push(['Membership Plan', data.planType, formatCurrency(data.planAmount)])
  }

  // Add services
  if (data.services && data.services.length > 0) {
    data.services.forEach(service => {
      tableData.push(['Service', service.name, formatCurrency(service.amount)])
    })
  }

  autoTable(doc, {
    startY: 95,
    head: [['Description', 'Details', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: data.primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left' },
      1: { cellWidth: 75, halign: 'left' },
      2: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto',
  })

  // Total section with enhanced styling
  const finalY = (doc as any).lastAutoTable.finalY || 120

  // Total box
  doc.setFillColor(data.primaryColor)
  doc.rect(120, finalY + 10, 75, 18, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', 125, finalY + 20)
  doc.setFontSize(14)
  doc.text(formatCurrency(data.amount), 160, finalY + 20)

  // Footer section
  const footerY = pageHeight - 30

  // Divider line
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(15, footerY, pageWidth - 15, footerY)

  // Thank you message
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 8, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('This is a computer-generated invoice', pageWidth / 2, footerY + 14, { align: 'center' })

  // Return as blob
  return doc.output('blob')
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
