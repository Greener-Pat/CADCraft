import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GeometryFactory } from './GeometryFactory.js';
import { updateStatus } from './utils.js';

export class CadRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.axesHelper = null;
        this.cadObjects = [];
        this.geometryFactory = new GeometryFactory();
        
        // 网格配置
        this.gridConfig = {
            size: 20,
            divisions: 20,
            mainColor: 0x888888,
            secondaryColor: 0xcccccc
        };
        
        // 拖拽范围配置
        this.dragLimits = {
            horizontal: {
                min: -this.gridConfig.size/2,
                max: this.gridConfig.size/2
            },
            vertical: {
                min: 0,
                max: 10
            }
        };
        
        // 拖拽相关属性
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.isDragging = false;
        this.dragStartPosition = new THREE.Vector3();
        this.currentAxis = null; // 'x', 'y', 'z' 或 null
        
        // 移动控制箭头
        this.arrowX = null; // X轴箭头
        this.arrowY = null; // Y轴箭头
        this.arrowZ = null; // Z轴箭头
        this.arrowGroup = null; // 箭头组
        
        // 边界可视化
        this.boundingBox = null;
        
        // 拖拽平面
        this.dragPlane = new THREE.Plane();
        
        // 距离标签
        this.distanceLabel = document.createElement('div');
        this.setupDistanceLabel();
        
        // 绑定事件处理函数，保持正确的 this 指向
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
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
    
    // 初始化渲染器
    async init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            60, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(20, 10, 20);
        this.camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // 创建轨道控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // 创建坐标轴
        this.axesHelper = new THREE.AxesHelper(10);
        this.scene.add(this.axesHelper);
        
        // 添加光照
        this.addLights();
        
        // 创建网格
        this.createGrid();
        
        // 创建边界框
        this.createBoundingBox();
        
        // 创建控制箭头
        this.createArrows();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 添加参考立方体
        this.addDebugCube();
        
        // 开始动画循环
        this.animate();
        
        updateStatus('场景初始化完成');
    }
    
    // 创建控制箭头
    createArrows() {
        // 如果已存在，先移除
        if (this.arrowGroup) {
            this.scene.remove(this.arrowGroup);
        }
        
        // 创建箭头组
        this.arrowGroup = new THREE.Group();
        this.arrowGroup.visible = false;
        
        // 箭头长度和尺寸
        const arrowLength = 5;
        const arrowHeadLength = 0.6;
        const arrowHeadWidth = 0.3;
        
        // X轴箭头 (红色)
        const directionX = new THREE.Vector3(1, 0, 0);
        this.arrowX = new THREE.ArrowHelper(
            directionX,
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            0xff0000,
            arrowHeadLength,
            arrowHeadWidth
        );
        this.arrowX.name = 'arrowX';
        this.arrowX.line.material.linewidth = 3;
        
        // Y轴箭头 (绿色)
        const directionY = new THREE.Vector3(0, 1, 0);
        this.arrowY = new THREE.ArrowHelper(
            directionY,
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            0x00ff00,
            arrowHeadLength,
            arrowHeadWidth
        );
        this.arrowY.name = 'arrowY';
        this.arrowY.line.material.linewidth = 3;
        
        // Z轴箭头 (蓝色)
        const directionZ = new THREE.Vector3(0, 0, 1);
        this.arrowZ = new THREE.ArrowHelper(
            directionZ,
            new THREE.Vector3(0, 0, 0),
            arrowLength,
            0x0000ff,
            arrowHeadLength,
            arrowHeadWidth
        );
        this.arrowZ.name = 'arrowZ';
        this.arrowZ.line.material.linewidth = 3;
        
        // 添加箭头到组
        this.arrowGroup.add(this.arrowX);
        this.arrowGroup.add(this.arrowY);
        this.arrowGroup.add(this.arrowZ);
        
        // 添加到场景
        this.scene.add(this.arrowGroup);
    }
    
    // 创建网格
    createGrid() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
        }
        
        this.gridHelper = new THREE.GridHelper(
            this.gridConfig.size,
            this.gridConfig.divisions,
            this.gridConfig.mainColor,
            this.gridConfig.secondaryColor
        );
        this.scene.add(this.gridHelper);
        
        // 更新拖拽范围
        this.updateDragLimits();
    }
    
    // 创建边界框
    createBoundingBox() {
        if (this.boundingBox) {
            this.scene.remove(this.boundingBox);
        }
        
        const boxWidth = this.dragLimits.horizontal.max - this.dragLimits.horizontal.min;
        const boxHeight = this.dragLimits.vertical.max - this.dragLimits.vertical.min;
        const boxDepth = this.dragLimits.horizontal.max - this.dragLimits.horizontal.min;
        
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        geometry.translate(0, boxHeight/2, 0);
        
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.3 });
        
        this.boundingBox = new THREE.LineSegments(edges, material);
        this.scene.add(this.boundingBox);
    }
    
    // 添加光照
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 1, 1);
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-1, 0.5, -1);
        this.scene.add(directionalLight2);
    }
    
    // 添加参考立方体
    addDebugCube() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, 0);
        this.scene.add(cube);
    }
    
    // 更新拖拽范围
    updateDragLimits() {
        this.dragLimits.horizontal.min = -this.gridConfig.size / 2;
        this.dragLimits.horizontal.max = this.gridConfig.size / 2;
    }
    
    // 设置网格配置
    setGridConfig(config) {
        Object.assign(this.gridConfig, config);
        this.createGrid();
        this.createBoundingBox();
    }
    
    // 设置拖拽限制
    setDragLimits(limits) {
        if (limits.horizontal) {
            Object.assign(this.dragLimits.horizontal, limits.horizontal);
        }
        if (limits.vertical) {
            Object.assign(this.dragLimits.vertical, limits.vertical);
        }
        this.createBoundingBox();
    }
    
    // 设置事件监听器
    setupEventListeners() {
        this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }
    
    // 鼠标按下事件处理
    handleMouseDown(event) {
        if (event.button !== 0) return; // 只处理左键点击
        
        // 计算鼠标位置
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 更新射线投射器
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 如果箭头可见，检查是否点击了箭头
        if (this.arrowGroup && this.arrowGroup.visible) {
            // 创建可检测对象列表
            const arrowObjects = [];
            this.arrowGroup.traverse(child => {
                if (child.type === 'Mesh' || child.type === 'Line') {
                    arrowObjects.push(child);
                }
            });
            
            // 检测射线与箭头的交点
            const arrowIntersects = this.raycaster.intersectObjects(arrowObjects, false);
            
            if (arrowIntersects.length > 0) {
                // 确定点击的是哪个箭头
                let arrow = arrowIntersects[0].object;
                while (arrow && !arrow.name) {
                    arrow = arrow.parent;
                }
                
                if (arrow) {
                    // 根据箭头名称设置当前操作轴
                    if (arrow.name === 'arrowX' || arrow.parent.name === 'arrowX') {
                        this.currentAxis = 'x';
                    } else if (arrow.name === 'arrowY' || arrow.parent.name === 'arrowY') {
                        this.currentAxis = 'y';
                    } else if (arrow.name === 'arrowZ' || arrow.parent.name === 'arrowZ') {
                        this.currentAxis = 'z';
                    }
                    
                    if (this.currentAxis) {
                        // 记录拖拽开始位置
                        this.dragStartPosition.copy(this.selectedObject.position);
                        
                        // 开始拖拽
                        this.isDragging = true;
                        
                        // 禁用轨道控制器
                        this.controls.enabled = false;
                        
                        // 根据当前操作轴设置拖拽平面
                        this.setupDragPlane();
                        
                        // 显示距离标签
                        this.updateDistanceLabel(0, event.clientX, event.clientY);
                        
                        console.log(`开始沿${this.currentAxis}轴拖拽`);
                        return;
                    }
                }
            }
        }
        
        // 如果没有点击箭头，检查是否点击了模型对象
        const objectIntersects = this.raycaster.intersectObjects(this.cadObjects, false);
        
        if (objectIntersects.length > 0) {
            this.selectObject(objectIntersects[0].object);
        } else {
            // 点击空白区域，取消选择
            this.clearSelection();
        }
    }

    // 设置拖拽平面 - 优化所有轴向
    setupDragPlane() {
        if (!this.currentAxis || !this.selectedObject) return;
        
        // 获取相机和对象位置
        const cameraPosition = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition);
        const objectPosition = this.selectedObject.position.clone();
        
        // 相机到对象的方向向量
        const viewVector = new THREE.Vector3().subVectors(cameraPosition, objectPosition).normalize();
        
        // 设置平面法线
        let normal = new THREE.Vector3();
        
        // 使用统一的方法处理所有轴向
        if (this.currentAxis === 'x') {
            // 创建一个垂直于X轴和相机视线的平面
            // 首先与X轴叉乘得到垂直于X轴的向量
            const perpToX = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), viewVector).normalize();
            
            // 再次叉乘得到同时垂直于X轴和第一个向量的法线
            normal.crossVectors(new THREE.Vector3(1, 0, 0), perpToX).normalize();
            
            // 确保法线有足够的X分量
            if (Math.abs(normal.x) < 0.3) {
                normal.x += normal.x < 0 ? -0.3 : 0.3;
                normal.normalize();
            }
        } 
        else if (this.currentAxis === 'y') {
            // 创建一个垂直于Y轴和相机视线的平面
            // 首先与Y轴叉乘得到垂直于Y轴的向量
            const perpToY = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), viewVector).normalize();
            
            // 再次叉乘得到同时垂直于Y轴和第一个向量的法线
            normal.crossVectors(new THREE.Vector3(0, 1, 0), perpToY).normalize();
            
            // 确保法线有足够的Y分量
            if (Math.abs(normal.y) < 0.3) {
                normal.y += normal.y < 0 ? -0.3 : 0.3;
                normal.normalize();
            }
        } 
        else if (this.currentAxis === 'z') {
            // 创建一个垂直于Z轴和相机视线的平面
            // 首先与Z轴叉乘得到垂直于Z轴的向量
            const perpToZ = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), viewVector).normalize();
            
            // 再次叉乘得到同时垂直于Z轴和第一个向量的法线
            normal.crossVectors(new THREE.Vector3(0, 0, 1), perpToZ).normalize();
            
            // 确保法线有足够的Z分量
            if (Math.abs(normal.z) < 0.3) {
                normal.z += normal.z < 0 ? -0.3 : 0.3;
                normal.normalize();
            }
        }
        
        // 调整法线方向，避免与视线几乎平行
        const dotWithView = normal.dot(viewVector);
        if (Math.abs(dotWithView) > 0.9) {
            // 如果法线与视线几乎平行，添加垂直分量
            normal.add(new THREE.Vector3(
                this.currentAxis !== 'x' ? 0.5 : 0,
                this.currentAxis !== 'y' ? 0.5 : 0,
                this.currentAxis !== 'z' ? 0.5 : 0
            )).normalize();
        }
        
        // 确保法线朝向相机
        if (normal.dot(viewVector) < 0) {
            normal.negate();
        }
        
        // 设置拖拽平面
        this.dragPlane.setFromNormalAndCoplanarPoint(normal, objectPosition);
        
        console.log(`创建${this.currentAxis}轴拖拽平面，法线:`, normal, "点积:", normal.dot(viewVector));
    }
    
    // 鼠标移动事件处理
    handleMouseMove(event) {
        // 如果没有在拖拽或没有选中对象，返回
        if (!this.isDragging || !this.selectedObject || !this.currentAxis) return;
        
        // 计算鼠标位置
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 更新射线
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 计算射线与拖拽平面的交点
        const intersectionPoint = new THREE.Vector3();
        const hasIntersection = this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint);
        
        if (hasIntersection) {
            // 计算新位置
            const newPosition = this.selectedObject.position.clone();
            
            // 只更新当前操作轴的坐标
            if (this.currentAxis === 'x') {
                newPosition.x = intersectionPoint.x;
            } else if (this.currentAxis === 'y') {
                newPosition.y = intersectionPoint.y;
            } else if (this.currentAxis === 'z') {
                newPosition.z = intersectionPoint.z;
            }
            
            // 应用边界限制
            if (this.currentAxis === 'y') {
                // 垂直方向限制
                newPosition.y = Math.max(
                    this.dragLimits.vertical.min,
                    Math.min(this.dragLimits.vertical.max, newPosition.y)
                );
            } else {
                // 水平方向限制
                newPosition.x = Math.max(
                    this.dragLimits.horizontal.min,
                    Math.min(this.dragLimits.horizontal.max, newPosition.x)
                );
                newPosition.z = Math.max(
                    this.dragLimits.horizontal.min,
                    Math.min(this.dragLimits.horizontal.max, newPosition.z)
                );
            }
            
            // 更新对象位置
            this.selectedObject.position.copy(newPosition);
            
            // 更新箭头位置
            this.updateArrowsPosition();
            
            // 计算移动距离
            const distance = Math.abs(this.selectedObject.position[this.currentAxis] - this.dragStartPosition[this.currentAxis]);
            
            // 更新距离标签
            this.updateDistanceLabel(distance, event.clientX, event.clientY);
            
            console.log(`正在沿${this.currentAxis}轴拖拽, 距离: ${distance.toFixed(2)}`);
        }
    }
    
    // 鼠标释放事件处理
    handleMouseUp() {
        if (this.isDragging && this.selectedObject) {
            // 结束拖拽
            this.isDragging = false;
            
            if (this.currentAxis) {
                // 计算总移动距离
                const distance = Math.abs(
                    this.selectedObject.position[this.currentAxis] - this.dragStartPosition[this.currentAxis]
                );
                
                // 通知移动完成
                updateStatus(`沿${this.currentAxis.toUpperCase()}轴移动了${distance.toFixed(2)}个单位`);
                this.onObjectMoved(this.selectedObject);
                
                // 重置当前轴
                this.currentAxis = null;
            }
            
            // 隐藏距离标签
            this.hideDistanceLabel();
        }
        
        // 重新启用轨道控制器
        this.controls.enabled = true;
    }
    
    // 更新距离标签
    updateDistanceLabel(distance, x, y) {
        if (!this.currentAxis) return;
        
        const formattedDistance = parseFloat(distance).toFixed(2);
        this.distanceLabel.textContent = `${this.currentAxis.toUpperCase()}: ${formattedDistance}`;
        this.distanceLabel.style.left = `${x + 15}px`;
        this.distanceLabel.style.top = `${y - 15}px`;
        this.distanceLabel.style.display = 'block';
        
        // 设置颜色
        const colors = {
            x: 'rgba(255, 0, 0, 0.8)',
            y: 'rgba(0, 255, 0, 0.8)',
            z: 'rgba(0, 0, 255, 0.8)'
        };
        this.distanceLabel.style.backgroundColor = colors[this.currentAxis];
    }
    
    // 隐藏距离标签
    hideDistanceLabel() {
        this.distanceLabel.style.display = 'none';
    }
    
    // 选择对象
    selectObject(object) {
        // 如果已经选中了该对象，不做任何操作
        if (this.selectedObject === object) return;
        
        // 先清除当前选择
        this.clearSelection();
        
        // 设置新的选中对象
        this.selectedObject = object;
        
        if (this.selectedObject) {
            // 保存原始材质
            if (this.selectedObject.material) {
                this.selectedObject.userData.originalMaterial = this.selectedObject.material.clone();
                
                // 高亮选中对象
                if (Array.isArray(this.selectedObject.material)) {
                    this.selectedObject.material.forEach(m => {
                        if (m.emissive) m.emissive.set(0x333333);
                    });
                } else if (this.selectedObject.material.emissive) {
                    this.selectedObject.material.emissive.set(0x333333);
                }
            }
            
            // 显示箭头并更新位置
            this.updateArrowsPosition();
            this.arrowGroup.visible = true;
            
            updateStatus(`已选择${this.selectedObject.userData.type || '对象'}`);
            console.log('已选择对象:', this.selectedObject);
        }
    }
    
    // 清除选择
    clearSelection() {
        if (this.selectedObject) {
            // 恢复原始材质
            if (this.selectedObject.userData.originalMaterial) {
                if (Array.isArray(this.selectedObject.material)) {
                    for (let i = 0; i < this.selectedObject.material.length; i++) {
                        this.selectedObject.material[i].copy(this.selectedObject.userData.originalMaterial[i]);
                    }
                } else {
                    this.selectedObject.material.copy(this.selectedObject.userData.originalMaterial);
                }
            }
            
            // 隐藏箭头
            this.arrowGroup.visible = false;
            
            // 清除引用
            this.selectedObject = null;
            
            updateStatus('已取消选择');
        }
    }
    
    // 更新箭头位置
    updateArrowsPosition() {
        if (this.selectedObject && this.arrowGroup) {
            this.arrowGroup.position.copy(this.selectedObject.position);
        }
    }
    
    // 对象移动回调
    onObjectMoved(object) {
        const componentId = object.userData.componentId;
        if (!componentId) return;
        
        // 通知外部组件
        if (this.onObjectMovedCallback) {
            this.onObjectMovedCallback(componentId, object.position);
        }
    }
    
    // 设置对象移动回调
    setObjectMovedCallback(callback) {
        this.onObjectMovedCallback = callback;
    }
    
    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // 窗口大小改变事件处理
    onWindowResize() {
        if (!this.container) return;
        
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    // 显示或隐藏坐标轴
    toggleAxes(visible) {
        if (this.axesHelper) {
            this.axesHelper.visible = visible;
        }
    }
    
    // 切换线框模式
    toggleWireframe(enabled) {
        for (const obj of this.cadObjects) {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.wireframe = enabled);
                } else {
                    obj.material.wireframe = enabled;
                }
            }
        }
    }
    
    // 切换阴影
    toggleShadows(enabled) {
        this.renderer.shadowMap.enabled = enabled;
        
        for (const obj of this.cadObjects) {
            obj.castShadow = enabled;
            obj.receiveShadow = enabled;
        }
        
        this.scene.traverse(object => {
            if (object.isDirectionalLight || object.isSpotLight) {
                object.castShadow = enabled;
            }
        });
    }
    
    // 显示或隐藏边界框
    toggleBoundingBox(visible) {
        if (this.boundingBox) {
            this.boundingBox.visible = visible;
        }
    }
    
    // 重置视图
    resetView() {
        if (this.controls) {
            this.controls.reset();
        }
        
        this.camera.position.set(20, 10, 20);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
    }
    
    // 清除CAD对象
    clearCADObjects() {
        // 清除当前选择
        this.clearSelection();
        
        for (const obj of this.cadObjects) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
        
        this.cadObjects = [];
    }
    
    // 渲染CAD模型
    renderCADFromJson(data) {
        // 清除当前选择和CAD对象
        this.clearSelection();
        this.clearCADObjects();
        
        updateStatus('清除现有模型，开始渲染');
        
        // 验证数据格式
        if (!data.assembly || !data.assembly.components) {
            updateStatus('无效的CAD JSON格式');
            alert('无效的CAD JSON格式！缺少assembly或components字段。');
            return;
        }
        
        const components = data.assembly.components;
        
        // 处理每个组件
        Object.keys(components).forEach((key, index) => {
            const component = components[key];
            updateStatus(`渲染组件 ${index+1}/${Object.keys(components).length}`);
            
            if (component.type === "extruded_sketch") {
                this.processExtrudedSketch(component, key);
            } else {
                console.warn(`不支持的组件类型: ${component.type}`);
                updateStatus(`不支持的组件类型: ${component.type}`);
            }
        });
        
        // 重置视图
        this.resetView();
        
        updateStatus('CAD模型渲染完成');
        console.log('已生成的CAD对象:', this.cadObjects.length);
    }
    
    // 处理挤压草图
    processExtrudedSketch(component, componentId) {
        const sketch = component.sketch;
        const extrusion = component.extrusion;
        const transform = component.transform || { translation: [0, 0, 0], rotation: [0, 0, 0] };
        
        sketch.contours.forEach((contour, index) => {
            let mesh;
            
            switch (contour.type) {
                case "rectangle":
                    mesh = this.geometryFactory.createRectangle(contour, extrusion);
                    break;
                case "circle":
                    mesh = this.geometryFactory.createCircle(contour, extrusion);
                    break;
                case "polyline":
                    if (contour.closed && contour.points && contour.points.length > 2) {
                        mesh = this.geometryFactory.createPolyline(contour, extrusion);
                    }
                    break;
                default:
                    console.warn(`不支持的轮廓类型: ${contour.type}`);
                    updateStatus(`不支持的轮廓类型: ${contour.type}`);
                    return;
            }
            
            if (mesh) {
                // 创建随机颜色
                const color = new THREE.Color(
                    0.3 + Math.random() * 0.4,
                    0.3 + Math.random() * 0.4,
                    0.3 + Math.random() * 0.4
                );
                
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.color = color);
                } else {
                    mesh.material.color = color;
                }
                
                // 保存组件ID和其他数据
                mesh.userData.componentId = componentId;
                mesh.userData.contourIndex = index;
                mesh.userData.type = contour.type;
                
                // 应用变换
                this.applyTransform(mesh, transform);
                
                // 添加到场景和跟踪列表
                this.scene.add(mesh);
                this.cadObjects.push(mesh);
                
                updateStatus(`添加了${contour.type}组件`);
            }
        });
    }
    
    // 应用变换
    applyTransform(mesh, transform) {
        if (!transform) return;
        
        // 应用平移
        if (transform.translation) {
            const tx = transform.translation[0] || 0;
            const ty = transform.translation[1] || 0;
            const tz = transform.translation[2] || 0;
            mesh.position.x += tx;
            mesh.position.y += ty;
            mesh.position.z += tz;
        }
        
        // 应用旋转
        if (transform.rotation) {
            const rx = (transform.rotation[0] || 0) * Math.PI / 180;
            const ry = (transform.rotation[1] || 0) * Math.PI / 180;
            const rz = (transform.rotation[2] || 0) * Math.PI / 180;
            
            mesh.rotation.x += rx;
            mesh.rotation.y += ry;
            mesh.rotation.z += rz;
        }
    }
    
    // 添加形状到场景
    addShapeToScene(mesh, componentId) {
        if (!mesh) return null;
        
        // 保存组件ID
        if (componentId) {
            mesh.userData.componentId = componentId;
        }
        
        // 应用边界限制
        mesh.position.x = Math.max(
            this.dragLimits.horizontal.min, 
            Math.min(this.dragLimits.horizontal.max, mesh.position.x)
        );
        
        mesh.position.y = Math.max(
            this.dragLimits.vertical.min, 
            Math.min(this.dragLimits.vertical.max, mesh.position.y)
        );
        
        mesh.position.z = Math.max(
            this.dragLimits.horizontal.min, 
            Math.min(this.dragLimits.horizontal.max, mesh.position.z)
        );
        
        // 添加到场景和跟踪列表
        this.scene.add(mesh);
        this.cadObjects.push(mesh);
        
        return mesh;
    }
}