import * as THREE from 'three';
import { updateStatus } from '../utils/StatusManager.js';

export class ControlsManager {
    constructor(renderer, jsonEditor) {
        this.renderer = renderer;
        this.jsonEditor = jsonEditor;
        
        this.gizmoLast = new Map();
        this.currentDragPartId = null;

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
        this.dragStartObjPosition = new THREE.Vector3();
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
    
    // 创建浮动控制手柄
    createGizmo() {
        const scene = this.renderer.sceneManager.scene;
        
        // 如果已存在，先移除
        if (this.gizmo) {
            scene.remove(this.gizmo);
        }
        
        // 创建父组
        this.gizmo = new THREE.Group();
        this.gizmo.visible = false;
        
        // 悬浮距离 - 确保控制点在模型表面之外
        const floatDistance = 0.5;
        
        // 圆锥体尺寸
        const coneRadius = 0.25;
        const coneHeight = 0.5;
        const segments = 16;
        
        // 创建X轴控制点 (红色)
        const xConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, segments);
        const xConeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.9,
            depthTest: false  // 确保始终渲染在最前面
        });
        
        // 旋转和定位X轴圆锥
        xConeGeometry.rotateZ(-Math.PI / 2);
        xConeGeometry.translate(floatDistance, 0, 0);
        const xCone = new THREE.Mesh(xConeGeometry, xConeMaterial);
        xCone.renderOrder = 999; // 优先渲染
        xCone.userData.dragAxis = 'x';
        
        // 创建Y轴控制点 (绿色)
        const yConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, segments);
        const yConeMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        
        // 定位Y轴圆锥
        yConeGeometry.translate(0, floatDistance, 0);
        const yCone = new THREE.Mesh(yConeGeometry, yConeMaterial);
        yCone.renderOrder = 999;
        yCone.userData.dragAxis = 'y';
        
        // 创建Z轴控制点 (蓝色)
        const zConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, segments);
        const zConeMaterial = new THREE.MeshBasicMaterial({
            color: 0x3333ff,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });
        
        // 旋转和定位Z轴圆锥
        zConeGeometry.rotateX(Math.PI / 2);
        zConeGeometry.translate(0, 0, floatDistance);
        const zCone = new THREE.Mesh(zConeGeometry, zConeMaterial);
        zCone.renderOrder = 999;
        zCone.userData.dragAxis = 'z';
        
        // 添加细线连接物体中心与控制点
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        
        // X轴线
        const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(floatDistance * 0.8, 0, 0)
        ]);
        const xLine = new THREE.Line(xLineGeometry, lineMaterial.clone());
        xLine.material.color.set(0xff3333);
        
        // Y轴线
        const yLineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, floatDistance * 0.8, 0)
        ]);
        const yLine = new THREE.Line(yLineGeometry, lineMaterial.clone());
        yLine.material.color.set(0x33ff33);
        
        // Z轴线
        const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, floatDistance * 0.8)
        ]);
        const zLine = new THREE.Line(zLineGeometry, lineMaterial.clone());
        zLine.material.color.set(0x3333ff);
        
        // 将所有元素添加到gizmo组
        this.gizmo.add(xCone);
        this.gizmo.add(yCone);
        this.gizmo.add(zCone);
        this.gizmo.add(xLine);
        this.gizmo.add(yLine);
        this.gizmo.add(zLine);
        
        // 添加到场景
        scene.add(this.gizmo);
        
        // 保存引用
        this.controlPoints = {
            x: xCone,
            y: yCone,
            z: zCone
        };
        
        return this.gizmo;
    }

    // 智能调整Gizmo尺寸
    updateGizmoScale(object) {
        if (!this.gizmo || !object) return;
        
        // 计算模型尺寸
        let objectSize = 1;
        if (object.geometry) {
            // 如果有几何体，计算其尺寸
            object.geometry.computeBoundingBox();
            const size = new THREE.Vector3();
            object.geometry.boundingBox.getSize(size);
            objectSize = Math.max(size.x, size.y, size.z);
        }
        
        // 根据模型尺寸和相机距离调整Gizmo大小
        const camera = this.renderer.sceneManager.camera;
        const distance = camera.position.distanceTo(object.position);
        
        // 基础大小 + 模型尺寸影响 + 距离影响
        const baseScale = 0.5;
        const modelFactor = objectSize * 0.2;
        const distanceFactor = distance * 0.02;
        
        const finalScale = baseScale + modelFactor + distanceFactor;
        
        // 应用缩放
        this.gizmo.scale.set(finalScale, finalScale, finalScale);
    }

    // 确保控制点始终可见（来自相机方向的调整）
    updateGizmoVisibility(object) {
        if (!this.gizmo || !this.controlPoints || !object) return;
        
        // 获取相机和对象位置
        const camera = this.renderer.sceneManager.camera;
        const cameraPosition = camera.position.clone();
        const objectPosition = object.position.clone();
        
        // 计算相机到对象的方向向量
        const cameraToObject = new THREE.Vector3().subVectors(objectPosition, cameraPosition).normalize();
        
        // 调整控制点可见性 - 当与相机方向接近平行时隐藏
        // X轴控制点
        const xAxis = new THREE.Vector3(1, 0, 0);
        const xDot = Math.abs(xAxis.dot(cameraToObject));
        this.controlPoints.x.visible = xDot < 0.9; // 当相机视线接近与X轴平行时降低可见性
        
        // Y轴控制点
        const yAxis = new THREE.Vector3(0, 1, 0);
        const yDot = Math.abs(yAxis.dot(cameraToObject));
        this.controlPoints.y.visible = yDot < 0.9;
        
        // Z轴控制点
        const zAxis = new THREE.Vector3(0, 0, 1);
        const zDot = Math.abs(zAxis.dot(cameraToObject));
        this.controlPoints.z.visible = zDot < 0.9;
    }

    // 更新Gizmo位置和尺寸
    updateGizmoPosition(object) {
        if (!this.gizmo || !object) return;
        
        // 更新位置
        if (!this.gizmoLast.has(object.uuid)) {
            object.updateMatrix();
            object.updateMatrixWorld(true);
            const translateVector = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
            this.gizmoLast.set(object.uuid, translateVector.clone().add(object.position));
            // console.log('object position is', object);
        }
        this.gizmo.position.copy(this.gizmoLast.get(object.uuid));

        // 更新尺寸
        this.updateGizmoScale(object);
        
        // 更新可见性
        this.updateGizmoVisibility(object);
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
        this.dragStartPosition.copy(this.gizmoLast.get(object.uuid) || object.postion);
        this.dragStartObjPosition.copy(object.position);
        this.dragStartMousePosition.set(mouseX, mouseY);

        const partId = this.renderer.getPartIdFromObject(object);

        // 如果找到部件ID并且有JsonEditor，则跳转
        if (partId && this.renderer.jsonEditor) {
            console.log(`选中部件: ${partId}`);
            this.renderer.jsonEditor.scrollToPartId(partId);
        }
        
        // 禁用轨道控制器
        this.renderer.sceneManager.controls.enabled = false;
        
        // 显示距离标签
        this.showDistanceLabel(0, mouseX, mouseY);
        
        console.log(`开始沿${axis}轴拖拽`);
        return true;
    }
    
    // 更新拖拽 - 分离对象和箭头的计算
    updateDrag(object, mouseX, mouseY) {
        if (!this.isDragging || !object || !this.dragAxis) return 0;
        
        // 获取相机
        const camera = this.renderer.sceneManager.camera;
        
        // 创建表示当前拖拽轴的方向向量
        const axisVector = new THREE.Vector3();
        if (this.dragAxis === 'x') axisVector.set(1, 0, 0);
        else if (this.dragAxis === 'y') axisVector.set(0, 1, 0);
        else if (this.dragAxis === 'z') axisVector.set(0, 0, 1);
        
        // 将轴向量从世界坐标转换为屏幕坐标
        const startPoint = this.dragStartPosition.clone();
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
        let mouseDelta = mouseMove.dot(screenAxisVector) * this.dragScale;

        const gizmoNewPosition = startPoint.clone();
        gizmoNewPosition[this.dragAxis] += mouseDelta;
        
        // 应用边界限制
        const { horizontal, vertical } = this.renderer.dragLimits;
        
        // 箭头边界限制
        gizmoNewPosition.y = Math.max(vertical.min, Math.min(vertical.max, gizmoNewPosition.y));
        gizmoNewPosition.x = Math.max(horizontal.min, Math.min(horizontal.max, gizmoNewPosition.x));
        gizmoNewPosition.z = Math.max(horizontal.min, Math.min(horizontal.max, gizmoNewPosition.z));

        // 修正移动幅度
        mouseDelta = gizmoNewPosition[this.dragAxis] - startPoint[this.dragAxis];
        
        // 创建世界轴移动向量
        const worldMoveVector = new THREE.Vector3();
        if (this.dragAxis === 'x') worldMoveVector.set(mouseDelta, 0, 0);
        else if (this.dragAxis === 'y') worldMoveVector.set(0, mouseDelta, 0);
        else if (this.dragAxis === 'z') worldMoveVector.set(0, 0, mouseDelta);
        
        // 获取对象的旋转矩阵
        object.updateMatrixWorld(true);
        const rotationMatrix = new THREE.Matrix4().extractRotation(object.matrixWorld);

        // 清理逆天浮点数
        for (let i = 0; i < 16; i++) {
            if (Math.abs(rotationMatrix.elements[i]) < 1e-10)
                rotationMatrix.elements[i] = 0;
        }

        // 选择旋转矩阵的3x3子矩阵
        const rotationMatrix3 = new THREE.Matrix3().setFromMatrix4(rotationMatrix);
        const inverseRotationMatrix = rotationMatrix3.clone().invert();
        
        // 将世界移动向量转换为对象局部空间中的移动向量
        const localMoveVector = worldMoveVector.clone().applyMatrix3(inverseRotationMatrix);

        // 计算对象的新位置 - 使用原始位置加上局部移动向量
        const objectNewPosition = this.dragStartObjPosition.clone().add(localMoveVector);

        this.updatePartTranslation(object);
        
        // 更新对象位置
        object.position.copy(objectNewPosition);

        // 直接更新箭头位置，不使用updateGizmoPosition避免其他处理
        if (this.gizmo) {
            this.gizmo.position.copy(gizmoNewPosition.clone());
            this.gizmoLast.set(object.uuid, gizmoNewPosition.clone());
        }
        
        // 计算实际移动距离
        const distance = localMoveVector.length();
        
        // 更新距离标签
        this.showDistanceLabel(distance, mouseX, mouseY);
        
        return distance;
    }
    
    // 结束拖拽 - 保持箭头在世界坐标系位置
    endDrag(object) {
        if (!this.isDragging) return null;
        
        this.isDragging = false;
        
        // 如果有拖拽轴和对象
        if (this.dragAxis && object) {
            // 计算开始位置和当前位置之间的距离
            const distance = this.dragStartPosition.distanceTo(object.position);
            
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

    // 清理资源方法
    dispose() {
        this.gizmoLast.clear();
        console.log('控制管理器已销毁');
    }

    // 【新增】更新JSON中部件的Translation Vector
    updatePartTranslation(object) {
        // 确保有JSON编辑器和对象
        if (!this.jsonEditor || !object || !this.dragAxis) return;
        
        try {
            // 节流更新 - 避免每一个微小移动都更新
            if (this._jsonUpdateTimeout) {
                clearTimeout(this._jsonUpdateTimeout);
            }
            
            this._jsonUpdateTimeout = setTimeout(() => {
                // 获取当前编辑器内容
                const jsonContent = this.jsonEditor.getEditorContent();
                const jsonData = JSON.parse(jsonContent);
                
                // 获取部件ID - 通常存储在userData中
                const partId =  this.renderer.getPartIdFromObject(object);
        
                // 在parts对象中查找匹配的部件
                if (jsonData.parts) {
                    // 遍历parts查找匹配项
                    let found = false;
                    let partKey = '';
                    
                    if (jsonData.parts[partId]) {
                        partKey = partId;
                        found = true;
                    }
                    
                    // 如果找到匹配部件，更新其Translation Vector
                    if (found && partKey) {
                        const part = jsonData.parts[partKey];
                        
                        // 确保有coordinate_system字段
                        if (!part.coordinate_system) {
                            part.coordinate_system = {};
                        }
                        if (!part.coordinate_system["Translation Vector"]) {
                            part.coordinate_system["Translation Vector"] = [0.0, 0.0, 0.0];
                        }
                        
                        // 更新特定轴的值
                        const axisIndex = {x: 0, y: 2, z: 1}[this.dragAxis];
                        const InitPosition = this.renderer.getInitialPosition(object);
                        const roundedValue = Math.round((object.position[this.dragAxis] + InitPosition[axisIndex]) * 1000) / 1000;

                        // 只在值有变化时更新
                        if (Math.abs(roundedValue - part.coordinate_system["Translation Vector"][axisIndex]) >= 1e-6) {
                                part.coordinate_system["Translation Vector"][axisIndex] = roundedValue;
                            
                            // 更新编辑器内容
                            this.updateJsonEditor(jsonData);

                        }
                    } else {
                        console.log('未找到与此对象匹配的部件:', object);
                    }
                }
            }, 50); // 50ms防抖
        } catch (error) {
            console.warn('更新JSON Translation Vector失败:', error);
        }
    }

    // 【新增】更新JSON编辑器
    updateJsonEditor(jsonData) {
        if (!this.jsonEditor) return;
        
        try {
            // 格式化JSON
            const formattedJson = JSON.stringify(jsonData, null, 2);
            
            // 暂存滚动位置
            const scrollInfo = this.jsonEditor.editor.getScrollInfo();
            
            // 静默更新编辑器内容
            this.jsonEditor.editor.operation(() => {
                this.jsonEditor.editor.setValue(formattedJson);
                this.jsonEditor.editor.scrollTo(scrollInfo.left, scrollInfo.top);
            });
        } catch (error) {
            console.warn('更新JSON编辑器失败:', error);
        }
    }
}