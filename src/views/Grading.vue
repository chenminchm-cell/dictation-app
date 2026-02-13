<template>
  <div class="grading-page">
    <van-nav-bar
      title="批改"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="grading-container">
      <!-- 选择批改方式 -->
      <div v-if="step === 'choose'" class="step-content">
        <div class="choose-header">
          <img src="/images/success-mascot.png" class="choose-mascot bounce-animation" alt="" />
          <div class="choose-title">选择批改方式</div>
        </div>
        <div class="choose-cards">
          <div class="choose-card card-manual" @click="startManualGrading">
            <div class="card-decoration">✨</div>
            <div class="choose-icon">✍️</div>
            <div class="choose-name">对照批改</div>
            <div class="choose-desc">对照孩子写的内容，逐个标记对错</div>
            <div class="choose-tag recommend">推荐</div>
          </div>
          <div class="choose-card card-photo" @click="startPhotoGrading">
            <div class="choose-icon">📷</div>
            <div class="choose-name">拍照批改</div>
            <div class="choose-desc">拍摄手写内容，自动识别对比</div>
            <div class="choose-tag">适合印刷体</div>
          </div>
        </div>
      </div>

      <!-- ===== 方式1：对照批改（逐个标记对错） ===== -->
      <div v-if="step === 'manual'" class="step-content">
        <div class="manual-header">
          <p class="manual-title">对照孩子写的内容，逐个标记</p>
          <p class="manual-hint">点击 ✓ 表示正确，点击 ✗ 表示错误</p>
        </div>

        <div class="manual-list">
          <div
            v-for="(item, idx) in manualItems"
            :key="idx"
            class="manual-item"
            :class="{
              'is-correct': item.result === 'correct',
              'is-wrong': item.result === 'wrong',
              'is-pending': item.result === 'pending'
            }"
          >
            <div class="manual-index">{{ idx + 1 }}</div>
            <div class="manual-word-area">
              <div class="manual-word">{{ item.original }}</div>
              <div v-if="item.result === 'wrong' && item.written" class="manual-written">
                孩子写的：<span class="written-text">{{ item.written }}</span>
              </div>
            </div>
            <div class="manual-buttons">
              <button
                class="mark-btn mark-correct"
                :class="{ active: item.result === 'correct' }"
                @click="markResult(idx, 'correct')"
              >
                ✓
              </button>
              <button
                class="mark-btn mark-wrong"
                :class="{ active: item.result === 'wrong' }"
                @click="markResult(idx, 'wrong')"
              >
                ✗
              </button>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="manual-shortcuts">
          <van-button size="small" round @click="markAllCorrect">全部标记正确</van-button>
          <van-button size="small" round @click="markAllWrong">全部标记错误</van-button>
          <van-button size="small" round @click="resetMarks">重置</van-button>
        </div>

        <div class="manual-footer">
          <div class="manual-stats">
            ✓ {{ correctCount }} 个正确 · ✗ {{ wrongCount }} 个错误 · 未标记 {{ pendingCount }} 个
          </div>
          <van-button
            type="primary"
            round
            block
            size="large"
            :disabled="pendingCount > 0"
            @click="submitManualGrading"
          >
            {{ pendingCount > 0 ? `还有 ${pendingCount} 个未标记` : '确认提交' }}
          </van-button>
        </div>
      </div>

      <!-- ===== 方式2：拍照批改 ===== -->
      <div v-if="step === 'capture'" class="step-content">
        <van-steps :active="photoStep" class="grading-steps">
          <van-step>拍照</van-step>
          <van-step>确认识别</van-step>
          <van-step>查看结果</van-step>
        </van-steps>

        <div class="capture-area">
          <div v-if="!photoPreview" class="capture-placeholder" @click="showCameraOptions">
            <div class="capture-icon">📷</div>
            <p class="capture-text">拍摄孩子写的听写内容</p>
            <p class="capture-hint">建议拍清楚、光线充足</p>
          </div>
          <div v-else class="photo-preview-container">
            <img :src="photoPreview" class="photo-preview" />
            <van-button size="small" round class="retake-btn" @click="showCameraOptions">
              重新拍照
            </van-button>
          </div>
        </div>

        <van-button
          v-if="photoPreview"
          type="primary"
          round
          block
          size="large"
          :loading="isRecognizing"
          loading-text="正在识别..."
          @click="startRecognize"
        >
          开始识别
        </van-button>

        <div v-if="isRecognizing" class="ocr-progress-bar">
          <van-progress :percentage="ocrProgressValue" stroke-width="4" color="#4f6ef7" />
          <p class="progress-text">正在识别手写内容... {{ ocrProgressValue }}%</p>
        </div>

        <van-button
          plain
          round
          block
          size="large"
          class="btn-back-choose"
          @click="step = 'choose'"
        >
          ← 换成对照批改
        </van-button>
      </div>

      <!-- 拍照确认识别结果 -->
      <div v-if="step === 'confirm'" class="step-content">
        <div class="confirm-info">
          <p class="confirm-title">识别到 {{ recognizedWords.length }} 个词语</p>
          <p class="confirm-hint">请检查识别结果，点击可修正</p>
        </div>

        <div class="compare-list">
          <div class="compare-header">
            <span class="col-label">原始词语</span>
            <span class="col-label">识别结果</span>
          </div>
          <div
            v-for="(orig, idx) in task?.words || []"
            :key="idx"
            class="compare-row"
          >
            <div class="col-original">{{ orig }}</div>
            <div class="col-arrow">→</div>
            <div
              class="col-recognized"
              :class="{ 'is-empty': !editableWords[idx] }"
              @click="editRecognized(idx)"
            >
              {{ editableWords[idx] || '（点击填写）' }}
            </div>
          </div>
        </div>

        <div class="confirm-actions">
          <van-button type="primary" round block size="large" @click="doPhotoGrade">
            确认批改
          </van-button>
          <van-button round block size="large" @click="resetToCapture">
            重新拍照
          </van-button>
          <van-button plain round block size="large" @click="step = 'choose'">
            ← 换成对照批改
          </van-button>
        </div>
      </div>
    </div>

    <!-- 编辑识别结果弹窗 -->
    <van-dialog
      v-model:show="showEditDialog"
      title="修正识别结果"
      show-cancel-button
      @confirm="confirmEdit"
    >
      <div class="edit-dialog-content">
        <p class="edit-original">原始词语：<strong>{{ editOriginalWord }}</strong></p>
        <van-field v-model="editText" placeholder="输入孩子实际写的内容" autofocus />
      </div>
    </van-dialog>

    <!-- 对照批改：输入孩子写错的内容 -->
    <van-dialog
      v-model:show="showWrongInput"
      title="孩子写的是什么？"
      show-cancel-button
      @confirm="confirmWrongInput"
      @cancel="cancelWrongInput"
    >
      <div class="edit-dialog-content">
        <p class="edit-original">正确词语：<strong>{{ wrongInputOriginal }}</strong></p>
        <van-field
          v-model="wrongInputText"
          placeholder="输入孩子实际写的内容（可留空表示未作答）"
          autofocus
        />
        <p class="edit-hint">留空表示没写或看不清</p>
      </div>
    </van-dialog>

    <!-- 拍照方式选择 -->
    <van-action-sheet
      v-model:show="showCameraSheet"
      :actions="cameraActions"
      cancel-text="取消"
      @select="onCameraSelect"
    />

    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileSelected" />
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" style="display:none" @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { getTask, addRecord } from '../db'
import { recognizeHandwriting, ocrProgress } from '../services/ocr'
import { gradeWords } from '../services/grading'

const router = useRouter()
const route = useRoute()

const task = ref(null)
const step = ref('choose')  // choose → manual / capture → confirm

// ===== 对照批改 =====
const manualItems = ref([])

// 标记错误时输入孩子实际写的内容
const showWrongInput = ref(false)
const wrongInputIdx = ref(-1)
const wrongInputOriginal = ref('')
const wrongInputText = ref('')

const correctCount = computed(() => manualItems.value.filter(i => i.result === 'correct').length)
const wrongCount = computed(() => manualItems.value.filter(i => i.result === 'wrong').length)
const pendingCount = computed(() => manualItems.value.filter(i => i.result === 'pending').length)

function startManualGrading() {
  manualItems.value = (task.value?.words || []).map(w => ({
    original: w,
    written: '',       // 孩子实际写的内容
    result: 'pending'  // pending / correct / wrong
  }))
  step.value = 'manual'
}

function markResult(idx, result) {
  if (result === 'correct') {
    // 标记正确：如果已经是正确就取消
    if (manualItems.value[idx].result === 'correct') {
      manualItems.value[idx].result = 'pending'
      manualItems.value[idx].written = ''
    } else {
      manualItems.value[idx].result = 'correct'
      manualItems.value[idx].written = manualItems.value[idx].original
    }
  } else if (result === 'wrong') {
    // 标记错误：如果已经是错误就取消
    if (manualItems.value[idx].result === 'wrong') {
      manualItems.value[idx].result = 'pending'
      manualItems.value[idx].written = ''
    } else {
      // 弹窗让用户输入孩子实际写的
      wrongInputIdx.value = idx
      wrongInputOriginal.value = manualItems.value[idx].original
      wrongInputText.value = manualItems.value[idx].written || ''
      showWrongInput.value = true
    }
  }
}

function confirmWrongInput() {
  const idx = wrongInputIdx.value
  manualItems.value[idx].result = 'wrong'
  manualItems.value[idx].written = wrongInputText.value.trim() || '（未作答）'
}

function cancelWrongInput() {
  // 取消输入，不改变状态
}

function markAllCorrect() {
  manualItems.value.forEach(i => {
    i.result = 'correct'
    i.written = i.original
  })
}

function markAllWrong() {
  manualItems.value.forEach(i => {
    i.result = 'wrong'
    i.written = '（未作答）'
  })
}

function resetMarks() {
  manualItems.value.forEach(i => {
    i.result = 'pending'
    i.written = ''
  })
}

async function submitManualGrading() {
  const details = manualItems.value.map(i => ({
    original: i.original,
    written: i.result === 'correct' ? i.original : (i.written || '（未作答）'),
    isCorrect: i.result === 'correct',
    similarity: i.result === 'correct' ? 100 : 0
  }))

  const correctNum = details.filter(d => d.isCorrect).length
  const total = details.length
  const score = total === 0 ? 0 : Math.round(correctNum / total * 100)

  const recordId = await addRecord({
    taskId: task.value.id,
    score,
    totalCount: total,
    correctCount: correctNum,
    details
  })

  router.replace(`/result/${recordId}`)
}

// ===== 拍照批改 =====
const photoPreview = ref(null)
const photoFile = ref(null)
const isRecognizing = ref(false)
const ocrProgressValue = computed(() => ocrProgress.value)
const showCameraSheet = ref(false)
const fileInput = ref(null)
const cameraInput = ref(null)
const photoStep = computed(() => {
  if (step.value === 'capture') return 0
  if (step.value === 'confirm') return 1
  return 2
})

const cameraActions = [
  { name: '拍照', value: 'camera' },
  { name: '从相册选择', value: 'gallery' }
]

const recognizedWords = ref([])
const editableWords = ref([])

const showEditDialog = ref(false)
const editIndex = ref(-1)
const editText = ref('')
const editOriginalWord = ref('')

function startPhotoGrading() {
  step.value = 'capture'
}

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

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  photoFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { photoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function startRecognize() {
  if (!photoFile.value) return
  isRecognizing.value = true
  try {
    const words = await recognizeHandwriting(photoFile.value, task.value?.words || [])
    recognizedWords.value = words
    const origLen = task.value?.words?.length || 0
    editableWords.value = Array.from({ length: origLen }, (_, i) =>
      i < words.length ? words[i] : ''
    )
    step.value = 'confirm'
  } catch (err) {
    showToast('识别失败：' + err.message)
  } finally {
    isRecognizing.value = false
  }
}

function editRecognized(index) {
  editIndex.value = index
  editText.value = editableWords.value[index] || ''
  editOriginalWord.value = task.value?.words?.[index] || ''
  showEditDialog.value = true
}

function confirmEdit() {
  editableWords.value[editIndex.value] = editText.value.trim()
}

function resetToCapture() {
  step.value = 'capture'
  photoPreview.value = null
  photoFile.value = null
  recognizedWords.value = []
  editableWords.value = []
}

async function doPhotoGrade() {
  if (!task.value) return
  const result = gradeWords(task.value.words, editableWords.value)
  const recordId = await addRecord({
    taskId: task.value.id,
    score: result.score,
    totalCount: result.totalCount,
    correctCount: result.correctCount,
    details: result.details
  })
  router.replace(`/result/${recordId}`)
}

onMounted(async () => {
  const id = Number(route.params.id)
  task.value = await getTask(id)
})
</script>

<style scoped>
.grading-page {
  min-height: 100vh;
  background: transparent;
}

.grading-container {
  padding: 16px;
  padding-bottom: 32px;
}

.step-content {
  /* container */
}

/* ===== 选择批改方式 ===== */
.choose-header {
  text-align: center;
  margin-bottom: 20px;
}

.choose-mascot {
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

.choose-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.choose-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.choose-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  border: 2px solid transparent;
  overflow: hidden;
}

.choose-card:active {
  transform: scale(0.98);
}

.card-manual {
  border-color: var(--theme-success-light);
  background: linear-gradient(135deg, white 0%, #f1f8e9 100%);
}

.card-manual:active {
  border-color: var(--theme-success);
}

.card-photo {
  border-color: var(--theme-secondary-light);
  background: linear-gradient(135deg, white 0%, #e3f2fd 100%);
}

.card-photo:active {
  border-color: var(--theme-secondary);
}

.card-decoration {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 16px;
  animation: twinkle 1.5s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.choose-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.choose-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
}

.choose-desc {
  font-size: 13px;
  color: #999;
}

.choose-tag {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
  background: #f0f2f5;
  color: #999;
  font-weight: 500;
}

.choose-tag.recommend {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  font-weight: 600;
}

/* ===== 对照批改 ===== */
.manual-header {
  text-align: center;
  margin-bottom: 20px;
}

.manual-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.manual-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.manual-list {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.08);
}

.manual-item {
  display: flex;
  align-items: center;
  padding: 16px 16px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.manual-item:last-child {
  border-bottom: none;
}

.manual-item.is-correct {
  background: linear-gradient(90deg, #e8f5e9 0%, white 100%);
}

.manual-item.is-wrong {
  background: linear-gradient(90deg, #ffebee 0%, white 100%);
}

.manual-index {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e0f2f1, #e3f2fd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
  margin-right: 12px;
  flex-shrink: 0;
  font-weight: 600;
}

.is-correct .manual-index {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
  color: #2e7d32;
}

.is-wrong .manual-index {
  background: linear-gradient(135deg, #ffcdd2, #ef9a9a);
  color: #c62828;
}

.manual-word-area {
  flex: 1;
  min-width: 0;
}

.manual-word {
  font-size: 17px;
  color: #333;
  font-weight: 600;
}

.manual-written {
  font-size: 12px;
  color: #e57373;
  margin-top: 2px;
}

.manual-written .written-text {
  text-decoration: line-through;
  font-weight: 500;
}

.manual-buttons {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.mark-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 2px solid #e8e8e8;
  background: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.mark-btn:active {
  transform: scale(0.92);
}

.mark-correct {
  color: #ccc;
}

.mark-correct.active {
  background: linear-gradient(135deg, #66bb6a, #81c784);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 187, 106, 0.4);
}

.mark-wrong {
  color: #ccc;
}

.mark-wrong.active {
  background: linear-gradient(135deg, #ef5350, #e57373);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(239, 83, 80, 0.4);
}

.manual-shortcuts {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}

.manual-footer {
  margin-top: 12px;
}

.manual-stats {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

/* ===== 拍照批改 ===== */
.grading-steps {
  margin-bottom: 20px;
}

:deep(.van-step__circle) {
  background: var(--theme-primary) !important;
}

:deep(.van-step__line) {
  background: var(--theme-primary-light) !important;
}

.capture-area {
  margin-bottom: 16px;
}

.capture-placeholder {
  background: white;
  border: 3px dashed var(--theme-primary-light);
  border-radius: 20px;
  padding: 48px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.capture-placeholder:active {
  border-color: var(--theme-primary);
  background: #e0f2f1;
}

.capture-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.capture-text {
  font-size: 17px;
  color: #333;
  margin: 0 0 6px;
  font-weight: 600;
}

.capture-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.photo-preview-container {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.photo-preview {
  width: 100%;
  border-radius: 20px;
  display: block;
}

.retake-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9) !important;
  color: #666 !important;
  border: none !important;
  backdrop-filter: blur(4px);
}

.ocr-progress-bar {
  margin-top: 20px;
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.progress-text {
  font-size: 13px;
  color: #999;
  margin: 10px 0 0;
}

.btn-back-choose {
  margin-top: 12px;
  color: #999 !important;
  border-color: #eee !important;
}

/* ===== 确认页 ===== */
.confirm-info {
  text-align: center;
  margin-bottom: 20px;
}

.confirm-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin: 0 0 6px;
}

.confirm-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.compare-list {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(38, 166, 154, 0.08);
}

.compare-header {
  display: flex;
  padding: 12px 16px;
  background: linear-gradient(90deg, #e0f2f1, #e3f2fd);
  border-bottom: 1px solid #e0f2f1;
}

.col-label {
  flex: 1;
  font-size: 13px;
  color: #999;
  text-align: center;
  font-weight: 500;
}

.compare-row {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.compare-row:last-child {
  border-bottom: none;
}

.col-original {
  flex: 1;
  font-size: 16px;
  color: #333;
  text-align: center;
  font-weight: 600;
}

.col-arrow {
  width: 30px;
  text-align: center;
  color: var(--theme-primary);
  font-size: 18px;
}

.col-recognized {
  flex: 1;
  font-size: 16px;
  color: #333;
  text-align: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: all 0.2s;
  background: #fafafa;
}

.col-recognized:active {
  background: var(--theme-primary-light);
}

.col-recognized.is-empty {
  color: var(--theme-primary);
  font-size: 13px;
  background: #e0f2f1;
  border: 1px dashed var(--theme-primary-light);
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-dialog-content {
  padding: 16px 20px;
}

.edit-original {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px;
}

.edit-original strong {
  color: var(--theme-primary);
}

.edit-hint {
  font-size: 12px;
  color: #bbb;
  margin: 8px 0 0;
}
</style>
