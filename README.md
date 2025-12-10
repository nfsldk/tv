
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
-   **Cloud Sync**: Support for **Supabase** to sync resource site configurations across browsers.
-   **Responsive Design**: Fully optimized for mobile, tablet, and desktop.
-   **Smart Danmaku**: Auto-matching Danmaku system via `api/v2/match`.

### 🚀 Deployment Tutorial

#### 1. Vercel (Recommended)

1.  **Fork** this repository.
2.  Log in to [Vercel](https://vercel.com/) and import the project.
3.  **Environment Variables** (Add as **Plain Text**):
    -   `API_KEY`: Google Gemini API Key.
    -   `VITE_SUPABASE_URL`: (Optional) Your Supabase Project URL.
    -   `VITE_SUPABASE_KEY`: (Optional) Your Supabase Anon Key.
4.  Click **"Deploy"**.

#### 2. Cloudflare Pages

1.  Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **"Workers & Pages"** -> **"Create Application"**.
2.  Connect Git repo.
3.  **Build settings**: Preset `Vite`, Command `npm run build`, Output `dist`.
4.  **Environment Variables** (Use Plain Text / Not Encrypted): 
    -   Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`.
    -   Add `API_KEY`.
5.  Click Deploy.

#### 3. Database Setup (Cross-Browser Sync)

To ensure your added Resource Sites appear on all devices/browsers, connect a **Supabase** database.

1.  Create a free project at [supabase.com](https://supabase.com).
2.  Go to **SQL Editor** and run this query to create the table:

```sql
create table cine_sources (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  api text not null,
  active boolean default true
);

-- Enable Row Level Security (RLS) if you want to restrict write access, 
-- but for personal use you can leave it open or create a policy.
alter table cine_sources enable row level security;

create policy "Enable all access for all users" on cine_sources
for all using (true) with check (true);
```

3.  Get your **Project URL** and **anon public key** from Project Settings -> API.
4.  Add them as environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` in your deployment platform (Vercel/Cloudflare).

---

<div id="chinese-guide"></div>

## 🇨🇳 CineStream AI (中文说明)

CineStream AI 是一个现代化的免费高清影视聚合平台，具备智能 P2P 加速、精致的暗黑风 UI 以及 AI 智能助手互动功能。

### ✨ 核心功能

-   **高清秒播**: 聚合多个高质量视频源，全网影视免费看。
-   **P2P 智能加速**: 采用 `swarmcloud-hls` 技术，多人观看时自动加速，节省带宽。
-   **AI 助手**: 集成 **Google Gemini AI**，提供剧情互动、影片推荐和闲聊功能。
-   **云端同步**: 支持 **Supabase** 数据库，实现跨浏览器、跨设备同步资源站配置。
-   **多源管理 (CMS)**: 支持在后台添加自定义 Maccms 格式的 CMS 接口，无限扩展资源库。
-   **全端适配**: 完美适配手机、平板和电脑端。
-   **智能弹幕**: 支持自动匹配弹幕，提升观影沉浸感。

### 🚀 部署教程

#### 1. Cloudflare Pages (推荐)

1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **创建应用程序**。
2.  连接 Git 仓库。
3.  **构建设置**: 框架预设 `Vite`，命令 `npm run build`，输出目录 `dist`。
4.  **环境变量** (使用默认的明文/文本类型即可，无需加密):
    -   `API_KEY`: 您的 Gemini API Key。
    -   `VITE_SUPABASE_URL`: Supabase 项目地址。
    -   `VITE_SUPABASE_KEY`: Supabase Anon Key。
5.  点击部署。

#### 2. Vercel

1.  Fork 本项目。
2.  在 Vercel 导入项目。
3.  配置环境变量 (Plain Text):
    -   `API_KEY`: 您的 Gemini API Key。
    -   `VITE_SUPABASE_URL`: (可选) Supabase 项目地址。
    -   `VITE_SUPABASE_KEY`: (可选) Supabase Anon Key。
4.  点击 Deploy。

#### 3. 数据库配置 (跨设备同步资源)

为了解决“换了浏览器/设备后，添加的资源站消失”的问题，请配置 **Supabase** 数据库。

1.  在 [supabase.com](https://supabase.com) 创建免费项目。
2.  进入 **SQL Editor**，运行以下代码创建表：

```sql
create table cine_sources (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  api text not null,
  active boolean default true
);

-- 开启行级安全策略 (RLS)
alter table cine_sources enable row level security;

-- 允许所有用户读写 (个人使用推荐此设置，简单方便)
create policy "Enable all access for all users" on cine_sources
for all using (true) with check (true);
```

3.  在项目设置 -> API 中获取 **Project URL** 和 **anon public key**。
4.  将它们添加到部署平台 (Vercel/Cloudflare) 的环境变量中：`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_KEY`。

这样配置后，无论您在哪个浏览器添加资源，都会同步到云端数据库，并在所有设备上生效。

### 🛠 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 打包生产环境代码
npm run build
```