export interface InvoiceField {
  invoiceCode: string          // 发票代码
  invoiceNumber: string        // 发票号码
  invoiceDate: string          // 开票日期
  checkCode: string            // 校验码
  buyerName: string            // 购买方名称
  buyerTaxId: string           // 购买方税号
  sellerName: string           // 销售方名称
  sellerTaxId: string          // 销售方税号
  totalAmount: number          // 合计金额
  taxAmount: number            // 税额
  totalWithTax: number         // 价税合计
  invoiceType: string          // 发票类型
  items: InvoiceItem[]         // 明细行
  confidence: number           // 整体置信度
}

export interface InvoiceItem {
  name: string                 // 货物/服务名称
  specification: string        // 规格型号
  unit: string                 // 单位
  quantity: number             // 数量
  unitPrice: number            // 单价
  amount: number               // 金额
  taxRate: string              // 税率
  tax: number                  // 税额
}

export interface SystemConfig {
  id: string
  name: string
  loginUrl: string
  type: 'erp' | 'reimburse' | 'tax' | 'custom'
  loginStrategy: 'form' | 'sso' | 'cas'
}

export interface FillResult {
  success: boolean
  message: string
  screenshot?: string
  draftId?: string
  error?: string
}

export interface OcrResult {
  source: 'glm-ocr'
  data: InvoiceField
  processTime: number
}

export interface AppConfig {
  glmApiKey: string
  ocrMode: 'glm-ocr'
  systems: SystemConfig[]
  credentials: Record<string, Credential>
}

export interface Credential {
  username: string
  password: string
  encrypted: boolean
}

export interface InvoiceRecord {
  id?: number
  invoiceCode: string
  invoiceNumber: string
  invoiceDate: string
  invoiceType: string
  buyerName: string
  buyerTaxId: string
  sellerName: string
  sellerTaxId: string
  totalAmount: number
  taxAmount: number
  totalWithTax: number
  checkCode: string
  ocrSource: string
  ocrConfidence: number
  ocrRawJson: string
  imagePath: string
  status: 'recognized' | 'validated' | 'submitted' | 'approved' | 'rejected'
  erpDraftId?: string
  submitTime?: string
  createdAt?: string
  updatedAt?: string
}

export interface OperationLog {
  id?: number
  invoiceId?: number
  action: string
  targetSystem?: string
  result: string
  detail?: string
  screenshotPath?: string
  operator?: string
  createdAt?: string
}

export interface ElectronAPI {
  // OCR相关
  recognizeInvoice: (imagePath: string) => Promise<OcrResult>

  // 数据库相关
  getInvoices: () => Promise<InvoiceRecord[]>
  saveInvoice: (invoice: InvoiceRecord) => Promise<number>
  updateInvoice: (id: number, invoice: InvoiceRecord) => Promise<boolean>
  deleteInvoice: (id: number) => Promise<boolean>

  // 自动化相关
  fillInvoice: (systemId: string, invoice: InvoiceField) => Promise<FillResult>

  // 配置相关
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<boolean>

  // 文件操作
  selectImage: () => Promise<string | null>
  openImage: (path: string) => Promise<void>

  // 事件监听
  onMenuAction: (callback: () => void) => void
  onAbout: (callback: () => void) => void

  // 移除监听
  removeAllListeners: (channel: string) => void
}