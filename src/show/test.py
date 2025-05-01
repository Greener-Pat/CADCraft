import json
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from matplotlib.path import Path
from matplotlib.patches import Rectangle, Circle, PathPatch, FancyBboxPatch
from matplotlib.collections import PatchCollection

def visualize_cad_json(json_path):
    with open(json_path) as f:
        data = json.load(f)
    
    fig = plt.figure(figsize=(12, 6))
    
    # 2D草图可视化（保持不变）
    ax1 = fig.add_subplot(121)
    sketch = data["sketch"]
    patches = []
    for contour in sketch["contours"]:
        if contour["type"] == "rectangle":
            # 圆角矩形处理
            if "fillet" in contour:
                rect = FancyBboxPatch(
                    (contour["center"][0]-contour["width"]/2, 
                     contour["center"][1]-contour["height"]/2),
                    contour["width"], 
                    contour["height"],
                    boxstyle=f"round,pad={contour['fillet']}",
                    linewidth=2,
                    edgecolor='r',
                    facecolor='none'
                )
            else:
                rect = Rectangle(
                    (contour["center"][0]-contour["width"]/2, 
                     contour["center"][1]-contour["height"]/2),
                    contour["width"], 
                    contour["height"],
                    linewidth=2,
                    edgecolor='r',
                    facecolor='none'
                )
            patches.append(rect)
            
        elif contour["type"] == "circle":
            patches.append(Circle(
                (contour["center"][0], contour["center"][1]),
                contour["radius"],
                edgecolor='b',
                facecolor='none',
                linewidth=2
            ))
            
        elif contour["type"] == "polyline":
            # 多边形路径处理
            vertices = np.array(contour["points"])
            if contour["closed"]:
                vertices = np.vstack([vertices, vertices[0]])
            codes = [Path.MOVETO] + [Path.LINETO]*(len(vertices)-1)
            path = Path(vertices, codes)
            patches.append(PathPatch(
                path,
                linewidth=2,
                edgecolor='g',
                facecolor='none'
            ))
    
    # 统一设置图形属性
    collection = PatchCollection(
        patches,
        match_original=True,
        linewidths=2
    )
    ax1.add_collection(collection)
    ax1.autoscale_view()
    ax1.set_title("2D Sketch")
    ax1.grid(True)
    ax1.set_aspect('equal')

    # 3D实体可视化
    ax2 = fig.add_subplot(122, projection='3d')
    extrusion = data["extrusion"]
    z_max = extrusion["distance"]
    
    for contour in data["sketch"]["contours"]:
        # 应用组件变换（如果存在）
        transform = data.get("transform", {})
        translate = transform.get("translation", [0, 0, 0])
        rotate = transform.get("rotation", [0, 0, 0])
        
        if contour["type"] == "rectangle":
            # 圆角矩形处理（近似为平面）
            x = contour["center"][0] + translate[0]
            y = contour["center"][1] + translate[1]
            w = contour["width"]/2
            h = contour["height"]/2
            
            # 定义顶点（考虑圆角近似）
            vertices = np.array([
                [x-w, y-h, 0], [x+w, y-h, 0],
                [x+w, y+h, 0], [x-w, y+h, 0],
                [x-w, y-h, z_max], [x+w, y-h, z_max],
                [x+w, y+h, z_max], [x-w, y+h, z_max]
            ])
            
            # 应用旋转
            if any(rotate):
                from scipy.spatial.transform import Rotation
                rot = Rotation.from_euler('xyz', rotate, degrees=True)
                vertices = rot.apply(vertices)
            
            # 定义面片
            faces = [
                [vertices[0], vertices[1], vertices[2], vertices[3]],  # 底面
                [vertices[4], vertices[5], vertices[6], vertices[7]],  # 顶面
                [vertices[0], vertices[1], vertices[5], vertices[4]],  # 前面
                [vertices[2], vertices[3], vertices[7], vertices[6]],  # 后面
                [vertices[1], vertices[2], vertices[6], vertices[5]],  # 右面
                [vertices[0], vertices[3], vertices[7], vertices[4]]   # 左面
            ]
            
            ax2.add_collection3d(Poly3DCollection(
                faces, 
                facecolors='cyan', 
                linewidths=1,
                edgecolors='k', 
                alpha=0.8
            ))
            
        elif contour["type"] == "polyline":
            # L型支架处理
            points = np.array(contour["points"])
            if contour["closed"]:
                points = np.vstack([points, points[0]])
            
            # 应用变换
            points = points + translate[:2]
            if any(rotate):
                from scipy.spatial.transform import Rotation
                rot = Rotation.from_euler('z', rotate[2], degrees=True)
                points = rot.apply(np.column_stack([points, np.zeros(len(points))]))[:,:2]
            
            # 创建拉伸路径
            z = np.linspace(0, z_max, 10)
            for i in range(len(points)-1):
                x = [points[i][0], points[i+1][0]]
                y = [points[i][1], points[i+1][1]]
                ax2.plot(x, y, z, color='green', alpha=0.7)
            
            # 三角剖分顶面和底面
            ax2.plot_trisurf(
                points[:,0], points[:,1], np.full(len(points), 0),
                color='green', alpha=0.4
            )
            ax2.plot_trisurf(
                points[:,0], points[:,1], np.full(len(points), z_max),
                color='green', alpha=0.4
            )
            
        elif contour["type"] == "circle":
            # 圆柱体处理（支持同心圆）
            theta = np.linspace(0, 2*np.pi, 30)
            x_c = contour["center"][0] + translate[0]
            y_c = contour["center"][1] + translate[1]
            
            # 应用旋转
            if any(rotate):
                from scipy.spatial.transform import Rotation
                rot = Rotation.from_euler('z', rotate[2], degrees=True)
                offset = rot.apply([[contour["radius"], 0, 0]])[0]
                x_circle = x_c + offset[0] * np.cos(theta)
                y_circle = y_c + offset[1] * np.sin(theta)
            else:
                x_circle = x_c + contour["radius"] * np.cos(theta)
                y_circle = y_c + contour["radius"] * np.sin(theta)
            
            # 创建网格
            z = np.array([0, z_max]) + translate[2]
            theta_grid, z_grid = np.meshgrid(theta, z)
            x_grid = x_c + contour["radius"] * np.cos(theta_grid)
            y_grid = y_c + contour["radius"] * np.sin(theta_grid)
            
            ax2.plot_surface(x_grid, y_grid, z_grid, color='blue', alpha=0.7)
            ax2.plot_trisurf(x_circle, y_circle, np.full_like(x_circle, z[0]), color='red', alpha=0.5)
            ax2.plot_trisurf(x_circle, y_circle, np.full_like(x_circle, z[1]), color='red', alpha=0.5)
            
    ax2.set_title("3D Solid Model")
    ax2.set_xlabel('X')
    ax2.set_ylabel('Y')
    ax2.set_zlabel('Z')
    ax2.set_box_aspect([1, 1, 1])  # 保持比例
    
    plt.tight_layout()
    plt.show()

# 示例调用
visualize_cad_json("../../data/example/combine.json")