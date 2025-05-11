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
    
    // 应用JSON更改
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
        
        // 调用渲染器重新渲染模型
        if (this.renderer) {
          updateProgress(50);
          this.renderer.renderCADFromJson(updatedJson);
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
  }