import * as THREE from 'three';
import { updateStatus } from '../utils/StatusManager.js';

export class ControlsManager {
    constructor(renderer) {
        this.renderer = renderer;
        
        // 控制手柄相关属性
        this.gizmo = null;
        this.arrowGroups = {
            x: null,
            y: null,
            z: null
        };
        
        // 拖拽相关属性
        this.isDragging = false;
        this.dragAxis = null;
        this.dragStartPosition = new THREE.Vector3();
        this.dragStartMousePosition = new THREE.Vector2();
        this.dragScale = 0.01; // 鼠标移动到对象移动的比例尺
        
        // 距离标签
        this.distanceLabel = document.createElement('div');
        this.setupDistanceLabel();
    }
    
    // 初始化
    init() {
        this.createGizmo();
    }
    
    // 创建实心箭头控制手柄
    createGizmo() {
        const scene = this.renderer.sceneManager.scene;
        
        // 如果已存在，先移除
        if (this.gizmo) {
            scene.remove(this.gizmo);
        }
        
        // 创建父组
        this.gizmo = new THREE.Group();
        this.gizmo.visible = false;
        
        // 箭头距离物体表面的距离
        const arrowOffset = 2.0; 
        // 箭头长度和大小
        const arrowHeadLength = 0.8;
        const arrowHeadWidth = 0.5;
        const stemLength = 1.5; 
        const stemRadius = 0.12;
        
        // 创建X轴箭头组 (红色)
        const xAxisGroup = new THREE.Group();
        
        // 创建X轴箭头杆
        const xStemGeometry = new THREE.CylinderGeometry(stemRadius, stemRadius, stemLength);
        const xStemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3333,
            metalness: 0.5, 
            roughness: 0.2
        });
        xStemGeometry.rotateZ(-Math.PI / 2);
        xStemGeometry.translate(arrowOffset + stemLength/2, 0, 0);
        const xStem = new THREE.Mesh(xStemGeometry, xStemMaterial);
        
        // 创建X轴箭头头部
        const xHeadGeometry = new THREE.ConeGeometry(arrowHeadWidth, arrowHeadLength, 8);
        const xHeadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3333,
            metalness: 0.5, 
            roughness: 0.2
        });
        xHeadGeometry.rotateZ(-Math.PI / 2);
        xHeadGeometry.translate(arrowOffset + stemLength + arrowHeadLength/2, 0, 0);
        const xHead = new THREE.Mesh(xHeadGeometry, xHeadMaterial);
        
        // 添加拖拽标识数据
        xStem.userData.dragAxis = 'x';
        xHead.userData.dragAxis = 'x';
        
        // 组合X轴部件
        xAxisGroup.add(xStem);
        xAxisGroup.add(xHead);
        xAxisGroup.name = 'xAxis';
        
        // 创建Y轴箭头组 (绿色)
        const yAxisGroup = new THREE.Group();
        
        // 创建Y轴箭头杆
        const yStemGeometry = new THREE.CylinderGeometry(stemRadius, stemRadius, stemLength);
        const yStemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x33ff33,
            metalness: 0.5, 
            roughness: 0.2
        });
        yStemGeometry.translate(0, arrowOffset + stemLength/2, 0);
        const yStem = new THREE.Mesh(yStemGeometry, yStemMaterial);
        
        // 创建Y轴箭头头部
        const yHeadGeometry = new THREE.ConeGeometry(arrowHeadWidth, arrowHeadLength, 8);
        const yHeadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x33ff33,
            metalness: 0.5, 
            roughness: 0.2
        });
        yHeadGeometry.translate(0, arrowOffset + stemLength + arrowHeadLength/2, 0);
        const yHead = new THREE.Mesh(yHeadGeometry, yHeadMaterial);
        
        // 添加拖拽标识数据
        yStem.userData.dragAxis = 'y';
        yHead.userData.dragAxis = 'y';
        
        // 组合Y轴部件
        yAxisGroup.add(yStem);
        yAxisGroup.add(yHead);
        yAxisGroup.name = 'yAxis';
        
        // 创建Z轴箭头组 (蓝色)
        const zAxisGroup = new THREE.Group();
        
        // 创建Z轴箭头杆
        const zStemGeometry = new THREE.CylinderGeometry(stemRadius, stemRadius, stemLength);
        const zStemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3333ff,
            metalness: 0.5, 
            roughness: 0.2
        });
        zStemGeometry.rotateX(Math.PI / 2);
        zStemGeometry.translate(0, 0, arrowOffset + stemLength/2);
        const zStem = new THREE.Mesh(zStemGeometry, zStemMaterial);
        
        // 创建Z轴箭头头部
        const zHeadGeometry = new THREE.ConeGeometry(arrowHeadWidth, arrowHeadLength, 8);
        const zHeadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3333ff,
            metalness: 0.5, 
            roughness: 0.2
        });
        zHeadGeometry.rotateX(Math.PI / 2);
        zHeadGeometry.translate(0, 0, arrowOffset + stemLength + arrowHeadLength/2);
        const zHead = new THREE.Mesh(zHeadGeometry, zHeadMaterial);
        
        // 添加拖拽标识数据
        zStem.userData.dragAxis = 'z';
        zHead.userData.dragAxis = 'z';
        
        // 组合Z轴部件
        zAxisGroup.add(zStem);
        zAxisGroup.add(zHead);
        zAxisGroup.name = 'zAxis';
        
        // 保存箭头组引用
        this.arrowGroups.x = xAxisGroup;
        this.arrowGroups.y = yAxisGroup;
        this.arrowGroups.z = zAxisGroup;
        
        // 将所有箭头添加到Gizmo组
        this.gizmo.add(xAxisGroup);
        this.gizmo.add(yAxisGroup);
        this.gizmo.add(zAxisGroup);
        
        // 添加到场景
        scene.add(this.gizmo);
        
        return this.gizmo;
    }
    
    // 设置距离标签
    setupDistanceLabel() {
        this.distanceLabel.className = 'distance-label';
        this.distanceLabel.style.position = 'absolute';
        this.distanceLabel.style.display = 'none';
        this.distanceLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.distanceLabel.style.color = 'white';
        this.distanceLabel.style.padding = '5px 10px';
        this.distanceLabel.style.borderRadius = '4px';
        this.distanceLabel.style.pointerEvents = 'none';
        this.distanceLabel.style.zIndex = '1000';
        this.distanceLabel.style.fontFamily = 'monospace';
        document.body.appendChild(this.distanceLabel);
    }
    
    // 开始拖拽
    startDrag(axis, object, mouseX, mouseY) {
        if (!object) return false;
        
        this.dragAxis = axis;
        this.isDragging = true;
        this.dragStartPosition.copy(object.position);
        this.dragStartMousePosition.set(mouseX, mouseY);
        
        // 禁用轨道控制器
        this.renderer.sceneManager.controls.enabled = false;
        
        // 显示距离标签
        this.showDistanceLabel(0, mouseX, mouseY);
        
        console.log(`开始沿${axis}轴拖拽`);
        return true;
    }
    
   // 更新拖拽 - 考虑相机视角的版本
    updateDrag(object, mouseX, mouseY) {
        if (!this.isDragging || !object || !this.dragAxis) return 0;
        
        // 获取相机
        const camera = this.renderer.sceneManager.camera;
        
        // 计算鼠标移动距离
        let mouseDelta = 0;
        
        // 创建表示当前拖拽轴的方向向量
        const axisVector = new THREE.Vector3();
        if (this.dragAxis === 'x') axisVector.set(1, 0, 0);
        else if (this.dragAxis === 'y') axisVector.set(0, 1, 0);
        else if (this.dragAxis === 'z') axisVector.set(0, 0, 1);
        
        // 将轴向量从世界坐标转换为屏幕坐标
        // 使用两点法：原点 + 轴向量
        const startPoint = object.position.clone();
        const endPoint = startPoint.clone().add(axisVector);
        
        // 将这两个点投影到屏幕上
        const startScreenPos = startPoint.clone().project(camera);
        const endScreenPos = endPoint.clone().project(camera);
        
        // 计算轴在屏幕上的方向向量
        const screenAxisVector = new THREE.Vector2(
            endScreenPos.x - startScreenPos.x,
            endScreenPos.y - startScreenPos.y
        ).normalize();
        
        // 计算鼠标移动向量
        const mouseMove = new THREE.Vector2(
            mouseX - this.dragStartMousePosition.x,
            -(mouseY - this.dragStartMousePosition.y) // 屏幕Y轴向下为正，需要反转
        );
        
        // 计算鼠标移动在轴方向上的投影长度(点积)
        mouseDelta = mouseMove.dot(screenAxisVector);
        
        // 应用缩放因子
        mouseDelta *= this.dragScale;
        
        // 计算新位置
        const newPosition = this.dragStartPosition.clone();
        
        // 应用移动距离
        newPosition[this.dragAxis] += mouseDelta;
        
        // 应用边界限制
        const { horizontal, vertical } = this.renderer.dragLimits;
        
        if (this.dragAxis === 'y') {
            // 垂直方向限制
            newPosition.y = Math.max(
                vertical.min,
                Math.min(vertical.max, newPosition.y)
            );
        } else {
            // 水平方向限制
            newPosition.x = Math.max(
                horizontal.min,
                Math.min(horizontal.max, newPosition.x)
            );
            newPosition.z = Math.max(
                horizontal.min,
                Math.min(horizontal.max, newPosition.z)
            );
        }
        
        // 更新对象位置
        object.position.copy(newPosition);
        
        // 更新控制手柄位置
        this.updateGizmoPosition(object);
        
        // 计算移动距离
        const distance = Math.abs(object.position[this.dragAxis] - this.dragStartPosition[this.dragAxis]);
        
        // 更新距离标签
        this.showDistanceLabel(distance, mouseX, mouseY);
        
        return distance;
    }
    
    // 修改 endDrag 方法，返回包含轴信息的结果对象，而不是直接返回距离
    endDrag(object) {
        if (!this.isDragging) return null;
        
        this.isDragging = false;
        
        // 如果有拖拽轴和对象
        if (this.dragAxis && object) {
            // 计算总移动距离
            const distance = Math.abs(
                object.position[this.dragAxis] - this.dragStartPosition[this.dragAxis]
            );
            
            // 保存当前拖拽轴信息
            const axis = this.dragAxis;
            
            // 通知对象被移动
            this.renderer.notifyObjectMoved(object);
            
            // 隐藏距离标签
            this.hideDistanceLabel();
            
            // 重新启用轨道控制器
            this.renderer.sceneManager.controls.enabled = true;
            
            // 重置拖拽相关属性
            this.dragAxis = null;
            
            // 返回包含轴信息和距离的对象
            return {
                axis: axis,
                distance: distance
            };
        }
        
        // 没有有效的拖拽或对象
        this.dragAxis = null;
        return null;
    }
    
    // 显示距离标签
    showDistanceLabel(distance, x, y) {
        if (!this.distanceLabel || !this.dragAxis) return;
        
        const formattedDistance = parseFloat(distance).toFixed(2);
        this.distanceLabel.textContent = `${this.dragAxis.toUpperCase()}: ${formattedDistance}`;
        this.distanceLabel.style.left = `${x + 15}px`;
        this.distanceLabel.style.top = `${y - 15}px`;
        this.distanceLabel.style.display = 'block';
        
        // 设置标签颜色
        const colors = {
            x: 'rgba(255, 0, 0, 0.8)',
            y: 'rgba(0, 255, 0, 0.8)',
            z: 'rgba(0, 0, 255, 0.8)'
        };
        this.distanceLabel.style.backgroundColor = colors[this.dragAxis];
    }
    
    // 隐藏距离标签
    hideDistanceLabel() {
        if (this.distanceLabel) {
            this.distanceLabel.style.display = 'none';
        }
    }
    
    // 显示控制手柄
    showGizmo(object) {
        if (!object) return;
        
        this.updateGizmoPosition(object);
        this.gizmo.visible = true;
    }
    
    // 隐藏控制手柄
    hideGizmo() {
        if (this.gizmo) {
            this.gizmo.visible = false;
        }
    }
    
    // 更新控制手柄位置
    updateGizmoPosition(object) {
        if (object && this.gizmo) {
            this.gizmo.position.copy(object.position);
        }
    }
    
    // 检查是否点击了箭头，返回轴向
    checkArrowIntersection(raycaster) {
        if (!this.gizmo || !this.gizmo.visible) return null;
        
        // 创建一个数组存放所有箭头部件
        const arrowParts = [];
        
        // 遍历gizmo的所有子组件，收集可点击的网格
        this.gizmo.traverse(child => {
            if (child.isMesh) {
                arrowParts.push(child);
            }
        });
        
        // 检测射线与箭头的交点
        const arrowIntersects = raycaster.intersectObjects(arrowParts);
        
        if (arrowIntersects.length > 0) {
            // 获取点击的箭头
            const clickedArrow = arrowIntersects[0].object;
            
            // 从箭头获取拖拽轴信息
            if (clickedArrow.userData.dragAxis) {
                return clickedArrow.userData.dragAxis;
            }
        }
        
        return null;
    }
}