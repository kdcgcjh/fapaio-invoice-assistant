import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/invoices'
  },
  {
    path: '/invoices',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    children: [
      {
        path: '',
        name: 'InvoiceList',
        component: () => import('@/views/InvoiceList.vue'),
        meta: { title: '发票列表' }
      },
      {
        path: 'scan',
        name: 'InvoiceScan',
        component: () => import('@/views/InvoiceScan.vue'),
        meta: { title: '扫描发票' }
      },
      {
        path: ':id',
        name: 'InvoiceDetail',
        component: () => import('@/views/InvoiceDetail.vue'),
        meta: { title: '发票详情' }
      }
    ]
  },
  {
    path: '/automation',
    name: 'Automation',
    component: () => import('@/views/Automation.vue'),
    meta: { title: '自动填写' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '系统设置' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/Logs.vue'),
    meta: { title: '操作日志' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 发票识别助手`
  }
  next()
})

export default router