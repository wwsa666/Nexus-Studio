import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react'
import { PromptEditor } from '../prompt/PromptEditor'
import { useGenerationStore } from '../../stores/generationStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { Select } from '../ui/Select'
import { useScrollSave } from '../../hooks/useScrollSave'

export function ControlPanel() {
    // Scroll Persistence
    const { ref: scrollRef, handleScroll } = useScrollSave<HTMLDivElement>('control-panel-scroll')

    const [expandedSections, setExpandedSections] = useState({
        model: true,
        basic: true,
        generation: true,
        advanced: false
    })
    const [isRefreshing, setIsRefreshing] = useState(false)

    const { isConnected } = useConnectionStore()
    const {
        width, height, steps, cfg, seed, batchSize,
        setWidth, setHeight, setSteps, setCfg, setSeed, setBatchSize,
        checkpoint, setCheckpoint, availableCheckpoints,
        sampler, setSampler, availableSamplers,
        scheduler, setScheduler, availableSchedulers,
        queue,
        isGenerating, startGeneration,
        loadAvailableOptions,
        // 工作流类型
        workflowType, setWorkflowType,
        // zimage 专用
        unetName, clipName, vaeName,
        setUnetName, setClipName, setVaeName,
        availableUnets, availableClips, availableVaes
    } = useGenerationStore()

    const totalJobs = queue.length + (isGenerating ? 1 : 0)

    // 连接成功后加载可用选项
    useEffect(() => {
        if (isConnected) {
            loadAvailableOptions()
        }
    }, [isConnected])

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const handleRefreshModels = async (e: React.MouseEvent) => {
        e.stopPropagation() // 防止触发折叠
        if (!isConnected) return
        setIsRefreshing(true)
        await loadAvailableOptions()
        setIsRefreshing(false)
    }

    return (
        <aside className="w-[320px] bg-panel border-l border-border-subtle flex flex-col">
            {/* 滚动区域 */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {/* 提示词编辑器 */}
                <PromptEditor />

                {/* 模型选择 */}
                <AccordionSection
                    title={
                        <div className="flex items-center justify-between w-full pr-2">
                            <span>模型设置</span>
                            <button
                                onClick={handleRefreshModels}
                                disabled={!isConnected || isRefreshing}
                                className="p-1 text-text-dim hover:text-text-main hover:bg-app rounded transition-colors disabled:opacity-50"
                                title="刷新模型列表"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    }
                    expanded={expandedSections.model}
                    onToggle={() => toggleSection('model')}
                >
                    <div className="space-y-3">
                        {/* 工作流选择器 */}
                        <Select
                            label="Workflow"
                            value={workflowType}
                            onChange={(v) => setWorkflowType(v as 'standard' | 'zimage')}
                            options={['standard', 'zimage']}
                            placeholder="Select Workflow..."
                            scrollKey="workflow-select"
                        />

                        {/* 根据工作流类型显示不同的模型选择器 */}
                        {workflowType === 'standard' ? (
                            <>
                                {/* Checkpoint 模型选择 */}
                                <Select
                                    label="Checkpoint"
                                    value={checkpoint}
                                    onChange={setCheckpoint}
                                    options={availableCheckpoints}
                                    placeholder={isConnected ? "选择模型..." : "未连接"}
                                    disabled={!isConnected && availableCheckpoints.length === 0}
                                    scrollKey="checkpoint-select"
                                />
                            </>
                        ) : (
                            <>
                                {/* zimage 工作流: UNET/CLIP/VAE */}
                                <Select
                                    label="UNET"
                                    value={unetName}
                                    onChange={setUnetName}
                                    options={availableUnets}
                                    placeholder={isConnected ? "选择 UNET..." : "未连接"}
                                    disabled={!isConnected && availableUnets.length === 0}
                                    scrollKey="unet-select"
                                />
                                <Select
                                    label="CLIP"
                                    value={clipName}
                                    onChange={setClipName}
                                    options={availableClips}
                                    placeholder={isConnected ? "选择 CLIP..." : "未连接"}
                                    disabled={!isConnected && availableClips.length === 0}
                                    scrollKey="clip-select"
                                />
                                <Select
                                    label="VAE"
                                    value={vaeName}
                                    onChange={setVaeName}
                                    options={availableVaes}
                                    placeholder={isConnected ? "选择 VAE..." : "未连接"}
                                    disabled={!isConnected && availableVaes.length === 0}
                                    scrollKey="vae-select"
                                />
                            </>
                        )}

                        {/* 采样器 */}
                        <Select
                            label="Sampler"
                            value={sampler}
                            onChange={setSampler}
                            options={availableSamplers}
                            scrollKey="sampler-select"
                        />
                        {/* 调度器 */}
                        <Select
                            label="Scheduler"
                            value={scheduler}
                            onChange={setScheduler}
                            options={availableSchedulers}
                            scrollKey="scheduler-select"
                        />
                    </div>
                </AccordionSection>

                {/* 基础设置 */}
                <AccordionSection
                    title="基础设置"
                    expanded={expandedSections.basic}
                    onToggle={() => toggleSection('basic')}
                >
                    <div className="space-y-4">
                        {/* 宽度 */}
                        <SliderInput
                            label="Width"
                            value={width}
                            onChange={setWidth}
                            min={256} max={2048} step={64}
                            defaultValue={512}
                        />
                        {/* 高度 */}
                        <SliderInput
                            label="Height"
                            value={height}
                            onChange={setHeight}
                            min={256} max={2048} step={64}
                            defaultValue={768}
                        />
                    </div>
                </AccordionSection>

                {/* 生成参数 */}
                <AccordionSection
                    title="生成参数"
                    expanded={expandedSections.generation}
                    onToggle={() => toggleSection('generation')}
                >
                    <div className="space-y-4">
                        {/* Steps */}
                        <SliderInput
                            label="Steps"
                            value={steps}
                            onChange={setSteps}
                            min={1} max={100} step={1}
                            defaultValue={20}
                        />
                        {/* Batch Size */}
                        <SliderInput
                            label="Batch Size"
                            value={batchSize}
                            onChange={setBatchSize}
                            min={1} max={8} step={1}
                            defaultValue={1}
                        />
                        {/* CFG */}
                        <SliderInput
                            label="CFG Scale"
                            value={cfg}
                            onChange={setCfg}
                            min={1} max={20} step={0.5}
                            defaultValue={7}
                        />
                    </div>
                </AccordionSection>

                {/* 高级设置 */}
                <AccordionSection
                    title="高级设置"
                    expanded={expandedSections.advanced}
                    onToggle={() => toggleSection('advanced')}
                >
                    <div className="space-y-4">
                        {/* Seed */}
                        <div>
                            <label className="flex justify-between mb-2">
                                <span className="text-sm text-text-muted">Seed</span>
                                <span className="text-sm text-text-main font-mono">{seed === -1 ? 'Random' : seed}</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={seed}
                                    onChange={(e) => setSeed(Number(e.target.value))}
                                    className="w-full bg-app border border-border-default rounded-lg pl-3 pr-8 py-2 text-sm text-text-main font-mono focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="-1 for random"
                                />
                                <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center gap-[1px]">
                                    <button
                                        type="button"
                                        onClick={() => setSeed(seed + 1)}
                                        className="h-3.5 w-5 flex justify-center items-center text-text-muted hover:text-primary hover:bg-surface-elevated rounded transition-colors"
                                    >
                                        <ChevronUp className="w-3 h-3" strokeWidth={3} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSeed(seed - 1)}
                                        className="h-3.5 w-5 flex justify-center items-center text-text-muted hover:text-primary hover:bg-surface-elevated rounded transition-colors"
                                    >
                                        <ChevronDown className="w-3 h-3" strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>
            </div>

            {/* 生成按钮 */}
            <div className="p-4 border-t border-border-subtle flex items-stretch relative">
                <button
                    onClick={startGeneration}
                    className="flex-1 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 glow-primary relative"
                >
                    <Sparkles className="w-5 h-5" />
                    Generate
                    {totalJobs > 0 && (
                        <div className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md min-w-[20px] text-center">
                            {totalJobs}
                        </div>
                    )}
                </button>
            </div>
        </aside>
    )
}

// 折叠面板组件
function AccordionSection({
    title,
    expanded,
    onToggle,
    children
}: {
    title: React.ReactNode
    expanded: boolean
    onToggle: () => void
    children: React.ReactNode
}) {
    return (
        <div className="bg-app border border-border-default rounded-xl">
            <button
                onClick={onToggle}
                className={`w-full px-4 py-3 flex items-center justify-between bg-elevated hover:bg-hover transition-colors text-left ${expanded ? 'rounded-t-[11px]' : 'rounded-[11px]'}`}
            >
                <div className="font-medium text-sm text-text-main flex-1">{title}</div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-text-muted" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-text-muted" />
                )}
            </button>
            {expanded && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    )
}

// 滑块输入组件
function SliderInput({
    label,
    value,
    onChange,
    min,
    max,
    step,
    defaultValue
}: {
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    defaultValue?: number
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isActive, setIsActive] = useState(false)

    useEffect(() => {
        const element = containerRef.current
        if (!element) return

        const handleWheel = (e: WheelEvent) => {
            if (!isActive) return

            e.preventDefault()
            e.stopPropagation()

            const delta = e.deltaY > 0 ? -step : step
            const newValue = Math.min(Math.max(min, value + delta), max)
            onChange(Number(newValue.toFixed(step < 1 ? 1 : 0)))
        }

        element.addEventListener('wheel', handleWheel, { passive: false })
        return () => element.removeEventListener('wheel', handleWheel)
    }, [value, min, max, step, onChange, isActive])

    const handleDoubleClick = () => {
        if (defaultValue !== undefined) {
            onChange(defaultValue)
        }
    }

    return (
        <div
            ref={containerRef}
            className="group"
            onMouseLeave={() => setIsActive(false)}
        >
            <label className="flex justify-between mb-2">
                <span
                    className={`text-sm cursor-pointer transition-colors select-none ${isActive ? 'text-primary font-medium' : 'text-text-muted hover:text-primary'}`}
                    onClick={() => setIsActive(true)}
                    onDoubleClick={handleDoubleClick}
                    title="点击激活滚轮调节，双击恢复默认值"
                >
                    {label}
                </span>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-16 text-right bg-transparent text-sm text-text-main font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                    max={max}
                    step={step}
                />
            </label>
            <input
                type="range"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                onDoubleClick={handleDoubleClick}
                min={min}
                max={max}
                step={step}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg hover:opacity-90 transition-opacity"
            />
        </div>
    )
}
