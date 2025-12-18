// 云存储服务集成示例
// 包含阿里云OSS、腾讯云COS、AWS S3的上传实现

// ============= 阿里云 OSS 示例 =============
const OSS = require('ali-oss');

class AliCloudOSS {
    constructor(config) {
        this.client = new OSS({
            region: config.region || 'oss-cn-hangzhou',
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            bucket: config.bucket
        });
        this.bucket = config.bucket;
    }
    
    async uploadFile(file, fileName) {
        try {
            // 生成唯一文件名
            const uniqueName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`;
            
            // 上传文件
            const result = await this.client.put(uniqueName, file.buffer);
            
            return {
                success: true,
                url: result.url,
                name: result.name,
                size: file.size,
                etag: result.etag
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async deleteFile(fileName) {
        try {
            await this.client.delete(fileName);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getFileList(prefix = '', maxKeys = 100) {
        try {
            const result = await this.client.list({
                prefix: prefix,
                'max-keys': maxKeys
            });
            
            return {
                success: true,
                files: result.objects || []
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ============= 腾讯云 COS 示例 =============
const COS = require('cos-nodejs-sdk-v5');

class TencentCOS {
    constructor(config) {
        this.cos = new COS({
            SecretId: config.secretId,
            SecretKey: config.secretKey
        });
        this.bucket = config.bucket;
        this.region = config.region;
    }
    
    async uploadFile(file, fileName) {
        try {
            const uniqueName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`;
            
            const result = await new Promise((resolve, reject) => {
                this.cos.putObject({
                    Bucket: this.bucket,
                    Region: this.region,
                    Key: uniqueName,
                    Body: file.buffer,
                    ContentLength: file.size,
                    ContentType: file.mimetype
                }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            
            const url = `https://${this.bucket}.cos.${this.region}.myqcloud.com/${uniqueName}`;
            
            return {
                success: true,
                url: url,
                name: uniqueName,
                size: file.size,
                etag: result.ETag
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async deleteFile(fileName) {
        try {
            await new Promise((resolve, reject) => {
                this.cos.deleteObject({
                    Bucket: this.bucket,
                    Region: this.region,
                    Key: fileName
                }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ============= AWS S3 示例 =============
const AWS = require('aws-sdk');

class AWSS3 {
    constructor(config) {
        this.s3 = new AWS.S3({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region
        });
        this.bucket = config.bucket;
    }
    
    async uploadFile(file, fileName) {
        try {
            const uniqueName = fileName || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`;
            
            const params = {
                Bucket: this.bucket,
                Key: uniqueName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read' // 或者根据需要设置权限
            };
            
            const result = await this.s3.upload(params).promise();
            
            return {
                success: true,
                url: result.Location,
                name: result.Key,
                size: file.size,
                etag: result.ETag
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async deleteFile(fileName) {
        try {
            await this.s3.deleteObject({
                Bucket: this.bucket,
                Key: fileName
            }).promise();
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getFileList(prefix = '', maxKeys = 100) {
        try {
            const result = await this.s3.listObjectsV2({
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: maxKeys
            }).promise();
            
            return {
                success: true,
                files: result.Contents || []
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ============= 云存储管理器 =============
class CloudStorageManager {
    constructor() {
        this.providers = new Map();
    }
    
    // 注册云存储提供商
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    
    // 上传到指定的云存储
    async uploadToProvider(providerName, file, fileName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`未找到云存储提供商: ${providerName}`);
        }
        
        return await provider.uploadFile(file, fileName);
    }
    
    // 同时上传到多个云存储（备份）
    async uploadToMultipleProviders(providerNames, file, fileName) {
        const results = {};
        
        for (const providerName of providerNames) {
            try {
                results[providerName] = await this.uploadToProvider(providerName, file, fileName);
            } catch (error) {
                results[providerName] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }
}

// ============= Express 集成示例 =============
const express = require('express');
const multer = require('multer');

// 配置云存储
const cloudConfig = {
    alioss: {
        region: process.env.ALI_OSS_REGION,
        accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
        bucket: process.env.ALI_OSS_BUCKET
    },
    tencentcos: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        bucket: process.env.TENCENT_BUCKET,
        region: process.env.TENCENT_REGION
    },
    awss3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_BUCKET
    }
};

// 初始化云存储管理器
const storageManager = new CloudStorageManager();

// 注册云存储提供商
if (cloudConfig.alioss.accessKeyId) {
    storageManager.registerProvider('alioss', new AliCloudOSS(cloudConfig.alioss));
}
if (cloudConfig.tencentcos.secretId) {
    storageManager.registerProvider('tencentcos', new TencentCOS(cloudConfig.tencentcos));
}
if (cloudConfig.awss3.accessKeyId) {
    storageManager.registerProvider('awss3', new AWSS3(cloudConfig.awss3));
}

// Express 路由示例
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 上传到指定云存储
app.post('/api/cloud-upload/:provider', upload.single('image'), async (req, res) => {
    try {
        const { provider } = req.params;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }
        
        const result = await storageManager.uploadToProvider(provider, file);
        
        if (result.success) {
            res.json({
                success: true,
                message: '上传成功',
                provider: provider,
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: '上传失败',
                error: result.error
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 同时上传到多个云存储（备份）
app.post('/api/cloud-upload/backup', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;
        const providers = req.body.providers || ['alioss', 'tencentcos']; // 默认备份到阿里云和腾讯云
        
        if (!file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }
        
        const results = await storageManager.uploadToMultipleProviders(providers, file);
        
        const successCount = Object.values(results).filter(r => r.success).length;
        
        res.json({
            success: successCount > 0,
            message: `成功上传到 ${successCount}/${providers.length} 个云存储`,
            results: results
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// ============= 前端 JavaScript 集成 =============
const cloudUploadExample = `
// 前端上传到云存储的示例代码

async function uploadToCloudStorage(file, provider = 'alioss') {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(\`/api/cloud-upload/\${provider}\`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('上传成功:', result.data.url);
            return result.data.url;
        } else {
            throw new Error(result.message || '上传失败');
        }
    } catch (error) {
        console.error('上传错误:', error);
        throw error;
    }
}

// 备份上传示例
async function backupUploadToCloud(file, providers = ['alioss', 'tencentcos']) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('providers', JSON.stringify(providers));
    
    try {
        const response = await fetch('/api/cloud-upload/backup', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('备份上传结果:', result);
        return result;
    } catch (error) {
        console.error('备份上传错误:', error);
        throw error;
    }
}

// 使用示例
document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            // 单个云存储上传
            const url = await uploadToCloudStorage(file, 'alioss');
            console.log('文件URL:', url);
            
            // 或者备份到多个云存储
            const backupResult = await backupUploadToCloud(file);
            console.log('备份结果:', backupResult);
            
        } catch (error) {
            alert('上传失败: ' + error.message);
        }
    }
});
`;

module.exports = {
    AliCloudOSS,
    TencentCOS,
    AWSS3,
    CloudStorageManager,
    cloudUploadExample
};