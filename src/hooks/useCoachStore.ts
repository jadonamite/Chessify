'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CoachStore {
  coachId: string | null
  setCoachId: (id: string | null) => void
}

const createCoachStore = () => {
  return persist(
    (set) => ({
      coachId: null,
      setCoachId: (id) => set({ coachId: id }),
    }),
    { name: 'chessify-coach' },
  )
}

export const useCoachStore = create<CoachStore>(createCoachStore)
