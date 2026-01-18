'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Download, Mail, Search, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/date'
import { generateInvoicePDF, downloadPDF } from '@/utils/pdf'
import { Database } from '@/types/database.types'

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  members: {
    name: string
    phone: string
    plan_type: string
  }
}

type GroupedInvoices = {
  memberId: string
  memberName: string
  memberPhone: string
  invoices: Invoice[]
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

export default function InvoicesPage() {
  const [groupedInvoices, setGroupedInvoices] = useState<GroupedInvoices[]>([])
  const [filteredGroupedInvoices, setFilteredGroupedInvoices] = useState<GroupedInvoices[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const { gymId, name, logoUrl, primaryColor } = useGymBranding()
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [gymId])

  useEffect(() => {
    // Filter grouped invoices
    const filteredGrouped = groupedInvoices.filter(group =>
      group.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.memberPhone.includes(searchTerm)
    )
    setFilteredGroupedInvoices(filteredGrouped)
  }, [searchTerm, groupedInvoices])

  async function loadInvoices() {
    if (!gymId) return

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          members (
            name,
            phone,
            plan_type
          )
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group invoices by member
      const grouped = groupInvoicesByMember(data as Invoice[] || [])
      setGroupedInvoices(grouped)
      setFilteredGroupedInvoices(grouped)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  function groupInvoicesByMember(invoiceList: Invoice[]): GroupedInvoices[] {
    const memberMap = new Map<string, GroupedInvoices>()

    invoiceList.forEach(invoice => {
      if (!memberMap.has(invoice.member_id)) {
        memberMap.set(invoice.member_id, {
          memberId: invoice.member_id,
          memberName: invoice.members.name,
          memberPhone: invoice.members.phone,
          invoices: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
        })
      }

      const group = memberMap.get(invoice.member_id)!
      group.invoices.push(invoice)
      group.totalAmount += invoice.amount

      if (invoice.payment_status === 'Paid') {
        group.paidAmount += invoice.amount
      } else if (invoice.payment_status === 'Pending') {
        group.pendingAmount += invoice.amount
      } else if (invoice.payment_status === 'Overdue') {
        group.overdueAmount += invoice.amount
      }
    })

    return Array.from(memberMap.values()).sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    )
  }

  async function handleDownloadPDF(invoice: Invoice) {
    try {
      const { data: gym } = await supabase
        .from('gyms')
        .select('email, gst_number')
        .eq('id', gymId!)
        .single()

      // Fetch member data with services
      const { data: member } = await supabase
        .from('members')
        .select('amount, member_services(*)')
        .eq('id', invoice.member_id)
        .single()

      // Build services array
      const services = member?.member_services
        ?.filter((ms: any) => ms.is_active)
        .map((ms: any) => ({
          name: ms.service_name,
          amount: ms.amount
        })) || []

      const pdfBlob = await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        date: invoice.date,
        memberName: invoice.members.name,
        memberPhone: invoice.members.phone,
        amount: invoice.amount,
        planType: invoice.members.plan_type,
        planAmount: member?.amount || 0,
        services: services,
        gymName: name,
        gymEmail: gym?.email || '',
        gymGstNumber: gym?.gst_number || null,
        gymLogo: logoUrl,
        primaryColor: primaryColor,
      })

      downloadPDF(pdfBlob, `${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  async function handleSendEmail(invoice: Invoice) {
    setSendingEmail(invoice.id)

    try {
      const { data: gym } = await supabase
        .from('gyms')
        .select('email, gst_number')
        .eq('id', gymId!)
        .single()

      // Fetch member data with services
      const { data: member } = await supabase
        .from('members')
        .select('amount, member_services(*)')
        .eq('id', invoice.member_id)
        .single()

      // Build services array
      const services = member?.member_services
        ?.filter((ms: any) => ms.is_active)
        .map((ms: any) => ({
          name: ms.service_name,
          amount: ms.amount
        })) || []

      const pdfBlob = await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        date: invoice.date,
        memberName: invoice.members.name,
        memberPhone: invoice.members.phone,
        amount: invoice.amount,
        planType: invoice.members.plan_type,
        planAmount: member?.amount || 0,
        services: services,
        gymName: name,
        gymEmail: gym?.email || '',
        gymGstNumber: gym?.gst_number || null,
        gymLogo: logoUrl,
        primaryColor: primaryColor,
      })

      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(pdfBlob)
      reader.onloadend = async () => {
        const base64data = reader.result as string

        const response = await fetch('/api/send-invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: gym?.email || 'member@example.com', // In production, get member's email
            subject: `Invoice ${invoice.invoice_number} from ${name}`,
            html: `
              <h2>Invoice from ${name}</h2>
              <p>Dear ${invoice.members.name},</p>
              <p>Please find attached your invoice for ${formatCurrency(invoice.amount)}.</p>
              <p>Invoice Number: ${invoice.invoice_number}</p>
              <p>Date: ${formatDate(invoice.date)}</p>
              <p>Thank you for your business!</p>
            `,
            pdfBase64: base64data.split(',')[1],
            filename: `${invoice.invoice_number}.pdf`,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send email')
        }

        alert('Invoice sent successfully!')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Error sending invoice. Please check your Resend API key configuration.')
    } finally {
      setSendingEmail(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">View and manage payment invoices</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredGroupedInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredGroupedInvoices.map((group) => (
                <div key={group.memberId} className="bg-white">
                  {/* Member Header Row */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{group.memberName}</div>
                        <div className="text-sm text-gray-500">{group.memberPhone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details - Always Visible */}
                  <div className="bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(invoice.date)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {formatCurrency(invoice.amount)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invoice.payment_status === 'Paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.payment_status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {invoice.payment_status}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownloadPDF(invoice)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSendEmail(invoice)}
                                  disabled={sendingEmail === invoice.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title="Send via Email"
                                >
                                  {sendingEmail === invoice.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                  ) : (
                                    <Mail className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
