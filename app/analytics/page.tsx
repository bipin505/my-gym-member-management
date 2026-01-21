'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { formatCurrency } from '@/utils/date'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

interface MonthlyData {
  month: string
  revenue: number
  members: number
}

export default function AnalyticsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    averageRevenue: 0,
    totalMembers: 0,
    retentionRate: 0,
  })
  const { gymId, primaryColor } = useGymBranding()
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [gymId])

  async function loadAnalytics() {
    if (!gymId) return

    try {
      const data: MonthlyData[] = []
      let totalRevenue = 0

      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i)
        const monthStart = startOfMonth(date).toISOString()
        const monthEnd = endOfMonth(date).toISOString()

        // Revenue for the month
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount')
          .eq('gym_id', gymId)
          .gte('date', monthStart.split('T')[0])
          .lte('date', monthEnd.split('T')[0])

        const revenue = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0
        totalRevenue += revenue

        // New members for the month
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd)

        data.push({
          month: format(date, 'MMM yyyy'),
          revenue,
          members: count || 0,
        })
      }

      setMonthlyData(data)

      // Calculate overall stats
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)

      const { count: activeMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('is_active', true)

      const retentionRate = totalMembers ? ((activeMembers || 0) / totalMembers) * 100 : 0

      setStats({
        totalRevenue,
        averageRevenue: data.length > 0 ? totalRevenue / data.length : 0,
        totalMembers: totalMembers || 0,
        retentionRate,
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Track your gym's performance and trends</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <p className="text-sm text-gray-600 mb-1">Total Revenue (6 months)</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <p className="text-sm text-gray-600 mb-1">Average Monthly Revenue</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(stats.averageRevenue)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <p className="text-sm text-gray-600 mb-1">Total Members</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <p className="text-sm text-gray-600 mb-1">Retention Rate</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.retentionRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Bar dataKey="revenue" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Members Chart */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">New Members Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Line type="monotone" dataKey="members" stroke={primaryColor} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
