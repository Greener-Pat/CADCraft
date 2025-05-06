// 更新状态栏
export function updateStatus(text) {
    const statusElement = document.getElementById('statusText');
    if (statusElement) {
        statusElement.textContent = text;
        console.log('状态更新:', text);
    }
}

// 显示加载指示器
export function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (overlay && loadingText) {
        loadingText.textContent = text || '加载中...';
        overlay.classList.remove('hidden');
    }
}

// 隐藏加载指示器
export function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// 更新进度条
export function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}