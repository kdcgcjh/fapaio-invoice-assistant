<template>
  <div class="logs-page">
    <el-card>
      <template #header>
        <div class="flex-between">
          <h3>操作日志</h3>
          <div>
            <el-button :icon="Download" @click="handleExport">
              导出日志
            </el-button>
            <el-button :icon="Delete" @click="handleClear">
              清空日志
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选器 -->
      <div class="filter-bar mb-4">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-select v-model="filters.action" placeholder="操作类型" clearable>
              <el-option label="扫描识别" value="scan" />
              <el-option label="自动填写" value="fill" />
              <el-option label="提交" value="submit" />
              <el-option label="审批" value="approve" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="filters.result" placeholder="操作结果" clearable>
              <el-option label="成功" value="success" />
              <el-option label="失败" value="fail" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-col>
          <el-col :span="6">
            <el-button type="primary" @click="handleFilter">
              查询
            </el-button>
            <el-button @click="handleReset">
              重置
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 日志表格 -->
      <el-table
        v-loading="loading"
        :data="logs"
        stripe
      >
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)">
              {{ getActionText(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetSystem" label="目标系统" width="150">
          <template #default="{ row }">
            {{ getSystemName(row.targetSystem) }}
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详细信息" min-width="300">
          <template #default="{ row }">
            <div class="detail-text">
              {{ formatDetail(row.detail) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.screenshotPath"
              size="small"
              @click="handleViewScreenshot(row)"
            >
              查看截图
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper mt-4">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 截图预览 -->
    <el-dialog
      v-model="showScreenshot"
      title="操作截图"
      width="80%"
    >
      <el-image
        v-if="screenshotUrl"
        :src="screenshotUrl"
        fit="contain"
        style="width: 100%; max-height: 70vh"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Download, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import type { OperationLog } from '@shared/types'

const configStore = useConfigStore()

// 状态
const loading = ref(false)
const logs = ref<OperationLog[]>([])
const showScreenshot = ref(false)
const screenshotUrl = ref('')

// 筛选器
const filters = reactive({
  action: '',
  result: '',
  dateRange: null as [string, string] | null
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 加载日志
const loadLogs = async () => {
  loading.value = true
  try {
    // 这里应该调用API获取日志
    // 暂时使用模拟数据
    logs.value = await generateMockLogs()
    pagination.total = logs.value.length
  } catch (error) {
    ElMessage.error('加载日志失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 生成模拟日志
async function generateMockLogs(): Promise<OperationLog[]> {
  const mockLogs: OperationLog[] = []
  const actions = ['scan', 'fill', 'submit', 'approve']
  const systems = ['erp_sap', 'reimburse', 'tax_platform']

  for (let i = 0; i < 100; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)]
    const system = systems[Math.floor(Math.random() * systems.length)]
    const success = Math.random() > 0.2

    mockLogs.push({
      id: i + 1,
      action,
      targetSystem: system,
      result: success ? 'success' : 'fail',
      detail: JSON.stringify({
        invoiceCode: `12345678${String(i).padStart(2, '0')}`,
        invoiceNumber: String(Math.floor(Math.random() * 100000000)),
        error: success ? undefined : '网络超时'
      }),
      screenshotPath: success && Math.random() > 0.5
        ? `screenshots/${Date.now()}.png`
        : undefined,
      operator: 'system',
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  return mockLogs.sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  )
}

// 获取操作类型样式
const getActionType = (action: string) => {
  const types: Record<string, string> = {
    scan: 'info',
    fill: 'primary',
    submit: 'warning',
    approve: 'success'
  }
  return types[action] || 'info'
}

// 获取操作类型文本
const getActionText = (action: string) => {
  const texts: Record<string, string> = {
    scan: '扫描识别',
    fill: '自动填写',
    submit: '提交',
    approve: '审批'
  }
  return texts[action] || action
}

// 获取系统名称
const getSystemName = (systemId?: string) => {
  if (!systemId) return '-'
  const system = configStore.config.systems.find(s => s.id === systemId)
  return system?.name || systemId
}

// 格式化详细信息
const formatDetail = (detail?: string) => {
  if (!detail) return '-'
  try {
    const obj = JSON.parse(detail)
    return Object.entries(obj)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  } catch {
    return detail
  }
}

// 格式化日期时间
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

// 筛选
const handleFilter = () => {
  // 实现筛选逻辑
  ElMessage.success('筛选功能待实现')
}

// 重置筛选
const handleReset = () => {
  filters.action = ''
  filters.result = ''
  filters.dateRange = null
  pagination.page = 1
  loadLogs()
}

// 分页变化
const handlePageChange = () => {
  loadLogs()
}

// 查看截图
const handleViewScreenshot = (row: OperationLog) => {
  if (row.screenshotPath) {
    screenshotUrl.value = row.screenshotPath
    showScreenshot.value = true
  }
}

// 导出日志
const handleExport = () => {
  ElMessage.info('导出功能待实现')
}

// 清空日志
const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复。',
      '警告',
      {
        type: 'warning'
      }
    )

    logs.value = []
    pagination.total = 0
    ElMessage.success('日志已清空')
  } catch {
    // 用户取消
  }
}

// 初始化
onMounted(() => {
  loadLogs()
})
</script>

<style scoped lang="scss">
.logs-page {
  padding: 24px;
}

.filter-bar {
  background-color: var(--background-light);
  padding: 16px;
  border-radius: 4px;
}

.detail-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
}
</style>