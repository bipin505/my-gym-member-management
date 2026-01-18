'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Users, AlertCircle, UserPlus, Dumbbell, Cake } from 'lucide-react'
import Link from 'next/link'
import { addDays, startOfMonth } from 'date-fns'

interface Stats {
  activeMembers: number
  renewalsDue: number
  membersWithPT: number
  newMembers: number
}

interface BirthdayMember {
  id: string
  name: string
  phone: string
}

interface PTMember {
  id: string
  name: string
  phone: string
  status: 'active' | 'inactive'
  startDate: string | null
  endDate: string | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    activeMembers: 0,
    renewalsDue: 0,
    membersWithPT: 0,
    newMembers: 0,
  })
  const [birthdayMembers, setBirthdayMembers] = useState<BirthdayMember[]>([])
  const [ptMembers, setPtMembers] = useState<PTMember[]>([])
  const [loading, setLoading] = useState(true)
  const { gymId, primaryColor } = useGymBranding()
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      if (!gymId) return

      try {
        // Active members
        const { count: activeCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('is_active', true)

        // Renewals due in next 7 days
        const today = new Date()
        const sevenDaysFromNow = addDays(today, 7).toISOString().split('T')[0]
        const todayStr = today.toISOString().split('T')[0]

        const { count: renewalsCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('is_active', true)
          .gte('end_date', todayStr)
          .lte('end_date', sevenDaysFromNow)

        // Members with active PT - get full details
        const { data: membersWithPT } = await supabase
          .from('member_services')
          .select('member_id, is_active, start_date, end_date, members!inner(id, name, phone)')
          .eq('service_type', 'pt')

        // Get unique PT members with their details
        const ptMemberMap = new Map<string, PTMember>()
        membersWithPT?.forEach(ms => {
          const member = ms.members as any
          if (member && !ptMemberMap.has(member.id)) {
            ptMemberMap.set(member.id, {
              id: member.id,
              name: member.name,
              phone: member.phone,
              status: ms.is_active ? 'active' : 'inactive',
              startDate: ms.start_date,
              endDate: ms.end_date
            })
          }
        })
        const ptMembersList = Array.from(ptMemberMap.values())
        const ptCount = ptMembersList.filter(m => m.status === 'active').length

        setPtMembers(ptMembersList)

        // New members this month
        const monthStart = startOfMonth(new Date()).toISOString().split('T')[0]
        const { count: newCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .gte('created_at', monthStart)

        // Today's birthdays
        const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        const { data: birthdayData } = await supabase
          .from('members')
          .select('id, name, phone, dob')
          .eq('gym_id', gymId)
          .eq('is_active', true)
          .not('dob', 'is', null)

        const birthdays = birthdayData?.filter(member => {
          if (!member.dob) return false
          const dobDate = new Date(member.dob)
          const dobMonthDay = `${String(dobDate.getMonth() + 1).padStart(2, '0')}-${String(dobDate.getDate()).padStart(2, '0')}`
          return dobMonthDay === todayMonthDay
        }) || []

        setBirthdayMembers(birthdays)

        setStats({
          activeMembers: activeCount || 0,
          renewalsDue: renewalsCount || 0,
          membersWithPT: ptCount,
          newMembers: newCount || 0,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [gymId, supabase])

  const statCards = [
    {
      title: 'Active Members',
      value: stats.activeMembers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Renewals Due',
      value: stats.renewalsDue,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: 'Members with PT',
      value: stats.membersWithPT,
      icon: Dumbbell,
      color: 'bg-green-500',
    },
    {
      title: 'New Members',
      value: stats.newMembers,
      icon: UserPlus,
      color: 'bg-purple-500',
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your gym overview.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => (
                <div key={stat.title} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Cake className="h-5 w-5 text-pink-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Today's Birthdays</h2>
                </div>
                {birthdayMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">No birthdays today</p>
                ) : (
                  <div className="space-y-3">
                    {birthdayMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.phone}</p>
                        </div>
                        <Cake className="h-5 w-5 text-pink-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-gray-900">PT Members ({ptMembers.length})</h2>
                  </div>
                  <Link
                    href="/pt-members"
                    className="text-sm font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    View All →
                  </Link>
                </div>
                {ptMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">No PT members</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {ptMembers.slice(0, 5).map((member) => {
                      // Calculate days until expiry
                      let daysUntilExpiry = 0
                      let expiryStatus: 'active' | 'expiring-soon' | 'expired' | 'inactive' = 'inactive'

                      if (member.endDate && member.status === 'active') {
                        const endDate = new Date(member.endDate)
                        const today = new Date()
                        daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                        if (daysUntilExpiry < 0) {
                          expiryStatus = 'expired'
                        } else if (daysUntilExpiry <= 7) {
                          expiryStatus = 'expiring-soon'
                        } else {
                          expiryStatus = 'active'
                        }
                      } else {
                        expiryStatus = member.status === 'active' ? 'active' : 'inactive'
                      }

                      return (
                        <div
                          key={member.id}
                          className={`p-3 rounded-lg border ${
                            expiryStatus === 'expired' ? 'bg-red-50 border-red-200' :
                            expiryStatus === 'expiring-soon' ? 'bg-orange-50 border-orange-200' :
                            expiryStatus === 'active' ? 'bg-green-50 border-green-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-600">{member.phone}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              expiryStatus === 'expired' ? 'bg-red-100 text-red-700' :
                              expiryStatus === 'expiring-soon' ? 'bg-orange-100 text-orange-700' :
                              expiryStatus === 'active' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {expiryStatus === 'expired' ? 'Expired' :
                               expiryStatus === 'expiring-soon' ? `${daysUntilExpiry}d left` :
                               expiryStatus === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            {member.startDate && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Start:</span>
                                <span>{new Date(member.startDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {member.endDate && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">End:</span>
                                <span>{new Date(member.endDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link
                    href="/members?action=add"
                    className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    style={{
                      borderColor: primaryColor + '20',
                    }}
                  >
                    <p className="font-medium text-gray-900">Add New Member</p>
                    <p className="text-sm text-gray-600">Register a new gym member</p>
                  </Link>
                  <Link
                    href="/invoices"
                    className="block px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">View Invoices</p>
                    <p className="text-sm text-gray-600">Check payment records</p>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
