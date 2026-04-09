import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 前端构建配置（仅 React 应用）
 * 不使用 electron 插件，仅构建渲染进程代码
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
        outDir: 'dist',
        emptyOutDir: true
    }
})
