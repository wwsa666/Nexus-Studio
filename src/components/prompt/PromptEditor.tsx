import { useState } from 'react'
import { Check, Save, FolderHeart } from 'lucide-react'
import { useGenerationStore } from '../../stores/generationStore'
import { PromptPresetSaveDialog, PromptPresetManager } from './PromptPresetDialogs'
import { Button } from '../ui/Button'
import { PresetType } from '../../stores/promptPresetStore'
import { CharacterTag } from '../character/CharacterTag'

export function PromptEditor() {
    const { positivePrompt, negativePrompt, setPositivePrompt, setNegativePrompt, selectedCharacters } = useGenerationStore()
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' })

    // Preset Dialog States
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [showManagerDialog, setShowManagerDialog] = useState(false)
    const [activeType, setActiveType] = useState<PresetType>('positive')

    const openSave = (type: PresetType) => {
        setActiveType(type)
        setShowSaveDialog(true)
    }

    const openManager = (type: PresetType) => {
        setActiveType(type)
        setShowManagerDialog(true)
    }

    const handleCopyChar = async (char: string) => {
        try {
            await navigator.clipboard.writeText(char)
            setToast({ show: true, msg: '已复制' })
            setTimeout(() => setToast({ show: false, msg: '' }), 1500)
        } catch (e) {
            console.error(e)
        }
    }

    const handleRightClick = (e: React.MouseEvent<HTMLTextAreaElement>, content: string) => {
        e.preventDefault()
        e.stopPropagation()

        // 获取选中的文本
        const target = e.target as HTMLTextAreaElement
        const start = target.selectionStart
        const end = target.selectionEnd
        const selection = target.value.substring(start, end)

        // Only copy if user selected something
        if (selection) {
            navigator.clipboard.writeText(selection).then(() => {
                setToast({ show: true, msg: '已复制' })
                setTimeout(() => setToast({ show: false, msg: '' }), 1500)
            })
        }
    }

    return (
        <div className="relative">
            {/* Dialogs */}
            <PromptPresetSaveDialog
                open={showSaveDialog}
                onOpenChange={setShowSaveDialog}
                type={activeType}
            />
            <PromptPresetManager
                open={showManagerDialog}
                onOpenChange={setShowManagerDialog}
                type={activeType}
            />

            {/* Toast - Updated Style to match Canvas */}
            {toast.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 -ml-5 z-[200] bg-[#1e1e1e] text-white px-6 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-2xl border border-white/5 pointer-events-none">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="space-y-3">
                {/* 正向提示词 */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-text-muted">
                            Positive Prompt
                        </label>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1.5 text-text-muted hover:text-primary"
                                onClick={() => openSave('positive')}
                                title="保存当前正向提示词"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>保存预设</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1.5 text-text-muted hover:text-primary"
                                onClick={() => openManager('positive')}
                                title="管理正向提示词预设"
                            >
                                <FolderHeart className="w-3.5 h-3.5" />
                                <span>预设库</span>
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={positivePrompt}
                            onChange={(e) => setPositivePrompt(e.target.value)}
                            placeholder="masterpiece, best quality, 1girl..."
                            spellCheck={false}
                            className="w-full h-32 bg-app border border-success/30 rounded-xl px-4 py-3 text-sm text-text-main font-mono placeholder:text-text-dim focus:outline-none focus:border-success/60 resize-none selection:bg-success/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                            onContextMenu={(e) => handleRightClick(e, positivePrompt)}
                        />
                    </div>

                    {/* 已选角色标签 (可点击复制) */}
                    {selectedCharacters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCharacters.map(char => (
                                <CharacterTag
                                    key={char}
                                    char={char}
                                    onCopy={() => handleCopyChar(char)}
                                    onRemove={() => {
                                        useGenerationStore.getState().removeCharacter(char)
                                        setToast({ show: true, msg: '已移除' })
                                        setTimeout(() => setToast({ show: false, msg: '' }), 1500)
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 负向提示词 */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-text-muted">
                            Negative Prompt
                        </label>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1.5 text-text-muted hover:text-primary"
                                onClick={() => openSave('negative')}
                                title="保存当前负向提示词"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>保存预设</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1.5 text-text-muted hover:text-primary"
                                onClick={() => openManager('negative')}
                                title="管理负向提示词预设"
                            >
                                <FolderHeart className="w-3.5 h-3.5" />
                                <span>预设库</span>
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="lowres, bad anatomy..."
                            spellCheck={false}
                            className="w-full h-24 bg-app border border-error/30 rounded-xl px-4 py-3 text-sm text-text-main font-mono placeholder:text-text-dim focus:outline-none focus:border-error/60 resize-none selection:bg-error/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                            onContextMenu={(e) => handleRightClick(e, negativePrompt)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
