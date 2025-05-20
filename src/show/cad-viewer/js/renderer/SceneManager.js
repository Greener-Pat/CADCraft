import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GeometryFactory } from './GeometryFactory.js';
import { updateStatus } from '../utils/StatusManager.js';

export class SceneManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.container = renderer.container;
        this.scene = null;
        this.camera = null;
        this.threeRenderer = null;
        this.controls = null;
        this.axesHelper = null;
        this.gridHelper = null;
        this.boundingBox = null;
        this.cadObjects = [];
        this.geometryFactory = new GeometryFactory();
    }
    
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
        this.threeRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.threeRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.threeRenderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.threeRenderer.domElement);
        
        // 创建轨道控制器
        this.controls = new OrbitControls(this.camera, this.threeRenderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // 添加基础场景元素
        this.addLights();
        this.createGrid();
        this.createBoundingBox();
        
        // 添加坐标轴
        this.axesHelper = new THREE.AxesHelper(10);
        this.scene.add(this.axesHelper);
        
        // 添加测试立方体
        // this.addDebugCube();
        
        updateStatus('场景初始化完成');
    }
    
    // 更新场景
    update() {
        if (this.controls) this.controls.update();
    }
    
    // 渲染场景
    render() {
        if (this.threeRenderer && this.scene && this.camera) {
            this.threeRenderer.render(this.scene, this.camera);
        }

        // 添加这段: 更新Gizmo位置和可见性
        const selectedObject = this.renderer.selectionManager.getSelectedObject();
        if (selectedObject && this.renderer.controlsManager.gizmo) {
            this.renderer.controlsManager.updateGizmoPosition(selectedObject);
        }
    }
    
    // 添加灯光
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
    
    // 创建网格
    createGrid() {
        if (this.gridHelper) this.scene.remove(this.gridHelper);
        
        const { size, divisions, mainColor, secondaryColor } = this.renderer.gridConfig;
        this.gridHelper = new THREE.GridHelper(size, divisions, mainColor, secondaryColor);
        this.scene.add(this.gridHelper);
    }
    
    // 更新网格
    updateGrid() {
        this.createGrid();
        this.updateBoundingBox();
    }
    
    // 创建边界框
    createBoundingBox() {
        if (this.boundingBox) this.scene.remove(this.boundingBox);
        
        const { horizontal, vertical } = this.renderer.dragLimits;
        const width = horizontal.max - horizontal.min;
        const height = vertical.max - vertical.min;
        const depth = width; // 使用相同的宽度
        
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        boxGeometry.translate(0, height/2, 0);
        
        const edges = new THREE.EdgesGeometry(boxGeometry);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x2563eb, 
            transparent: true, 
            opacity: 0.3 
        });
        
        this.boundingBox = new THREE.LineSegments(edges, material);
        this.scene.add(this.boundingBox);
    }
    
    // 更新边界框
    updateBoundingBox() {
        this.createBoundingBox();
    }
    
    // 添加调试立方体
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
    
    // 更新尺寸（响应窗口大小变化）
    updateSize() {
        if (this.camera && this.threeRenderer) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.threeRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
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
        
        updateStatus('视图已重置');
    }
    
    // 切换线框模式
    toggleWireframe(enabled) {
        for (const obj of this.cadObjects) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.wireframe = enabled);
            } else if (obj.material) {
                obj.material.wireframe = enabled;
            }
        }
        
        updateStatus(enabled ? '已启用线框模式' : '已禁用线框模式');
    }
    
    // 切换坐标轴显示
    toggleAxes(enabled) {
        if (this.axesHelper) {
            this.axesHelper.visible = enabled;
        }
        
        updateStatus(enabled ? '已显示坐标轴' : '已隐藏坐标轴');
    }
    
    // 切换阴影显示
    toggleShadows(enabled) {
        if (this.threeRenderer) {
            this.threeRenderer.shadowMap.enabled = enabled;
        }
        
        for (const obj of this.cadObjects) {
            obj.castShadow = enabled;
            obj.receiveShadow = enabled;
        }
        
        this.scene.traverse(object => {
            if (object.isDirectionalLight || object.isSpotLight) {
                object.castShadow = enabled;
            }
        });
        
        updateStatus(enabled ? '已启用阴影' : '已禁用阴影');
    }
    
    // 切换边界框显示
    toggleBoundingBox(enabled) {
        if (this.boundingBox) {
            this.boundingBox.visible = enabled;
        }
    }
    
    // 清除所有CAD对象
    clearCADObjects() {
        for (const obj of this.cadObjects) {
            this.scene.remove(obj);
            
            // 释放资源
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
    
    // 添加对象到场景
    addObjectToScene(mesh, componentId) {
        if (!mesh) return null;
        
        // 保存组件ID
        if (componentId) {
            mesh.userData.componentId = componentId;
        }
        
        // 应用边界限制
        const { horizontal, vertical } = this.renderer.dragLimits;
        
        mesh.position.x = Math.max(horizontal.min, Math.min(horizontal.max, mesh.position.x));
        mesh.position.y = Math.max(vertical.min, Math.min(vertical.max, mesh.position.y));
        mesh.position.z = Math.max(horizontal.min, Math.min(horizontal.max, mesh.position.z));

        // 添加到场景和列表
        this.scene.add(mesh);
        this.cadObjects.push(mesh);
        
        return mesh;
    }
    
    // 渲染JSON数据 - 支持标准格式和B-rep格式
    renderFromJson(data) {
        updateStatus('清除现有模型，开始渲染');
        this.clearCADObjects();
        this.renderer.objectPartMap.clear();
        this.renderer.objectInitPosition.clear();
        
        // 检测JSON格式
        if (data.assembly && data.assembly.components) {
            // 标准格式
            this.renderStandardFormat(data);
        } else if (data.parts || data.final_name) {
            // B-rep格式
            this.renderBRepFormat(data);
        } else {
            updateStatus('无法识别的JSON格式');
            alert('无法识别的JSON格式！无法确定模型类型。');
            return;
        }
        
        // 重置视图
        this.resetView();
        
        updateStatus('CAD模型渲染完成');
        console.log('已生成的CAD对象:', this.cadObjects.length);
    }
    
    // 处理标准格式
    renderStandardFormat(data) {
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
                
                // 添加到场景
                this.addObjectToScene(mesh);
                
                updateStatus(`添加了${contour.type}组件`);
            }
        });
    }
    
    // 处理B-rep格式 - 新增方法
    renderBRepFormat(data) {
        const modelName = data.final_name || "未命名模型";
        updateStatus(`正在处理B-rep模型: ${modelName}`);
        
        // 遍历所有部件
        const parts = data.parts || {};
        let partIndex = 0;
        
        for (const partKey in parts) {
            partIndex++;
            const part = parts[partKey];
            
            updateStatus(`处理部件 ${partIndex}/${Object.keys(parts).length}: ${partKey}`);
            
            // 处理坐标系
            const coordSystem = part.coordinate_system || {};
            const transform = {
                rotation: coordSystem["Euler Angles"] || [0, 0, 0],
                translation: coordSystem["Translation Vector"] || [0, 0, 0]
            };
            
            // 处理部件中的所有面
            if (part.sketch) {
                this.processBRepSketch(part.sketch, part.extrusion, transform, partKey);
            }
        }
    }
    
    // 处理B-rep格式的草图 - 更强的位置调整
    processBRepSketch(sketch, extrusion, transform, componentId) {
        // 创建部件网格
        let mesh;
        try {
            // 使用GeometryFactory中的新方法处理B-rep数据
            mesh = this.geometryFactory.createFromBRep(sketch, extrusion);
            
            if (!mesh) {
                console.warn('无法从B-rep数据创建模型');
                updateStatus('无法从B-rep数据创建模型');
                return;
            }
            
            // 创建随机颜色
            const color = new THREE.Color(
                0.3 + Math.random() * 0.4,
                0.3 + Math.random() * 0.4,
                0.3 + Math.random() * 0.4
            );
            
            // 处理颜色 - 检查是否为组
            if (mesh.isGroup) {
                // 对组中的每个子对象应用颜色
                mesh.children.forEach(child => {
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.color = color);
                        } else {
                            child.material.color = color;
                        }
                    }
                });
            } else {
                // 单个对象
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.color = color);
                } else if (mesh.material) {
                    mesh.material.color = color;
                }
            }
            
            // 保存组件ID和其他数据
            this.renderer.objectPartMap.set(mesh.uuid, componentId);
            this.renderer.objectInitPosition.set(mesh.uuid, transform.translation);
            
            // 应用变换
            this.applyTransform(mesh, transform);
            
            // 添加全局比例因子 - 调整模型大小
            const globalScale = 1.0; // 调整此值可放大或缩小模型
            mesh.scale.set(globalScale, globalScale, globalScale);
            
            // 添加到场景
            this.addObjectToScene(mesh);
            
            updateStatus(`添加了B-rep模型: ${componentId}`);
        } catch (error) {
            console.error('处理B-rep模型出错:', error);
            updateStatus(`处理B-rep模型出错: ${error.message}`);
        }
    }
    
    // 应用变换
    applyTransform(mesh, transform) {
        if (!transform) return;
        
        // 应用平移
        if (transform.translation) {
            const tx = transform.translation[0] || 0;
            const ty = transform.translation[2] || 0;
            const tz = transform.translation[1] || 0;
            mesh.position.x += tx;
            mesh.position.y += ty;
            mesh.position.z += tz;
        }
        
        // 应用旋转
        if (transform.rotation) {
            const rx = (transform.rotation[0] || 0) * Math.PI / 180;
            const ry = (transform.rotation[2] || 0) * Math.PI / 180;
            const rz = (transform.rotation[1] || 0) * Math.PI / 180;
            
            mesh.rotation.x += rx;
            mesh.rotation.y += ry;
            mesh.rotation.z += rz;
        }

    }

    // 添加到SceneManager类
    saveCurrentCameraState() {
    if (!this.camera || !this.controls) return null;
    
    return {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
        quaternion: this.camera.quaternion.clone(),
        zoom: this.controls.zoom, 
        fov: this.camera.fov
    };
    }

    restoreCameraState(state) {
    if (!state || !this.camera || !this.controls) return;
    
    this.camera.position.copy(state.position);
    this.camera.quaternion.copy(state.quaternion);
    this.camera.fov = state.fov;
    this.camera.updateProjectionMatrix();
    
    this.controls.target.copy(state.target);
    
    if (typeof this.controls.zoom !== 'undefined') {
        this.controls.zoom = state.zoom;
    }
    
    this.controls.update();
    this.render();
    }
}