// 全局类型声明

declare module '*.png'


// Electron API 类型（由 preload 脚本暴露）
interface ElectronAPI {
    minimizeWindow: () => void
    maximizeWindow: () => void
    closeWindow: () => void
    openOutputFolder: (path?: string) => void
    saveImage: (imageUrl: string) => Promise<string | null>
    selectDirectory: () => Promise<string | null>
    saveImageToFolder: (imageUrl: string, rootDir: string, subFolder: string, fileName: string) => Promise<boolean>
    showOpenDialog: (options: any) => Promise<{ canceled: boolean, filePaths: string[] }>
    copyCharacterImage: (sourcePath: string) => Promise<string | null>
    readImageFromClipboard: () => Promise<{ success: boolean, filePath?: string }>
    selectImage: () => Promise<string | null>
    saveCharacterImage: (sourcePath: string, charValue: string) => Promise<string | null>
    saveImageBuffer: (base64Data: string, charValue: string, ext?: string) => Promise<string | null>
    loadCustomCharacters: () => Promise<{ added: any[], deleted: string[] }>
    saveCustomCharacters: (data: { added: any[], deleted: string[] }) => Promise<boolean>
    deleteCharacterImage: (imagePath: string) => Promise<boolean>
    getUserDataPath: () => Promise<string>
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}

export { }
