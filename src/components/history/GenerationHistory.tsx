import { useState } from 'react'
import { Clock, Trash2, Image } from 'lucide-react'
import { useGenerationStore } from '../../stores/generationStore'

export function GenerationHistory() {
    const { generatedImages, setCurrentImage } = useGenerationStore()
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const clearHistory = () => {
        // 清空历史（需要在 store 中添加此方法）
        // clearImages()
    }

    return (
        <div className="h-full flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                <h3 className="text-sm font-medium text-text-main flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    生成历史
                </h3>
                {generatedImages.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="p-1 text-text-dim hover:text-error transition-colors"
                        title="清空历史"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 历史记录列表 */}
            <div className="flex-1 overflow-y-auto p-2">
                {generatedImages.length === 0 ? (
                    <div className="text-center text-text-muted text-sm py-8">
                        <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>暂无生成记录</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {generatedImages.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentImage(image)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="relative aspect-square rounded-lg overflow-hidden bg-elevated hover:ring-2 hover:ring-primary transition-all group"
                            >
                                <img
                                    src={image.url}
                                    alt={`Generated ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                {hoveredIndex === index && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="text-white text-xs">查看</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 底部统计 */}
            <div className="p-2 border-t border-border-subtle text-xs text-text-dim text-center">
                {generatedImages.length} 张图片
            </div>
        </div>
    )
}
