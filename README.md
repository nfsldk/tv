# CineStream AI

<div align="center">

![CineStream AI](https://img.shields.io/badge/CineStream-AI-22c55e?style=for-the-badge&logo=google&logoColor=white)

**A Next-Gen Streaming Platform with P2P Acceleration & Gemini AI**

[English Guide](#english-guide) | [中文说明](#chinese-guide)

</div>

---

<div id="english-guide"></div>

## 🇬🇧 CineStream AI (English)

CineStream AI is a modern, high-definition video streaming platform featuring intelligent P2P acceleration, a sleek dark-themed UI, and AI-powered interaction.

### ✨ Features

-   **High Definition Streaming**: Aggregates multiple high-quality video sources.
-   **Smart P2P Acceleration**: Uses `swarmcloud-hls` to optimize bandwidth and speed.
-   **AI Assistant**: Integrated **Google Gemini AI** for movie recommendations and context-aware chat.
-   **Multi-Source Management**: Add your own Maccms-compatible CMS APIs to expand the library.
-   **Responsive Design**: Fully optimized for mobile, tablet, and desktop.
-   **Smart Danmaku**: Auto-matching Danmaku system via `api/v2/match`.

### 🚀 Deployment Tutorial

CineStream AI is a pure frontend Single Page Application (SPA) built with React and Vite. You can deploy it for free on various platforms.

#### 1. Vercel (Recommended)

The easiest way to deploy.

1.  **Fork** this repository to your GitHub account.
2.  Log in to [Vercel](https://vercel.com/).
3.  Click **"Add New"** -> **"Project"**.
4.  Import your forked repository.
5.  **Build Settings**: Vercel automatically detects `Vite`.
    -   **Framework Preset**: `Vite`
    -   **Build Command**: `vite build`
    -   **Output Directory**: `dist`
6.  **Environment Variables** (Optional):
    -   Add `API_KEY`: Your Google Gemini API Key.
7.  Click **"Deploy"**.

#### 2. Cloudflare Pages (Fast & Free)

Excellent global CDN performance.

1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **"Workers & Pages"** -> **"Create Application"**.
3.  Select the **"Pages"** tab and click **"Connect to Git"**.
4.  Select your GitHub repository.
5.  **Build settings**:
    -   **Framework preset**: Select `Vite`.
    -   **Build command**: `npm run build`
    -   **Build output directory**: `dist`
6.  **Environment Variables**:
    -   Go to **"Environment variables (advanced)"**.
    -   Variable name: `API_KEY`, Value: Your Gemini API Key.
7.  Click **"Save and Deploy"**.

#### 3. PHP Shared Hosting (cPanel / Apache)

For traditional web hosting (like Bluehost, HostGator, etc.) running Apache.

1.  **Build the Project**:
    Run `npm run build` on your local machine. This creates a `dist` folder.
2.  **Upload Files**:
    Upload **all files inside the `dist` folder** (not the folder itself) to your server's public directory (usually `public_html` or `www`).
3.  **Fix Routing (Crucial Step)**:
    Since this is a Single Page Application, refreshing a page like `/play/123` will cause a 404 error on Apache. You must create a file named `.htaccess` in the same directory and paste the following code:

    ```apache
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteRule . /index.html [L]
    </IfModule>
    ```

#### 4. Docker (Self-hosted)

For deployment on your own VPS or NAS. This configuration includes Nginx setup for SPA routing.

Create a `Dockerfile` in the root directory:

```dockerfile
# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Write Nginx config for SPA (Redirect all 404s to index.html)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and Run:**
```bash
docker build -t cinestream-ai .
docker run -d -p 8080:80 --name cinestream cinestream-ai
```
Visit `http://localhost:8080`.

### 🛠 Development

```bash
# Install dependencies
npm install

# Start local server
npm run dev

# Build for production
npm run build
```

---

<div id="chinese-guide"></div>

## 🇨🇳 CineStream AI (中文说明)

CineStream AI 是一个现代化的免费高清影视聚合平台，具备智能 P2P 加速、精致的暗黑风 UI 以及 AI 智能助手互动功能。

### ✨ 核心功能

-   **高清秒播**: 聚合多个高质量视频源，全网影视免费看。
-   **P2P 智能加速**: 采用 `swarmcloud-hls` 技术，多人观看时自动加速，节省带宽。
-   **AI 助手**: 集成 **Google Gemini AI**，提供剧情互动、影片推荐和闲聊功能。
-   **多源管理 (CMS)**: 支持在后台添加自定义 Maccms 格式的 CMS 接口，无限扩展资源库。
-   **全端适配**: 完美适配手机、平板和电脑端。
-   **智能弹幕**: 支持自动匹配弹幕，提升观影沉浸感。

### 🚀 部署教程

本项目是基于 React 和 Vite 构建的纯前端单页应用 (SPA)。您可以将其免费部署在各大静态托管平台上。

#### 1. Cloudflare Pages (推荐，速度快)

Cloudflare 提供全球顶级的 CDN 加速，国内访问速度较快。

1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  点击左侧菜单 **"Workers & Pages"** -> **"创建应用程序" (Create Application)**。
3.  选择 **"Pages"** 标签页，点击 **"连接到 Git" (Connect to Git)**。
4.  选择您的 GitHub 仓库。
5.  **构建设置 (Build settings)**:
    -   **框架预设 (Framework preset)**: 下拉选择 `Vite`。
    -   **构建命令 (Build command)**: `npm run build`
    -   **构建输出目录 (Build output directory)**: `dist`
6.  **环境变量 (可选)**:
    -   点击 "环境变量 (高级)"。
    -   变量名称: `API_KEY`，值: 您的 Gemini API Key (用于 AI 聊天)。
7.  点击 **"保存并部署" (Save and Deploy)**。

#### 2. Vercel (最简单)

1.  **Fork** 本项目到您的 GitHub 账号。
2.  登录 [Vercel](https://vercel.com/)。
3.  点击 **"Add New"** -> **"Project"**。
4.  导入您的 CineStream AI 仓库。
5.  **构建设置**: Vercel 会自动识别为 Vite 项目。
    -   **Framework Preset**: `Vite`
    -   **Build Command**: `vite build`
    -   **Output Directory**: `dist`
6.  **环境变量**:
    -   添加 `API_KEY` (您的 Google Gemini API Key)。
7.  点击 **"Deploy"** 即可完成部署。

#### 3. PHP 虚拟主机 (cPanel / Apache)

适用于传统的 PHP 虚拟主机 (如宝塔面板、cPanel 等使用 Apache 的环境)。

1.  **本地编译**:
    在本地运行 `npm run build`，这会生成一个 `dist` 文件夹。
2.  **上传文件**:
    将 `dist` 文件夹内的**所有文件** (不要上传 dist 文件夹本身，而是里面的内容) 上传到服务器的网站根目录 (通常是 `public_html` 或 `www`)。
3.  **解决路由问题 (关键步骤)**:
    因为这是单页应用 (SPA)，直接刷新子页面 (如 `/play/123`) 会导致 404 错误。您必须在根目录下创建一个名为 `.htaccess` 的文件，并填入以下内容：

    ```apache
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteRule . /index.html [L]
    </IfModule>
    ```

#### 4. Docker (自建服务器/NAS)

适用于部署在自己的 VPS 或 NAS (群晖/威联通) 上。

在项目根目录创建 `Dockerfile` 文件：

```dockerfile
# 构建阶段
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# 配置 Nginx 支持 SPA 路由 (解决刷新变 404 的问题)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**编译并运行：**
```bash
# 构建镜像
docker build -t cinestream-ai .

# 启动容器 (映射到 8080 端口)
docker run -d -p 8080:80 --name cinestream cinestream-ai
```
访问 `http://IP:8080` 即可。

### 🛠 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 打包生产环境代码
npm run build
```

### 📄 许可证
MIT License