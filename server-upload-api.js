// Node.js + Express 服务器端图片上传API示例
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 检查文件类型
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件 (JPEG, JPG, PNG, GIF, WebP)'));
    }
};

// 配置 multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
        files: 10 // 最多10个文件
    }
});

// 错误处理中间件
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '文件大小超过限制（最大10MB）'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: '文件数量超过限制（最多10个）'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: '意外的文件字段'
            });
        }
    }
    
    if (err.message.includes('只允许上传图片文件')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    next(err);
};

// API 路由

// 1. 单文件上传
app.post('/api/upload/single', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }
        
        const fileInfo = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        };
        
        res.json({
            success: true,
            message: '文件上传成功',
            data: fileInfo
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 2. 多文件上传
app.post('/api/upload/multiple', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }
        
        const filesInfo = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
        }));
        
        res.json({
            success: true,
            message: `成功上传 ${req.files.length} 个文件`,
            data: filesInfo
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 3. Base64 上传接口
app.post('/api/upload/base64', (req, res) => {
    try {
        const { image, filename } = req.body;
        
        if (!image) {
            return res.status(400).json({
                success: false,
                message: '缺少图片数据'
            });
        }
        
        // 解析 base64 数据
        const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            return res.status(400).json({
                success: false,
                message: '无效的 base64 图片格式'
            });
        }
        
        const imageType = matches[1];
        const imageData = matches[2];
        
        // 验证图片类型
        const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
        if (!allowedTypes.includes(imageType.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: '不支持的图片格式'
            });
        }
        
        // 生成文件名
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = imageType === 'jpeg' ? 'jpg' : imageType;
        const fileName = filename ? 
            `${path.parse(filename).name}-${uniqueSuffix}.${extension}` :
            `${uniqueSuffix}.${extension}`;
        
        // 保存文件
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(imageData, 'base64');
        
        fs.writeFileSync(filePath, buffer);
        
        const fileInfo = {
            originalName: filename || fileName,
            filename: fileName,
            size: buffer.length,
            mimetype: `image/${imageType}`,
            url: `${req.protocol}://${req.get('host')}/uploads/${fileName}`
        };
        
        res.json({
            success: true,
            message: 'Base64 图片上传成功',
            data: fileInfo
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 4. 获取文件列表
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            })
            .map(filename => {
                const filePath = path.join(uploadDir, filename);
                const stats = fs.statSync(filePath);
                
                return {
                    filename,
                    size: stats.size,
                    url: `${req.protocol}://${req.get('host')}/uploads/${filename}`,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt); // 按创建时间倒序
        
        res.json({
            success: true,
            message: '获取文件列表成功',
            data: files
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 5. 删除文件
app.delete('/api/files/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            message: '文件删除成功'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 6. 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务运行正常',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 错误处理中间件
app.use(handleMulterError);

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 图片上传服务器启动成功`);
    console.log(`📡 端口: ${PORT}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📁 上传目录: ${uploadDir}`);
    console.log(`\n可用的 API 接口:`);
    console.log(`  POST /api/upload/single     - 单文件上传`);
    console.log(`  POST /api/upload/multiple   - 多文件上传`);
    console.log(`  POST /api/upload/base64     - Base64上传`);
    console.log(`  GET  /api/files            - 获取文件列表`);
    console.log(`  DELETE /api/files/:filename - 删除文件`);
    console.log(`  GET  /api/health           - 健康检查`);
});

module.exports = app;