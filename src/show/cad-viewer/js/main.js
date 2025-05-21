import { CadRenderer } from './renderer/CadRenderer.js';
import { updateStatus, showLoading, hideLoading, updateProgress } from './utils/StatusManager.js';
import { toggleTheme, loadThemePreference, saveSectionState, loadSectionStates, formatSize, getShapeName } from './utils/Utils.js';
import { ShapeFactory } from './renderer/ShapeFactory.js';
import { JsonEditor } from './jsonEditor.js';

// 全局变量
let renderer;
let currentModelData = null;
let selectedShape = null;
let jsonEditor = null;

// 初始化应用
async function initApp() {
    console.log('初始化应用');
    updateStatus('初始化应用');
    
    
    // 设置当前时间和用户名
    document.getElementById('currentTime').textContent = '2025-05-06 12:12:40';
    document.getElementById('username').textContent = 'eFlerin';
    
    // 创建CAD渲染器实例
    renderer = new CadRenderer('container');
    
    // 设置对象移动回调
    renderer.setObjectMovedCallback(handleObjectMoved);
    
    // 将渲染器保存到全局变量，以便主题管理工具能够访问
    window.renderer = renderer;
    
    jsonEditor = renderer.jsonEditor;
    window.jsonEditor =  jsonEditor;

    // 加载主题首选项
    loadThemePreference();

    initResizableSidebar();
    
    // 添加事件监听器 - 文件操作
    document.getElementById('loadJsonBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleModel);
    document.getElementById('downloadModelBtn').addEventListener('click', downloadCurrentModel);
    
    // 添加事件监听器 - 视图控制
    document.getElementById('resetBtn').addEventListener('click', () => renderer.resetView());
    document.getElementById('wireframeToggle').addEventListener('change', (e) => renderer.toggleWireframe(e.target.checked));
    document.getElementById('axesToggle').addEventListener('change', (e) => renderer.toggleAxes(e.target.checked));
    document.getElementById('shadowToggle').addEventListener('change', (e) => renderer.toggleShadows(e.target.checked));
    
    // 添加事件监听器 - 主题切换
    document.getElementById('themeToggle').addEventListener('click', () => {
        console.log('主题切换按钮被点击');
        toggleTheme();
    });
    
    // 添加事件监听器 - 基本形状
    initShapeSelectors();
    document.getElementById('addShapeBtn').addEventListener('click', addSelectedShapeToScene);
    
    // 添加事件监听器 - 区块折叠
    initSectionToggle();
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', () => renderer.onWindowResize());
    
    // 初始化渲染器
    await renderer.init();

    // 添加事件监听器 - 边界框和网格设置 (检查元素是否存在再添加)
    const boundingBoxToggle = document.getElementById('boundingBoxToggle');
    if (boundingBoxToggle) {
        boundingBoxToggle.addEventListener('change', (e) => renderer.toggleBoundingBox(e.target.checked));
        // 切换边界框时更新网格位置以保持一致
        syncGridWithBoundaries();
    }
    
    const gridSizeInput = document.getElementById('gridSizeInput');
    if (gridSizeInput) {
        gridSizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            if (size > 0) {
                renderer.setGridConfig({ size: size });
                syncBoundariesWithGrid(size);
            }
        });
    }
    
    const verticalMinInput = document.getElementById('verticalMinInput');
    if (verticalMinInput) {
        verticalMinInput.addEventListener('change', (e) => {
            const min = parseFloat(e.target.value);
            const maxInput = document.getElementById('verticalMaxInput');
            if (maxInput) {
                const max = parseFloat(maxInput.value);
                if (min != NaN && min < max) {
                    renderer.setDragLimits({ vertical: { min: min } });
                    // 更新网格高度位置
                    syncGridWithBoundaries();
                    // 如果边界框可见，重新绘制以反映新界限
                    if (boundingBoxToggle && boundingBoxToggle.checked) {
                        renderer.toggleBoundingBox(false);
                        setTimeout(() => renderer.toggleBoundingBox(true), 50);
                    }
                }
            }
        });
    }
    
    const verticalMaxInput = document.getElementById('verticalMaxInput');
    if (verticalMaxInput) {
        verticalMaxInput.addEventListener('change', (e) => {
            const max = parseFloat(e.target.value);
            const minInput = document.getElementById('verticalMinInput');
            if (minInput) {
                const min = parseFloat(minInput.value);
                if (max > min && max != NaN) {
                    renderer.setDragLimits({ vertical: { max: max } });
                    // 更新网格高度位置
                    syncGridWithBoundaries();
                    // 如果边界框可见，重新绘制以反映新界限
                    if (boundingBoxToggle && boundingBoxToggle.checked) {
                        renderer.toggleBoundingBox(false);
                        setTimeout(() => renderer.toggleBoundingBox(true), 50);
                    }
                }
            }
        });
    }

    // 初始化文件管理器
    fileExplorer.init();
    window.fileExplorer = fileExplorer;
    
    // 自动加载示例模型
    setTimeout(loadSampleModel, 500);
    
    updateStatus('初始化完成');
}

// VS Code 风格文件资源管理器 - 美化版
const fileExplorer = {
    rootHandle: null,
    expandedFolders: new Set(),
    selectedFile: null,
    isLoading: false,
    
    // 初始化文件资源管理器
    init: function() {
        // 绑定按钮事件
        document.getElementById('openFolderBtn')?.addEventListener('click', () => this.openFolder());
        document.getElementById('selectFolderBtn')?.addEventListener('click', () => this.openFolder());
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refresh());
        document.getElementById('collapseAllBtn')?.addEventListener('click', () => this.collapseAll());
        
        // 如果已经有文件夹信息存储在本地存储中，尝试恢复
        this.tryRestoreLastSession();
        
        console.log('文件资源管理器初始化完成');
    },
    
    // 尝试恢复上次会话
    async tryRestoreLastSession() {
        // 这部分可以扩展为从localStorage读取上次打开的文件夹和展开状态
        // 目前先保持简单实现
    },
    
    // 打开根文件夹
    async openFolder() {
        try {
            if (this.isLoading) return;
            this.isLoading = true;
            
            // 检查浏览器支持
            if (!('showDirectoryPicker' in window)) {
                alert('您的浏览器不支持文件系统访问API，请使用Chrome或Edge浏览器。');
                this.isLoading = false;
                return;
            }
            
            // 显示文件夹选择对话框
            this.rootHandle = await window.showDirectoryPicker();
            
            // 重置状态
            this.expandedFolders.clear();
            this.selectedFile = null;
            
            // 加载并显示文件树
            await this.renderFileTree();
            this.isLoading = false;
            
            updateStatus(`已打开文件夹: ${this.rootHandle.name}`);
        } catch (error) {
            this.isLoading = false;
            if (error.name !== 'AbortError') {
                console.error('打开文件夹失败:', error);
                updateStatus('打开文件夹失败');
            }
        }
    },
    
    // 刷新资源管理器
    async refresh() {
        if (!this.rootHandle || this.isLoading) return;
        
        this.isLoading = true;
        await this.renderFileTree(true); // 保留展开状态
        this.isLoading = false;
        
        updateStatus('资源管理器已刷新');
    },
    
    // 折叠所有文件夹
    collapseAll() {
        if (!this.rootHandle) return;
        
        // 保存当前滚动位置
        const container = document.querySelector('.explorer-container');
        const scrollTop = container?.scrollTop || 0;
        
        this.expandedFolders.clear();
        this.renderFileTree();
        
        // 恢复滚动位置
        setTimeout(() => {
            if (container) container.scrollTop = scrollTop;
        }, 50);
        
        updateStatus('所有文件夹已折叠');
    },
    
    // 渲染文件树
    async renderFileTree(keepExpanded = false) {
        const fileTree = document.getElementById('fileTree');
        if (!fileTree || !this.rootHandle) return;
        
        // 保存当前滚动位置
        const container = document.querySelector('.explorer-container');
        const scrollTop = container?.scrollTop || 0;
        
        // 显示加载状态
        fileTree.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>正在加载文件...</span>
            </div>
        `;
        
        try {
            // 保存扩展状态的副本，如果需要的话
            const savedExpanded = keepExpanded ? new Set(this.expandedFolders) : null;
            
            // 清空文件树
            fileTree.innerHTML = '';
            
            // 获取根目录内容并排序
            const entries = await this.getFolderEntries(this.rootHandle);
            
            if (entries.length === 0) {
                // 显示空文件夹状态
                fileTree.innerHTML = `
                    <div class="explorer-empty">
                        <i class="codicon codicon-folder-opened empty-icon"></i>
                        <div class="empty-text">
                            <p>文件夹中没有JSON文件或子文件夹</p>
                        </div>
                        <button id="parentFolderBtn" class="select-folder-btn">
                            <i class="codicon codicon-folder-opened"></i>
                            <span>选择上级文件夹</span>
                        </button>
                    </div>
                `;
                
                // 添加按钮事件
                document.getElementById('parentFolderBtn')?.addEventListener('click', () => this.openFolder());
                return;
            }
            
            // 恢复扩展状态，如果需要的话
            if (keepExpanded && savedExpanded) {
                this.expandedFolders = savedExpanded;
            }
            
            // 添加文件夹标题
            const folderHeader = document.createElement('div');
            folderHeader.className = 'tree-folder-header';
            folderHeader.innerHTML = `
                <div class="tree-item" style="padding-left: 8px; font-weight: 600;">
                    <div class="tree-icon">
                        <i class="codicon codicon-root-folder" style="color: var(--icon-folder); font-size: 18px;"></i>
                    </div>
                    <div class="tree-label">${this.rootHandle.name}</div>
                </div>
            `;
            fileTree.appendChild(folderHeader);
            
            // 为每个条目创建树节点
            for (const entry of entries) {
                await this.createTreeNode(entry, fileTree, 0);
            }
            
            // 恢复滚动位置
            setTimeout(() => {
                if (container) container.scrollTop = scrollTop;
            }, 50);
            
        } catch (error) {
            console.error('渲染文件树失败:', error);
            fileTree.innerHTML = `
                <div class="explorer-empty">
                    <i class="codicon codicon-error empty-icon" style="color: #e51400;"></i>
                    <div class="empty-text">
                        <p>无法读取文件夹内容</p>
                        <p style="font-size: 12px; opacity: 0.8;">${error.message}</p>
                    </div>
                    <button id="retryFolderBtn" class="select-folder-btn">
                        <i class="codicon codicon-debug-restart"></i>
                        <span>重试</span>
                    </button>
                </div>
            `;
            
            // 添加重试按钮事件
            document.getElementById('retryFolderBtn')?.addEventListener('click', () => this.refresh());
        }
    },
    
    // 获取文件夹内的条目并排序（只返回文件夹和JSON文件）
    async getFolderEntries(folderHandle) {
        const entries = [];
        
        // 读取文件夹内容
        for await (const entry of folderHandle.values()) {
            if (entry.kind === 'directory' || 
                (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json'))) {
                entries.push(entry);
            }
        }
        
        // 按类型和名称排序（文件夹在前）
        return entries.sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    },
    
    // 创建树节点
    async createTreeNode(entry, parentElement, level) {
        const entryPath = await this.getEntryPath(entry);
        const isExpanded = this.expandedFolders.has(entryPath);
        
        // 创建树节点容器
        const treeItem = document.createElement('div');
        treeItem.className = 'tree-item';
        treeItem.dataset.path = entryPath;
        treeItem.dataset.type = entry.kind;
        
        // 被选中文件高亮
        if (this.selectedFile && 
            entry.kind === 'file' && 
            entryPath === await this.getEntryPath(this.selectedFile)) {
            treeItem.classList.add('active');
        }
        
        // 创建悬停效果容器
        const hoverElement = document.createElement('div');
        hoverElement.className = 'tree-item-hover';
        treeItem.appendChild(hoverElement);
        
        // 添加缩进
        let html = '';
        for (let i = 0; i < level; i++) {
            html += '<div class="tree-indent"></div>';
        }
        
        // 根据类型添加内容
        if (entry.kind === 'directory') {
            // 文件夹节点
            html += `
                <div class="tree-expander ${isExpanded ? 'expanded' : ''}">
                    <i class="codicon codicon-chevron-right"></i>
                </div>
                <div class="tree-icon">
                    <i class="codicon ${isExpanded ? 'codicon-folder-opened' : 'codicon-folder'}"></i>
                </div>
                <div class="tree-label">${entry.name}</div>
            `;
            
            treeItem.innerHTML += html;
            parentElement.appendChild(treeItem);
            
            // 为展开/折叠图标添加单独的点击事件
            const expander = treeItem.querySelector('.tree-expander');
            if (expander) {
                expander.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.toggleFolder(entry, treeItem, level);
                });
            }
            
            // 为文件夹标签添加点击事件
            treeItem.addEventListener('click', async (e) => {
                // 如果点击的是展开图标，已经由上面的事件处理
                if (e.target.closest('.tree-expander')) return;
                
                // 否则，展开或折叠文件夹
                await this.toggleFolder(entry, treeItem, level);
            });
            
            // 双击事件 - 可实现展开所有子文件夹
            treeItem.addEventListener('dblclick', async (e) => {
                e.stopPropagation();
                await this.expandAllSubfolders(entry, treeItem, level);
            });
            
            // 如果已展开，则递归显示子项
            if (isExpanded) {
                const childContainer = document.createElement('div');
                childContainer.className = 'tree-children';
                parentElement.appendChild(childContainer);
                
                try {
                    // 获取子项
                    const childEntries = await this.getFolderEntries(entry);
                    
                    if (childEntries.length === 0) {
                        // 添加空文件夹提示
                        const emptyItem = document.createElement('div');
                        emptyItem.className = 'tree-item-empty';
                        emptyItem.textContent = '空文件夹';
                        childContainer.appendChild(emptyItem);
                    } else {
                        // 创建子项
                        for (const childEntry of childEntries) {
                            await this.createTreeNode(childEntry, childContainer, level + 1);
                        }
                    }
                    
                    // 添加展开的类以触发动画
                    setTimeout(() => {
                        childContainer.classList.add('expanded');
                    }, 10);
                    
                } catch (error) {
                    console.error('加载子文件夹失败:', error);
                    childContainer.innerHTML = `
                        <div class="tree-item-empty" style="color: #e51400;">
                            加载失败 - ${error.message || '未知错误'}
                        </div>
                    `;
                }
            }
            
        } else if (entry.kind === 'file') {
            // JSON文件节点
            html += `
                <div class="tree-expander"></div>
                <div class="tree-icon">
                    <i class="codicon codicon-json"></i>
                </div>
                <div class="tree-label">${entry.name}</div>
            `;
            
            treeItem.innerHTML += html;
            parentElement.appendChild(treeItem);
            
            // 添加点击事件来加载文件
            treeItem.addEventListener('click', async () => {
                await this.loadJsonFile(entry, treeItem);
            });
        }
    },
    
    // 切换文件夹展开/折叠状态
    async toggleFolder(folderHandle, folderElement, level) {
        const path = await this.getEntryPath(folderHandle);
        const isExpanded = this.expandedFolders.has(path);
        
        // 保存当前滚动位置
        const container = document.querySelector('.explorer-container');
        const scrollTop = container?.scrollTop || 0;
        
        // 更新展开状态
        if (isExpanded) {
            this.expandedFolders.delete(path);
            
            // 找到并移除子项容器
            let nextElement = folderElement.nextElementSibling;
            if (nextElement && nextElement.classList.contains('tree-children')) {
                nextElement.classList.remove('expanded');
                
                // 给动画一点时间，然后移除元素
                setTimeout(() => {
                    nextElement.remove();
                    
                    // 更新图标
                    const expander = folderElement.querySelector('.tree-expander');
                    const folderIcon = folderElement.querySelector('.codicon-folder-opened');
                    
                    if (expander) expander.classList.remove('expanded');
                    if (folderIcon) {
                        folderIcon.classList.remove('codicon-folder-opened');
                        folderIcon.classList.add('codicon-folder');
                    }
                }, 100);
            }
        } else {
            this.expandedFolders.add(path);
            
            // 创建子项容器
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-children';
            
            // 插入到当前元素之后
            folderElement.after(childContainer);
            
            try {
                // 更新图标
                const expander = folderElement.querySelector('.tree-expander');
                const folderIcon = folderElement.querySelector('.codicon-folder');
                
                if (expander) expander.classList.add('expanded');
                if (folderIcon) {
                    folderIcon.classList.remove('codicon-folder');
                    folderIcon.classList.add('codicon-folder-opened');
                }
                
                // 获取子项
                const childEntries = await this.getFolderEntries(folderHandle);
                
                if (childEntries.length === 0) {
                    // 添加空文件夹提示
                    const emptyItem = document.createElement('div');
                    emptyItem.className = 'tree-item-empty';
                    emptyItem.textContent = '空文件夹';
                    childContainer.appendChild(emptyItem);
                } else {
                    // 创建子项
                    for (const childEntry of childEntries) {
                        await this.createTreeNode(childEntry, childContainer, level + 1);
                    }
                }
                
                // 添加展开的类以触发动画
                setTimeout(() => {
                    childContainer.classList.add('expanded');
                }, 10);
                
            } catch (error) {
                console.error('加载子文件夹失败:', error);
                childContainer.innerHTML = `
                    <div class="tree-item-empty" style="color: #e51400;">
                        加载失败 - ${error.message || '未知错误'}
                    </div>
                `;
                
                // 如果失败，还原图标
                const expander = folderElement.querySelector('.tree-expander');
                const folderIcon = folderElement.querySelector('.codicon-folder-opened');
                
                if (expander) expander.classList.remove('expanded');
                if (folderIcon) {
                    folderIcon.classList.remove('codicon-folder-opened');
                    folderIcon.classList.add('codicon-folder');
                }
            }
        }
        
        // 恢复滚动位置
        setTimeout(() => {
            if (container) container.scrollTop = scrollTop;
        }, 50);
    },
    
    // 展开所有子文件夹（双击时触发）
    async expandAllSubfolders(folderHandle, folderElement, level) {
        // 先确保当前文件夹是展开的
        const path = await this.getEntryPath(folderHandle);
        const isExpanded = this.expandedFolders.has(path);
        
        if (!isExpanded) {
            await this.toggleFolder(folderHandle, folderElement, level);
        }
        
        // 查找所有子文件夹
        const childFolders = [];
        try {
            for await (const entry of folderHandle.values()) {
                if (entry.kind === 'directory') {
                    childFolders.push(entry);
                }
            }
            
            // 展开每个子文件夹
            for (const childFolder of childFolders) {
                const childPath = await this.getEntryPath(childFolder);
                this.expandedFolders.add(childPath);
            }
            
            // 重新渲染以应用更改
            if (childFolders.length > 0) {
                const childContainer = folderElement.nextElementSibling;
                if (childContainer && childContainer.classList.contains('tree-children')) {
                    childContainer.innerHTML = '';
                    
                    // 获取所有子条目
                    const childEntries = await this.getFolderEntries(folderHandle);
                    
                    // 重新创建子节点
                    for (const childEntry of childEntries) {
                        await this.createTreeNode(childEntry, childContainer, level + 1);
                    }
                }
            }
        } catch (error) {
            console.error('展开子文件夹失败:', error);
        }
    },
    
    // 加载JSON文件
    async loadJsonFile(fileHandle, fileElement) {
        try {
            // 添加加载指示器
            fileElement.classList.add('loading');
            const label = fileElement.querySelector('.tree-label');
            const originalText = label.textContent;
            label.innerHTML = `<span style="opacity: 0.7;">加载中...</span>`;
            
            // 更新选中状态
            document.querySelectorAll('.tree-item.active').forEach(el => {
                el.classList.remove('active');
            });
            fileElement.classList.add('active');
            
            // 保存当前选中的文件
            this.selectedFile = fileHandle;
            
            updateStatus(`正在加载: ${fileHandle.name}`);
            
            // 获取文件内容
            const file = await fileHandle.getFile();
            const content = await file.text();
            
            try {
                // 解析JSON
                const jsonData = JSON.parse(content);
                
                // 使用正确的API加载数据
                if (window.jsonEditor) {
                    window.jsonEditor.setJson(jsonData);
                }
                
                if (window.renderer) {
                    window.renderer.renderCADFromJson(jsonData);
                }
                
                // 恢复原始文本并移除加载状态
                label.textContent = originalText;
                fileElement.classList.remove('loading');
                
                updateStatus(`已加载: ${fileHandle.name}`);
                updateModelInfo(jsonData);
                
                // 添加到最近打开的文件（如果需要）
                this.addToRecentFiles(fileHandle);
            } catch (jsonError) {
                console.error('JSON解析失败:', jsonError);
                label.textContent = originalText;
                fileElement.classList.remove('loading');
                updateStatus(`无效的JSON文件: ${fileHandle.name}`);
            }
        } catch (error) {
            console.error('读取文件失败:', error);
            const label = fileElement.querySelector('.tree-label');
            if (label) label.textContent = fileElement.dataset.originalName || entry.name;
            fileElement.classList.remove('loading');
            updateStatus(`无法读取文件: ${fileHandle.name}`);
        }
    },
    
    // 添加到最近打开的文件列表
    addToRecentFiles(fileHandle) {
        // 此功能可以扩展为存储最近打开的文件
        // 例如可以存储在localStorage中
    },
    
    // 获取条目的唯一路径
    async getEntryPath(entry) {
        if (!entry) return '';
        return `${entry.kind}://${entry.name}`;
    }
};

// 辅助函数 - 将网格与边界同步
function syncGridWithBoundaries() {
    // 获取当前垂直限制
    const min = parseFloat(verticalMinInput?.value || 0);
    const gridSize = parseInt(gridSizeInput?.value || 100);
    
    // 更新网格位置到底部边界
    if (!isNaN(min) && !isNaN(gridSize)) {
        renderer.setGridConfig({
            position: { y: min }  // 将网格放在垂直最小值处
        });
    }
}

// 辅助函数 - 更新边界以匹配网格大小
function syncBoundariesWithGrid(gridSize) {
    if (!isNaN(gridSize)) {
        // 设置水平边界以匹配网格
        const halfSize = gridSize / 2;
        renderer.setDragLimits({ 
            horizontal: { 
                min: -halfSize, 
                max: halfSize 
            } 
        });
    
        // 如果边界框可见，重新绘制
        if (boundingBoxToggle && boundingBoxToggle.checked) {
            renderer.toggleBoundingBox(false);
            setTimeout(() => renderer.toggleBoundingBox(true), 50);
        }
    }
}

// 处理对象被移动事件
function handleObjectMoved(componentId, newPosition) {
    if (!currentModelData) return;
    
    // 检测是标准格式还是B-rep格式
    if (currentModelData.assembly && currentModelData.assembly.components) {
        // 标准格式
        handleStandardModelMoved(componentId, newPosition);
    } else if (currentModelData.parts) {
        // B-rep格式
        handleBRepModelMoved(componentId, newPosition);
    }
}

// 处理标准格式模型的移动
function handleStandardModelMoved(componentId, newPosition) {
    if (!currentModelData.assembly.components[componentId]) return;
    
    // 获取组件数据
    const component = currentModelData.assembly.components[componentId];
    
    // 更新组件的变换数据
    if (!component.transform) {
        component.transform = {
            translation: [0, 0, 0],
            rotation: [0, 0, 0]
        };
    }
    
    // 更新平移数据
    component.transform.translation = [
        newPosition.x,
        newPosition.y,
        newPosition.z
    ];
    
    // 更新模型信息显示
    updateModelInfo(currentModelData);
    
    updateStatus(`更新了组件 ${componentId} 的位置`);
}

// 处理B-rep格式模型的移动
function handleBRepModelMoved(componentId, newPosition) {
    // 在B-rep中查找部件
    const parts = currentModelData.parts;
    let found = false;
    
    for (const partKey in parts) {
        if (partKey === componentId) {
            const part = parts[partKey];
            
            // 确保存在坐标系统
            if (!part.coordinate_system) {
                part.coordinate_system = {
                    "Euler Angles": [0, 0, 0],
                    "Translation Vector": [0, 0, 0]
                };
            }
            
            // 更新平移向量
            part.coordinate_system["Translation Vector"] = [
                newPosition.x,
                newPosition.y,
                newPosition.z
            ];
            
            found = true;
            break;
        }
    }
    
    if (found) {
        // 更新模型信息显示
        updateBRepModelInfo(currentModelData);
        updateStatus(`更新了B-rep部件 ${componentId} 的位置`);
    }
}

// 初始化区块折叠功能
function initSectionToggle() {
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            section.classList.toggle('collapsed');
            
            // 保存折叠状态到本地存储
            const sectionId = section.querySelector('h3').textContent.trim();
            const isCollapsed = section.classList.contains('collapsed');
            saveSectionState(sectionId, isCollapsed);
        });
    });
    
    // 加载已保存的折叠状态
    loadSectionStates();
}

// 初始化形状选择器
function initShapeSelectors() {
    const shapeItems = document.querySelectorAll('.shape-item');
    const addShapeBtn = document.getElementById('addShapeBtn');
    
    shapeItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除其他选中项
            shapeItems.forEach(i => i.classList.remove('selected'));
            // 选中当前项
            item.classList.add('selected');
            // 保存选中的形状类型
            selectedShape = item.getAttribute('data-shape');
            // 启用添加按钮
            addShapeBtn.disabled = false;
        });
    });
}

// 添加选中的形状到场景
function addSelectedShapeToScene() {
    if (!selectedShape) return;
    
    updateStatus(`添加${getShapeName(selectedShape)}到场景`);
    
    const shapeFactory = new ShapeFactory();
    const mesh = shapeFactory.createShape(selectedShape);
    
    if (mesh) {
        // 将形状转换为CAD模型数据并合并到当前模型
        const shapeData = convertShapeToModelData(selectedShape);
        
        // 添加组件ID到网格对象
        mesh.userData.componentId = shapeData.componentId;
        
        // 将形状添加到场景
        renderer.addShapeToScene(mesh, shapeData.componentId);
        
        // 合并到当前模型
        mergeShapeIntoCurrentModel(shapeData);
        
        updateStatus(`已添加${getShapeName(selectedShape)}到场景，点击选择并拖拽箭头移动`);
    }
}

// 将形状转换为CAD模型数据
function convertShapeToModelData(shapeType) {
    // 生成唯一ID
    const componentId = Date.now().toString();
    
    // 基于形状类型创建不同的数据结构
    let component = {
        type: "extruded_sketch",
        sketch: {
            planes: ["XY"],
            contours: []
        },
        extrusion: {
            distance: 1,
            direction: [0, 0, 1]
        },
        transform: {
            translation: [0, 0, 0],
            rotation: [0, 0, 0]
        }
    };
    
    // 根据形状类型设置不同的轮廓
    switch (shapeType) {
        case 'box':
            component.sketch.contours.push({
                type: "rectangle",
                center: [0, 0],
                width: 5,
                height: 5
            });
            component.extrusion.distance = 5;
            component.transform.translation = [0, 2.5, 0];
            break;
            
        case 'sphere':
            component.sketch.contours.push({
                type: "circle",
                center: [0, 0],
                radius: 3
            });
            component.extrusion.distance = 6;
            component.transform.translation = [0, 3, 0];
            break;
            
        case 'cylinder':
            component.sketch.contours.push({
                type: "circle",
                center: [0, 0],
                radius: 2
            });
            component.extrusion.distance = 6;
            component.transform.translation = [0, 3, 0];
            break;
            
        case 'cone':
            // 为了简化，我们使用圆形底座，通过变换实现圆锥效果
            component.sketch.contours.push({
                type: "circle",
                center: [0, 0],
                radius: 3
            });
            component.extrusion.distance = 6;
            component.transform.translation = [0, 3, 0];
            break;
            
        case 'torus':
            // 为了简化，使用圆形
            component.sketch.contours.push({
                type: "circle",
                center: [0, 0],
                radius: 3
            });
            component.extrusion.distance = 1;
            component.transform.translation = [0, 3, 0];
            break;
            
        case 'pyramid':
            // 为了简化，使用矩形
            component.sketch.contours.push({
                type: "rectangle",
                center: [0, 0],
                width: 4,
                height: 4
            });
            component.extrusion.distance = 6;
            component.transform.translation = [0, 0, 0];
            break;
    }
    
    return {
        componentId: componentId,
        component: component
    };
}

// 将形状数据合并到当前模型
function mergeShapeIntoCurrentModel(shapeData) {
    if (!currentModelData) {
        // 如果当前没有模型，创建一个新的
        currentModelData = {
            assembly: {
                components: {}
            }
        };
    } else if (!currentModelData.assembly) {
        // 如果是B-rep格式，转换为标准格式
        currentModelData = {
            assembly: {
                components: {}
            }
        };
    }
    
    // 添加新组件到当前模型
    currentModelData.assembly.components[shapeData.componentId] = shapeData.component;
    
    // 更新模型信息
    updateModelInfo(currentModelData);
}

// 下载当前模型 - 优先使用JSONEditor内容
function downloadCurrentModel() {
    // 检查是否有JSONEditor内容
    let jsonContent = null;
    let sourceDescription = '';
    
    if (jsonEditor && typeof jsonEditor.getEditorContent === 'function') {
        const editorContent = jsonEditor.getEditorContent();
        if (editorContent && editorContent.trim()) {
            try {
                // 验证JSON格式
                JSON.parse(editorContent);
                jsonContent = editorContent;
                sourceDescription = 'JSON编辑器';
            } catch (e) {
                console.warn('编辑器内容不是有效的JSON，将使用当前模型数据:', e);
            }
        }
    }
    
    // 如果没有有效的编辑器内容，使用currentModelData
    if (!jsonContent) {
        if (!currentModelData) {
            updateStatus('没有可下载的模型');
            alert('当前没有加载任何模型或JSON编辑器为空，无法下载。');
            return;
        }
        
        // 使用当前模型数据
        jsonContent = JSON.stringify(currentModelData, null, 2);
        sourceDescription = '当前模型';
    }
    
    try {
        // 创建Blob对象
        const blob = new Blob([jsonContent], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 解析JSON获取模型名称
        let modelData;
        try {
            modelData = JSON.parse(jsonContent);
        } catch (e) {
            // 这不应该发生，因为我们之前已经验证过JSON
            modelData = {};
        }
        
        // 生成文件名：检测模型类型
        let fileName;
        if (modelData.final_name) {
            // B-rep格式
            fileName = `${modelData.final_name.replace(/\s+/g, '-')}-${Date.now()}.json`;
        } else {
            // 标准格式
            fileName = `cad-model-${Date.now()}.json`;
        }
        a.download = fileName;
        
        // 模拟点击下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        updateStatus(`${sourceDescription}内容已下载`);
    } catch (error) {
        console.error('下载模型时出错:', error);
        updateStatus('下载模型失败');
        alert('下载模型时发生错误: ' + error.message);
    }
}

// 加载示例模型
async function loadSampleModel() {
    updateStatus('加载示例模型');
    showLoading('加载示例模型...');
    updateProgress(20);
    
    try {
        // 从文件加载示例JSON
        const response = await fetch('data/sample.json');
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        updateProgress(60);
        const data = await response.json();
        currentModelData = data; // 保存模型数据
        renderer.renderCADFromJson(data);
        updateProgress(100);
        
        // 更新模型信息
        updateModelInfo(data);

        // 更新JSON编辑器内容
        if (jsonEditor) {
            jsonEditor.setJson(data);
        }
        
        updateStatus('示例模型已加载，点击模型查看控制手柄');
        setTimeout(hideLoading, 500);
    } catch (error) {
        console.error('加载示例模型失败:', error);
        updateStatus('加载示例模型失败');
        hideLoading();
    }
}

// 更新模型信息 - 处理标准格式
function updateModelInfo(data) {
    const modelInfoElement = document.getElementById('modelInfo');
    
    // 检测是否为B-rep格式
    if (data.final_name || data.parts) {
        updateBRepModelInfo(data);
        return;
    }
    
    if (!data || !data.assembly || !data.assembly.components) {
        modelInfoElement.innerHTML = '<p>无效模型数据</p>';
        return;
    }
    
    const components = data.assembly.components;
    const componentCount = Object.keys(components).length;
    
    let html = `
        <div class="model-info-item">
            <strong>模型类型:</strong> 标准CAD格式
        </div>
        <div class="model-info-item">
            <strong>组件数量:</strong> ${componentCount}
        </div>
    `;
    
    // 计算不同类型的轮廓
    let contourTypes = {
        rectangle: 0,
        circle: 0,
        polyline: 0
    };
    
    Object.values(components).forEach(component => {
        if (component.type === "extruded_sketch" && component.sketch && component.sketch.contours) {
            component.sketch.contours.forEach(contour => {
                if (contourTypes.hasOwnProperty(contour.type)) {
                    contourTypes[contour.type]++;
                }
            });
        }
    });
    
    html += `
        <div class="model-info-item">
            <strong>轮廓类型:</strong>
            <ul>
                <li>矩形: ${contourTypes.rectangle}</li>
                <li>圆形: ${contourTypes.circle}</li>
                <li>多段线: ${contourTypes.polyline}</li>
            </ul>
        </div>
    `;
    
    // 添加模型大小信息
    const jsonSize = JSON.stringify(data).length;
    const formattedSize = formatSize(jsonSize);
    
    html += `
        <div class="model-info-item">
            <strong>模型大小:</strong> ${formattedSize}
        </div>
    `;
    
    modelInfoElement.innerHTML = html;
}

// 更新B-rep模型信息
function updateBRepModelInfo(data) {
    const modelInfoElement = document.getElementById('modelInfo');
    
    // 检查B-rep数据是否有效
    if (!data || (!data.parts && !data.final_name)) {
        modelInfoElement.innerHTML = '<p>无效的B-rep模型数据</p>';
        return;
    }
    
    // 获取模型名称和描述
    const modelName = data.final_name || "未命名模型";
    const modelShape = data.final_shape || "";
    
    // 获取部件数量
    const parts = data.parts || {};
    const partsCount = Object.keys(parts).length;
    
    let html = `
        <div class="model-info-item">
            <strong>模型类型:</strong> B-rep格式
        </div>
        <div class="model-info-item">
            <strong>模型名称:</strong> ${modelName}
        </div>
    `;
    
    if (modelShape) {
        html += `
            <div class="model-info-item">
                <strong>模型描述:</strong> ${modelShape}
            </div>
        `;
    }
    
    html += `
        <div class="model-info-item">
            <strong>部件数量:</strong> ${partsCount}
        </div>
    `;
    
    // 分析面和轮廓
    let faceCount = 0;
    let loopCount = 0;
    let lineCount = 0;
    let arcCount = 0;
    
    // 遍历所有部件
    for (const partKey in parts) {
        const part = parts[partKey];
        if (part.sketch) {
            // 计算面数量
            const faces = Object.keys(part.sketch).filter(key => key.startsWith('face_'));
            faceCount += faces.length;
            
            // 计算循环和边数量
            faces.forEach(faceKey => {
                const face = part.sketch[faceKey];
                const loops = Object.keys(face).filter(key => key.startsWith('loop_'));
                loopCount += loops.length;
                
                loops.forEach(loopKey => {
                    const loop = face[loopKey];
                    lineCount += Object.keys(loop).filter(key => key.startsWith('line_')).length;
                    arcCount += Object.keys(loop).filter(key => key.startsWith('arc_')).length;
                });
            });
        }
    }
    
    html += `
        <div class="model-info-item">
            <strong>几何详情:</strong>
            <ul>
                <li>面: ${faceCount}</li>
                <li>环: ${loopCount}</li>
                <li>线段: ${lineCount}</li>
                <li>弧线: ${arcCount}</li>
            </ul>
        </div>
    `;
    
    // 添加模型大小信息
    const jsonSize = JSON.stringify(data).length;
    const formattedSize = formatSize(jsonSize);
    
    html += `
        <div class="model-info-item">
            <strong>模型大小:</strong> ${formattedSize}
        </div>
    `;
    
    modelInfoElement.innerHTML = html;
}

// 修改文件处理函数 - 在适当位置添加编辑器更新
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    updateStatus('正在读取文件');
    showLoading(`读取文件: ${file.name}`);
    updateProgress(10);
    
    reader.onload = function(e) {
        updateProgress(50);
        try {
            const data = JSON.parse(e.target.result);
            updateStatus('正在解析模型格式');
            updateProgress(60);
            
            // 检测JSON格式类型
            let modelType = "未知";
            if (data.assembly && data.assembly.components) {
                modelType = "标准CAD格式";
            } else if (data.parts || data.final_name) {
                modelType = "B-rep格式";
            } else {
                throw new Error("无法识别的模型格式");
            }
            
            updateStatus(`正在渲染${modelType}模型`);
            updateProgress(70);
            
            // 保存模型数据并渲染
            currentModelData = data;
            renderer.renderCADFromJson(data);
            
            // 更新模型信息 - 会自动判断格式
            updateModelInfo(data);
            
            // 更新JSON编辑器内容
            if (jsonEditor) {
                jsonEditor.setJson(data);
            }
            
            updateProgress(100);
            updateStatus(`${modelType}模型加载完成，点击模型查看控制手柄`);
            setTimeout(hideLoading, 500);
        } catch (error) {
            updateStatus('模型解析错误: ' + error.message);
            alert('模型解析错误: ' + error.message);
            hideLoading();
        }
    };
    
    reader.onerror = function() {
        updateStatus('文件读取错误');
        alert('文件读取错误!');
        hideLoading();
    };
    
    reader.readAsText(file);
}

// 从路径加载模型函数 保证点击之后会自动加载渲染好的cad模型
window.loadModelFromPath = function(path) {
    // 显示加载状态
    updateStatus('正在从服务器获取模型');
    showLoading(`加载模型: ${path.split('/').pop()}`);
    updateProgress(10);

    // 使用fetch从服务器获取文件
    fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`网络响应错误 (${response.status})`);
            }
            updateProgress(40);
            return response.json();
        })
        .then(data => {
            updateStatus('正在解析模型格式');
            updateProgress(60);
            
            // 检测JSON格式类型
            let modelType = "未知";
            if (data.assembly && data.assembly.components) {
                modelType = "标准CAD格式";
            } else if (data.parts || data.final_name) {
                modelType = "B-rep格式";
            } else {
                throw new Error("无法识别的模型格式");
            }
            
            updateStatus(`正在渲染${modelType}模型`);
            updateProgress(70);
            
            // 保存模型数据并渲染
            currentModelData = data;
            renderer.renderCADFromJson(data);
            
            // 更新模型信息 - 会自动判断格式
            updateModelInfo(data);
            
            // 更新JSON编辑器内容
            if (jsonEditor) {
                jsonEditor.setJson(data);
            }
            
            updateProgress(100);
            updateStatus(`${modelType}模型加载完成，点击模型查看控制手柄`);
            setTimeout(hideLoading, 500);
        })
        .catch(error => {
            updateStatus('模型加载错误: ' + error.message);
            console.error("模型加载错误:", error);
            alert('模型加载错误: ' + error.message);
            hideLoading();
        });
};

// 更新调整侧边栏大小的逻辑
function initResizableSidebar() {
    const appContainer = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar.right');
    const resizeHandle = document.getElementById('sidebarResizeHandle');
    const viewerContainer = document.querySelector('.viewer-container');
    
    let isResizing = false;
    let lastDownX = 0;
    let lastSidebarWidth = sidebar.offsetWidth;
    let overlay = null;
    
    // 初始状态可以从本地存储加载
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }
    
    // 创建覆盖层函数 - 在拖动时使用，防止文本选择等问题
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.className = 'resize-overlay';
        document.body.appendChild(overlay);
    }
    
    // 移除覆盖层函数
    function removeOverlay() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
        }
    }
    
    // 鼠标按下事件
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        lastDownX = e.clientX;
        lastSidebarWidth = sidebar.offsetWidth;
        
        // 添加活动状态样式
        resizeHandle.classList.add('active');
        
        // 创建覆盖层
        createOverlay();
        
        // 防止默认行为和文本选择
        e.preventDefault();
    });
    
    // 鼠标移动事件 - 添加到document上以允许在整个窗口拖动
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        // 计算新宽度 - 注意方向，因为手柄在左侧
        const containerWidth = appContainer.offsetWidth;
        const delta = lastDownX - e.clientX; // 反向计算，向左拖动增加宽度
        let newWidth = lastSidebarWidth + delta;
        
        // 限制宽度范围
        const minWidth = 250; // 最小宽度
        const maxWidth = Math.min(containerWidth * 0.6, window.innerWidth * 0.6); // 最大宽度
        
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        // 应用新宽度
        sidebar.style.width = `${newWidth}px`;
        
        // 调整渲染器大小（如果需要）
        if (window.renderer && window.renderer.updateSize) {
            window.renderer.updateSize();
        }
        
        // 防止任何默认行为
        e.preventDefault();
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            
            // 移除活动状态样式
            resizeHandle.classList.remove('active');
            
            // 移除覆盖层
            removeOverlay();
            
            // 保存侧边栏宽度到本地存储
            localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
            
            // 确保渲染器适应新的容器大小
            if (window.renderer && window.renderer.updateSize) {
                setTimeout(() => window.renderer.updateSize(), 100);
            }
        }
    });
    
    // 窗口调整大小时，确保侧边栏宽度不超过最大限制
    window.addEventListener('resize', function() {
        const maxWidth = Math.min(appContainer.offsetWidth * 0.6, window.innerWidth * 0.6);
        const currentWidth = sidebar.offsetWidth;
        
        if (currentWidth > maxWidth) {
            sidebar.style.width = `${maxWidth}px`;
            localStorage.setItem('sidebarWidth', maxWidth);
        }
        
        // 更新渲染器大小
        if (window.renderer && window.renderer.updateSize) {
            window.renderer.updateSize();
        }
    });
}
// 初始化应用
window.addEventListener('load', initApp);