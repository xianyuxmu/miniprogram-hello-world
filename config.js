// 配置文件
module.exports = {
	"enabledQcloud": false, //是否开启腾讯云COS 上传功能
	// 腾讯云COS 上传功能配置表
	"qcloud": {
		"appid": "xxxxxx",
		"secretId": "xxxxxx",
		"secretKey": "xxxxxx",
		"bucket": "xxxxxx",
		"region": "ap-shanghai",
		"prefix": "images", // 前缀
		"project": "miniprogram-hello-world", // 项目，顶层目录通过项目来做区分
		"overWrite": true,
		"headers": {
			"Cache-Control": "max-age=2592000", // 文件的缓存机制：30天
		}
	},
	// 静态资源CDN 域名，配合CDN 功能实用，线上请确保在mp管理端已经注册域名
	"assetsCDN": "https://alicdn.celier-china.com/", // 阿里云CDN域名
	"enabledAliyunOSS": false, //是否开启阿里云OSS 上传功能
	// 阿里云OSS配置
	"aliyunOSSConfig": {
		"accessKeyId": "xxxxxx",
		"accessKeySecret": "xxxxxx",
		"region": "oss-cn-shanghai",
		"bucket": "xxxxxx",
		"project": "miniprogram-hello-world", // 项目，顶层目录通过项目来做区分
		"prefix": "images",
	}
};
