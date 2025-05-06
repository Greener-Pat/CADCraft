import { CadRenderer } from './renderer/CadRenderer.js';
import { updateStatus, showLoading, hideLoading, updateProgress } from './utils/StatusManager.js';
import { toggleTheme, loadThemePreference, saveSectionState, loadSectionStates, formatSize, getShapeName } from './utils/Utils.js';
import { ShapeFactory } from './renderer/ShapeFactory.js';

// 全局变量
let renderer;
let currentModelData = null;
let selectedShape = null;

// 初始化应用
async function initApp() {
    console.log('初始化应用');
    updateStatus('初始化应用');
    
    
    // 设置当前时间和用户名
    document.getElementById('currentTime').textContent = '2025-05-05 14:32:40';
    document.getElementById('username').textContent = 'eFlerin';
    
    // 创建CAD渲染器实例
    renderer = new CadRenderer('container');
    
    // 设置对象移动回调
    renderer.setObjectMovedCallback(handleObjectMoved);
    
    // 将渲染器保存到全局变量，以便主题管理工具能够访问
    window.renderer = renderer;
    
    // 加载主题首选项
    loadThemePreference();
    
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
            if (size >= 10 && size <= 100) {
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
                if (min >= 0 && min < max) {
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
    if (!currentModelData || !componentId) return;
    
    // 获取组件数据
    const component = currentModelData.assembly.components[componentId];
    if (!component) return;
    
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
        a.download = `cad-model-${Date.now()}.json`;
        
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

// 更新模型信息
function updateModelInfo(data) {
    const modelInfoElement = document.getElementById('modelInfo');
    if (!data || !data.assembly || !data.assembly.components) {
        modelInfoElement.innerHTML = '<p>无效模型数据</p>';
        return;
    }
    
    const components = data.assembly.components;
    const componentCount = Object.keys(components).length;
    
    let html = `
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

// 处理文件上传
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
            updateStatus('正在渲染CAD模型');
            updateProgress(70);
            
            currentModelData = data; // 保存模型数据
            renderer.renderCADFromJson(data);
            
            // 更新模型信息
            updateModelInfo(data);
            
            updateProgress(100);
            updateStatus('模型加载完成，点击模型查看控制手柄');
            setTimeout(hideLoading, 500);
        } catch (error) {
            updateStatus('JSON解析错误: ' + error.message);
            alert('JSON解析错误: ' + error.message);
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

// 初始化应用
window.addEventListener('load', initApp);