/**
 * 模型生成功能
 */
class ModelGenerator {
    constructor() {
        // API基础URL - 根据实际部署环境修改
        this.apiBaseUrl = "http://localhost:5000";
        
        // 初始化DOM元素引用
        this.description = document.getElementById('modelDescription');
        this.statusElement = document.getElementById('generationStatus');
        
        // 绑定按钮事件
        this.bindEvents();
    }
    
    bindEvents() {
        // 整体生成按钮
        document.getElementById('genWhole').addEventListener('click', () => {
            this.generateModel(true);
        });
        
        // 拼接生成按钮 - 基因分割
        document.getElementById('genGeneParams').addEventListener('click', () => {
            this.generateModel(false, 'gene', 'params');
        });
        document.getElementById('genGeneHand').addEventListener('click', () => {
            this.generateModel(false, 'gene', 'hand');
        });
        
        // 拼接生成按钮 - CLIP分割
        document.getElementById('genClipParams').addEventListener('click', () => {
            this.generateModel(false, 'clip', 'params');
        });
        document.getElementById('genClipHand').addEventListener('click', () => {
            this.generateModel(false, 'clip', 'hand');
        });
        
        // 拼接生成按钮 - 预制件分割
        document.getElementById('genPrefabsParams').addEventListener('click', () => {
            this.generateModel(false, 'prefabs', 'params');
        });
        document.getElementById('genPrefabsHand').addEventListener('click', () => {
            this.generateModel(false, 'prefabs', 'hand');
        });
    }
    
    async generateModel(whole, div = 'gene', merge = 'hand') {
        const description = this.description.value.trim();
        
        // 验证输入
        if (!description) {
            this.showStatus('请输入模型描述', 'error');
            return;
        }
        
        // 显示加载状态
        this.showStatus('<div class="spinner"></div> 正在生成模型，请稍候...', 'loading');
        
        // 准备请求数据
        const requestData = {
            desire: description,
            whole: whole,
            div: div,
            merge: merge
        };
        
        try {
            // 发送请求到后端API
            const response = await fetch(`${this.apiBaseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            // 解析响应
            const data = await response.json();
            
            // 处理响应
            if (data.status === "success") {
                let methodText = whole ? "整体生成" : 
                    `${this.translateDiv(div)}分割 + ${this.translateMerge(merge)}拼接`;
                
                this.showStatus(`
                    <strong>生成成功!</strong><br>
                    <span>生成方法: ${methodText}</span><br>
                    <span>文件路径: ${data.path}</span>
                `, 'success');
                
                // 确保路径是服务器可访问的完整URL
                const modelPath = this.ensureFullPath(data.path);
                
                // 自动加载生成的模型
                window.loadModelFromPath(modelPath);
            } else {
                // 使用温和的Toast通知替代直接在状态区域显示错误
                this.showToast(data.message || '生成失败，请稍后重试', 'error');
                
                // 可以选择在状态区域保留一个简短的错误提示
                this.showStatus(`
                    <strong>生成未完成</strong><br>
                    <span>请查看详细提示</span>
                `, 'error');
            }
        } catch (error) {
            // 显示错误信息
            this.showToast('无法连接到服务器或处理响应时出错', 'error');
            this.showStatus(`
                <strong>请求错误</strong><br>
                <span>无法完成操作</span>
            `, 'error');
            console.error("Error generating model:", error);
        }
    }
    
    // 显示状态消息
    showStatus(message, type) {
        this.statusElement.innerHTML = message;
        this.statusElement.className = `status-message ${type}`;
    }

    // 添加新方法：显示Toast通知
    showToast(message, type) {
        // 创建Toast元素
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'error' ? '❗' : '✓'}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">×</button>
        `;
        
        // 添加样式
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '10000';
        toast.style.padding = '12px 20px';
        toast.style.background = type === 'error' ? 'rgba(255, 202, 202, 0.95)' : 'rgba(209, 255, 209, 0.95)';
        toast.style.color = type === 'error' ? '#900' : '#151';
        toast.style.borderRadius = '6px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        toast.style.borderLeft = type === 'error' ? '4px solid #d95c5c' : '4px solid #2ecc71';
        toast.style.minWidth = '280px';
        toast.style.transform = 'translateX(120%)';
        toast.style.transition = 'all 0.5s ease';
        
        // Toast内部样式
        const contentStyle = `
            display: flex;
            align-items: center;
            padding-right: 20px;
        `;
        toast.querySelector('.toast-content').style = contentStyle;
        
        // Icon样式
        const iconStyle = `
            font-size: 18px;
            margin-right: 12px;
        `;
        toast.querySelector('.toast-icon').style = iconStyle;
        
        // 关闭按钮样式
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.style = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: ${type === 'error' ? '#900' : '#151'};
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            opacity: 0.6;
        `;
        closeBtn.addEventListener('mouseover', () => closeBtn.style.opacity = '1');
        closeBtn.addEventListener('mouseout', () => closeBtn.style.opacity = '0.6');
        
        // 添加到页面
        document.body.appendChild(toast);
        
        // 动画展示
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 50);
        
        // 添加关闭事件
        closeBtn.addEventListener('click', () => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        });
        
        // 5秒后自动消失
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 500);
            }
        }, 5000);
    }
    
    // 辅助函数：确保路径是完整URL
    ensureFullPath(path) {
        // 如果已经是完整URL，直接返回
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        // 否则，拼接API基础URL和路径
        // 移除路径开头的斜杠（如果有）
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${this.apiBaseUrl}/${cleanPath}`;
    }

    // 翻译分割方法为中文
    translateDiv(div) {
        const divMap = {
            'gene': '基因',
            'clip': 'CLIP',
            'prefabs': '预制件'
        };
        return divMap[div] || div;
    }
    
    // 翻译拼接方法为中文
    translateMerge(merge) {
        const mergeMap = {
            'params': '参数',
            'hand': '手动'
        };
        return mergeMap[merge] || merge;
    }
    
    // 加载生成的模型 (需要与您现有的模型加载函数集成)
    loadGeneratedModel(path) {
        // 这里应该调用您现有的加载JSON模型的函数
        // 例如：loadModelFromJSON(path);
        console.log("应加载模型:", "D:/Brain/CADCraft/src/crafter/outputs/generate0.json");
        
        // 如果有全局加载函数，可以直接调用
        if (typeof window.loadModelFromPath === 'function') {
            window.loadModelFromPath("D:/Brain/CADCraft/src/crafter/outputs/generate0.json");
        }
    }
}

// 在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.modelGenerator = new ModelGenerator();
});