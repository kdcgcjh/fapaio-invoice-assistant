import { Page } from 'playwright'
import { InvoiceField, FillResult } from '@shared/types'
import { LoginManager } from '../login-manager'
import { join } from 'path'
import { ensureDirSync } from 'fs-extra'
import { getAppDataPath } from '../../utils/env'

export async function fillReimburseInvoice(
  invoice: InvoiceField,
  loginManager: LoginManager
): Promise<FillResult> {
  const page = await loginManager.login('reimburse')
  const screenshotsDir = join(getAppDataPath(), 'screenshots')
  ensureDirSync(screenshotsDir)

  try {
    // 1. 导航到报销申请页面
    await page.goto('https://expense.internal.sgcc.com.cn/apply/new', {
      waitUntil: 'networkidle'
    })

    // 2. 选择报销类型：发票报销
    await page.selectOption('#expenseType', 'invoice')

    // 3. 上传发票图片（如果有）
    const uploadInput = page.locator('input[type="file"]')
    if (await uploadInput.isVisible()) {
      // 这里需要处理文件上传，暂时跳过
      console.log('Invoice upload skipped')
    }

    // 4. 填写发票信息
    await page.fill('#invoiceCode', invoice.invoiceCode)
    await page.fill('#invoiceNumber', invoice.invoiceNumber)
    await page.fill('#invoiceDate', invoice.invoiceDate)

    // 5. 填写销售方信息
    await page.fill('#vendorName', invoice.sellerName)
    await page.fill('#vendorTaxId', invoice.sellerTaxId)

    // 6. 填写金额
    await page.fill('#totalAmount', String(invoice.totalWithTax))

    // 7. 选择费用类别（根据发票内容智能判断）
    let expenseCategory = 'other'
    const itemName = invoice.items[0]?.name.toLowerCase()
    if (itemName?.includes('电费') || itemName?.includes('电力')) {
      expenseCategory = 'electricity'
    } else if (itemName?.includes('设备') || itemName?.includes('器材')) {
      expenseCategory = 'equipment'
    } else if (itemName?.includes('服务') || itemName?.includes('维修')) {
      expenseCategory = 'service'
    }
    await page.selectOption('#expenseCategory', expenseCategory)

    // 8. 填写说明
    const description = `${invoice.invoiceType} - ${invoice.items.map(item => item.name).join('、')}`
    await page.fill('#description', description)

    // 9. 截图留证
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `reimburse_${timestamp}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    // 10. 保存草稿
    await page.click('#saveDraft')
    await page.waitForSelector('.toast-success', { timeout: 10000 })

    const successMsg = await page.textContent('.toast-success')
    const draftIdMatch = successMsg?.match(/单号[：:]?\s*(\w+)/)
    const draftId = draftIdMatch ? draftIdMatch[1] : undefined

    return {
      success: true,
      message: '报销系统录入成功（草稿）',
      screenshot: screenshotPath,
      draftId
    }

  } catch (error) {
    // 失败截图
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `reimburse_error_${timestamp}.png`)
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true })
    } catch {}

    return {
      success: false,
      message: `报销系统录入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      screenshot: screenshotPath,
      error: error instanceof Error ? error.stack : undefined
    }
  }
}