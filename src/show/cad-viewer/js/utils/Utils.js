import * as THREE from 'three';

// 主题管理工具

/**
 * 切换暗色/亮色主题
 * @returns {boolean} 是否为暗色主题
 */
export function toggleTheme() {
    try {
        const body = document.body;
        
        // 检查当前是否为暗色主题
        const isDarkFromClass = body.classList.contains('dark-theme');
        const isDarkFromAttr = body.getAttribute('data-theme') === 'dark';
        const isDark = isDarkFromClass || isDarkFromAttr;
        
        // 同时更新类和属性
        if (isDark) {
            // 切换到亮色主题
            body.classList.remove('dark-theme');
            body.removeAttribute('data-theme');
        } else {
            // 切换到暗色主题
            body.classList.add('dark-theme');
            body.setAttribute('data-theme', 'dark');
        }
        
        // 保存主题偏好
        localStorage.setItem('darkTheme', (!isDark).toString());
        
        // 更新THREE.js场景背景色
        updateRendererBackground(!isDark);
        
        // 【新增】更新CodeMirror编辑器主题
        updateCodeMirrorTheme(!isDark);
        
        console.log(`已切换到${!isDark ? '暗色' : '亮色'}主题`);
        return !isDark;
    } catch (error) {
        console.error('切换主题失败:', error);
        return false;
    }
}

/**
 * 加载用户主题偏好
 * @returns {boolean} 是否为暗色主题
 */
export function loadThemePreference() {
    try {
        let isDark = false;
        
        // 尝试从localStorage读取偏好
        const savedPreference = localStorage.getItem('darkTheme');
        
        if (savedPreference === null) {
            // 没有保存的偏好，尝试检测系统偏好
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else {
            // 使用保存的偏好
            isDark = savedPreference === 'true';
        }
        
        // 同时设置类和属性
        const body = document.body;
        if (isDark) {
            body.classList.add('dark-theme');
            body.setAttribute('data-theme', 'dark');
        } else {
            body.classList.remove('dark-theme');
            body.removeAttribute('data-theme');
        }
        
        // 更新THREE.js场景背景色
        updateRendererBackground(isDark);
        
        // 【新增】更新CodeMirror编辑器主题
        updateCodeMirrorTheme(isDark);
        
        return isDark;
    } catch (error) {
        console.error('加载主题偏好失败:', error);
        return false;
    }
}

/**
 * 【新增】更新CodeMirror编辑器主题
 * @param {boolean} isDark - 是否为暗色主题
 */
function updateCodeMirrorTheme(isDark) {
    try {
        // 延迟执行以确保编辑器已初始化
        setTimeout(() => {
            // 查找所有可能的CodeMirror实例
            const findEditors = () => {
                // 直接查找DOM中的CodeMirror实例
                const cmElements = document.querySelectorAll('.CodeMirror');
                const editors = [];
                
                // 遍历找到的元素
                cmElements.forEach(el => {
                    if (el.CodeMirror) {
                        editors.push(el.CodeMirror);
                    }
                });
                
                // 检查全局/窗口变量
                if (window.jsonEditor && window.jsonEditor.editor) {
                    editors.push(window.jsonEditor.editor);
                }
                
                // 如果找到的编辑器为空，尝试从DOM中获取实例
                if (editors.length === 0) {
                    const editorElement = document.getElementById('jsonEditor');
                    if (editorElement && editorElement.querySelector('.CodeMirror')) {
                        const cmInstance = editorElement.querySelector('.CodeMirror').CodeMirror;
                        if (cmInstance) editors.push(cmInstance);
                    }
                }
                
                return editors;
            };
            
            const editors = findEditors();
            
            // 更新所有找到的编辑器实例
            editors.forEach(editor => {
                // 设置主题
                editor.setOption('theme', isDark ? 'dracula' : 'default');
                
                // 强制刷新编辑器以应用新主题
                setTimeout(() => {
                    editor.refresh();
                }, 50);
                
                console.log(`已更新CodeMirror主题为: ${isDark ? 'dracula' : 'default'}`);
            });
            
            // 如果没有找到编辑器，记录信息
            if (editors.length === 0) {
                console.log('没有找到CodeMirror编辑器实例');
            }
        }, 100);
    } catch (error) {
        console.error('更新CodeMirror主题失败:', error);
    }
}

/**
 * 更新THREE.js渲染器背景色
 * @param {boolean} isDark - 是否为暗色主题
 */
function updateRendererBackground(isDark) {
    // 延迟更新THREE.js场景背景色，确保渲染器已初始化
    setTimeout(() => {
        // 尝试找到全局渲染器或直接访问场景
        if (window.renderer && window.renderer.sceneManager && window.renderer.sceneManager.scene) {
            // 完整渲染器API
            window.renderer.sceneManager.scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);
        } else if (window.scene) {
            // 仅场景对象
            window.scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);
        } else if (window.threeScene) {
            // 备选场景对象名称
            window.threeScene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);
        }
    }, 100);
}

// 保存区块折叠状态
export function saveSectionState(sectionId, isCollapsed) {
    const states = JSON.parse(localStorage.getItem('sectionStates') || '{}');
    states[sectionId] = isCollapsed;
    localStorage.setItem('sectionStates', JSON.stringify(states));
}

// 加载区块折叠状态
export function loadSectionStates() {
    const states = JSON.parse(localStorage.getItem('sectionStates') || '{}');
    const sections = document.querySelectorAll('.sidebar-section');
    
    sections.forEach(section => {
        const title = section.querySelector('h3')?.textContent.trim();
        if (title && states[title]) {
            section.classList.add('collapsed');
        }
    });
}

// 格式化文件大小
export function formatSize(bytes) {
    if (bytes < 1024) return bytes + " 字节";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
}

// 获取形状的中文名称
export function getShapeName(shapeType) {
    const shapeNames = {
        'box': '长方体',
        'sphere': '球体',
        'cylinder': '圆柱体',
        'cone': '圆锥体',
        'torus': '圆环',
        'pyramid': '金字塔'
    };
    return shapeNames[shapeType] || shapeType;
}