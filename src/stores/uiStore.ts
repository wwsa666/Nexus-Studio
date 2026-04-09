import { create } from 'zustand'

interface UIState {
    // Scroll positions map: key -> scrollTop
    scrollPositions: Record<string, number>
    saveScrollPosition: (key: string, value: number) => void
    getScrollPosition: (key: string) => number
}

export const useUIStore = create<UIState>((set, get) => ({
    scrollPositions: {},
    saveScrollPosition: (key, value) => set(state => ({
        scrollPositions: {
            ...state.scrollPositions,
            [key]: value
        }
    })),
    getScrollPosition: (key) => get().scrollPositions[key] || 0
}))
