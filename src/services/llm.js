/**
 * 大模型 API 服务（豆包视觉模型）
 * 兼容 OpenAI 格式的 /v1/chat/completions 接口
 */
import { ref } from 'vue'

// ===== API 配置（存储在 localStorage）=====
const STORAGE_KEY = 'dictation_llm_config'

const defaultConfig = {
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: '',  // 豆包接入点ID，如 ep-xxxxxxxxxx-xxxxx
}

export const llmConfig = ref(loadConfig())

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultConfig, ...JSON.parse(saved) }
  } catch {}
  return { ...defaultConfig }
}

export function saveConfig(config) {
  llmConfig.value = { ...config }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function isConfigured() {
  return !!llmConfig.value.apiKey && !!llmConfig.value.model
}

/**
 * 将图片文件转为 base64 data URL
 */
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 调用大模型视觉 API 识别图片
 * @param {File|Blob} imageFile - 图片文件
 * @param {string} prompt - 提示词
 * @returns {string} 模型返回的文本
 */
export async function callVisionAPI(imageFile, prompt) {
  const config = llmConfig.value
  if (!config.apiKey) {
    throw new Error('请先配置大模型 API Key')
  }

  const base64Data = await imageToBase64(imageFile)

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: base64Data }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1  // 低温度，更精确
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API 调用失败 (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 识别课本/词语表中的词语（录入用）
 */
export async function recognizeWordsViaLLM(imageFile) {
  const prompt = `请仔细识别这张图片中的所有中文词语和英文单词/短语。

要求：
1. 只提取词语/单词，忽略序号、页码、标题、注释等无关内容
2. 每个词语单独一行输出
3. 中文词语保持原样（如：墨绿、集中、交叉）
4. 英文单词/短语保持完整（如：look down on、beautiful）
5. 不要添加任何解释、翻译或标点符号
6. 不要输出数字序号

请直接输出词语列表，每行一个：`

  const text = await callVisionAPI(imageFile, prompt)
  
  // 解析返回结果
  const words = text
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .map(line => line.replace(/^\d+[.、)）:：\s]*/, ''))  // 去序号
    .map(line => line.replace(/^[-•·*]\s*/, ''))  // 去列表符号
    .map(line => line.trim())
    .filter(w => w.length > 0)
    .filter(w => !/^[#=\-_*]+$/.test(w))  // 去分隔线

  return [...new Set(words)]  // 去重
}

/**
 * 识别手写内容（批改用）
 */
export async function recognizeHandwritingViaLLM(imageFile, originalWords = []) {
  const wordsHint = originalWords.length > 0
    ? `\n参考原始词语列表（共${originalWords.length}个）：${originalWords.join('、')}\n孩子手写的内容应该是这些词语中的部分或全部。`
    : ''

  const prompt = `请仔细识别这张图片中手写的文字内容。这是一个小学生听写后写在纸上的内容。
${wordsHint}
要求：
1. 按照从上到下、从左到右的顺序逐个识别
2. 每个词语/单词单独一行输出
3. 尽量准确识别，即使字迹不太工整
4. 如果某个字看不清楚，根据上下文和参考词语列表尽量推断
5. 不要添加序号、解释或标点

请直接输出识别结果，每行一个词语：`

  const text = await callVisionAPI(imageFile, prompt)
  
  const words = text
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .map(line => line.replace(/^\d+[.、)）:：\s]*/, ''))
    .map(line => line.replace(/^[-•·*]\s*/, ''))
    .map(line => line.trim())
    .filter(w => w.length > 0)

  return words
}
