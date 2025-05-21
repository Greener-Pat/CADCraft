import { SceneManager } from './SceneManager.js';
import { ControlsManager } from './ControlsManager.js';
import { SelectionManager } from './SelectionManager.js';
import { EventHandler } from './EventHandler.js';
import { JsonEditor } from '../jsonEditor.js';

export class CadRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        // 初始化各个管理器
        this.jsonEditor = new JsonEditor();
        this.jsonEditor.setRenderer(this);
        this.sceneManager = new SceneManager(this);
        this.controlsManager = new ControlsManager(this, this.jsonEditor);
        this.selectionManager = new SelectionManager(this);
        this.eventHandler = new EventHandler(this);

        this.objectPartMap = new Map();
        this.objectInitPosition = new Map();
        
        // 配置属性和限制
        this.gridConfig = {
            size: 20,
            divisions: 20,
            mainColor: 0x888888,
            secondaryColor: 0xcccccc
        };
        
        this.dragLimits = {
            horizontal: { min: -this.gridConfig.size/2, max: this.gridConfig.size/2 },
            vertical: { min: 0, max: 10 }
        };
    }
    
    // 初始化方法，协调各模块的初始化
    async init() {
        // 初始化场景、相机、渲染器
        await this.sceneManager.init();
        
        // 初始化控制手柄
        this.controlsManager.init();
        
        // 设置事件监听器
        this.eventHandler.setupEventListeners();
        
        // 启动渲染循环
        this.animate();
        
        return this;
    }
    
    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        this.sceneManager.update();
        this.sceneManager.render();
    }
    
    // 设置对象移动回调
    setObjectMovedCallback(callback) {
        this.onObjectMovedCallback = callback;
    }
    
    // 通知对象被移动
    notifyObjectMoved(object) {
        if (this.onObjectMovedCallback && object.userData.componentId) {
            this.onObjectMovedCallback(object.userData.componentId, object.position);
        }
    }
    
    // 处理窗口大小变化
    onWindowResize() {
        this.sceneManager.updateSize();
    }
    
    // 公共接口方法
    resetView() { this.sceneManager.resetView(); }
    toggleWireframe(enabled) { this.sceneManager.toggleWireframe(enabled); }
    toggleAxes(enabled) { this.sceneManager.toggleAxes(enabled); }
    toggleShadows(enabled) { this.sceneManager.toggleShadows(enabled); }
    toggleBoundingBox(enabled) { this.sceneManager.toggleBoundingBox(enabled); }
    
    // 设置配置
    setGridConfig(config) {
        Object.assign(this.gridConfig, config);
        this.sceneManager.updateGrid();
    }
    
    setDragLimits(limits) {
        if (limits.horizontal) Object.assign(this.dragLimits.horizontal, limits.horizontal);
        if (limits.vertical) Object.assign(this.dragLimits.vertical, limits.vertical);
        this.sceneManager.updateBoundingBox();
    }
    
    // 渲染CAD模型
    renderCADFromJson(data) {
        // 清除当前选择
        this.selectionManager.clearSelection();
        
        // 清除现有对象
        this.sceneManager.clearCADObjects();
        
        // 处理新数据
        this.sceneManager.renderFromJson(data);
    }
    
    // 添加形状到场景
    addShapeToScene(mesh, componentId) {
        return this.sceneManager.addObjectToScene(mesh, componentId);
    }

    /**
     * 渲染B-rep格式的CAD模型
     * @param {Object} data - B-rep格式的JSON对象
     */
    renderBRepModel(data) {
        try {
            // 直接使用SceneManager来处理B-rep格式
            this.sceneManager.renderFromJson(data);
            console.log('B-rep模型渲染成功');
            return true;
        } catch (error) {
            console.error('B-rep模型渲染失败:', error);
            updateStatus('B-rep模型渲染失败: ' + error.message);
            return false;
        }
    }

    
    // 通过对象查找partId的辅助方法
    getPartIdFromObject(object) {
        if (!object) return null;
        
        // 直接从对象的userData查找
        if (object.userData && object.userData.partId) {
            return object.userData.partId;
        }
        
        // 从映射表中查找
        if (this.objectPartMap.has(object.uuid)) {
            return this.objectPartMap.get(object.uuid);
        }
        
        // 递归查找父对象
        if (object.parent) {
            return this.getPartIdFromObject(object.parent);
        }
        
        return null;
    }

    getInitialPosition(object) {
        if (object && this.objectInitPosition.has(object.uuid)) {
            return this.objectInitPosition.get(object.uuid);
        }
        // 递归查找父对象
        if (object.parent) {
            return this.getInitialPosition(object.parent);
        }
        return null;
    }
}