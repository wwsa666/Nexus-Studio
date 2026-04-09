import { useState, useMemo } from 'react'
import { Settings, RotateCcw, EyeOff, UserCog, Search, Upload, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useCharacterStore, Character } from '../../stores/characterStore'
import { FULL_CHARACTER_DB } from '../../data/characters'

export function SettingsModal() {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'hidden' | 'edit'>('hidden')

    const { deletedCharacters, restoreCharacter } = useCharacterStore()

    // Find full character objects for deleted IDs
    const hiddenCharacters = deletedCharacters.map(id => {
        // Try to find in full DB first (for system chars)
        const builtIn = FULL_CHARACTER_DB.find(c => c.value === id)
        if (builtIn) return { ...builtIn, isCustom: false }
        return builtIn
    }).filter(Boolean)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-elevated text-text-muted hover:text-text-main" title="设置与管理">
                    <Settings className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-panel border-border-default max-w-4xl h-[700px] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b border-border-subtle shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        设置
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 bg-app border-r border-border-subtle p-2 space-y-1">
                        <div
                            onClick={() => setActiveTab('hidden')}
                            className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer flex items-center gap-2 transition-colors ${activeTab === 'hidden' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main hover:bg-elevated'
                                }`}
                        >
                            <EyeOff className="w-4 h-4" />
                            隐藏角色管理
                        </div>
                        <div
                            onClick={() => setActiveTab('edit')}
                            className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer flex items-center gap-2 transition-colors ${activeTab === 'edit' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main hover:bg-elevated'
                                }`}
                        >
                            <UserCog className="w-4 h-4" />
                            角色编辑
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto bg-panel relative">
                        {activeTab === 'hidden' && (
                            <div className="animate-in fade-in duration-200">
                                <h3 className="text-lg font-medium text-text-main mb-4 flex items-center gap-2">
                                    <EyeOff className="w-4 h-4" />
                                    已隐藏的角色 ({hiddenCharacters.length})
                                </h3>

                                <div className="space-y-2">
                                    {hiddenCharacters.length === 0 ? (
                                        <div className="text-text-dim text-sm italic py-8 text-center bg-elevated rounded-lg">
                                            没有被隐藏的角色
                                        </div>
                                    ) : (
                                        hiddenCharacters.map(char => char && (
                                            <div key={char.value} className="flex items-center justify-between p-3 bg-elevated rounded-lg border border-border-subtle hover:border-border-default transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-app rounded-md flex items-center justify-center text-xs text-text-dim font-bold overflow-hidden">
                                                        {char.imagePath ? <img src={char.imagePath} className="w-full h-full object-cover" /> : char.key[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-text-main font-medium">{char.key}</div>
                                                        <div className="text-xs text-text-dim">{char.source}</div>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 hover:text-primary hover:border-primary"
                                                    onClick={() => restoreCharacter(char.value)}
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    恢复显示
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'edit' && <CharacterEditorPane />}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CharacterEditorPane() {
    const { characters, addedCharacters, deletedCharacters, editCharacter } = useCharacterStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [editingCharValue, setEditingCharValue] = useState<string | null>(null)

    // Form states
    const [formKey, setFormKey] = useState('') // 中文名
    const [formValue, setFormValue] = useState('') // 英文名
    const [formSource, setFormSource] = useState('') // 作品中文名
    const [formSourceEn, setFormSourceEn] = useState('') // 作品英文名
    const [formImagePath, setFormImagePath] = useState<string | undefined>()

    // Merge: Base + Added - Deleted
    const editableCharacters = useMemo(() => {
        const active = [...characters, ...addedCharacters].filter(c => !deletedCharacters.includes(c.value))
        if (!searchQuery) return active
        const q = searchQuery.toLowerCase()
        return active.filter(char => char.key.toLowerCase().includes(q) || char.value.toLowerCase().includes(q))
    }, [characters, addedCharacters, deletedCharacters, searchQuery])

    const handleEditClick = (char: Character) => {
        setEditingCharValue(char.value)
        setFormKey(char.key)
        setFormValue(char.value)
        setFormSource(char.source)
        setFormSourceEn(char.sourceEn || '')
        let currentPath = char.imagePath;
        if (currentPath) {
            // Strip any existing arbitrary protocols
            currentPath = currentPath.replace(/^(local:\/\/|file:\/\/\/|file:\/\/)/i, '');
            // Convert backward slashes to forward slashes for URLs
            currentPath = currentPath.replace(/\\/g, '/');
            // Ensure single leading slash for Windows paths (e.g. C:/... becomes /C:/...)
            if (!currentPath.startsWith('/')) {
                currentPath = '/' + currentPath;
            }
            // Reapply clean file:/// protocol
            currentPath = 'file://' + currentPath;
        }
        setFormImagePath(currentPath)
    }

    const cancelEdit = () => {
        setEditingCharValue(null)
    }

    const handleSave = async () => {
        if (!editingCharValue) return
        if (!formKey.trim() || !formValue.trim() || !formSource.trim()) return

        const success = await editCharacter(editingCharValue, {
            key: formKey.trim(),
            value: formValue.trim(),
            source: formSource.trim(),
            sourceEn: formSourceEn.trim() || undefined,
            imagePath: formImagePath
        })

        if (success) {
            setEditingCharValue(null)
        } else {
            alert("保存失败：该英文名(ID)已存在于其他角色中。")
        }
    }

    const handleImageSelect = async () => {
        try {
            const { filePaths } = await window.electronAPI.showOpenDialog({
                title: '选择角色封面',
                filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                properties: ['openFile']
            })

            if (filePaths && filePaths.length > 0) {
                const sourcePath = filePaths[0]
                const success = await window.electronAPI.copyCharacterImage(sourcePath)
                if (success) {
                    let cleanPath = sourcePath.replace(/^(local:\/\/|file:\/\/\/|file:\/\/)/i, '').replace(/\\/g, '/')
                    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath
                    setFormImagePath('file://' + cleanPath) // Preview immediately
                    // The actual save will persist this to characterStore
                }
            }
        } catch (error) {
            console.error('Pick image error', error)
        }
    }

    const handleImagePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile()
                if (file) {
                    try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result as string)
                            reader.onerror = reject
                            reader.readAsDataURL(file)
                        })
                        const extName = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '.png'
                        const fallbackName = formValue || formKey || 'pasted_cover'
                        const processedImagePath = await window.electronAPI.saveImageBuffer(dataUrl, fallbackName, extName)
                        if (processedImagePath) {
                            let cleanPath = processedImagePath.replace(/^(local:\/\/|file:\/\/\/|file:\/\/)/i, '').replace(/\\/g, '/')
                            if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath
                            setFormImagePath('file://' + cleanPath)
                        }
                    } catch (err) {
                        console.error('Failed to process pasted image', err)
                    }
                }
            }
        }
    }

    if (editingCharValue) {
        return (
            <div className="animate-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-text-main flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-primary" />
                        编辑角色信息
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-2" />取消
                        </Button>
                        <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Check className="w-4 h-4 mr-2" />保存更改
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 头像编辑区 */}
                    <div
                        className="flex items-center gap-6 p-4 bg-app rounded-lg border border-border-subtle hover:border-primary/50 transition-colors focus:border-primary focus:outline-none"
                        tabIndex={0}
                        onPaste={handleImagePaste}
                    >
                        <div className="w-24 h-24 rounded-lg bg-elevated border border-border-default overflow-hidden flex items-center justify-center relative group">
                            {formImagePath ? (
                                <img src={formImagePath} className="w-full h-full object-cover bg-elevated" />
                            ) : (
                                <div className="text-3xl text-text-muted font-bold">{formKey?.[0] || '?'}</div>
                            )}
                            {/* Hover overlay for changing image via click */}
                            <div
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                                onClick={handleImageSelect}
                                title="点击选择本地图片"
                            >
                                <Upload className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-2">
                            <h4 className="text-sm font-medium text-text-main flex items-center gap-2">
                                角色封面
                            </h4>
                            <p className="text-xs text-text-dim">支持 JPG, PNG, WEBP, 会自动裁剪并压缩为高性能格式。</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-primary/80">
                                    💡 提示：点击此区域任意处即可直接按 Ctrl+V 粘贴截图。单击左侧头像框选择本地文件。
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 基本信息区 */}
                    <div className="p-4 bg-app rounded-lg border border-border-subtle space-y-4">
                        <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary rounded-full"></div>
                            基本信息
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-text-dim">中文名 <span className="text-error">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                                    value={formKey}
                                    onChange={e => setFormKey(e.target.value)}
                                    placeholder="如：雷电将军"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-text-dim">英文名 (ID) <span className="text-error">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-sm text-text-main font-mono focus:outline-none focus:border-primary transition-colors"
                                    value={formValue}
                                    onChange={e => setFormValue(e.target.value)}
                                    placeholder="如：raiden_shogun"
                                />
                                <p className="text-[10px] text-text-muted mt-1">用作系统唯一标识，修改会自动迁移相关配置。</p>
                            </div>
                        </div>
                    </div>

                    {/* 来源作品区 */}
                    <div className="p-4 bg-app rounded-lg border border-border-subtle space-y-4">
                        <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary rounded-full"></div>
                            来源作品
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-text-dim">作品中文名 <span className="text-error">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                                    value={formSource}
                                    onChange={e => setFormSource(e.target.value)}
                                    placeholder="如：原神"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-text-dim">作品英文名</label>
                                <input
                                    type="text"
                                    className="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-sm text-text-main font-mono focus:outline-none focus:border-primary transition-colors"
                                    value={formSourceEn}
                                    onChange={e => setFormSourceEn(e.target.value)}
                                    placeholder="如：genshin_impact"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-main flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    角色编辑
                </h3>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="搜索角色名字或 ID..."
                        className="w-full bg-elevated border border-border-default rounded-md pl-9 pr-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {editableCharacters.length === 0 ? (
                    <div className="text-text-dim text-sm italic py-8 text-center bg-elevated rounded-lg">
                        没有找到匹配的角色
                    </div>
                ) : (
                    <>
                        {editableCharacters.slice(0, 50).map(char => (
                            <div key={char.value} className="flex items-center justify-between p-3 bg-app rounded-lg border border-border-subtle hover:border-primary/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-elevated rounded-md flex items-center justify-center text-xs text-text-dim font-bold overflow-hidden shadow-sm">
                                        {char.imagePath ? <img src={char.imagePath} className="w-full h-full object-cover" /> : char.key[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm text-text-main font-medium flex items-center gap-2">
                                            {char.key}
                                            {char.isCustom && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">自定义</span>}
                                        </div>
                                        <div className="text-xs text-text-dim">{char.source}</div>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                                    onClick={() => handleEditClick(char)}
                                >
                                    <UserCog className="w-4 h-4 mr-1.5" />
                                    编辑
                                </Button>
                            </div>
                        ))}
                        {editableCharacters.length > 50 && (
                            <div className="text-center py-4 text-xs text-text-muted italic">
                                未完全显示，仅呈现前 50 个记录。请使用上方搜索框精确定位。
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
