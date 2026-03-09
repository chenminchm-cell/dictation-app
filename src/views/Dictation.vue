<template>
  <div class="dictation-page">
    <!-- 导航栏 -->
    <van-nav-bar
      title="听写"
      left-arrow
      @click-left="handleBack"
    />

    <div class="dictation-container">
      <!-- 任务信息 -->
      <div class="task-header">
        <h2 class="task-name">{{ task?.title }}</h2>
        <p class="task-info-text">共 {{ task?.words?.length || 0 }} 个词</p>
      </div>

      <!-- 可爱的播放状态区域 -->
      <div class="player-area">
        <!-- 未开始 -->
        <div v-if="!playing && !finished" class="state-idle">
          <img src="/images/speaker-mascot.png" class="state-mascot float-animation" alt="" />
          <p class="state-text">准备好纸笔，点击开始听写吧！</p>
          <p class="state-emoji">✏️📝</p>
        </div>

        <!-- 播放中 -->
        <div v-if="playing" class="state-playing">
          <img src="/images/speaker-mascot.png" class="state-mascot pulse" alt="" />
          <div class="progress-info">
            <div class="progress-main">
              第 <span class="highlight">{{ currentIndex + 1 }}</span> / {{ task?.words?.length }} 个词
            </div>
            <div class="progress-sub">
              本词第 {{ currentRepeatValue + 1 }} / {{ repeats }} 遍
            </div>
          </div>
          <van-progress
            :percentage="progressPercent"
            stroke-width="8"
            color="linear-gradient(90deg, #26a69a, #4db6ac)"
            track-color="#e0f2f1"
            class="main-progress"
          />
          <div v-if="paused" class="paused-badge">
            ⏸️ 已暂停
          </div>
        </div>

        <!-- 完成 -->
        <div v-if="finished" class="state-finished">
          <img src="/images/success-mascot.png" class="state-mascot bounce-animation" alt="" />
          <p class="state-text">听写完成啦！</p>
          <p class="state-hint">写好了吗？去批改看看得了多少分 (ᵔᴥᵔ)</p>
        </div>
      </div>

      <!-- 设置区域（播放中也可见，但部分禁用） -->
      <div v-if="!finished" class="settings-area">
        <div class="settings-title">
          <span>听写设置</span>
          <span v-if="playing && !paused" class="settings-hint">（暂停后可修改）</span>
          <span v-if="paused" class="settings-hint settings-hint-ok">（可修改设置）</span>
        </div>
        <van-cell-group inset>
          <!-- 语音选择 -->
          <van-cell title="中文语音" is-link :clickable="settingsEditable" @click="settingsEditable && (showZhVoicePicker = true)">
            <template #value>
              <span class="voice-name">{{ zhVoiceLabel }}</span>
            </template>
          </van-cell>
          <van-cell title="英文语音" is-link :clickable="settingsEditable" @click="settingsEditable && (showEnVoicePicker = true)">
            <template #value>
              <span class="voice-name">{{ enVoiceLabel }}</span>
            </template>
          </van-cell>
          <!-- 语速 -->
          <van-cell title="语速">
            <template #value>
              <div class="slider-cell">
                <span class="slider-label">慢</span>
                <van-slider
                  v-model="speed"
                  :min="30"
                  :max="150"
                  :step="10"
                  :disabled="!settingsEditable"
                  class="speed-slider"
                />
                <span class="slider-label">快</span>
                <span class="slider-value">{{ (speed / 100).toFixed(1) }}x</span>
              </div>
            </template>
          </van-cell>
          <!-- 每词遍数 -->
          <van-cell title="每词读几遍">
            <template #value>
              <van-stepper v-model="repeats" :min="1" :max="5" :disabled="!settingsEditable" />
            </template>
          </van-cell>
          <!-- 同词两遍间隔 -->
          <van-cell title="两遍间隔">
            <template #value>
              <van-stepper v-model="repeatGap" :min="0.5" :max="5" :step="0.5" :disabled="!settingsEditable" />
              <span class="unit-text">秒</span>
            </template>
          </van-cell>
          <!-- 词间间隔 -->
          <van-cell title="词间间隔">
            <template #value>
              <van-stepper v-model="intervalSec" :min="2" :max="30" :disabled="!settingsEditable" />
              <span class="unit-text">秒</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <van-button
          v-if="!playing && !finished"
          type="primary"
          round
          block
          size="large"
          icon="play-circle-o"
          @click="handleStart"
        >
          开始听写
        </van-button>

        <div v-if="playing" class="control-row">
          <van-button
            v-if="!paused"
            type="warning"
            round
            size="large"
            icon="pause-circle-o"
            class="ctrl-btn"
            @click="handlePause"
          >
            暂停
          </van-button>
          <van-button
            v-if="paused"
            type="primary"
            round
            size="large"
            icon="play-circle-o"
            class="ctrl-btn"
            @click="handleResume"
          >
            继续
          </van-button>
          <van-button
            type="danger"
            round
            size="large"
            icon="stop-circle-o"
            class="ctrl-btn"
            @click="handleStop"
          >
            停止
          </van-button>
        </div>

        <div v-if="finished" class="control-row">
          <van-button
            type="primary"
            round
            size="large"
            class="ctrl-btn"
            @click="goGrading"
          >
            📷 拍照批改
          </van-button>
          <van-button
            type="default"
            round
            size="large"
            class="ctrl-btn"
            @click="handleReset"
          >
            🔄 再来一次
          </van-button>
        </div>
      </div>

      <!-- 词语预览 -->
      <div class="words-preview">
        <van-collapse v-model="previewOpen">
          <van-collapse-item title="查看词语列表" name="1">
            <div class="preview-words">
              <span
                v-for="(word, idx) in task?.words || []"
                :key="idx"
                class="preview-word"
                :class="{ 'is-current': playing && idx === currentIndex }"
                @click="previewSpeak(word)"
              >
                {{ word }}
              </span>
            </div>
          </van-collapse-item>
        </van-collapse>
      </div>
    </div>

    <!-- 中文语音选择 -->
    <van-action-sheet
      v-model:show="showZhVoicePicker"
      title="选择中文语音"
      :actions="zhVoiceActions"
      cancel-text="取消"
      @select="onZhVoiceSelect"
    />

    <!-- 英文语音选择 -->
    <van-action-sheet
      v-model:show="showEnVoicePicker"
      title="选择英文语音"
      :actions="enVoiceActions"
      cancel-text="取消"
      @select="onEnVoiceSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { getTask } from '../db'
import {
  startDictation,
  pauseDictation,
  resumeDictation,
  stopDictation,
  speakWord,
  loadVoices,
  getChineseVoices,
  getFilteredEnglishVoices,
  selectedVoiceZh,
  selectedVoiceEn,
  isPlaying,
  isPaused,
  currentWordIndex,
  currentRepeat,
  paramSpeed,
  paramRepeats,
  paramInterval,
  paramRepeatGap
} from '../services/tts'

const router = useRouter()
const route = useRoute()

const task = ref(null)
const finished = ref(false)
const previewOpen = ref([])

// 本地设置变量（双向绑定到 UI）
const speed = ref(80)        // UI值 30~150, 对应 0.3x~1.5x
const repeats = ref(2)
const intervalSec = ref(5)
const repeatGap = ref(1.5)

// 将本地设置同步到 TTS 服务的动态参数
watch(speed, (v) => { paramSpeed.value = v / 100 }, { immediate: true })
watch(repeats, (v) => { paramRepeats.value = v }, { immediate: true })
watch(intervalSec, (v) => { paramInterval.value = v }, { immediate: true })
watch(repeatGap, (v) => { paramRepeatGap.value = v }, { immediate: true })

// 语音选择
const showZhVoicePicker = ref(false)
const showEnVoicePicker = ref(false)

const playing = computed(() => isPlaying.value)
const paused = computed(() => isPaused.value)
const settingsEditable = computed(() => !playing.value || paused.value)
const currentIndex = computed(() => currentWordIndex.value)
const currentRepeatValue = computed(() => currentRepeat.value)

const progressPercent = computed(() => {
  if (!task.value || !playing.value) return 0
  const total = task.value.words.length
  return Math.round((currentIndex.value + 1) / total * 100)
})

// 语音选项列表
function formatVoiceName(v) {
  return v.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s+Online.*$/i, '')
    .replace(/\s+Desktop$/i, '')
}

const zhVoiceActions = computed(() => {
  const voices = getChineseVoices()
  return voices.map(v => ({
    name: formatVoiceName(v),
    subname: v.lang,
    value: v.name,
    className: v.name === selectedVoiceZh.value ? 'voice-selected' : ''
  }))
})

const enVoiceActions = computed(() => {
  const voices = getFilteredEnglishVoices()
  return voices.map(v => ({
    name: v._label,
    subname: formatVoiceName(v),
    value: v.name,
    className: v.name === selectedVoiceEn.value ? 'voice-selected' : ''
  }))
})

const zhVoiceLabel = computed(() => {
  if (!selectedVoiceZh.value) return '默认'
  const v = getChineseVoices().find(v => v.name === selectedVoiceZh.value)
  return v ? formatVoiceName(v) : '默认'
})

const enVoiceLabel = computed(() => {
  if (!selectedVoiceEn.value) return '默认'
  const voices = getFilteredEnglishVoices()
  const v = voices.find(v => v.name === selectedVoiceEn.value)
  return v ? v._label : '默认'
})

function onZhVoiceSelect(action) {
  selectedVoiceZh.value = action.value
  showZhVoicePicker.value = false
}

function onEnVoiceSelect(action) {
  selectedVoiceEn.value = action.value
  showEnVoicePicker.value = false
}

// 读取全局默认听写参数
function loadDefaults() {
  try {
    const saved = localStorage.getItem('dictation_defaults')
    if (saved) return JSON.parse(saved)
  } catch {}
  return { speed: 80, repeats: 2, interval: 5 }
}

onMounted(async () => {
  loadVoices()
  const globalDefaults = loadDefaults()

  const id = Number(route.params.id)
  task.value = await getTask(id)
  if (task.value) {
    // 优先用任务自身参数，其次全局默认
    speed.value = task.value.speed
      ? Math.round(task.value.speed * 100)
      : globalDefaults.speed
    repeats.value = task.value.repeats || globalDefaults.repeats
    intervalSec.value = task.value.intervalSeconds || globalDefaults.interval
  }
})

onBeforeUnmount(() => {
  stopDictation()
})

function handleStart() {
  if (!task.value) return
  finished.value = false

  // 参数已通过 watch 同步到 TTS 服务的动态 ref
  startDictation(task.value.words, {
    onFinish: () => {
      finished.value = true
    }
  })
}

function handlePause() { pauseDictation() }
function handleResume() { resumeDictation() }

function handleStop() {
  stopDictation()
  finished.value = false
}

function handleReset() {
  finished.value = false
}

function goGrading() {
  router.push(`/grading/${task.value.id}`)
}

function previewSpeak(word) {
  speakWord(word)
}

async function handleBack() {
  if (playing.value) {
    try {
      await showConfirmDialog({ title: '提示', message: '听写还在进行中，确定要退出吗？' })
      stopDictation()
      router.back()
    } catch { /* 取消 */ }
  } else {
    router.back()
  }
}
</script>

<style scoped>
.dictation-page {
  min-height: 100vh;
  background: transparent;
}

.dictation-container {
  padding: 16px;
  padding-bottom: 32px;
}

.task-header {
  text-align: center;
  padding: 8px 0 16px;
}

.task-name {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0 0 4px;
}

.task-info-text {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* ===== 播放区域 ===== */
.player-area {
  background: white;
  border-radius: 20px;
  padding: 32px 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(38, 166, 154, 0.12);
  margin-bottom: 16px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0f2f1;
}

.state-mascot {
  width: 100px;
  height: 100px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
}

.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.float-animation {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.bounce-animation {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.state-text {
  font-size: 17px;
  color: #333;
  margin: 0;
  font-weight: 600;
}

.state-emoji {
  font-size: 24px;
  margin-top: 8px;
}

.state-hint {
  font-size: 14px;
  color: #999;
  margin: 8px 0 0;
}

.progress-info {
  margin-bottom: 16px;
}

.progress-main {
  font-size: 18px;
  color: #333;
  margin-bottom: 4px;
}

.highlight {
  color: var(--theme-primary);
  font-weight: 700;
  font-size: 28px;
}

.progress-sub {
  font-size: 14px;
  color: #999;
}

.main-progress {
  width: 100%;
  margin-top: 8px;
}

:deep(.van-progress__pivot) {
  background: var(--theme-primary) !important;
}

.paused-badge {
  margin-top: 16px;
  display: inline-block;
  background: linear-gradient(135deg, #fff8e1, #ffe082);
  color: #f57c00;
  padding: 6px 20px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.25);
}

/* ===== 设置区域 ===== */
.settings-area {
  margin-bottom: 16px;
}

.settings-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  padding: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-hint {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}

.settings-hint-ok {
  color: var(--theme-success);
}

.slider-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.slider-label {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.speed-slider {
  flex: 1;
}

:deep(.van-slider__bar) {
  background: linear-gradient(90deg, #26a69a, #4db6ac) !important;
}

:deep(.van-slider__button) {
  box-shadow: 0 2px 8px rgba(38, 166, 154, 0.4);
}

.slider-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-primary);
  min-width: 36px;
  text-align: right;
}

.unit-text {
  font-size: 14px;
  color: #666;
  margin-left: 4px;
}

.voice-name {
  font-size: 13px;
  color: var(--theme-primary);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

/* ===== 控制按钮 ===== */
.controls {
  padding: 0 0 16px;
}

.control-row {
  display: flex;
  gap: 12px;
}

.ctrl-btn {
  flex: 1;
}

/* ===== 词语预览 ===== */
.words-preview {
  margin-top: 8px;
}

:deep(.van-collapse-item__title) {
  border-radius: 16px;
}

.preview-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-word {
  display: inline-block;
  background: linear-gradient(135deg, #e0f2f1, #e3f2fd);
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0f2f1;
}

.preview-word:active {
  transform: scale(0.95);
}

.preview-word.is-current {
  background: linear-gradient(135deg, #26a69a, #4db6ac);
  color: white;
  font-weight: 600;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(38, 166, 154, 0.35);
}

/* 语音选择项高亮 */
:deep(.voice-selected) {
  color: var(--theme-primary) !important;
  font-weight: 600 !important;
}
</style>
