'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Plus, Edit, Trash2, Search, RefreshCw, X, PlusCircle, Download } from 'lucide-react'
import { formatDate, formatCurrency, calculateEndDate } from '@/utils/date'
import { exportToCSV } from '@/utils/export'
import { Database } from '@/types/database.types'

type Member = Database['public']['Tables']['members']['Row']
type MemberService = {
  id?: string
  service_name: string
  service_type: 'pt' | 'other'
  amount: number
  start_date?: string
  end_date?: string
  is_active: boolean
}
type MemberWithServices = Member & {
  member_services?: MemberService[]
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithServices[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberWithServices[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [renewingMember, setRenewingMember] = useState<Member | null>(null)
  const [addingServiceToMember, setAddingServiceToMember] = useState<Member | null>(null)
  const [ptService, setPtService] = useState({ enabled: false, startDate: '', endDate: '', amount: '' })
  const [otherServices, setOtherServices] = useState<Array<{ name: string; amount: string }>>([])
  const { gymId, primaryColor } = useGymBranding()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    plan_type: 'Monthly' as 'Monthly' | 'Quarterly' | 'Yearly',
    start_date: new Date().toISOString().split('T')[0],
    amount: '',
  })

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    dob: '',
  })

  const [renewData, setRenewData] = useState({
    plan_type: 'Monthly' as 'Monthly' | 'Quarterly' | 'Yearly',
    amount: '',
  })

  useEffect(() => {
    loadMembers()
  }, [gymId])

  useEffect(() => {
    let filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => {
        const daysUntilExpiry = Math.ceil(
          (new Date(member.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        const isExpired = daysUntilExpiry < 0
        const isExpiring = daysUntilExpiry <= 7 && daysUntilExpiry >= 0

        if (statusFilter === 'active') {
          return member.is_active && !isExpiring && !isExpired
        } else if (statusFilter === 'expiring') {
          return member.is_active && isExpiring
        } else if (statusFilter === 'inactive') {
          return !member.is_active || isExpired
        }
        return true
      })
    }

    setFilteredMembers(filtered)
  }, [searchTerm, statusFilter, members])

  async function loadMembers() {
    if (!gymId) return

    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          member_services(*)
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter active services on the client side
      const membersWithActiveServices = (data || []).map(member => ({
        ...member,
        member_services: (member.member_services || []).filter((ms: any) => ms.is_active)
      }))

      setMembers(membersWithActiveServices)
      setFilteredMembers(membersWithActiveServices)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gymId) {
      alert('Gym information not loaded. Please refresh the page.')
      return
    }

    try {
      if (editingMember) {
        // Edit mode - only update basic member info
        const { error } = await supabase
          .from('members')
          .update({
            name: editFormData.name,
            phone: editFormData.phone,
            dob: editFormData.dob || null,
          })
          .eq('id', editingMember.id)

        if (error) throw error
        alert('Member details updated successfully!')
      } else {
        // Add new member mode
        const endDate = calculateEndDate(formData.start_date, formData.plan_type)
        const memberData = {
          gym_id: gymId,
          name: formData.name,
          phone: formData.phone,
          dob: formData.dob || null,
          plan_type: formData.plan_type,
          start_date: formData.start_date,
          end_date: endDate.toISOString().split('T')[0],
          amount: parseFloat(formData.amount),
          is_active: true,
        }
        const { data: newMember, error } = await supabase
          .from('members')
          .insert(memberData)
          .select()
          .single()

        if (error) throw error

        // Calculate total invoice amount (membership + services)
        let totalAmount = parseFloat(formData.amount)

        // Insert PT service if enabled
        if (ptService.enabled && ptService.amount) {
          await supabase.from('member_services').insert({
            member_id: newMember.id,
            service_name: 'Personal Training',
            service_type: 'pt',
            start_date: ptService.startDate,
            end_date: ptService.endDate,
            amount: parseFloat(ptService.amount),
            is_active: true,
          })
          totalAmount += parseFloat(ptService.amount)
        }

        // Insert other services
        if (otherServices.length > 0) {
          const otherServiceInserts = otherServices
            .filter(s => s.name && s.amount)
            .map(s => ({
              member_id: newMember.id,
              service_name: s.name,
              service_type: 'other' as const,
              amount: parseFloat(s.amount),
              is_active: true,
            }))
          if (otherServiceInserts.length > 0) {
            await supabase.from('member_services').insert(otherServiceInserts)
            totalAmount += otherServiceInserts.reduce((sum, s) => sum + s.amount, 0)
          }
        }

        // Generate invoice
        const { data: invoiceNumberData, error: rpcError } = await supabase.rpc('generate_invoice_number')

        if (rpcError) {
          console.error('Error generating invoice number:', rpcError)
        }

        const { error: invoiceError } = await supabase.from('invoices').insert({
          gym_id: gymId,
          member_id: newMember.id,
          invoice_number: invoiceNumberData || `INV-${Date.now()}`,
          amount: totalAmount,
          date: formData.start_date,
          payment_status: 'Paid',
          invoice_type: 'membership',
        })

        if (invoiceError) throw invoiceError
      }

      resetForm()
      loadMembers()
    } catch (error: any) {
      console.error('Error saving member:', error)
      alert(`Error saving member: ${error.message || 'Please try again.'}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this member?')) return

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
    }
  }

  async function openRenewModal(member: Member) {
    setRenewingMember(member)
    setRenewData({
      plan_type: member.plan_type,
      amount: member.amount.toString(),
    })

    // Load member's existing services for renewal
    const { data: memberServices } = await supabase
      .from('member_services')
      .select('*')
      .eq('member_id', member.id)
      .eq('is_active', true)

    // Load PT service
    const ptSvc = memberServices?.find(ms => ms.service_type === 'pt')
    if (ptSvc) {
      setPtService({
        enabled: true,
        startDate: ptSvc.start_date || '',
        endDate: ptSvc.end_date || '',
        amount: ptSvc.amount.toString(),
      })
    } else {
      setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
    }

    // Load other services
    const otherSvcs = memberServices?.filter(ms => ms.service_type === 'other') || []
    setOtherServices(otherSvcs.map(s => ({ name: s.service_name, amount: s.amount.toString() })))

    setShowRenewModal(true)
  }

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault()
    if (!gymId || !renewingMember) return

    try {
      const newStartDate = new Date(renewingMember.end_date)
      newStartDate.setDate(newStartDate.getDate() + 1)
      const newEndDate = calculateEndDate(newStartDate, renewData.plan_type)

      // Update existing member with new dates and potentially new plan/amount
      const { error: updateError } = await supabase
        .from('members')
        .update({
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
          plan_type: renewData.plan_type,
          amount: parseFloat(renewData.amount),
          is_active: true,
        })
        .eq('id', renewingMember.id)

      if (updateError) throw updateError

      // Update member services - delete old ones and add new ones
      await supabase.from('member_services').delete().eq('member_id', renewingMember.id)

      let totalAmount = parseFloat(renewData.amount)

      // Insert PT service if enabled
      if (ptService.enabled && ptService.amount) {
        await supabase.from('member_services').insert({
          member_id: renewingMember.id,
          service_name: 'Personal Training',
          service_type: 'pt',
          start_date: ptService.startDate,
          end_date: ptService.endDate,
          amount: parseFloat(ptService.amount),
          is_active: true,
        })
        totalAmount += parseFloat(ptService.amount)
      }

      // Insert other services
      if (otherServices.length > 0) {
        const otherServiceInserts = otherServices
          .filter(s => s.name && s.amount)
          .map(s => ({
            member_id: renewingMember.id,
            service_name: s.name,
            service_type: 'other' as const,
            amount: parseFloat(s.amount),
            is_active: true,
          }))
        if (otherServiceInserts.length > 0) {
          await supabase.from('member_services').insert(otherServiceInserts)
          totalAmount += otherServiceInserts.reduce((sum, s) => sum + s.amount, 0)
        }
      }

      // Generate invoice for renewal
      const { data: invoiceNumberData, error: rpcError } = await supabase.rpc('generate_invoice_number')

      if (rpcError) {
        console.error('Error generating invoice number:', rpcError)
      }

      const { error: invoiceError } = await supabase.from('invoices').insert({
        gym_id: gymId,
        member_id: renewingMember.id,
        invoice_number: invoiceNumberData || `INV-${Date.now()}`,
        amount: totalAmount,
        date: newStartDate.toISOString().split('T')[0],
        payment_status: 'Paid',
        invoice_type: 'renewal',
      })

      if (invoiceError) throw invoiceError

      setShowRenewModal(false)
      setRenewingMember(null)
      setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
      setOtherServices([])
      loadMembers()
      alert('Membership renewed successfully!')
    } catch (error: any) {
      console.error('Error renewing membership:', error)
      alert(`Error renewing membership: ${error.message || 'Please try again.'}`)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      phone: '',
      dob: '',
      plan_type: 'Monthly',
      start_date: new Date().toISOString().split('T')[0],
      amount: '',
    })
    setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
    setOtherServices([])
    setEditingMember(null)
    setShowModal(false)
  }

  function openEditModal(member: Member) {
    setEditFormData({
      name: member.name,
      phone: member.phone,
      dob: member.dob || '',
    })

    setEditingMember(member)
    setShowModal(true)
  }

  async function openAddServiceModal(member: Member) {
    setAddingServiceToMember(member)
    setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
    setOtherServices([])
    setShowAddServiceModal(true)
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!gymId || !addingServiceToMember) return

    try {
      // Check for existing active services
      const { data: existingServices } = await supabase
        .from('member_services')
        .select('service_name, service_type')
        .eq('member_id', addingServiceToMember.id)
        .eq('is_active', true)

      const existingServiceNames = new Set(existingServices?.map(s => s.service_name.toLowerCase()) || [])
      const hasPT = existingServices?.some(s => s.service_type === 'pt') || false

      // Check for PT duplicate
      if (ptService.enabled && hasPT) {
        alert('This member already has an active Personal Training service. Please renew the existing PT service instead.')
        return
      }

      // Check for other service duplicates
      const duplicates = otherServices.filter(s => s.name && existingServiceNames.has(s.name.toLowerCase()))
      if (duplicates.length > 0) {
        alert(`The following service(s) already exist for this member: ${duplicates.map(s => s.name).join(', ')}`)
        return
      }

      let totalAmount = 0

      // Insert PT service if enabled
      if (ptService.enabled && ptService.amount) {
        await supabase.from('member_services').insert({
          member_id: addingServiceToMember.id,
          service_name: 'Personal Training',
          service_type: 'pt',
          start_date: ptService.startDate,
          end_date: ptService.endDate,
          amount: parseFloat(ptService.amount),
          is_active: true,
        })
        totalAmount += parseFloat(ptService.amount)
      }

      // Insert other services
      if (otherServices.length > 0) {
        const otherServiceInserts = otherServices
          .filter(s => s.name && s.amount)
          .map(s => ({
            member_id: addingServiceToMember.id,
            service_name: s.name,
            service_type: 'other' as const,
            amount: parseFloat(s.amount),
            is_active: true,
          }))
        if (otherServiceInserts.length > 0) {
          await supabase.from('member_services').insert(otherServiceInserts)
          totalAmount += otherServiceInserts.reduce((sum, s) => sum + s.amount, 0)
        }
      }

      // Generate invoice for the new services
      if (totalAmount > 0) {
        const { data: invoiceNumberData, error: rpcError } = await supabase.rpc('generate_invoice_number')

        if (rpcError) {
          console.error('Error generating invoice number:', rpcError)
        }

        const { error: invoiceError } = await supabase.from('invoices').insert({
          gym_id: gymId,
          member_id: addingServiceToMember.id,
          invoice_number: invoiceNumberData || `INV-${Date.now()}`,
          amount: totalAmount,
          date: new Date().toISOString().split('T')[0],
          payment_status: 'Paid',
          invoice_type: 'service',
        })

        if (invoiceError) throw invoiceError
      }

      setShowAddServiceModal(false)
      setAddingServiceToMember(null)
      setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
      setOtherServices([])
      loadMembers()
      alert('Service(s) added successfully!')
    } catch (error: any) {
      console.error('Error adding service:', error)
      alert(`Error adding service: ${error.message || 'Please try again.'}`)
    }
  }

  function addOtherService() {
    setOtherServices([...otherServices, { name: '', amount: '' }])
  }

  function removeOtherService(index: number) {
    setOtherServices(otherServices.filter((_, i) => i !== index))
  }

  function updateOtherService(index: number, field: 'name' | 'amount', value: string) {
    const updated = [...otherServices]
    updated[index][field] = value
    setOtherServices(updated)
  }

  function calculateTotalAmount() {
    let total = parseFloat(formData.amount || '0')
    if (ptService.enabled && ptService.amount) {
      total += parseFloat(ptService.amount)
    }
    otherServices.forEach(s => {
      if (s.amount) total += parseFloat(s.amount)
    })
    return total
  }

  function calculateRenewTotalAmount() {
    let total = parseFloat(renewData.amount || '0')
    if (ptService.enabled && ptService.amount) {
      total += parseFloat(ptService.amount)
    }
    otherServices.forEach(s => {
      if (s.amount) total += parseFloat(s.amount)
    })
    return total
  }

  function calculateServiceTotalAmount() {
    let total = 0
    if (ptService.enabled && ptService.amount) {
      total += parseFloat(ptService.amount)
    }
    otherServices.forEach(s => {
      if (s.amount) total += parseFloat(s.amount)
    })
    return total
  }

  function handleExportCSV() {
    const exportData = filteredMembers.map(member => {
      const daysUntilExpiry = Math.ceil(
        (new Date(member.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      const isExpired = daysUntilExpiry < 0
      const isExpiring = daysUntilExpiry <= 7 && daysUntilExpiry >= 0

      let status = 'Inactive'
      if (isExpired) status = 'Expired'
      else if (member.is_active && isExpiring) status = 'Expiring Soon'
      else if (member.is_active) status = 'Active'

      const services = member.member_services?.map(ms => ms.service_name).join('; ') || 'None'
      const totalAmount = member.amount + (member.member_services?.reduce((sum, ms) => sum + ms.amount, 0) || 0)

      return {
        Name: member.name,
        Phone: member.phone,
        'Date of Birth': member.dob || '',
        'Plan Type': member.plan_type,
        'Start Date': formatDate(member.start_date),
        'End Date': formatDate(member.end_date),
        'Membership Amount': member.amount,
        'Services': services,
        'Total Amount': totalAmount,
        'Status': status
      }
    })

    const headers = ['Name', 'Phone', 'Date of Birth', 'Plan Type', 'Start Date', 'End Date', 'Membership Amount', 'Services', 'Total Amount', 'Status']
    const filename = `members-${new Date().toISOString().split('T')[0]}.csv`

    exportToCSV(exportData, headers, filename)
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-600 mt-1">Manage your gym members</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              title="Export to CSV"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="h-5 w-5" />
              Add Member
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="all">All Members</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Services
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
                  {filteredMembers.map((member) => {
                    const daysUntilExpiry = Math.ceil(
                      (new Date(member.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const isExpired = daysUntilExpiry < 0
                    const isExpiring = daysUntilExpiry <= 7 && daysUntilExpiry >= 0

                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{member.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.plan_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(member.start_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(member.end_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(
                            member.amount +
                            (member.member_services?.reduce((sum, ms) => sum + ms.amount, 0) || 0)
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {member.member_services && member.member_services.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {member.member_services.map((ms, idx) => {
                                // For PT services, check expiry
                                if (ms.service_type === 'pt' && ms.end_date) {
                                  const ptDaysUntilExpiry = Math.ceil(
                                    (new Date(ms.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                                  )
                                  const isPtExpiring = ptDaysUntilExpiry <= 7 && ptDaysUntilExpiry >= 0
                                  const isPtExpired = ptDaysUntilExpiry < 0

                                  return (
                                    <span
                                      key={idx}
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        isPtExpired
                                          ? 'bg-red-100 text-red-800'
                                          : isPtExpiring
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                      title={`${ms.service_name} - ${formatCurrency(ms.amount)} (Expires: ${formatDate(ms.end_date)})`}
                                    >
                                      {ms.service_name}
                                    </span>
                                  )
                                }

                                // Other services - always blue
                                return (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                    title={`${ms.service_name} - ${formatCurrency(ms.amount)}`}
                                  >
                                    {ms.service_name}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {(isExpired || (member.is_active && isExpiring)) && (
                              <button
                                onClick={() => openRenewModal(member)}
                                className="text-green-600 hover:text-green-900"
                                title="Renew membership"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openAddServiceModal(member)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Add service"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(member)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit member"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingMember ? 'Edit Member' : 'Add New Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {editingMember ? (
                /* Edit Mode - Basic Info Only */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={editFormData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setEditFormData({ ...editFormData, phone: value });
                        }
                      }}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth (Optional)
                    </label>
                    <input
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </>
              ) : (
                /* Add Mode - Full Form with Services */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setFormData({ ...formData, phone: value });
                        }
                      }}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Type
                    </label>
                    <select
                      value={formData.plan_type}
                      onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly (3 months)</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (Membership Fee)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </>
              )}

              {/* PT Service Section - Only show in Add mode */}
              {!editingMember && (
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={ptService.enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPtService({
                          enabled: true,
                          startDate: formData.start_date,
                          endDate: calculateEndDate(formData.start_date, formData.plan_type).toISOString().split('T')[0],
                          amount: ''
                        })
                      } else {
                        setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Add Personal Training (PT)</span>
                </label>

                {ptService.enabled && (
                  <div className="space-y-3 ml-6 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Start Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.startDate}
                        onChange={(e) => setPtService({ ...ptService, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT End Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.endDate}
                        onChange={(e) => setPtService({ ...ptService, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Amount
                      </label>
                      <input
                        type="number"
                        required={ptService.enabled}
                        step="0.01"
                        value={ptService.amount}
                        onChange={(e) => setPtService({ ...ptService, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Other Services Section - Only show in Add mode */}
              {!editingMember && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Other Services
                  </label>
                  <button
                    type="button"
                    onClick={addOtherService}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Service
                  </button>
                </div>

                {otherServices.length > 0 && (
                  <div className="space-y-3">
                    {otherServices.map((service, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => updateOtherService(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            step="0.01"
                            value={service.amount}
                            onChange={(e) => updateOtherService(idx, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOtherService(idx)}
                          className="text-red-600 hover:text-red-700 mt-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Total Amount Display - Only show in Add mode */}
              {!editingMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateTotalAmount())}
                  </span>
                </div>
              </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  {editingMember ? 'Update' : 'Add'} Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && renewingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Renew Membership - {renewingMember.name}
            </h2>
            <form onSubmit={handleRenew} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <p className="text-sm">
                  Current plan expires on: <strong>{formatDate(renewingMember.end_date)}</strong>
                </p>
                <p className="text-sm mt-1">
                  New plan starts: <strong>{formatDate(new Date(new Date(renewingMember.end_date).getTime() + 86400000))}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Type
                </label>
                <select
                  value={renewData.plan_type}
                  onChange={(e) => setRenewData({ ...renewData, plan_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly (3 months)</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (Membership Fee)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={renewData.amount}
                  onChange={(e) => setRenewData({ ...renewData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* PT Service Section */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={ptService.enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newStartDate = new Date(renewingMember.end_date)
                        newStartDate.setDate(newStartDate.getDate() + 1)
                        const startDateStr = newStartDate.toISOString().split('T')[0]
                        setPtService({
                          enabled: true,
                          startDate: startDateStr,
                          endDate: calculateEndDate(startDateStr, renewData.plan_type).toISOString().split('T')[0],
                          amount: ''
                        })
                      } else {
                        setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Add Personal Training (PT)</span>
                </label>

                {ptService.enabled && (
                  <div className="space-y-3 ml-6 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Start Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.startDate}
                        onChange={(e) => setPtService({ ...ptService, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT End Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.endDate}
                        onChange={(e) => setPtService({ ...ptService, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Amount
                      </label>
                      <input
                        type="number"
                        required={ptService.enabled}
                        step="0.01"
                        value={ptService.amount}
                        onChange={(e) => setPtService({ ...ptService, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Other Services Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Other Services
                  </label>
                  <button
                    type="button"
                    onClick={addOtherService}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Service
                  </button>
                </div>

                {otherServices.length > 0 && (
                  <div className="space-y-3">
                    {otherServices.map((service, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => updateOtherService(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            step="0.01"
                            value={service.amount}
                            onChange={(e) => updateOtherService(idx, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOtherService(idx)}
                          className="text-red-600 hover:text-red-700 mt-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateRenewTotalAmount())}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenewModal(false)
                    setRenewingMember(null)
                    setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
                    setOtherServices([])
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Renew Membership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && addingServiceToMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Add Service - {addingServiceToMember.name}
            </h2>
            <form onSubmit={handleAddService} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <p className="text-sm">
                  Adding new service(s) will generate a new invoice for the member.
                </p>
              </div>

              {/* PT Service Section */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={ptService.enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPtService({
                          enabled: true,
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: calculateEndDate(new Date(), 'Monthly').toISOString().split('T')[0],
                          amount: ''
                        })
                      } else {
                        setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Add Personal Training (PT)</span>
                </label>

                {ptService.enabled && (
                  <div className="space-y-3 ml-6 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Start Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.startDate}
                        onChange={(e) => setPtService({ ...ptService, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT End Date
                      </label>
                      <input
                        type="date"
                        required={ptService.enabled}
                        value={ptService.endDate}
                        onChange={(e) => setPtService({ ...ptService, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PT Amount
                      </label>
                      <input
                        type="number"
                        required={ptService.enabled}
                        step="0.01"
                        value={ptService.amount}
                        onChange={(e) => setPtService({ ...ptService, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Other Services Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Other Services
                  </label>
                  <button
                    type="button"
                    onClick={addOtherService}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Service
                  </button>
                </div>

                {otherServices.length > 0 && (
                  <div className="space-y-3">
                    {otherServices.map((service, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Service name"
                            value={service.name}
                            onChange={(e) => updateOtherService(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            step="0.01"
                            value={service.amount}
                            onChange={(e) => updateOtherService(idx, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOtherService(idx)}
                          className="text-red-600 hover:text-red-700 mt-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Invoice Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateServiceTotalAmount())}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddServiceModal(false)
                    setAddingServiceToMember(null)
                    setPtService({ enabled: false, startDate: '', endDate: '', amount: '' })
                    setOtherServices([])
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Add Service(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
