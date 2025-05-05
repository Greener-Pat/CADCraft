import * as THREE from 'three';

export class GeometryFactory {
    constructor() {}
    
    // 创建矩形
    createRectangle(contour, extrusion) {
        const width = contour.width;
        const height = contour.height;
        const depth = extrusion.distance;
        const center = contour.center;
        
        // 创建普通矩形
        const geometry = new THREE.BoxGeometry(width, height, depth);
        // 调整以匹配CAD坐标系
        geometry.rotateX(Math.PI / 2);
        
        // 创建材质
        const material = new THREE.MeshPhongMaterial({
            color: 0x00a0e0,
            shininess: 60,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 设置位置
        mesh.position.set(center[0], center[1], 0);
        
        return mesh;
    }
    
    // 创建圆
    createCircle(contour, extrusion) {
        const radius = contour.radius;
        const depth = extrusion.distance;
        const center = contour.center;
        
        // 创建圆柱体
        const geometry = new THREE.CylinderGeometry(radius, radius, depth, 32);
        // 调整以匹配CAD坐标系
        geometry.rotateX(Math.PI / 2);
        
        const material = new THREE.MeshPhongMaterial({
            color: 0x3399ff,
            shininess: 60,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 设置位置
        mesh.position.set(center[0], center[1], 0);
        
        return mesh;
    }
    
    // 创建多段线
    createPolyline(contour, extrusion) {
        // 简化处理，使用方块替代
        const material = new THREE.MeshPhongMaterial({
            color: 0x66cc88,
            shininess: 60,
            flatShading: false
        });
        
        const geometry = new THREE.BoxGeometry(5, 5, extrusion.distance);
        geometry.rotateX(Math.PI / 2);
        
        const mesh = new THREE.Mesh(geometry, material);
        
        return mesh;
    }

    // 在 CadRenderer 类中添加一个新方法用于添加形状到场景

    // 添加形状到场景
    addShapeToScene(mesh) {
        if (!mesh) return;
        
        // 添加到场景
        this.scene.add(mesh);
        
        // 添加到跟踪列表
        this.cadObjects.push(mesh);
        
        // 重置视图以适应新的对象
        this.resetView();
        
        return mesh;
    }
}