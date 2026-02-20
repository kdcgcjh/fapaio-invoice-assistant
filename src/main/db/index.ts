import Database from 'better-sqlite3'
import { join } from 'path'
import { getAppDataPath } from '../utils/env'
import { InvoiceRecord, OperationLog } from '@shared/types'

let db: Database.Database | null = null

export function initDatabase(): void {
  const dbPath = join(getAppDataPath(), 'invoices.db')
  db = new Database(dbPath)

  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 创建数据表
  createTables()

  console.log('Database initialized:', dbPath)
}

function createTables(): void {
  if (!db) return

  // 发票主表
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      invoice_date TEXT,
      invoice_type TEXT,
      buyer_name TEXT,
      buyer_tax_id TEXT,
      seller_name TEXT,
      seller_tax_id TEXT,
      total_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_with_tax REAL DEFAULT 0,
      check_code TEXT,
      ocr_source TEXT DEFAULT 'glm-ocr',
      ocr_confidence REAL DEFAULT 0,
      ocr_raw_json TEXT,
      image_path TEXT,
      status TEXT DEFAULT 'recognized',
      erp_draft_id TEXT,
      submit_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(invoice_code, invoice_number)
    )
  `)

  // 发票明细行
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_name TEXT,
      specification TEXT,
      unit TEXT,
      quantity REAL,
      unit_price REAL,
      amount REAL,
      tax_rate TEXT,
      tax REAL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `)

  // 操作日志
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      action TEXT NOT NULL,
      target_system TEXT,
      result TEXT,
      detail TEXT,
      screenshot_path TEXT,
      operator TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 系统配置
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoice_code ON invoices(invoice_code);
    CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(invoice_date);
  `)
}

export const handleDb = {
  getInvoices: (): InvoiceRecord[] => {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare(`
      SELECT * FROM invoices
      ORDER BY created_at DESC
    `)

    return stmt.all() as InvoiceRecord[]
  },

  saveInvoice: (invoice: InvoiceRecord): number => {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare(`
      INSERT INTO invoices (
        invoice_code, invoice_number, invoice_date, invoice_type,
        buyer_name, buyer_tax_id, seller_name, seller_tax_id,
        total_amount, tax_amount, total_with_tax, check_code,
        ocr_source, ocr_confidence, ocr_raw_json, image_path,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      invoice.invoiceCode,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.invoiceType,
      invoice.buyerName,
      invoice.buyerTaxId,
      invoice.sellerName,
      invoice.sellerTaxId,
      invoice.totalAmount,
      invoice.taxAmount,
      invoice.totalWithTax,
      invoice.checkCode,
      invoice.ocrSource,
      invoice.ocrConfidence,
      invoice.ocrRawJson,
      invoice.imagePath,
      invoice.status
    )

    return result.lastInsertRowid as number
  },

  updateInvoice: (id: number, invoice: InvoiceRecord): boolean => {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare(`
      UPDATE invoices SET
        invoice_code = ?, invoice_number = ?, invoice_date = ?, invoice_type = ?,
        buyer_name = ?, buyer_tax_id = ?, seller_name = ?, seller_tax_id = ?,
        total_amount = ?, tax_amount = ?, total_with_tax = ?, check_code = ?,
        status = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `)

    const result = stmt.run(
      invoice.invoiceCode,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.invoiceType,
      invoice.buyerName,
      invoice.buyerTaxId,
      invoice.sellerName,
      invoice.sellerTaxId,
      invoice.totalAmount,
      invoice.taxAmount,
      invoice.totalWithTax,
      invoice.checkCode,
      invoice.status,
      id
    )

    return result.changes > 0
  },

  deleteInvoice: (id: number): boolean => {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare('DELETE FROM invoices WHERE id = ?')
    const result = stmt.run(id)

    return result.changes > 0
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}