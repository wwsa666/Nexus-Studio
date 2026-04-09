import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PresetType = 'positive' | 'negative'

export interface PromptPreset {
    id: string
    name: string
    content: string
    type: PresetType
    isFavorite: boolean
    createdAt: number
}

interface PromptPresetState {
    presets: PromptPreset[]

    // Actions
    addPreset: (name: string, content: string, type: PresetType) => void
    deletePreset: (id: string) => void
    updatePreset: (id: string, updates: Partial<PromptPreset>) => void
    toggleFavorite: (id: string) => void
}

export const usePromptPresetStore = create<PromptPresetState>()(
    persist(
        (set) => ({
            presets: [],

            addPreset: (name, content, type) => set((state) => ({
                presets: [
                    {
                        id: crypto.randomUUID(),
                        name,
                        content,
                        type,
                        isFavorite: false,
                        createdAt: Date.now()
                    },
                    ...state.presets
                ]
            })),

            deletePreset: (id) => set((state) => ({
                presets: state.presets.filter((p) => p.id !== id)
            })),

            updatePreset: (id, updates) => set((state) => ({
                presets: state.presets.map((p) =>
                    p.id === id ? { ...p, ...updates } : p
                )
            })),

            toggleFavorite: (id) => set((state) => ({
                presets: state.presets.map((p) =>
                    p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
                )
            }))
        }),
        {
            name: 'nexus-studio-prompt-presets-v2', // Changed name to reset storage for new schema
            version: 1
        }
    )
)
