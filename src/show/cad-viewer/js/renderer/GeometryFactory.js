import * as THREE from 'three';

export class GeometryFactory {
    constructor() {
        // 初始化
    }
    
    // 创建矩形
    createRectangle(contour, extrusion) {
        try {
            const { center, width, height } = contour;
            const distance = extrusion.distance || 1;
            
            // 创建矩形形状
            const shape = new THREE.Shape();
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            shape.moveTo(center[0] - halfWidth, center[1] - halfHeight);
            shape.lineTo(center[0] + halfWidth, center[1] - halfHeight);
            shape.lineTo(center[0] + halfWidth, center[1] + halfHeight);
            shape.lineTo(center[0] - halfWidth, center[1] + halfHeight);
            shape.closePath();
            
            // 创建挤压设置
            const extrudeSettings = {
                steps: 1,
                depth: distance,
                bevelEnabled: false
            };
            
            // 创建几何体和材质
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xB0C4DE,
                shininess: 100
            });
            
            // 旋转几何体使其垂直于XZ平面
            geometry.rotateX(Math.PI / 2);
            
            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            return mesh;
        } catch (error) {
            console.error('创建矩形时出错:', error);
            return null;
        }
    }
    
    // 创建圆形
    createCircle(contour, extrusion) {
        try {
            const { center, radius } = contour;
            const distance = extrusion.distance || 1;
            
            // 创建圆形形状
            const shape = new THREE.Shape();
            shape.absarc(center[0], center[1], radius, 0, Math.PI * 2, false);
            
            // 创建挤压设置
            const extrudeSettings = {
                steps: 1,
                depth: distance,
                bevelEnabled: false
            };
            
            // 创建几何体和材质
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xB0C4DE,
                shininess: 100 
            });
            
            // 旋转几何体使其垂直于XZ平面
            geometry.rotateX(Math.PI / 2);
            
            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            return mesh;
        } catch (error) {
            console.error('创建圆形时出错:', error);
            return null;
        }
    }
    
    // 创建多边形
    createPolyline(contour, extrusion) {
        try {
            const { points } = contour;
            const distance = extrusion.distance || 1;
            
            // 创建多边形形状
            const shape = new THREE.Shape();
            
            // 移动到第一个点
            shape.moveTo(points[0][0], points[0][1]);
            
            // 添加其余点
            for (let i = 1; i < points.length; i++) {
                shape.lineTo(points[i][0], points[i][1]);
            }
            
            // 闭合路径
            shape.closePath();
            
            // 创建挤压设置
            const extrudeSettings = {
                steps: 1,
                depth: distance,
                bevelEnabled: false
            };
            
            // 创建几何体和材质
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xB0C4DE,
                shininess: 100 
            });
            
            // 旋转几何体使其垂直于XZ平面
            geometry.rotateX(Math.PI / 2);
            
            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            return mesh;
        } catch (error) {
            console.error('创建多边形时出错:', error);
            return null;
        }
    }
    
    // 从B-rep格式创建几何体
    createFromBRep(sketchData, extrusion) {
        console.log('Processing B-rep format data:', { sketch: sketchData, extrusion });
        try {
            // 确保extrusion有效
            if (!extrusion) {
                extrusion = { 
                    extrude_depth_towards_normal: 1, 
                    sketch_scale: 1 
                };
            }
            
            return this.createFromComplexSketch(sketchData, extrusion);
        } catch (error) {
            console.error('B-rep处理错误:', error);
            throw error; // 重新抛出错误以便上层处理
        }
    }
    
    // 从复杂草图创建几何体 - 完整修复版本 (支持圆形)
    createFromComplexSketch(sketchData, extrusion) {
        // 调试输出
        console.log('处理复杂草图:', { sketchData, extrusion });
        
        try {
            // 创建一个网格组来存放所有面
            const group = new THREE.Group();
            group.isGroup = true;
            
            // 处理每个面
            for (const faceKey in sketchData) {
                const face = sketchData[faceKey];
                
                // 处理面中的每个环
                for (const loopKey in face) {
                    const loop = face[loopKey];
                    
                    // 检查环是否为空
                    if (Object.keys(loop).length === 0) {
                        console.warn(`跳过空环: ${faceKey}.${loopKey}`);
                        continue;
                    }
                    
                    // 特殊处理: 检查是否有circle元素
                    let hasCircle = false;
                    for (const elementKey in loop) {
                        if (elementKey.startsWith('circle_')) {
                            console.log('发现圆形元素:', elementKey, loop[elementKey]);
                            hasCircle = true;
                            
                            // 创建圆形形状
                            const circle = loop[elementKey];
                            const shape = new THREE.Shape();
                            const center = circle['Center'];
                            const radius = circle['Radius'];
                            
                            if (center && radius) {
                                // 创建一个完整的圆形
                                shape.absarc(center[0], center[1], radius, 0, Math.PI * 2, false);
                                
                                // 创建挤压设置
                                const extrudeSettings = {
                                    steps: 1,
                                    depth: extrusion.extrude_depth_towards_normal || 1,
                                    bevelEnabled: false
                                };
                                
                                try {
                                    // 创建几何体和材质
                                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                                    const material = new THREE.MeshPhongMaterial({ 
                                        color: 0xB0C4DE,
                                        shininess: 100 
                                    });
                                    
                                    // 应用缩放因子
                                    if (extrusion.sketch_scale && extrusion.sketch_scale !== 1) {
                                        const scaleFactor = extrusion.sketch_scale;
                                        
                                        // 使用矩阵缩放几何体
                                        const scaleMatrix = new THREE.Matrix4().makeScale(
                                            scaleFactor, 
                                            scaleFactor, 
                                            1
                                        );
                                        
                                        geometry.applyMatrix4(scaleMatrix);
                                        
                                        console.log(`应用缩放因子: ${scaleFactor}`);
                                    }
                                    
                                    // 旋转几何体使其垂直于XZ平面
                                    geometry.rotateX(Math.PI / 2);
                                    
                                    // 创建网格并添加到组
                                    const mesh = new THREE.Mesh(geometry, material);
                                    group.add(mesh);
                                    
                                    console.log('成功创建圆柱体');
                                } catch (error) {
                                    console.error('创建圆形几何体失败:', error);
                                }
                            } else {
                                console.warn('圆形元素缺少中心或半径');
                            }
                            
                            // 由于已处理圆形，不需要继续处理其他边
                            break;
                        }
                    }
                    
                    // 如果已处理圆形，则跳过线段和弧线处理
                    if (hasCircle) {
                        continue;
                    }
                    
                    // 创建新形状
                    const shape = new THREE.Shape();
                    
                    // 提取环的所有边
                    const edges = [];
                    for (const edgeKey in loop) {
                        const edge = loop[edgeKey];
                        
                        // 线段
                        if (edgeKey.startsWith('line_')) {
                            edges.push({
                                type: 'line',
                                startPoint: edge['Start Point'],
                                endPoint: edge['End Point'],
                                key: edgeKey
                            });
                        }
                        // 弧线
                        else if (edgeKey.startsWith('arc_')) {
                            edges.push({
                                type: 'arc',
                                startPoint: edge['Start Point'],
                                midPoint: edge['Mid Point'],
                                endPoint: edge['End Point'],
                                key: edgeKey
                            });
                        }
                    }
                    
                    // 检查是否有边
                    if (edges.length === 0) {
                        console.warn(`环中没有找到有效边: ${faceKey}.${loopKey}`);
                        continue;
                    }
                    
                    // 对边排序，确保它们连续
                    const sortedEdges = this.sortEdgesForContinuity(edges);
                    console.log('排序后的边:', sortedEdges);
                    
                    if (sortedEdges.length === 0) {
                        console.warn('无法创建连续路径');
                        continue;
                    }
                    
                    // 创建形状路径
                    let isFirst = true;
                    
                    for (const edge of sortedEdges) {
                        if (isFirst) {
                            // 首先移动到第一条边的起点
                            console.log('移动到起点:', edge.startPoint);
                            shape.moveTo(edge.startPoint[0], edge.startPoint[1]);
                            isFirst = false;
                        }
                        
                        // 根据边类型添加相应的路径段
                        if (edge.type === 'line') {
                            console.log('添加线段到:', edge.endPoint);
                            shape.lineTo(edge.endPoint[0], edge.endPoint[1]);
                        } 
                        else if (edge.type === 'arc') {
                            // 计算弧线参数
                            const arcParams = this.calculateArcParameters(
                                edge.startPoint, 
                                edge.midPoint, 
                                edge.endPoint
                            );
                            
                            if (arcParams) {
                                console.log('添加弧线:', arcParams);
                                shape.absarc(
                                    arcParams.center.x,
                                    arcParams.center.y,
                                    arcParams.radius,
                                    arcParams.startAngle,
                                    arcParams.endAngle,
                                    arcParams.counterclockwise
                                );
                            } else {
                                console.warn('无法计算弧线参数，使用直线代替');
                                shape.lineTo(edge.endPoint[0], edge.endPoint[1]);
                            }
                        }
                    }
                    
                    // 闭合路径之前确保至少有一个点
                    if (shape.curves.length > 0) {
                        // 尝试闭合路径 - 首尾相连
                        try {
                            console.log('闭合路径');
                            shape.closePath();
                        } catch (error) {
                            console.warn('闭合路径失败:', error);
                            // 如果闭合失败，手动添加一条回到起点的线段
                            const firstPoint = sortedEdges[0].startPoint;
                            shape.lineTo(firstPoint[0], firstPoint[1]);
                        }
                        
                        // 创建挤压设置
                        const extrudeSettings = {
                            steps: 1,
                            depth: extrusion.extrude_depth_towards_normal || 1,
                            bevelEnabled: false
                        };
                        
                        try {
                            // 创建几何体和材质
                            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                            const material = new THREE.MeshPhongMaterial({ 
                                color: 0xB0C4DE,
                                shininess: 100 
                            });
                            
                            // 应用缩放因子 - 正确方法
                            if (extrusion.sketch_scale && extrusion.sketch_scale !== 1) {
                                const scaleFactor = extrusion.sketch_scale;
                                
                                // 使用矩阵缩放几何体
                                const scaleMatrix = new THREE.Matrix4().makeScale(
                                    scaleFactor, 
                                    scaleFactor, 
                                    1
                                );
                                
                                geometry.applyMatrix4(scaleMatrix);
                                
                                console.log(`应用缩放因子: ${scaleFactor}`);
                            }
                            
                            // 旋转几何体使其垂直于XZ平面
                            geometry.rotateX(Math.PI / 2);
                            
                            // 创建网格并添加到组
                            const mesh = new THREE.Mesh(geometry, material);
                            group.add(mesh);
                        } catch (error) {
                            console.error('创建ExtrudeGeometry失败:', error);
                        }
                    } else {
                        console.warn('形状没有有效的曲线，跳过');
                    }
                }
            }
            
            // 检查是否生成了任何有效网格
            if (group.children.length === 0) {
                console.warn('未能从B-rep创建任何有效网格');
                
                // 创建一个简化替代模型作为回退方案
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.7,
                    wireframe: true
                });
                const fallbackMesh = new THREE.Mesh(geometry, material);
                fallbackMesh.scale.set(
                    extrusion.sketch_scale || 1,
                    extrusion.extrude_depth_towards_normal || 1,
                    extrusion.sketch_scale || 1
                );
                return fallbackMesh;
            }
            
            return group;
        } catch (error) {
            console.error('处理复杂草图时出错:', error);
            
            // 创建一个错误指示器网格
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            return new THREE.Mesh(geometry, material);
        }
    }
    
    // 对边排序以确保连续性
    sortEdgesForContinuity(edges) {
        if (edges.length === 0) return [];
        
        console.log('排序前的边:', edges);
        
        const sortedEdges = [edges[0]];
        const usedIndices = new Set([0]);
        
        // 当前活动边的终点
        let currentEndPoint = edges[0].endPoint;
        
        // 尝试找到连续的边
        while (sortedEdges.length < edges.length) {
            let foundNext = false;
            
            for (let i = 0; i < edges.length; i++) {
                if (usedIndices.has(i)) continue;
                
                const edge = edges[i];
                
                // 检查该边的起点是否与当前终点匹配
                if (this.pointsEqual(edge.startPoint, currentEndPoint)) {
                    sortedEdges.push(edge);
                    usedIndices.add(i);
                    currentEndPoint = edge.endPoint;
                    foundNext = true;
                    break;
                }
                // 或检查该边的终点是否与当前终点匹配（需要反转边）
                else if (this.pointsEqual(edge.endPoint, currentEndPoint)) {
                    // 创建反转的边
                    const reversedEdge = {
                        type: edge.type,
                        startPoint: [...edge.endPoint],
                        endPoint: [...edge.startPoint],
                        key: edge.key + '_reversed'
                    };
                    
                    // 如果是弧线，需要处理中点
                    if (edge.type === 'arc') {
                        reversedEdge.midPoint = [...edge.midPoint];
                    }
                    
                    sortedEdges.push(reversedEdge);
                    usedIndices.add(i);
                    currentEndPoint = reversedEdge.endPoint;
                    foundNext = true;
                    break;
                }
            }
            
            // 如果没有找到下一条边，说明路径不连续
            if (!foundNext) {
                console.warn('路径不连续，尝试添加剩余边');
                
                // 尝试添加剩余未使用的边
                for (let i = 0; i < edges.length; i++) {
                    if (!usedIndices.has(i)) {
                        sortedEdges.push(edges[i]);
                        usedIndices.add(i);
                        currentEndPoint = edges[i].endPoint;
                        break;
                    }
                }
                
                // 如果仍然没有找到新边，退出循环
                if (sortedEdges.length === usedIndices.size) {
                    break;
                }
            }
        }
        
        return sortedEdges;
    }
    
    // 检查两个点是否近似相等
    pointsEqual(p1, p2, tolerance = 1e-6) {
        if (!p1 || !p2) return false;
        if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
        if (p1.length < 2 || p2.length < 2) return false;
        
        return (
            Math.abs(p1[0] - p2[0]) < tolerance && 
            Math.abs(p1[1] - p2[1]) < tolerance
        );
    }
    
    // 计算弧线参数
    calculateArcParameters(startPoint, midPoint, endPoint) {
        try {
            if (!startPoint || !midPoint || !endPoint) return null;
            
            // 创建THREE.js向量
            const p1 = new THREE.Vector2(startPoint[0], startPoint[1]);
            const p2 = new THREE.Vector2(midPoint[0], midPoint[1]);
            const p3 = new THREE.Vector2(endPoint[0], endPoint[1]);
            
            // 找到三点确定的圆的中心
            const center = this.findCircleCenter(p1, p2, p3);
            if (!center) return null;
            
            // 计算半径
            const radius = center.distanceTo(p1);
            
            // 计算起始角和结束角
            const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
            const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
            
            // 确定弧线方向（顺时针或逆时针）
            // 计算从起点到终点的角度差
            let angleDiff = endAngle - startAngle;
            
            // 标准化到[-PI, PI]范围
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 检查中点是否在计算的弧上
            const midAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
            let angleBetween = this.isAngleBetween(startAngle, endAngle, midAngle);
            
            // 决定是否为逆时针
            const counterclockwise = angleBetween ? (angleDiff > 0) : (angleDiff < 0);
            
            return {
                center,
                radius,
                startAngle,
                endAngle,
                counterclockwise
            };
        } catch (error) {
            console.error('计算弧线参数出错:', error);
            return null;
        }
    }
    
    // 检查一个角度是否在两个角度之间
    isAngleBetween(startAngle, endAngle, testAngle) {
        // 标准化所有角度到[0, 2*PI]
        const normalizeAngle = (angle) => {
            while (angle < 0) angle += Math.PI * 2;
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            return angle;
        };
        
        const s = normalizeAngle(startAngle);
        const e = normalizeAngle(endAngle);
        const t = normalizeAngle(testAngle);
        
        // 处理跨越0度的情况
        if (s < e) {
            return t >= s && t <= e;
        } else {
            return t >= s || t <= e;
        }
    }
    
    // 找到三点确定的圆的中心
    findCircleCenter(p1, p2, p3) {
        try {
            // 检查点是否共线
            const area = Math.abs(
                (p1.x * (p2.y - p3.y) + 
                 p2.x * (p3.y - p1.y) + 
                 p3.x * (p1.y - p2.y)) / 2
            );
            
            // 如果面积接近零，点接近共线
            if (area < 1e-10) {
                console.warn('点共线，无法确定圆心');
                return null;
            }
            
            // 计算圆心 - 使用垂直平分线法
            // 中点
            const m1 = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
            const m2 = new THREE.Vector2().addVectors(p2, p3).multiplyScalar(0.5);
            
            // 垂直方向 (顺时针旋转90度)
            const dir1 = new THREE.Vector2(p2.y - p1.y, p1.x - p2.x).normalize();
            const dir2 = new THREE.Vector2(p3.y - p2.y, p2.x - p3.x).normalize();
            
            // 线性方程系统求解
            // m1 + t1*dir1 = m2 + t2*dir2
            // 消去t2: (m1 - m2 + t1*dir1) • dir2⊥ = 0
            // 其中dir2⊥是dir2的垂直向量
            const dir2perp = new THREE.Vector2(-dir2.y, dir2.x);
            const t1 = new THREE.Vector2().subVectors(m2, m1).dot(dir2perp) / dir1.dot(dir2perp);
            
            // 计算圆心
            const center = new THREE.Vector2().copy(m1).addScaledVector(dir1, t1);
            
            return center;
        } catch (error) {
            console.error('计算圆心出错:', error);
            return null;
        }
    }

    /**
     * 判断元素类型并提取相应的数据
     * @param {string} key - 元素的键名
     * @param {Object} element - 元素数据
     * @returns {Object|null} 处理后的元素数据或null
     */
    extractElementData(key, element) {
        // 处理线段
        if (key.startsWith('line_')) {
            return {
                type: 'line',
                startPoint: element['Start Point'],
                endPoint: element['End Point'],
                key: key
            };
        }
        // 处理弧线
        else if (key.startsWith('arc_')) {
            return {
                type: 'arc',
                startPoint: element['Start Point'],
                midPoint: element['Mid Point'],
                endPoint: element['End Point'],
                key: key
            };
        }
        // 处理圆形
        else if (key.startsWith('circle_')) {
            return {
                type: 'circle',
                center: element['Center'],
                radius: element['Radius'],
                key: key
            };
        }
        // 处理椭圆
        else if (key.startsWith('ellipse_')) {
            return {
                type: 'ellipse',
                center: element['Center'],
                majorAxis: element['Major Axis'],
                minorAxis: element['Minor Axis'],
                rotation: element['Rotation'] || 0,
                key: key
            };
        }
        // 处理样条曲线
        else if (key.startsWith('spline_')) {
            return {
                type: 'spline',
                controlPoints: element['Control Points'],
                key: key
            };
        }
        
        // 不支持的类型
        return null;
    }

    /**
     * 创建圆形
     * @param {Object} circleData - 圆形数据
     * @param {Object} extrusion - 挤压参数
     * @returns {THREE.Mesh} 生成的网格
     */
    createCircleMesh(circleData, extrusion) {
        const shape = new THREE.Shape();
        shape.absarc(
            circleData.center[0], 
            circleData.center[1], 
            circleData.radius, 
            0, 
            Math.PI * 2, 
            false
        );
        
        // 创建挤压设置
        const extrudeSettings = {
            steps: 1,
            depth: extrusion.extrude_depth_towards_normal || 1,
            bevelEnabled: false
        };
        
        // 创建几何体和材质
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xB0C4DE,
            shininess: 100 
        });
        
        // 应用缩放因子
        if (extrusion.sketch_scale && extrusion.sketch_scale !== 1) {
            const scaleFactor = extrusion.sketch_scale;
            
            // 使用矩阵缩放几何体
            const scaleMatrix = new THREE.Matrix4().makeScale(
                scaleFactor, 
                scaleFactor, 
                1
            );
            
            geometry.applyMatrix4(scaleMatrix);
        }
        
        // 旋转几何体使其垂直于XZ平面
        geometry.rotateX(Math.PI / 2);
        
        // 创建网格并返回
        return new THREE.Mesh(geometry, material);
    }
}