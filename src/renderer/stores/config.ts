import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppConfig, SystemConfig, Credential } from '@shared/types'
import { ElMessage } from 'element-plus'

export const useConfigStore = defineStore('config', () => {
  // 状态
  const config = ref<AppConfig>({
    glmApiKey: '',
    ocrMode: 'glm-ocr',
    systems: [
      {
        id: 'erp_sap',
        name: 'SAP ERP',
        loginUrl: 'https://erp.internal.sgcc.com.cn/login',
        type: 'erp',
        loginStrategy: 'form'
      },
      {
        id: 'reimburse',
        name: '费用报销系统',
        loginUrl: 'https://expense.internal.sgcc.com.cn/',
        type: 'reimburse',
        loginStrategy: 'cas'
      },
      {
        id: 'tax_platform',
        name: '税务管理平台',
        loginUrl: 'https://tax.internal.sgcc.com.cn/',
        type: 'tax',
        loginStrategy: 'sso'
      }
    ],
    credentials: {}
  })

  const loading = ref(false)

  // 方法
  const loadConfig = async () => {
    loading.value = true
    try {
      config.value = await window.electronAPI.getConfig()
    } catch (error) {
      ElMessage.error('加载配置失败')
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const saveConfig = async () => {
    loading.value = true
    try {
      const success = await window.electronAPI.saveConfig(config.value)
      if (success) {
        ElMessage.success('配置保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      ElMessage.error('保存配置失败')
      console.error(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateApiKey = (apiKey: string) => {
    config.value.glmApiKey = apiKey
  }

  const updateOcrMode = (mode: 'glm-ocr') => {
    config.value.ocrMode = mode
  }

  const updateSystem = (systemId: string, updates: Partial<SystemConfig>) => {
    const system = config.value.systems.find(s => s.id === systemId)
    if (system) {
      Object.assign(system, updates)
    }
  }

  const saveCredential = (systemId: string, credential: Credential) => {
    config.value.credentials[systemId] = credential
  }

  const removeCredential = (systemId: string) => {
    delete config.value.credentials[systemId]
  }

  const getCredential = (systemId: string) => {
    return config.value.credentials[systemId]
  }

  return {
    // 状态
    config,
    loading,

    // 方法
    loadConfig,
    saveConfig,
    updateApiKey,
    updateOcrMode,
    updateSystem,
    saveCredential,
    removeCredential,
    getCredential
  }
})