import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'TaskList',
    component: () => import('../views/TaskList.vue'),
    meta: { title: '报听写' }
  },
  {
    path: '/create',
    name: 'CreateTask',
    component: () => import('../views/CreateTask.vue'),
    meta: { title: '新建任务' }
  },
  {
    path: '/edit/:id',
    name: 'EditTask',
    component: () => import('../views/CreateTask.vue'),
    meta: { title: '编辑任务' }
  },
  {
    path: '/dictation/:id',
    name: 'Dictation',
    component: () => import('../views/Dictation.vue'),
    meta: { title: '开始听写' }
  },
  {
    path: '/grading/:id',
    name: 'Grading',
    component: () => import('../views/Grading.vue'),
    meta: { title: '拍照批改' }
  },
  {
    path: '/result/:id',
    name: 'GradeResult',
    component: () => import('../views/GradeResult.vue'),
    meta: { title: '批改结果' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '设置' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  document.title = to.meta.title || '报听写'
})

export default router
