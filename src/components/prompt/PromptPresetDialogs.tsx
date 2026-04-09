import { useState } from 'react'
import { Star, Trash2, Search } from 'lucide-react'
import { usePromptPresetStore, PromptPreset, PresetType } from '../../stores/promptPresetStore'
import { useGenerationStore } from '../../stores/generationStore'
import { cn } from '../../utils/cn'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ScrollArea } from '../ui/ScrollArea'

interface SaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: PresetType
}

export function PromptPresetSaveDialog({ open, onOpenChange, type }: SaveDialogProps) {
    const [name, setName] = useState('')
    const { positivePrompt, negativePrompt } = useGenerationStore()
    const addPreset = usePromptPresetStore(s => s.addPreset)

    const handleSave = () => {
        if (!name.trim()) return
        const content = type === 'positive' ? positivePrompt : negativePrompt
        addPreset(name, content, type)
        setName('')
        onOpenChange(false)
    }

    const typeLabel = type === 'positive' ? '正向' : '负向'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>保存{typeLabel}提示词预设</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Input
                            placeholder={`预设名称 (例如: ${type === 'positive' ? '赛博朋克' : '通用负面'})`}
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSave} disabled={!name.trim()}>保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface ManagerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: PresetType
}

export function PromptPresetManager({ open, onOpenChange, type }: ManagerProps) {
    const { presets, deletePreset, toggleFavorite } = usePromptPresetStore()
    const { setPositivePrompt, setNegativePrompt } = useGenerationStore()
    const [search, setSearch] = useState('')
    const [filterFav, setFilterFav] = useState(false)

    const filtered = presets
        .filter(p => p.type === type) // Filter by current type
        .filter(p => !filterFav || p.isFavorite)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
            return b.createdAt - a.createdAt
        })

    const handleLoad = (preset: PromptPreset) => {
        if (type === 'positive') {
            setPositivePrompt(preset.content)
        } else {
            setNegativePrompt(preset.content)
        }
        onOpenChange(false)
    }

    const typeLabel = type === 'positive' ? '正向' : '负向'
    const colorClass = type === 'positive' ? 'text-green-400' : 'text-red-400'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center justify-between">
                        <span>{typeLabel}提示词预设库</span>
                        <div className="flex items-center gap-2 pr-6">
                            <div className="relative w-48">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-dim" />
                                <Input
                                    className="pl-8 h-9 text-sm"
                                    placeholder="搜索..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button
                                variant={filterFav ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setFilterFav(!filterFav)}
                                className={cn(filterFav && "text-yellow-400")}
                                title="只看收藏"
                            >
                                <Star className={cn("h-4 w-4", filterFav && "fill-current")} />
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6">
                    <div className="space-y-2 py-4">
                        {filtered.length === 0 ? (
                            <div className="text-center text-text-dim py-10">
                                没有找到相关预设
                            </div>
                        ) : (
                            filtered.map(preset => (
                                <div key={preset.id} className="group flex items-start gap-3 p-3 rounded-lg border border-border-default bg-app hover:bg-emphasis/50 transition-colors">
                                    <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => handleLoad(preset)}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-text-main truncate">{preset.name}</span>
                                            {preset.isFavorite && <Star className="h-3 w-3 text-yellow-400 fill-current shrink-0" />}
                                        </div>
                                        <div className="text-xs text-text-muted font-mono opacity-80 line-clamp-2 break-all leading-relaxed mt-1">
                                            <span className={colorClass}>{preset.content}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-8 items-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(preset.id) }}
                                        >
                                            <Star className={cn("h-4 w-4", preset.isFavorite ? "text-yellow-400 fill-current" : "text-text-dim")} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:text-error"
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); deletePreset(preset.id) }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
