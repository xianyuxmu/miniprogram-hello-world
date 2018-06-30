var path = require('path');
var gulp = require('gulp');
var babel = require('gulp-babel');
var less = require('gulp-less');
var rename = require('gulp-rename');
var imagemin = require('gulp-imagemin');
// var sftp = require('gulp-sftp');
var del = require('del');
var replace = require('gulp-replace');
var postcss = require('gulp-postcss');
var qcloudCosUpload = require('gulp-qcloud-cos-upload');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var newer = require('gulp-newer');
var cache = require('gulp-cached');
var debug = require('gulp-debug');
var pxtorpx = require('postcss-px2rpx');
var lazysprite = require('postcss-lazysprite');
// var LessAutoprefix = require('less-plugin-autoprefix');
// var autoprefix = new LessAutoprefix(); // ⚠️ 注意：browser的兼容配置在package.json的browserslist，browserslist和Babel, ESLint及Stylelint共享
// var argv  = require('yargs').argv; // 命令变量获取。详情：https://www.npmjs.com/package/yargs
var git = require('git-rev');
var dateformat = require('dateformat');
var config = require('./config.js');

// 相关路径配置
var paths = {
	src: {
		baseDir: 'src',
		imgDir: 'src/image',
		spriteDir: 'src/assets/sprites',
		lessDir: 'src/assets/less',
		imgFiles: 'src/image/**/*',
		lessFiles: 'src/**/*.less',
		baseFiles: ['src/**/*.{png,js,json}', '!src/assets/**/*', '!src/image/**/*'],
		assetsDir: 'src/assets',
		assetsImgFiles: 'src/assets/images/**/*.{png,jpg,jpeg,svg,gif}',
		wxmlFiles: 'src/**/*.wxml',
		jsFiles: 'src/**/*.js'
	},
	dist: {
		baseDir: 'dist',
		imgDir: 'dist/image',
		wxssFiles: 'dist/**/*.wxss',
	},
	tmp: {
		baseDir: 'tmp',
		imgDir: 'tmp/assets/images',
		imgFiles: 'tmp/assets/images/**/*.{png,jpg,jpeg,svg,gif}',
		imgFilesRelative: './**/*.{png,jpg,jpeg,svg,gif}', // 相对图片路径
	}
};

// 雪碧图的配置
var lazyspriteConfig = {
	imagePath: paths.src.spriteDir,
	stylesheetInput: paths.src.lessDir,
	stylesheetRelative: paths.src.assetsDir,
	spritePath: paths.src.assetsDir + '/images',
	smartUpdate: false,
	cssSeparator: '-',
	outputExtralCSS: true,
	nameSpace: 'icon-'
};


var cdnPrefix = ''; // cdn前缀，上传cdn使用
var cdnVersionTag = ''; // cdn版本标识
var resourceURLPrefix = ''; // 资源前缀：cdn链接+项目+版本(环境-GitHash)+路径前缀+文件

// Log for output msg.
function log() {
	var data = Array.prototype.slice.call(arguments);
	gutil.log.apply(false, data);
}

// 压缩图片
function imageMin() {
	// return gulp.src(paths.src.imgFiles, {si≤nce: gulp.lastRun(imageMin)})
	return gulp.src(paths.src.imgFiles)
		.pipe(newer(paths.dist.imgDir))
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}]
		}))
		.pipe(gulp.dest(paths.dist.imgDir));
}

// assets 文件夹下的图片处理
function assetsImgMin() {
	return gulp.src(paths.src.assetsImgFiles)
		.pipe(newer(paths.tmp.imgDir))
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}]
		}))
		.pipe(gulp.dest(paths.tmp.imgDir))
}

// js编译：【暂时不使用，因为小程序本身支持ES6转ES5】
function jsCompile() {
	return gulp.src(paths.src.jsFiles)
		.pipe(babel())
		.pipe(gulp.dest(paths.dist.baseDir))
}

// Less编译
function lessCompile() {
	return gulp.src(paths.src.lessFiles)
		.pipe(less({
			plugins: [/*autoprefix 暂时不用补全功能，因为微信开发者工具自带“样式自动补全”*/],
		})
			.on('error', console.error)
		)
		.pipe(postcss([lazysprite(lazyspriteConfig), pxtorpx()]))
		.pipe(rename({
			'extname': '.wxss'
		}))
		.pipe(replace('.less', '.wxss'))
		.pipe(replace('%ASSETS_IMG%/', resourceURLPrefix))
		.pipe(replace('src/assets/images/', resourceURLPrefix))
		.pipe(gulp.dest(paths.dist.baseDir))
}


// 复制基础文件
function copyBasicFiles() {
	return gulp.src(paths.src.baseFiles, {})
		.pipe(gulp.dest(paths.dist.baseDir));
}

// 复制 WXML
function copyWXML() {
	return gulp.src(paths.src.wxmlFiles, {})
		.pipe(gulp.dest(paths.dist.baseDir));
}


// 重写WXML 中 image 标签中的图片路径：在src目录下less或wxml文件通过 %ASSETS_IMG%/ 自定义变量的方式写路径。
function wxmlImgRewrite() {
	return gulp.src(paths.src.wxmlFiles)
		.pipe(replace('%ASSETS_IMG%/', resourceURLPrefix))
		.pipe(gulp.dest(paths.dist.baseDir))
}

// clean 任务, dist 目录
function cleanDist() {
	return del(paths.dist.baseDir);
}

// clean tmp 目录
function cleanTmp() {
	return del(paths.tmp.baseDir);
}


function getPrefixByEnvironment(prefixConfig) {
	var prefix = ''; // 前缀格式：项目+版本(环境-GitHash)+路径前缀+文件

	switch(process.env.NODE_ENV) {
		// 本地开发版本
		case 'development':
			prefix = prefixConfig.project + '/development/' + prefixConfig.cdnVersionTag + '/' + prefixConfig.defaultPrefix;
			break;
		// 预发环境(又称：预演环境、模拟环境)
		case 'staging':
			prefix = prefixConfig.project + '/staging/' + prefixConfig.cdnVersionTag + '/' + prefixConfig.defaultPrefix;
			break;
		// 生产环境
		case 'production':
			prefix = prefixConfig.project + '/' + prefixConfig.cdnVersionTag + '/' + prefixConfig.defaultPrefix;
			break;
		default:
			// 无
	}

	if(!prefix) {
		console.error('getPrefixByEnvironment() 配置环境错误，请检查环境变量!');
	}

	return prefix;
}

// 腾讯云上传任务
function qcloudCDN(cb) {
	if (config.enabledQcloud) {
		log(gutil.colors.green.bold('🌍 🌍 🌍 CDN: 开始上传...📡 📡 📡'));
		return gulp.src(paths.tmp.imgFilesRelative, {
			cwd: paths.tmp.imgDir
		})
		.pipe(cache('qcloudCache'))
		.pipe(qcloudCosUpload({
			debug: true,
			log: true,
			overwrite: config.qcloud.overWrite,
			AppId: config.qcloud.appid,
			SecretId: config.qcloud.secretId,
			SecretKey: config.qcloud.secretKey,
			Bucket: config.qcloud.bucket,
			Region: config.qcloud.region,
			prefix: cdnPrefix,
			//headers: config.qcloud.headers
		}));
	} else {
		log(gutil.colors.green.bold('🌍 🌍 🌍 CDN: 已禁用 ⛔️ ⛔️ ⛔️ '));
	}
	cb();
}


var watchHandler = function (type, file) {
	var extname = path.extname(file);
	// LESS 文件
	if (extname === '.less') {
		if (type === 'removed') {
			var tmp = file.replace('src/', 'dist/').replace(extname, '.wxss');
			del([tmp]);
		} else {
			lessCompile();
		}
	}
	// 图片文件
	else if (extname === '.png' || extname === '.jpg' || extname === '.jpeg'  || extname === '.svg' || extname === '.gif') {
		if (type === 'removed') {
			if (file.indexOf('assets') > -1 ) {
				del([file.replace('src/', 'tmp/')]);
			} else {
				del([file.replace('src/', 'dist/')]);
			}
		} else {
			imageMin();
			assetsImgMin();
			qcloudCDN();
			wxmlImgRewrite();
		}
	}

	// wxml
	else if (extname === '.wxml') {
		if (type === 'removed') {
			var tmp = file.replace('src/', 'dist/')
			del([tmp]);
		} else {
			copyWXML();
			wxmlImgRewrite();
		}
	}

	// 其余文件
	else {
		if (type === 'removed') {
			var tmp = file.replace('src/', 'dist/');
			del([tmp]);
		} else {
			copyBasicFiles();
			// copyWXML();
			// wxmlImgRewrite();
		}
	}
};

//监听文件
function watch(cb) {
	var watcher = gulp.watch([
			paths.src.baseDir,
			paths.tmp.imgDir
		],
		{ignored: /[\/\\]\./}
	);
	watcher
		.on('change', function (file) {
			log(gutil.colors.yellow(file) + ' is changed');
			watchHandler('changed', file);
		})
		.on('add', function (file) {
			log(gutil.colors.yellow(file) + ' is added');
			watchHandler('add', file);
		})
		.on('unlink', function (file) {
			log(gutil.colors.yellow(file) + ' is deleted');
			watchHandler('removed', file);
		});

	cb();
}

function commonInfo(cb) {
	log(gutil.colors.green.bold.underline('🦄️ 🐶 🌍 👏 🚀 环境变量 process.env.NODE_ENV 👉🏻👉🏻👉🏻 ', process.env.NODE_ENV));
	cb();
}

// 预先任务：先于其他任务执行，用于：提早准备构建相关变量
function preTask(cb) {
	git.short(function (commitHashTag){	
		// cdnVersionTag = dateformat(new Date(), 'yyyymmdd') + '-' + commitHashTag; // // 通过"<日期>-<Git Commit Hash>"标记cdn上传版本，解决cdn缓存问题
		// cdnPrefix = getPrefixByEnvironment({
		// 	project: config.qcloud.project,
		// 	defaultPrefix: config.qcloud.prefix,
		// 	cdnVersionTag: cdnVersionTag
		// });
		// resourceURLPrefix = config.assetsCDN + cdnPrefix + '/';

		resourceURLPrefix = config.assetsCDN + 'xianyuxmu/miniprogram-hello-world/raw/master/images/'; // demo说明：demo不上传CDN直接使用固定链接
		
		log(gutil.colors.green.bold('🌍 🌍 🌍 CDN: cdnVersionTag 👉🏻👉🏻👉🏻 ', cdnVersionTag));
		log(gutil.colors.green.bold('🌍 🌍 🌍 CDN: cdnPrefix 👉🏻👉🏻👉🏻 ', cdnPrefix));
		log(gutil.colors.green.bold('🌍 🌍 🌍 CDN: resourceURLPrefix 👉🏻👉🏻👉🏻 ', resourceURLPrefix));

		cb();
	});
}

// 默认任务
gulp.task('default', gulp.series(
	preTask,
	cleanTmp,
	copyBasicFiles,
	gulp.parallel(
		// jsCompile,
		lessCompile,
		imageMin,
		copyWXML
	),
	wxmlImgRewrite,
	assetsImgMin,
	qcloudCDN,
	watch,
	commonInfo
));

// no-watch任务：执行之后，不会watch
gulp.task('no-watch', gulp.series(
	preTask,
	cleanTmp,
	copyBasicFiles,
	gulp.parallel(
		// jsCompile,
		lessCompile,
		imageMin,
		copyWXML
	),
	wxmlImgRewrite,
	assetsImgMin,
	qcloudCDN,
	commonInfo
));

// 删除任务
gulp.task('clean', gulp.parallel(
	cleanTmp,
	cleanDist
));
