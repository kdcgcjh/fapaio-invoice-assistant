/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    // OCR相关
    recognizeInvoice: (imagePath: string, useAPI?: boolean) => Promise<any>

    // 数据库相关
    getInvoices: () => Promise<any[]>
    saveInvoice: (invoice: any) => Promise<number>
    updateInvoice: (id: number, invoice: any) => Promise<boolean>
    deleteInvoice: (id: number) => Promise<boolean>

    // 自动化相关
    fillInvoice: (systemId: string, invoice: any) => Promise<any>

    // 配置相关
    getConfig: () => Promise<any>
    saveConfig: (config: any) => Promise<boolean>

    // 文件操作
    selectImage: () => Promise<string | null>
    openImage: (path: string) => Promise<void>

    // 事件监听
    onMenuAction: (callback: () => void) => void
    onAbout: (callback: () => void) => void

    // 移除监听
    removeAllListeners: (channel: string) => void
  }
}