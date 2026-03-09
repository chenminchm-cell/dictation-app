<template>
  <div class="task-list-page">
    <!-- 可爱的顶部 -->
    <div class="page-header">
      <div class="header-decoration">
        <span class="deco-star">✨</span>
        <span class="deco-star delay1">⭐</span>
        <span class="deco-star delay2">✨</span>
      </div>
      <div class="header-content">
        <img src="/images/dictation-mascot.png" class="header-mascot float-animation" alt="mascot" />
        <h1 class="header-title">报听写</h1>
        <p class="header-subtitle">和小伙伴一起学习吧 ~</p>
      </div>
      <div class="header-wave">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,64 C480,150 960,-20 1440,64 L1440,120 L0,120 Z" fill="white" fill-opacity="0.3"/>
          <path d="M0,80 C480,160 960,0 1440,80 L1440,120 L0,120 Z" fill="white"/>
        </svg>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-container">
      <div v-if="tasks.length === 0" class="empty-state">
        <img src="/images/book-mascot.png" class="empty-mascot bounce-animation" alt="empty" />
        <p class="empty-text">还没有听写任务呢</p>
        <p class="empty-hint">点击下方按钮创建第一个任务吧 (ᵔᴥᵔ)</p>
      </div>

      <div v-else class="task-cards">
        <van-swipe-cell v-for="task in tasks" :key="task.id">
          <div class="task-card cute-card">
            <!-- 任务信息区 -->
            <div class="task-top" @click="$router.push(`/edit/${task.id}`)">
              <div class="task-avatar">
                <img src="/images/book-mascot.png" class="avatar-img" alt="" />
              </div>
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-meta">
                  <span class="app-tag app-tag-primary">{{ task.words.length }} 个词</span>
                  <span v-if="task.latestScore !== null" 
                    class="app-tag"
                    :class="{
                      'app-tag-green': task.latestScore >= 90,
                      'app-tag-orange': task.latestScore >= 60 && task.latestScore < 90,
                      'app-tag-red': task.latestScore < 60
                    }"
                  >
                    {{ task.latestScore }} 分
                  </span>
                  <span v-else class="app-tag" style="background:#f5f5f5;color:#bbb;">未测试</span>
                </div>
                <div class="task-words-preview">
                  {{ task.words.slice(0, 5).join(' · ') }}
                  <span v-if="task.words.length > 5"> ...</span>
                </div>
              </div>
              <van-icon name="arrow" class="task-edit-icon" />
            </div>

            <!-- 可爱的操作按钮区 -->
            <div class="task-actions">
              <button class="action-btn action-dictation" @click.stop="$router.push(`/dictation/${task.id}`)">
                <img src="/images/speaker-mascot.png" class="action-mascot" alt="" />
                <span class="action-text">听写</span>
              </button>
              <button class="action-btn action-grading" @click.stop="$router.push(`/grading/${task.id}`)">
                <img src="/images/success-mascot.png" class="action-mascot" alt="" />
                <span class="action-text">批改</span>
              </button>
              <button class="action-btn action-delete" @click.stop="handleDelete(task)">
                <span class="action-emoji">🗑️</span>
                <span class="action-text">删除</span>
              </button>
            </div>
          </div>
          <template #right>
            <van-button
              square
              type="danger"
              text="删除"
              class="swipe-btn"
              @click="handleDelete(task)"
            />
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <!-- 底部按钮区 -->
    <div class="fab-container">
      <van-button
        type="primary"
        round
        size="large"
        class="fab-button"
        @click="$router.push('/create')"
      >
        <span class="fab-icon">✨</span>
        新建听写任务
      </van-button>
      <div class="settings-link" @click="$router.push('/settings')">
        <van-icon name="setting-o" /> 设置
      </div>
      <div class="version-text">v{{ appVersion }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onActivated } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { getAllTasks, deleteTask, getLatestRecord } from '../db'

const appVersion = __APP_VERSION__
const tasks = ref([])

// 使用 onActivated，每次从其他页面返回时都刷新列表
onActivated(async () => {
  await loadTasks()
})

async function loadTasks() {
  const allTasks = await getAllTasks()
  for (const task of allTasks) {
    const record = await getLatestRecord(task.id)
    task.latestScore = record ? record.score : null
  }
  tasks.value = allTasks
}

async function handleDelete(task) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除「${task.title}」吗？\n相关的批改记录也会一并删除。`
    })
    await deleteTask(task.id)
    showToast('已删除')
    await loadTasks()
  } catch {
    // 取消删除
  }
}
</script>

<style scoped>
.task-list-page {
  min-height: 100vh;
  padding-bottom: 100px;
}

/* ===== 清爽的顶部 ===== */
.page-header {
  background: linear-gradient(135deg, #26a69a 0%, #4db6ac 50%, #80cbc4 100%);
  padding: 40px 20px 60px;
  position: relative;
  overflow: hidden;
}

.header-decoration {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 40px;
}

.deco-star {
  font-size: 20px;
  animation: twinkle 1.5s ease-in-out infinite;
}

.deco-star.delay1 {
  animation-delay: 0.5s;
}

.deco-star.delay2 {
  animation-delay: 1s;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.header-content {
  text-align: center;
  color: white;
  position: relative;
  z-index: 2;
}

.header-mascot {
  width: 100px;
  height: 100px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
}

.header-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.1);
  letter-spacing: 2px;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.95;
  margin: 8px 0 0;
  font-weight: 500;
}

.header-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
}

.header-wave svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ===== 任务容器 ===== */
.task-container {
  padding: 16px;
  margin-top: -20px;
  position: relative;
  z-index: 3;
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(38, 166, 154, 0.12);
}

.empty-mascot {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #555;
  margin: 0 0 8px;
  font-weight: 600;
}

.empty-hint {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* ===== 任务卡片 ===== */
.task-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.1);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.task-card:hover {
  border-color: var(--theme-primary-light);
}

.task-top {
  padding: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.task-top:active {
  background: #f5faf9;
}

.task-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #e0f2f1 0%, #e3f2fd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.avatar-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
}

.task-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.task-words-preview {
  font-size: 12px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-edit-icon {
  color: #ddd;
  font-size: 16px;
  margin-left: 8px;
  flex-shrink: 0;
}

/* ===== 操作按钮区域 ===== */
.task-actions {
  display: flex;
  border-top: 1px solid #f0f0f0;
  background: linear-gradient(180deg, #fafafa 0%, white 100%);
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:active {
  transform: scale(0.95);
  background: #f5f5f5;
}

.action-btn + .action-btn {
  border-left: 1px solid #f0f0f0;
}

.action-mascot {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.action-emoji {
  font-size: 22px;
}

.action-text {
  font-size: 12px;
  font-weight: 600;
}

.action-dictation .action-text {
  color: var(--theme-primary);
}

.action-grading .action-text {
  color: var(--theme-success);
}

.action-delete .action-text {
  color: #bbb;
}

.swipe-btn {
  height: 100%;
}

/* ===== 浮动按钮 ===== */
.fab-container {
  position: fixed;
  bottom: 24px;
  left: 16px;
  right: 16px;
  z-index: 100;
}

.fab-button {
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 6px 20px rgba(38, 166, 154, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.fab-icon {
  font-size: 18px;
}

/* ===== 浮动动画 ===== */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.float-animation {
  animation: float 3s ease-in-out infinite;
}

/* ===== 弹跳动画 ===== */
@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.bounce-animation {
  animation: bounce 2s ease-in-out infinite;
}

/* ===== 设置链接 ===== */
.settings-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 14px;
  color: #999;
  cursor: pointer;
}

.settings-link:active {
  color: var(--theme-primary);
}

.version-text {
  text-align: center;
  font-size: 11px;
  color: #ccc;
  margin-top: 8px;
}
</style>
