import { Page } from 'playwright'
import { InvoiceField, FillResult } from '@shared/types'
import { LoginManager } from '../login-manager'
import { join } from 'path'
import { ensureDirSync } from 'fs-extra'
import { getAppDataPath } from '../../utils/env'

export async function fillErpInvoice(
  invoice: InvoiceField,
  loginManager: LoginManager
): Promise<FillResult> {
  const page = await loginManager.login('erp_sap')
  const screenshotsDir = join(getAppDataPath(), 'screenshots')
  ensureDirSync(screenshotsDir)

  try {
    // 1. 导航到发票录入页面
    await page.goto('https://erp.internal.sgcc.com.cn/invoice/create', {
      waitUntil: 'networkidle'
    })

    // 2. 等待页面加载
    await page.waitForSelector('#invoiceForm', { timeout: 10000 })

    // 3. 选择发票类型
    const invoiceTypeSelect = page.locator('#invoiceType')
    await invoiceTypeSelect.selectOption(
      invoice.invoiceType === '增值税专用发票' ? 'special' : 'normal'
    )

    // 4. 填写发票头信息
    await page.fill('#invoiceCode', invoice.invoiceCode)
    await page.fill('#invoiceNumber', invoice.invoiceNumber)
    await page.fill('#invoiceDate', invoice.invoiceDate)
    if (invoice.checkCode) {
      await page.fill('#checkCode', invoice.checkCode)
    }

    // 5. 填写购销方信息
    await page.fill('#buyerName', invoice.buyerName)
    await page.fill('#buyerTaxId', invoice.buyerTaxId)
    await page.fill('#sellerName', invoice.sellerName)
    await page.fill('#sellerTaxId', invoice.sellerTaxId)

    // 6. 填写金额
    await page.fill('#totalAmount', String(invoice.totalAmount))
    await page.fill('#taxAmount', String(invoice.taxAmount))
    await page.fill('#totalWithTax', String(invoice.totalWithTax))

    // 7. 填写明细行
    const itemsTable = page.locator('#itemsTable')
    for (let i = 0; i < invoice.items.length; i++) {
      if (i > 0) {
        // 新增行
        await page.click('#addItemRow')
        await page.waitForTimeout(500)
      }

      const item = invoice.items[i]
      const row = itemsTable.locator('tr').nth(i + 1) // 跳过表头

      await row.locator('input[name="itemName"]').fill(item.name)
      if (item.specification) {
        await row.locator('input[name="specification"]').fill(item.specification)
      }
      if (item.unit) {
        await row.locator('input[name="unit"]').fill(item.unit)
      }
      if (item.quantity > 0) {
        await row.locator('input[name="quantity"]').fill(String(item.quantity))
      }
      if (item.unitPrice > 0) {
        await row.locator('input[name="unitPrice"]').fill(String(item.unitPrice))
      }
      await row.locator('input[name="amount"]').fill(String(item.amount))
      if (item.taxRate) {
        await row.locator('select[name="taxRate"]').selectOption(item.taxRate)
      }
    }

    // 8. 截图留证
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `erp_${timestamp}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    // 9. 保存草稿（不直接提交）
    await page.click('#saveDraft')
    await page.waitForSelector('.success-message', { timeout: 10000 })

    const successMsg = await page.textContent('.success-message')
    const draftIdMatch = successMsg?.match(/草稿编号[：:]?\s*(\w+)/)
    const draftId = draftIdMatch ? draftIdMatch[1] : undefined

    // 记录操作日志
    await logOperation(page, 'fill_erp', 'erp_sap', 'success', {
      invoiceCode: invoice.invoiceCode,
      invoiceNumber: invoice.invoiceNumber,
      draftId
    })

    return {
      success: true,
      message: 'ERP发票录入成功（草稿）',
      screenshot: screenshotPath,
      draftId
    }

  } catch (error) {
    // 失败时也截图
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const screenshotPath = join(screenshotsDir, `erp_error_${timestamp}.png`)
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true })
    } catch {}

    // 记录错误日志
    await logOperation(page, 'fill_erp', 'erp_sap', 'fail', {
      invoiceCode: invoice.invoiceCode,
      invoiceNumber: invoice.invoiceNumber,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      success: false,
      message: `ERP填写失败: ${error instanceof Error ? error.message : '未知错误'}`,
      screenshot: screenshotPath,
      error: error instanceof Error ? error.stack : undefined
    }
  }
}

async function logOperation(
  page: Page,
  action: string,
  system: string,
  result: string,
  detail: any
): Promise<void> {
  // 这里可以调用日志记录模块，暂时只打印日志
  console.log(`[${new Date().toISOString()}] ${action} - ${system} - ${result}`, detail)
}