import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { join } from 'path'
import { getAppDataPath } from '../utils/env'
import { ensureDirSync } from 'fs-extra'

class BrowserPool {
  private browser: Browser | null = null
  private contexts: Map<string, BrowserContext> = new Map()

  async init(): Promise<void> {
    // 确保会话目录存在
    const sessionDir = join(getAppDataPath(), 'sessions')
    ensureDirSync(sessionDir)

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: true, // 默认无头模式
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors', // 集团内部系统常用自签证书
        '--disable-blink-features=AutomationControlled', // 避免被检测为自动化
        '--disable-features=VizDisplayCompositor'
      ]
    })

    console.log('Browser pool initialized')
  }

  async getContext(systemId: string): Promise<BrowserContext> {
    if (this.contexts.has(systemId)) {
      return this.contexts.get(systemId)!
    }

    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const context = await this.browser.newContext({
      // 持久化cookie，避免重复登录
      storageState: this.getStorageStatePath(systemId),
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'zh-CN'
    })

    this.contexts.set(systemId, context)
    return context
  }

  async newPage(systemId: string): Promise<Page> {
    const context = await this.getContext(systemId)
    const page = await context.newPage()

    // 设置超时时间
    page.setDefaultTimeout(30000)
    page.setDefaultNavigationTimeout(60000)

    return page
  }

  // 保存登录状态
  async saveSession(systemId: string): Promise<void> {
    const context = this.contexts.get(systemId)
    if (context) {
      const statePath = this.getStorageStatePath(systemId)
      await context.storageState({ path: statePath })
      console.log(`Session saved for ${systemId}`)
    }
  }

  // 清除会话
  async clearSession(systemId: string): Promise<void> {
    const context = this.contexts.get(systemId)
    if (context) {
      await context.clearCookies()
      await context.clearPermissions()
      await this.saveSession(systemId)
      console.log(`Session cleared for ${systemId}`)
    }
  }

  private getStorageStatePath(systemId: string): string {
    return join(getAppDataPath(), 'sessions', `${systemId}.json`)
  }

  async destroy(): Promise<void> {
    for (const [id, ctx] of this.contexts) {
      await this.saveSession(id)
      await ctx.close()
    }
    this.contexts.clear()

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }

    console.log('Browser pool destroyed')
  }
}

export { BrowserPool }