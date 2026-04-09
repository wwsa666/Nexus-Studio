/**
 * ComfyUI API 服务
 * 处理与 ComfyUI 后端的所有通信
 */

export interface ComfyUIConfig {
    host: string
    port: number
}

export interface QueuePromptResponse {
    prompt_id: string
    number: number
}

export interface HistoryItem {
    prompt: any
    outputs: Record<string, { images: { filename: string; subfolder: string }[] }>
    status: { completed: boolean; status_str: string }
}

class ComfyUIService {
    private config: ComfyUIConfig = { host: '127.0.0.1', port: 8188 }
    private ws: WebSocket | null = null
    private clientId: string = ''
    private onProgressCallback: ((progress: number, max: number, promptId?: string) => void) | null = null
    private onImageCallback: ((imageUrl: string, promptId?: string) => void) | null = null
    private onCompleteCallback: ((promptId?: string) => void) | null = null
    private onErrorCallback: ((error: string, promptId?: string) => void) | null = null

    constructor() {
        // 生成唯一的客户端 ID
        this.clientId = this.generateClientId()
    }

    private generateClientId(): string {
        return 'nexus_studio_' + Math.random().toString(36).substring(2, 15)
    }

    get baseUrl(): string {
        return `http://${this.config.host}:${this.config.port}`
    }

    get wsUrl(): string {
        return `ws://${this.config.host}:${this.config.port}/ws?clientId=${this.clientId}`
    }

    /**
     * 设置服务器配置
     */
    setConfig(config: ComfyUIConfig) {
        this.config = config
    }

    /**
     * 测试连接
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/system_stats`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            })
            return response.ok
        } catch {
            return false
        }
    }

    /**
     * 获取已加载的模型列表
     */
    async getCheckpoints(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`)
            const data = await response.json()
            return data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []
        } catch {
            return []
        }
    }

    /**
     * 获取 LoRA 列表
     */
    async getLoras(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/LoraLoader`)
            const data = await response.json()
            return data?.LoraLoader?.input?.required?.lora_name?.[0] || []
        } catch {
            return []
        }
    }

    /**
     * 获取 UNET 模型列表
     */
    async getUnets(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/UNETLoader`)
            const data = await response.json()
            return data?.UNETLoader?.input?.required?.unet_name?.[0] || []
        } catch {
            return []
        }
    }

    /**
     * 获取 CLIP 模型列表
     */
    async getClips(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/CLIPLoader`)
            const data = await response.json()
            return data?.CLIPLoader?.input?.required?.clip_name?.[0] || []
        } catch {
            return []
        }
    }

    /**
     * 获取 VAE 模型列表
     */
    async getVaes(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/VAELoader`)
            const data = await response.json()
            return data?.VAELoader?.input?.required?.vae_name?.[0] || []
        } catch {
            return []
        }
    }

    /**
     * 获取采样器列表
     */
    async getSamplers(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/KSampler`)
            const data = await response.json()
            return data?.KSampler?.input?.required?.sampler_name?.[0] || []
        } catch (error) {
            // 返回默认采样器列表
            return ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde', 'ddim']
        }
    }

    /**
     * 获取调度器列表
     */
    async getSchedulers(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/object_info/KSampler`)
            const data = await response.json()
            return data?.KSampler?.input?.required?.scheduler?.[0] || []
        } catch (error) {
            return ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform']
        }
    }

    /**
     * 连接 WebSocket (保持持久连接)
     */
    connectWebSocket(callbacks: {
        onProgress?: (progress: number, max: number, promptId?: string) => void
        onImage?: (imageUrl: string, promptId?: string) => void
        onComplete?: (promptId?: string) => void
        onError?: (error: string, promptId?: string) => void
    }) {
        // 更新回调 (每次生成可能需要不同的回调)
        this.onProgressCallback = callbacks.onProgress || null
        this.onImageCallback = callbacks.onImage || null
        this.onCompleteCallback = callbacks.onComplete || null
        this.onErrorCallback = callbacks.onError || null

        // 如果 WebSocket 已经打开或正在连接，直接返回 (复用连接)
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return
        }

        // 创建新连接
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onmessage = (event) => {
            if (event.data instanceof Blob) {
                // 忽略二进制数据（如预览图）
                return
            }
            try {
                const message = JSON.parse(event.data)
                this.handleWebSocketMessage(message)
            } catch (e) {
                console.warn('[ComfyUI] Failed to parse WebSocket message:', e)
            }
        }

        this.ws.onerror = () => {
            this.onErrorCallback?.('WebSocket 连接错误')
        }

        this.ws.onclose = () => {
            console.log('[ComfyUI] WebSocket 已断开')
            this.ws = null // 允许下次重新连接
        }
    }

    /**
     * 确保 WebSocket 连接 (用于应用启动时预连接)
     */
    ensureConnection() {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            this.connectWebSocket({})
        }
    }

    private handleWebSocketMessage(message: any) {
        const { type, data } = message
        // ComfyUI messages usually contain prompt_id in 'data' or top level depending on type.
        // For 'executing', 'progress', 'executed', it's in data.prompt_id
        const promptId = data?.prompt_id

        switch (type) {
            case 'progress':
                this.onProgressCallback?.(data.value, data.max, promptId)
                break

            case 'executing':
                if (data.node === null) {
                    // 生成完成
                    this.onCompleteCallback?.(promptId)
                }
                break

            case 'executed':
                // 节点执行完成，检查是否有图片输出
                if (data.output?.images) {
                    for (const image of data.output.images) {
                        const imageUrl = `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=output`
                        this.onImageCallback?.(imageUrl, promptId)
                    }
                }
                break

            case 'execution_error':
                this.onErrorCallback?.(data.exception_message || '执行错误', promptId)
                break
        }
    }

    /**
     * 提交工作流到队列
     */
    async queuePrompt(workflow: any): Promise<QueuePromptResponse | null> {
        try {
            const response = await fetch(`${this.baseUrl}/prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: workflow,
                    client_id: this.clientId
                })
            })

            if (!response.ok) {
                const error = await response.json()
                this.onErrorCallback?.(`提交失败: ${error.error?.message || '未知错误'}`)
                return null
            }

            return await response.json()
        } catch (error) {
            this.onErrorCallback?.(`网络错误: ${error}`)
            return null
        }
    }

    /**
     * 取消当前任务
     */
    async cancelCurrentTask(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/interrupt`, {
                method: 'POST'
            })
            return response.ok
        } catch {
            return false
        }
    }

    /**
     * 获取队列状态
     */
    async getQueueStatus(): Promise<{ pending: number; running: number }> {
        try {
            const response = await fetch(`${this.baseUrl}/queue`)
            const data = await response.json()
            return {
                pending: data.queue_pending?.length || 0,
                running: data.queue_running?.length || 0
            }
        } catch {
            return { pending: 0, running: 0 }
        }
    }

    /**
     * 断开 WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }
}

// 导出单例
export const comfyuiService = new ComfyUIService()
