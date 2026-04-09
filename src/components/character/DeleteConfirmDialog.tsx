import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useState } from 'react'

interface DeleteConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => Promise<void>
    characterName: string
    isCustom: boolean
}

export function DeleteConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    characterName,
    isCustom
}: DeleteConfirmDialogProps) {
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
            <DialogContent className="bg-panel border-border-default max-w-sm">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-error mb-2">
                        <div className="p-2 bg-error/10 rounded-full">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-lg">删除角色</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-text-main">
                        确定要删除 <span className="font-bold text-primary">{characterName}</span> 吗？
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {isCustom ? (
                        <div className="bg-error/10 text-error text-xs p-3 rounded-lg flex gap-2 items-start">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>这是一个自定义角色。删除操作不可恢复，该角色的图片和数据将被永久移除。</span>
                        </div>
                    ) : (
                        <div className="bg-brand-dark/50 text-text-dim text-xs p-3 rounded-lg flex gap-2 items-start">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>这是一个系统内置角色。删除仅会将其从列表中隐藏，您可以随时在右上角恢复。</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        取消
                    </Button>
                    <Button
                        className="bg-error hover:bg-error/90 text-white gap-2"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认删除'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
