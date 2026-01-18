'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { setGymBranding } = useGymBranding()
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
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
