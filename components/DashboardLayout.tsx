'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { useRouter } from 'next/navigation'
import { Menu, Dumbbell } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()
  const { setGymBranding, name, primaryColor } = useGymBranding()
  const router = useRouter()

  useEffect(() => {
    async function loadGymData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: gym } = await supabase
          .from('gyms')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (gym) {
          setGymBranding({
            gymId: gym.id,
            name: gym.name,
            logoUrl: gym.logo_url,
            primaryColor: gym.primary_color,
            secondaryColor: gym.secondary_color,
          })
        }
      } catch (error) {
        console.error('Error loading gym data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGymData()
  }, [supabase, setGymBranding, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: primaryColor || '#3B82F6' }}>
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">{name || 'Gym'}</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide in from left */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
