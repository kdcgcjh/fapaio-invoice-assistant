import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { getAppDataPath } from './env'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const KEY_FILE = join(getAppDataPath(), '.key')

// 获取或创建加密密钥
function getEncryptionKey(): Buffer {
  if (existsSync(KEY_FILE)) {
    const key = readFileSync(KEY_FILE)
    return key
  }

  // 生成新密钥
  const key = randomBytes(32)
  writeFileSync(KEY_FILE, key)
  return key
}

const ALGORITHM = 'AES-256-GCM'
const key = getEncryptionKey()

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // 将 iv、authTag 和加密数据组合
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// 生成数据指纹
export function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

// 验证数据完整性
export function verifyHash(data: string, expectedHash: string): boolean {
  return hash(data) === expectedHash
}

// 获取解密后的凭据
export function getDecryptedCredential(systemId: string): { username: string; password: string } | null {
  const { handleConfig } = require('./config')
  const config = handleConfig.get()

  const credential = config.credentials[systemId]
  if (!credential) {
    return null
  }

  return {
    username: credential.username,
    password: credential.encrypted ? decrypt(credential.password) : credential.password
  }
}