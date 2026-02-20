import { Page } from 'playwright'
import { InvoiceField, FillResult } from '@shared/types'
import { LoginManager } from '../login-manager'
import { join } from 'path'
import { ensureDirSync } from 'fs-extra'
import { getAppDataPath } from '../../utils/env'

export async function fillTaxInvoice(
  invoice: InvoiceField,
  loginManager: LoginManager
): Promise<FillResult> {
  const page = await loginManager.login('tax_platform')
  const screenshotsDir = join(getAppDataPath(), 'screenshots')
  ensureDirSync(screenshotsDir)

  try {
    // 1. 导航到发票认证页面
    await page.goto('https://tax.internal.sgcc.com.cn/certify', {
      waitUntil: 'networkidle'
    })

    // 2. 选择认证类型：进项发票认证
    await page.click('#inputCertify')

    // 3. 填写发票基本信息
    await page.fill('#invoiceCode', invoice.invoiceCode)
    await page.fill('#invoiceNumber', invoice.invoiceNumber)
    await page.fill('#invoiceDate', invoice.invoiceDate)
    await page.selectOption('#invoiceType',
      invoice.invoiceType === '增值税专用发票' ? 'special' : 'normal'
    )

    // 4. 填写销售方信息
    await page.fill('#sellerName', invoice.sellerName)
    await page.fill('#sellerTaxId', invoice.sellerTaxId)

    // 5. 填写金额信息
    await page.fill('#totalAmount', String(invoice.totalAmount))
    await page.fill('#taxAmount', String(invoice.taxAmount))
    await page.fill('#totalWithTax', String(invoice.totalWithTax))

    // 6. 填写校验码（如果有）
    if (invoice.checkCode) {
      await page.fill('#checkCode', invoice.checkCode)
    }

    // 7. 执行认证
    await page.click('#certifyBtn')

    // 8. 等待认证结果
    await page.waitForSelector('.certify-result', { timeout: 30000 })

    // 9. 检查认证结果
    const resultText = await page.textContent('.certify-result')
    const isSuccess = resultText?.includes('认证成功') || resultText?.includes('一致')

    // 10. 截图留证
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `tax_${timestamp}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    if (isSuccess) {
      // 11. 保存认证记录
      await page.click('#saveRecord')
      await page.waitForSelector('.save-success', { timeout: 10000 })

      return {
        success: true,
        message: '税务系统认证成功',
        screenshot: screenshotPath
      }
    } else {
      return {
        success: false,
        message: `税务认证失败: ${resultText}`,
        screenshot: screenshotPath
      }
    }

  } catch (error) {
    // 失败截图
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `tax_error_${timestamp}.png`)
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true })
    } catch {}

    return {
      success: false,
      message: `税务系统操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
      screenshot: screenshotPath,
      error: error instanceof Error ? error.stack : undefined
    }
  }
}