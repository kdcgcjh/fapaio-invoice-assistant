import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI } from '@shared/types'

const electronAPI: ElectronAPI = {
  // OCR相关
  recognizeInvoice: (imagePath: string) => ipcRenderer.invoke('ocr:recognize', imagePath),

  // 数据库相关
  getInvoices: () => ipcRenderer.invoke('db:getInvoices'),
  saveInvoice: (invoice) => ipcRenderer.invoke('db:saveInvoice', invoice),
  updateInvoice: (id, invoice) => ipcRenderer.invoke('db:updateInvoice', id, invoice),
  deleteInvoice: (id) => ipcRenderer.invoke('db:deleteInvoice', id),

  // 自动化相关
  fillInvoice: (systemId, invoice) => ipcRenderer.invoke('automation:fill', systemId, invoice),

  // 配置相关
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // 文件操作
  selectImage: () => ipcRenderer.invoke('file:selectImage'),
  openImage: (path) => ipcRenderer.invoke('file:openImage', path),

  // 事件监听
  onMenuAction: (callback) => ipcRenderer.on('menu-scan-invoice', callback),
  onAbout: (callback) => ipcRenderer.on('menu-about', callback),

  // 移除监听
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)