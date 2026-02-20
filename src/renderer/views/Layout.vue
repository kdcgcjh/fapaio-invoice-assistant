<template>
  <el-container class="layout-container">
    <!-- ���边栏 -->
    <el-aside width="240px" class="layout-aside">
      <div class="logo">
        <img src="/icon.png" alt="Logo" class="logo-img" />
        <h1 class="logo-title">发票识别助手</h1>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        class="layout-menu"
      >
        <el-menu-item index="/invoices">
          <el-icon><Document /></el-icon>
          <span>发票管理</span>
        </el-menu-item>

        <el-menu-item index="/invoices/scan">
          <el-icon><Plus /></el-icon>
          <span>扫描发票</span>
        </el-menu-item>

        <el-menu-item index="/automation">
          <el-icon><Monitor /></el-icon>
          <span>自动填写</span>
        </el-menu-item>

        <el-menu-item index="/logs">
          <el-icon><List /></el-icon>
          <span>操作日志</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header height="60px" class="layout-header">
        <div class="header-left">
          <el-breadcrumb>
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta?.title">
              {{ $route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-button
            type="primary"
            :icon="Plus"
            @click="handleScanInvoice"
          >
            扫描发票
          </el-button>

          <el-dropdown>
            <el-avatar :size="32" class="avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleAbout">
                  关于
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { Document, Plus, Monitor, List, Setting, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 扫描发票
const handleScanInvoice = () => {
  router.push('/invoices/scan')
}

// 关于
const handleAbout = () => {
  ElMessage.info('发票识别助手 v1.0.0')
}

// 监听菜单快捷键
window.electronAPI?.onMenuAction?.(() => {
  handleScanInvoice()
})

window.electronAPI?.onAbout?.(() => {
  handleAbout()
})
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #001529;
  overflow: hidden;

  .logo {
    display: flex;
    align-items: center;
    padding: 16px;
    color: #fff;

    .logo-img {
      width: 32px;
      height: 32px;
      margin-right: 12px;
    }

    .logo-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .layout-menu {
    border-right: none;
    background-color: #001529;

    :deep(.el-menu-item) {
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        background-color: #1890ff;
        color: #fff;
      }

      &.is-active {
        background-color: #1890ff;
        color: #fff;
      }
    }
  }
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid var(--border-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .header-left {
    flex: 1;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .avatar {
      cursor: pointer;
      background-color: var(--primary-color);
    }
  }
}

.layout-main {
  background-color: var(--background-base);
  padding: 0;
  overflow: hidden;
}
</style>