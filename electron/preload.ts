import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // 文件操作
    openOutputFolder: (path?: string) => ipcRenderer.send('open-output-folder', path),
    saveImage: (imageUrl: string) => ipcRenderer.invoke('save-image', imageUrl),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    saveImageToFolder: (imageUrl: string, rootDir: string, subFolder: string, fileName: string) =>
        ipcRenderer.invoke('save-image-to-folder', imageUrl, rootDir, subFolder, fileName),

    selectImage: () => ipcRenderer.invoke('select-image'),
    saveCharacterImage: (sourcePath: string, charValue: string) => ipcRenderer.invoke('save-character-image', sourcePath, charValue),
    saveImageBuffer: (base64Data: string, charValue: string, ext?: string) => ipcRenderer.invoke('save-image-buffer', base64Data, charValue, ext),
    saveCustomCharacters: (data: { added: any[], deleted: string[] }) => ipcRenderer.invoke('save-custom-characters', data),
    loadCustomCharacters: () => ipcRenderer.invoke('load-custom-characters'),
    deleteCharacterImage: (imagePath: string) => ipcRenderer.invoke('delete-character-image', imagePath),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    getThumbsPath: () => ipcRenderer.invoke('get-thumbs-path'),
    showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
    copyCharacterImage: (sourcePath: string) => ipcRenderer.invoke('copy-character-image', sourcePath),
    readImageFromClipboard: () => ipcRenderer.invoke('read-image-from-clipboard'),
})

// 类型声明
declare global {
    interface Window {
        electronAPI: {
            minimizeWindow: () => void
            maximizeWindow: () => void
            closeWindow: () => void
            openOutputFolder: () => void
            saveImage: (imageUrl: string) => Promise<string | null>
            // Character Management
            showOpenDialog: (options: any) => Promise<{ canceled: boolean, filePaths: string[] }>
            copyCharacterImage: (sourcePath: string) => Promise<string | null>
            readImageFromClipboard: () => Promise<{ success: boolean, filePath?: string }>
            selectImage: () => Promise<string | null>
            saveCharacterImage: (sourcePath: string, charValue: string) => Promise<string | null>
            saveImageBuffer: (base64Data: string, charValue: string, ext?: string) => Promise<string | null>
            deleteCharacterImage: (imagePath: string) => Promise<boolean>
            loadCustomCharacters: () => Promise<{ added: any[], deleted: string[] }>
            saveCustomCharacters: (data: { added: any[], deleted: string[] }) => Promise<boolean>
            getUserDataPath: () => Promise<string>
            getThumbsPath: () => Promise<string>
        }
    }
}

