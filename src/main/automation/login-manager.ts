import { Page } from 'playwright'
import { BrowserPool } from './browser-pool'
import { getDecryptedCredential } from '../utils/crypto'
import { SystemConfig } from '@shared/types'

// 集团常见系统配置
export const SYSTEMS: SystemConfig[] = [
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
]

export class LoginManager {
  private browserPool: BrowserPool

  constructor(browserPool?: BrowserPool) {
    this.browserPool = browserPool || (new BrowserPool())
  }

  // 统一登录入口
  async login(systemId: string): Promise<Page> {
    const system = SYSTEMS.find(s => s.id === systemId)
    if (!system) throw new Error(`未知系统: ${systemId}`)

    const page = await this.browserPool.newPage(systemId)

    try {
      // 先尝试直接访问（可能session还有效）
      await page.goto(system.loginUrl, { waitUntil: 'networkidle', timeout: 15000 })

      const needLogin = await this.checkNeedLogin(page, system)
      if (needLogin) {
        const credentials = await getDecryptedCredential(systemId)
        if (!credentials) {
          throw new Error(`未找到${system.name}的登录凭据`)
        }

        await this.performLogin(page, system, credentials)
        await this.browserPool.saveSession(systemId)
      }

      return page
    } catch (error) {
      await page.close()
      throw error
    }
  }

  private async checkNeedLogin(page: Page, system: SystemConfig): Promise<boolean> {
    // 检查是否在登录页面
    const url = page.url()

    // 通用登录页面标识
    const loginIndicators = [
      'login', 'cas', 'sso', 'auth', 'signin'
    ]

    const isLoginPage = loginIndicators.some(indicator =>
      url.toLowerCase().includes(indicator)
    )

    if (isLoginPage) return true

    // 检查页面内容
    try {
      // 查找登录相关的元素
      const loginElements = await page.locator('input[type="password"], #username, #password, .login-btn').count()
      return loginElements > 0
    } catch {
      return false
    }
  }

  private async performLogin(
    page: Page,
    system: SystemConfig,
    credentials: { username: string; password: string }
  ): Promise<void> {
    console.log(`Logging into ${system.name}...`)

    switch (system.loginStrategy) {
      case 'form':
        await this.formLogin(page, credentials)
        break
      case 'cas':
        await this.casLogin(page, credentials)
        break
      case 'sso':
        await this.ssoLogin(page, credentials)
        break
    }

    // 等待登录完成
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 })
  }

  private async formLogin(page: Page, cred: { username: string; password: string }): Promise<void> {
    // 通用表单登录——自动探测输入框
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="loginName"]',
      '#username',
      '#user',
      'input[placeholder*="用户名"]',
      'input[placeholder*="账号"]'
    ]

    const passwordSelectors = [
      'input[name="password"]',
      'input[name="pwd"]',
      'input[type="password"]',
      '#password',
      'input[placeholder*="密码"]'
    ]

    // 查找并填写用户名
    const usernameSelector = await this.findFirstSelector(page, usernameSelectors)
    await page.fill(usernameSelector, cred.username)

    // 查找并填写密码
    const passwordSelector = await this.findFirstSelector(page, passwordSelectors)
    await page.fill(passwordSelector, cred.password)

    // 点击登录按钮
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '.login-btn',
      '#loginBtn',
      '.btn-login',
      'button:has-text("登录")',
      'button:has-text("登 录")'
    ]

    const submitSelector = await this.findFirstSelector(page, submitSelectors)
    await page.click(submitSelector)
  }

  private async casLogin(page: Page, cred: { username: string; password: string }): Promise<void> {
    // CAS统一认证登录
    await page.fill('#username', cred.username)
    await page.fill('#password', cred.password)

    // CAS常见的提交按钮
    const submitBtn = await page.locator('.btn-submit, button[type="submit"], input[type="submit"]').first()
    await submitBtn.click()
  }

  private async ssoLogin(page: Page, cred: { username: string; password: string }): Promise<void> {
    // SSO单点登录
    const usernameInput = await page.locator('input[name="username"], #username').first()
    const passwordInput = await page.locator('input[name="password"], #password').first()

    await usernameInput.fill(cred.username)
    await passwordInput.fill(cred.password)

    const loginBtn = await page.locator('#loginButton, .sso-login-btn, button[type="submit"]').first()
    await loginBtn.click()
  }

  private async findFirstSelector(page: Page, selectors: string[]): Promise<string> {
    for (const selector of selectors) {
      const element = await page.$(selector)
      if (element) {
        return selector
      }
    }
    throw new Error(`无法找到匹配的元素: ${selectors.join(', ')}`)
  }
}