/**
 * 批改服务 - 将手写识别结果与原始词语对比
 */

/**
 * 计算两个字符串的编辑距离（Levenshtein distance）
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        )
      }
    }
  }
  return dp[m][n]
}

/**
 * 计算两个字符串的相似度（0~1）
 */
function similarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  const dist = levenshtein(a, b)
  return 1 - dist / maxLen
}

/**
 * 智能匹配 - 将识别的词语尽量匹配到原始词语
 * 使用贪心策略：对于每个原始词，在识别结果中找最佳匹配
 */
function smartMatch(originals, recognized) {
  if (recognized.length === 0) {
    return originals.map(orig => ({
      original: orig,
      written: '',
      isCorrect: false,
      similarity: 0
    }))
  }

  // 如果数量差不多，直接按顺序匹配
  if (Math.abs(originals.length - recognized.length) <= 2) {
    return originals.map((orig, i) => {
      const written = i < recognized.length ? recognized[i] : ''
      const sim = similarity(
        orig.toLowerCase().trim(),
        written.toLowerCase().trim()
      )
      return {
        original: orig,
        written: written || '（未作答）',
        isCorrect: sim >= 0.75,
        similarity: Math.round(sim * 100)
      }
    })
  }

  // 数量差异大时，对每个原始词找最佳匹配
  const used = new Set()
  return originals.map(orig => {
    let bestIdx = -1
    let bestSim = 0

    recognized.forEach((rec, idx) => {
      if (used.has(idx)) return
      const sim = similarity(
        orig.toLowerCase().trim(),
        rec.toLowerCase().trim()
      )
      if (sim > bestSim) {
        bestSim = sim
        bestIdx = idx
      }
    })

    if (bestIdx >= 0 && bestSim > 0.3) {
      used.add(bestIdx)
      return {
        original: orig,
        written: recognized[bestIdx],
        isCorrect: bestSim >= 0.75,
        similarity: Math.round(bestSim * 100)
      }
    }

    return {
      original: orig,
      written: '（未作答）',
      isCorrect: false,
      similarity: 0
    }
  })
}

/**
 * 执行批改
 * @param {string[]} originals - 原始词语列表
 * @param {string[]} recognized - OCR识别的词语列表
 * @returns {{ score: number, totalCount: number, correctCount: number, details: Array }}
 */
export function gradeWords(originals, recognized) {
  const details = smartMatch(originals, recognized)
  const correctCount = details.filter(d => d.isCorrect).length
  const totalCount = originals.length
  const score = totalCount === 0 ? 0 : Math.round(correctCount / totalCount * 100)

  return {
    score,
    totalCount,
    correctCount,
    details
  }
}
