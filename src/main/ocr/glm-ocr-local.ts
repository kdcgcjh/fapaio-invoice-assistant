import { execFile } from 'child_process'
import { join } from 'path'
import { getResourcesPath } from '../utils/env'
import { InvoiceField, InvoiceItem } from '@shared/types'

interface GLMResult {
  // GLM-OCR本地模型的返回格式
  invoice_code?: string
  invoice_number?: string
  invoice_date?: string
  check_code?: string
  buyer_name?: string
  buyer_tax_id?: string
  seller_name?: string
  seller_tax_id?: string
  total_amount?: number
  tax_amount?: number
  total_with_tax?: number
  invoice_type?: string
  items?: any[]
  confidence?: number
}

export async function recognizeInvoiceLocal(imagePath: string): Promise<InvoiceField> {
  const glmPath = join(getResourcesPath(), 'glm-ocr')

  // 根据平台选择可执行文件
  const executable = process.platform === 'win32'
    ? join(glmPath, 'glm-ocr.exe')
    : join(glmPath, 'glm-ocr')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('GLM-OCR recognition timeout'))
    }, 30000)

    execFile(
      executable,
      [
        '--image_path', imagePath,
        '--output_format', 'json',
        '--task', 'invoice_recognition'
      ],
      { encoding: 'utf-8' },
      (error, stdout, stderr) => {
        clearTimeout(timeout)

        if (error) {
          console.error('GLM-OCR error:', stderr)
          reject(new Error(`GLM-OCR执行失败: ${error.message}`))
          return
        }

        try {
          const raw: GLMResult = JSON.parse(stdout)

          // 转换为标准格式
          const invoice: InvoiceField = {
            invoiceCode: raw.invoice_code || '',
            invoiceNumber: raw.invoice_number || '',
            invoiceDate: raw.invoice_date || '',
            checkCode: raw.check_code || '',
            buyerName: raw.buyer_name || '',
            buyerTaxId: raw.buyer_tax_id || '',
            sellerName: raw.seller_name || '',
            sellerTaxId: raw.seller_tax_id || '',
            totalAmount: raw.total_amount || 0,
            taxAmount: raw.tax_amount || 0,
            totalWithTax: raw.total_with_tax || 0,
            invoiceType: raw.invoice_type || '',
            items: raw.items?.map(item => ({
              name: item.name || '',
              specification: item.specification || '',
              unit: item.unit || '',
              quantity: item.quantity || 0,
              unitPrice: item.unit_price || 0,
              amount: item.amount || 0,
              taxRate: item.tax_rate || '',
              tax: item.tax || 0
            })) || [],
            confidence: raw.confidence || 0
          }

          resolve(invoice)
        } catch (parseError) {
          console.error('Failed to parse GLM-OCR output:', parseError)
          reject(new Error('GLM-OCR结果解析失败'))
        }
      }
    )
  })
}

// 导出测试用的API版本
export { recognizeInvoice as recognizeInvoiceWithAPI } from './glm-ocr'