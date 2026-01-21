'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { ArrowLeft, Calendar, Phone, User, CreditCard, Package } from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/date'
import { Database } from '@/types/database.types'

type Member = Database['public']['Tables']['members']['Row']
type MemberService = {
  id: string
  service_name: string
  service_type: 'pt' | 'other'
  amount: number
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at: string
}

type Invoice = {
  id: string
  invoice_number: string
  amount: number
  date: string
  payment_status: string
  invoice_type: string
  created_at: string
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string
  const [member, setMember] = useState<Member | null>(null)
  const [services, setServices] = useState<MemberService[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const { gymId, primaryColor } = useGymBranding()
  const supabase = createClient()

  useEffect(() => {
    loadMemberDetails()
  }, [memberId, gymId])

  async function loadMemberDetails() {
    if (!gymId || !memberId) return

    try {
      // Load member data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single()

      if (memberError) throw memberError
      setMember(memberData)

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('member_services')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (servicesError) throw servicesError
      setServices(servicesData || [])

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError
      setInvoices(invoicesData || [])
    } catch (error) {
      console.error('Error loading member details:', error)
      alert('Error loading member details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!member) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8">
          <p className="text-red-600">Member not found</p>
        </div>
      </DashboardLayout>
    )
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(member.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpired = daysUntilExpiry < 0
  const isExpiring = daysUntilExpiry <= 7 && daysUntilExpiry >= 0

  const activeServices = services.filter(s => s.is_active)
  const inactiveServices = services.filter(s => !s.is_active)

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/members')}
            className="flex items-center gap-2 text-sm md:text-base text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Member Details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Member Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-sm md:text-base font-medium text-gray-900">{member.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm md:text-base font-medium text-gray-900">{member.phone}</p>
                  </div>
                </div>
                {member.dob && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="text-sm md:text-base font-medium text-gray-900">{formatDate(member.dob)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Membership Details Card */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Membership Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Plan Type</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{member.plan_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{formatCurrency(member.amount)}</p>
                </div>
                {member.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm md:text-base font-medium text-gray-900">{member.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{formatDate(member.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{formatDate(member.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {isExpired ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Expired
                    </span>
                  ) : member.is_active ? (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isExpiring
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpiring ? 'Expiring Soon' : 'Active'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Services Card */}
            {activeServices.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Active Services
                </h2>
                <div className="space-y-3">
                  {activeServices.map((service) => {
                    const isPT = service.service_type === 'pt'
                    let statusColor = 'bg-green-100 text-green-800'

                    if (isPT && service.end_date) {
                      const ptDaysUntilExpiry = Math.ceil(
                        (new Date(service.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      )
                      if (ptDaysUntilExpiry < 0) {
                        statusColor = 'bg-red-100 text-red-800'
                      } else if (ptDaysUntilExpiry <= 7) {
                        statusColor = 'bg-orange-100 text-orange-800'
                      }
                    }

                    return (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm md:text-base font-medium text-gray-900">{service.service_name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
                            {isPT ? 'Personal Training' : 'Service'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium text-gray-900">{formatCurrency(service.amount)}</p>
                          </div>
                          {service.start_date && service.end_date && (
                            <div>
                              <p className="text-gray-500">Period</p>
                              <p className="font-medium text-gray-900">
                                {formatDate(service.start_date)} - {formatDate(service.end_date)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inactive Services Card */}
            {inactiveServices.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Service History</h2>
                <div className="space-y-2">
                  {inactiveServices.map((service) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm md:text-base font-medium text-gray-700">{service.service_name}</h3>
                          <p className="text-sm text-gray-500">{formatCurrency(service.amount)}</p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Invoices */}
          <div>
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Invoices
              </h2>
              {invoices.length === 0 ? (
                <p className="text-gray-500 text-sm">No invoices found</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm md:text-base font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.payment_status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.payment_status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.payment_status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                        <p className="text-xs text-gray-500 capitalize">{invoice.invoice_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
