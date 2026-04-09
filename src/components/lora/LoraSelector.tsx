import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, X, ChevronDown, RefreshCw } from 'lucide-react'
import { comfyuiService } from '../../services/comfyui'
import { useConnectionStore } from '../../stores/connectionStore'
import { useGenerationStore } from '../../stores/generationStore'

export function LoraSelector() {
    const { isConnected } = useConnectionStore()
    const { loras: selectedLoras, addLora: storeAddLora, removeLora, updateLoraWeight } = useGenerationStore()

    const [availableLoras, setAvailableLoras] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // 加载 LoRA 列表
    useEffect(() => {
        if (isConnected) {
            loadLoras()
        }
    }, [isConnected])

    const loadLoras = async () => {
        setIsLoading(true)
        const loras = await comfyuiService.getLoras()
        setAvailableLoras(loras)
        setIsLoading(false)
    }

    // 过滤 LoRA
    const filteredLoras = useMemo(() => {
        if (!searchQuery) return availableLoras
        return availableLoras.filter(lora =>
            lora.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [availableLoras, searchQuery])

    // 添加 LoRA
    const addLora = (loraName: string) => {
        storeAddLora(loraName)
        setShowDropdown(false)
        setSearchQuery('')
    }

    // 更新权重
    const updateWeight = (loraName: string, weight: number) => {
        updateLoraWeight(loraName, weight)
    }

    return (
        <div className="h-full flex flex-col">
            {/* 搜索和添加 */}
            <div className="p-3 space-y-2">
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-app border border-border-default rounded-lg text-sm text-text-muted hover:border-primary transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            添加 LoRA
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* LoRA 下拉列表 */}
                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border-default rounded-lg shadow-xl z-20 max-h-64 overflow-hidden">
                            <div className="p-2 border-b border-border-subtle flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="搜索 LoRA..."
                                        className="w-full bg-app border border-border-default rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); loadLoras(); }}
                                    disabled={isLoading}
                                    title="刷新 LoRA 列表"
                                    className="p-1.5 text-text-dim hover:text-text-main hover:bg-elevated rounded transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-4 text-center text-text-muted text-sm">
                                        加载中...
                                    </div>
                                ) : filteredLoras.length === 0 ? (
                                    <div className="p-4 text-center text-text-muted text-sm">
                                        {isConnected ? '暂无可用 LoRA' : '请先连接 ComfyUI'}
                                    </div>
                                ) : (
                                    filteredLoras.map(lora => (
                                        <button
                                            key={lora}
                                            onClick={() => addLora(lora)}
                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-elevated transition-colors ${selectedLoras.find(l => l.name === lora) ? 'text-primary' : 'text-text-main'
                                                }`}
                                            title={lora}
                                        >
                                            {lora}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 已选择的 LoRA 列表 */}
            <div className="flex-1 overflow-y-auto px-3">
                {selectedLoras.length === 0 ? (
                    <div className="text-center text-text-muted text-sm py-8">
                        <p>暂未选择 LoRA</p>
                        <p className="text-xs text-text-dim mt-1">点击上方按钮添加</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {selectedLoras.map(lora => (
                            <div
                                key={lora.name}
                                className="bg-elevated rounded-lg p-3 space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className="text-sm text-text-main truncate flex-1"
                                        title={lora.name}
                                    >
                                        {lora.name}
                                    </span>
                                    <button
                                        onClick={() => removeLora(lora.name)}
                                        className="p-1 text-text-dim hover:text-error transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* 权重滑块 */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.05"
                                        value={lora.weight}
                                        onChange={(e) => updateWeight(lora.name, parseFloat(e.target.value))}
                                        className="flex-1 h-1 bg-app rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                    />
                                    <span className="text-xs text-text-muted w-10 text-right font-mono">
                                        {lora.weight.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 底部统计 */}
            <div className="p-2 border-t border-border-subtle text-xs text-text-dim text-center">
                {selectedLoras.length} 个 LoRA 已选择
            </div>
        </div>
    )
}
