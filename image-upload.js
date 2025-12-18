// 全局变量存储选中的文件
let selectedFiles = [];

// DOM 元素获取
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const previewGrid = document.getElementById('previewGrid');

// 按钮状态管理
const buttons = {
    base64: document.getElementById('base64Btn'),
    blob: document.getElementById('blobBtn'),
    server: document.getElementById('serverBtn'),
    cloud: document.getElementById('cloudBtn')
};

// 状态显示区域
const statusElements = {
    base64: document.getElementById('base64Status'),
    blob: document.getElementById('blobStatus'),
    server: document.getElementById('serverStatus'),
    cloud: document.getElementById('cloudStatus')
};

// 初始化事件监听器
function initEventListeners() {
    // 文件输入变化
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // 点击上传区域
    uploadArea.addEventListener('click', (e) => {
        if (e.target === fileInput) return;
        fileInput.click();
    });
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

// 处理拖拽悬停
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

// 处理拖拽离开
function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

// 处理文件拖放
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
        showStatus('error', '只支持图片文件！', statusElements.base64);
    }
    
    processFiles(imageFiles);
}

// 处理文件
function processFiles(files) {
    if (files.length === 0) return;
    
    // 验证文件类型和大小
    const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
            showStatus('error', `${file.name} 不是有效的图片文件`, statusElements.base64);
            return false;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB限制
            showStatus('error', `${file.name} 文件过大，请选择小于10MB的图片`, statusElements.base64);
            return false;
        }
        
        return true;
    });
    
    if (validFiles.length === 0) return;
    
    selectedFiles = validFiles;
    enableButtons();
    showFilePreview();
    clearStatuses();
    
    showStatus('success', `成功选择 ${validFiles.length} 个图片文件`, statusElements.base64);
}

// 启用按钮
function enableButtons() {
    Object.values(buttons).forEach(btn => {
        btn.disabled = false;
    });
}

// 禁用按钮
function disableButtons() {
    Object.values(buttons).forEach(btn => {
        btn.disabled = true;
    });
}

// 清空状态显示
function clearStatuses() {
    Object.values(statusElements).forEach(element => {
        element.innerHTML = '';
    });
}

// 显示状态信息
function showStatus(type, message, element) {
    element.innerHTML = `<div class="status ${type}">${message}</div>`;
}

// 显示文件预览
function showFilePreview() {
    previewGrid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img class="preview-image" src="#" alt="预览图片" id="preview-${index}">
            <div class="preview-info">
                <strong>文件名:</strong> ${file.name}<br>
                <strong>大小:</strong> ${formatFileSize(file.size)}<br>
                <strong>类型:</strong> ${file.type}
            </div>
            <div id="urls-${index}"></div>
        `;
        
        previewGrid.appendChild(previewItem);
        
        // 创建预览图片
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(`preview-${index}`).src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 1. 转换为 Base64 Data URL
function convertToBase64() {
    if (selectedFiles.length === 0) return;
    
    showStatus('loading', '正在转换为 Base64...', statusElements.base64);
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Url = e.target.result;
            displayUrl(index, 'Base64 URL', base64Url);
            
            if (index === selectedFiles.length - 1) {
                showStatus('success', `成功转换 ${selectedFiles.length} 个图片为 Base64 URL`, statusElements.base64);
            }
        };
        reader.onerror = () => {
            showStatus('error', `转换 ${file.name} 失败`, statusElements.base64);
        };
        reader.readAsDataURL(file);
    });
}

// 2. 生成 Blob Object URL
function convertToBlobURL() {
    if (selectedFiles.length === 0) return;
    
    showStatus('loading', '正在生成 Blob URL...', statusElements.blob);
    
    try {
        selectedFiles.forEach((file, index) => {
            const blobUrl = URL.createObjectURL(file);
            displayUrl(index, 'Blob URL', blobUrl);
        });
        
        showStatus('success', `成功生成 ${selectedFiles.length} 个 Blob URL`, statusElements.blob);
        
        // 提示用户 Blob URL 是临时的
        setTimeout(() => {
            showStatus('success', 
                `生成成功！注意：Blob URL 在页面关闭后会失效，仅适用于临时预览。`, 
                statusElements.blob
            );
        }, 2000);
    } catch (error) {
        showStatus('error', `生成 Blob URL 失败: ${error.message}`, statusElements.blob);
    }
}

// 3. 上传到服务器
async function uploadToServer() {
    if (selectedFiles.length === 0) return;
    
    showStatus('loading', '正在上传到服务器...', statusElements.server);
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                // 模拟服务器上传（实际项目中替换为真实API）
                const response = await uploadFileToServer(formData);
                
                if (response.success) {
                    displayUrl(i, 'Server URL', response.url);
                } else {
                    throw new Error(response.message || '上传失败');
                }
            } catch (error) {
                displayUrl(i, 'Upload Error', `上传失败: ${error.message}`);
            }
        }
        
        showStatus('success', `服务器上传完成`, statusElements.server);
        
    } catch (error) {
        showStatus('error', `上传失败: ${error.message}`, statusElements.server);
    }
}

// 模拟服务器上传函数（开发环境）
async function uploadFileToServer(formData) {
    // 实际项目中替换为以下代码：
    /*
    try {
        const response = await fetch('/api/upload/single', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
    */
    
    // 当前演示：模拟服务器响应
    return new Promise((resolve) => {
        setTimeout(() => {
            const fileName = formData.get('image').name;
            const randomId = Math.random().toString(36).substr(2, 9);
            
            // 模拟成功/失败概率（90%成功）
            const success = Math.random() > 0.1;
            
            if (success) {
                resolve({
                    success: true,
                    url: `https://your-server.com/uploads/${randomId}-${fileName}`,
                    message: '上传成功'
                });
            } else {
                resolve({
                    success: false,
                    message: '服务器错误：模拟的上传失败'
                });
            }
        }, 1000 + Math.random() * 2000); // 模拟1-3秒的上传时间
    });
}

// 4. 上传到云存储
async function uploadToCloud() {
    if (selectedFiles.length === 0) return;
    
    showStatus('loading', '正在上传到云存储...', statusElements.cloud);
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            try {
                // 模拟云存储上传
                const response = await uploadToCloudStorage(file);
                
                if (response.success) {
                    displayUrl(i, 'Cloud URL', response.url);
                } else {
                    throw new Error(response.message || '上传失败');
                }
            } catch (error) {
                displayUrl(i, 'Cloud Error', `上传失败: ${error.message}`);
            }
        }
        
        showStatus('success', `云存储上传完成`, statusElements.cloud);
        
    } catch (error) {
        showStatus('error', `云存储上传失败: ${error.message}`, statusElements.cloud);
    }
}

// 模拟云存储上传函数（开发环境）
async function uploadToCloudStorage(file) {
    // 实际项目中替换为以下代码：
    /*
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        // 上传到阿里云OSS示例
        const response = await fetch('/api/cloud-upload/alioss', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
    */
    
    // 当前演示：模拟云存储响应
    return new Promise((resolve) => {
        setTimeout(() => {
            const fileName = file.name;
            const randomId = Math.random().toString(36).substr(2, 9);
            const extension = fileName.split('.').pop();
            
            // 模拟成功/失败概率（85%成功，云存储可能更不稳定）
            const success = Math.random() > 0.15;
            
            if (success) {
                // 随机选择一个云服务商URL格式
                const cloudProviders = [
                    `https://your-bucket.oss-cn-hangzhou.aliyuncs.com/images/${randomId}.${extension}`,
                    `https://your-bucket-1234567890.cos.ap-guangzhou.myqcloud.com/images/${randomId}.${extension}`,
                    `https://your-bucket.s3.amazonaws.com/images/${randomId}.${extension}`
                ];
                
                const randomProvider = cloudProviders[Math.floor(Math.random() * cloudProviders.length)];
                
                resolve({
                    success: true,
                    url: randomProvider,
                    message: '上传成功'
                });
            } else {
                resolve({
                    success: false,
                    message: '云存储错误：网络超时或配置错误'
                });
            }
        }, 1500 + Math.random() * 2500); // 模拟1.5-4秒的上传时间
    });
}

// 显示URL结果
function displayUrl(index, type, url) {
    const urlContainer = document.getElementById(`urls-${index}`);
    
    const urlElement = document.createElement('div');
    urlElement.innerHTML = `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <strong>${type}:</strong>
            <div class="preview-url">${url}</div>
            <button class="btn copy-btn" onclick="copyToClipboard('${url}')">
                📋 复制URL
            </button>
        </div>
    `;
    
    urlContainer.appendChild(urlElement);
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // 显示复制成功提示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = '✅ URL已复制到剪贴板';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
        
    } catch (err) {
        // 降级处理：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('URL已复制到剪贴板');
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initEventListeners);

// 页面卸载时清理 Blob URLs 以释放内存
window.addEventListener('beforeunload', () => {
    // 清理所有创建的 Blob URLs
    const blobUrls = document.querySelectorAll('.preview-url');
    blobUrls.forEach(element => {
        const url = element.textContent;
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
});

// 工具函数：验证图片格式
function isValidImageType(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return validTypes.includes(file.type);
}

// 工具函数：压缩图片（可选功能）
function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // 计算新的尺寸
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为 Blob
            canvas.toBlob(resolve, file.type, quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}