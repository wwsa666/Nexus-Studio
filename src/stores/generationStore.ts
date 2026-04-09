import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { comfyuiService } from '../services/comfyui'
import { createCharacterWorkflow, createZimageCharacterWorkflow, WorkflowType } from '../services/workflow'
import { useConnectionStore } from './connectionStore'
import { useCharacterStore } from './characterStore'

export interface GenerationResult {
    id: string  // 唯一标识符，用于 React key
    url: string
    timestamp: number
    params: {
        workflowType: WorkflowType
        width: number
        height: number
        batchSize: number
        steps: number
        cfg: number
        seed: number
        sampler: string
        scheduler: string
        checkpoint: string
        positivePrompt: string
        negativePrompt: string
        selectedCharacters: string[]
        loras: { name: string; weight: number }[]
        // zimage 工作流专用
        unetName?: string
        clipName?: string
        vaeName?: string
    }
}

interface GenerationState {
    // 当前图像 (最新生成的)
    currentImage: GenerationResult | null

    // 生成时的参数快照 (用于确保保存的参数与生成时一致)
    activeGenerationParams: GenerationResult['params'] | null

    // 生成历史
    generatedImages: GenerationResult[]

    // 生成状态
    isGenerating: boolean
    generationStartTime: number | null
    error: string | null
    progress: number
    progressMax: number
    statusMessage: string

    // 参数
    positivePrompt: string
    negativePrompt: string
    width: number
    height: number
    batchSize: number
    steps: number
    cfg: number
    seed: number
    sampler: string
    scheduler: string

    // 选择的模型 (standard 工作流)
    checkpoint: string
    availableCheckpoints: string[]
    availableSamplers: string[]
    availableSchedulers: string[]

    // 工作流类型
    workflowType: WorkflowType
    setWorkflowType: (t: WorkflowType) => void

    // zimage 工作流专用
    unetName: string
    clipName: string
    vaeName: string
    availableUnets: string[]
    availableClips: string[]
    availableVaes: string[]
    setUnetName: (n: string) => void
    setClipName: (n: string) => void
    setVaeName: (n: string) => void

    // 选中的角色
    selectedCharacters: string[]

    // 选择的 LoRAs
    loras: { name: string; weight: number }[]

    // Actions
    setPositivePrompt: (prompt: string) => void
    setNegativePrompt: (prompt: string) => void
    setWidth: (w: number) => void
    setHeight: (h: number) => void
    setBatchSize: (b: number) => void
    setSteps: (s: number) => void
    setCfg: (c: number) => void
    setSeed: (s: number) => void
    setSampler: (s: string) => void
    setScheduler: (s: string) => void
    setCheckpoint: (c: string) => void

    setSelectedCharacters: (chars: string[]) => void
    addCharacter: (char: string) => void
    removeCharacter: (char: string) => void
    deleteImage: (timestamp: number) => void
    clearHistory: () => void

    // LoRA Actions
    setLoras: (loras: { name: string; weight: number }[]) => void
    addLora: (loraName: string) => void
    removeLora: (loraName: string) => void
    updateLoraWeight: (loraName: string, weight: number) => void
    clearLoras: () => void

    // 加载可用选项
    loadAvailableOptions: () => Promise<void>

    // 生成控制
    startGeneration: () => Promise<void>
    cancelGeneration: () => Promise<void>
    setProgress: (current: number, max: number) => void
    setCurrentImage: (img: GenerationResult | null) => void
    setStatusMessage: (msg: string) => void
    setGenerationStartTime: (time: number | null) => void

    // 队列
    queue: GenerationResult['params'][]
    addToQueue: () => void
    removeFromQueue: (index: number) => void
    clearQueue: () => void
    processQueue: () => Promise<void>



    currentPromptId: string | null
}

export const useGenerationStore = create<GenerationState>()(
    persist(
        (set, get) => ({
            currentImage: null,
            activeGenerationParams: null,
            generatedImages: [],
            isGenerating: false,
            generationStartTime: null,
            error: null,
            progress: 0,
            progressMax: 0,
            statusMessage: '',

            positivePrompt: 'masterpiece, best quality, 1girl',
            negativePrompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
            width: 1024,
            height: 1024,
            batchSize: 1,
            steps: 20,
            cfg: 7,
            seed: -1,
            sampler: 'euler',
            scheduler: 'normal',

            currentPromptId: null, // Add to initial state

            checkpoint: '',
            availableCheckpoints: [],
            availableSamplers: ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde', 'ddim'],
            availableSchedulers: ['normal', 'karras', 'exponential', 'sgm_uniform'],

            // 工作流类型
            workflowType: 'standard' as WorkflowType,
            setWorkflowType: (t) => set({ workflowType: t }),

            // zimage 工作流专用
            unetName: '',
            clipName: '',
            vaeName: '',
            availableUnets: [],
            availableClips: [],
            availableVaes: [],
            setUnetName: (n) => set({ unetName: n }),
            setClipName: (n) => set({ clipName: n }),
            setVaeName: (n) => set({ vaeName: n }),

            selectedCharacters: [],
            loras: [],

            queue: [],

            setPositivePrompt: (prompt) => set({ positivePrompt: prompt }),
            setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
            setWidth: (w) => set({ width: w }),
            setHeight: (h) => set({ height: h }),
            setBatchSize: (b) => set({ batchSize: b }),
            setSteps: (s) => set({ steps: s }),
            setCfg: (c) => set({ cfg: c }),
            setSeed: (s) => set({ seed: s }),
            setSampler: (s) => set({ sampler: s }),
            setScheduler: (s) => set({ scheduler: s }),
            setCheckpoint: (c) => set({ checkpoint: c }),

            setSelectedCharacters: (chars) => set({ selectedCharacters: chars }),
            addCharacter: (char) => {
                set(state => ({
                    selectedCharacters: [...state.selectedCharacters, char]
                }))

                // 自动添加绑定的 LoRA
                const boundLoras = useCharacterStore.getState().boundLoras
                let boundLoraList = boundLoras[char]
                if (boundLoraList) {
                    if (!Array.isArray(boundLoraList)) {
                        boundLoraList = [boundLoraList as any]
                    }
                    boundLoraList.forEach(boundLora => {
                        const currentLoras = get().loras
                        const existing = currentLoras.find(l => l.name === boundLora.name)
                        if (!existing) {
                            get().addLora(boundLora.name)
                            // addLora adds it with default weight 1.0, so update it immediately
                            get().updateLoraWeight(boundLora.name, boundLora.weight)
                        }
                    })
                }
            },
            removeCharacter: (char) => {
                set(state => ({
                    selectedCharacters: state.selectedCharacters.filter(c => c !== char)
                }))

                // 检查是否需要自动移除绑定的 LoRA
                const boundLoras = useCharacterStore.getState().boundLoras
                let boundLoraList = boundLoras[char]
                if (boundLoraList) {
                    if (!Array.isArray(boundLoraList)) {
                        boundLoraList = [boundLoraList as any]
                    }

                    const remainingChars = get().selectedCharacters
                    boundLoraList.forEach(boundLora => {
                        // Check if any *remaining* selected characters share this bound LoRA
                        const stillNeeded = remainingChars.some(rc => {
                            const rcLoras = boundLoras[rc]
                            if (!rcLoras) return false
                            const rcList = Array.isArray(rcLoras) ? rcLoras : [rcLoras as any]
                            return rcList.some((l: any) => l.name === boundLora.name)
                        })

                        if (!stillNeeded) {
                            get().removeLora(boundLora.name)
                        }
                    })
                }
            },

            setLoras: (loras) => set({ loras }),
            addLora: (name) => set((state) => {
                if (state.loras.find(l => l.name === name)) return state;
                return { loras: [...state.loras, { name, weight: 1.0 }] };
            }),
            removeLora: (name) => set((state) => ({
                loras: state.loras.filter(l => l.name !== name)
            })),
            updateLoraWeight: (name, weight) => set((state) => ({
                loras: state.loras.map(l => l.name === name ? { ...l, weight } : l)
            })),
            clearLoras: () => set({ loras: [] }),

            loadAvailableOptions: async () => {
                try {
                    const [checkpoints, samplers, schedulers, unets, clips, vaes] = await Promise.all([
                        comfyuiService.getCheckpoints(),
                        comfyuiService.getSamplers(),
                        comfyuiService.getSchedulers(),
                        comfyuiService.getUnets(),
                        comfyuiService.getClips(),
                        comfyuiService.getVaes()
                    ])

                    set({
                        availableCheckpoints: checkpoints,
                        availableSamplers: samplers.length > 0 ? samplers : get().availableSamplers,
                        availableSchedulers: schedulers.length > 0 ? schedulers : get().availableSchedulers,
                        availableUnets: unets.length > 0 ? unets : get().availableUnets,
                        availableClips: clips.length > 0 ? clips : get().availableClips,
                        availableVaes: vaes.length > 0 ? vaes : get().availableVaes,
                        checkpoint: (get().checkpoint && checkpoints.includes(get().checkpoint))
                            ? get().checkpoint
                            : (checkpoints[0] || ''),
                        unetName: (get().unetName && unets.includes(get().unetName))
                            ? get().unetName
                            : (unets[0] || ''),
                        clipName: (get().clipName && clips.includes(get().clipName))
                            ? get().clipName
                            : (clips[0] || ''),
                        vaeName: (get().vaeName && vaes.includes(get().vaeName))
                            ? get().vaeName
                            : (vaes[0] || '')
                    })
                } catch (error) {
                    console.error('[Generation] 加载选项失败:', error)
                }
            },

            addToQueue: () => {
                const state = get()
                const connectionState = useConnectionStore.getState()

                if (!connectionState.isConnected) {
                    set({ statusMessage: '未连接到 ComfyUI', error: '未连接到服务' })
                    return
                }

                // 根据工作流类型验证模型选择
                if (state.workflowType === 'standard') {
                    if (!state.checkpoint) {
                        set({ statusMessage: '请选择模型', error: '未选择 Checkpoint' })
                        return
                    }
                } else if (state.workflowType === 'zimage') {
                    if (!state.unetName || !state.clipName || !state.vaeName) {
                        set({ statusMessage: '请选择 UNET/CLIP/VAE', error: '未选择完整的 zimage 模型' })
                        return
                    }
                }

                const params: GenerationResult['params'] = {
                    workflowType: state.workflowType,
                    width: state.width,
                    height: state.height,
                    batchSize: state.batchSize,
                    steps: state.steps,
                    cfg: state.cfg,
                    seed: state.seed,
                    sampler: state.sampler,
                    scheduler: state.scheduler,
                    checkpoint: state.checkpoint,
                    positivePrompt: state.positivePrompt,
                    negativePrompt: state.negativePrompt,
                    selectedCharacters: [...state.selectedCharacters],
                    loras: [...state.loras],
                    // zimage 专用
                    unetName: state.unetName,
                    clipName: state.clipName,
                    vaeName: state.vaeName
                }

                set(s => ({ queue: [...s.queue, params] }))

                // 如果当前未在生成，则开始处理队列
                if (!get().isGenerating) {
                    get().processQueue()
                }
            },

            removeFromQueue: (index) => {
                set(s => ({
                    queue: s.queue.filter((_, i) => i !== index)
                }))
            },

            clearQueue: () => {
                set({ queue: [] })
            },

            processQueue: async () => {
                const state = get()
                if (state.isGenerating || state.queue.length === 0) return

                const task = state.queue[0]
                set(s => ({ queue: s.queue.slice(1) }))

                set({
                    isGenerating: true,
                    generationStartTime: Date.now(),
                    error: null,
                    progress: 0,
                    progressMax: task.steps,
                    statusMessage: '准备生成...',
                    currentImage: null,
                    activeGenerationParams: task
                })

                comfyuiService.connectWebSocket({
                    onProgress: (current, max, promptId) => {
                        // Check if this update belongs to the current task
                        if (promptId && promptId !== get().currentPromptId) return
                        set({ progress: current, progressMax: max, statusMessage: `生成中 ${current}/${max}` })
                    },
                    onImage: (imageUrl, promptId) => {
                        if (promptId && promptId !== get().currentPromptId) return
                        const now = Date.now()
                        const result: GenerationResult = {
                            id: `${now}_${Math.random().toString(36).slice(2, 11)}`,  // 唯一 ID
                            url: imageUrl,
                            timestamp: now,
                            params: task
                        }
                        set(s => ({
                            currentImage: result,
                            generatedImages: [result, ...s.generatedImages].slice(0, 500)
                        }))
                    },
                    onComplete: (promptId) => {
                        if (promptId && promptId !== get().currentPromptId) return
                        set({ isGenerating: false, generationStartTime: null, statusMessage: '生成完成', progress: 0, currentPromptId: null })
                        get().processQueue()
                    },
                    onError: (error, promptId) => {
                        if (promptId && promptId !== get().currentPromptId) return
                        set({ isGenerating: false, generationStartTime: null, statusMessage: `错误: ${error}`, error: error, progress: 0, currentPromptId: null })
                        setTimeout(() => get().processQueue(), 1000)
                    }
                })

                let workflow: Record<string, any>
                if (task.workflowType === 'zimage') {
                    workflow = createZimageCharacterWorkflow(
                        {
                            unetName: task.unetName || '',
                            clipName: task.clipName || '',
                            vaeName: task.vaeName || '',
                            positivePrompt: task.positivePrompt,
                            negativePrompt: task.negativePrompt,
                            width: task.width,
                            height: task.height,
                            batchSize: task.batchSize,
                            steps: task.steps,
                            cfgScale: task.cfg,
                            sampler: task.sampler,
                            scheduler: task.scheduler,
                            seed: task.seed,
                            loras: task.loras
                        },
                        task.selectedCharacters
                    )
                } else {
                    workflow = createCharacterWorkflow(
                        {
                            checkpoint: task.checkpoint,
                            positivePrompt: task.positivePrompt,
                            negativePrompt: task.negativePrompt,
                            width: task.width,
                            height: task.height,
                            batchSize: task.batchSize,
                            steps: task.steps,
                            cfgScale: task.cfg,
                            sampler: task.sampler,
                            scheduler: task.scheduler,
                            seed: task.seed,
                            loras: task.loras
                        },
                        task.selectedCharacters
                    )
                }

                set({ statusMessage: '提交到队列...' })
                const result = await comfyuiService.queuePrompt(workflow)

                if (!result) {
                    set({ isGenerating: false, statusMessage: '提交失败', error: '提交工作流失败', activeGenerationParams: null })
                    setTimeout(() => get().processQueue(), 1000)
                } else {
                    set({ statusMessage: `队列中 #${result.number}`, currentPromptId: result.prompt_id })
                }
            },

            // startGeneration alias for compatibility if needed, but UI should call addToQueue
            startGeneration: async () => {
                get().addToQueue()
            },

            cancelGeneration: async () => {
                await comfyuiService.cancelCurrentTask()

                set({
                    isGenerating: false,
                    generationStartTime: null,
                    progress: 0,
                    statusMessage: '已取消当前任务',
                    activeGenerationParams: null,
                    currentPromptId: null
                })

                // Automatically proceed to the next item in the queue after a brief delay
                setTimeout(() => {
                    get().processQueue()
                }, 500)
            },

            setProgress: (current, max) => set({ progress: current, progressMax: max }),
            setCurrentImage: (img) => set({ currentImage: img }),
            setStatusMessage: (msg) => set({ statusMessage: msg }),
            setGenerationStartTime: (time) => set({ generationStartTime: time }),

            deleteImage: (timestamp: number) => set((state) => {
                const newImages = state.generatedImages.filter(img => img.timestamp !== timestamp)
                // Adjust currentImage if the deleted one was current
                let newCurrent = state.currentImage
                if (state.currentImage?.timestamp === timestamp) {
                    newCurrent = newImages.length > 0 ? newImages[0] : null
                }
                return {
                    generatedImages: newImages,
                    currentImage: newCurrent
                }
            }),

            clearHistory: () => set({
                generatedImages: [],
                currentImage: null
            })
        }),
        {
            name: 'nexus-studio-generation',
            partialize: (state) => ({
                positivePrompt: state.positivePrompt,
                negativePrompt: state.negativePrompt,
                width: state.width,
                height: state.height,
                batchSize: state.batchSize,
                steps: state.steps,
                cfg: state.cfg,
                seed: state.seed,
                sampler: state.sampler,
                scheduler: state.scheduler,
                checkpoint: state.checkpoint,
                selectedCharacters: state.selectedCharacters,
                loras: state.loras,
                generatedImages: state.generatedImages
                // Queue not persisted
            }),
            version: 1,
            migrate: (persistedState: any, version: number) => {
                const state = persistedState as GenerationState

                // Version 0 -> 1: Ensure all images have an ID
                if (version === 0) {
                    if (state.generatedImages) {
                        state.generatedImages = state.generatedImages.map(img => {
                            if (!img.id) {
                                return {
                                    ...img,
                                    // Generate a stable-ish ID from timestamp if possible, or random
                                    id: `${img.timestamp}_${Math.random().toString(36).slice(2, 11)}`
                                }
                            }
                            return img
                        })
                    }
                }

                return state as GenerationState
            }
        }
    )
)
