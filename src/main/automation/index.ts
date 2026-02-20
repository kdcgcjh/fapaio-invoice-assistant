import { FillResult, InvoiceField } from '@shared/types'
import { BrowserPool } from './browser-pool'
import { LoginManager } from './login-manager'
import { fillErpInvoice } from './scripts/erp-fill'
import { fillReimburseInvoice } from './scripts/reimburse-fill'
import { fillTaxInvoice } from './scripts/tax-fill'

const browserPool = new BrowserPool()
const loginManager = new LoginManager()

export async function initAutomation(): Promise<void> {
  await browserPool.init()
  console.log('Automation module initialized')
}

export async function destroyAutomation(): Promise<void> {
  await browserPool.destroy()
  console.log('Automation module destroyed')
}

export const handleAutomation = {
  fillInvoice: async (_: any, systemId: string, invoice: InvoiceField): Promise<FillResult> => {
    try {
      switch (systemId) {
        case 'erp_sap':
          return await fillErpInvoice(invoice, loginManager)
        case 'reimburse':
          return await fillReimburseInvoice(invoice, loginManager)
        case 'tax_platform':
          return await fillTaxInvoice(invoice, loginManager)
        default:
          throw new Error(`未知的系统ID: ${systemId}`)
      }
    } catch (error) {
      console.error('Automation error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '自动填写失败',
        error: error instanceof Error ? error.stack : undefined
      }
    }
  }
}