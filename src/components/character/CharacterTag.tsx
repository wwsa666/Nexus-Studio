import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useCharacterStore } from '../../stores/characterStore'
import { getCharacterThumbnail, getCachedThumbnail } from '../../services/thumbnails'

interface CharacterTagProps {
    char: string
    onCopy: () => void
    onRemove?: () => void
}

export function CharacterTag({ char, onCopy, onRemove }: CharacterTagProps) {
    const clickTimeout = useRef<NodeJS.Timeout | null>(null)
    const [hovered, setHovered] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [coords, setCoords] = useState({ x: 0, y: 0 })

    // Find character data (search both built-in and custom/added characters)
    const characterData = useCharacterStore(s => {
        const found = s.characters.find(c => c.value === char)
        if (found) return found
        return s.addedCharacters.find(c => c.value === char)
    })

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (onRemove) {
            if (clickTimeout.current) {
                clearTimeout(clickTimeout.current)
                clickTimeout.current = null
                onRemove()
            } else {
                clickTimeout.current = setTimeout(() => {
                    clickTimeout.current = null
                    onCopy()
                }, 250) // 250ms delay for double click detetion
            }
        } else {
            onCopy()
        }
    }

    // Load preview image on hover
    useEffect(() => {
        if (!hovered || !characterData) {
            setPreviewUrl(null)
            return
        }

        if (characterData.imagePath) {
            setPreviewUrl(characterData.imagePath.startsWith('file://') ? characterData.imagePath : `file://${characterData.imagePath}`)
            return
        }

        // 尝试同步缓存
        const cached = getCachedThumbnail(characterData.value)
        if (cached) {
            setPreviewUrl(cached)
            return
        }

        let active = true
        getCharacterThumbnail(characterData.value).then(url => {
            if (active && url) {
                setPreviewUrl(url)
            }
        })

        return () => {
            active = false
        }
    }, [hovered, characterData])

    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setCoords({ x: rect.left, y: rect.top })
        setHovered(true)
    }

    return (
        <>
            <span
                onClick={handleClick}
                onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // If no onRemove, we don't want any default double click behavior
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setHovered(false)}
                className={`inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs rounded-lg cursor-pointer hover:bg-primary/30 hover:scale-105 transition-all select-none active:scale-95 ${!onRemove ? 'cursor-copy' : ''}`}
                title={onRemove ? "单击复制，双击移除" : "单击复制"}
            >
                {char}
            </span>

            {/* Hover Preview Tooltip */}
            {hovered && characterData && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed z-[200] bg-panel border border-border-default rounded-lg shadow-2xl p-3 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        width: 200,
                        left: coords.x - 210, // Show to the left of the tag
                        top: Math.min(coords.y - 100, window.innerHeight - 320)
                    }}
                >
                    <div className="bg-elevated rounded-lg mb-2 flex items-center justify-center overflow-hidden w-[176px] h-[200px]">
                        {previewUrl ? (
                            <img src={previewUrl} alt={characterData.key} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-4xl text-text-dim">{characterData.key[0]}</div>
                        )}
                    </div>
                    <div className="text-sm text-text-main font-medium leading-tight mb-1">
                        {characterData.key}
                    </div>
                    <div className="text-xs text-primary mb-1 break-all">
                        {characterData.value}
                    </div>
                    <div className="text-xs text-text-dim">
                        {characterData.source}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
