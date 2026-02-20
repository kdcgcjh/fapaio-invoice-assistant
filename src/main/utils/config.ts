import { getAppDataPath } from './env'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { AppConfig } from '@shared/types'
import { encrypt, decrypt } from './crypto'

const CONFIG_PATH = join(getAppDataPath(), 'config.json')

export const handleConfig = {
  get: (): AppConfig => {
    const defaultConfig: AppConfig = {
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
    }

    if (!existsSync(CONFIG_PATH)) {
      return defaultConfig
    }

    try {
      const data = readFileSync(CONFIG_PATH, 'utf-8')
      const config = JSON.parse(data)

      // 解密敏感信息
      if (config.credentials) {
        for (const key in config.credentials) {
          const cred = config.credentials[key]
          if (cred.encrypted) {
            cred.password = decrypt(cred.password)
          }
        }
      }

      return { ...defaultConfig, ...config }
    } catch (error) {
      console.error('Failed to load config:', error)
      return defaultConfig
    }
  },

  save: (config: AppConfig): boolean => {
    try {
      // 加密敏感信息
      const configToSave = JSON.parse(JSON.stringify(config))
      if (configToSave.credentials) {
        for (const key in configToSave.credentials) {
          const cred = configToSave.credentials[key]
          if (!cred.encrypted && cred.password) {
            cred.password = encrypt(cred.password)
            cred.encrypted = true
          }
        }
      }

      const data = JSON.stringify(configToSave, null, 2)
      writeFileSync(CONFIG_PATH, data, 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save config:', error)
      return false
    }
  }
}