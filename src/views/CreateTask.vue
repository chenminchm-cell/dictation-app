<template>
  <div class="create-task-page">
    <!-- 导航栏 -->
    <van-nav-bar
      :title="isEdit ? '编辑任务' : '新建任务'"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="form-container">
      <!-- 任务标题 -->
      <van-cell-group inset class="form-group">
        <van-field
          v-model="title"
          label="标题"
          placeholder="例如：第三单元词语"
          maxlength="30"
          show-word-limit
        />
      </van-cell-group>

      <!-- 录入方式 -->
      <div class="section-title">录入词语</div>
      <div class="input-methods">
        <div class="method-card" @click="showCameraOptions">
          <div class="method-icon">📷</div>
          <div class="method-name">拍照识别</div>
          <div class="method-desc">拍摄课本/词语表</div>
        </div>
        <div class="method-card" @click="showManualInput = true">
          <div class="method-icon">⌨️</div>
          <div class="method-name">手动输入</div>
          <div class="method-desc">逐个输入词语</div>
        </div>
      </div>

      <!-- OCR 识别进度 -->
      <div v-if="isRecognizing" class="ocr-progress">
        <van-loading type="spinner" size="20px" />
        <span>正在识别文字... {{ ocrProgressValue }}%</span>
        <van-progress :percentage="ocrProgressValue" stroke-width="4" />
      </div>

      <!-- 词语列表 -->
      <div v-if="words.length > 0" class="section-title">
        词语列表（{{ words.length }} 个）
        <span class="clear-all" @click="clearAllWords">清空</span>
      </div>
      <div v-if="words.length > 0" class="words-list">
        <div
          v-for="(word, index) in words"
          :key="index"
          class="word-tag"
        >
          <span class="word-text" @click="editWord(index)">{{ word }}</span>
          <van-icon name="cross" class="word-remove" @click="removeWord(index)" />
        </div>
      </div>

      <!-- 听写设置 -->
      <div class="section-title">听写设置</div>
      <van-cell-group inset class="form-group">
        <van-cell title="语速">
          <template #value>
            <div class="slider-cell">
              <span class="slider-label">慢</span>
              <van-slider
                v-model="speed"
                :min="30"
                :max="150"
                :step="10"
                class="speed-slider"
              />
              <span class="slider-label">快</span>
              <span class="slider-value">{{ (speed / 100).toFixed(1) }}</span>
            </div>
          </template>
        </van-cell>
        <van-cell title="每词遍数">
          <template #value>
            <van-stepper v-model="repeats" :min="1" :max="5" />
          </template>
        </van-cell>
        <van-cell title="间隔时间">
          <template #value>
            <van-stepper v-model="interval" :min="2" :max="30" />
            <span class="unit-text">秒</span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 保存按钮 -->
      <div class="save-container">
        <van-button
          type="primary"
          round
          block
          size="large"
          :disabled="!canSave"
          @click="saveTask"
        >
          {{ isEdit ? '保存修改' : '创建任务' }}
        </van-button>
      </div>
    </div>

    <!-- 手动输入弹窗 -->
    <van-dialog
      v-model:show="showManualInput"
      title="输入词语"
      show-cancel-button
      :before-close="onManualInputClose"
    >
      <div class="manual-input-content">
        <van-field
          v-model="manualText"
          type="textarea"
          rows="4"
          placeholder="输入词语，每行一个&#10;或用逗号、顿号分隔&#10;例如：&#10;美丽&#10;善良&#10;beautiful"
          autofocus
        />
      </div>
    </van-dialog>

    <!-- 编辑单个词语弹窗 -->
    <van-dialog
      v-model:show="showEditWord"
      title="编辑词语"
      show-cancel-button
      @confirm="confirmEditWord"
    >
      <div class="manual-input-content">
        <van-field v-model="editingWordText" placeholder="输入词语" autofocus />
      </div>
    </van-dialog>

    <!-- ===== OCR 识别结果选择弹窗 ===== -->
    <van-popup
      v-model:show="showOcrPicker"
      position="bottom"
      round
      :style="{ maxHeight: '85vh' }"
      closeable
    >
      <div class="ocr-picker">
        <div class="ocr-picker-header">
          <h3 class="ocr-picker-title">识别结果</h3>
          <p class="ocr-picker-hint">请勾选需要添加的词语，点击文字可编辑修改</p>
        </div>

        <div class="ocr-picker-toolbar">
          <span class="picker-count">已选 {{ selectedOcrCount }} / {{ ocrCandidates.length }} 个</span>
          <div class="picker-actions">
            <span class="picker-link" @click="selectAllOcr">全选</span>
            <span class="picker-link" @click="deselectAllOcr">全不选</span>
          </div>
        </div>

        <div class="ocr-picker-list">
          <div
            v-for="(item, idx) in ocrCandidates"
            :key="idx"
            class="ocr-item"
            :class="{ selected: item.checked }"
            @click="item.checked = !item.checked"
          >
            <van-checkbox v-model="item.checked" shape="square" icon-size="18px" @click.stop />
            <span
              class="ocr-item-text"
              @click.stop="editOcrItem(idx)"
            >
              {{ item.text }}
            </span>
            <van-icon name="edit" class="ocr-item-edit" @click.stop="editOcrItem(idx)" />
          </div>
        </div>

        <div class="ocr-picker-footer">
          <van-button
            type="primary"
            round
            block
            size="large"
            :disabled="selectedOcrCount === 0"
            @click="confirmOcrSelection"
          >
            添加选中的 {{ selectedOcrCount }} 个词语
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 编辑 OCR 识别项弹窗 -->
    <van-dialog
      v-model:show="showEditOcrItem"
      title="修改识别结果"
      show-cancel-button
      @confirm="confirmEditOcrItem"
    >
      <div class="manual-input-content">
        <van-field v-model="editingOcrText" placeholder="输入正确内容" autofocus />
      </div>
    </van-dialog>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelected"
    />
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="onFileSelected"
    />

    <!-- 拍照/选择方式 -->
    <van-action-sheet
      v-model:show="showCameraSheet"
      :actions="cameraActions"
      cancel-text="取消"
      @select="onCameraSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { addTask, updateTask, getTask } from '../db'
import { recognizeWords, ocrProgress } from '../services/ocr'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => route.name === 'EditTask')
const taskId = computed(() => route.params.id ? Number(route.params.id) : null)

// 表单数据
const title = ref('')
const words = ref([])
const speed = ref(80)    // 80 = 0.8x
const repeats = ref(2)
const interval = ref(5)

// UI 状态
const showManualInput = ref(false)
const showEditWord = ref(false)
const showCameraSheet = ref(false)
const manualText = ref('')
const editingWordIndex = ref(-1)
const editingWordText = ref('')
const isRecognizing = ref(false)
const ocrProgressValue = computed(() => ocrProgress.value)
const fileInput = ref(null)
const cameraInput = ref(null)

// OCR 选择弹窗
const showOcrPicker = ref(false)
const ocrCandidates = ref([])   // [{ text: string, checked: boolean }]
const showEditOcrItem = ref(false)
const editingOcrIndex = ref(-1)
const editingOcrText = ref('')

const selectedOcrCount = computed(() => ocrCandidates.value.filter(c => c.checked).length)

const cameraActions = [
  { name: '拍照', value: 'camera' },
  { name: '从相册选择', value: 'gallery' }
]

const canSave = computed(() => {
  return title.value.trim() && words.value.length > 0
})

// 编辑模式：加载已有任务
onMounted(async () => {
  if (isEdit.value && taskId.value) {
    const task = await getTask(taskId.value)
    if (task) {
      title.value = task.title
      words.value = [...task.words]
      speed.value = Math.round((task.speed || 0.8) * 100)
      repeats.value = task.repeats || 2
      interval.value = task.intervalSeconds || 5
    }
  }
})

// ===== 拍照 / 选择图片 =====
function showCameraOptions() {
  showCameraSheet.value = true
}

function onCameraSelect(action) {
  showCameraSheet.value = false
  if (action.value === 'camera') {
    cameraInput.value?.click()
  } else {
    fileInput.value?.click()
  }
}

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  isRecognizing.value = true
  try {
    const recognized = await recognizeWords(file)
    if (recognized.length > 0) {
      // 将识别结果展示为候选列表，让用户勾选
      ocrCandidates.value = recognized.map(text => ({
        text,
        checked: true  // 默认全选
      }))
      showOcrPicker.value = true
    } else {
      showToast('未识别到词语，请重新拍照')
    }
  } catch (err) {
    showToast('识别失败：' + err.message)
  } finally {
    isRecognizing.value = false
    e.target.value = ''
  }
}

// ===== OCR 选择操作 =====
function selectAllOcr() {
  ocrCandidates.value.forEach(c => c.checked = true)
}

function deselectAllOcr() {
  ocrCandidates.value.forEach(c => c.checked = false)
}

function editOcrItem(index) {
  editingOcrIndex.value = index
  editingOcrText.value = ocrCandidates.value[index].text
  showEditOcrItem.value = true
}

function confirmEditOcrItem() {
  if (editingOcrText.value.trim()) {
    ocrCandidates.value[editingOcrIndex.value].text = editingOcrText.value.trim()
  }
}

function confirmOcrSelection() {
  const selected = ocrCandidates.value
    .filter(c => c.checked)
    .map(c => c.text)
    .filter(t => !words.value.includes(t))  // 去重

  words.value.push(...selected)
  showToast(`添加了 ${selected.length} 个词语`)
  showOcrPicker.value = false
  ocrCandidates.value = []
}

// ===== 手动输入 =====
function onManualInputClose(action) {
  if (action === 'confirm' && manualText.value.trim()) {
    const newWords = manualText.value
      .split(/[\n\r,，、；;]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .filter(w => !words.value.includes(w))

    words.value.push(...newWords)
    showToast(`添加了 ${newWords.length} 个词语`)
  }
  manualText.value = ''
  return true
}

// ===== 编辑单个词语 =====
function editWord(index) {
  editingWordIndex.value = index
  editingWordText.value = words.value[index]
  showEditWord.value = true
}

function confirmEditWord() {
  if (editingWordText.value.trim()) {
    words.value[editingWordIndex.value] = editingWordText.value.trim()
  }
}

// 删除词语
function removeWord(index) {
  words.value.splice(index, 1)
}

// 清空所有
async function clearAllWords() {
  try {
    await showConfirmDialog({
      title: '清空词语',
      message: '确定要清空所有词语吗？'
    })
    words.value = []
  } catch {
    // 取消
  }
}

// ===== 保存任务 =====
async function saveTask() {
  const taskData = {
    title: title.value.trim(),
    words: [...words.value],
    speed: speed.value / 100,
    repeats: repeats.value,
    intervalSeconds: interval.value
  }

  try {
    if (isEdit.value && taskId.value) {
      await updateTask(taskId.value, taskData)
      showToast('已保存')
    } else {
      await addTask(taskData)
      showToast('创建成功')
    }
    router.back()
  } catch (err) {
    showToast('保存失败：' + err.message)
  }
}
</script>

<style scoped>
.create-task-page {
  min-height: 100vh;
  background: transparent;
  padding-bottom: 32px;
}

.form-container {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  padding: 16px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-all {
  font-size: 13px;
  color: var(--theme-danger);
  font-weight: 500;
  cursor: pointer;
}

/* ===== 录入方式卡片 ===== */
.input-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
}

.method-card {
  background: white;
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.method-card:active {
  transform: scale(0.96);
  border-color: var(--theme-primary-light);
}

.method-icon {
  font-size: 44px;
  margin-bottom: 10px;
}

.method-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.method-desc {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.ocr-progress {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  color: #666;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* ===== 词语标签 ===== */
.words-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 0 12px;
}

.word-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #e0f2f1, #e3f2fd);
  border: 2px solid #e0f2f1;
  border-radius: 16px;
  padding: 8px 14px;
  font-size: 14px;
  transition: all 0.2s;
}

.word-tag:active {
  transform: scale(0.96);
}

.word-text {
  color: #333;
  cursor: pointer;
  font-weight: 500;
}

.word-remove {
  font-size: 14px;
  color: #bbb;
  cursor: pointer;
  transition: color 0.2s;
}

.word-remove:active {
  color: var(--theme-danger);
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

.slider-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-primary);
  min-width: 28px;
  text-align: right;
}

.unit-text {
  font-size: 14px;
  color: #666;
  margin-left: 4px;
}

.save-container {
  padding: 24px 0 16px;
}

.manual-input-content {
  padding: 16px 20px;
}

/* ===== OCR 选择弹窗 ===== */
.ocr-picker {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.ocr-picker-header {
  padding: 24px 16px 16px;
  text-align: center;
  background: linear-gradient(180deg, #e0f2f1, white);
}

.ocr-picker-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 6px;
}

.ocr-picker-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.ocr-picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.picker-count {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.picker-actions {
  display: flex;
  gap: 16px;
}

.picker-link {
  font-size: 13px;
  color: var(--theme-primary);
  cursor: pointer;
  font-weight: 500;
}

.ocr-picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 50vh;
}

.ocr-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
}

.ocr-item:active {
  background: #f5f5f5;
}

.ocr-item.selected {
  background: linear-gradient(90deg, #e0f2f1, white);
}

:deep(.van-checkbox__icon--checked .van-icon) {
  background-color: var(--theme-primary) !important;
  border-color: var(--theme-primary) !important;
}

.ocr-item-text {
  flex: 1;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  font-weight: 500;
}

.ocr-item-edit {
  color: #ccc;
  font-size: 18px;
  flex-shrink: 0;
  cursor: pointer;
}

.ocr-picker-footer {
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  border-top: 1px solid #f0f0f0;
}
</style>
