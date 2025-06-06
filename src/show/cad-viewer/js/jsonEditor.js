import { updateStatus, showLoading, updateProgress, hideLoading} from "./utils/StatusManager.js";

// 修改后的 JsonEditor 类 - 使用现有折叠机制
export class JsonEditor {
    constructor() {
      this.currentJson = null;
      this.renderer = null;
      this.editor = null;
      this.editorElement = document.getElementById('jsonEditor');
      this.statusElement = document.getElementById('jsonEditorStatus');
      this.formatButton = document.getElementById('formatJsonBtn');
      this.applyButton = document.getElementById('applyJsonBtn');
      this.editorSection = document.getElementById('jsonEditorSection');
      
      // 初始化 CodeMirror
      this.initCodeMirror();
      
      // 初始化事件监听器
      this.initEventListeners();
    }
    
    // 初始化 CodeMirror 编辑器
    initCodeMirror() {
      // 创建编辑器实例
      console.log('创建 CodeMirror 实例');
      this.editor = CodeMirror(this.editorElement, {
        mode: {
          name: "javascript",
          json: true
        },
        theme: "dracula", // 使用 Dracula 主题或自定义主题
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        tabSize: 2,
        indentUnit: 2,
        indentWithTabs: false,
        lineWrapping: false,
        styleActiveLine: true
      });
      
      // 调整编辑器高度以适应内容
      this.editor.setOption("extraKeys", {
        "Ctrl-Space": "autocomplete",
        "Ctrl-Q": function(cm) { cm.foldCode(cm.getCursor()); }
      });
      
      // 监听内容变化
      this.editor.on("change", () => {
        this.validateJson();
      });
    }
    
    // 设置渲染器引用
    setRenderer(renderer) {
      this.renderer = renderer;
    }
    
    // 初始化事件监听器
    initEventListeners() {
      // 格式化按钮
      this.formatButton.addEventListener('click', () => this.formatJson());
      
      // 应用更改按钮
      this.applyButton.addEventListener('click', () => this.applyChanges());
      
      // 折叠/展开处理
      const toggleBtn = this.editorSection.querySelector('.toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const content = this.editorSection.querySelector('.section-content');
          const icon = toggleBtn.querySelector('i');
          
          // 切换内容显示状态
          content.classList.toggle('collapsed');
          
          // 更新图标
          if (content.classList.contains('collapsed')) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
          } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            
            // 刷新编辑器大小以适应内容
            if (this.editor) {
              this.editor.refresh();
            }
          }
          
          // 保存折叠状态
          const sectionId = this.editorSection.querySelector('h3').textContent.trim();
          saveSectionState(sectionId, content.classList.contains('collapsed'));
        });
      }
    }
    
    // 设置JSON内容
    setJson(jsonData) {
      this.currentJson = jsonData;
      
      // 格式化并显示JSON
      const formattedJson = JSON.stringify(jsonData, null, 2);
      this.editor.setValue(formattedJson);
      
      // 确保编辑器区块展开
      this.ensureExpanded();
      
      // 重置滚动位置
      this.editor.scrollTo(0, 0);
      
      // 片刻后刷新编辑器以确保正确显示
      setTimeout(() => this.editor.refresh(), 100);
    }
    
    // 确保编辑器区块展开
    ensureExpanded() {
      const content = this.editorSection.querySelector('.section-content');
      const icon = this.editorSection.querySelector('.toggle-btn i');
      
      if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        
        // 保存折叠状态
        const sectionId = this.editorSection.querySelector('h3').textContent.trim();
        saveSectionState(sectionId, false);
      }
    }
    
    // 获取当前编辑器内容
    getEditorContent() {
      return this.editor.getValue();
    }
    
    // 验证JSON语法
    validateJson() {
      try {
        const text = this.getEditorContent().trim();
        if (!text) {
          this.statusElement.textContent = '';
          this.statusElement.className = 'status-message';
          this.applyButton.disabled = true;
          return false;
        }
        
        JSON.parse(text);
        this.statusElement.textContent = '✓ JSON 格式有效';
        this.statusElement.className = 'status-message success';
        this.applyButton.disabled = false;
        return true;
      } catch (e) {
        this.statusElement.textContent = `✗ JSON 格式错误: ${e.message}`;
        this.statusElement.className = 'status-message error';
        this.applyButton.disabled = true;
        return false;
      }
    }
    
    // 格式化JSON
    formatJson() {
      try {
        const text = this.getEditorContent().trim();
        if (!text) return;
        
        const parsedJson = JSON.parse(text);
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        this.editor.setValue(formattedJson);
        
        this.validateJson();
        this.statusElement.textContent = '✓ JSON 已格式化';
        this.statusElement.className = 'status-message success';
      } catch (e) {
        this.statusElement.textContent = `✗ 无法格式化: ${e.message}`;
        this.statusElement.className = 'status-message error';
      }
    }
    
    applyChanges() {
      if (!this.validateJson()) return;
      
      try {
        const updatedJson = JSON.parse(this.getEditorContent());
        this.currentJson = updatedJson;
        
        // 更新全局变量
        if (window.currentModelData) {
          window.currentModelData = updatedJson;
        }
        
        // 显示加载指示器
        showLoading('应用JSON更改');
        updateProgress(30);
        
        // 【新增】保存相机状态
        const cameraState = this.saveCameraState();
        
        // 销毁旧的controlsManager
        if (this.renderer && this.renderer.controlsManager) {
          console.log('销毁旧的控制管理器');
          this.renderer.controlsManager.dispose();
        }
        
        updateProgress(40);
        
        // 调用渲染器重新渲染模型
        if (this.renderer) {
          updateProgress(60);
          
          // 渲染新模型
          this.renderer.renderCADFromJson(updatedJson);
          
          updateProgress(80);
          
          // 【新增】恢复相机状态
          this.restoreCameraState(cameraState);
          
          updateProgress(90);
          
          // 更新模型信息
          if (window.updateModelInfo) {
            updateModelInfo(updatedJson);
          }
          
          this.statusElement.textContent = '✓ 更改已应用，模型已更新';
          this.statusElement.className = 'status-message success';
          updateStatus('JSON编辑器更改已应用');
        } else {
          this.statusElement.textContent = '✗ 渲染器未初始化';
          this.statusElement.className = 'status-message error';
          updateStatus('错误: 渲染器未初始化');
        }
        
        updateProgress(100);
        setTimeout(hideLoading, 500);
      } catch (e) {
        this.statusElement.textContent = `✗ 应用更改失败: ${e.message}`;
        this.statusElement.className = 'status-message error';
        updateStatus('应用JSON更改失败: ' + e.message);
        hideLoading();
      }
    }

    // 【新增】保存相机状态方法
    saveCameraState() {
      if (!this.renderer || !this.renderer.sceneManager) return null;
      
      const camera = this.renderer.sceneManager.camera;
      const controls = this.renderer.sceneManager.controls;
      
      if (!camera || !controls) return null;
      
      // 保存完整的相机状态
      return {
        // 相机位置
        position: camera.position.clone(),
        
        // 控制器目标点 (相机看向的位置)
        target: controls.target.clone(),
        
        // 相机的朝向四元数
        quaternion: camera.quaternion.clone(),
        
        // 视野角度
        fov: camera.fov,
        
        // 近/远剪裁平面
        near: camera.near,
        far: camera.far,
        
        // 控制器缩放级别
        zoom: controls.zoom,
        
        // 控制器其他属性
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        
        // 时间戳，用于调试
        timestamp: Date.now()
      };
    }

    // 【新增】恢复相机状态方法
    restoreCameraState(state) {
      if (!state || !this.renderer || !this.renderer.sceneManager) return;
      
      const camera = this.renderer.sceneManager.camera;
      const controls = this.renderer.sceneManager.controls;
      
      if (!camera || !controls) return;
      
      console.log('恢复相机状态:', state);
      
      // 恢复相机位置和朝向
      camera.position.copy(state.position);
      camera.quaternion.copy(state.quaternion);
      
      // 恢复相机参数
      camera.fov = state.fov;
      camera.near = state.near;
      camera.far = state.far;
      camera.updateProjectionMatrix();
      
      // 恢复控制器状态
      controls.target.copy(state.target);
      
      // 对于OrbitControls
      if (typeof controls.zoom !== 'undefined') {
        controls.zoom = state.zoom;
      }
      
      // 更新控制器
      controls.update();
      
      // 强制一次渲染确保视图更新
      this.renderer.sceneManager.render();
    }

    // 添加以下方法到JsonEditor类

	// 跳转到特定部件ID
	scrollToPartId(partId) {
		if (!this.editor || !partId) return false;
		
		try {
			console.log(`尝试在编辑器中定位部件: ${partId}`);
			
			// 获取当前内容
			const content = this.editor.getValue();
			const lines = content.split('\n');
			
			// 查找partId
			const partPattern = new RegExp(`"${partId}"\\s*:`);
			
			// 遍历查找部件位置
			for (let i = 0; i < lines.length; i++) {
			if (partPattern.test(lines[i])) {
				console.log(`找到部件 ${partId} 在第 ${i+1} 行`);
				
				// 计算部件的开始和结束行
				let bracketCount = 0;
				let startLine = i;
				let endLine = i;
				
				// 找开始的大括号
				for (let j = i; j < lines.length; j++) {
				if (lines[j].includes('{')) {
					break;
				}
				}
				
				// 寻找部件的结束位置
				for (let j = i; j < lines.length; j++) {
				const openBrackets = (lines[j].match(/{/g) || []).length;
				const closeBrackets = (lines[j].match(/}/g) || []).length;
				bracketCount += openBrackets - closeBrackets;
				
				if (bracketCount === 0 && j > i) {
					endLine = j;
					break;
				}
				}
				
				console.log(`部件 ${partId} 范围: 第 ${startLine+1} 行 到 第 ${endLine+1} 行`);
				
				// 展开编辑器区块
				this.ensureExpanded();
				
				// 片刻后操作，确保编辑器完全加载
				setTimeout(() => {
				
				// 滚动到视图中心
				this.editor.scrollIntoView({line: startLine + 7, ch: 0}, 150);
				
				// 高亮显示该部分
				this.highlightLine(startLine + 7);
				
				// 添加状态更新
				updateStatus(`已定位到部件: ${partId}`);
				}, 100);
				
				return true;
			}
			}
			
			console.log(`未找到部件 ${partId}`);
			return false;
		} catch (error) {
			console.error('定位JSON部件失败:', error);
			return false;
		}
	}

	// 高亮指定行
	highlightLine(lineNumber) {
		if (!this.editor) return;
		
		// 清除之前的高亮
		if (this._currentHighlight) {
			this._currentHighlight.clear();
		}
		
		// 创建新的高亮
		this._currentHighlight = this.editor.markText(
			{line: lineNumber, ch: 0},
			{line: lineNumber, ch: this.editor.getLine(lineNumber).length},
			{
			className: 'json-part-highlight',
			clearOnEnter: true,
			css: 'background-color: rgba(65, 105, 225, 0.3); font-weight: bold; border-radius: 3px; padding: 2px 0;'
			}
		);
		
		// 几秒后自动取消高亮
		setTimeout(() => {
			if (this._currentHighlight) {
			this._currentHighlight.clear();
			this._currentHighlight = null;
			}
		}, 3000);
	}
}