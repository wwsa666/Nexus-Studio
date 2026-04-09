import { useState, useEffect } from 'react'
import { Minus, Square, X, Wifi, WifiOff } from 'lucide-react'
import logo from './assets/logo.png'
import { ConnectionModal } from './components/connection/ConnectionModal'
import { Sidebar } from './components/layout/Sidebar'
import { Canvas } from './components/layout/Canvas'
import { ControlPanel } from './components/layout/ControlPanel'
import { SettingsModal } from './components/settings/SettingsModal'
import { useConnectionStore } from './stores/connectionStore'

import { loadThumbsDatabase } from './services/thumbnails'

function App() {
    const [showConnectionModal, setShowConnectionModal] = useState(false)
    const { isConnected, host, port, connect } = useConnectionStore()

    // 启动时预加载缩略图
    useEffect(() => {
        loadThumbsDatabase()
    }, [])

    // 启动时检查连接配置
    useEffect(() => {
        if (!host || !port) {
            setShowConnectionModal(true)
        } else {
            connect()
        }
    }, [])

    return (
        <div className="h-screen flex flex-col bg-app overflow-hidden border-t border-white/10">
            {/* 自定义标题栏 */}
            <header className="h-10 border-b border-border-subtle flex items-center justify-between px-4 drag-region">
                {/* 左侧: Logo */}
                <div className="flex items-center gap-2 no-drag">
                    <img src={logo} alt="Icon" className="w-6 h-6 rounded-lg" />
                    <span className="text-sm font-semibold text-text-main">Nexus Studio</span>
                </div>

                {/* 中间: 连接状态 */}
                <div
                    className="flex items-center gap-2 cursor-pointer no-drag hover:bg-elevated px-3 py-1 rounded-lg transition-colors"
                    onClick={() => setShowConnectionModal(true)}
                >
                    {isConnected ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-success animate-breathe" />
                            <Wifi className="w-4 h-4 text-success" />
                            <span className="text-xs text-text-muted">{host}:{port}</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-error" />
                            <WifiOff className="w-4 h-4 text-error" />
                            <span className="text-xs text-text-muted">未连接</span>
                        </>
                    )}
                </div>

                {/* 右侧: =设置 + 窗口控制 */}
                <div className="flex items-center no-drag gap-1">
                    <SettingsModal />

                    <button
                        onClick={() => window.electronAPI?.minimizeWindow()}
                        className="w-10 h-10 flex items-center justify-center hover:bg-elevated transition-colors"
                    >
                        <Minus className="w-4 h-4 text-text-muted" />
                    </button>
                    <button
                        onClick={() => window.electronAPI?.maximizeWindow()}
                        className="w-10 h-10 flex items-center justify-center hover:bg-elevated transition-colors"
                    >
                        <Square className="w-3 h-3 text-text-muted" />
                    </button>
                    <button
                        onClick={() => window.electronAPI?.closeWindow()}
                        className="w-10 h-10 flex items-center justify-center hover:bg-error/20 transition-colors group"
                    >
                        <X className="w-4 h-4 text-text-muted group-hover:text-error" />
                    </button>
                </div>
            </header>

            {/* 主内容区: 三栏布局 */}
            <main className="flex-1 flex overflow-hidden">
                {/* 左侧边栏 - 280px */}
                <Sidebar />

                {/* 中间画布 - 弹性宽度 */}
                <Canvas />

                {/* 右侧控制面板 - 320px */}
                <ControlPanel />
            </main>

            {/* 连接配置模态框 */}
            <ConnectionModal
                isOpen={showConnectionModal}
                onClose={() => setShowConnectionModal(false)}
            />
        </div>
    )
}

export default App
