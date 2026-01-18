'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Dumbbell, Search, AlertTriangle, CheckCircle, XCircle, Calendar, Phone, User } from 'lucide-react'
import { formatDate, formatCurrency } from '@/utils/date'
import Link from 'next/link'

interface PTMember {
  id: string
  member_id: string
  member_name: string
  member_phone: string
  service_name: string
  start_date: string | null
  end_date: string | null
  amount: number
  is_active: boolean
  daysUntilExpiry: number
  status: 'active' | 'expiring-soon' | 'expired' | 'inactive'
}

export default function PTMembersPage() {
  const [ptMembers, setPtMembers] = useState<PTMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<PTMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring-soon' | 'expired'>('all')
  const { gymId, primaryColor } = useGymBranding()
  const supabase = createClient()

  useEffect(() => {
    loadPTMembers()
  }, [gymId])

  useEffect(() => {
    let filtered = ptMembers.filter(member =>
      member.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member_phone.includes(searchTerm)
    )

    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    setFilteredMembers(filtered)
  }, [searchTerm, statusFilter, ptMembers])

  async function loadPTMembers() {
    if (!gymId) return

    try {
      const { data, error } = await supabase
        .from('member_services')
        .select(`
          id,
          member_id,
          service_name,
          start_date,
          end_date,
          amount,
          is_active,
          members!inner(
            id,
            name,
            phone,
            gym_id
          )
        `)
        .eq('service_type', 'pt')
        .eq('members.gym_id', gymId)

      if (error) throw error

      const today = new Date()
      const processedMembers: PTMember[] = (data || []).map((service: any) => {
        const member = service.members
        let daysUntilExpiry = 0
        let status: 'active' | 'expiring-soon' | 'expired' | 'inactive' = 'inactive'

        if (service.end_date) {
          const endDate = new Date(service.end_date)
          daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (!service.is_active) {
            status = 'inactive'
          } else if (daysUntilExpiry < 0) {
            status = 'expired'
          } else if (daysUntilExpiry <= 7) {
            status = 'expiring-soon'
          } else {
            status = 'active'
          }
        } else {
          status = service.is_active ? 'active' : 'inactive'
        }

        return {
          id: service.id,
          member_id: service.member_id,
          member_name: member.name,
          member_phone: member.phone,
          service_name: service.service_name,
          start_date: service.start_date,
          end_date: service.end_date,
          amount: service.amount,
          is_active: service.is_active,
          daysUntilExpiry,
          status,
        }
      })

      // Sort by status priority: expiring-soon > expired > active > inactive
      processedMembers.sort((a, b) => {
        const statusPriority = { 'expiring-soon': 0, 'expired': 1, 'active': 2, 'inactive': 3 }
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status]
        if (priorityDiff !== 0) return priorityDiff
        return a.daysUntilExpiry - b.daysUntilExpiry
      })

      setPtMembers(processedMembers)
      setFilteredMembers(processedMembers)
    } catch (error) {
      console.error('Error loading PT members:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: ptMembers.length,
    active: ptMembers.filter(m => m.status === 'active').length,
    expiringSoon: ptMembers.filter(m => m.status === 'expiring-soon').length,
    expired: ptMembers.filter(m => m.status === 'expired').length,
  }

  function getStatusBadge(member: PTMember) {
    const badges = {
      'active': {
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Active',
      },
      'expiring-soon': {
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertTriangle,
        text: `Expires in ${member.daysUntilExpiry} days`,
      },
      'expired': {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        text: 'Expired',
      },
      'inactive': {
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
        text: 'Inactive',
      },
    }

    const badge = badges[member.status]
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${badge.className}`}>
        <Icon className="h-4 w-4" />
        {badge.text}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Dumbbell className="h-8 w-8" style={{ color: primaryColor }} />
            <h1 className="text-3xl font-bold text-gray-900">PT Members</h1>
          </div>
          <p className="text-gray-600">Track and manage Personal Training memberships</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total PT Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Dumbbell className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="sm:w-64">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="expiring-soon">Expiring Soon (7 days)</option>
                  <option value="expired">Expired</option>
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
              <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No PT members found</p>
              <Link
                href="/members"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add PT service to a member →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-gray-50 ${
                        member.status === 'expiring-soon' ? 'bg-orange-50' :
                        member.status === 'expired' ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{member.member_name}</div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              {member.member_phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{member.service_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {member.start_date && (
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">Start:</span> {formatDate(member.start_date)}
                            </div>
                          )}
                          {member.end_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">End:</span> {formatDate(member.end_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(member.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(member)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Box */}
        {stats.expiringSoon > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Action Required: {stats.expiringSoon} PT {stats.expiringSoon === 1 ? 'membership' : 'memberships'} expiring soon
                </h3>
                <p className="mt-1 text-sm text-orange-700">
                  Contact these members to renew their Personal Training services and maintain revenue.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
