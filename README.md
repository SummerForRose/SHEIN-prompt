# 📸 图片上传转URL系统

一个完整的前后端图片上传解决方案，支持多种方式将本地图片转换为可用的URL。

## ✨ 特性

- 🎯 **多种转换方式**：Base64、Blob URL、服务器上传、云存储上传
- 🖼️ **图片预览**：实时预览上传的图片
- 📱 **响应式设计**：支持PC和移动端
- 🎪 **拖拽上传**：支持拖拽文件到上传区域
- 🔒 **安全验证**：文件类型和大小限制
- ☁️ **云存储集成**：支持阿里云OSS、腾讯云COS、AWS S3
- 📋 **一键复制**：点击复制生成的URL

## 🚀 快速开始

### 1. 前端演示

直接打开 `image-upload-demo.html` 文件在浏览器中查看演示：

```bash
# 直接用浏览器打开
open image-upload-demo.html

# 或者使用简单的HTTP服务器
python -m http.server 8000
# 然后访问 http://localhost:8000/image-upload-demo.html
```

### 2. 后端API服务

#### 安装依赖

```bash
npm install
```

#### 启动服务器

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务器将在 `http://localhost:3000` 启动

## 📚 使用方法

### 前端使用

#### 1. Base64 转换
适合小图片直接嵌入HTML或CSS中：

```javascript
// 选择文件后点击"转换为 Base64 URL"按钮
// 生成的URL格式：data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
```

**优点**：无需服务器，即时可用  
**缺点**：文件大，不利于SEO和缓存

#### 2. Blob URL
适合图片预览和临时展示：

```javascript
// 选择文件后点击"生成 Blob URL"按钮
// 生成的URL格式：blob:http://localhost:8000/uuid
```

**优点**：内存友好，加载快速  
**缺点**：临时性，页面刷新后失效

#### 3. 服务器上传
适合生产环境使用：

```javascript
// 选择文件后点击"上传到服务器"按钮
// 生成的URL格式：https://your-server.com/uploads/filename.jpg
```

**优点**：永久保存，SEO友好  
**缺点**：需要服务器支持，有网络延迟

#### 4. 云存储上传
适合高可用性场景：

```javascript
// 选择文件后点击"上传到云存储"按钮
// 生成的URL格式：https://cdn.your-cloud.com/images/filename.jpg
```

**优点**：高可用性，CDN加速  
**缺点**：需要配置，可能产生费用

### API 接口

#### 单文件上传
```bash
POST /api/upload/single
Content-Type: multipart/form-data

# 参数
image: File # 图片文件

# 响应
{
  "success": true,
  "message": "文件上传成功",
  "data": {
    "originalName": "example.jpg",
    "filename": "uuid-example.jpg",
    "size": 12345,
    "mimetype": "image/jpeg",
    "url": "http://localhost:3000/uploads/uuid-example.jpg"
  }
}
```

#### 多文件上传
```bash
POST /api/upload/multiple
Content-Type: multipart/form-data

# 参数
images: File[] # 图片文件数组（最多10个）

# 响应
{
  "success": true,
  "message": "成功上传 3 个文件",
  "data": [
    {
      "originalName": "image1.jpg",
      "filename": "uuid1-image1.jpg",
      "url": "http://localhost:3000/uploads/uuid1-image1.jpg"
    }
    // ... 更多文件信息
  ]
}
```

#### Base64 上传
```bash
POST /api/upload/base64
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "filename": "example.jpg" // 可选
}

# 响应
{
  "success": true,
  "message": "Base64 图片上传成功",
  "data": {
    "filename": "uuid-example.jpg",
    "url": "http://localhost:3000/uploads/uuid-example.jpg"
  }
}
```

#### 获取文件列表
```bash
GET /api/files

# 响应
{
  "success": true,
  "message": "获取文件列表成功",
  "data": [
    {
      "filename": "uuid-example.jpg",
      "size": 12345,
      "url": "http://localhost:3000/uploads/uuid-example.jpg",
      "createdAt": "2023-12-17T10:30:00.000Z"
    }
    // ... 更多文件
  ]
}
```

#### 删除文件
```bash
DELETE /api/files/:filename

# 响应
{
  "success": true,
  "message": "文件删除成功"
}
```

## ☁️ 云存储配置

### 环境变量配置

创建 `.env` 文件：

```bash
# 阿里云 OSS
ALI_OSS_REGION=oss-cn-hangzhou
ALI_OSS_ACCESS_KEY_ID=your_access_key_id
ALI_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALI_OSS_BUCKET=your_bucket_name

# 腾讯云 COS
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_BUCKET=your_bucket_name
TENCENT_REGION=ap-guangzhou

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-west-2
AWS_BUCKET=your_bucket_name
```

### 云存储上传

```bash
# 上传到指定云存储
POST /api/cloud-upload/alioss      # 阿里云 OSS
POST /api/cloud-upload/tencentcos  # 腾讯云 COS
POST /api/cloud-upload/awss3       # AWS S3

# 备份上传到多个云存储
POST /api/cloud-upload/backup
{
  "providers": ["alioss", "tencentcos"]
}
```

## 🎨 前端集成示例

### React 示例

```jsx
import React, { useState } from 'react';

function ImageUpload() {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('/api/upload/single', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImageUrl(result.data.url);
      } else {
        alert('上传失败: ' + result.message);
      }
    } catch (error) {
      alert('上传错误: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      
      {uploading && <p>上传中...</p>}
      
      {imageUrl && (
        <div>
          <img src={imageUrl} alt="上传的图片" style={{ maxWidth: '300px' }} />
          <p>URL: {imageUrl}</p>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
```

### Vue 示例

```vue
<template>
  <div>
    <input 
      type="file" 
      accept="image/*"
      @change="handleUpload"
      :disabled="uploading"
    />
    
    <div v-if="uploading">上传中...</div>
    
    <div v-if="imageUrl">
      <img :src="imageUrl" alt="上传的图片" style="max-width: 300px;" />
      <p>URL: {{ imageUrl }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      imageUrl: '',
      uploading: false
    };
  },
  methods: {
    async handleUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.uploading = true;
      
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch('/api/upload/single', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.imageUrl = result.data.url;
        } else {
          alert('上传失败: ' + result.message);
        }
      } catch (error) {
        alert('上传错误: ' + error.message);
      } finally {
        this.uploading = false;
      }
    }
  }
};
</script>
```

## 🔧 配置选项

### 文件限制

```javascript
// 在 server-upload-api.js 中修改
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 文件大小限制 (10MB)
    files: 10 // 文件数量限制
  }
});
```

### 支持的文件格式

```javascript
// 在 fileFilter 函数中修改
const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
```

### 上传目录

```javascript
// 修改上传目录路径
const uploadDir = path.join(__dirname, 'public/uploads');
```

## 📱 移动端适配

系统已经针对移动端进行了优化：

- 响应式布局设计
- 触摸友好的操作界面
- 移动端拖拽支持
- 大拇指操作区域适配

## 🛡️ 安全考虑

1. **文件类型验证**：只允许图片格式
2. **文件大小限制**：防止大文件攻击
3. **文件名随机化**：防止文件名冲突和路径遍历
4. **CORS 配置**：控制跨域访问
5. **错误处理**：不泄露敏感信息

## 📊 性能优化

1. **图片压缩**：可选的客户端图片压缩
2. **并行上传**：支持多文件并行处理
3. **内存管理**：及时释放 Blob URLs
4. **CDN 集成**：云存储自带 CDN 加速

## 🔍 故障排除

### 常见问题

1. **上传失败**
   - 检查文件格式是否支持
   - 确认文件大小未超过限制
   - 检查网络连接

2. **服务器启动失败**
   - 确认端口 3000 未被占用
   - 检查 Node.js 版本 >= 14
   - 运行 `npm install` 安装依赖

3. **云存储上传失败**
   - 检查环境变量配置
   - 确认云存储账户权限
   - 验证 Bucket 配置

### 调试模式

```bash
# 启用详细日志
DEBUG=* npm run dev

# 或者设置环境变量
NODE_ENV=development npm start
```

## 📄 许可证

MIT License - 可以自由使用、修改和分发。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请提交 Issue 或联系开发者。

---

## 🚀 部署指南

### Docker 部署

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t image-upload-api .

# 运行容器
docker run -p 3000:3000 image-upload-api
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server-upload-api.js --name "image-upload-api"

# 查看状态
pm2 status

# 查看日志
pm2 logs image-upload-api
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 文件上传大小限制
        client_max_body_size 10M;
    }
    
    # 静态文件缓存
    location /uploads/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```