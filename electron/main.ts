import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, Menu, MenuItem } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'

// 开发模式下的 Vite 服务器地址
const VITE_DEV_SERVER_URL = 'http://localhost:5173'

// ComfyUI 输出目录（默认）
// ComfyUI 输出目录（默认）
const COMFYUI_OUTPUT_DIR = path.join(app.getPath('home'), 'ComfyUI', 'output')
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState() {
    try {
        if (fs.existsSync(WINDOW_STATE_FILE)) {
            const data = fs.readFileSync(WINDOW_STATE_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch { }
    return null
}

function saveWindowState(state: any) {
    try {
        fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state))
    } catch { }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
    const state = loadWindowState()
    const defaultWidth = 1400
    const defaultHeight = 900

    // 图标路径处理：生产环境和开发环境
    const iconPath = app.isPackaged
        ? path.join(app.getAppPath(), 'icon/icon.ico')
        : path.join(__dirname, '../icon/icon.ico')

    mainWindow = new BrowserWindow({
        width: state?.width || defaultWidth,
        height: state?.height || defaultHeight,
        x: state?.x,
        y: state?.y,
        minWidth: 1200,
        minHeight: 700,
        frame: false, // 无边框窗口
        backgroundColor: '#09090b',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#09090b',
            symbolColor: '#e4e4e7',
            height: 40
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // 允许跨域请求 ComfyUI
        },
        icon: iconPath
    })

    if (state?.isMaximized) {
        mainWindow.maximize()
    }

    // 开发模式加载 Vite 服务器，生产模式加载打包文件
    if (!app.isPackaged) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        // 生产模式：加载 dist/index.html (Vite 构建输出)
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
        mainWindow.loadFile(indexPath)
    }

    // 拦截请求头，解决 ComfyUI WebSocket 403 问题
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
        { urls: ['ws://*/*', 'wss://*/*'] },
        (details, callback) => {
            const url = new URL(details.url)
            if (details.url.includes('/ws') && details.url.includes('clientId=')) {
                // 将 Origin 设置为与目标服务器一致 (http/https)
                // 这欺骗 ComfyUI 认为请求来自同源，从而绕过 CORS/Origin 检查
                const targetProtocol = url.protocol === 'wss:' ? 'https:' : 'http:'
                details.requestHeaders['Origin'] = `${targetProtocol}//${url.host}`
            }
            callback({ requestHeaders: details.requestHeaders })
        }
    )

    mainWindow.on('close', () => {
        if (mainWindow) {
            const bounds = mainWindow.getBounds()
            const isMaximized = mainWindow.isMaximized()
            saveWindowState({ ...bounds, isMaximized })
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// 窗口控制 IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize()
    } else {
        mainWindow?.maximize()
    }
})
ipcMain.on('window-close', () => mainWindow?.close())

// 文件操作 IPC
ipcMain.on('open-output-folder', (_event, customPath?: string) => {
    if (customPath && fs.existsSync(customPath)) {
        shell.openPath(customPath)
        return
    }

    // 尝试打开 ComfyUI 输出目录
    if (fs.existsSync(COMFYUI_OUTPUT_DIR)) {
        shell.openPath(COMFYUI_OUTPUT_DIR)
    } else {
        // 如果目录不存在，打开用户图片目录
        shell.openPath(app.getPath('pictures'))
    }
})

// 保存图片
ipcMain.handle('save-image', async (_event, imageUrl: string) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow!, {
            defaultPath: `NexusStudio_${Date.now()}.png`,
            filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
        })

        if (!filePath) return null

        // 下载图片
        const protocol = imageUrl.startsWith('https') ? https : http
        return new Promise<string | null>((resolve) => {
            protocol.get(imageUrl, (response) => {
                const file = fs.createWriteStream(filePath)
                response.pipe(file)
                file.on('finish', () => {
                    file.close()
                    resolve(filePath)
                })
            }).on('error', () => resolve(null))
        })
    } catch {
        return null
    }
})

// 选择目录
ipcMain.handle('select-directory', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory']
        })
        if (result.canceled || result.filePaths.length === 0) {
            return null
        }
        return result.filePaths[0]
    } catch (err) {
        console.error('Save to folder failed:', err)
        return false
    }
})

// === Character Library Management ===
const CUSTOM_CHARS_FILE = path.join(app.getPath('userData'), 'custom_characters.json')
const CUSTOM_IMAGES_DIR = path.join(app.getPath('userData'), 'custom_characters', 'images')

// Helper: Ensure dirs exist
if (!fs.existsSync(CUSTOM_IMAGES_DIR)) {
    fs.mkdirSync(CUSTOM_IMAGES_DIR, { recursive: true })
}

// 1. Load Custom Characters
ipcMain.handle('load-custom-characters', async () => {
    try {
        if (fs.existsSync(CUSTOM_CHARS_FILE)) {
            const data = fs.readFileSync(CUSTOM_CHARS_FILE, 'utf8')
            return JSON.parse(data)
        }
    } catch (e) {
        console.error('Failed to load custom characters', e)
    }
    return { added: [], deleted: [] }
})

// 2. Save Custom Characters
ipcMain.handle('save-custom-characters', async (_event, data) => {
    try {
        fs.writeFileSync(CUSTOM_CHARS_FILE, JSON.stringify(data, null, 2))
        return true
    } catch (e) {
        console.error('Failed to save custom characters', e)
        return false
    }
})

// 3. Select Image
ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

// 4. Save Character Image (Resize & Convert)
import crypto from 'crypto'

ipcMain.handle('save-character-image', async (_event, sourcePath: string, charValue: string) => {
    try {
        // 使用 MD5 hash 命名
        const hash = crypto.createHash('md5').update(charValue.trim()).digest('hex')
        // 获取原图片扩展名，如果没有则默认 png
        const ext = path.extname(sourcePath).toLowerCase() || '.png'
        const targetFilename = `${hash}${ext}`

        let buffer: Buffer | null = null;

        try {
            const image = nativeImage.createFromPath(sourcePath)
            if (!image.isEmpty()) {
                // 等比例缩放，确保图像不会被强行压缩成正方形
                const size = image.getSize()
                let targetWidth = size.width
                let targetHeight = size.height

                // 以较短的边作为 256 基准，另一个边按比例缩放
                if (size.width < size.height) {
                    targetWidth = 256
                    targetHeight = Math.round((256 / size.width) * size.height)
                } else {
                    targetHeight = 256
                    targetWidth = Math.round((256 / size.height) * size.width)
                }

                const resized = image.resize({ width: targetWidth, height: targetHeight, quality: 'best' })
                buffer = (ext === '.jpg' || ext === '.jpeg') ? resized.toJPEG(90) : resized.toPNG()
            }
        } catch (err) {
            console.log('nativeImage 处理图片失败，将直接复制原文件', err)
        }

        // 如果 nativeImage 处理失败（例如遇上了不支持的 webp），直接读取原文件
        if (!buffer || buffer.length === 0) {
            buffer = fs.readFileSync(sourcePath)
        }

        const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename)
        fs.writeFileSync(finalPath, buffer)

        // Return file:// URL
        return `file://${finalPath.replace(/\\/g, '/')}`
    } catch (e) {
        console.error('保存角色图片失败:', e)
        return null
    }
})

ipcMain.handle('save-image-buffer', async (_event, base64Data: string, charValue: string, ext: string = '.png') => {
    try {
        const base64String = base64Data.replace(/^data:.*?;base64,/, "")
        const nodeBuffer = Buffer.from(base64String, 'base64')
        const hash = crypto.createHash('md5').update(charValue.trim()).digest('hex')
        const targetFilename = `${hash}${ext}`

        let finalBuffer = nodeBuffer as any as Buffer
        try {
            const image = nativeImage.createFromBuffer(nodeBuffer)
            if (!image.isEmpty()) {
                const size = image.getSize()
                let targetWidth = size.width
                let targetHeight = size.height
                if (size.width < size.height) {
                    targetWidth = 256
                    targetHeight = Math.round((256 / size.width) * size.height)
                } else {
                    targetHeight = 256
                    targetWidth = Math.round((256 / size.height) * size.width)
                }
                const resized = image.resize({ width: targetWidth, height: targetHeight, quality: 'best' })
                if (ext === '.jpg' || ext === '.jpeg') {
                    finalBuffer = resized.toJPEG(90) as any as Buffer
                } else {
                    finalBuffer = resized.toPNG() as any as Buffer
                }
            }
        } catch (err) {
            console.log('nativeImage 处理buffer失败', err)
        }

        const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename)
        fs.writeFileSync(finalPath, finalBuffer)
        return `file://${finalPath.replace(/\\/g, '/')}`
    } catch (e) {
        console.error('保存贴图失败:', e)
        return null
    }
})

// 4.1. Show Open Dialog
ipcMain.handle('show-open-dialog', async (_event, options) => {
    return await dialog.showOpenDialog(mainWindow!, options)
})

// 4.2. Copy Character Image
ipcMain.handle('copy-character-image', async (_event, sourcePath: string) => {
    try {
        const hash = crypto.createHash('md5').update(sourcePath + Date.now().toString()).digest('hex')
        const ext = path.extname(sourcePath).toLowerCase() || '.png'
        const targetFilename = `copied_${hash}${ext}`
        const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename)

        fs.copyFileSync(sourcePath, finalPath)
        return finalPath // Return raw absolute path, SettingsModal prepends local://
    } catch (e) {
        console.error('Copy character image copy failed', e)
        return null
    }
})

// 4.3. Read Image from Clipboard
import { clipboard } from 'electron'
ipcMain.handle('read-image-from-clipboard', async () => {
    try {
        const image = clipboard.readImage()
        if (image.isEmpty()) return { success: false }

        const hash = crypto.createHash('md5').update('clipboard' + Date.now().toString()).digest('hex')
        const targetFilename = `clip_${hash}.png`
        const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename)

        fs.writeFileSync(finalPath, image.toPNG())
        return { success: true, filePath: finalPath }
    } catch (e) {
        console.error('Read clipboard image failed', e)
        return { success: false }
    }
})

// 5. Delete Character Image
ipcMain.handle('delete-character-image', async (_event, imagePath: string) => {
    try {
        if (!imagePath) return false
        // Remove file:// prefix if present
        let rawPath = imagePath
        if (rawPath.startsWith('file://')) {
            rawPath = rawPath.replace('file://', '')
        }

        // Handle windows drive letters correctly from URL format (e.g. /C:/)
        if (process.platform === 'win32' && rawPath.startsWith('/')) {
            rawPath = rawPath.substring(1)
        }

        // Decode URI components in case the path contains spaces
        rawPath = decodeURIComponent(rawPath)

        if (fs.existsSync(rawPath)) {
            fs.unlinkSync(rawPath)
            return true
        }
        return false
    } catch (e) {
        console.error('删除角色图片失败:', e)
        return false
    }
})

ipcMain.handle('get-user-data-path', () => app.getPath('userData'))

ipcMain.handle('get-thumbs-path', () => {
    // thumbs_data.js is located in the root or dist-electron. We load it relative to appPath.
    // In dev: appPath is project root (H:/...). In prod: appPath is resources/app.
    // The user placed it in dist-electron.
    const thumbsPath = path.join(app.getAppPath(), 'dist-electron', 'thumbs_data.js')
    return `file://${thumbsPath.replace(/\\/g, '/')}`
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
