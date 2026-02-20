<template>
  <div class="invoice-scan">
    <el-card class="scan-card">
      <template #header>
        <h3>扫描发票</h3>
      </template>

      <!-- 上传区域 -->
      <el-upload
        class="upload-area"
        drag
        :auto-upload="false"
        :show-file-list="false"
        accept="image/*,.pdf"
        :on-change="handleFileChange"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="upload-text">
          <p>点击或拖拽发票图片到此处</p>
          <p class="upload-hint">支持 JPG、PNG、PDF 格式</p>
        </div>
      </el-upload>

      <!-- 预览区域 -->
      <div v-if="imageUrl" class="preview-section">
        <h4>发票预览</h4>
        <div class="image-preview">
          <img :src="imageUrl" alt="发票图片" />
        </div>
      </div>

      <!-- 识别结果 -->
      <div v-if="ocrResult" class="result-section">
        <h4>识别结果</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="发票代码">
            {{ ocrResult.data.invoiceCode }}
          </el-descriptions-item>
          <el-descriptions-item label="发票号码">
            {{ ocrResult.data.invoiceNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="开票日期">
            {{ ocrResult.data.invoiceDate }}
          </el-descriptions-item>
          <el-descriptions-item label="发票类型">
            {{ ocrResult.data.invoiceType }}
          </el-descriptions-item>
          <el-descriptions-item label="购买方">
            {{ ocrResult.data.buyerName }}
          </el-descriptions-item>
          <el-descriptions-item label="购买方税号">
            {{ ocrResult.data.buyerTaxId }}
          </el-descriptions-item>
          <el-descriptions-item label="销售方">
            {{ ocrResult.data.sellerName }}
          </el-descriptions-item>
          <el-descriptions-item label="销售方税号">
            {{ ocrResult.data.sellerTaxId }}
          </el-descriptions-item>
          <el-descriptions-item label="合计金额">
            ¥{{ ocrResult.data.totalAmount.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="税额">
            ¥{{ ocrResult.data.taxAmount.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="价税合计">
            ¥{{ ocrResult.data.totalWithTax.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="校验码">
            {{ ocrResult.data.checkCode }}
          </el-descriptions-item>
          <el-descriptions-item label="置信度">
            <el-progress
              :percentage="ocrResult.data.confidence * 100"
              :color="getConfidenceColor(ocrResult.data.confidence)"
            />
          </el-descriptions-item>
          <el-descriptions-item label="处理时间">
            {{ ocrResult.processTime }}ms
          </el-descriptions-item>
        </el-descriptions>

        <!-- 明细信息 -->
        <div v-if="ocrResult.data.items.length > 0" class="mt-4">
          <h5>商品明细</h5>
          <el-table :data="ocrResult.data.items" border>
            <el-table-column prop="name" label="货物/服务名称" />
            <el-table-column prop="specification" label="规格型号" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="数量" width="100">
              <template #default="{ row }">
                {{ row.quantity || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="unitPrice" label="单价" width="120">
              <template #default="{ row }">
                ¥{{ row.unitPrice?.toFixed(2) || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                ¥{{ row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="taxRate" label="税率" width="80" />
            <el-table-column prop="tax" label="税额" width="120">
              <template #default="{ row }">
                ¥{{ row.tax?.toFixed(2) || '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons mt-4">
          <el-button @click="handleReupload">重新上传</el-button>
          <el-button type="primary" @click="handleSave">保存发票</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInvoiceStore } from '@/stores/invoice'
import { useConfigStore } from '@/stores/config'
import type { UploadFile } from 'element-plus'
import type { OcrResult } from '@shared/types'

const router = useRouter()
const invoiceStore = useInvoiceStore()
const configStore = useConfigStore()

// 状态
const imageUrl = ref('')
const imagePath = ref('')
const ocrResult = ref<OcrResult | null>(null)

// 处理文件选择
const handleFileChange = async (file: UploadFile) => {
  if (!file.raw) return

  // 检查文件类型
  const isImage = file.raw.type.startsWith('image/')
  const isPDF = file.raw.type === 'application/pdf'

  if (!isImage && !isPDF) {
    ElMessage.error('请上传图片或PDF文件')
    return
  }

  // 检查文件大小（10MB）
  if (file.raw.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过10MB')
    return
  }

  try {
    // 显示预览
    if (isImage) {
      imageUrl.value = URL.createObjectURL(file.raw)
    } else {
      // PDF文件显示图标
      imageUrl.value = '/pdf-icon.png'
    }

    // 获取文件路径（在实际应用中需要保存到临时位置）
    imagePath.value = file.name // 这里需要实际处理

    // 开始OCR识别
    ElMessage.info('正在识别发票...')
    ocrResult.value = await invoiceStore.recognizeInvoice(imagePath.value)
  } catch (error) {
    ElMessage.error('识别失败，请重试')
    console.error(error)
  }
}

// 重新上传
const handleReupload = () => {
  imageUrl.value = ''
  imagePath.value = ''
  ocrResult.value = null
}

// 保存发票
const handleSave = async () => {
  if (!ocrResult.value || !imagePath.value) return

  try {
    await invoiceStore.saveInvoice(ocrResult.value.data, imagePath.value)

    ElMessageBox.confirm('发票保存成功，是否继续添加？', '提示', {
      confirmButtonText: '继续',
      cancelButtonText: '查看列表',
      type: 'success'
    }).then(() => {
      handleReupload()
    }).catch(() => {
      router.push('/invoices')
    })
  } catch (error) {
    console.error(error)
  }
}

// 获取置信度颜色
const getConfidenceColor = (confidence: number) => {
  if (confidence > 0.9) return '#67c23a'
  if (confidence > 0.7) return '#e6a23c'
  return '#f56c6c'
}
</script>

<style scoped lang="scss">
.invoice-scan {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.scan-card {
  .upload-area {
    width: 100%;
    margin-bottom: 24px;

    :deep(.el-upload-dragger) {
      width: 100%;
      height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border: 2px dashed var(--border-light);
      border-radius: 8px;
      background-color: var(--background-light);
      transition: all 0.3s;

      &:hover {
        border-color: var(--primary-color);
        background-color: rgba(64, 158, 255, 0.04);
      }
    }

    .upload-icon {
      font-size: 48px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .upload-text {
      p {
        margin: 0;
        color: var(--text-regular);

        &.upload-hint {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 8px;
        }
      }
    }
  }

  .preview-section {
    margin-bottom: 24px;

    h4 {
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .image-preview {
      max-width: 600px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      overflow: hidden;
      background-color: #fff;

      img {
        width: 100%;
        height: auto;
        display: block;
      }
    }
  }

  .result-section {
    h4 {
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    h5 {
      margin: 16px 0 12px;
      color: var(--text-primary);
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  }
}
</style>