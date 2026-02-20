<template>
  <div class="invoice-list">
    <!-- 搜索和统计 -->
    <el-card class="mb-4">
      <div class="flex-between">
        <div class="search-area">
          <el-input
            v-model="invoiceStore.searchText"
            placeholder="搜索发票代码、号码、购销方名称..."
            clearable
            style="width: 400px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="stats-area">
          <el-statistic
            v-for="(value, key) in invoiceStore.invoiceStats"
            :key="key"
            :title="getStatTitle(key)"
            :value="value"
            class="stat-item"
          />
        </div>
      </div>
    </el-card>

    <!-- 发票表格 -->
    <el-card>
      <template #header>
        <div class="flex-between">
          <h3>发票列表</h3>
          <el-button type="primary" :icon="Plus" @click="handleScan">
            扫描发票
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="invoiceStore.loading"
        :data="invoiceStore.filteredInvoices"
        stripe
        @row-click="handleRowClick"
      >
        <el-table-column prop="invoiceCode" label="发票代码" width="120" />
        <el-table-column prop="invoiceNumber" label="发票号码" width="100" />
        <el-table-column prop="invoiceDate" label="开票日期" width="120" />
        <el-table-column prop="invoiceType" label="发票类型" width="140" />
        <el-table-column prop="buyerName" label="购买方" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sellerName" label="销售方" min-width="200" show-overflow-tooltip />
        <el-table-column prop="totalWithTax" label="价税合计" width="120" align="right">
          <template #default="{ row }">
            ¥{{ row.totalWithTax.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="handleView(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'recognized'"
              size="small"
              type="primary"
              @click.stop="handleFill(row)"
            >
              填写
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click.stop="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty
        v-if="!invoiceStore.loading && invoiceStore.filteredInvoices.length === 0"
        description="暂无发票数据"
      >
        <el-button type="primary" @click="handleScan">
          扫描发票
        </el-button>
      </el-empty>
    </el-card>

    <!-- 自动填写对话框 -->
    <el-dialog
      v-model="showFillDialog"
      title="选择填写系统"
      width="400px"
    >
      <div class="fill-options">
        <el-radio-group v-model="selectedSystem">
          <el-radio
            v-for="system in configStore.config.systems"
            :key="system.id"
            :label="system.id"
            class="fill-option"
          >
            <div>
              <div class="system-name">{{ system.name }}</div>
              <div class="system-type">{{ getSystemTypeText(system.type) }}</div>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <template #footer>
        <el-button @click="showFillDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="automationStore.running"
          @click="handleConfirmFill"
        >
          开始填写
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInvoiceStore } from '@/stores/invoice'
import { useConfigStore } from '@/stores/config'
import { useAutomationStore } from '@/stores/automation'
import type { InvoiceRecord } from '@shared/types'

const router = useRouter()
const invoiceStore = useInvoiceStore()
const configStore = useConfigStore()
const automationStore = useAutomationStore()

// 状态
const showFillDialog = ref(false)
const selectedSystem = ref('')
const currentInvoice = ref<InvoiceRecord | null>(null)

// 初始化
onMounted(async () => {
  await Promise.all([
    invoiceStore.loadInvoices(),
    configStore.loadConfig()
  ])
})

// 获取统计标题
const getStatTitle = (key: string) => {
  const titles: Record<string, string> = {
    total: '总计',
    recognized: '已识别',
    validated: '已验证',
    submitted: '已提交',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return titles[key] || key
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    recognized: 'info',
    validated: 'warning',
    submitted: 'primary',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    recognized: '已识别',
    validated: '已验证',
    submitted: '已提交',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
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

// 格式化日期时间
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

// 扫描发票
const handleScan = () => {
  router.push('/invoices/scan')
}

// 查看发票
const handleView = (invoice: InvoiceRecord) => {
  invoiceStore.setCurrentInvoice(invoice)
  router.push(`/invoices/${invoice.id}`)
}

// 行点击
const handleRowClick = (row: InvoiceRecord) => {
  handleView(row)
}

// 填写发票
const handleFill = (invoice: InvoiceRecord) => {
  currentInvoice.value = invoice
  selectedSystem.value = configStore.config.systems[0]?.id || ''
  showFillDialog.value = true
}

// 确认填写
const handleConfirmFill = async () => {
  if (!currentInvoice.value || !selectedSystem.value) return

  try {
    const invoiceData = JSON.parse(currentInvoice.value.ocrRawJson)
    await automationStore.fillInvoice(selectedSystem.value, invoiceData)

    // 更新发票状态
    await invoiceStore.updateInvoice(currentInvoice.value.id!, {
      status: 'submitted'
    })

    showFillDialog.value = false
  } catch (error) {
    console.error(error)
  }
}

// 删除发票
const handleDelete = async (invoice: InvoiceRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除发票 ${invoice.invoiceCode}-${invoice.invoiceNumber} 吗？`,
      '提示',
      {
        type: 'warning'
      }
    )

    await invoiceStore.deleteInvoice(invoice.id!)
    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped lang="scss">
.invoice-list {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.search-area {
  flex: 1;
}

.stats-area {
  display: flex;
  gap: 40px;

  .stat-item {
    text-align: center;

    :deep(.el-statistic__head) {
      font-size: 14px;
      color: var(--text-secondary);
    }

    :deep(.el-statistic__content) {
      font-size: 24px;
      font-weight: 600;
    }
  }
}

.fill-options {
  .fill-option {
    display: block;
    width: 100%;
    margin-bottom: 16px;

    :deep(.el-radio__label) {
      width: 100%;
      padding-left: 24px;
    }

    .system-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .system-type {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
  }
}

// 表格行悬停效果
:deep(.el-table__row) {
  cursor: pointer;
}
</style>