import * as THREE from 'three';

export class ShapeFactory {
    constructor() {}
    
    // 创建不同类型的3D形状
    createShape(shapeType) {
        switch (shapeType) {
            case 'box':
                return this.createBox();
            case 'sphere':
                return this.createSphere();
            case 'cylinder':
                return this.createCylinder();
            case 'cone':
                return this.createCone();
            case 'torus':
                return this.createTorus();
            case 'pyramid':
                return this.createPyramid();
            default:
                console.warn(`未知的形状类型: ${shapeType}`);
                return null;
        }
    }
    
    // 创建长方体
    createBox() {
        const geometry = new THREE.BoxGeometry(5, 5, 5);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3b82f6,
            shininess: 60,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 2.5, 0);
        mesh.userData.type = 'box';
        
        return mesh;
    }
    
    // 创建球体
    createSphere() {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xec4899,
            shininess: 80,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 3, 0);
        mesh.userData.type = 'sphere';
        
        return mesh;
    }
    
    // 创建圆柱体
    createCylinder() {
        const geometry = new THREE.CylinderGeometry(2, 2, 6, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x8b5cf6,
            shininess: 70,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 3, 0);
        mesh.userData.type = 'cylinder';
        
        return mesh;
    }
    
    // 创建圆锥体
    createCone() {
        const geometry = new THREE.ConeGeometry(3, 6, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x22c55e,
            shininess: 70,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 3, 0);
        mesh.userData.type = 'cone';
        
        return mesh;
    }
    
    // 创建圆环
    createTorus() {
        const geometry = new THREE.TorusGeometry(3, 1, 16, 100);
        const material = new THREE.MeshPhongMaterial({
            color: 0xeab308,
            shininess: 70,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 3, 0);
        mesh.rotation.x = Math.PI / 2;
        mesh.userData.type = 'torus';
        
        return mesh;
    }
    
    // 创建金字塔
    createPyramid() {
        // 使用 BufferGeometry 手动创建金字塔
        const geometry = new THREE.BufferGeometry();
        
        // 顶点位置
        const vertices = new Float32Array([
            // 底面 - 矩形
            -2, 0, -2,
            2, 0, -2,
            2, 0, 2,
            -2, 0, 2,
            // 顶点
            0, 6, 0
        ]);
        
        // 面的索引
        const indices = [
            // 底面
            0, 1, 2,
            0, 2, 3,
            // 四个侧面
            0, 4, 1,
            1, 4, 2,
            2, 4, 3,
            3, 4, 0
        ];
        
        // 设置顶点位置属性
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        
        // 计算顶点法线
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
            color: 0xf97316,
            shininess: 70,
            flatShading: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);
        mesh.userData.type = 'pyramid';
        
        return mesh;
    }
}