import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Character {
    key: string      // 中文名 (带作品)
    value: string    // 英文名
    source: string   // 作品名
    sourceEn?: string // 作品英文名
    imagePath?: string // 本地路径 (可选)
    isCustom?: boolean // 是否为自定义角色
}

export interface CharacterPrompt {
    id: string
    name: string
    prompt: string
    enabled: boolean
}

interface CharacterState {
    characters: Character[]
    favorites: string[]        // 收藏的角色 value 列表
    favoriteSources: string[]  // 收藏的作品列表
    searchQuery: string
    selectedSource: string     // 'all' 或具体作品名
    showOnlyFavorites: boolean

    // Custom Data
    addedCharacters: Character[]
    deletedCharacters: string[] // values of deleted characters
    boundLoras: Record<string, { name: string, weight: number }[]> // Character value to LoRA mapping
    characterPrompts: Record<string, CharacterPrompt[]> // Character value to array of Trigger Words mapping

    // Actions
    setCharacters: (chars: Character[]) => void
    setSearchQuery: (q: string) => void
    setSelectedSource: (s: string) => void
    toggleShowOnlyFavorites: () => void
    toggleFavorite: (charValue: string) => void
    toggleSourceFavorite: (source: string) => void

    // Custom Actions
    loadCustomLibrary: () => Promise<void>
    addCustomCharacter: (char: Character) => Promise<boolean>
    editCharacter: (oldValue: string, newChar: Character) => Promise<boolean>
    deleteCharacter: (charValue: string) => Promise<void>
    restoreCharacter: (charValue: string) => Promise<void>
    setBoundLoras: (charValue: string, loras: { name: string, weight: number }[]) => void
    setCharacterPrompts: (charValue: string, prompts: CharacterPrompt[]) => void

    // Computed
    getFilteredCharacters: () => Character[]
    getAllSources: () => { name: string; count: number }[]
}



export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            characters: [], // Base characters
            favorites: [],
            favoriteSources: [],
            searchQuery: '',
            selectedSource: 'all',
            showOnlyFavorites: false,
            addedCharacters: [],
            deletedCharacters: [],
            boundLoras: {},
            characterPrompts: {},

            setCharacters: (chars) => set({ characters: chars }),
            setSearchQuery: (q) => set({ searchQuery: q }),
            setSelectedSource: (s) => set({ selectedSource: s }),
            toggleShowOnlyFavorites: () => set(state => ({ showOnlyFavorites: !state.showOnlyFavorites })),

            toggleFavorite: (charValue) => set(state => {
                if (state.favorites.includes(charValue)) {
                    return { favorites: state.favorites.filter(v => v !== charValue) }
                }
                return { favorites: [...state.favorites, charValue] }
            }),

            toggleSourceFavorite: (source) => set(state => {
                if (state.favoriteSources.includes(source)) {
                    return { favoriteSources: state.favoriteSources.filter(s => s !== source) }
                }
                return { favoriteSources: [...state.favoriteSources, source] }
            }),

            loadCustomLibrary: async () => {
                try {
                    const data = await window.electronAPI.loadCustomCharacters()
                    if (data) {
                        set({
                            addedCharacters: data.added || [],
                            deletedCharacters: data.deleted || []
                        })
                    }
                } catch (e) {
                    console.error('Failed to load custom library', e)
                }
            },

            addCustomCharacter: async (char) => {
                const state = get()
                // Check duplicates (case-insensitive value check)
                const allChars = [...state.characters, ...state.addedCharacters]
                const exists = allChars.some(c => c.value.toLowerCase() === char.value.toLowerCase())

                if (exists) return false

                const newAdded = [...state.addedCharacters, char]
                set({ addedCharacters: newAdded })

                // Persist
                await window.electronAPI.saveCustomCharacters({
                    added: newAdded,
                    deleted: state.deletedCharacters
                })

                return true
            },

            editCharacter: async (oldValue, newChar) => {
                const state = get()

                // Check duplicates if ID changed
                if (oldValue !== newChar.value) {
                    const allChars = [...state.characters, ...state.addedCharacters]
                    const exists = allChars.some(c => c.value.toLowerCase() === newChar.value.toLowerCase())
                    if (exists) return false
                }

                let newAdded = [...state.addedCharacters]
                const newDeleted = [...state.deletedCharacters]

                const isCustomIndex = newAdded.findIndex(c => c.value === oldValue)

                if (isCustomIndex >= 0) {
                    // It was already a custom character, just update it
                    newAdded[isCustomIndex] = { ...newChar, isCustom: true }
                } else {
                    // It was a base character, "upgrade" it to custom by hiding the old and adding the new
                    if (!newDeleted.includes(oldValue)) {
                        newDeleted.push(oldValue)
                    }
                    newAdded.push({ ...newChar, isCustom: true })
                }

                // Prepare migration of relationship states if ID changed
                const updates: Partial<CharacterState> = {
                    addedCharacters: newAdded,
                    deletedCharacters: newDeleted
                }

                if (oldValue !== newChar.value) {
                    // Migrate Favorites
                    if (state.favorites.includes(oldValue)) {
                        updates.favorites = [...state.favorites.filter(id => id !== oldValue), newChar.value]
                    }

                    // Migrate Bound LoRAs
                    if (state.boundLoras[oldValue]) {
                        const newBounds = { ...state.boundLoras }
                        newBounds[newChar.value] = newBounds[oldValue]
                        delete newBounds[oldValue]
                        updates.boundLoras = newBounds
                    }

                    // Migrate Character Prompts
                    if (state.characterPrompts[oldValue]) {
                        const newPrompts = { ...state.characterPrompts }
                        newPrompts[newChar.value] = newPrompts[oldValue]
                        delete newPrompts[oldValue]
                        updates.characterPrompts = newPrompts
                    }
                }

                set(updates)

                // Persist
                await window.electronAPI.saveCustomCharacters({
                    added: newAdded,
                    deleted: newDeleted
                })

                return true
            },

            deleteCharacter: async (charValue) => {
                const state = get()

                // If it's in added list, remove from there
                if (state.addedCharacters.some(c => c.value === charValue)) {
                    const deletedChar = state.addedCharacters.find(c => c.value === charValue)
                    const newAdded = state.addedCharacters.filter(c => c.value !== charValue)
                    set({ addedCharacters: newAdded })

                    await window.electronAPI.saveCustomCharacters({
                        added: newAdded,
                        deleted: state.deletedCharacters
                    })

                    // Physically delete the local image file
                    if (deletedChar?.imagePath) {
                        try {
                            await window.electronAPI.deleteCharacterImage(deletedChar.imagePath)
                        } catch (e) {
                            console.error('Failed to delete character image file', e)
                        }
                    }
                    return
                }

                // If it's in base list, add to deleted list
                if (!state.deletedCharacters.includes(charValue)) {
                    const newDeleted = [...state.deletedCharacters, charValue]
                    set({ deletedCharacters: newDeleted })
                    await window.electronAPI.saveCustomCharacters({
                        added: state.addedCharacters,
                        deleted: newDeleted
                    })
                }
            },

            restoreCharacter: async (charValue) => {
                const state = get()
                if (state.deletedCharacters.includes(charValue)) {
                    const newDeleted = state.deletedCharacters.filter(v => v !== charValue)
                    set({ deletedCharacters: newDeleted })
                    await window.electronAPI.saveCustomCharacters({
                        added: state.addedCharacters,
                        deleted: newDeleted
                    })
                }
            },

            setBoundLoras: (charValue, loras) => set(state => {
                const newBounds = { ...state.boundLoras }
                if (loras.length === 0) {
                    delete newBounds[charValue]
                } else {
                    newBounds[charValue] = loras
                }
                return { boundLoras: newBounds }
            }),

            setCharacterPrompts: (charValue, prompts) => set(state => ({
                characterPrompts: {
                    ...state.characterPrompts,
                    [charValue]: prompts
                }
            })),

            getFilteredCharacters: () => {
                const { characters, addedCharacters, deletedCharacters, searchQuery, selectedSource, showOnlyFavorites, favorites } = get()

                // Merge: Base + Added - Deleted
                const activeCharacters = [...characters, ...addedCharacters].filter(c => !deletedCharacters.includes(c.value))

                return activeCharacters.filter(char => {
                    // 作品筛选
                    if (selectedSource !== 'all' && char.source !== selectedSource) return false

                    // 收藏筛选
                    if (showOnlyFavorites && !favorites.includes(char.value)) return false

                    // 搜索筛选
                    if (searchQuery) {
                        const q = searchQuery.toLowerCase()
                        return char.key.toLowerCase().includes(q) ||
                            char.value.toLowerCase().includes(q)
                    }

                    return true
                }).sort((a, b) => {
                    // 收藏的排在前面
                    const aFav = favorites.includes(a.value)
                    const bFav = favorites.includes(b.value)
                    if (aFav !== bFav) return bFav ? 1 : -1
                    return a.key.localeCompare(b.key)
                })
            },

            getAllSources: () => {
                const { characters, addedCharacters, deletedCharacters, favoriteSources } = get()
                const sourceMap = new Map<string, { name: string, count: number }>()

                // Merge for sources
                const activeCharacters = [...characters, ...addedCharacters].filter(c => !deletedCharacters.includes(c.value))

                activeCharacters.forEach(char => {
                    if (!char.source) return
                    const normalized = char.source.trim().toLowerCase()
                    const existing = sourceMap.get(normalized)

                    if (existing) {
                        existing.count += 1
                    } else {
                        // Use the original casing of the first encountered source as the display name
                        sourceMap.set(normalized, { name: char.source.trim(), count: 1 })
                    }
                })

                return Array.from(sourceMap.values())
                    .sort((a, b) => {
                        // 收藏的作品排前面
                        const aFav = favoriteSources.includes(a.name)
                        const bFav = favoriteSources.includes(b.name)
                        if (aFav !== bFav) return bFav ? 1 : -1
                        // 然后按数量排序
                        return b.count - a.count
                    })
            }
        }),
        {
            name: 'nexus-studio-characters',
            partialize: (state) => ({
                favorites: state.favorites,
                favoriteSources: state.favoriteSources,
                boundLoras: state.boundLoras,
                characterPrompts: state.characterPrompts
            })
        }
    )
)
