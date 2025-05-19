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
    
    // 添加事件监听器 - 边界框和网格设置 (检查元素是否存在再添加)
    const boundingBoxToggle = document.getElementById('boundingBoxToggle');
    if (boundingBoxToggle) {
        boundingBoxToggle.addEventListener('change', (e) => renderer.toggleBoundingBox(e.target.checked));
    }
    
    const gridSizeInput = document.getElementById('gridSizeInput');
    if (gridSizeInput) {
        gridSizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            if (size >= 0 && size <= 10000) {
                renderer.setGridConfig({ size: size });
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
                if (min >= -10000 && min < max) {
                    renderer.setDragLimits({ vertical: { min: min } });
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
                if (max > min && max <= 50) {
                    renderer.setDragLimits({ vertical: { max: max } });
                }
            }
        });
    }
    
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
    
    // 自动加载示例模型
    setTimeout(loadSampleModel, 500);
    
    updateStatus('初始化完成');
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

// 下载当前模型
function downloadCurrentModel() {
    if (!currentModelData) {
        updateStatus('没有可下载的模型');
        alert('当前没有加载任何模型，无法下载。');
        return;
    }
    
    try {
        // 转换为JSON字符串
        const jsonStr = JSON.stringify(currentModelData, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名：检测模型类型
        let fileName;
        if (currentModelData.final_name) {
            // B-rep格式
            fileName = `${currentModelData.final_name.replace(/\s+/g, '-')}-${Date.now()}.json`;
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
        
        updateStatus('模型已下载');
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