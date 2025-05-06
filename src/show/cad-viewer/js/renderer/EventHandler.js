import * as THREE from 'three';
import { updateStatus } from '../utils/StatusManager.js';

export class EventHandler {
    constructor(renderer) {
        this.renderer = renderer;
        
        // 创建射线投射器
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 绑定事件处理函数
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }
    
    // 设置事件监听器
    setupEventListeners() {
        const domElement = this.renderer.sceneManager.threeRenderer.domElement;
        
        // 添加鼠标事件监听器
        domElement.addEventListener('mousedown', this.handleMouseDown, false);
        document.addEventListener('mousemove', this.handleMouseMove, false);
        document.addEventListener('mouseup', this.handleMouseUp, false);
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', () => this.renderer.onWindowResize(), false);
    }
    
    // 更新鼠标位置和射线
    updateMouseRaycaster(event) {
        const domElement = this.renderer.sceneManager.threeRenderer.domElement;
        const rect = domElement.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(
            this.mouse, 
            this.renderer.sceneManager.camera
        );
    }
    
    // 鼠标按下事件处理
    handleMouseDown(event) {
        if (event.button !== 0) return; // 只处理左键点击
        
        // 更新鼠标和射线位置
        this.updateMouseRaycaster(event);
        
        // 获取选中管理器和控制手柄管理器
        const selectionManager = this.renderer.selectionManager;
        const controlsManager = this.renderer.controlsManager;
        const selectedObject = selectionManager.getSelectedObject();
        
        // 如果有选中对象，检查是否点击了控制手柄
        if (selectedObject) {
            const dragAxis = controlsManager.checkArrowIntersection(this.raycaster);
            
            if (dragAxis) {
                // 开始拖拽
                controlsManager.startDrag(dragAxis, selectedObject, event.clientX, event.clientY);
                return;
            }
        }
        
        // 如果没有点击箭头，检查是否点击了对象
        const cadObjects = this.renderer.sceneManager.cadObjects;
        const objectIntersects = this.raycaster.intersectObjects(cadObjects);
        
        if (objectIntersects.length > 0) {
            selectionManager.selectObject(objectIntersects[0].object);
        } else {
            // 点击空白区域，取消选择
            selectionManager.clearSelection();
        }
    }
    
    // 鼠标移动事件处理
    handleMouseMove(event) {
        const controlsManager = this.renderer.controlsManager;
        const selectedObject = this.renderer.selectionManager.getSelectedObject();
        
        // 如果正在拖拽且有选中对象
        if (controlsManager.isDragging && selectedObject) {
            // 更新拖拽位置
            const distance = controlsManager.updateDrag(
                selectedObject, 
                event.clientX, 
                event.clientY
            );
            
            if (distance) {
                console.log(`正在沿${controlsManager.dragAxis}轴拖拽，距离: ${distance.toFixed(2)}`);
            }
        }
    }
    
    // 鼠标释放事件处理
    handleMouseUp() {
        const controlsManager = this.renderer.controlsManager;
        const selectedObject = this.renderer.selectionManager.getSelectedObject();
        
        // 如果正在拖拽且有选中对象
        if (controlsManager.isDragging && selectedObject) {
            // 获取当前拖拽轴 (在endDrag方法中会被置为null)
            const dragAxis = controlsManager.dragAxis;
            
            // 结束拖拽
            const dragResult = controlsManager.endDrag(selectedObject);
            
            if (dragResult && dragResult.distance > 0 && dragAxis) {
                updateStatus(`沿${dragAxis.toUpperCase()}轴移动了${dragResult.distance.toFixed(2)}个单位`);
            }
        }
    }
}