import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron'
                    }
                }
            }
        ])
    ],
    base: './', // 使用相对路径，确保打包后资源能正确加载
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: 'dist'
    }
})
