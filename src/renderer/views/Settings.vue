<template>
  <div class="settings-page">
    <el-row :gutter="24">
      <!-- OCR设置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <h3>OCR 设置</h3>
          </template>

          <el-form :model="configStore.config" label-width="120px">
            <el-form-item label="GLM API Key">
              <el-input
                v-model="configStore.config.glmApiKey"
                type="password"
                show-password
                placeholder="用于API测试模式"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveConfig">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 系统凭据 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <h3>系统凭据</h3>
          </template>

          <el-tabs v-model="activeTab">
            <el-tab-pane
              v-for="system in configStore.config.systems"
              :key="system.id"
              :label="system.name"
              :name="system.id"
            >
              <el-form
                :model="credentials[system.id]"
                label-width="100px"
              >
                <el-form-item label="用户名">
                  <el-input
                    v-model="credentials[system.id].username"
                    placeholder="请输入用户名"
                  />
                </el-form-item>

                <el-form-item label="密码">
                  <el-input
                    v-model="credentials[system.id].password"
                    type="password"
                    show-password
                    placeholder="请输入密码"
                  />
                </el-form-item>

                <el-form-item>
                  <el-button
                    type="primary"
                    @click="handleSaveCredential(system.id)"
                  >
                    保存凭据
                  </el-button>
                  <el-button
                    type="danger"
                    @click="handleDeleteCredential(system.id)"
                  >
                    删除凭据
                  </el-button>
                </el-form-item>
              </el-form>

              <el-divider />

              <div class="system-info">
                <p><strong>登录地址：</strong>{{ system.loginUrl }}</p>
                <p><strong>系统类型：</strong>{{ getSystemTypeText(system.type) }}</p>
                <p><strong>登录方式：</strong>{{ getLoginStrategyText(system.loginStrategy) }}</p>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <!-- 关于信息 -->
    <el-card class="mt-4">
      <template #header>
        <h3>关于</h3>
      </template>

      <el-descriptions :column="2">
        <el-descriptions-item label="应用名称">
          发票识别助手
        </el-descriptions-item>
        <el-descriptions-item label="版本">
          v1.0.0
        </el-descriptions-item>
        <el-descriptions-item label="开发框架">
          Electron + Vue 3 + TypeScript
        </el-descriptions-item>
        <el-descriptions-item label="OCR引擎">
          GLM-OCR + PaddleOCR
        </el-descriptions-item>
        <el-descriptions-item label="自动化引擎">
          Playwright
        </el-descriptions-item>
        <el-descriptions-item label="数据存储">
          SQLite
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import type { Credential } from '@shared/types'

const configStore = useConfigStore()

// 状态
const activeTab = ref('')
const credentials = reactive<Record<string, Credential>>({})

// 初始化
onMounted(async () => {
  await configStore.loadConfig()

  // 初始化凭据表单
  configStore.config.systems.forEach(system => {
    const cred = configStore.getCredential(system.id)
    credentials[system.id] = {
      username: cred?.username || '',
      password: cred?.encrypted ? '' : cred?.password || '',
      encrypted: false
    }
  })

  // 默认选中第一个
  if (configStore.config.systems.length > 0) {
    activeTab.value = configStore.config.systems[0].id
  }
})

// 保存配置
const handleSaveConfig = async () => {
  try {
    await configStore.saveConfig()
    ElMessage.success('配置保存成功')
  } catch (error) {
    console.error(error)
  }
}

// 保存凭据
const handleSaveCredential = async (systemId: string) => {
  const cred = credentials[systemId]

  if (!cred.username || !cred.password) {
    ElMessage.warning('请填写完整的用户名和密码')
    return
  }

  try {
    configStore.saveCredential(systemId, cred)
    await configStore.saveConfig()
    ElMessage.success('凭据保存成功')

    // 清空密码字段
    cred.password = ''
  } catch (error) {
    console.error(error)
  }
}

// 删除凭据
const handleDeleteCredential = async (systemId: string) => {
  try {
    configStore.removeCredential(systemId)
    await configStore.saveConfig()
    ElMessage.success('凭据已删除')

    // 清空表单
    credentials[systemId] = {
      username: '',
      password: '',
      encrypted: false
    }
  } catch (error) {
    console.error(error)
  }
}

// 获取系统类型文本
const getSystemTypeText = (type: string) => {
  const texts: Record<string, string> = {
    erp: 'ERP系统',
    reimburse: '报销系统',
    tax: '税务系统',
    custom: '自定义系统'
  }
  return texts[type] || type
}

// 获取登录方式文本
const getLoginStrategyText = (strategy: string) => {
  const texts: Record<string, string> = {
    form: '表单登录',
    sso: 'SSO单点登录',
    cas: 'CAS统一认证'
  }
  return texts[strategy] || strategy
}
</script>

<style scoped lang="scss">
.settings-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.system-info {
  background-color: var(--background-light);
  padding: 16px;
  border-radius: 4px;

  p {
    margin: 8px 0;
    color: var(--text-regular);
  }
}
</style>