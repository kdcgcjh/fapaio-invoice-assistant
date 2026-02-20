<template>
  <div class="automation-page">
    <el-row :gutter="24">
      <!-- 左侧：发票列表 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <h3>待填写发票</h3>
          </template>

          <el-table
            :data="pendingInvoices"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="invoiceCode" label="发票代码" width="120" />
            <el-table-column prop="invoiceNumber" label="发票号码" width="100" />
            <el-table-column prop="buyerName" label="购买方" min-width="200" />
            <el-table-column prop="totalWithTax" label="价税合计" width="120" align="right">
              <template #default="{ row }">
                ¥{{ row.totalWithTax.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="batch-actions mt-4">
            <el-button
              type="primary"
              :disabled="selectedInvoices.length === 0"
              @click="handleBatchFill"
            >
              批量填写 ({{ selectedInvoices.length }})
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：控制台 -->
      <el-col :span="10">
        <el-card class="console-card">
          <template #header>
            <div class="flex-between">
              <h3>操作控制台</h3>
              <el-button
                size="small"
                :icon="Delete"
                @click="automationStore.clearLogs"
              >
                清空日志
              </el-button>
            </div>
          </template>

          <!-- 系统选择 -->
          <div class="system-selector mb-4">
            <h4>选择系统</h4>
            <el-radio-group v-model="selectedSystem">
              <el-radio
                v-for="system in configStore.config.systems"
                :key="system.id"
                :label="system.id"
                class="system-option"
                :disabled="automationStore.running"
              >
                <div class="system-info">
                  <div class="system-name">{{ system.name }}</div>
                  <div class="system-url">{{ system.loginUrl }}</div>
                </div>
              </el-radio>
            </el-radio-group>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons mb-4">
            <el-button
              type="primary"
              :loading="automationStore.running"
              :disabled="!selectedSystem || selectedInvoices.length === 0"
              @click="handleStartFill"
            >
              {{ automationStore.running ? '填写中...' : '开始填写' }}
            </el-button>
            <el-button
              v-if="automationStore.running"
              type="danger"
              @click="handleStop"
            >
              停止
            </el-button>
          </div>

          <!-- 进度显示 -->
          <div v-if="automationStore.running" class="progress-section mb-4">
            <h4>填写进度</h4>
            <el-progress
              :percentage="progressPercentage"
              :status="progressStatus"
            />
            <div class="progress-text">
              {{ currentIndex + 1 }} / {{ selectedInvoices.length }}
            </div>
          </div>

          <!-- 日志输出 -->
          <div class="log-section">
            <h4>操作日志</h4>
            <div class="log-container">
              <div
                v-for="(log, index) in automationStore.logs"
                :key="index"
                class="log-item"
              >
                {{ log }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInvoiceStore } from '@/stores/invoice'
import { useConfigStore } from '@/stores/config'
import { useAutomationStore } from '@/stores/automation'
import type { InvoiceRecord } from '@shared/types'

const invoiceStore = useInvoiceStore()
const configStore = useConfigStore()
const automationStore = useAutomationStore()

// 状态
const selectedInvoices = ref<InvoiceRecord[]>([])
const selectedSystem = ref('')
const currentIndex = ref(0)
const stopRequested = ref(false)

// 计算属性
const pendingInvoices = computed(() => {
  return invoiceStore.invoices.filter(i => i.status === 'recognized')
})

const progressPercentage = computed(() => {
  if (selectedInvoices.value.length === 0) return 0
  return Math.round((currentIndex.value / selectedInvoices.value.length) * 100)
})

const progressStatus = computed(() => {
  if (stopRequested.value) return 'exception'
  if (progressPercentage.value === 100) return 'success'
  return ''
})

// 初始化
onMounted(async () => {
  await Promise.all([
    invoiceStore.loadInvoices(),
    configStore.loadConfig()
  ])

  // 默认选择第一个系统
  if (configStore.config.systems.length > 0) {
    selectedSystem.value = configStore.config.systems[0].id
  }
})

// 选择变化
const handleSelectionChange = (selection: InvoiceRecord[]) => {
  selectedInvoices.value = selection
}

// 批量填写
const handleBatchFill = () => {
  if (selectedInvoices.value.length === 0) {
    ElMessage.warning('请先选择要填写的发票')
    return
  }

  ElMessageBox.confirm(
    `确定要填写选中的 ${selectedInvoices.value.length} 张发票吗？`,
    '批量填写',
    {
      type: 'warning'
    }
  ).then(() => {
    handleStartFill()
  })
}

// 开始填写
const handleStartFill = async () => {
  if (!selectedSystem.value || selectedInvoices.value.length === 0) return

  stopRequested.value = false
  currentIndex.value = 0

  for (let i = 0; i < selectedInvoices.value.length; i++) {
    if (stopRequested.value) break

    currentIndex.value = i
    const invoice = selectedInvoices.value[i]

    try {
      const invoiceData = JSON.parse(invoice.ocrRawJson)
      const result = await automationStore.fillInvoice(selectedSystem.value, invoiceData)

      if (result.success) {
        // 更新发票状态
        await invoiceStore.updateInvoice(invoice.id!, {
          status: 'submitted',
          submitTime: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error(`填写发票 ${invoice.invoiceCode} 失败:`, error)
    }
  }

  if (!stopRequested.value) {
    ElMessage.success('批量填写完成')
  }
}

// 停止填写
const handleStop = () => {
  stopRequested.value = true
  automationStore.addLog('用户请求停止操作...')
}

// 格式化日期时间
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}
</script>

<style scoped lang="scss">
.automation-page {
  padding: 24px;
  height: 100%;
}

.console-card {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.batch-actions {
  text-align: right;
}

.system-selector {
  h4 {
    margin-bottom: 16px;
  }

  .system-option {
    display: block;
    width: 100%;
    margin-bottom: 12px;

    :deep(.el-radio__label) {
      width: 100%;
    }

    .system-info {
      .system-name {
        font-weight: 500;
        color: var(--text-primary);
      }

      .system-url {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
    }
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.progress-section {
  h4 {
    margin-bottom: 12px;
  }

  .progress-text {
    text-align: center;
    margin-top: 8px;
    color: var(--text-secondary);
  }
}

.log-section {
  flex: 1;
  display: flex;
  flex-direction: column;

  h4 {
    margin-bottom: 12px;
  }

  .log-container {
    flex: 1;
    overflow-y: auto;
    background-color: #2d2d2d;
    border-radius: 4px;
    padding: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.6;

    .log-item {
      color: #f0f0f0;
      word-wrap: break-word;

      &:not(:last-child) {
        margin-bottom: 4px;
      }
    }
  }
}
</style>