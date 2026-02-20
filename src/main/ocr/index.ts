import { recognizeInvoiceLocal as glmLocalRecognize, recognizeInvoiceWithAPI as glmAPIRecognize } from './glm-ocr-local'
import { OcrResult, InvoiceField } from '@shared/types'
import { handleConfig } from '../utils/config'

export async function recognizeInvoice(imagePath: string, useAPI = false): Promise<OcrResult> {
  const startTime = Date.now()

  try {
    // 使用GLM-OCR（本地或API）
    if (!useAPI) {
      console.log('Using local GLM-OCR...')
      const result = await glmLocalRecognize(imagePath)
      const processTime = Date.now() - startTime

      return {
        source: 'glm-ocr',
        data: result,
        processTime
      }
    } else {
      // API模式（仅用于测试）
      console.log('Using GLM-OCR API for testing...')
      const result = await glmAPIRecognize(imagePath)
      const processTime = Date.now() - startTime

      return {
        source: 'glm-ocr',
        data: result,
        processTime
      }
    }
  } catch (error) {
    console.error('GLM-OCR recognition failed:', error)
    throw new Error('OCR识别失败，请检查图片清晰度或确保GLM-OCR模型已正确部署')
  }
}

export const handleOcr = {
  recognize: async (_: any, imagePath: string, useAPI = false): Promise<OcrResult> => {
    return await recognizeInvoice(imagePath, useAPI)
  }
}