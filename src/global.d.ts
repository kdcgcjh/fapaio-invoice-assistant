// Node.js 类型
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production'
  }
}

// 扩展 Array 类型
interface Array<T> {
  isEmpty(): boolean
}

Array.prototype.isEmpty = function () {
  return this.length === 0
}

// 扩展 String 类型
interface String {
  format(...args: any[]): string
}

String.prototype.format = function () {
  const args = arguments
  return this.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number] : match
  })
}