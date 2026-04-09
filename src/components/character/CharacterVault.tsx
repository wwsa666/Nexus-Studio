import { useState, useEffect, useMemo, useCallback } from 'react'
import { AddCharacterDialog } from './AddCharacterDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { BindLoraDialog } from './BindLoraDialog'
import { Search, Star, ChevronDown, Trash2, Link as LinkIcon } from 'lucide-react'
import { useCharacterStore } from '../../stores/characterStore'
import { useGenerationStore } from '../../stores/generationStore'
import { FULL_CHARACTER_DB, Character } from '../../data/characters'
import { getCharacterThumbnail, getCachedThumbnail } from '../../services/thumbnails'
import { useScrollSave } from '../../hooks/useScrollSave'

function CharacterAvatar({ char, selected, isFavorite }: { char: Character, selected: boolean, isFavorite?: boolean }) {
    const [url, setUrl] = useState<string | null>(() => {
        if (char.imagePath) {
            return char.imagePath.startsWith('file://') ? char.imagePath : `file://${char.imagePath}`
        }
        return getCachedThumbnail(char.value)
    })

    useEffect(() => {
        // 如果已经有缓存并且是同步获得的，或者已经有自定义图路径，那么不用再次触发网络或解码
        if (url || char.imagePath) return


        let active = true

        getCharacterThumbnail(char.value).then(res => {
            if (!active) {
                return
            }
            setUrl(res)
        })

        return () => {
            active = false
        }
    }, [char.value, char.imagePath, url])

    return (
        <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative
            ${selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-panel' : ''}
            ${isFavorite && !selected ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-panel' : ''}
        `}>
            {url ? (
                <img src={url} alt={char.key} className="w-full h-full object-cover" loading="lazy" />
            ) : (
                <div className={`w-full h-full flex items-center justify-center text-sm ${selected ? 'bg-primary text-white' : 'bg-elevated text-text-dim'}`}>
                    {char.key[0]}
                </div>
            )}

            {/* 选中状态遮罩 */}
            {selected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <span className="text-white font-bold drop-shadow-md">✓</span>
                </div>
            )}
        </div>
    )
}

export function CharacterVault() {
    const {
        characters, addedCharacters, deletedCharacters, setCharacters,
        searchQuery, setSearchQuery,
        selectedSource, setSelectedSource,
        showOnlyFavorites, toggleShowOnlyFavorites,
        favorites, toggleFavorite,
        favoriteSources, toggleSourceFavorite,
        getFilteredCharacters, getAllSources,
        loadCustomLibrary, deleteCharacter,
        boundLoras
    } = useCharacterStore()

    const { addCharacter, removeCharacter, selectedCharacters } = useGenerationStore()

    const [showSourceDropdown, setShowSourceDropdown] = useState(false)
    const [sourceSearchQuery, setSourceSearchQuery] = useState('')

    const [bindCandidate, setBindCandidate] = useState<Character | null>(null)
    const [deleteCandidate, setDeleteCandidate] = useState<Character | null>(null)

    // 加载角色数据
    useEffect(() => {
        if (characters.length === 0) {
            setCharacters(FULL_CHARACTER_DB)
        }
        loadCustomLibrary()
    }, [])

    const handleDelete = (e: React.MouseEvent, char: Character) => {
        e.stopPropagation()
        setDeleteCandidate(char)
    }

    const confirmDelete = async () => {
        if (deleteCandidate) {
            await deleteCharacter(deleteCandidate.value)
            setDeleteCandidate(null)
        }
    }

    // 分页：每次显示的角色数量，初始100个
    const [visibleCount, setVisibleCount] = useState(100)

    const filteredCharacters = useMemo(() => getFilteredCharacters(), [
        characters, addedCharacters, deletedCharacters, searchQuery, selectedSource, showOnlyFavorites, favorites
    ])

    // 限制显示数量以提升性能
    const visibleCharacters = useMemo(() =>
        filteredCharacters.slice(0, visibleCount),
        [filteredCharacters, visibleCount]
    )

    // Scroll Persistence Hook
    // Re-run restoration when characters load or filter changes significantly
    const { ref: listRef, handleScroll: handleScrollSave } = useScrollSave<HTMLDivElement>('character-vault-scroll', [filteredCharacters.length, visibleCharacters.length])

    const hasMore = filteredCharacters.length > visibleCount

    const loadMore = useCallback(() => {
        if (hasMore) {
            setVisibleCount(prev => Math.min(prev + 100, filteredCharacters.length))
        }
    }, [hasMore, filteredCharacters.length])

    // 滚动加载 (Combined with Persistence)
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Save Scroll Position
        handleScrollSave(e)

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        // 当滚动到底部 100px 内时加载更多
        if (scrollHeight - scrollTop - clientHeight < 100) {
            loadMore()
        }
    }, [loadMore, handleScrollSave])

    // 筛选条件变化时重置可见数量
    useEffect(() => {
        setVisibleCount(100)
    }, [searchQuery, selectedSource, showOnlyFavorites])

    const sources = useMemo(() => getAllSources(), [characters, addedCharacters, deletedCharacters, favoriteSources])

    const filteredSources = useMemo(() => {
        if (!sourceSearchQuery) return sources
        return sources.filter(s =>
            s.name.toLowerCase().includes(sourceSearchQuery.toLowerCase())
        )
    }, [sources, sourceSearchQuery])

    // Scroll Persistence for Source Dropdown
    const { ref: sourceListRef, handleScroll: handleSourceScroll } = useScrollSave<HTMLDivElement>('source-dropdown-scroll', [filteredSources.length, showSourceDropdown])

    // 悬停预览状态
    const [hoveredChar, setHoveredChar] = useState<Character | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [thumbnailLoading, setThumbnailLoading] = useState(false)

    // 加载缩略图
    useEffect(() => {
        let cancelled = false
        let currentUrl: string | null = null

        if (hoveredChar) {
            // 如果角色自带原图路径 (自定义角色被临时拷贝), 优先使用原图作为预览
            if (hoveredChar.imagePath) {
                currentUrl = hoveredChar.imagePath.startsWith('file://') ? hoveredChar.imagePath : `file://${hoveredChar.imagePath}`
                setThumbnailUrl(currentUrl)
                setThumbnailLoading(false)
            } else {
                setThumbnailLoading(true)
                // 动态导入缩略图服务
                import('../../services/thumbnails').then(async ({ getCharacterThumbnail, releaseThumbnail }) => {
                    if (cancelled) return
                    const url = await getCharacterThumbnail(hoveredChar.value)
                    if (cancelled) {
                        releaseThumbnail(url)
                        return
                    }
                    currentUrl = url
                    setThumbnailUrl(url)
                    setThumbnailLoading(false)
                }).catch(() => {
                    if (!cancelled) {
                        setThumbnailLoading(false)
                    }
                })
            }
        } else {
            setThumbnailUrl(null)
            setThumbnailLoading(false)
        }

        return () => {
            cancelled = true
            // 清理旧的 Blob URL (只有当它不是本地文件协议时才需要 revoke)
            if (currentUrl && !currentUrl.startsWith('file://')) {
                import('../../services/thumbnails').then(({ releaseThumbnail }) => {
                    releaseThumbnail(currentUrl!)
                })
            }
        }
    }, [hoveredChar])

    // 点击切换选择状态
    const handleCharacterClick = (char: Character) => {
        if (selectedCharacters.includes(char.value)) {
            removeCharacter(char.value)
        } else {
            addCharacter(char.value)
        }
    }

    // 鼠标移动更新位置
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY })
    }

    return (
        <div className="h-full flex flex-col">
            <BindLoraDialog
                open={!!bindCandidate}
                onOpenChange={(open) => !open && setBindCandidate(null)}
                character={bindCandidate}
            />
            <DeleteConfirmDialog
                open={!!deleteCandidate}
                onOpenChange={(open) => !open && setDeleteCandidate(null)}
                onConfirm={confirmDelete}
                characterName={deleteCandidate?.key || ''}
                isCustom={deleteCandidate?.isCustom || false}
            />
            <div className="p-3 space-y-2">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索角色..."
                            className="w-full bg-app border border-border-default rounded-lg pl-10 pr-4 py-2 text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:border-primary"
                        />
                    </div>
                    <AddCharacterDialog />
                </div>
                {/* 筛选器 */}
                <div className="flex gap-2">
                    {/* 作品选择器 */}
                    <div className="relative flex-1">
                        <button
                            onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-app border border-border-default rounded-lg text-sm text-text-muted hover:border-border-default transition-colors"
                        >
                            <span className="truncate">
                                {selectedSource === 'all' ? `全部 (${characters.length})` : selectedSource}
                            </span>
                            <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        </button>

                        {/* 作品下拉菜单 */}
                        {showSourceDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border-default rounded-lg shadow-xl z-20 max-h-64 overflow-hidden">
                                <div className="p-2 border-b border-border-subtle">
                                    <input
                                        type="text"
                                        value={sourceSearchQuery}
                                        onChange={(e) => setSourceSearchQuery(e.target.value)}
                                        placeholder="搜索作品..."
                                        className="w-full bg-app border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                                        autoFocus
                                    />
                                </div>
                                <div
                                    ref={sourceListRef}
                                    onScroll={handleSourceScroll}
                                    className="max-h-48 overflow-y-auto"
                                >
                                    <button
                                        onClick={() => { setSelectedSource('all'); setShowSourceDropdown(false) }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-elevated ${selectedSource === 'all' ? 'text-primary bg-primary/10' : 'text-text-muted'
                                            }`}
                                    >
                                        全部作品
                                    </button>
                                    {filteredSources.map(source => (
                                        <div
                                            key={source.name}
                                            className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-elevated cursor-pointer ${selectedSource === source.name ? 'text-primary bg-primary/10' : 'text-text-muted'
                                                }`}
                                            onClick={() => { setSelectedSource(source.name); setShowSourceDropdown(false) }}
                                        >
                                            <span className={`truncate ${favoriteSources.includes(source.name) ? 'text-amber-500 font-medium' : ''}`}>
                                                {source.name} ({source.count})
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSourceFavorite(source.name) }}
                                                className="ml-2"
                                            >
                                                <Star className={`w-4 h-4 ${favoriteSources.includes(source.name) ? 'fill-warning text-warning' : ''}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 收藏筛选 */}
                    <button
                        onClick={toggleShowOnlyFavorites}
                        className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 transition-colors ${showOnlyFavorites
                            ? 'bg-warning/10 border-warning text-warning'
                            : 'bg-app border-border-default text-text-muted hover:border-border-default'
                            }`}
                    >
                        <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 角色列表 */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
            >
                {filteredCharacters.length === 0 ? (
                    <div className="p-4 text-center text-text-dim text-sm">
                        暂无匹配的角色
                    </div>
                ) : (
                    <>
                        {visibleCharacters.map(char => (
                            <div
                                key={char.value}
                                className={`flex items-center gap-3 px-3 py-2 hover:bg-elevated cursor-pointer border-b border-border-subtle transition-colors group/item ${selectedCharacters.includes(char.value)
                                    ? 'bg-primary/10 border-l-2 border-l-primary'
                                    : ''
                                    }`}
                                onClick={() => handleCharacterClick(char)}
                                onMouseEnter={() => setHoveredChar(char)}
                                onMouseLeave={() => setHoveredChar(null)}
                                onMouseMove={handleMouseMove}
                                title={char.key}  // 完整名称的 tooltip
                            >
                                <CharacterAvatar
                                    char={char}
                                    selected={selectedCharacters.includes(char.value)}
                                    isFavorite={favorites.includes(char.value)}
                                />

                                {/* 名称与描述 */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="text-sm text-text-main flex items-center gap-1 min-w-0 w-full" title={char.key}>
                                        <span className="truncate">
                                            {char.key.split('（')[0].split('(')[0].trim()}
                                        </span>
                                        {char.isCustom && <span className="text-[10px] bg-primary/20 text-primary px-1 flex-shrink-0 rounded">自定义</span>}
                                    </div>
                                    <div className="text-xs text-text-dim truncate w-full">
                                        {char.source}
                                    </div>
                                </div>

                                {/* 悬浮操作按钮 */}
                                <div className="hidden group-hover/item:flex items-center gap-1 bg-elevated pl-1">
                                    {/* 绑定 LoRA */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBindCandidate(char) }}
                                        className="p-1 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                        title={boundLoras[char.value]?.length > 0 ? `已绑定: ${boundLoras[char.value].map((l: any) => l.name).join(', ')}` : "绑定专属 LoRA"}
                                    >
                                        <LinkIcon className={`w-4 h-4 ${boundLoras[char.value]?.length > 0 ? 'text-primary' : 'text-text-dim'}`} />
                                    </button>

                                    {/* 删除按钮 */}
                                    <button
                                        onClick={(e) => handleDelete(e, char)}
                                        className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                                        title="删除/隐藏"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {/* 收藏按钮 */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(char.value) }}
                                        className="p-1"
                                    >
                                        <Star className={`w-4 h-4 ${favorites.includes(char.value) ? 'fill-warning text-warning' : 'text-text-dim'}`} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* 加载更多按钮 */}
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                className="w-full py-3 text-sm text-primary hover:bg-elevated transition-colors"
                            >
                                加载更多 ({visibleCount} / {filteredCharacters.length})
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* 底部统计 */}
            <div className="p-2 border-t border-border-subtle text-xs text-text-dim text-center">
                {filteredCharacters.length} / {characters.length} 角色
            </div>

            {/* 悬停预览浮层 - 固定尺寸 */}
            {
                hoveredChar && (
                    <div
                        className="fixed z-50 pointer-events-none bg-panel border border-border-default rounded-lg shadow-2xl p-3"
                        style={{
                            width: 200,
                            left: Math.min(mousePos.x + 15, window.innerWidth - 220),
                            top: Math.min(mousePos.y + 10, window.innerHeight - 320)
                        }}
                    >
                        {/* 预览图 - 固定尺寸 */}
                        <div
                            className="bg-elevated rounded-lg mb-2 flex items-center justify-center overflow-hidden"
                            style={{ width: 176, height: 200 }}
                        >
                            {thumbnailLoading ? (
                                <div className="animate-pulse text-text-dim text-sm">加载中...</div>
                            ) : thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt={hoveredChar.key}
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                <span className="text-5xl text-text-dim">{hoveredChar.key[0]}</span>
                            )}
                        </div>
                        <div className="text-sm text-text-main font-medium leading-tight">
                            {hoveredChar.key}
                        </div>
                        <div className="text-xs text-primary mt-1">
                            {hoveredChar.value}
                        </div>
                        <div className="text-xs text-text-dim mt-1">
                            {hoveredChar.source}
                        </div>
                    </div>
                )
            }
        </div >
    )
}
