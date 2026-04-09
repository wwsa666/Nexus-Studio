/**
 * 缩略图服务
 * 从 thumbs_data.js 加载角色预览图
 * 使用 MD5 哈希匹配角色 value，解压 gzip base64 编码的 webp 图片
 */

// 全局缩略图数据库（由 thumbs_data.js 填充）
declare global {
    interface Window {
        THUMBS_DB?: Record<string, string>
    }
}

let thumbsLoaded = false
let thumbsLoading = false
let loadCallbacks: (() => void)[] = []

// 缓存已解析的 Blob URL，防止组件切换时销毁重建导致闪烁
const thumbnailCache = new Map<string, string>()

export function getCachedThumbnail(characterValue: string): string | null {
    return thumbnailCache.get(characterValue) || null
}

/**
 * 加载缩略图数据库
 */
export async function loadThumbsDatabase(): Promise<boolean> {
    if (thumbsLoaded && window.THUMBS_DB) {
        return true
    }

    if (thumbsLoading) {
        return new Promise((resolve) => {
            loadCallbacks.push(() => resolve(thumbsLoaded))
        })
    }

    thumbsLoading = true

    return new Promise((resolve) => {
        // 尝试从原始应用目录加载
        // 从 public 目录加载
        const script = document.createElement('script')
        script.src = './thumbs_data.js'
        script.async = true

        script.onload = () => {
            if (window.THUMBS_DB) {
                thumbsLoaded = true
                console.log('[Thumbs] Loaded database with', Object.keys(window.THUMBS_DB).length, 'entries')
            } else {
                console.warn('[Thumbs] Script loaded but THUMBS_DB not found')
            }
            thumbsLoading = false
            loadCallbacks.forEach(cb => cb())
            loadCallbacks = []
            resolve(thumbsLoaded)
        }

        script.onerror = () => {
            console.error('[Thumbs] Failed to load thumbs_data.js')
            thumbsLoading = false
            loadCallbacks.forEach(cb => cb())
            loadCallbacks = []
            resolve(false)
        }

        document.body.appendChild(script)
    })
}

/**
 * 简单的 MD5 哈希实现（SparkMD5 兼容）
 * 用于匹配 thumbs_data.js 中的键
 */
function md5(input: string): string {
    // 使用 Web Crypto API 的替代方案
    // 由于需要同步计算，这里使用简化的哈希
    // 实际上原应用使用 SparkMD5，我们需要相同的算法

    // 暂时使用简单的字符串哈希，后续可替换为真正的 MD5
    // 为了兼容性，我们可以动态加载 spark-md5
    if ((window as any).SparkMD5) {
        return (window as any).SparkMD5.hash(input)
    }

    // 简单哈希回退（不会匹配真正的 MD5，但可以测试流程）
    let hash = 0
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(32, '0')
}

/**
 * 加载 SparkMD5 库
 */
export async function loadSparkMD5(): Promise<boolean> {
    if ((window as any).SparkMD5) return true

    return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.0/spark-md5.min.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}

/**
 * 获取角色预览图 URL
 * @param characterValue 角色的英文名 (value 字段)
 * @returns 图片 Blob URL 或 null
 */
export async function getCharacterThumbnail(characterValue: string): Promise<string | null> {
    // 优先读取缓存
    if (thumbnailCache.has(characterValue)) {
        return thumbnailCache.get(characterValue)!
    }

    if (!window.THUMBS_DB) {
        await loadThumbsDatabase()
    }

    if (!window.THUMBS_DB) {
        return null
    }

    // 确保 SparkMD5 已加载
    await loadSparkMD5()

    // 尝试多种哈希策略（与原应用一致）
    const attempts: { key: string; hash: string }[] = []

    if (characterValue) {
        // 1. 转义后的 Value（原应用主要使用这种方式）
        const escapedValue = characterValue.trim()
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
        attempts.push({ key: 'EscapedValue', hash: md5(escapedValue) })

        // 2. 原始 Value
        attempts.push({ key: 'RawValue', hash: md5(characterValue.trim()) })
    }

    // 查找匹配的缩略图
    let compressedBase64: string | null = null

    for (const attempt of attempts) {
        if (window.THUMBS_DB[attempt.hash]) {
            compressedBase64 = window.THUMBS_DB[attempt.hash]
            break
        }
    }

    if (!compressedBase64) {
        return null
    }

    try {
        // 解码 base64
        const binaryString = atob(compressedBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        // 解压 gzip
        const ds = new DecompressionStream('gzip')
        const writer = ds.writable.getWriter()
        writer.write(bytes)
        writer.close()

        const response = new Response(ds.readable)
        const arrayBuffer = await response.arrayBuffer()

        // 创建 Blob URL 并缓存
        const blob = new Blob([arrayBuffer], { type: 'image/webp' })
        const url = URL.createObjectURL(blob)
        thumbnailCache.set(characterValue, url)
        return url
    } catch (error) {
        console.error('[Thumbs] Failed to decode image:', error)
        return null
    }
}

/**
 * 释放缩略图 URL
 */
export function releaseThumbnail(_url: string | null): void {
    // 组件切换不销毁缓存的 URL，防止闪烁
}
