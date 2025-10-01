---
title: 如何优雅的使用Github Action服务来将Hexo部署到Github Pages
tags:
  - Hexo
  - 博客配置
  - 教程
categories:
  - 教程
  - 博客搭建
cover: >-
  https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/819e000a34a53164513c50bc059b6f00ad6c12e814cdef7734cdf8b5b7da59babfdcc50b4895c5fb5ebabb0f321c88f3?pictype=scale&from=30113&version=3.3.3.3&fname=p0%206.png&size=1000

date: 2025-09-23 13:05:48
---
# 🚀 Hexo 博客部署到 GitHub + Cloudflare Pages 完整指南

## ⚠️ 小提示：

- 🐢 **Node.js、Git 安装包官方下载可能较慢**，建议使用代理加速下载，或前往本站云盘获取安装包
  - ☁️ [博客云盘传送](https://pan.nbvil.com/)
- 🛡️ **GitHub 国内访问可能不稳定**，建议全程使用代理网络进行部署
- 🛰 推荐自用机场（稳定高效）👉 [注册传送](https://mitce.net/aff.php?aff=4751)
  - 🧧 九折优惠码：`like10`

## 1. 安装依赖环境

### ✅ 安装 Node.js

建议安装稳定版（LTS）版本：[Node.js 官网](https://nodejs.org/)

### ✅ 安装 Git

下载地址：[Git 官网](https://git-scm.com/downloads)

💡 提示：安装 Git 时，在选择主干分支名称（default branch name）阶段，建议将默认的 **master** 修改为 **main**，以便后续与 GitHub 主流仓库命名保持一致。

🔎 为什么推荐使用 main？

- GitHub 目前新建仓库默认使用 main 作为主分支名称；
- 可避免后续部署、协作时出现分支不一致的问题；
- 体现现代化命名规范，master 逐步被淘汰；
- 早期 master/slave 的术语来源含有种族主义争议，许多社区已弃用。

## 2. 安装 Hexo CLI

```
npm install -g hexo-cli
```

⚠️ 如遇 npm 版本过低提示：，运行命令安装最新版本

```
npm install -g npm@latest
```

## 3. 初始化 Hexo 项目

```
mkdir hexo
cd hexo
hexo init
npm install
```

### 🔍 启动本地服务器查看效果

```
hexo server
```

在浏览器访问 [http://localhost:4000](http://localhost:4000/)

## 4. 初始化 Git 仓库并提交代码

### 🛠 先设置 Git 用户信息

```
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

确认设置成功：

```
git config --global --list
```

### 初始化仓库

```
git init
git add .
git commit -m "Initial commit"
```

## 5. 推送代码到 GitHub

### 1️⃣ 登录 GitHub 手动创建一个新仓库

1. 登录 [GitHub](https://github.com/)，点击页面右上角的 `+` 按钮，选择 **New repository**（新建仓库）。
2. 在 **Repository name**（仓库名称）框中，填写你的仓库名称（例如：`hexo`）。
3. 在 **Description**（可选描述）框中，可以添加仓库的简短描述（如：“我的 Hexo 博客”）。
4. 选择 **Public**（公开）或 **Private**（私有），通常选择 **Public** 让其他人也可以访问你的仓库。
5. 其他设置可以保持默认即可，点击 **Create repository**（创建仓库）按钮。

### 2️⃣ 添加远程地址并推送代码

1. 创建仓库后，GitHub 会显示仓库的主页，找到并复制仓库地址，形如：

   ```
   https://github.com/your-username/hexo.git
   ```

2. 在终端中，执行以下命令将你的 Hexo 项目推送到 GitHub：

   ```
   git remote add origin https://github.com/your-username/hexo.git
   git branch -M main  # 若默认是 master，可改为 main
   git push -u origin main
   ```

   - 其中，`your-username` 是你的 GitHub 用户名，`hexo` 是你的仓库名称。
   - 如果 GitHub 提示需要验证你的 GitHub 账号，可以通过输入用户名和个人访问令牌（Token）进行认证。

⚠️ 如果安装 Git 时已设置默认为 main 分支，可省略重命名操作

## 6. 利用 GitHub Actions 实现自动化部署 Hexo

### 创建个人访问令牌（Personal Access Token）

因为我们需要在 **Hexo 项目仓库** 执行 **Github Actions** 向 **username.github.io 仓库**推送代码，由于 Github 权限限制，我们需要在 GitHub 账户中创建一个具有足够权限的**个人访问令牌（Personal Access Token，简称 PAT）**。这个令牌需要有足够的权限来修改仓库。

1.点击右上角头像 -> 打开 **Settings** -> 左边栏滚到最后找到 **Develop Setting** 打开，如图

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/9940bd998b10ee100bf83fb287013479073fe440211b2382d888ec60b569454f36253bf7b2815b807c2d26be874e307b?pictype=scale&from=30113&version=3.3.3.3&fname=developer-setting.png&size=1000)

2.找到 **Personal Access Token** 点击 **Tokens（classic）** -> 选择 **Generate new token (classic)** ，如图

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/cb8c12ff69e9e66e201a69d96e3c89b46e5e2b44da2af382f14fdd733213a5770890ac3d8c7de13d11fb9ee1ce1c702f?pictype=scale&from=30113&version=3.3.3.3&fname=personal-access-tokens.png&size=1000)

3.给令牌起个名字并且勾选红框中的 **repo** 和workflow 的访问权限，然后点击生成 **token**（**注意：** 确保复制并安全地保存这个令牌。GitHub 不会再次显示这个令牌，所以这是你唯一的机会复制它），如图

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/0bb2b310149799f3fe75cbaa8282eb61c39e8e856143aa36f73851141029b9d0de1d65b68ba67091f129fe1fa56e0dcc?pictype=scale&from=30113&version=3.3.3.3&fname=new-personal-access-token.png&size=1000)

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/e8c450128a46594b1d3799ae23c3fdea3119d7694c2dd225aff0569eacbfedafbfa555bf79a1ecaf560510130168c537?pictype=scale&from=30113&version=3.3.3.3&fname=copy-token.png&size=1000)

4.将生成的 **PAT** 添加到你的博客源代码仓库的 **Secrets**，名字填入 **GH_TOKEN** 后面会用到这个变量名，如图

![](https://picabstract-preview-ftn.weiyun.com/ftn_pic_abs_v3/33389e59c2e89d699ea3fd9f33e660cd31b0df89e44e4a96babbd572ff61b85477bb78d30eec44a9789ff291fc4a1d6b?pictype=scale&from=30113&version=3.3.3.3&fname=new-secret.png&size=1000)

### 创建 Github Actions 脚本

1. 在你的 Hexo 项目根目录下创建一个 **.github/workflows** 文件夹（如果尚未存在）。
2. 在该文件夹内创建一个新的 **YAML** 文件（例如 hexo-deploy.yml），用于定义 **GitHub Actions** 工作流。
3. 复制如下配置到 **YAML** 文件

```yaml
name: 部署 Hexo 到 GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  build-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: 检查仓库
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 23

      - name: 缓存 node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: 安装依赖
        run: |
          npm install -g hexo-cli
          npm install

      - name: 构建 Hexo
        run: |
          hexo clean
          hexo generate

      - name: 部署到 GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GH_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages
          force_orphan: true

```



提交本地的 Hexo 项目代码到对应 Github 仓库即可触发 **Github Actions** 工作流实现自动部署，他是把public直接发布到gh-pages分支上面了，所以部署的时候选择gh-pages这个分支

⚠️  遇到问题解决办法

问题1、 Error: Action failed with "The process '/usr/bin/git' failed with exit code 128"

没有权限，你没有按上面的流程设置token

问题2fatal: No url found for submodule path 'themes/anzhiyu' in .gitmodules

Warning: The process '/usr/bin/git' failed with exit code 128

没有把主题文件上传到目录，解决办法如下：

**删除 submodule 配置**

```
# 先删除子模块引用
git rm --cached themes/anzhiyu
rm -rf themes/anzhiyu .gitmodules
```

**直接复制主题源码**

```
git clone https://github.com/anzhiyu-c/hexo-theme-anzhiyu.git
mv hexo-theme-anzhiyu themes/anzhiyu
rm -rf themes/anzhiyu/.git
```

> 注意：一定要删除 `themes/anzhiyu/.git`，否则会变成嵌套仓库。

**提交到仓库**

```
git add themes/anzhiyu
git commit -m "添加 anzhiyu 主题源码"
git push origin main
```

## 7. 使用 Cloudflare Pages 自动部署

### 📌 创建 Pages 项目

1. 登录 [Cloudflare](https://dash.cloudflare.com/) 后台 → 选择 `Pages`
2. 点击 **创建项目**
3. 连接 GitHub，选择所有仓库或指定仓库授权
4. 授权成功后，选择你的 Hexo 仓库开始配置

### 🛠 构建设置

- **生产分支

```
gh-pages
```



### ✨ 构建完成

Cloudflare 构建成功后，会自动生成一个 `.pages.dev` 域名用于预览

## 7. 配置自定义域名（可选）

### ☁️ 自动解析 (限定顶级域名托管于 Cloudflare)

1. 点击 “设置自定义域名”
2. 输入你的域名，Cloudflare 会自动生成 DNS 解析
3. 等待几分钟，域名生效

### ✋ 手动解析（域名未托管CF或为子域名）

1. 选择“我将手动添加 DNS 记录”
2. 根据提示，到域名 DNS 服务商处添加 **CNAME** 记录
3. 点击“检查 DNS 记录”，等待解析生效

## ✅ 总结

| 阶段     | 工具             | 作用                             |
| -------- | ---------------- | -------------------------------- |
| 内容生成 | Hexo             | 本地 Markdown 编写，生成静态网站 |
| 版本管理 | Git + GitHub     | 仓库托管，触发 Cloudflare 构建   |
| 网站托管 | Cloudflare Pages | 自动构建 + CDN + HTTPS           |