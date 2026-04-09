import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Search, Link as LinkIcon, Unlink, Loader2, RefreshCw, X } from 'lucide-react'
import { Character } from '../../data/characters'
import { useCharacterStore, CharacterPrompt } from '../../stores/characterStore'
import { useGenerationStore } from '../../stores/generationStore'
import { comfyuiService } from '../../services/comfyui'

interface BindLoraDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    character: Character | null
}

export function BindLoraDialog({ open, onOpenChange, character }: BindLoraDialogProps) {
    const { boundLoras, setBoundLoras, characterPrompts, setCharacterPrompts } = useCharacterStore()

    const [availableLoras, setAvailableLoras] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // 当前弹窗内的编辑状态
    const [selectedLoras, setSelectedLoras] = useState<{ name: string, weight: number }[]>([])

    // 提示词相关状态
    const [selectedPrompts, setSelectedPrompts] = useState<CharacterPrompt[]>([])
    const [editingPrompt, setEditingPrompt] = useState<CharacterPrompt | null>(null)

    const { addCharacter, removeCharacter } = useGenerationStore()
    const wasSelectedRef = useRef(false)

    // 缓存上一个 character 以支持对话框关闭动画
    const prevCharacterRef = useRef<Character | null>(null)
    useEffect(() => {
        if (character) {
            prevCharacterRef.current = character
        }
    }, [character])
    const displayCharacter = character || prevCharacterRef.current

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && displayCharacter && wasSelectedRef.current) {
            // Restore selection if it was selected before managing
            const currentSelected = useGenerationStore.getState().selectedCharacters
            if (!currentSelected.includes(displayCharacter.value)) {
                addCharacter(displayCharacter.value)
            }
            wasSelectedRef.current = false
        }
        onOpenChange(newOpen)
    }

    // 每次打开时初始化状态
    useEffect(() => {
        if (open && character) {
            let currentBindings = boundLoras[character.value]
            // 向后兼容处理（单对象转数组）
            if (currentBindings && !Array.isArray(currentBindings)) {
                currentBindings = [currentBindings] as any
            }

            if (currentBindings && currentBindings.length > 0) {
                setSelectedLoras([...currentBindings])
            } else {
                setSelectedLoras([])
            }

            const currentPrompts = characterPrompts[character.value]
            if (currentPrompts) {
                // 向后兼容处理（单对象转数组）
                const promptList = Array.isArray(currentPrompts) ? currentPrompts : [currentPrompts as any]

                const validPrompts = promptList.filter(p => p.prompt && p.prompt.trim() !== '')

                setSelectedPrompts(validPrompts.map((p, idx) => ({
                    id: p.id || String(Date.now() + idx),
                    name: p.name || `提示词 ${idx + 1}`,
                    prompt: p.prompt || '',
                    enabled: p.enabled ?? false
                })))
            } else {
                setSelectedPrompts([])
            }

            // Clear any lingering edit state to prevent cross-character leaking
            setEditingPrompt(null)

            const currentSelected = useGenerationStore.getState().selectedCharacters
            if (currentSelected.includes(character.value)) {
                wasSelectedRef.current = true
                removeCharacter(character.value)
            } else {
                wasSelectedRef.current = false
            }

            loadLoras()
        }
    }, [open, character, boundLoras, characterPrompts])

    const loadLoras = async () => {
        if (availableLoras.length === 0) {
            setIsLoading(true)
        }
        const loras = await comfyuiService.getLoras()
        setAvailableLoras(loras)
        setIsLoading(false)
    }

    const filteredLoras = useMemo(() => {
        if (!searchQuery) return availableLoras
        return availableLoras.filter(lora =>
            lora.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [availableLoras, searchQuery])

    const handleSave = () => {
        if (!character) return
        setBoundLoras(character.value, selectedLoras)
        setCharacterPrompts(character.value, selectedPrompts)
        handleOpenChange(false)
    }

    const handleUnbind = () => {
        if (!character) return
        setBoundLoras(character.value, [])
        setSelectedLoras([])
        setSelectedPrompts([])
        handleOpenChange(false)
    }

    if (!displayCharacter) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-panel border-border-default max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <LinkIcon className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-lg">专属属性配置</DialogTitle>
                    </div>
                    <div className="text-sm text-text-dim mt-2">
                        为角色 <span className="text-primary font-bold">{displayCharacter.key}</span> 设置绑定的提示词或 LoRA。选中该角色时系统将自动应用这些设置。
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Trigger Words Section */}
                    <div className="bg-elevated p-3 rounded-lg border border-border-default space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text-main">专属提示词 (Trigger Words)</span>
                            <span className="text-xs text-text-muted">左键编辑 · 右键开关</span>
                        </div>

                        {editingPrompt ? (
                            <div className="bg-app border border-primary/50 rounded-md p-3 space-y-3 shadow-sm">
                                <input
                                    type="text"
                                    value={editingPrompt.name}
                                    onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                                    placeholder="标签名称 (例如: Default Outfit)"
                                    className="w-full bg-transparent border-b border-border-subtle pb-1 text-sm focus:outline-none focus:border-primary text-text-main"
                                />
                                <textarea
                                    value={editingPrompt.prompt}
                                    onChange={e => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })}
                                    placeholder="在这里输入角色的触发词片段..."
                                    className="w-full h-16 bg-transparent border-none text-sm focus:outline-none text-text-main resize-none"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(null)}>取消</Button>
                                    <Button size="sm" className="bg-primary text-white" onClick={() => {
                                        const finalPrompt = editingPrompt.prompt.trim()
                                        if (!finalPrompt) return // 如果啥也没写就不保存

                                        let finalName = editingPrompt.name.trim()
                                        if (!finalName) {
                                            // 自动从提示词里截取一段作为名字
                                            finalName = finalPrompt.slice(0, 10) + (finalPrompt.length > 10 ? '...' : '')
                                        }

                                        setSelectedPrompts(prev => {
                                            const updatedPrompt = { ...editingPrompt, name: finalName, prompt: finalPrompt }
                                            const idx = prev.findIndex(p => p.id === editingPrompt.id)
                                            if (idx >= 0) {
                                                const next = [...prev]
                                                next[idx] = updatedPrompt
                                                return next
                                            }
                                            return [...prev, updatedPrompt]
                                        })
                                        setEditingPrompt(null)
                                    }}>确认</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {selectedPrompts.map(prompt => (
                                    <div
                                        key={prompt.id}
                                        onContextMenu={(e) => {
                                            e.preventDefault()
                                            setSelectedPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, enabled: !p.enabled } : p))
                                        }}
                                        onClick={() => setEditingPrompt({ ...prompt })}
                                        className={`group relative flex justify-between items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors border select-none min-w-0 ${prompt.enabled ? 'bg-primary/20 text-primary border-primary/40 hover:bg-primary/30' : 'bg-surface-elevated text-text-muted border-border-default hover:border-border-muted'}`}
                                        title={prompt.prompt}
                                    >
                                        <span className="truncate flex-1">{prompt.name}</span>
                                        <div
                                            className="w-4 h-4 ml-1 rounded-full flex items-center justify-center hover:bg-black/20 text-text-dim hover:text-error transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedPrompts(prev => prev.filter(p => p.id !== prompt.id))
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEditingPrompt({ id: Date.now().toString(), name: '', prompt: '', enabled: false })}
                                    className="flex justify-center items-center w-8 h-7 rounded-full border border-dashed border-border-subtle text-text-muted hover:text-primary hover:border-primary transition-colors"
                                    title="添加提示词"
                                >
                                    <span className="text-lg leading-none mb-0.5">+</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Weight Adjustment & Selected LoRAs */}
                    {selectedLoras.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-text-main">已添加的 LoRA ({selectedLoras.length})</div>
                            {selectedLoras.map((sl, index) => (
                                <div key={sl.name} className="bg-elevated p-3 rounded-lg border border-primary/30 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-medium text-text-main truncate text-primary" title={sl.name}>{sl.name}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-text-muted w-10 text-right">{sl.weight.toFixed(2)}</span>
                                            <button
                                                onClick={() => setSelectedLoras(prev => prev.filter((_, i) => i !== index))}
                                                className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.05"
                                        value={sl.weight}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value)
                                            setSelectedLoras(prev => {
                                                const next = [...prev]
                                                next[index].weight = val
                                                return next
                                            })
                                        }}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Lora Selection List */}
                    <div className="space-y-2 flex-1 min-h-[200px] border border-border-default rounded-lg bg-black/20 flex flex-col">
                        <div className="p-2 border-b border-border-subtle flex gap-2 items-center bg-app rounded-t-lg">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="搜索可以绑定的 LoRA..."
                                    className="w-full bg-transparent border-none pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-0 text-text-main placeholder:text-text-dim"
                                />
                            </div>
                            <button
                                onClick={loadLoras}
                                disabled={isLoading}
                                className="p-1.5 text-text-dim hover:text-text-main hover:bg-elevated rounded transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="p-8 flex justify-center items-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-text-dim" />
                                </div>
                            ) : filteredLoras.length === 0 ? (
                                <div className="p-8 text-center text-text-muted text-sm">
                                    没有找到对应的 LoRA
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredLoras.slice(0, 100).map(lora => {
                                        const isSelected = selectedLoras.some(sl => sl.name === lora)
                                        return (
                                            <button
                                                key={lora}
                                                onClick={() => {
                                                    if (!isSelected) {
                                                        setSelectedLoras(prev => [...prev, { name: lora, weight: 1.0 }])
                                                    } else {
                                                        setSelectedLoras(prev => prev.filter(sl => sl.name !== lora))
                                                    }
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors truncate cursor-pointer ${isSelected
                                                    ? 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
                                                    : 'text-text-main hover:bg-elevated'
                                                    }`}
                                                title={lora}
                                            >
                                                {lora}
                                            </button>
                                        )
                                    })}
                                    {filteredLoras.length > 100 && (
                                        <div className="text-center text-xs text-text-dim py-3">
                                            仅显示前 100 项，请使用搜索查找更多
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0 pt-4 border-t border-border-subtle flex justify-between">
                    <Button
                        variant="ghost"
                        className="text-error hover:bg-error/10 hover:text-error"
                        onClick={handleUnbind}
                        disabled={!boundLoras[displayCharacter.value]}
                    >
                        <Unlink className="w-4 h-4 mr-2" />
                        解除绑定
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white"
                            onClick={handleSave}
                        >
                            保存配置
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
