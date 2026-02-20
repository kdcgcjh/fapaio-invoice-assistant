import { readFileSync } from 'fs'
import { extname } from 'path'
import { InvoiceField } from '@shared/types'
import { handleConfig } from '../utils/config'

const SYSTEM_PROMPT = `你是专业的发票识别专家。请从图片中精确提取发票的所有字段信息，以严格的JSON格式返回。

要求：
1. 金额字段返回数字类型，保留两位小数
2. 日期格式统一为YYYY-MM-DD
3. 发票类型准确识别：增值税专用发票、增值税普通发票、增值税电子发票等
4. confidence字段为0-1之间的浮点数，表示整体识别置信度
5. 如果某字段无法识别，返回空字符串或0
6. 电力行业常见项目：电费、电力工程服务、电力设备、变压器、电缆等，请准确识别

返回格式示例：
{
  "invoiceCode": "011001900111",
  "invoiceNumber": "12345678",
  "invoiceDate": "2024-01-01",
  "checkCode": "1234",
  "buyerName": "国家电网有限公司",
  "buyerTaxId": "91110000100000000X",
  "sellerName": "某某电力设备有限公司",
  "sellerTaxId": "91110000MA001234XY",
  "totalAmount": 10000.00,
  "taxAmount": 1300.00,
  "totalWithTax": 11300.00,
  "invoiceType": "增值税专用发票",
  "items": [
    {
      "name": "电力设备",
      "specification": "XX型号",
      "unit": "台",
      "quantity": 1,
      "unitPrice": 10000.00,
      "amount": 10000.00,
      "taxRate": "13%",
      "tax": 1300.00
    }
  ],
  "confidence": 0.95
}`

export async function recognizeInvoice(imagePath: string): Promise<InvoiceField> {
  const config = handleConfig.get()

  if (!config.glmApiKey) {
    throw new Error('GLM API密钥未配置，请先在设置中配置API密钥')
  }

  // 读取图片并转换为base64
  const imageBuffer = readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = extname(imagePath).slice(1)
  const mimeType = ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg'

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.glmApiKey}`
      },
      body: JSON.stringify({
        model: 'glm-ocr',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` }
              },
              {
                type: 'text',
                text: '请识别这张发票的全部信息，以JSON格式返回。'
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GLM API错误: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('GLM API返回内容为空')
    }

    // 提取JSON（兼容markdown code block包裹的情况）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content]

    try {
      const result: InvoiceField = JSON.parse(jsonMatch[1] || content)

      // 验证必要字段
      if (!result.invoiceCode || !result.invoiceNumber) {
        throw new Error('未能识别出发票代码或发票号码')
      }

      return result
    } catch (parseError) {
      console.error('Failed to parse OCR result:', content)
      throw new Error('OCR结果解析失败，请确保图片清晰')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('GLM-OCR识别失败，请检查网络连接')
  }
}