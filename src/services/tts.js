import { ref } from 'vue'

// ===== 播放状态 =====
export const isPlaying = ref(false)
export const isPaused = ref(false)
export const currentWordIndex = ref(-1)
export const currentRepeat = ref(0)

// ===== 可用语音列表 =====
// 用 ref 而不是 shallowRef，确保 computed 依赖能正确触发
export const voicesLoaded = ref(0)   // 递增计数器，触发重新计算
let _allVoices = []

export const selectedVoiceZh = ref('')
export const selectedVoiceEn = ref('')

// ===== 动态参数（暂停时可修改，继续后立即生效） =====
export const paramSpeed = ref(0.8)
export const paramRepeats = ref(2)
export const paramInterval = ref(5)
export const paramRepeatGap = ref(1.5)

// 内部控制
let _resolve = null
let _stopped = false

/**
 * 加载系统可用语音
 */
export function loadVoices() {
  const doLoad = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      _allVoices = voices
      voicesLoaded.value++  // 触发响应式更新

      // 自动选择默认语音
      if (!selectedVoiceZh.value) {
        const zhVoice = voices.find(v => isZhLang(v.lang))
        if (zhVoice) selectedVoiceZh.value = zhVoice.name
      }
      if (!selectedVoiceEn.value) {
        // 默认选美式英语（中考听力常用）
        const usVoices = voices.filter(v => isAmericanEnglish(v.lang))
        const bestUS = pickBestVoice(usVoices)
        if (bestUS) {
          selectedVoiceEn.value = bestUS.name
        } else {
          const enVoice = voices.find(v => isEnLang(v.lang))
          if (enVoice) selectedVoiceEn.value = enVoice.name
        }
      }
    }
  }

  doLoad()
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = doLoad
  }
  // 额外延迟重试，有些浏览器需要时间加载
  setTimeout(doLoad, 500)
  setTimeout(doLoad, 2000)
}

function isZhLang(lang) {
  if (!lang) return false
  const l = lang.toLowerCase().replace('_', '-')
  return l.startsWith('zh') || l.includes('-cn') || l.includes('-tw') || l.includes('-hk')
}

function isEnLang(lang) {
  if (!lang) return false
  const l = lang.toLowerCase().replace('_', '-')
  return l.startsWith('en') || l.includes('-us') || l.includes('-gb') || l.includes('-au')
}

function isAmericanEnglish(lang) {
  if (!lang) return false
  const l = lang.toLowerCase().replace('_', '-')
  return l === 'en-us' || l === 'en_us'
}

function isBritishEnglish(lang) {
  if (!lang) return false
  const l = lang.toLowerCase().replace('_', '-')
  return l === 'en-gb' || l === 'en_gb'
}

/**
 * 从候选语音中选出最佳的一个
 * 优先级：Online/Premium > 普通 > local
 * 中考英语听力风格：清晰、标准、语速适中
 */
function pickBestVoice(voices) {
  if (voices.length === 0) return null
  // 优先选 Online 语音（质量最高）
  const online = voices.find(v => /online|premium|neural/i.test(v.name))
  if (online) return online
  // 其次选非 local 的（通常是系统自带的高质量语音）
  const nonLocal = voices.find(v => !v.localService)
  if (nonLocal) return nonLocal
  // 兜底返回第一个
  return voices[0]
}

/**
 * 获取中文语音列表（响应式）
 */
export function getChineseVoices() {
  void voicesLoaded.value
  return _allVoices.filter(v => isZhLang(v.lang))
}

/**
 * 获取英文语音列表 - 只返回精选的美式和英式各1个
 */
export function getEnglishVoices() {
  void voicesLoaded.value
  return _allVoices.filter(v => isEnLang(v.lang))
}

/**
 * 包装语音对象（SpeechSynthesisVoice 的属性不可枚举，不能直接展开）
 */
function wrapVoice(voice, label, tag) {
  return {
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    voiceURI: voice.voiceURI,
    _raw: voice,
    _label: label,
    _tag: tag
  }
}

/**
 * 获取精选英文语音（美式+英式各1个）
 */
export function getFilteredEnglishVoices() {
  void voicesLoaded.value
  const allEn = _allVoices.filter(v => isEnLang(v.lang))

  const usVoices = allEn.filter(v => isAmericanEnglish(v.lang))
  const gbVoices = allEn.filter(v => isBritishEnglish(v.lang))

  const result = []
  const bestUS = pickBestVoice(usVoices)
  const bestGB = pickBestVoice(gbVoices)

  if (bestUS) result.push(wrapVoice(bestUS, '美式英语', 'US'))
  if (bestGB) result.push(wrapVoice(bestGB, '英式英语', 'GB'))

  // 如果设备上没有标准的 en-US/en-GB，从所有英文中选一个兜底
  if (result.length === 0 && allEn.length > 0) {
    const fallback = pickBestVoice(allEn)
    if (fallback) result.push(wrapVoice(fallback, '英语', 'EN'))
  }

  return result
}

/**
 * 获取所有语音
 */
export function getAllVoices() {
  void voicesLoaded.value
  return _allVoices
}

function isChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text)
}

function getVoice(name) {
  if (!name) return null
  return _allVoices.find(v => v.name === name) || null
}

/**
 * 朗读单个词语（使用当前动态参数的 speed）
 */
function speakOne(word) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    const isZh = isChinese(word)
    utterance.lang = isZh ? 'zh-CN' : 'en-US'
    utterance.rate = paramSpeed.value
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voice = getVoice(isZh ? selectedVoiceZh.value : selectedVoiceEn.value)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
    }, 100)
  })
}

function waitSeconds(seconds) {
  return new Promise((resolve) => {
    _resolve = resolve
    let elapsed = 0
    const timer = setInterval(() => {
      if (_stopped) {
        clearInterval(timer)
        resolve()
        return
      }
      elapsed += 0.1
      if (elapsed >= seconds) {
        clearInterval(timer)
        resolve()
      }
    }, 100)
  })
}

/**
 * 开始听写播报
 * 
 * 所有参数从 paramSpeed / paramRepeats / paramInterval / paramRepeatGap 动态读取
 * 暂停时修改这些值，继续后立即生效
 */
export async function startDictation(words, options = {}) {
  const { onWordStart, onFinish } = options

  _stopped = false
  isPlaying.value = true
  isPaused.value = false

  for (let i = 0; i < words.length; i++) {
    if (_stopped) break

    while (isPaused.value && !_stopped) {
      await waitSeconds(0.2)
    }
    if (_stopped) break

    currentWordIndex.value = i
    onWordStart?.(i, words[i])

    // 动态读取当前遍数设置
    const reps = paramRepeats.value
    for (let r = 0; r < reps; r++) {
      if (_stopped) break

      while (isPaused.value && !_stopped) {
        await waitSeconds(0.2)
      }
      if (_stopped) break

      currentRepeat.value = r
      await speakOne(words[i])

      if (_stopped) break

      // 同一个词两遍之间的间隔（动态读取）
      if (r < reps - 1) {
        await waitSeconds(paramRepeatGap.value)
      }
    }

    if (_stopped) break

    // 词间间隔（动态读取）
    if (i < words.length - 1) {
      await waitSeconds(paramInterval.value)
    }
  }

  isPlaying.value = false
  isPaused.value = false
  currentWordIndex.value = -1
  currentRepeat.value = 0
  onFinish?.()
}

export function pauseDictation() {
  isPaused.value = true
  window.speechSynthesis.cancel()
}

export function resumeDictation() {
  isPaused.value = false
}

export function stopDictation() {
  _stopped = true
  isPaused.value = false
  isPlaying.value = false
  window.speechSynthesis.cancel()
  if (_resolve) {
    _resolve()
    _resolve = null
  }
}

export function speakWord(word) {
  return speakOne(word)
}
