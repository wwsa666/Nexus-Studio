import { defineConfig } from 'vite'
import path from 'path'

/**
 * Electron 主进程构建配置
 */
export default defineConfig({
    build: {
        outDir: 'dist-electron',
        emptyOutDir: true,
        lib: {
            entry: {
                main: path.resolve(__dirname, 'electron/main.ts'),
                preload: path.resolve(__dirname, 'electron/preload.ts')
            },
            formats: ['cjs']
        },
        rollupOptions: {
            external: ['electron', 'path', 'fs', 'http', 'https', 'crypto'],
            output: {
                entryFileNames: '[name].js'
            }
        }
    }
})
