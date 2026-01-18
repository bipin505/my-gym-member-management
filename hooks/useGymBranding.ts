import { create } from 'zustand'

interface GymBranding {
  gymId: string | null
  name: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  setGymBranding: (branding: Partial<GymBranding>) => void
  clearBranding: () => void
}

export const useGymBranding = create<GymBranding>((set) => ({
  gymId: null,
  name: '',
  logoUrl: null,
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  setGymBranding: (branding) => set((state) => ({ ...state, ...branding })),
  clearBranding: () => set({
    gymId: null,
    name: '',
    logoUrl: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
  }),
}))
