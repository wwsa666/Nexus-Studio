import { useState } from 'react'
import { Settings, Users, Box, Server, Folder, X } from 'lucide-react'
import { CharacterVault } from '../character/CharacterVault'
import { LoraSelector } from '../lora/LoraSelector'
import { useConnectionStore } from '../../stores/connectionStore'

type TabType = 'characters' | 'models'

export function Sidebar() {
    const [activeTab, setActiveTab] = useState<TabType>('characters')
    const [showSettings, setShowSettings] = useState(false)
    const { host, port, setHost, setPort, isConnected, connect, disconnect, outputDir, setOutputDir } = useConnectionStore()

    return (
        <aside className="w-[280px] bg-panel border-r border-border-subtle flex flex-col">
            {/* Tab 切换 */}
            <div className="flex border-b border-border-subtle">
                <button
                    onClick={() => setActiveTab('characters')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'characters'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-text-muted hover:text-text-main hover:bg-elevated'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    角色库
                </button>
                <button
                    onClick={() => setActiveTab('models')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'models'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-text-muted hover:text-text-main hover:bg-elevated'
                        }`}
                >
                    <Box className="w-4 h-4" />
                    模型库
                </button>
            </div>

            {/* Tab 内容 */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'characters' ? (
                    <CharacterVault />
                ) : (
                    <LoraSelector />
                )}
            </div>

            {/* 底部设置 */}
            <div className="p-3 border-t border-border-subtle">
                <button
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-main hover:bg-elevated transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">设置</span>
                    {/* 连接状态指示器 */}
                    <div className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                </button>
            </div>

            {/* 设置模态框 */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-panel border border-border-default rounded-xl shadow-2xl w-[400px] max-h-[80vh] overflow-hidden">
                        {/* 标题栏 */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                            <h2 className="text-lg font-semibold text-text-main">设置</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-1 rounded hover:bg-elevated transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        {/* 设置内容 */}
                        <div className="p-4 space-y-4">
                            {/* ComfyUI 连接 */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-text-main flex items-center gap-2">
                                    <Server className="w-4 h-4" />
                                    ComfyUI 服务器
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={host}
                                        onChange={(e) => setHost(e.target.value)}
                                        placeholder="127.0.0.1"
                                        className="flex-1 bg-app border border-border-default rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                    />
                                    <input
                                        type="number"
                                        value={port}
                                        onChange={(e) => setPort(Number(e.target.value))}
                                        placeholder="8188"
                                        className="w-20 bg-app border border-border-default rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                                    <span className="text-xs text-text-muted">
                                        {isConnected ? '已连接' : '未连接'}
                                    </span>
                                    <button
                                        onClick={isConnected ? disconnect : connect}
                                        className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isConnected
                                            ? 'bg-error/10 text-error hover:bg-error/20'
                                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                                            }`}
                                    >
                                        {isConnected ? '断开' : '连接'}
                                    </button>
                                </div>
                            </div>

                            {/* 输出目录 */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-text-main flex items-center gap-2">
                                    <Folder className="w-4 h-4" />
                                    输出目录位置
                                </h3>
                                <div className="text-xs text-text-muted mb-1">
                                    指定 ComfyUI 的 output 文件夹以正确打开
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <div
                                            className="flex-1 bg-app border border-border-default rounded-lg px-3 py-2 text-sm text-text-muted truncate select-text"
                                            title={outputDir || '未设置 (默认)'}
                                        >
                                            {outputDir || '未设置 (使用默认)'}
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const path = await window.electronAPI?.selectDirectory?.()
                                                if (path) {
                                                    setOutputDir(path)
                                                }
                                            }}
                                            className="px-3 py-2 bg-elevated rounded-lg text-sm text-text-main hover:bg-elevated/80 transition-colors whitespace-nowrap"
                                        >
                                            指定
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const electronApi = (window as any).electronAPI
                                            electronApi?.openOutputFolder?.(outputDir)
                                        }}
                                        className="w-full px-3 py-2 bg-app border border-border-default rounded-lg text-sm text-text-muted hover:border-border-default transition-colors"
                                    >
                                        打开输出文件夹
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 底部按钮 */}
                        <div className="px-4 py-3 border-t border-border-subtle">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    )
}

