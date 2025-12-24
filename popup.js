// popup.js - 处理 popup 页面的交互逻辑

document.addEventListener('DOMContentLoaded', () => {
  const openSettingsBtn = document.getElementById('openSettings')

  // 点击按钮打开设置页面
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
})
