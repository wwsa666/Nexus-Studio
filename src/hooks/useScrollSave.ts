import { useRef, useEffect, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'

/**
 * Hook to automatically save and restore scroll position for a container.
 * @param key Unique key for this scrollable area
 * @returns Ref object to attach to the scrollable container
 */
export function useScrollSave<T extends HTMLElement>(key: string, deps: any[] = []) {
    const ref = useRef<T>(null)
    const { saveScrollPosition, getScrollPosition } = useUIStore()

    // Restore scroll position
    useEffect(() => {
        const element = ref.current
        if (!element) return

        const savedPosition = getScrollPosition(key)
        console.log(`[ScrollSave] 尝试恢复滚动位置: key=${key}, saved=${savedPosition}, current=${element.scrollTop}`)

        if (savedPosition > 0) {
            // Use requestAnimationFrame to ensure layout is ready
            requestAnimationFrame(() => {
                // If the content is not yet large enough, this assignment might fail.
                // We could retry or just hope it's ready. 
                // With deps passed (e.g. data source), this effect runs again when data loads.
                if (element.scrollHeight > element.clientHeight) {
                    element.scrollTop = savedPosition
                    console.log(`[ScrollSave] 已恢复: key=${key}, to=${savedPosition}`)
                } else {
                    console.log(`[ScrollSave] 恢复失败: 内容高度不足 key=${key}, scrollHeight=${element.scrollHeight}, clientHeight=${element.clientHeight}`)
                }
            })
        }
    }, [key, getScrollPosition, ...deps])

    // Save scroll position on scroll
    const handleScroll = useCallback((e: React.UIEvent<T>) => {
        const target = e.currentTarget
        if (getScrollPosition(key) !== target.scrollTop) {
            // console.log(`[ScrollSave] 保存: key=${key}, val=${target.scrollTop}`) // Too noisy for scroll event usually, but user asked for debug
            saveScrollPosition(key, target.scrollTop)
        }
    }, [key, saveScrollPosition, getScrollPosition])

    return { ref, handleScroll }
}
