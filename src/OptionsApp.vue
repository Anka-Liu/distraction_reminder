<template>
  <div class="options-page">
    <header class="options-hero">
      <div class="hero-content">
        <p class="hero-tag">专注守护</p>
        <h1>摸鱼网站控制中心</h1>
        <p class="hero-subtitle">
          管理高危摸鱼网站并设定倒计时，帮助你在休闲与效率之间找到最舒适的平衡。
        </p>
        <div class="hero-buttons">
          <button class="btn primary" @click="scrollToAddForm">快速添加网站</button>
          <button class="btn ghost" @click="loadSettings(true)">刷新数据</button>
        </div>
      </div>
      <div class="hero-metrics">
        <div class="metric-card">
          <p class="metric-label">已管理网站</p>
          <p class="metric-value">{{ totalTrackedSites }}</p>
          <p class="metric-hint">站点正在被关注</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">今日摸鱼时间</p>
          <p class="metric-value">{{ formatTime(todayTotalSeconds) }}</p>
          <p class="metric-hint">凌晨 04:00 自动重置</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">倒计时运行</p>
          <p class="metric-value">{{ activeTimers }}</p>
          <p class="metric-hint">正在倒计时的站点</p>
        </div>
      </div>
    </header>

    <div class="options-grid">
      <section class="card global-card">
        <div class="card-header">
          <div>
            <h2>全局跳转设置</h2>
            <p>倒计时结束后，页面会跳转到你指定的效率网站</p>
          </div>
          <span class="badge soft">建议设置学习或效率工具</span>
        </div>
        <div class="card-body form-row">
          <div class="input-field">
            <label for="redirect-input">跳转网址</label>
            <input
              id="redirect-input"
              v-model="redirectUrl"
              type="url"
              placeholder="https://example.com"
            />
            <small>例如：Notion、在线番茄钟、读书计划等。</small>
          </div>
          <button class="btn primary" @click="saveRedirectUrl">保存设置</button>
        </div>
      </section>

      <section class="card add-card" id="add-site">
        <div class="card-header">
          <div>
            <h2>添加摸鱼网站</h2>
            <p>一次添加多个域名，用逗号分隔即可同步管理</p>
          </div>
          <span class="badge accent">实时同步到所有标签页</span>
        </div>
        <div class="card-body add-form-grid">
          <div class="input-field">
            <label for="site-name">网站名称</label>
            <input
              id="site-name"
              v-model="newSite.name"
              type="text"
              placeholder="例如：哔哩哔哩"
            />
          </div>
          <div class="input-field">
            <label for="site-url">域名 / URL</label>
            <input
              id="site-url"
              v-model="newSite.url"
              type="text"
              placeholder="例如：bilibili.com, b23.tv"
            />
            <small>多个域名请用逗号隔开，不需要填写 https。</small>
          </div>
          <button class="btn secondary" @click="addWebsite">添加到列表</button>
        </div>
      </section>
    </div>

    <section class="card websites-card">
      <div class="card-header">
        <div>
          <h2>网站管理面板</h2>
          <p>查看每个站点的倒计时状态，并快速延长或重置</p>
        </div>
        <button class="btn ghost" @click="loadSettings(true)">手动同步</button>
      </div>

      <div class="websites-board">
        <div v-if="websites.length === 0" class="empty-state">
          <div class="empty-icon">⌛</div>
          <p>暂未添加任何摸鱼网站</p>
          <span>使用上方表单添加常用网站，立即开启专注模式。</span>
          <button class="btn link" @click="scrollToAddForm">前往添加</button>
        </div>
        <div v-else class="website-grid">
          <div
            v-for="(site, index) in websites"
            :key="site.id"
            class="site-card"
            :class="{ 'site-card--counting': site.remainingTime > 0 }"
          >
            <div v-if="editingId === site.id" class="edit-mode-card">
              <h3>编辑 {{ site.name }}</h3>
              <div class="edit-grid">
                <div class="input-field">
                  <label>网站名称</label>
                  <input v-model="editForm.name" type="text" placeholder="网站名称" />
                </div>
                <div class="input-field">
                  <label>域名 / URL</label>
                  <input v-model="editForm.url" type="text" placeholder="网站URL" />
                </div>
              </div>
              <div class="edit-actions">
                <button class="btn primary" @click="saveEdit(site)">保存</button>
                <button class="btn ghost" @click="cancelEdit()">取消</button>
              </div>
            </div>

            <template v-else>
              <header class="site-card-header">
                <div>
                  <p class="site-name">{{ site.name }}</p>
                  <p class="site-url">{{ site.url }}</p>
                </div>
                <span
                  class="status-pill"
                  :class="site.remainingTime > 0 ? 'status-pill--active' : 'status-pill--idle'"
                >
                  {{ site.remainingTime > 0 ? '倒计时中' : '待触发' }}
                </span>
              </header>

              <dl class="site-stats">
                <div class="stat">
                  <dt>剩余倒计时</dt>
                  <dd>{{ formatTime(site.remainingTime) }}</dd>
                </div>
                <div class="stat">
                  <dt>今日摸鱼</dt>
                  <dd>{{ formatTime(site.dailyTotalTime || 0) }}</dd>
                </div>
                <div class="stat">
                  <dt>累计时长</dt>
                  <dd>{{ formatTime(site.totalTime || 0) }}</dd>
                </div>
              </dl>

              <div class="site-controls">
                <label class="delay-label" :for="`delay-${site.id}`">延长时长</label>
                <div class="delay-control">
                  <select
                    :id="`delay-${site.id}`"
                    v-model="site.delayAmount"
                    @change="saveSettings()"
                  >
                    <option :value="60">1 分钟</option>
                    <option :value="300">5 分钟</option>
                    <option :value="600">10 分钟</option>
                    <option :value="1800">30 分钟</option>
                    <option :value="3600">1 小时</option>
                  </select>
                  <button class="btn secondary" @click="addDelay(site)">延长倒计时</button>
                </div>
              </div>

              <div class="site-actions">
                <button class="btn text" @click="resetTimer(site)">重置</button>
                <button class="btn text" @click="startEdit(site)">编辑</button>
                <button class="btn text danger" @click="deleteWebsite(index)">删除</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const redirectUrl = ref('https://www.google.com')
const websites = ref([])
const newSite = ref({
  name: '',
  url: ''
})
const editingId = ref(null)
const editForm = ref({
  name: '',
  url: ''
})

const totalTrackedSites = computed(() => websites.value.length)
const todayTotalSeconds = computed(() =>
  websites.value.reduce((sum, site) => sum + (site.dailyTotalTime || 0), 0)
)
const activeTimers = computed(() =>
  websites.value.filter(site => site.remainingTime > 0).length
)

// 辅助函数：获取当前日期标识（以4点为界）
function getDateKey(date = new Date()) {
  const hours = date.getHours()
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // 如果当前时间 < 4点，则属于前一天
  if (hours < 4) {
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  }

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 辅助函数：从 storage 读取 websites 并正确处理类型
function normalizeWebsites(storageWebsites) {
  if (Array.isArray(storageWebsites)) {
    return storageWebsites
  } else if (storageWebsites && typeof storageWebsites === 'object') {
    // 如果是对象（例如被错误保存为 {0: {...}, 1: {...}}），转换为数组
    if (__DEV__) console.warn('[OptionsApp normalizeWebsites] ⚠️ websites被存储为对象，转换为数组')
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

// 页面快捷滚动
const scrollToAddForm = () => {
  const section = document.getElementById('add-site')
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 加载设置
const loadSettings = async (forceUpdate = false) => {
  try {
    console.log('[OptionsApp] 加载设置...')
    const result = await chrome.storage.local.get(['redirectUrl', 'websites'])
    console.log('[OptionsApp] 加载到的数据:', result)
    console.log('[OptionsApp] result.websites类型:', typeof result.websites)
    console.log('[OptionsApp] 是否为数组:', Array.isArray(result.websites))

    // 只在首次加载时更新 redirectUrl，避免覆盖用户正在编辑的内容
    if (forceUpdate && result.redirectUrl) {
      redirectUrl.value = result.redirectUrl
    }

    if (result.websites) {
      // 使用辅助函数确保 websites 是数组格式
      const websitesData = normalizeWebsites(result.websites)

      // 智能合并：只更新 remainingTime 和 totalTime，保留用户正在编辑的 delayAmount
      if (!forceUpdate && websites.value.length > 0) {
        websitesData.forEach((newSite) => {
          const existingSite = websites.value.find(s => s.id === newSite.id)
          if (existingSite) {
            // 只更新计时相关的字段，保留用户选择的 delayAmount
            existingSite.remainingTime = newSite.remainingTime
            existingSite.totalTime = newSite.totalTime
            existingSite.dailyTotalTime = newSite.dailyTotalTime || 0
            existingSite.lastResetDate = newSite.lastResetDate || getDateKey()
            existingSite.name = newSite.name
            existingSite.url = newSite.url
            existingSite.defaultTime = newSite.defaultTime
            existingSite.enabled = newSite.enabled
            // 如果 storage 中有 delayAmount，也更新它（说明是从其他地方保存的）
            if (newSite.delayAmount !== undefined) {
              existingSite.delayAmount = newSite.delayAmount
            }
          }
        })

        // 处理新增或删除的网站
        const existingIds = websites.value.map(s => s.id)
        const newIds = websitesData.map(s => s.id)

        // 添加新网站
        websitesData.forEach(newSite => {
          if (!existingIds.includes(newSite.id)) {
            websites.value.push(newSite)
          }
        })

        // 删除已不存在的网站
        websites.value = websites.value.filter(site => newIds.includes(site.id))
      } else {
        // 首次加载或强制更新，直接替换
        websites.value = websitesData
      }

      console.log('[OptionsApp] websites数量:', websitesData.length)
    }
  } catch (error) {
    console.error('[OptionsApp] 加载设置失败:', error)
  }
}

// 规范化 URL，确保包含协议
const normalizeUrl = (url) => {
  if (!url) return 'https://www.google.com'

  const trimmedUrl = url.trim()

  // 如果已经有协议，直接返回
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }

  // 如果没有协议，自动添加 https://
  return 'https://' + trimmedUrl
}

// 保存跳转网址
const saveRedirectUrl = async () => {
  try {
    // 规范化 redirectUrl，确保包含协议
    const normalizedRedirectUrl = normalizeUrl(redirectUrl.value)

    // 如果 URL 被修改了，更新显示
    if (normalizedRedirectUrl !== redirectUrl.value) {
      redirectUrl.value = normalizedRedirectUrl
      console.log('[OptionsApp] URL已规范化为:', normalizedRedirectUrl)
    }

    await chrome.storage.local.set({
      redirectUrl: normalizedRedirectUrl
    })
    console.log('[OptionsApp] 跳转网址已保存:', normalizedRedirectUrl)
    alert('跳转网址已保存')
  } catch (error) {
    console.error('[OptionsApp] 保存跳转网址失败:', error)
    alert('保存失败，请重试')
  }
}

// 保存设置（网站列表）
const saveSettings = async () => {
  try {
    console.log('[OptionsApp] 准备保存设置, websites:', websites.value)
    console.log('[OptionsApp] websites.value是否为数组:', Array.isArray(websites.value))

    // 确保保存的是纯数组，使用 JSON.parse(JSON.stringify()) 去除 Vue 响应式代理
    const plainWebsites = JSON.parse(JSON.stringify(websites.value))
    console.log('[OptionsApp] 序列化后的websites:', plainWebsites)

    await chrome.storage.local.set({
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
    defaultTime: 0,
    remainingTime: 0,
    totalTime: 0,
    dailyTotalTime: 0,
    lastResetDate: getDateKey(),
    delayAmount: 300,
    enabled: true
  }

  websites.value.push(website)
  saveSettings()

  // 重置表单
  newSite.value = {
    name: '',
    url: ''
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
  site.remainingTime = 0
  site.totalTime = 0
  site.dailyTotalTime = 0
  site.lastResetDate = getDateKey()
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

// 开始编辑网站
const startEdit = (site) => {
  editingId.value = site.id
  editForm.value = {
    name: site.name,
    url: site.url
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editForm.value = {
    name: '',
    url: ''
  }
}

// 保存编辑
const saveEdit = (site) => {
  if (!editForm.value.name || !editForm.value.url) {
    alert('请填写网站名称和URL')
    return
  }

  site.name = editForm.value.name
  site.url = editForm.value.url
  saveSettings()
  cancelEdit()
}

onMounted(() => {
  // 首次加载，使用 forceUpdate = true 完全替换数据
  loadSettings(true)

  // 定期更新显示的剩余时间，使用智能合并模式
  setInterval(() => {
    loadSettings(false)
  }, 1000)
})
</script>

<style scoped>
.options-page {
  min-height: 100vh;
  padding: 48px 24px 80px;
  background: linear-gradient(135deg, #f4f6fb 0%, #fff8f0 45%, #f2fbff 100%);
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0f172a;
}

.options-hero {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  padding: 40px;
  border-radius: 32px;
  background: radial-gradient(circle at top left, #2563eb, #0f172a);
  color: #fff;
  box-shadow: 0 35px 80px rgba(15, 23, 42, 0.45);
  margin-bottom: 32px;
}

.hero-content {
  flex: 1;
  min-width: 260px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}

.hero-tag::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 12px #38bdf8;
}

.hero-content h1 {
  margin: 18px 0 12px;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  line-height: 1.6;
  font-size: 1rem;
  color: rgba(248, 250, 252, 0.85);
  max-width: 460px;
}

.hero-buttons {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-metrics {
  flex: 1;
  min-width: 240px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(14px);
}

.metric-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.metric-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #0f172a;
}

.card-header p {
  margin: 6px 0 0;
  color: #6b7280;
}

.badge {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge.soft {
  background: #eef2ff;
  color: #4f46e5;
}

.badge.accent {
  background: #ecfeff;
  color: #0ea5e9;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  flex-direction: row;
  align-items: flex-end;
  flex-wrap: wrap;
}

.input-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 240px;
}

.input-field label {
  font-weight: 600;
  color: #0f172a;
}

.input-field input {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-field input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.input-field small {
  color: #94a3b8;
  font-size: 0.8rem;
}

.btn {
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 20px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:focus-visible {
  outline: 3px solid rgba(59, 130, 246, 0.4);
  outline-offset: 2px;
}

.btn.primary {
  background: linear-gradient(125deg, #4f46e5, #2563eb);
  color: #fff;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.35);
}

.btn.primary:hover {
  transform: translateY(-1px);
}

.btn.secondary {
  background: #e0edff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.btn.ghost {
  background: transparent;
  border: 1px solid rgba(15, 23, 42, 0.25);
  color: #0f172a;
}

.options-hero .btn.ghost {
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.4);
}

.btn.text {
  background: transparent;
  padding: 6px 10px;
  color: #475569;
}

.btn.text:hover {
  background: #f8fafc;
}

.btn.text.danger {
  color: #e11d48;
}

.btn.link {
  background: transparent;
  padding: 0;
  color: #2563eb;
  text-decoration: underline;
}

.btn.link:hover {
  color: #1d4ed8;
  background: transparent;
}

.add-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  align-items: end;
}

.websites-card {
  margin-top: 12px;
}

.websites-board {
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border: 2px dashed #e2e8f0;
  border-radius: 24px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #475569;
}

.empty-icon {
  font-size: 2rem;
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.site-card {
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.site-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 55px rgba(15, 23, 42, 0.12);
}

.site-card--counting {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 25px 55px rgba(37, 99, 235, 0.15);
}

.site-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.site-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.site-url {
  font-size: 0.9rem;
  color: #6b7280;
  word-break: break-all;
}

.status-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-pill--active {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill--idle {
  background: #f1f5f9;
  color: #475569;
}

.site-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 0;
}

.stat {
  background: #f8fafc;
  border-radius: 16px;
  padding: 16px;
}

.stat dt {
  font-size: 0.8rem;
  color: #94a3b8;
}

.stat dd {
  margin: 6px 0 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}

.site-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delay-label {
  font-size: 0.85rem;
  color: #475569;
}

.delay-control {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.delay-control select {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #cbd5f5;
  min-width: 140px;
  font-weight: 600;
  color: #1d4ed8;
  background: #eff6ff;
}

.site-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.edit-mode-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
}

.edit-mode-card h3 {
  margin: 0;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .options-page {
    padding: 32px 16px 60px;
  }

  .options-hero {
    padding: 28px;
  }

  .hero-content h1 {
    font-size: 2rem;
  }

  .card {
    padding: 20px;
  }

  .site-card {
    min-height: auto;
  }

  .site-actions {
    justify-content: flex-start;
  }
}
</style>
