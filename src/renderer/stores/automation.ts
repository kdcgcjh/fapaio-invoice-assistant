import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FillResult, InvoiceField } from '@shared/types'
import { ElMessage } from 'element-plus'

export const useAutomationStore = defineStore('automation', () => {
  // 状态
  const running = ref(false)
  const currentSystem = ref('')
  const logs = ref<string[]>([])

  // 方法
  const fillInvoice = async (systemId: string, invoice: InvoiceField) => {
    running.value = true
    currentSystem.value = systemId
    logs.value = []

    try {
      addLog(`开始填写 ${systemId} 系统...`)
      const result = await window.electronAPI.fillInvoice(systemId, invoice)

      if (result.success) {
        addLog(`✅ ${result.message}`)
        if (result.draftId) {
          addLog(`📄 草稿编号: ${result.draftId}`)
        }
        ElMessage.success(result.message)
      } else {
        addLog(`❌ ${result.message}`)
        ElMessage.error(result.message)
      }

      // 如果有截图，显示截图路径
      if (result.screenshot) {
        addLog(`📷 截图已保存: ${result.screenshot}`)
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      addLog(`❌ 操作失败: ${message}`)
      ElMessage.error(message)
      throw error
    } finally {
      running.value = false
      currentSystem.value = ''
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    logs.value.push(`[${timestamp}] ${message}`)

    // 保持日志数量在合理范围内
    if (logs.value.length > 100) {
      logs.value.shift()
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  return {
    // 状态
    running,
    currentSystem,
    logs,

    // 方法
    fillInvoice,
    addLog,
    clearLogs
  }
})