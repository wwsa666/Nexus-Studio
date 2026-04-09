import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Download, FolderOpen, Copy, ZoomIn, ZoomOut, Sparkles, ChevronLeft, ChevronRight, Clock, Check, Info, X, Trash2, Loader2 } from 'lucide-react'
import { useGenerationStore } from '../../stores/generationStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { CharacterTag } from '../character/CharacterTag'
import { NexusImage } from '../ui/NexusImage'
import { useScrollSave } from '../../hooks/useScrollSave'

export function Canvas() {
    const {
        currentImage, generatedImages, isGenerating,
        generationStartTime, statusMessage, error,
        queue, removeFromQueue, cancelGeneration, activeGenerationParams, progress, progressMax
    } = useGenerationStore()

    const { outputDir } = useConnectionStore()

    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    const [activeIndex, setActiveIndex] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)

    const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' })

    const [activeTab, setActiveTab] = useState<'queued' | 'completed'>('completed')

    const containerRef = useRef<HTMLDivElement>(null)

    // Calulate Fit Scale Helper
    const getFitScale = useCallback(() => {
        if (!currentImage || !containerRef.current) return 1
        const { width: cw, height: ch } = containerRef.current.getBoundingClientRect()
        // Ensure we have valid dimensions
        if (cw === 0 || ch === 0) return 1

        const iw = currentImage.params.width
        const ih = currentImage.params.height

        // Calculate "Contain" fit
        const scale = Math.min((cw - 80) / iw, (ch - 80) / ih, 1)

        // Apply user-requested 75% factor to make it smaller than full screen
        return scale * 0.75
    }, [currentImage])

    // State to track if we've done the initial fit
    const [hasAppliedInitialScale, setHasAppliedInitialScale] = useState(false)

    // Scroll Persistence for History
    const { ref: historyScrollRef, handleScroll: handleHistoryScroll } = useScrollSave<HTMLDivElement>('history-sidebar-scroll')

    // Masonry Columns
    const [leftCol, rightCol] = useMemo(() => {
        const left: { img: typeof generatedImages[0], idx: number }[] = []
        const right: { img: typeof generatedImages[0], idx: number }[] = []
        generatedImages.forEach((img, i) => {
            if (i % 2 === 0) left.push({ img, idx: i })
            else right.push({ img, idx: i })
        })
        return [left, right]
    }, [generatedImages])

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isGenerating && generationStartTime) {
            setElapsedTime((Date.now() - generationStartTime) / 1000)
            interval = setInterval(() => {
                setElapsedTime((Date.now() - generationStartTime) / 1000)
            }, 100)
        } else {
            setElapsedTime(0)
        }
        return () => clearInterval(interval)
    }, [isGenerating, generationStartTime])

    // Robust Initial Fit Logic using ResizeObserver
    useEffect(() => {
        if (!containerRef.current || !currentImage) return

        const applyFit = () => {
            if (!hasAppliedInitialScale) {
                const scale = getFitScale()
                setZoom(scale)
                setOffset({ x: 0, y: 0 })
                if (scale !== 1) setHasAppliedInitialScale(true) // Only mark done if we got a valid calculation
            }
        }

        // Try immediately
        applyFit()

        // Also watch for size changes (e.g. sidebar open/close)
        const observer = new ResizeObserver(() => {
            if (!hasAppliedInitialScale) applyFit()
        })
        observer.observe(containerRef.current)

        return () => observer.disconnect()
    }, [currentImage, getFitScale, hasAppliedInitialScale])

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

            if (e.key === 'ArrowLeft') {
                setActiveIndex(curr => Math.min(generatedImages.length - 1, curr + 1))
            }
            if (e.key === 'ArrowRight') {
                setActiveIndex(curr => Math.max(0, curr - 1))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [generatedImages.length])

    const activeResult = generatedImages[activeIndex]
    const activeUrl = activeResult?.url || null

    const wheelContainerRef = useRef<HTMLDivElement>(null)

    // Zoom Handling
    const handleWheel = useCallback((e: WheelEvent) => {
        if (!activeUrl) return
        e.preventDefault()
        const delta = e.deltaY * -0.001
        setZoom(z => {
            const newZoom = Math.min(Math.max(0.1, z + delta), 5)
            return newZoom
        })
    }, [activeUrl])

    useEffect(() => {
        const el = wheelContainerRef.current
        if (!el) return
        el.addEventListener('wheel', handleWheel, { passive: false })
        return () => el.removeEventListener('wheel', handleWheel)
    }, [handleWheel])

    // Reset Zoom
    const handleResetZoom = useCallback(() => {
        setZoom(1)
        setOffset({ x: 0, y: 0 })
    }, [])

    // Check if view is reset (for hiding the button)
    const isViewReset = (() => {
        const fitScale = getFitScale()
        // Allow a small error margin for float comparison
        return Math.abs(zoom - fitScale) < 0.001 && offset.x === 0 && offset.y === 0
    })()

    // Pan Handling
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!activeUrl || e.button !== 0) return
        setIsDragging(true)
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        e.preventDefault()
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }

    const handleMouseUp = () => setIsDragging(false)

    // Copy Helper
    const showToast = (msg: string) => {
        setToast({ show: true, message: msg })
        setTimeout(() => setToast({ show: false, message: '' }), 2000)
    }

    const handleCopyText = async (text: string, label: string) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            showToast(`${label} 已复制`)
        } catch (err) {
            console.error('Copy failed', err)
        }
    }

    // Open Folder Smart
    const handleOpenFolder = useCallback(() => {
        const electronApi = (window as any).electronAPI

        let targetPath = outputDir

        if (activeUrl && outputDir) {
            try {
                const urlObj = new URL(activeUrl)
                const subfolder = urlObj.searchParams.get('subfolder')
                if (subfolder) {
                    targetPath = `${outputDir}/${subfolder}`
                }
            } catch (e) {
                console.warn('Failed to parse URL for folder path', e)
            }
        }

        if (electronApi?.openOutputFolder) {
            electronApi.openOutputFolder(targetPath)
        } else if (activeUrl) {
            window.open(activeUrl, '_blank')
        }
    }, [activeUrl, outputDir])

    const handleSaveImage = useCallback(async () => {
        if (!activeUrl) return
        try {
            const response = await fetch(activeUrl)
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `NexusStudio_${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Save failed', error)
        }
    }, [activeUrl])

    const handleCopyToClipboard = useCallback(async () => {
        if (!activeUrl) return
        try {
            const response = await fetch(activeUrl)
            const blob = await response.blob()
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ])
            showToast('图片已复制')
        } catch (error) {
            console.error('Copy failed', error)
        }
    }, [activeUrl])

    // Navigation
    const hasNext = activeIndex > 0
    const hasPrev = activeIndex < generatedImages.length - 1

    const handlePrev = () => { if (hasPrev) setActiveIndex(i => i + 1) }
    const handleNext = () => { if (hasNext) setActiveIndex(i => i - 1) }

    const [showHistory, setShowHistory] = useState(false)
    const [showInfo, setShowInfo] = useState(false)

    // Right Click Copy
    const handleRightClickCopy = (e: React.MouseEvent<HTMLDivElement | HTMLTextAreaElement>, _text: string, label: string) => {
        e.preventDefault()
        e.stopPropagation()
        const selection = window.getSelection()?.toString()
        // Only copy if selection matches
        if (selection) {
            handleCopyText(selection, label)
        }
    }

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleHistoryMouseEnter = (index: number) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setHoveredIndex(index)
    }

    const handleHistoryMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

        if (hoveredIndex !== null) {
            setHoveredIndex(null)
        }
    }

    // Overlay Copy Listener (for ctrl+c or context menu copy)
    const handleOverlayCopy = useCallback(() => {
        // Delay slightly to let browser update clipboard? 
        // No, 'copy' event fires when clipboard operation happens.
        // We just show toast.
        setTimeout(() => showToast('内容已复制'), 100)
    }, [])

    return (
        <div ref={containerRef} className="flex-1 flex flex-col bg-app h-full overflow-hidden relative">

            {/* 1. Main Canvas Area (Zoom/Pan) */}
            <div
                ref={wheelContainerRef}
                className="absolute inset-0 z-0 flex items-center justify-center bg-transparent overflow-hidden pl-4"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => { if (showHistory) setShowHistory(false) }}
                onDoubleClick={handleResetZoom}
                onContextMenu={(e) => { e.preventDefault(); if (activeUrl) setShowInfo(!showInfo); }}
            >
                {activeUrl ? (
                    <div
                        style={{
                            // Apply 0.75 base factor: UI 100% = actual 75% of original image pixels
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom * 0.75})`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        className="origin-center will-change-transform"
                    >
                        <NexusImage
                            src={activeUrl}
                            className="max-w-none shadow-2xl rounded-2xl pointer-events-none select-none"
                            draggable={false}
                            alt="Current Generation"
                        />
                    </div>
                ) : (
                    <div className="text-white/20 flex flex-col items-center gap-4 select-none">
                        <Sparkles className="w-16 h-16 opacity-50" />
                        <p className="font-light tracking-widest text-lg">READY TO CREATE</p>
                    </div>
                )}
            </div>

            {/* 2. Generation Progress (Top-Left, Transparent) */}
            {isGenerating && (
                <div className="absolute top-4 left-4 z-50 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Circular Progress Ring */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        <Clock className="w-4 h-4 text-white/60" />
                    </div>

                    {/* Status Message */}
                    <p className="text-white/70 text-xs font-medium tracking-wide">
                        {statusMessage || '队列中'}
                    </p>

                    {/* Timer */}
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold text-primary font-mono tracking-tight">
                            {elapsedTime.toFixed(1)}
                        </span>
                        <span className="text-sm text-primary/70 font-medium">s</span>
                    </div>
                </div>
            )}

            {/* Info Overlay */}
            {showInfo && activeResult && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowInfo(false)}
                >
                    <div
                        className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 selection:bg-primary/30 selection:text-white cursor-auto"
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => e.stopPropagation()} // Allow native context menu
                        onCopy={handleOverlayCopy}
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                <h3 className="font-medium text-white">Generation Details</h3>
                            </div>
                            <button onClick={() => setShowInfo(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                <X className="w-5 h-5 text-white/50 hover:text-white" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Prompts */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 select-none">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <label className="text-xs font-medium text-white/60">Positive Prompt</label>
                                    </div>
                                    <div
                                        className="bg-black/30 p-4 rounded-xl border border-white/5 text-sm text-white/80 font-mono leading-relaxed select-text cursor-text"
                                        onContextMenu={(e) => handleRightClickCopy(e, activeResult.params.positivePrompt, 'Positive Prompt')}
                                    >
                                        {activeResult.params.positivePrompt}
                                    </div>
                                </div>

                                {activeResult.params.negativePrompt && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 select-none">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            <label className="text-xs font-medium text-white/60">Negative Prompt</label>
                                        </div>
                                        <div
                                            className="bg-black/30 p-4 rounded-xl border border-white/5 text-sm text-white/60 font-mono leading-relaxed select-text cursor-text"
                                            onContextMenu={(e) => handleRightClickCopy(e, activeResult.params.negativePrompt, 'Negative Prompt')}
                                        >
                                            {activeResult.params.negativePrompt}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Parameters Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="block text-xs text-white/40 mb-1 select-none">Model</span>
                                    <span className="font-medium text-white/90 text-sm truncate block select-text" title={activeResult.params.checkpoint}>
                                        {/* Remove suffix like .safetensors */}
                                        {activeResult.params.checkpoint?.replace(/\.(safetensors|ckpt|pt|pth)$/i, '') || 'Unknown'}
                                    </span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="block text-xs text-white/40 mb-1 select-none">Seed</span>
                                    <span className="font-mono text-primary font-medium select-text">{activeResult.params.seed}</span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="block text-xs text-white/40 mb-1 select-none">Size</span>
                                    <span className="font-mono text-white/90 select-text">{activeResult.params.width} × {activeResult.params.height}</span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="block text-xs text-white/40 mb-1 select-none">Settings</span>
                                    <span className="font-mono text-white/90 select-text">{activeResult.params.steps} Steps • CFG {activeResult.params.cfg}</span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                                    <span className="block text-xs text-white/40 mb-1 select-none">Sampler</span>
                                    <span className="font-mono text-white/90 select-text">{activeResult.params.sampler} ({activeResult.params.scheduler})</span>
                                </div>
                            </div>

                            {/* Characters */}
                            {activeResult.params.selectedCharacters && activeResult.params.selectedCharacters.length > 0 && (
                                <div className="select-none">
                                    <label className="text-xs font-medium text-white/40 mb-2 block">Characters</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activeResult.params.selectedCharacters.map(char => (
                                            <CharacterTag
                                                key={char}
                                                char={char}
                                                onCopy={() => handleCopyText(char, 'Character Tag')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LoRAs */}
                            {activeResult.params.loras && activeResult.params.loras.length > 0 && (
                                <div className="select-none">
                                    <label className="text-xs font-medium text-white/40 mb-2 block">LoRAs</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activeResult.params.loras.map(lora => (
                                            <div
                                                key={lora.name}
                                                className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 group hover:border-primary/50 transition-colors"
                                            >
                                                <span className="text-xs text-white/80 select-text max-w-[200px] truncate" title={lora.name}>
                                                    {lora.name.split(/[/\\]/).pop()}
                                                </span>
                                                <span className="text-[10px] bg-black/40 text-primary px-1.5 py-0.5 rounded font-mono">
                                                    {lora.weight.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Top Right Controls (Reset & History) */}
            {/* z-60 to be above sidebar */}
            {/* 3. Top Right Controls (Reset & History) */}
            {/* Container has no Z-Index to allow children to have distinct Z levels relative to Sidebar (z-70) */}
            <div
                className="absolute top-2 right-4 flex items-center gap-4 pointer-events-none z-[80]"
            >
                {/* Reset Zoom Pill - Level 60 (Below Sidebar) */}
                {!isViewReset && (
                    <div className="bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center overflow-hidden h-10 shadow-lg animate-in fade-in zoom-in duration-200 z-[60] pointer-events-auto relative">
                        <span className="px-3 text-xs font-mono text-white/80 border-r border-white/10 select-none">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                            className="px-3 h-full hover:bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-colors"
                            title="Reset View"
                        >
                            R
                        </button>
                    </div>
                )}

                {/* History Toggle - Level 80 (Above Sidebar) */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory) }}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 border border-white/10 shadow-lg relative z-[80] pointer-events-auto ${showHistory ? 'bg-primary text-black border-primary' : 'bg-black/40 text-white hover:bg-white/10'}`}
                    title={showHistory ? "关闭历史" : "历史记录"}
                >
                    <Clock className="w-4 h-4" />
                </button>
            </div>

            {/* 4. History Sidebar (Slide-in) */}
            <div
                className={`absolute top-0 right-0 h-full w-80 bg-[#121212]/95 backdrop-blur-2xl border-l border-white/10 transition-transform duration-300 ease-out z-[70] flex flex-col shadow-2xl ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}
                onWheel={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header matches screenshot: Left aligned Title, Right side reserved for buttons. Moved down to clear absolute top-right buttons. */}
                <div className="flex px-4 pt-16 border-b border-white/5 shrink-0 select-none">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('queued') }}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === 'queued' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}
                    >
                        队列中 {queue.length + (isGenerating ? 1 : 0) > 0 ? `(${queue.length + (isGenerating ? 1 : 0)})` : ''}
                        {activeTab === 'queued' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('completed') }}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === 'completed' ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}
                    >
                        已完成 ({generatedImages.length})
                        {activeTab === 'completed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* Completed Tab Content (Preserved DOM for masonry and scroll position) */}
                    <div
                        ref={historyScrollRef}
                        onScroll={handleHistoryScroll}
                        className={`absolute inset-0 overflow-y-auto p-4 ${activeTab === 'completed' ? 'block' : 'hidden'}`}
                    >
                        <div className="flex gap-2">
                            {/* Masonry Columns */}
                            {[leftCol, rightCol].map((col, colIndex) => (
                                <div key={colIndex} className="flex-1 space-y-2">
                                    {col.map(({ img, idx }) => (
                                        <div
                                            key={img.id || img.timestamp}
                                            onClick={() => setActiveIndex(idx)}
                                            onMouseEnter={() => handleHistoryMouseEnter(idx)}
                                            onMouseLeave={handleHistoryMouseLeave}
                                            className={`rounded-xl overflow-hidden border cursor-pointer relative group/item transition-all duration-200
                                                ${idx === activeIndex ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 hover:border-primary/50 hover:shadow-lg'}
                                            `}
                                            style={{
                                                aspectRatio: (img.params.width && img.params.height)
                                                    ? `${img.params.width}/${img.params.height}`
                                                    : '1/1'
                                            }}
                                        >
                                            <NexusImage src={img.url} className="w-full h-full object-cover" loading="lazy" />

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    useGenerationStore.getState().deleteImage(img.timestamp)
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500/80"
                                                title="删除"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Queued Tab Content */}
                    <div className={`absolute inset-0 overflow-y-auto p-4 flex flex-col gap-3 ${activeTab === 'queued' ? 'flex' : 'hidden'}`}>
                        {/* Active Task (if any) */}
                        {isGenerating && activeGenerationParams && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden group hover:border-white/20 transition-colors">
                                {/* Progress Bar Outline (Ring) */}
                                <div className="absolute inset-0 p-[2px] pointer-events-none" style={{ zIndex: 0 }}>
                                    <svg className="w-full h-full overflow-visible">
                                        <rect
                                            x="0" y="0"
                                            width="100%" height="100%"
                                            rx="9" ry="9"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-primary transition-all duration-300 ease-out"
                                            pathLength="100"
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - (progressMax > 0 ? (progress / progressMax) * 100 : 0)}
                                        />
                                    </svg>
                                </div>

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                        <span className="text-sm font-medium text-primary">生成中 • {Math.round(progressMax > 0 ? (progress / progressMax) * 100 : 0)}%</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); cancelGeneration() }}
                                        className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="取消生成"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="text-xs text-white/60 line-clamp-2" title={activeGenerationParams.positivePrompt}>
                                    {activeGenerationParams.positivePrompt || 'Empty prompt'}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                                    <span>{activeGenerationParams.width}x{activeGenerationParams.height}</span>
                                    <span>•</span>
                                    <span>{activeGenerationParams.steps} steps</span>
                                </div>

                                {/* Character Tags */}
                                {activeGenerationParams.selectedCharacters && activeGenerationParams.selectedCharacters.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {activeGenerationParams.selectedCharacters.map(char => (
                                            <CharacterTag
                                                key={char}
                                                char={char}
                                                onCopy={() => handleCopyText(char, 'Character Tag')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pending Tasks */}
                        {queue.map((task, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 relative group hover:border-white/20 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        <span className="text-sm font-medium text-white/60">等待中 #{idx + 1}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFromQueue(idx) }}
                                        className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="移除任务"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="text-xs text-white/60 line-clamp-2" title={task.positivePrompt}>
                                    {task.positivePrompt || 'Empty prompt'}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                                    <span>{task.width}x{task.height}</span>
                                    <span>•</span>
                                    <span>{task.steps} steps</span>
                                </div>

                                {/* Character Tags */}
                                {task.selectedCharacters && task.selectedCharacters.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.selectedCharacters.map(char => (
                                            <CharacterTag
                                                key={char}
                                                char={char}
                                                onCopy={() => handleCopyText(char, 'Character Tag')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!isGenerating && queue.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-white/20 gap-2">
                                <Clock className="w-8 h-8 opacity-50" />
                                <p className="text-sm">队列为空</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Clear Buttons based on Tab */}
                {activeTab === 'completed' && generatedImages.length > 0 && (
                    <div className="p-4 border-t border-white/5 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确定要清空所有历史记录吗？')) useGenerationStore.getState().clearHistory();
                            }}
                            className="w-full py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            清空历史记录
                        </button>
                    </div>
                )}
                {activeTab === 'queued' && queue.length > 0 && (
                    <div className="p-4 border-t border-white/5 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确定要清空所有等待中的任务吗？')) {
                                    useGenerationStore.getState().clearQueue();
                                }
                            }}
                            className="w-full py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            清空等待队列
                        </button>
                    </div>
                )}
            </div>

            {/* 5. Navigation Buttons */}
            {generatedImages.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrev() }}
                        disabled={!hasPrev}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:scale-110 z-20 ${hasPrev ? 'hover:bg-black/60 cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext() }}
                        disabled={!hasNext}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:scale-110 z-20 ${hasNext ? 'hover:bg-black/60 cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 px-3 py-1 rounded-full text-xs text-white/80 backdrop-blur-md font-mono border border-white/10 pointer-events-none z-10">
                        {generatedImages.length - activeIndex} / {generatedImages.length}
                    </div>
                </>
            )}

            {/* 6. Error Banner */}
            {error && !isGenerating && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-md border border-red-400/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-white/20 p-1 px-2.5 rounded-full font-bold">!</div>
                    <div className="flex-1">
                        <p className="font-medium text-sm">生成失败</p>
                        <p className="text-xs opacity-90 max-w-[300px] truncate" title={error}>{error}</p>
                    </div>
                    <button onClick={() => useGenerationStore.setState({ error: null })} className="ml-2 hover:bg-white/20 p-1 rounded text-white/80 hover:text-white">✕</button>
                </div>
            )}

            {/* 7. Bottom Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl">
                    <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
                        <span className="w-12 text-center text-sm font-medium text-white select-none">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSaveImage} disabled={!activeUrl} className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white disabled:opacity-30 transition-colors" title="保存"><Download className="w-4 h-4" /></button>
                        <button onClick={handleOpenFolder} className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors" title="打开文件夹"><FolderOpen className="w-4 h-4" /></button>
                        <button onClick={handleCopyToClipboard} disabled={!activeUrl} className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white disabled:opacity-30 transition-colors" title="复制图片"><Copy className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* 8. Bottom Right Info Button */}
            <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(true) }}
                className="absolute bottom-6 right-6 z-30 p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-white/10 hover:scale-110 transition-all shadow-lg"
                title="Generation Details"
            >
                <Info className="w-5 h-5" />
            </button>

            {/* Toast - Moved to Top Center to avoid overlay */}
            {toast.show && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 -ml-5 z-[200] bg-[#1e1e1e] text-white px-6 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-2xl border border-white/5 select-none pointer-events-none">
                    <Check className="w-4 h-4 text-green-500" />
                    {toast.message}
                </div>
            )}
        </div>
    )
}
