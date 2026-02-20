const { spawn } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')

// 检查node_modules是否存在
if (!existsSync(path.join(__dirname, '../node_modules'))) {
  console.log('📦 正在安装依赖...')
  const npmInstall = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true
  })

  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 依赖安装完成')
      startDev()
    } else {
      console.error('❌ 依赖安装失败')
      process.exit(1)
    }
  })
} else {
  startDev()
}

function startDev() {
  console.log('🚀 启动开发服务器...')

  // 启动Vite开发服务器
  const vite = spawn('npm', ['run', 'dev:vite'], {
    stdio: 'pipe',
    shell: true
  })

  vite.stdout.on('data', (data) => {
    console.log(`[Vite] ${data.toString().trim()}`)
  })

  vite.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data.toString().trim()}`)
  })

  // 等待Vite启动后再启动Electron
  setTimeout(() => {
    console.log('⚡ 启动Electron...')
    const electron = spawn('npm', ['run', 'dev:electron'], {
      stdio: 'inherit',
      shell: true
    })

    electron.on('close', (code) => {
      console.log(`Electron 进程退出，代码: ${code}`)
      vite.kill()
      process.exit(code)
    })
  }, 3000)

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭开发服务器...')
    vite.kill()
    process.exit(0)
  })
}