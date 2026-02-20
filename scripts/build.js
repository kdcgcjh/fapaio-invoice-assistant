const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🏗️  开始构建项目...')

// 清理旧的构建文件
if (fs.existsSync(path.join(__dirname, '../dist'))) {
  console.log('🧹 清理旧文件...')
  fs.rmSync(path.join(__dirname, '../dist'), { recursive: true })
}

// 构建函数
async function build() {
  try {
    // 1. 构建渲染进程
    console.log('📦 构建渲染进程...')
    await runCommand('npm', ['run', 'build:renderer'])

    // 2. 构建主进程
    console.log('📦 构建主进程...')
    await runCommand('npm', ['run', 'build:main'])

    // 3. 构建预加载脚本
    console.log('📦 构建预加载脚本...')
    await runCommand('npm', ['run', 'build:preload'])

    console.log('✅ 构建成功！')
    console.log('📁 输出目录: ./dist')
  } catch (error) {
    console.error('❌ 构建失败:', error.message)
    process.exit(1)
  }
}

// 运行命令的Promise封装
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

// 开始构建
build()