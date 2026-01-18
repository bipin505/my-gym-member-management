'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/utils/supabase/client'
import { useGymBranding } from '@/hooks/useGymBranding'
import { Upload, Save } from 'lucide-react'
import Image from 'next/image'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { gymId, logoUrl, setGymBranding } = useGymBranding()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gstNumber: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
  })

  useEffect(() => {
    async function loadGymData() {
      if (!gymId) return

      const { data: gym } = await supabase
        .from('gyms')
        .select('name, phone, address, gst_number, primary_color, secondary_color')
        .eq('id', gymId)
        .single()

      if (gym) {
        setFormData({
          name: gym.name || '',
          phone: gym.phone || '',
          address: gym.address || '',
          gstNumber: gym.gst_number || '',
          primaryColor: gym.primary_color || '#3B82F6',
          secondaryColor: gym.secondary_color || '#1E40AF',
        })
      }
    }

    loadGymData()
  }, [gymId, supabase])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !gymId) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/logo.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('gym-logos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gym-logos')
        .getPublicUrl(fileName)

      // Update gym record
      const { error: updateError } = await supabase
        .from('gyms')
        .update({ logo_url: publicUrl })
        .eq('id', gymId)

      if (updateError) throw updateError

      setGymBranding({ logoUrl: publicUrl })
      alert('Logo uploaded successfully!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gymId) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          gst_number: formData.gstNumber || null,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
        })
        .eq('id', gymId)

      if (error) throw error

      setGymBranding({
        name: formData.name,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      })

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your gym profile and branding</p>
        </div>

        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Gym Logo</h2>

            <div className="flex items-center gap-6">
              {logoUrl ? (
                <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={logoUrl}
                    alt="Gym logo"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div>
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Gym Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gym Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                    if (value.length <= 10) {
                      setFormData({ ...formData, phone: value })
                    }
                  }}
                  placeholder="e.g., 9876543210"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-sm text-gray-500 mt-1">
                  10-digit contact number (shown on invoices)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., 123 Main Street, City, State - 123456"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Address will be shown on all invoices
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="e.g., 27XXXXX1234X1Z5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-sm text-gray-500 mt-1">
                  GST number will be shown on all invoices
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Used for buttons, links, and highlights
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="#1E40AF"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Used for accents and secondary elements
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="border-2 border-gray-200 rounded-lg p-6">
              <div
                className="px-6 py-3 rounded-lg text-white font-medium inline-block mb-4"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Sample Button
              </div>
              <div
                className="px-6 py-3 rounded-lg text-white font-medium inline-block ml-4"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                Secondary Button
              </div>
              <p className="text-gray-600 mt-4">
                This is how your brand colors will appear in the application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
