import Dexie from 'dexie'

const db = new Dexie('DictationApp')

db.version(1).stores({
  // 听写任务
  tasks: '++id, title, createdAt',
  // 批改记录
  records: '++id, taskId, score, createdAt'
})

/**
 * 任务数据结构：
 * {
 *   id: number (自增),
 *   title: string,
 *   words: string[],          // 词语列表
 *   speed: number,            // 语速 0.1~1.5
 *   repeats: number,          // 重复遍数
 *   intervalSeconds: number,  // 词间间隔秒数
 *   createdAt: Date
 * }
 * 
 * 批改记录结构：
 * {
 *   id: number (自增),
 *   taskId: number,
 *   score: number,            // 得分 0~100
 *   totalCount: number,       // 总词数
 *   correctCount: number,     // 正确数
 *   details: [                // 每个词的批改详情
 *     { original, written, isCorrect }
 *   ],
 *   createdAt: Date
 * }
 */

// ===== 任务操作 =====

export async function addTask(task) {
  return await db.tasks.add({
    ...task,
    createdAt: new Date()
  })
}

export async function updateTask(id, changes) {
  return await db.tasks.update(id, changes)
}

export async function deleteTask(id) {
  // 同时删除关联的批改记录
  await db.records.where('taskId').equals(id).delete()
  return await db.tasks.delete(id)
}

export async function getTask(id) {
  return await db.tasks.get(id)
}

export async function getAllTasks() {
  return await db.tasks.orderBy('createdAt').reverse().toArray()
}

// ===== 批改记录操作 =====

export async function addRecord(record) {
  return await db.records.add({
    ...record,
    createdAt: new Date()
  })
}

export async function getRecordsByTask(taskId) {
  return await db.records
    .where('taskId')
    .equals(taskId)
    .reverse()
    .sortBy('createdAt')
}

export async function getLatestRecord(taskId) {
  const records = await getRecordsByTask(taskId)
  return records.length > 0 ? records[0] : null
}

export async function getRecord(id) {
  return await db.records.get(id)
}

export default db
