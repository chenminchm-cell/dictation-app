import { createWorker } from 'tesseract.js'
import { ref } from 'vue'

let workerMixed = null   // 中英文混合
let workerEng = null     // 纯英文

export const ocrProgress = ref(0)
export const ocrLoading = ref(false)

/**
 * 获取混合模型 worker
 */
async function getMixedWorker() {
  if (!workerMixed) {
    workerMixed = await createWorker('chi_sim+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          ocrProgress.value = Math.round(m.progress * 100)
        }
      }
    })
  }
  return workerMixed
}

/**
 * 获取纯英文 worker（对英文手写体识别更准确）
 */
async function getEngWorker() {
  if (!workerEng) {
    workerEng = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          ocrProgress.value = Math.round(m.progress * 100)
        }
      }
    })
  }
  return workerEng
}

/**
 * 图片预处理：灰度 → 高对比度 → 二值化
 * 大幅提高手写体在复杂背景下的识别率
 */
async function preprocessImage(image) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = img.width
      canvas.height = img.height

      // 绘制原图
      ctx.drawImage(img, 0, 0)

      // 获取像素数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 步骤1：转灰度
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }

      // 步骤2：增强对比度
      // 计算直方图找到动态阈值
      const histogram = new Array(256).fill(0)
      for (let i = 0; i < data.length; i += 4) {
        histogram[Math.round(data[i])]++
      }

      // 找到 OTSU 最佳阈值
      const totalPixels = data.length / 4
      let sumAll = 0
      for (let i = 0; i < 256; i++) sumAll += i * histogram[i]

      let sumBg = 0, weightBg = 0, maxVariance = 0, bestThreshold = 128

      for (let t = 0; t < 256; t++) {
        weightBg += histogram[t]
        if (weightBg === 0) continue
        const weightFg = totalPixels - weightBg
        if (weightFg === 0) break

        sumBg += t * histogram[t]
        const meanBg = sumBg / weightBg
        const meanFg = (sumAll - sumBg) / weightFg
        const variance = weightBg * weightFg * (meanBg - meanFg) * (meanBg - meanFg)

        if (variance > maxVariance) {
          maxVariance = variance
          bestThreshold = t
        }
      }

      // 步骤3：二值化（黑白分明，文字变黑、背景变白）
      for (let i = 0; i < data.length; i += 4) {
        const val = data[i] < bestThreshold ? 0 : 255
        data[i] = val
        data[i + 1] = val
        data[i + 2] = val
      }

      ctx.putImageData(imageData, 0, 0)

      // 导出为 blob
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png')
    }

    img.onerror = () => resolve(null)

    // 加载图片
    if (image instanceof File || image instanceof Blob) {
      img.src = URL.createObjectURL(image)
    } else {
      img.src = image
    }
  })
}

/**
 * 判断文本是否主要是英文
 */
function isMainlyEnglish(words) {
  if (!words || words.length === 0) return false
  const engCount = words.filter(w => /^[a-zA-Z\s'-]+$/.test(w.trim())).length
  return engCount > words.length * 0.6
}

/**
 * 识别词语（录入用，识别课本印刷体）
 */
export async function recognizeWords(image) {
  ocrLoading.value = true
  ocrProgress.value = 0

  try {
    // 1. 先做图片预处理，提高印刷体识别率
    ocrProgress.value = 5
    const processed = await preprocessImage(image)
    const imgToRecognize = processed || image

    const w = await getMixedWorker()
    const { data } = await w.recognize(imgToRecognize)

    const text = data.text.trim()
    if (!text) return []

    // 2. 智能分词处理
    const words = text
      .split(/[\n\r]+/)  // 先按行分
      .flatMap(line => {
        // 去掉行首的序号（如 "10"、"11"、"13" 等）
        const cleanLine = line
          .replace(/^\s*\d+\s+/, '')  // 行首数字序号
          .replace(/^\s*\d+[.、)）:：]\s*/, '')  // 带标点的序号
          .replace(/^\s*[一二三四五六七八九十]+[.、)）:：]\s*/, '')  // 中文序号
          .trim()
        
        // 按空格、逗号、顿号等分割
        return cleanLine.split(/[\s,，、；;]+/)
      })
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .filter(w => isValidWord(w))  // 使用新的验证函数

    // 3. 去重
    return [...new Set(words)]
  } finally {
    ocrLoading.value = false
  }
}

/**
 * 验证是否为有效词语
 */
function isValidWord(text) {
  if (!text || text.length === 0) return false
  
  // 太短的单字符（非中文）过滤掉
  if (text.length === 1 && !/[\u4e00-\u9fa5]/.test(text)) return false
  
  // 纯数字过滤
  if (/^\d+$/.test(text)) return false
  
  // 乱码特征检测（包含太多特殊字符）
  const specialChars = text.match(/[!@#$%^&*()_+=\[\]{}|\\<>?\/`~£€¥©®™°§¶†‡•…]/g)
  if (specialChars && specialChars.length > text.length * 0.3) return false
  
  // 检测是否全是乱码字符（非中英文、非数字）
  const validChars = text.match(/[\u4e00-\u9fa5a-zA-Z0-9\-']/g)
  if (!validChars || validChars.length < text.length * 0.5) return false
  
  // 噪声词过滤
  const noisePatterns = [
    /^(英文表达|中文意思|词性|adj|adv|n|v|prep|conj|vt|vi)[.。]?$/i,
    /^第?\d+[页课单元]/,
    /^[\-—=_*#]+$/,
    /^page\s*\d+$/i,
    /^ull$/i,  // 常见乱码
    /^[A-Z]{2,4}$/,  // 纯大写字母缩写（可能是乱码如 BKE, EZR）
    /^\d+[a-zA-Z]+$/,  // 数字+字母混合（如 5G, 24ull）
    /^[a-zA-Z]+\d+$/,  // 字母+数字混合
  ]
  if (noisePatterns.some(p => p.test(text.trim()))) return false
  
  // 有效词语应该：是中文词（2字以上）或英文单词
  const isChinese = /[\u4e00-\u9fa5]{2,}/.test(text)
  const isEnglish = /^[a-zA-Z][a-zA-Z\s\-']*[a-zA-Z]$/.test(text) || /^[a-zA-Z]$/.test(text)
  
  return isChinese || isEnglish
}

/**
 * 识别手写内容（批改用）
 * 增加图片预处理 + 根据原始词语语言选择最佳模型
 * @param {File|Blob|string} image
 * @param {string[]} originalWords - 原始词语列表，用于判断语言
 */
export async function recognizeHandwriting(image, originalWords = []) {
  ocrLoading.value = true
  ocrProgress.value = 0

  try {
    // 1. 图片预处理（灰度→对比度→二值化）
    ocrProgress.value = 5
    const processed = await preprocessImage(image)
    const imgToRecognize = processed || image

    // 2. 根据原始词语判断语言，选择最佳 worker
    const useEng = isMainlyEnglish(originalWords)
    const w = useEng ? await getEngWorker() : await getMixedWorker()

    // 3. OCR 识别
    const { data } = await w.recognize(imgToRecognize)

    const text = data.text.trim()
    if (!text) return []

    // 4. 按行分割（手写内容通常一行一个词）
    const words = text
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    return words
  } finally {
    ocrLoading.value = false
  }
}

/**
 * 噪声行过滤（用于手写识别）
 */
function isNoiseLine(text) {
  return !isValidWord(text)
}

/**
 * 释放 OCR worker 资源
 */
export async function terminateOCR() {
  if (workerMixed) { await workerMixed.terminate(); workerMixed = null }
  if (workerEng) { await workerEng.terminate(); workerEng = null }
}
