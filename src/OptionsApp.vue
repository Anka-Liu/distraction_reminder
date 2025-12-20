<template>
  <div class="options-container">
    <h1>摸鱼网站控制设置</h1>

    <!-- 全局设置区 -->
    <div class="global-settings">
      <div class="setting-item">
        <label>倒计时结束跳转网址:</label>
        <input
          v-model="redirectUrl"
          type="url"
          placeholder="https://example.com"
          @change="saveSettings"
        />
      </div>
    </div>

    <!-- 添加新网站 -->
    <div class="add-website">
      <h2>添加摸鱼网站</h2>
      <div class="add-form">
        <input
          v-model="newSite.name"
          type="text"
          placeholder="网站名称 (如: 哔哩哔哩)"
        />
        <input
          v-model="newSite.url"
          type="text"
          placeholder="网站URL (如: bilibili.com)"
        />
        <input
          v-model.number="newSite.defaultTime"
          type="number"
          placeholder="默认时长(秒)"
          min="1"
        />
        <button @click="addWebsite">添加</button>
      </div>
    </div>

    <!-- 摸鱼网站列表 -->
    <div class="websites-list">
      <h2>摸鱼网站列表</h2>
      <div v-if="websites.length === 0" class="empty-state">
        暂无摸鱼网站，请添加
      </div>
      <div v-else class="website-items">
        <div
          v-for="(site, index) in websites"
          :key="site.id"
          class="website-item"
        >
          <div class="website-info">
            <div class="info-row">
              <span class="label">网站名:</span>
              <span class="value">{{ site.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">URL:</span>
              <span class="value">{{ site.url }}</span>
            </div>
            <div class="info-row">
              <span class="label">当前倒计时:</span>
              <span class="value">{{ formatTime(site.remainingTime) }}</span>
            </div>
            <div class="info-row">
              <span class="label">总摸鱼时间:</span>
              <span class="value">{{ formatTime(site.totalTime) }}</span>
            </div>
          </div>

          <div class="website-actions">
            <select v-model="site.delayAmount" class="delay-select">
              <option :value="60">1分钟</option>
              <option :value="300">5分钟</option>
              <option :value="600">10分钟</option>
              <option :value="1800">30分钟</option>
              <option :value="3600">1小时</option>
            </select>
            <button @click="addDelay(site)" class="delay-btn">延时</button>
            <button @click="resetTimer(site)" class="reset-btn">重置</button>
            <button @click="deleteWebsite(index)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const redirectUrl = ref('https://www.google.com')
const websites = ref([])
const newSite = ref({
  name: '',
  url: '',
  defaultTime: 600
})

// 辅助函数：从 storage 读取 websites 并正确处理类型
function normalizeWebsites(storageWebsites) {
  if (Array.isArray(storageWebsites)) {
    return storageWebsites
  } else if (storageWebsites && typeof storageWebsites === 'object') {
    // 如果是对象（例如被错误保存为 {0: {...}, 1: {...}}），转换为数组
    console.warn('[OptionsApp normalizeWebsites] ⚠️ websites被存储为对象，转换为数组')
    return Object.values(storageWebsites)
  }
  return []
}

// 格式化时间显示
const formatTime = (seconds) => {
  if (seconds <= 0) return '00:00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 加载设置
const loadSettings = async () => {
  try {
    console.log('[OptionsApp] 加载设置...')
    const result = await chrome.storage.local.get(['redirectUrl', 'websites'])
    console.log('[OptionsApp] 加载到的数据:', result)
    console.log('[OptionsApp] result.websites类型:', typeof result.websites)
    console.log('[OptionsApp] 是否为数组:', Array.isArray(result.websites))

    if (result.redirectUrl) {
      redirectUrl.value = result.redirectUrl
    }
    if (result.websites) {
      // 使用辅助函数确保 websites 是数组格式
      const websitesData = normalizeWebsites(result.websites)
      websites.value = websitesData
      console.log('[OptionsApp] websites数量:', websitesData.length)
    }
  } catch (error) {
    console.error('[OptionsApp] 加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    console.log('[OptionsApp] 准备保存设置, websites:', websites.value)
    console.log('[OptionsApp] websites.value是否为数组:', Array.isArray(websites.value))

    // 确保保存的是纯数组，使用 JSON.parse(JSON.stringify()) 去除 Vue 响应式代理
    const plainWebsites = JSON.parse(JSON.stringify(websites.value))
    console.log('[OptionsApp] 序列化后的websites:', plainWebsites)

    await chrome.storage.local.set({
      redirectUrl: redirectUrl.value,
      websites: plainWebsites
    })
    console.log('[OptionsApp] 设置已保存')

    // 验证保存是否成功
    const verify = await chrome.storage.local.get(['websites'])
    console.log('[OptionsApp] 验证保存后的数据:', verify.websites)
    console.log('[OptionsApp] 验证数据是否为数组:', Array.isArray(verify.websites))
  } catch (error) {
    console.error('[OptionsApp] 保存设置失败:', error)
  }
}

// 添加网站
const addWebsite = () => {
  if (!newSite.value.name || !newSite.value.url) {
    alert('请填写网站名称和URL')
    return
  }

  const website = {
    id: Date.now(),
    name: newSite.value.name,
    url: newSite.value.url,
    defaultTime: newSite.value.defaultTime || 600,
    remainingTime: newSite.value.defaultTime || 600,
    totalTime: 0,
    delayAmount: 300,
    enabled: true
  }

  websites.value.push(website)
  saveSettings()

  // 重置表单
  newSite.value = {
    name: '',
    url: '',
    defaultTime: 600
  }
}

// 添加延时
const addDelay = (site) => {
  site.remainingTime += site.delayAmount
  saveSettings()
  // 通知 background script 更新倒计时
  chrome.runtime.sendMessage({
    type: 'UPDATE_TIMER',
    siteId: site.id,
    remainingTime: site.remainingTime
  })
}

// 重置计时器
const resetTimer = (site) => {
  site.remainingTime = site.defaultTime
  site.totalTime = 0
  saveSettings()
  chrome.runtime.sendMessage({
    type: 'UPDATE_TIMER',
    siteId: site.id,
    remainingTime: site.remainingTime
  })
}

// 删除网站
const deleteWebsite = (index) => {
  if (confirm('确定要删除这个网站吗?')) {
    websites.value.splice(index, 1)
    saveSettings()
  }
}

onMounted(() => {
  loadSettings()

  // 定期更新显示的剩余时间
  setInterval(() => {
    loadSettings()
  }, 1000)
})
</script>

<style scoped>
.options-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 30px;
}

h2 {
  color: #555;
  margin: 20px 0 15px 0;
  font-size: 18px;
}

.global-settings {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-item label {
  font-weight: bold;
  min-width: 150px;
}

.setting-item input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-website {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.add-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.add-form input {
  flex: 1;
  min-width: 150px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-form button {
  padding: 8px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-form button:hover {
  background: #45a049;
}

.websites-list {
  background: white;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}

.website-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.website-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  transition: box-shadow 0.3s;
}

.website-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.website-info {
  flex: 1;
}

.info-row {
  margin: 5px 0;
  display: flex;
  gap: 10px;
}

.info-row .label {
  font-weight: bold;
  color: #666;
  min-width: 100px;
}

.info-row .value {
  color: #333;
}

.website-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.delay-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

button {
  padding: 6px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.3s;
}

button:hover {
  opacity: 0.8;
}

.delay-btn {
  background: #2196F3;
  color: white;
}

.reset-btn {
  background: #FF9800;
  color: white;
}

.delete-btn {
  background: #f44336;
  color: white;
}
</style>
