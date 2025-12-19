// background.js - 后台服务，监控标签页和管理计时器
let trackingData = {} // 存储每个网站的跟踪信息
let activeTabId = null

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('摸鱼控制器已安装')
  initializeDefaultSettings()
})

// 设置默认配置
async function initializeDefaultSettings() {
  const result = await chrome.storage.local.get(['redirectUrl', 'websites'])

  if (!result.redirectUrl) {
    await chrome.storage.local.set({
      redirectUrl: 'https://www.google.com'
    })
  }

  if (!result.websites) {
    await chrome.storage.local.set({
      websites: []
    })
  }
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_TRACKING') {
    startTracking(message.siteId, sender.tab.id, message.url)
  } else if (message.type === 'UPDATE_TIMER') {
    updateSiteTimer(message.siteId, message.remainingTime)
  }
})

// 开始跟踪网站
async function startTracking(siteId, tabId, url) {
  console.log('开始跟踪网站:', siteId, tabId)

  // 如果已经在跟踪，先停止
  if (trackingData[siteId]) {
    stopTracking(siteId)
  }

  // 创建新的跟踪记录
  trackingData[siteId] = {
    tabId: tabId,
    url: url,
    interval: setInterval(() => {
      updateTimer(siteId)
    }, 1000)
  }
}

// 停止跟踪网站
function stopTracking(siteId) {
  if (trackingData[siteId]) {
    clearInterval(trackingData[siteId].interval)
    delete trackingData[siteId]
  }
}

// 更新计时器
async function updateTimer(siteId) {
  try {
    const result = await chrome.storage.local.get(['websites', 'redirectUrl'])
    const websites = result.websites || []
    const redirectUrl = result.redirectUrl || 'https://www.google.com'

    const siteIndex = websites.findIndex(site => site.id === siteId)
    if (siteIndex === -1) {
      stopTracking(siteId)
      return
    }

    const site = websites[siteIndex]

    // 减少剩余时间
    if (site.remainingTime > 0) {
      site.remainingTime--
      site.totalTime++

      // 保存更新
      await chrome.storage.local.set({ websites })

      // 通知 content script 更新显示
      if (trackingData[siteId]) {
        const tabId = trackingData[siteId].tabId
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_COUNTDOWN',
            siteId: siteId,
            remainingTime: site.remainingTime
          })
        } catch (error) {
          // Tab可能已关闭，停止跟踪
          stopTracking(siteId)
        }
      }

      // 如果时间到了，执行跳转
      if (site.remainingTime <= 0) {
        await performRedirect(siteId, redirectUrl)
      }
    }
  } catch (error) {
    console.error('更新计时器失败:', error)
  }
}

// 执行跳转
async function performRedirect(siteId, redirectUrl) {
  if (!trackingData[siteId]) return

  const tabId = trackingData[siteId].tabId

  try {
    // 跳转到指定URL
    await chrome.tabs.update(tabId, { url: redirectUrl })
    console.log('已跳转到:', redirectUrl)

    // 停止跟踪
    stopTracking(siteId)
  } catch (error) {
    console.error('跳转失败:', error)
  }
}

// 手动更新网站计时器（从设置页面调用）
async function updateSiteTimer(siteId, newRemainingTime) {
  try {
    const result = await chrome.storage.local.get(['websites'])
    const websites = result.websites || []

    const siteIndex = websites.findIndex(site => site.id === siteId)
    if (siteIndex !== -1) {
      websites[siteIndex].remainingTime = newRemainingTime
      await chrome.storage.local.set({ websites })

      // 如果正在跟踪这个网站，更新显示
      if (trackingData[siteId]) {
        const tabId = trackingData[siteId].tabId
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_COUNTDOWN',
            siteId: siteId,
            remainingTime: newRemainingTime
          })
        } catch (error) {
          console.error('更新显示失败:', error)
        }
      }
    }
  } catch (error) {
    console.error('更新计时器失败:', error)
  }
}

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId

  // 检查激活的标签页是否是摸鱼网站
  try {
    const tab = await chrome.tabs.get(activeTabId)
    await checkTabUrl(tab)
  } catch (error) {
    console.error('检查标签页失败:', error)
  }
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await checkTabUrl(tab)
  }
})

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  // 停止该标签页相关的所有跟踪
  for (const siteId in trackingData) {
    if (trackingData[siteId].tabId === tabId) {
      stopTracking(siteId)
    }
  }
})

// 检查标签页URL
async function checkTabUrl(tab) {
  if (!tab.url) return

  try {
    const result = await chrome.storage.local.get(['websites'])
    const websites = result.websites || []

    // 检查是否匹配任何摸鱼网站
    for (const site of websites) {
      if (site.enabled && tab.url.includes(site.url)) {
        // 匹配到摸鱼网站
        if (!trackingData[site.id] || trackingData[site.id].tabId !== tab.id) {
          startTracking(site.id, tab.id, tab.url)
        }
        return
      }
    }

    // 不是摸鱼网站，停止该标签页的所有跟踪
    for (const siteId in trackingData) {
      if (trackingData[siteId].tabId === tab.id) {
        stopTracking(siteId)
      }
    }
  } catch (error) {
    console.error('检查URL失败:', error)
  }
}
