<template>
  <div class="settings-page">
    <van-nav-bar
      title="设置"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="settings-container">
      <!-- AI 识别配置 -->
      <div class="section-title">
        <span class="section-icon">🤖</span>
        AI 图片识别
      </div>
      <van-cell-group inset class="form-group">
        <van-cell title="识别引擎" :value="engineLabel" />
        <van-field
          v-model="config.apiKey"
          label="API Key"
          placeholder="输入豆包/其他大模型 API Key"
          type="password"
          right-icon="eye-o"
          @click-right-icon="toggleKeyVisible"
        />
        <van-field
          v-model="config.baseUrl"
          label="API 地址"
          placeholder="https://ark.cn-beijing.volces.com/api/v3"
        />
        <van-field
          v-model="config.model"
          label="接入点ID"
          placeholder="ep-xxxxxxxxxx-xxxxx"
        />
      </van-cell-group>

      <div class="config-tips">
        <p class="tip-title">配置步骤（豆包为例）</p>
        <ol class="tip-list">
          <li>访问 <a href="https://console.volcengine.com/ark" target="_blank">火山引擎-豆包大模型</a> 注册登录</li>
          <li>在「API Key 管理」中创建 API Key</li>
          <li>在「模型推理」→「推理接入点」中<b>创建接入点</b>，选择 doubao-1.5-vision-pro 等视觉模型</li>
          <li>将 API Key 和接入点 ID（<b>ep-</b> 开头）分别填入上方</li>
        </ol>
        <p class="tip-note">💡 新用户有50万tokens免费额度。未配置时使用本地引擎（精度较低）</p>
      </div>

      <!-- 默认听写参数 -->
      <div class="section-title">
        <span class="section-icon">🎯</span>
        默认听写参数
      </div>
      <van-cell-group inset class="form-group">
        <van-cell title="语速">
          <template #value>
            <div class="slider-cell">
              <span class="slider-label">慢</span>
              <van-slider
                v-model="defaultSpeed"
                :min="30"
                :max="150"
                :step="10"
                class="speed-slider"
              />
              <span class="slider-label">快</span>
              <span class="slider-value">{{ (defaultSpeed / 100).toFixed(1) }}</span>
            </div>
          </template>
        </van-cell>
        <van-cell title="每词遍数">
          <template #value>
            <van-stepper v-model="defaultRepeats" :min="1" :max="5" />
          </template>
        </van-cell>
        <van-cell title="间隔时间">
          <template #value>
            <van-stepper v-model="defaultInterval" :min="2" :max="30" />
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
          @click="handleSave"
        >
          保存设置
        </van-button>
      </div>

      <!-- 测试连接 -->
      <div v-if="config.apiKey" class="test-container">
        <van-button
          plain
          round
          block
          type="primary"
          size="small"
          :loading="testing"
          @click="testConnection"
        >
          测试 API 连接
        </van-button>
        <p v-if="testResult" :class="['test-result', testResult.ok ? 'success' : 'fail']">
          {{ testResult.message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { llmConfig, saveConfig, isConfigured } from '../services/llm'

const DEFAULTS_KEY = 'dictation_defaults'

const config = ref({
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: ''
})

// 默认听写参数
const defaultSpeed = ref(80)
const defaultRepeats = ref(2)
const defaultInterval = ref(5)

const testing = ref(false)
const testResult = ref(null)

const engineLabel = computed(() => {
  return (config.value.apiKey && config.value.model) ? '大模型 (AI)' : '本地引擎 (Tesseract)'
})

onMounted(() => {
  // 加载 LLM 配置
  config.value = { ...llmConfig.value }

  // 加载默认听写参数
  try {
    const saved = localStorage.getItem(DEFAULTS_KEY)
    if (saved) {
      const d = JSON.parse(saved)
      defaultSpeed.value = d.speed || 80
      defaultRepeats.value = d.repeats || 2
      defaultInterval.value = d.interval || 5
    }
  } catch {}
})

function toggleKeyVisible(e) {
  const field = e.target.closest('.van-field')
  const input = field?.querySelector('input')
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password'
  }
}

function handleSave() {
  // 保存 LLM 配置
  saveConfig(config.value)

  // 保存默认听写参数
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify({
    speed: defaultSpeed.value,
    repeats: defaultRepeats.value,
    interval: defaultInterval.value
  }))

  showToast('设置已保存')
}

async function testConnection() {
  testing.value = true
  testResult.value = null

  try {
    const response = await fetch(`${config.value.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.value.apiKey}`
      },
      body: JSON.stringify({
        model: config.value.model,
        messages: [
          { role: 'user', content: '你好，请回复"连接成功"' }
        ],
        max_tokens: 20
      })
    })

    if (response.ok) {
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || ''
      testResult.value = { ok: true, message: `✅ 连接成功！模型回复：${reply}` }
    } else {
      const err = await response.text()
      testResult.value = { ok: false, message: `❌ 连接失败 (${response.status}): ${err.slice(0, 100)}` }
    }
  } catch (err) {
    testResult.value = { ok: false, message: `❌ 网络错误: ${err.message}` }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: transparent;
  padding-bottom: 32px;
}

.settings-container {
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  padding: 16px 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  font-size: 20px;
}

.form-group {
  margin-bottom: 8px;
}

.config-tips {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.tip-list {
  font-size: 13px;
  color: #666;
  padding-left: 20px;
  margin: 0 0 8px;
  line-height: 1.8;
}

.tip-list a {
  color: var(--theme-primary);
  text-decoration: none;
  font-weight: 500;
}

.tip-note {
  font-size: 12px;
  color: #999;
  margin: 0;
  padding-top: 4px;
  border-top: 1px solid #f5f5f5;
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

.test-container {
  padding: 0 0 16px;
}

.test-result {
  font-size: 13px;
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.5;
}

.test-result.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.test-result.fail {
  background: #fbe9e7;
  color: #c62828;
}
</style>
