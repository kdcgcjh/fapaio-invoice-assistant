import { ipcMain, dialog } from 'electron'
import { handleOcr } from '../ocr'
import { handleDb } from '../db'
import { handleAutomation } from '../automation'
import { handleConfig } from '../utils/config'
import { handleFile } from '../utils/file'

export function initIpc(): void {
  // OCR相关
  ipcMain.handle('ocr:recognize', handleOcr.recognize)

  // 数据库相关
  ipcMain.handle('db:getInvoices', handleDb.getInvoices)
  ipcMain.handle('db:saveInvoice', handleDb.saveInvoice)
  ipcMain.handle('db:updateInvoice', handleDb.updateInvoice)
  ipcMain.handle('db:deleteInvoice', handleDb.deleteInvoice)

  // 自动化相关
  ipcMain.handle('automation:fill', handleAutomation.fillInvoice)

  // 配置相关
  ipcMain.handle('config:get', handleConfig.get)
  ipcMain.handle('config:save', handleConfig.save)

  // 文件操作
  ipcMain.handle('file:selectImage', handleFile.selectImage)
  ipcMain.handle('file:openImage', handleFile.openImage)

  console.log('IPC handlers initialized')
}