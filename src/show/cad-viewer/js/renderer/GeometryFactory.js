import * as THREE from 'three';
import * as THREEMeshBVH from 'three-mesh-bvh';
import * as CSG  from 'three-bvh-csg';

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
        // console.log('Processing B-rep format data:', { sketch: sketchData, extrusion });
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
    
   
    // 从复杂草图创建几何体 - 修正版本
    createFromComplexSketch(sketchData, extrusion) {
        // 调试输出
        console.log('处理复杂草图:', { sketchData, extrusion });
        
        try {
            // 创建一个网格组来存放所有面
            const group = new THREE.Group();
            group.isGroup = true;
            
            // 【新增】用于存储所有顶点坐标的数组
            let allVertices = [];
            
            // 处理每个面
            for (const faceKey in sketchData) {
                const face = sketchData[faceKey];
                const loopKeys = Object.keys(face);
                
                if (loopKeys.length === 0) continue;
                
                console.log(`处理面 ${faceKey} 的 ${loopKeys.length} 个环`);
                
                // 检查是否有特殊形状 - 圆锥体
                let hasCone = false;
                
                for (const loopKey of loopKeys) {
                    const loop = face[loopKey];
                    
                    // 检查循环中是否有cone_前缀的键
                    const coneKey = Object.keys(loop).find(key => key.startsWith('cone_'));
                    
                    if (coneKey) {
                        hasCone = true;
                        const coneData = loop[coneKey];
                        console.log(`检测到圆锥/圆柱体: ${coneKey}`, coneData);
                        
                        // 创建圆锥/圆柱体
                        const coneMesh = this.createConeFromData(coneData, extrusion);
                        if (coneMesh) {
                            // 【新增】收集圆锥体的顶点
                            coneMesh.geometry.computeBoundingBox();
                            const coneCenter = new THREE.Vector3();
                            coneMesh.geometry.boundingBox.getCenter(coneCenter);
                            allVertices.push(coneCenter);
                            
                            group.add(coneMesh);
                            console.log('成功创建圆锥/圆柱体');
                        }
                        break; // 找到一个圆锥就处理完毕
                    }
                }
                
                // 如果这个面已经作为圆锥处理，继续下一个面
                if (hasCone) continue;
                
                // 如果只有一个环（无孔洞），直接处理
                if (loopKeys.length === 1) {
                    const loop = face[loopKeys[0]];
                    const shape = this.createShapeFromLoop(loop);
                    
                    if (shape) {
                        const mesh = this.createExtrudedMesh(shape, extrusion);
                        if (mesh) {
                            // 【新增】收集网格的顶点
                            mesh.geometry.computeBoundingBox();
                            const meshCenter = new THREE.Vector3();
                            mesh.geometry.boundingBox.getCenter(meshCenter);
                            allVertices.push(meshCenter);
                            
                            group.add(mesh);
                        }
                    }
                    continue;
                }
                
                // 处理有孔洞的情况 - 使用 CSG
                // 1. 创建主体
                const mainLoop = face[loopKeys[0]];
                const mainShape = this.createShapeFromLoop(mainLoop);
                
                if (!mainShape) {
                    console.warn(`面 ${faceKey} 没有有效的主边界`);
                    continue;
                }
                
                // 创建主体挤压体
                const mainExtrudeSettings = {
                    steps: 1,
                    depth: extrusion.extrude_depth_towards_normal,
                    bevelEnabled: false
                };
                
                const mainGeometry = new THREE.ExtrudeGeometry(mainShape, mainExtrudeSettings);
                this.applyTransforms(mainGeometry, extrusion);
                
                // 【新增】收集主体几何体顶点
                mainGeometry.computeBoundingBox();
                const mainCenter = new THREE.Vector3();
                mainGeometry.boundingBox.getCenter(mainCenter);
                allVertices.push(mainCenter);
                
                // 创建主体网格
                const mainMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xB0C4DE,
                    shininess: 100
                });
                let resultMesh = new THREE.Mesh(mainGeometry, mainMaterial);
                
                // 2. 处理每个孔洞 - 执行布尔减法
                for (let i = 1; i < loopKeys.length; i++) {
                    const holeLoop = face[loopKeys[i]];
                    const holeShape = this.createShapeFromLoop(holeLoop);
                    
                    if (!holeShape) continue;
                    
                    // 创建孔洞挤压体 - 稍微增大确保完全穿透
                    const holeExtrudeSettings = {
                        steps: 1,
                        depth: extrusion.extrude_depth_towards_normal * 1.00, // 轻微增大
                        bevelEnabled: false
                    };
                    
                    const holeGeometry = new THREE.ExtrudeGeometry(holeShape, holeExtrudeSettings);
                    this.applyTransforms(holeGeometry, extrusion);
                    
                    // 创建临时孔洞网格
                    const holeMaterial = new THREE.MeshBasicMaterial();
                    const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);
                    
                    // 执行 CSG 布尔减法
                    try {
                        console.log(`对孔洞 ${i} 执行 CSG 布尔减法`);
                        resultMesh = this.performCSGOperation(resultMesh, holeMesh);
                    } catch (error) {
                        console.error(`CSG 操作失败:`, error);
                    }
                }
                
                // 添加最终网格到组
                if (resultMesh) {
                    // 【新增】收集结果网格的顶点
                    resultMesh.geometry.computeBoundingBox();
                    const resultCenter = new THREE.Vector3();
                    resultMesh.geometry.boundingBox.getCenter(resultCenter);
                    allVertices.push(resultCenter);
                    
                    group.add(resultMesh);
                    console.log(`成功创建带有 ${loopKeys.length - 1} 个孔洞的 CSG 网格`);
                }
            }
            
            // 检查是否生成了任何有效网格
            if (group.children.length === 0) {
                console.warn('未能从B-rep创建任何有效网格');
                return this.createFallbackMesh(extrusion);
            }
            
            // 【新增】计算所有顶点的平均位置作为group的position
            if (allVertices.length > 0) {
                const centerPosition = new THREE.Vector3();
                
                // 计算所有中心点的平均值
                allVertices.forEach(vertex => {
                    centerPosition.add(vertex);
                });
                centerPosition.divideScalar(allVertices.length);
                
                // 设置组的位置
                group.position.copy(centerPosition);
                
                // 调整子对象的位置，使其相对于组位置
                group.children.forEach(child => {
                    // 如果子对象有几何体
                    if (child.geometry) {
                        // 创建一个变换矩阵，将顶点移动回相对位置
                        const translateMatrix = new THREE.Matrix4().makeTranslation(
                            -centerPosition.x,
                            -centerPosition.y,
                            -centerPosition.z
                        );
                        
                        // 应用变换矩阵到几何体
                        child.geometry.applyMatrix4(translateMatrix);
                        
                        // 确保子对象自己的position为0
                        child.position.set(0, 0, 0);
                    }
                });
                
                // 更新矩阵
                group.updateMatrix();
                group.updateMatrixWorld(true);
                
                console.log('设置了网格组位置:', centerPosition);
            }
            
            return group;
        } catch (error) {
            console.error('处理复杂草图时出错:', error);
            return this.createErrorIndicator();
        }
    }

    /**
     * 从圆锥数据创建网格
     * @param {Object} coneData - 圆锥数据，包含中心点和底部半径
     * @param {Object} extrusion - 挤出信息
     * @returns {THREE.Mesh} - 圆锥体网格
     */
    createConeFromData(coneData, extrusion) {
        try {
            // 提取中心点和底部半径
            const center = coneData.Center || [0, 0];
            const bottomRadius = coneData.Radius || 1.0;
            
            // 获取挤出高度
            const height = extrusion.extrude_depth_towards_normal || 1.0;
            
            console.log(`创建圆锥 - 中心: [${center}], 底部半径: ${bottomRadius}, 高度: ${height}`);
            
            // 创建圆锥几何体 - 顶部半径为0，底部半径为指定值
            // THREE.ConeGeometry 是创建圆锥的专用几何体，但也可以用CylinderGeometry设置顶部半径为0
            const geometry = new THREE.ConeGeometry(bottomRadius, height, 32);
            
            // 创建材质
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xB0C4DE,
                shininess: 100
            });
            
            // 创建网格
            const mesh = new THREE.Mesh(geometry, material);
            
            // 设置位置
            // 注意：THREE.js的圆锥本地坐标系中，高度在Y轴方向，底面在Y=-height/2，顶点在Y=height/2
            mesh.position.set(center[0], height/2, -center[1] || 0);
            
            // 如果需要应用坐标系变换
            // this.applyCoordinateSystem(mesh, extrusion);
            
            return mesh;
        } catch (error) {
            console.error('创建圆锥体时出错:', error);
            return null;
        }
    }

    /**
     * 正确的CSG布尔操作实现
     * @param {THREE.Mesh} meshA - 第一个网格
     * @param {THREE.Mesh} meshB - 要与第一个网格组合或相减的网格 
     * @param {string} operation - 操作类型: 'subtract', 'union', 'intersect'
     * @returns {THREE.Mesh} - 布尔操作结果网格
     */
    performCSGOperation(meshA, meshB, operation = 'subtract') {
        try {
            // 获取所需类和常量
            const { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } = window.CSG || CSG;
            
            // 选择正确的操作类型
            let operationType;
            switch(operation.toLowerCase()) {
                case 'union':
                case 'add':
                    operationType = ADDITION;
                    break;
                case 'intersect':
                case 'intersection':
                    operationType = INTERSECTION;
                    break;
                case 'subtract':
                case 'subtraction':
                default:
                    operationType = SUBTRACTION;
                    break;
            }
            
            // 准备Brush对象
            const brush1 = new Brush(meshA.geometry);
            brush1.position.copy(meshA.position);
            brush1.rotation.copy(meshA.rotation);
            brush1.scale.copy(meshA.scale);
            brush1.updateMatrixWorld();
            
            const brush2 = new Brush(meshB.geometry);
            brush2.position.copy(meshB.position);
            brush2.rotation.copy(meshB.rotation);
            brush2.scale.copy(meshB.scale);
            brush2.updateMatrixWorld();
            
            // 执行布尔操作
            const evaluator = new Evaluator();
            // 注意: evaluate返回的是Brush对象，不是几何体
            const resultBrush = evaluator.evaluate(brush1, brush2, operationType);
            
            // 检查结果Brush对象并从中提取几何体
            if (resultBrush && resultBrush.geometry && 
                resultBrush.geometry.attributes && 
                resultBrush.geometry.attributes.position) {
                
                // 从Brush对象中提取几何体创建最终网格
                const resultMesh = new THREE.Mesh(resultBrush.geometry, meshA.material.clone());
                return resultMesh;
            } else {
                console.error('CSG操作未产生有效几何体');
                return meshA; // 失败时返回原始网格
            }
        } catch (error) {
            console.error('CSG操作失败:', error);
            console.error('错误堆栈:', error.stack);
            return meshA; // 出错时返回原始网格
        }
    }

    // 从循环创建形状
    createShapeFromLoop(loop) {
        // 检查是否为圆形
        for (const elementKey in loop) {
            if (elementKey.startsWith('circle_')) {
                const circle = loop[elementKey];
                const center = circle['Center'];
                const radius = circle['Radius'];
                
                if (center && radius) {
                    const shape = new THREE.Shape();
                    shape.absarc(center[0], -center[1], radius, 0, Math.PI * 2, false);
                    return shape;
                }
            }
        }
        
        // 处理边缘
        const edges = [];
        for (const edgeKey in loop) {
            const edge = loop[edgeKey];
            
            if (edgeKey.startsWith('line_')) {
                edges.push({
                    type: 'line',
                    startPoint: edge['Start Point'],
                    endPoint: edge['End Point'],
                    key: edgeKey
                });
            } else if (edgeKey.startsWith('arc_')) {
                edges.push({
                    type: 'arc',
                    startPoint: edge['Start Point'],
                    midPoint: edge['Mid Point'],
                    endPoint: edge['End Point'],
                    key: edgeKey
                });
            }
        }
        
        if (edges.length === 0) return null;
        
        // 对边排序确保连续
        const sortedEdges = this.sortEdgesForContinuity(edges);
        
        // 创建形状
        const shape = new THREE.Shape();
        let isFirst = true;
        
        for (const edge of sortedEdges) {
            if (isFirst) {
                shape.moveTo(edge.startPoint[0], -edge.startPoint[1]);
                isFirst = false;
            }
            
            if (edge.type === 'line') {
                shape.lineTo(edge.endPoint[0], -edge.endPoint[1]);
            } else if (edge.type === 'arc') {

                if (edge.midPoint[1] > 0)
                    console.log("this one is correct !!!!!!");

                edge.startPoint[1] *= -1;
                edge.midPoint[1] *= -1;
                edge.endPoint[1] *= -1

                const arcParams = this.calculateArcParameters(
                    edge.startPoint, 
                    edge.midPoint, 
                    edge.endPoint
                );
                
                if (arcParams) {
                    shape.absarc(
                        arcParams.center.x,
                        arcParams.center.y,
                        arcParams.radius,
                        arcParams.startAngle,
                        arcParams.endAngle,
                        arcParams.counterclockwise
                    );
                } else {
                    shape.lineTo(edge.endPoint[0], -edge.endPoint[1]);
                }
            }
        }
        
        // 闭合形状
        try {
            shape.closePath();
        } catch (error) {
            console.warn('闭合形状失败:', error);
            const firstPoint = sortedEdges[0].startPoint;
            shape.lineTo(firstPoint[0], -firstPoint[1]);
        }
        
        return shape;
    }

    // 创建挤压网格
    createExtrudedMesh(shape, extrusion) {
        if (!shape) return null;
        
        try {
            // 创建挤压几何体
            const extrudeSettings = {
                steps: 1,
                depth: extrusion.extrude_depth_towards_normal || 1,
                bevelEnabled: false
            };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xB0C4DE,
                shininess: 100 
            });
            
            // 应用变换
            this.applyTransforms(geometry, extrusion);
            
            // 创建网格
            return new THREE.Mesh(geometry, material);
        } catch (error) {
            console.error('创建挤压几何体失败:', error);
            return null;
        }
    }

    // 应用变换
    applyTransforms(geometry, extrusion) {
        // 应用缩放因子
        if (extrusion.sketch_scale && extrusion.sketch_scale !== 1) {
            const scaleFactor = extrusion.sketch_scale;
            const scaleMatrix = new THREE.Matrix4().makeScale(
                scaleFactor, 
                scaleFactor, 
                1
            );
            geometry.applyMatrix4(scaleMatrix);
        }
        
        // 应用全局比例因子
        if (extrusion.global_scale_factor) {
            const globalScale = extrusion.global_scale_factor;
            const scaleMatrix = new THREE.Matrix4().makeScale(
                globalScale, 
                globalScale, 
                globalScale
            );
            geometry.applyMatrix4(scaleMatrix);
        }
        
        // // 旋转几何体使其垂直于XZ平面
        geometry.rotateX(-Math.PI / 2);
    }

    // 创建回退网格
    createFallbackMesh(extrusion) {
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

    // 创建错误指示器
    createErrorIndicator() {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        return new THREE.Mesh(geometry, material);
    }
    
    // 对边排序以确保连续性
    sortEdgesForContinuity(edges) {
        if (edges.length === 0) return [];
        
        console.log('排序前的边:', edges);
        
        const sortedEdges = [edges[0]];
        const usedIndices = new Set([0]);
        
        // 当前活动边的终点
        let currentEndPoint = edges[0].endPoint;
        
        console.log('当前终点:', edges);

        // 尝试找到连续的边
        while (sortedEdges.length < edges.length) {
            let foundNext = false;

            // console.log('current edges are:', sortedEdges)
            
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
    
    // 计算弧线参数 - 通用解决方案
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
            
            // 计算半径 (使用第一个点，其他点应该在相同半径上)
            const radius = center.distanceTo(p1);
            
            // 计算角度（从中心看）
            const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
            const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
            const a3 = Math.atan2(p3.y - center.y, p3.x - center.x);
            
            // 通用的弧线方向判断算法
            // 逻辑：如果从起点到终点按逆时针方向移动时能经过中点，则应使用逆时针弧，否则使用顺时针弧
            
            // 检查点是否按顺序排列在圆上 (容差范围内)
            // 校验所有点在同一圆上
            const r1 = center.distanceTo(p1);
            const r2 = center.distanceTo(p2);
            const r3 = center.distanceTo(p3);
            const rAvg = (r1 + r2 + r3) / 3;
            const rTolerance = 0.01 * rAvg; // 1%的容差
            
            const pointsOnCircle = 
                Math.abs(r1 - rAvg) <= rTolerance && 
                Math.abs(r2 - rAvg) <= rTolerance && 
                Math.abs(r3 - rAvg) <= rTolerance;
                
            if (!pointsOnCircle) {
                console.warn('点不在同一圆上，可能导致弧线不准确');
            }
            
            // 计算从起点沿着圆周逆时针方向到中点的角度
            let ccwAngleToMid = a2 - a1;
            if (ccwAngleToMid < 0) ccwAngleToMid += 2 * Math.PI;
            
            // 计算从起点沿着圆周逆时针方向到终点的角度
            let ccwAngleToEnd = a3 - a1;
            if (ccwAngleToEnd < 0) ccwAngleToEnd += 2 * Math.PI;
            
            // 关键判断：如果逆时针到中点的角度小于逆时针到终点的角度，则中点在逆时针路径上
            const midPointOnCCWPath = ccwAngleToMid >= ccwAngleToEnd;
            
            // 设置弧的方向
            const counterclockwise = midPointOnCCWPath;
            
            // 标准化角度到 [0, 2π) 范围
            const normalizeAngle = (angle) => {
                let result = angle;
                while (result < 0) result += Math.PI * 2;
                while (result >= Math.PI * 2) result -= Math.PI * 2;
                return result;
            };
            
            const startAngle = normalizeAngle(a1);
            const endAngle = normalizeAngle(a3);
            
            // 调试信息
            console.log(`圆心=(${center.x.toFixed(4)}, ${center.y.toFixed(4)}), 半径=${radius.toFixed(4)}`);
            console.log(`点角度: 起点=${(a1 * 180/Math.PI).toFixed(1)}°, 中点=${(a2 * 180/Math.PI).toFixed(1)}°, 终点=${(a3 * 180/Math.PI).toFixed(1)}°`);
            console.log(`逆时针角度: 到中点=${(ccwAngleToMid * 180/Math.PI).toFixed(1)}°, 到终点=${(ccwAngleToEnd * 180/Math.PI).toFixed(1)}°`);
            console.log(`中点在逆时针路径上: ${midPointOnCCWPath}, 使用${counterclockwise ? '逆时针' : '顺时针'}弧`);
            
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

    // 找到三点确定的圆的中心 - 改进版
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