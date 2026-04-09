import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { comfyuiService } from '../services/comfyui'

interface ConnectionState {
    host: string
    port: number
    isConnected: boolean
    isConnecting: boolean
    latency: number | null
    outputDir: string // 自定义输出目录（绝对路径）

    // Actions
    setHost: (host: string) => void
    setPort: (port: number) => void
    setOutputDir: (dir: string) => void
    setConnected: (status: boolean) => void
    setLatency: (ms: number | null) => void
    connect: () => Promise<boolean>
    disconnect: () => void
}

export const useConnectionStore = create<ConnectionState>()(
    persist(
        (set, get) => ({
            host: '127.0.0.1',
            port: 8188,
            isConnected: false,
            isConnecting: false,
            latency: null,
            outputDir: '',

            setHost: (host) => set({ host }),
            setPort: (port) => set({ port }),
            setOutputDir: (dir) => set({ outputDir: dir }),
            setConnected: (status) => set({ isConnected: status }),
            setLatency: (ms) => set({ latency: ms }),

            connect: async () => {
                const { host, port } = get()
                set({ isConnecting: true })

                // 更新 ComfyUI 服务配置
                comfyuiService.setConfig({ host, port })

                try {
                    const startTime = performance.now()
                    const success = await comfyuiService.testConnection()

                    if (success) {
                        const latency = Math.round(performance.now() - startTime)
                        set({ isConnected: true, isConnecting: false, latency })

                        // 预连接 WebSocket，减少生成时的延迟
                        comfyuiService.ensureConnection()

                        return true
                    }
                } catch (error) {
                    console.error('[Connection] Failed:', error)
                }

                set({ isConnected: false, isConnecting: false, latency: null })
                return false
            },

            disconnect: () => {
                comfyuiService.disconnect()
                set({ isConnected: false, latency: null })
            }
        }),
        {
            name: 'nexus-studio-connection',
            partialize: (state) => ({
                host: state.host,
                port: state.port,
                outputDir: state.outputDir
            })
        }
    )
)
