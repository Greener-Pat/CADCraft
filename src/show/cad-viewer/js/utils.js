// 更新状态文本
export function updateStatus(text) {
    const statusElement = document.getElementById('statusText');
    if (statusElement) {
        statusElement.textContent = text;
    }
    console.log('状态更新:', text);
}

// 显示加载中覆盖层
export function showLoading(message = '加载中...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingText) loadingText.textContent = message;
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

// 隐藏加载中覆盖层
export function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// 更新进度条
export function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}

// 切换主题
export function toggleTheme() {
    console.log('切换主题函数被调用');
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateStatus(`已切换到${newTheme === 'dark' ? '暗色' : '亮色'}主题`);
    console.log(`主题已切换为: ${newTheme}`);
}

// 加载保存的主题
export function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    console.log(`加载已保存的主题: ${savedTheme}`);
}