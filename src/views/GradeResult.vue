<template>
  <div class="result-page">
    <van-nav-bar
      title="批改结果"
      left-arrow
      @click-left="$router.push('/')"
    />

    <div class="result-container" v-if="record">
      <!-- 可爱的得分卡片 -->
      <div class="score-card" :class="scoreClass">
        <div class="score-decoration">
          <span class="deco-item">✨</span>
          <span class="deco-item delay1">⭐</span>
          <span class="deco-item delay2">✨</span>
        </div>
        <img 
          src="/images/success-mascot.png" 
          class="score-mascot" 
          :class="{ 'bounce-animation': record.score >= 60 }"
          alt="" 
        />
        <div class="score-ring">
          <van-circle
            :current-rate="record.score"
            :rate="record.score"
            :speed="80"
            :stroke-width="80"
            size="150px"
            :color="scoreColor"
            layer-color="#fff0f3"
          >
            <div class="score-inner">
              <span class="score-number">{{ record.score }}</span>
              <span class="score-unit">分</span>
            </div>
          </van-circle>
        </div>
        <div class="score-summary">
          <span class="score-badge" :class="scoreClass">{{ scoreLabel }}</span>
          <span class="score-detail">
            {{ record.correctCount }} / {{ record.totalCount }} 正确
          </span>
        </div>
        <div v-if="record.score >= 90" class="score-encourage">
          太棒啦！继续保持哦～ (ᵔᴥᵔ)
        </div>
        <div v-else-if="record.score >= 60" class="score-encourage">
          做得不错！再努力一点点～
        </div>
        <div v-else class="score-encourage">
          没关系，下次一定可以更好！加油！
        </div>
      </div>

      <!-- 详细结果 -->
      <div class="result-list">
        <div class="result-title">详细结果</div>
        <div
          v-for="(item, idx) in record.details"
          :key="idx"
          class="result-item"
          :class="{ correct: item.isCorrect, wrong: !item.isCorrect }"
        >
          <div class="result-index">{{ idx + 1 }}</div>
          <div class="result-content">
            <div class="result-original">{{ item.original }}</div>
            <div v-if="!item.isCorrect" class="result-written">
              写的：{{ item.written }}
            </div>
          </div>
          <div class="result-status">
            <span v-if="item.isCorrect" class="status-correct">✓</span>
            <span v-else class="status-wrong">✗</span>
          </div>
        </div>
      </div>

      <!-- 错词汇总 -->
      <div v-if="wrongWords.length > 0" class="wrong-summary">
        <div class="wrong-title">❌ 错误的词（{{ wrongWords.length }} 个）</div>
        <div class="wrong-words">
          <div v-for="item in wrongWords" :key="item.original" class="wrong-item">
            <span class="wrong-correct">{{ item.original }}</span>
            <span class="wrong-arrow">←</span>
            <span class="wrong-written">{{ item.written }}</span>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="result-actions">
        <van-button
          type="primary"
          round
          block
          size="large"
          @click="$router.push('/')"
        >
          返回首页
        </van-button>
        <van-button
          v-if="record.taskId"
          round
          block
          size="large"
          class="btn-retry"
          @click="$router.push(`/dictation/${record.taskId}`)"
        >
          🔄 重新听写
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getRecord } from '../db'

const route = useRoute()
const record = ref(null)

const scoreClass = computed(() => {
  if (!record.value) return ''
  const s = record.value.score
  if (s >= 90) return 'excellent'
  if (s >= 70) return 'good'
  if (s >= 60) return 'pass'
  return 'fail'
})

const scoreColor = computed(() => {
  if (!record.value) return '#4f6ef7'
  const s = record.value.score
  if (s >= 90) return '#07c160'
  if (s >= 70) return '#4f6ef7'
  if (s >= 60) return '#ff9800'
  return '#ee0a24'
})

const scoreLabel = computed(() => {
  if (!record.value) return ''
  const s = record.value.score
  if (s === 100) return '满分!'
  if (s >= 90) return '优秀'
  if (s >= 70) return '良好'
  if (s >= 60) return '及格'
  return '继续加油'
})

const wrongWords = computed(() => {
  if (!record.value) return []
  return record.value.details.filter(d => !d.isCorrect)
})

onMounted(async () => {
  const id = Number(route.params.id)
  record.value = await getRecord(id)
})
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: transparent;
}

.result-container {
  padding: 16px;
  padding-bottom: 32px;
}

/* ===== 得分卡片 ===== */
.score-card {
  background: white;
  border-radius: 20px;
  padding: 32px 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(38, 166, 154, 0.12);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  border: 2px solid #e0f2f1;
}

.score-decoration {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 8px;
}

.deco-item {
  font-size: 18px;
  animation: twinkle 1.5s ease-in-out infinite;
}

.deco-item.delay1 {
  animation-delay: 0.5s;
}

.deco-item.delay2 {
  animation-delay: 1s;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}

.score-mascot {
  width: 80px;
  height: 80px;
  margin-bottom: 12px;
}

.bounce-animation {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.score-ring {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.score-inner {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.score-number {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.excellent .score-number {
  background: linear-gradient(135deg, #43a047, #66bb6a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.score-unit {
  font-size: 18px;
  color: #999;
  margin-left: 4px;
}

.score-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.score-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
}

.score-badge.excellent {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
}

.score-badge.good {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
}

.score-badge.pass {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  color: #f57f17;
}

.score-badge.fail {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  color: #c62828;
}

.score-detail {
  font-size: 14px;
  color: #999;
}

.score-encourage {
  font-size: 14px;
  color: #888;
  margin-top: 8px;
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 12px;
  display: inline-block;
}

/* ===== 详细结果列表 ===== */
.result-list {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.08);
}

.result-title {
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  border-bottom: 1px solid #e0f2f1;
  background: linear-gradient(90deg, #e0f2f1, #e3f2fd);
}

.result-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.correct {
  background: linear-gradient(90deg, #f0fff4 0%, white 100%);
}

.result-item.wrong {
  background: linear-gradient(90deg, #fff5f5 0%, white 100%);
}

.result-index {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2f1, #e3f2fd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #999;
  margin-right: 12px;
  flex-shrink: 0;
  font-weight: 600;
}

.result-item.correct .result-index {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
  color: #2e7d32;
}

.result-item.wrong .result-index {
  background: linear-gradient(135deg, #ffcdd2, #ef9a9a);
  color: #c62828;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-original {
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.result-written {
  font-size: 13px;
  color: #e57373;
  margin-top: 4px;
}

.result-status {
  margin-left: 8px;
  flex-shrink: 0;
}

.status-correct {
  font-size: 22px;
  color: var(--theme-success);
  font-weight: 700;
}

.status-wrong {
  font-size: 22px;
  color: #ef5350;
  font-weight: 700;
}

/* ===== 错词汇总 ===== */
.wrong-summary {
  background: linear-gradient(135deg, #fff5f5, #ffebee);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  border: 2px solid #ffcdd2;
}

.wrong-title {
  font-size: 16px;
  font-weight: 700;
  color: #c62828;
  margin-bottom: 14px;
}

.wrong-words {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wrong-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
}

.wrong-correct {
  color: var(--theme-success);
  font-weight: 700;
}

.wrong-arrow {
  color: #ddd;
}

.wrong-written {
  color: #e57373;
  text-decoration: line-through;
}

/* ===== 底部按钮 ===== */
.result-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.btn-retry {
  color: #666 !important;
  border-color: #eee !important;
}
</style>
