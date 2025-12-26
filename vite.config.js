/**
 * Vite 构建配置文件
 *
 * 用途：配置 Chrome/Edge 扩展的多入口构建
 *
 * 关键配置说明：
 * 1. 多入口：options.html（设置页）、popup.html（弹窗）、background.js（后台服务）、content.js（内容脚本）
 * 2. 输出结构：
 *    - background.js 和 content.js 输出到 dist 根目录（符合 manifest.json 的引用路径）
 *    - options 和 popup 相关文件输出到 dist/assets/ 目录
 * 3. 开发模式标识：定义 __DEV__ 全局变量，方便条件调试日志
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Vue 3 插件支持
  plugins: [vue()],

  // 定义全局变量
  define: {
    __DEV__: mode === 'development' // 开发模式标识，用于条件编译调试日志
  },

  build: {
    outDir: 'dist', // 输出目录
    emptyOutDir: true, // 构建前清空输出目录

    rollupOptions: {
      // 多入口配置：扩展的各个组成部分
      input: {
        options: resolve(__dirname, 'options.html'),    // 设置页面
        popup: resolve(__dirname, 'popup.html'),        // 弹窗页面
        background: resolve(__dirname, 'src/background.js'), // 后台服务脚本
        content: resolve(__dirname, 'src/content.js')   // 内容脚本
      },

      output: {
        // 入口文件命名规则
        entryFileNames: (chunkInfo) => {
          // background.js 和 content.js 必须在根目录（manifest.json 引用路径）
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js'
          }
          // 其他文件放在 assets 子目录
          return 'assets/[name].js'
        },

        // 代码分块文件命名
        chunkFileNames: 'assets/[name].js',

        // 静态资源文件命名
        assetFileNames: (assetInfo) => {
          // CSS 文件统一放在 assets 目录
          if (assetInfo.name === 'options.css' || assetInfo.name === 'popup.css') {
            return 'assets/[name][extname]'
          }
          return 'assets/[name][extname]'
        }
      }
    }
  }
}))
