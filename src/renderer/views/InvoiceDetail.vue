<template>
  <div class="invoice-detail">
    <el-card v-if="invoice" class="detail-card">
      <template #header>
        <div class="flex-between">
          <h3>发票详情</h3>
          <div>
            <el-button @click="handleBack">返回</el-button>
            <el-button
              v-if="invoice.status === 'recognized'"
              type="primary"
              @click="handleFill"
            >
              自动填写
            </el-button>
          </div>
        </div>
      </template>

      <!-- 发票图片 -->
      <div class="invoice-image">
        <h4>发票图片</h4>
        <el-image
          :src="invoice.imagePath"
          :preview-src-list="[invoice.imagePath]"
          fit="contain"
          style="max-width: 600px; max-height: 400px"
        >
          <template #error>
            <div class="image-error">
              <el-icon><Picture /></el-icon>
              <span>图片加载失败</span>
            </div>
          </template>
        </el-image>
      </div>

      <!-- 发票信息 -->
      <div class="invoice-info">
        <h4>发票信息</h4>
        <el-form :model="invoice" label-width="120px">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="发票代码">
                <el-input v-model="invoice.invoiceCode" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发票号码">
                <el-input v-model="invoice.invoiceNumber" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="开票日期">
                <el-date-picker
                  v-model="invoice.invoiceDate"
                  type="date"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发票类型">
                <el-select v-model="invoice.invoiceType" style="width: 100%">
                  <el-option label="增值税专用发票" value="增值税专用发票" />
                  <el-option label="增值税普通发票" value="增值税普通发票" />
                  <el-option label="增值税电子发票" value="增值税电子发票" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="购买方">
                <el-input v-model="invoice.buyerName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="购买方税号">
                <el-input v-model="invoice.buyerTaxId" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="销售方">
                <el-input v-model="invoice.sellerName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="销售方税号">
                <el-input v-model="invoice.sellerTaxId" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="合计金额">
                <el-input-number
                  v-model="invoice.totalAmount"
                  :precision="2"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="税额">
                <el-input-number
                  v-model="invoice.taxAmount"
                  :precision="2"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="价税合计">
                <el-input-number
                  v-model="invoice.totalWithTax"
                  :precision="2"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="校验码">
            <el-input v-model="invoice.checkCode" />
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="invoice.status" style="width: 200px">
              <el-option label="已识别" value="recognized" />
              <el-option label="已验证" value="validated" />
              <el-option label="已提交" value="submitted" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button @click="handleBack">返回</el-button>
          <el-button type="primary" @click="handleSave">保存修改</el-button>
        </div>
      </div>
    </el-card>

    <!-- 自动填写对话框 -->
    <el-dialog
      v-model="showFillDialog"
      title="选择填写系统"
      width="400px"
    >
      <el-radio-group v-model="selectedSystem">
        <el-radio
          v-for="system in configStore.config.systems"
          :key="system.id"
          :label="system.id"
        >
          {{ system.name }}
        </el-radio>
      </el-radio-group>

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
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useInvoiceStore } from '@/stores/invoice'
import { useConfigStore } from '@/stores/config'
import { useAutomationStore } from '@/stores/automation'
import type { InvoiceRecord } from '@shared/types'

const route = useRoute()
const router = useRouter()
const invoiceStore = useInvoiceStore()
const configStore = useConfigStore()
const automationStore = useAutomationStore()

// 状态
const invoice = ref<InvoiceRecord | null>(null)
const showFillDialog = ref(false)
const selectedSystem = ref('')

// 监听路由参数
watch(
  () => route.params.id,
  async (id) => {
    if (id && typeof id === 'string') {
      const inv = invoiceStore.invoices.find(i => i.id === Number(id))
      if (inv) {
        invoice.value = inv
      } else {
        await invoiceStore.loadInvoices()
        const inv = invoiceStore.invoices.find(i => i.id === Number(id))
        if (inv) {
          invoice.value = inv
        } else {
          ElMessage.error('发票不存在')
          router.push('/invoices')
        }
      }
    }
  },
  { immediate: true }
)

// 返回列表
const handleBack = () => {
  router.push('/invoices')
}

// 保存修改
const handleSave = async () => {
  if (!invoice.value) return

  try {
    await invoiceStore.updateInvoice(invoice.value.id!, invoice.value)
  } catch (error) {
    console.error(error)
  }
}

// 自动填写
const handleFill = () => {
  selectedSystem.value = configStore.config.systems[0]?.id || ''
  showFillDialog.value = true
}

// 确认填写
const handleConfirmFill = async () => {
  if (!invoice.value || !selectedSystem.value) return

  try {
    const invoiceData = JSON.parse(invoice.value.ocrRawJson)
    await automationStore.fillInvoice(selectedSystem.value, invoiceData)

    // 更新发票状态
    await invoiceStore.updateInvoice(invoice.value.id!, {
      status: 'submitted'
    })

    showFillDialog.value = false
  } catch (error) {
    console.error(error)
  }
}
</script>

<style scoped lang="scss">
.invoice-detail {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.detail-card {
  .invoice-image {
    margin-bottom: 32px;

    h4 {
      margin-bottom: 16px;
    }

    .image-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary);

      .el-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
    }
  }

  .invoice-info {
    h4 {
      margin-bottom: 24px;
    }

    .action-buttons {
      margin-top: 32px;
      text-align: center;
    }
  }
}
</style>