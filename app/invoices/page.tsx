'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Download, Search, FileText, MessageCircle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/date'
import { generateInvoicePDF, downloadPDF } from '@/utils/pdf'
import { Database } from '@/types/database.types'

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  members: {
    name: string
    phone: string
    plan_type: string
    start_date: string
    end_date: string
  }
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
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
            plan_type,
            start_date,
            end_date
          )
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch service periods for each invoice
      const invoicesWithServicePeriods = await Promise.all(
        (data || []).map(async (invoice) => {
          // For service-type invoices, get the service date range
          if (invoice.invoice_type === 'service') {
            const { data: services } = await supabase
              .from('member_services')
              .select('start_date, end_date')
              .eq('member_id', invoice.member_id)
              .lte('created_at', invoice.created_at)
              .order('created_at', { ascending: false })

            if (services && services.length > 0) {
              // Find the earliest start date and latest end date
              const startDates = services.map(s => s.start_date).filter(Boolean)
              const endDates = services.map(s => s.end_date).filter(Boolean)

              return {
                ...invoice,
                servicePeriodStart: startDates.length > 0 ? startDates.sort()[0] : null,
                servicePeriodEnd: endDates.length > 0 ? endDates.sort().reverse()[0] : null
              }
            }
          }
          return invoice
        })
      )

      // Group invoices by member
      const grouped = groupInvoicesByMember(invoicesWithServicePeriods as any[] || [])
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
        .select('email, phone, address, gst_number')
        .eq('id', gymId!)
        .single()

      // Fetch member data with description
      const { data: member } = await supabase
        .from('members')
        .select('amount, description')
        .eq('id', invoice.member_id)
        .single()

      // Determine what to show based on invoice type
      const invoiceType = invoice.invoice_type || 'membership'

      // Fetch services that were created BEFORE or AT the time of this invoice
      // This ensures we only show services that existed when the invoice was generated
      const { data: memberServices } = await supabase
        .from('member_services')
        .select('*')
        .eq('member_id', invoice.member_id)
        .lte('created_at', invoice.created_at)

      // Build services array with dates
      const services = memberServices
        ?.map((ms: any) => ({
          name: ms.service_name,
          amount: ms.amount,
          startDate: ms.start_date,
          endDate: ms.end_date
        })) || []

      // Logic:
      // - 'membership': show plan + services that existed at signup time
      // - 'renewal': show plan + services that existed at renewal time
      // - 'service': show ONLY services, NO plan (service addition)
      const showPlan = invoiceType === 'membership' || invoiceType === 'renewal'
      const showServices = invoiceType === 'service' || services.length > 0

      const pdfBlob = await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        date: invoice.date,
        memberName: invoice.members.name,
        memberPhone: invoice.members.phone,
        amount: invoice.amount,
        planType: showPlan ? invoice.members.plan_type : undefined,
        planAmount: showPlan ? member?.amount || 0 : undefined,
        planDescription: showPlan ? member?.description : undefined,
        services: showServices ? services : [],
        startDate: invoice.members.start_date,
        endDate: invoice.members.end_date,
        gymName: name,
        gymEmail: gym?.email || '',
        gymPhone: gym?.phone || null,
        gymAddress: gym?.address || null,
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

  function handleWhatsAppSend(invoice: Invoice) {
    const message = `Hello ${invoice.members.name},

Your invoice is ready!

Invoice No: ${invoice.invoice_number}
Date: ${formatDate(invoice.date)}
Amount: ${formatCurrency(invoice.amount)}
Service Period: ${formatDate(invoice.members.start_date)} to ${formatDate(invoice.members.end_date)}

Thank you for being a valued member of ${name}!`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${invoice.members.phone}?text=${encodedMessage}`

    window.open(whatsappUrl, '_blank')
  }


  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">View and manage payment invoices</p>
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
                  <div className="px-4 md:px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-base md:text-lg">{group.memberName}</div>
                        <div className="text-sm text-gray-500">{group.memberPhone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details - Desktop Table View */}
                  <div className="hidden md:block bg-white">
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
                            Service Period
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
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {invoice.invoice_type === 'service' && invoice.servicePeriodStart && invoice.servicePeriodEnd ? (
                                <div className="flex flex-col">
                                  <span>{formatDate(invoice.servicePeriodStart)}</span>
                                  <span className="text-xs text-gray-400">to</span>
                                  <span>{formatDate(invoice.servicePeriodEnd)}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span>{formatDate(invoice.members.start_date)}</span>
                                  <span className="text-xs text-gray-400">to</span>
                                  <span>{formatDate(invoice.members.end_date)}</span>
                                </div>
                              )}
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
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleDownloadPDF(invoice)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleWhatsAppSend(invoice)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Send via WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice Details - Mobile Card View */}
                  <div className="md:hidden bg-white divide-y divide-gray-200">
                    {group.invoices.map((invoice) => (
                      <div key={invoice.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">{invoice.invoice_number}</div>
                            <div className="text-xs text-gray-500">{formatDate(invoice.date)}</div>
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.payment_status === 'Paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.payment_status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.payment_status}
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="text-xs">
                            <span className="text-gray-500">Service Period:</span>
                            <div className="text-gray-700 mt-1">
                              {invoice.invoice_type === 'service' && invoice.servicePeriodStart && invoice.servicePeriodEnd ? (
                                <div>
                                  {formatDate(invoice.servicePeriodStart)} - {formatDate(invoice.servicePeriodEnd)}
                                </div>
                              ) : (
                                <div>
                                  {formatDate(invoice.members.start_date)} - {formatDate(invoice.members.end_date)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(invoice.amount)}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadPDF(invoice)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-900 text-sm font-medium"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => handleWhatsAppSend(invoice)}
                                className="flex items-center gap-1 text-green-600 hover:text-green-900 text-sm font-medium"
                                title="Send via WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
