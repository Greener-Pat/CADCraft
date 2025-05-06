import { updateStatus } from '../utils/StatusManager.js';

export class SelectionManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.selectedObject = null;
    }
    
    // 选择对象
    selectObject(object) {
        // 如果已经选中同一个对象，不做任何操作
        if (this.selectedObject === object) return;
        
        // 先清除当前选择
        this.clearSelection();
        
        // 设置新的选中对象
        this.selectedObject = object;
        
        if (this.selectedObject) {
            // 保存原始材质
            this.selectedObject.userData.originalMaterial = this.selectedObject.material.clone();
            
            // 高亮显示选中的对象
            if (Array.isArray(this.selectedObject.material)) {
                this.selectedObject.material.forEach(m => {
                    if (m.emissive) m.emissive.set(0x333333);
                });
            } else if (this.selectedObject.material && this.selectedObject.material.emissive) {
                this.selectedObject.material.emissive.set(0x333333);
            }
            
            // 显示控制手柄
            this.renderer.controlsManager.showGizmo(this.selectedObject);
            
            updateStatus(`已选择${this.selectedObject.userData.type || '对象'}`);
        }
        
        return this.selectedObject;
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
            
            // 隐藏控制手柄
            this.renderer.controlsManager.hideGizmo();
            
            // 清除引用
            this.selectedObject = null;
            
            updateStatus('已取消选择');
        }
    }
    
    // 获取当前选中的对象
    getSelectedObject() {
        return this.selectedObject;
    }
}