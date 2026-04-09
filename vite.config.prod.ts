import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 生产模式专用配置
 * 用于构建前端资源（不包含 electron 插件）
 */
export default defineConfig({
    plugins: [react()],
    base: './', // 使用相对路径
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: 'dist'
    }
})
