import { useState } from 'react'
import { Plus, Upload, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useCharacterStore } from '../../stores/characterStore'

export function AddCharacterDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { characters, addedCharacters, addCustomCharacter } = useCharacterStore()

    const [form, setForm] = useState<{
        cnName: string
        enName: string
        workCn: string
        workEn: string
        imageFile: File | null
        imagePreview: string
    }>({
        cnName: '',
        enName: '',
        workCn: '',
        workEn: '',
        imageFile: null,
        imagePreview: ''
    })

    const [error, setError] = useState('')

    const handleSelectImage = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                const preview = URL.createObjectURL(file)
                setForm(prev => ({ ...prev, imageFile: file, imagePreview: preview }))
            }
        }
        input.click()
    }

    const handleSubmit = async () => {
        setError('')
        if (!form.cnName || !form.enName || !form.workCn || !form.imageFile) {
            setError('请填写完整信息并上传图片')
            return
        }

        setLoading(true)
        try {
            // 1. Process Image
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(form.imageFile!)
            })

            const extName = form.imageFile.name ? form.imageFile.name.substring(form.imageFile.name.lastIndexOf('.')).toLowerCase() : '.png'
            const processedImagePath = await window.electronAPI.saveImageBuffer(dataUrl, form.enName, extName)

            if (!processedImagePath) {
                setError('图片处理失败')
                setLoading(false)
                return
            }

            // 2. 智能匹配既存作品名称 (Fuzzy Match Source)
            const allChars = [...characters, ...addedCharacters]
            let finalSource = form.workCn

            // 1. 严格全字匹配中文名
            let matched = allChars.find(c => c.source.toLowerCase() === form.workCn.toLowerCase())

            // 2. 通过英文匹配 (如果存在的话，原库通常在 value 里有 `(source_en)`)
            if (!matched && form.workEn) {
                matched = allChars.find(c => c.value.toLowerCase().includes(`(${form.workEn.toLowerCase()})`))
            }

            // 3. 通过中文模糊匹配包含 (原库 key 里通常有 `（source_cn）`)
            if (!matched && form.workCn) {
                matched = allChars.find(c => c.key.includes(`（${form.workCn}）`) || c.key.includes(`(${form.workCn})`))
            }

            if (matched) {
                finalSource = matched.source
            }

            // 3. Construct Character
            const character = {
                key: `${form.cnName}（${finalSource}）`,
                value: form.workEn ? `${form.enName} (${form.workEn})` : form.enName,
                source: finalSource,
                imagePath: processedImagePath,
                isCustom: true
            }

            // 3. Add to Store
            const success = await addCustomCharacter(character)
            if (success) {
                setOpen(false)
                setForm({ cnName: '', enName: '', workCn: '', workEn: '', imageFile: null, imagePreview: '' })
            } else {
                setError('角色已存在 (英文名重复)')
            }
        } catch (e) {
            console.error(e)
            setError('保存失败')
        } finally {
            setLoading(false)
        }
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile()
                if (file) {
                    const preview = URL.createObjectURL(file)
                    setForm(prev => ({ ...prev, imageFile: file, imagePreview: preview }))
                }
            }
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
                const preview = URL.createObjectURL(file)
                setForm(prev => ({ ...prev, imageFile: file, imagePreview: preview }))
            }
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 w-9 h-9 text-text-muted hover:text-text-main hover:bg-white/10"
                    title="添加新角色"
                >
                    <Plus className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/50 backdrop-blur-xl border-white/10 max-w-2xl p-0 overflow-hidden gap-0 shadow-2xl">
                <div className="flex flex-col md:flex-row h-[420px]" onPaste={handlePaste} tabIndex={0}>
                    {/* Left: Image Upload Area */}
                    <div
                        className="w-full md:w-[280px] bg-black/20 border-b md:border-b-0 md:border-r border-white/10 relative group cursor-pointer flex items-center justify-center transition-all hover:bg-black/40"
                        onClick={handleSelectImage}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        {form.imagePreview ? (
                            <>
                                <img src={form.imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-8">
                                    <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">点击更换图片</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-text-dim group-hover:text-text-muted transition-colors p-6 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center border border-white/5 shadow-inner">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">上传角色封面</p>
                                    <p className="text-xs opacity-50">点击或拖拽图片至此</p>
                                    <p className="text-[10px] opacity-30 pt-2">支持 Ctrl+V 粘贴</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Form Area */}
                    <div className="flex-1 flex flex-col h-full bg-transparent">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle>添加新角色</DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 p-6 pt-2 space-y-6 flex flex-col justify-center">
                            {/* Basic Info */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                                    基本信息
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-dim pl-1">中文名</label>
                                        <input
                                            value={form.cnName}
                                            onChange={e => setForm(f => ({ ...f, cnName: e.target.value }))}
                                            className="w-full bg-black/20 border-none rounded-lg px-3 py-2.5 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                            placeholder="雷电将军"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-dim pl-1">英文名 (ID)</label>
                                        <input
                                            value={form.enName}
                                            onChange={e => setForm(f => ({ ...f, enName: e.target.value }))}
                                            className="w-full bg-black/20 border-none rounded-lg px-3 py-2.5 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                            placeholder="raiden_shogun"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Source Info */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                    来源作品
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-dim pl-1">作品中文名</label>
                                        <input
                                            value={form.workCn}
                                            onChange={e => setForm(f => ({ ...f, workCn: e.target.value }))}
                                            className="w-full bg-black/20 border-none rounded-lg px-3 py-2.5 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                            placeholder="原神"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-dim pl-1">作品英文名</label>
                                        <input
                                            value={form.workEn}
                                            onChange={e => setForm(f => ({ ...f, workEn: e.target.value }))}
                                            className="w-full bg-black/20 border-none rounded-lg px-3 py-2.5 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                            placeholder="genshin_impact"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0 flex justify-between items-center bg-transparent border-t border-white/5">
                            {error ? (
                                <span className="text-xs text-error font-medium animate-pulse">{error}</span>
                            ) : (
                                <span></span>
                            )}
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setOpen(false)} className="hover:bg-white/5">取消</Button>
                                <Button onClick={handleSubmit} disabled={loading} className="min-w-[100px] bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存角色'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
