import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InvoiceRecord, InvoiceField } from '@shared/types'
import { ElMessage } from 'element-plus'

export const useInvoiceStore = defineStore('invoice', () => {
  // 状态
  const invoices = ref<InvoiceRecord[]>([])
  const currentInvoice = ref<InvoiceRecord | null>(null)
  const loading = ref(false)
  const searchText = ref('')

  // 计算属性
  const filteredInvoices = computed(() => {
    if (!searchText.value) return invoices.value

    const text = searchText.value.toLowerCase()
    return invoices.value.filter(invoice =>
      invoice.invoiceCode.toLowerCase().includes(text) ||
      invoice.invoiceNumber.toLowerCase().includes(text) ||
      invoice.buyerName?.toLowerCase().includes(text) ||
      invoice.sellerName?.toLowerCase().includes(text)
    )
  })

  const invoiceStats = computed(() => ({
    total: invoices.value.length,
    recognized: invoices.value.filter(i => i.status === 'recognized').length,
    validated: invoices.value.filter(i => i.status === 'validated').length,
    submitted: invoices.value.filter(i => i.status === 'submitted').length,
    approved: invoices.value.filter(i => i.status === 'approved').length,
    rejected: invoices.value.filter(i => i.status === 'rejected').length
  }))

  // 方法
  const loadInvoices = async () => {
    loading.value = true
    try {
      invoices.value = await window.electronAPI.getInvoices()
    } catch (error) {
      ElMessage.error('加载发票列表失败')
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const saveInvoice = async (invoice: InvoiceField, imagePath: string) => {
    loading.value = true
    try {
      const record: InvoiceRecord = {
        invoiceCode: invoice.invoiceCode,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: invoice.invoiceType,
        buyerName: invoice.buyerName,
        buyerTaxId: invoice.buyerTaxId,
        sellerName: invoice.sellerName,
        sellerTaxId: invoice.sellerTaxId,
        totalAmount: invoice.totalAmount,
        taxAmount: invoice.taxAmount,
        totalWithTax: invoice.totalWithTax,
        checkCode: invoice.checkCode,
        ocrSource: 'glm-ocr',
        ocrConfidence: invoice.confidence,
        ocrRawJson: JSON.stringify(invoice),
        imagePath,
        status: 'recognized'
      }

      const id = await window.electronAPI.saveInvoice(record)
      record.id = id
      invoices.value.unshift(record)

      ElMessage.success('发票保存成功')
      return record
    } catch (error) {
      ElMessage.error('保存发票失败')
      console.error(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateInvoice = async (id: number, updates: Partial<InvoiceRecord>) => {
    loading.value = true
    try {
      const invoice = invoices.value.find(i => i.id === id)
      if (!invoice) throw new Error('发票不存在')

      const updated = { ...invoice, ...updates }
      const success = await window.electronAPI.updateInvoice(id, updated)

      if (success) {
        const index = invoices.value.findIndex(i => i.id === id)
        invoices.value[index] = updated
        ElMessage.success('发票更新成功')
      } else {
        throw new Error('更新失败')
      }
    } catch (error) {
      ElMessage.error('更新发票失败')
      console.error(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteInvoice = async (id: number) => {
    try {
      const success = await window.electronAPI.deleteInvoice(id)
      if (success) {
        const index = invoices.value.findIndex(i => i.id === id)
        invoices.value.splice(index, 1)
        ElMessage.success('发票删除成功')
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      ElMessage.error('删除发票失败')
      console.error(error)
      throw error
    }
  }

  const setCurrentInvoice = (invoice: InvoiceRecord | null) => {
    currentInvoice.value = invoice
  }

  const recognizeInvoice = async (imagePath: string, useAPI = false) => {
    loading.value = true
    try {
      const result = await window.electronAPI.recognizeInvoice(imagePath, useAPI)
      ElMessage.success(`识别成功，耗时 ${result.processTime}ms，置信度 ${(result.data.confidence * 100).toFixed(1)}%`)
      return result
    } catch (error) {
      ElMessage.error('OCR识别失败')
      console.error(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    invoices,
    currentInvoice,
    loading,
    searchText,

    // 计算属性
    filteredInvoices,
    invoiceStats,

    // 方法
    loadInvoices,
    saveInvoice,
    updateInvoice,
    deleteInvoice,
    setCurrentInvoice,
    recognizeInvoice
  }
})