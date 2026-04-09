import { useState } from 'react'
import { Loader2, CheckCircle, XCircle, Server } from 'lucide-react'
import { useConnectionStore } from '../../stores/connectionStore'

interface ConnectionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
    const { host, port, setHost, setPort, connect, isConnecting } = useConnectionStore()
    const [localAddress, setLocalAddress] = useState(host || '127.0.0.1')
    const [localPort, setLocalPort] = useState(String(port) || '8188')
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

    if (!isOpen) return null

    const handleConnect = async () => {
        setTestResult(null)

        // 更新 store 中的地址和端口
        setHost(localAddress)
        setPort(parseInt(localPort) || 8188)

        const success = await connect()
        setTestResult(success ? 'success' : 'error')

        if (success) {
            setTimeout(() => {
                onClose()
            }, 500)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 模态框 */}
            <div className="relative bg-panel border border-border-default rounded-xl w-[400px] shadow-2xl">
                {/* 头部 */}
                <div className="flex items-center gap-3 p-6 border-b border-border-subtle">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-main">Connect to Server</h2>
                        <p className="text-sm text-text-muted">Enter ComfyUI server address</p>
                    </div>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-4">
                    {/* 地址输入 */}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">
                            Server Address
                        </label>
                        <input
                            type="text"
                            value={localAddress}
                            onChange={(e) => setLocalAddress(e.target.value)}
                            placeholder="127.0.0.1"
                            className="w-full bg-app border border-border-default rounded-lg px-4 py-3 text-text-main placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* 端口输入 */}
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">
                            Port
                        </label>
                        <input
                            type="text"
                            value={localPort}
                            onChange={(e) => setLocalPort(e.target.value)}
                            placeholder="8188"
                            className="w-full bg-app border border-border-default rounded-lg px-4 py-3 text-text-main placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* 测试结果 */}
                    {testResult && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult === 'success'
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                            }`}>
                            {testResult === 'success' ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm">连接成功！</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5" />
                                    <span className="text-sm">连接失败，请检查地址和端口</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-3 p-6 border-t border-border-subtle">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-lg border border-border-default text-text-muted hover:bg-elevated transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex-1 py-3 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                连接中...
                            </>
                        ) : (
                            'Connect & Save'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
