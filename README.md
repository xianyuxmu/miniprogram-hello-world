# miniprogram-hello-world

> 极其简单的微信小程序Hello World示例! A Simple WeChat Miniprogram Demo!


* 本项目基于[Jeff2Ma/WeApp-Workflow](https://github.com/Jeff2Ma/WeApp-Workflow)之上对技术栈做了删减优化，建议先看看这个项目的[README](https://github.com/Jeff2Ma/WeApp-Workflow)！

![小程序运行截图](https://github.com/xianyuxmu/miniprogram-hello-world/raw/master/images/demo-screenshot-preview.png)

## 安装运行

1. 拉取代码: `git clone https://github.com/xianyuxmu/miniprogram-hello-world.git`
2. 切换到项目目录: `cd miniprogram-hello-world`
3. 安装依赖: `npm install`
4. 打包构建: `npm run dev`
5. 运行小程序:
	* 打开“微信开发者工具”，新增项目，“项目目录”选择到`/miniprogram-hello-world/dist`
	* “AppID”选择 `体验小程序`
	* 点击`确定`，即可运行

## 项目结构说明

```
.
├── config.js // 项目配置文件
├── gulpfile.js // gulp 配置
├── package.json
├── src // 开发目录
│   ├── app.js
│   ├── app.json
│   ├── app.scss
│   ├── assets // 静态资源：最终上传到CDN
│   │   ├── images // 图片文件，可被上传到CDN
│   │   ├── less // 通用基础less文件，最终被pages引用
│   │   └── sprites // 生成雪碧图小图的目录
│   ├── image // 小程序专用的图片资源(如:tabBar、icon等)
│   ├── pages //小程序页面
│   │   └── index // index页面
│   │       ├── index.js   // js 文件
│   │       ├── index.less // 样式，最终转成.wxss
│   │       ├── index.wxml
│   │       └── index.json
│   └── utils // 实用函数目录
├── tmp //  src目录编译后生成的缓存目录，存放图片
└── dist // src目录编译后生成的文件目录，是小程序运行的根目录

```

## 技术选型与设计原则

### 技术选型

- [less](http://lesscss.org/): less相对sass更加简单、不需要依赖Ruby环境；直接写.wxss嵌套样式很难写(我觉得未来wxss会引入预处理器功能)
- [Gulp](https://gulpjs.com/): 任务自动化。任务包括：雪碧图生成、图片上传CDN、less文件预处理等。
- **其他的都是原汁原味的。**

### 设计原则

- **Simple, simple and simple.** 一切从简，非必要的引入。降低开发成本，提高项目健壮性。
	- **不引入node_modules。**需要的依赖包**直接通过js文件包引入。
	- **不使用Promise封装小程序API。**一般用到的小程序API不多、也不频繁，使用Promise封装所有接口带来的好处不明显，却带来一些不便之处：
		- 封装可能引起未知的问题。
		- 有些特殊的接口，不能Promise化，即使Promise化了也不好用。
		- 有些接口几乎用不到，Promise化是多此一举。
	- **不引入Babel。**小程序本身支持了ES6，ES6语法基本够用了。
- **Classic JavaScript/CSS/HTML.** 使用原生的JS进行开发，不使用TypeScript、不使用WXSS。

